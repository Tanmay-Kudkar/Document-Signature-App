import { pool } from '../db.js';
import jwt from 'jsonwebtoken';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createSignature, getSignaturesByDocument, getSignatureById, updateSignatureStatus, deleteSignature, updateSignatureCoordinates } from '../models/signatureModel.js';
import { logAudit, AUDIT_ACTIONS } from '../utils/audit.js';
import { sendSignatureEmail } from '../utils/mailer.js';

const getDocumentUrls = (req, documentId) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    return {
        previewUrl: `${baseUrl}/api/docs/${documentId}/file`,
        downloadUrl: `${baseUrl}/api/docs/${documentId}/file?download=1`,
    };
};

const mapDocument = (req, document) => {
    return {
        id: document.id,
        originalName: document.original_name,
        status: document.status,
        signingMode: document.signing_mode || 'only_me',
        uploadDate: document.upload_date,
        fileSize: document.file_data ? document.file_data.length : (document.file_size || null),
        receivers: document.receivers || [],
        ...getDocumentUrls(req, document.id),
    };
};

const findUserDocument = async (documentId, userId, includeData = false) => {
    const cols = includeData ? '*' : 'id, original_name, upload_date, status, signing_mode, octet_length(file_data) as file_size';
    const result = await pool.query(
        `SELECT ${cols}
         FROM documents
         WHERE id = $1 AND user_id = $2`,
        [documentId, userId]
    );

    return result.rows[0] || null;
};

export const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const originalName = req.file.originalname;
        const fileBuffer = req.file.buffer;

        // AUTH CHECK
        const userId = req.user?.userId;
        const signingMode = req.body.signingMode || 'only_me';

        if (!userId) {
            // Free service / Sandbox mode - No document saved to DB
            const base64Content = fileBuffer.toString('base64');
            return res.status(200).json({
                message: 'Free preview mode - document not saved to database',
                document: {
                    originalName,
                    fileSize: fileBuffer.length,
                    status: 'temporary',
                    signingMode,
                    previewData: `data:application/pdf;base64,${base64Content}`
                }
            });
        }

        // Saved mode for registered users
        const result = await pool.query(
            `INSERT INTO documents (user_id, file_data, original_name, signing_mode)
             VALUES ($1, $2, $3, $4)
             RETURNING id, original_name, upload_date, status, signing_mode, octet_length(file_data) as file_size`,
            [userId, fileBuffer, originalName, signingMode]
        );
        
        await logAudit({
            documentId: result.rows[0].id,
            actorId: userId,
            action: AUDIT_ACTIONS.DOCUMENT_CREATED,
            req
        });

        res.status(201).json({
            message: 'Document uploaded and saved to database successfully',
            document: mapDocument(req, result.rows[0]),
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDocuments = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            `SELECT id, original_name, upload_date, status, signing_mode, octet_length(file_data) as file_size
             FROM documents
             WHERE user_id = $1
             ORDER BY upload_date DESC`,
            [userId]
        );

        const documents = result.rows;

        // Fetch receivers for these documents
        if (documents.length > 0) {
            const docIds = documents.map(d => d.id);
            const receiversResult = await pool.query(
                `SELECT id, document_id, name, email, role, auth_format, display_order 
                 FROM document_receivers 
                 WHERE document_id = ANY($1) 
                 ORDER BY display_order ASC`,
                [docIds]
            );
            const receiversByDocId = {};
            receiversResult.rows.forEach(r => {
                if (!receiversByDocId[r.document_id]) receiversByDocId[r.document_id] = [];
                receiversByDocId[r.document_id].push(r);
            });
            documents.forEach(d => {
                d.receivers = receiversByDocId[d.id] || [];
            });
        }

        res.status(200).json({
            documents: documents.map((document) => mapDocument(req, document)),
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDocumentById = async (req, res) => {
    try {
        const document = await findUserDocument(req.params.documentId, req.user.userId);

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Fetch receivers
        const receiversResult = await pool.query(
            `SELECT id, document_id, name, email, role, auth_format, display_order 
             FROM document_receivers 
             WHERE document_id = $1 
             ORDER BY display_order ASC`,
            [document.id]
        );
        document.receivers = receiversResult.rows;

        res.status(200).json({ document: mapDocument(req, document) });
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const documentId = req.params.documentId;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const result = await pool.query('SELECT id FROM documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Remove signatures first to avoid FK issues
        await pool.query('DELETE FROM signatures WHERE document_id = $1', [documentId]);
        // Remove document
        await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);

        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const streamDocument = async (req, res) => {
    try {
        const documentId = req.params.documentId;

        let document = null;
        if (req.user && req.user.userId) {
            document = await findUserDocument(documentId, req.user.userId, true);
        }

        // If not found as owner, allow access with a valid signature token
        if (!document) {
            const token = req.query.token || req.query.signToken || (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[1]);

            if (!token) {
                return res.status(403).json({ error: 'Not authorized to access this document' });
            }

            let payload;
            try {
                payload = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            const signature = await getSignatureById(payload.signatureId);
            if (!signature || signature.document_id !== documentId) {
                return res.status(404).json({ error: 'Document not found' });
            }

            const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
            if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
            document = docResult.rows[0];
        }

        if (!document || !document.file_data) {
            return res.status(404).json({ error: 'Document content is missing' });
        }

        const safeFileName = document.original_name.replace(/"/g, '');
        const disposition = req.query.download === '1' || req.query.download === 'true'
            ? 'attachment'
            : 'inline';

        let outputBuffer = document.file_data;

        // If it's a download, dynamically burn the signatures into the PDF on the fly!
        if (disposition === 'attachment') {
            const signatures = await getSignaturesByDocument(documentId);
            if (signatures.length > 0) {
                const pdfDoc = await PDFDocument.load(document.file_data, { ignoreEncryption: true });
                const pages = pdfDoc.getPages();
                
                for (const signature of signatures) {
                    const pageIndex = (signature.page_number || signature.pageNumber || 1) - 1;
                    if (pageIndex < 0 || pageIndex >= pages.length) continue;
                    
                    const page = pages[pageIndex];
                    const { width, height } = page.getSize();
                    
                    const xPercent = Number(signature.x);
                    const yPercent = Number(signature.y);
                    const xPos = (xPercent / 100) * width;
                    const yPos = height - (yPercent / 100) * height;
                    
                    const meta = signature.metadata || {};
                    // We saved the generated frontend UI PNG snapshot here!
                    const signatureImage = meta.renderedImage || null;
                    
                    if (signatureImage) {
                        try {
                            const isPng = signatureImage.startsWith('data:image/png');
                            const isJpg = signatureImage.startsWith('data:image/jpeg') || signatureImage.startsWith('data:image/jpg');
                            if (!isPng && !isJpg) continue;
                            
                            const base64Data = signatureImage.split(',')[1];
                            const imgBytes = Buffer.from(base64Data, 'base64');
                            const image = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                            
                            let drawW = image.width * 0.3;
                            let drawH = image.height * 0.3;
                            
                            // Adjust size if frontend provided proportional bounds
                            if (meta.wRatio) {
                                drawW = width * meta.wRatio;
                                drawH = drawW * (image.height / image.width);
                            } else if (meta.w && meta.h) {
                                const scaleX = meta.w / image.width;
                                const scaleY = meta.h / image.height;
                                const scale = Math.min(scaleX, scaleY);
                                drawW = image.width * scale;
                                drawH = image.height * scale;
                            }
                            
                            page.drawImage(image, {
                                x: Math.max(0, xPos - drawW / 2),
                                y: Math.max(0, yPos - drawH / 2),
                                width: drawW,
                                height: drawH,
                            });
                        } catch (err) {
                            console.error('Error drawing dynamic image:', err);
                        }
                    }
                }
                
                const modifiedBytes = await pdfDoc.save();
                outputBuffer = Buffer.from(modifiedBytes);
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${safeFileName}"`);
        res.send(outputBuffer);
    } catch (error) {
        console.error('Error streaming document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addSignature = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { pageNumber = 1, x, y, signerId = null, type = 'signature', metadata = null } = req.body;

        if (typeof x === 'undefined' || typeof y === 'undefined') {
            return res.status(400).json({ error: 'Missing x or y coordinate' });
        }

        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Only registered users can save signature placeholders' });
        }

        const document = await findUserDocument(documentId, req.user.userId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const signature = await createSignature({
            documentId,
            signerId: signerId || null,
            pageNumber,
            x,
            y,
            type,
            metadata
        });

        res.status(201).json({ signature });
    } catch (error) {
        console.error('Error adding signature placeholder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSignatureCoords = async (req, res) => {
    try {
        const { documentId, signatureId } = req.params;
        const { pageNumber, x, y, metadata } = req.body;

        const document = await findUserDocument(documentId, req.user.userId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const signature = await getSignatureById(signatureId);
        if (!signature || signature.document_id !== documentId) {
            return res.status(404).json({ error: 'Signature not found on this document' });
        }

        const updatedSignature = await updateSignatureCoordinates(signatureId, { pageNumber, x, y, metadata });
        if (!updatedSignature) {
            return res.status(404).json({ error: 'Signature not found' });
        }

        res.status(200).json({ signature: updatedSignature });
    } catch (error) {
        console.error('Error updating signature coords:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getSignatures = async (req, res) => {
    try {
        const { documentId } = req.params;

        const document = await findUserDocument(documentId, req.user.userId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const signatures = await getSignaturesByDocument(documentId);
        res.status(200).json({ signatures });
    } catch (error) {
        console.error('Error fetching signatures:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const removeSignature = async (req, res) => {
    try {
        const { documentId, signatureId } = req.params;

        // Verify ownership
        const document = await findUserDocument(documentId, req.user.userId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const signature = await getSignatureById(signatureId);
        if (!signature || signature.document_id !== documentId) {
            return res.status(404).json({ error: 'Signature not found on this document' });
        }

        await deleteSignature(signatureId);
        res.status(200).json({ message: 'Signature deleted successfully' });
    } catch (error) {
        console.error('Error removing signature:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const generateSignatureToken = async (req, res) => {
    try {
        const { signatureId } = req.params;

        const signature = await getSignatureById(signatureId);
        if (!signature) return res.status(404).json({ error: 'Signature not found' });

        const document = await findUserDocument(signature.document_id, req.user.userId);
        if (!document) return res.status(403).json({ error: 'Not authorized to generate token for this signature' });

        const token = jwt.sign(
            { signatureId: signature.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ token });
    } catch (err) {
        console.error('Error generating signature token', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const validateSignatureToken = async (req, res) => {
    try {
        const token = req.query.token || req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(400).json({ error: 'Token is required' });

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const signature = await getSignatureById(payload.signatureId);
        if (!signature) return res.status(404).json({ error: 'Signature not found' });

        const docResult = await pool.query('SELECT id, original_name, status, file_data FROM documents WHERE id = $1', [signature.document_id]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        // Try to find the receiver details for auditing & tailoring UI
        let receiverName = 'Unknown Receiver';
        let receiverEmail = 'Unknown Email';
        let receiverObj = null;
        try {
            if (signature.metadata && signature.metadata.receiverId) {
                const receiverResult = await pool.query('SELECT id, name, email, role, auth_format FROM document_receivers WHERE id = $1', [signature.metadata.receiverId]);
                if (receiverResult.rows.length > 0) {
                    receiverObj = receiverResult.rows[0];
                    receiverName = receiverObj.name;
                    receiverEmail = receiverObj.email;
                }
            }
        } catch (err) {
            console.error('Error fetching receiver for audit & response:', err);
        }

        await logAudit({
            documentId: signature.document_id,
            action: AUDIT_ACTIONS.DOCUMENT_VIEWED,
            req,
            metadata: { signatureId: signature.id, receiverName, receiverEmail, role: receiverObj?.role || 'Signer' }
        });

        res.status(200).json({ signature, document: docResult.rows[0], receiver: receiverObj });
    } catch (err) {
        console.error('Error validating token', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const signWithToken = async (req, res) => {
    try {
        let token;
        try {
            token = (req.body && req.body.token) || req.query?.token || (req.headers?.authorization && req.headers.authorization.split(' ')[1]);
        } catch (e) {
            token = undefined;
        }

        if (!token) return res.status(400).json({ error: 'Token is required' });

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { signerName = null, fieldType = 'signature', fieldText = '', fieldFont = 'Inter', signatureImage = null, action = 'sign', reason = null } = req.body || {};

        const signature = await getSignatureById(payload.signatureId);
        if (!signature) return res.status(404).json({ error: 'Signature not found' });
        
        if (signature.status === 'signed' || signature.status === 'rejected') {
            return res.status(400).json({ error: `Signature is already ${signature.status}` });
        }
        
        if (action === 'reject') {
            await updateSignatureStatus(signature.id, 'rejected');
            await pool.query('UPDATE signatures SET metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{rejectReason}\', $1::jsonb) WHERE id = $2', [JSON.stringify(reason || 'No reason provided'), signature.id]);
            await logAudit({
                documentId: signature.document_id,
                action: AUDIT_ACTIONS.DOCUMENT_REJECTED,
                req,
                metadata: { signatureId: signature.id, reason }
            });
            return res.status(200).json({ message: 'Signature rejected successfully' });
        }

        const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [signature.document_id]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const document = docResult.rows[0];
        if (!document.file_data) return res.status(404).json({ error: 'Document content missing' });

        let pdfDoc;
        try {
            pdfDoc = await PDFDocument.load(document.file_data, { ignoreEncryption: true });
        } catch (loadErr) {
            console.error('PDF load error:', loadErr);
            return res.status(422).json({ error: 'Unable to process PDF file' });
        }

        const pageIndex = Math.max(0, (signature.page_number || 1) - 1);
        const page = pdfDoc.getPage(pageIndex);
        const { width, height } = page.getSize();

        const xPercent = Number(signature.x);
        const yPercent = Number(signature.y);
        const xPos = (xPercent / 100) * width;
        const yPos = height - (yPercent / 100) * height;

        // Determine what to actually render based on field type
        const type = fieldType || signature.type || 'signature';
        const meta = signature.metadata || {};
        const resolvedText = fieldText || meta.text || '';

        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const safeName = String(signerName || 'Signed').replace(/[^\x00-\xFF]/g, '');
        const safeText = String(resolvedText || signerName || 'Signed').replace(/[^\x00-\xFF]/g, '');
        const safeDate = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy

        const hexToRgb = (hex) => {
            if (!hex) return rgb(0.1, 0.1, 0.1);
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result 
                ? rgb(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255)
                : rgb(0.1, 0.1, 0.1);
        };
        const fieldColor = hexToRgb(meta.color);

        // Helper to draw base64 images
        const drawBase64Image = async (base64Str, defaultScale = 0.3) => {
            try {
                const isPng = base64Str.startsWith('data:image/png');
                const isJpg = base64Str.startsWith('data:image/jpeg') || base64Str.startsWith('data:image/jpg');
                if (!isPng && !isJpg) return false;
                
                const base64Data = base64Str.split(',')[1];
                const imgBytes = Buffer.from(base64Data, 'base64');
                const image = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                
                // If the frontend stored proportional bounds or dimensions in meta, respect them
                // Otherwise fallback to defaultScale
                let drawW = image.width * defaultScale;
                let drawH = image.height * defaultScale;
                if (meta.wRatio) {
                    drawW = width * meta.wRatio;
                    drawH = drawW * (image.height / image.width);
                } else if (meta.w && meta.h) {
                    // Fit within the field bounds
                    const scaleX = meta.w / image.width;
                    const scaleY = meta.h / image.height;
                    const scale = Math.min(scaleX, scaleY);
                    drawW = image.width * scale;
                    drawH = image.height * scale;
                }

                page.drawImage(image, {
                    x: Math.max(0, xPos - drawW / 2),
                    y: Math.max(0, yPos - drawH / 2),
                    width: drawW,
                    height: drawH,
                });
                return true;
            } catch (err) {
                console.error('Error drawing image:', err);
                return false;
            }
        };

        // If the frontend passed a generated PNG image for this field, ALWAYS use it!
        // This guarantees that the PDF export perfectly matches the web UI fonts, colors, and SVGs.
        if (signatureImage && await drawBase64Image(signatureImage, 0.3)) {
            // Successfully drew the exact frontend representation of the field
        } 
        else if (type === 'signature') {
            if (meta.drawingImage && await drawBase64Image(meta.drawingImage, 0.3)) {
                // Successfully drew the canvas image
            } else {
                // Signature text fallback
                const sigFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
                const fontSize = 18;
                page.drawText(safeName, {
                    x: Math.max(0, xPos - 40),
                    y: Math.max(0, yPos - (fontSize / 2)),
                    size: fontSize,
                    font: sigFont,
                    color: fieldColor,
                });
            }
        } else if (type === 'initials') {
            if (meta.drawingImage && await drawBase64Image(meta.drawingImage, 0.3)) {
                // Successfully drew the initials canvas image
            } else {
                const initials = meta.text || (signerName ? signerName.split(' ').map(p => p[0]).join('').toUpperCase() : 'ME');
                const safeInitials = String(initials).replace(/[^\x00-\xFF]/g, '');
                const fontSize = 16;
                const sigFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
                page.drawText(safeInitials, {
                    x: Math.max(0, xPos - 10),
                    y: Math.max(0, yPos - (fontSize / 2)),
                    size: fontSize,
                    font: sigFont,
                    color: fieldColor,
                });
            }
        } else if (type === 'name') {
            const fontSize = 12;
            page.drawText(safeName, {
                x: Math.max(0, xPos - 30),
                y: Math.max(0, yPos - (fontSize / 2)),
                size: fontSize,
                font,
                color: fieldColor,
            });
        } else if (type === 'date') {
            const fontSize = 11;
            page.drawText(safeDate, {
                x: Math.max(0, xPos - 20),
                y: Math.max(0, yPos - (fontSize / 2)),
                size: fontSize,
                font,
                color: fieldColor,
            });
        } else if (type === 'text') {
            const displayText = safeText !== 'Double click to edit' ? safeText : '';
            if (displayText) {
                const fontSize = 11;
                page.drawText(displayText, {
                    x: Math.max(0, xPos - 20),
                    y: Math.max(0, yPos - (fontSize / 2)),
                    size: fontSize,
                    font,
                    color: fieldColor,
                });
            }
        } else if (type === 'stamp') {
            if (meta.image && await drawBase64Image(meta.image, 0.4)) {
                // Successfully drew the stamp image
            } else {
                const stampText = safeText && safeText !== 'Stamp Placeholder' ? safeText : safeName;
                const fontSize = 11;
                page.drawText(`[STAMP] ${stampText}`, {
                    x: Math.max(0, xPos - 30),
                    y: Math.max(0, yPos - (fontSize / 2)),
                    size: fontSize,
                    font,
                    color: fieldColor,
                });
            }
        } else {
            // Fallback
            page.drawText(safeName, {
                x: Math.max(0, xPos - 10),
                y: Math.max(0, yPos - 7),
                size: 12,
                font,
                color: fieldColor,
            });
        }

        const modifiedBytes = await pdfDoc.save();

        // Update DB with modified file
        await pool.query('UPDATE documents SET file_data = $1, status = $2 WHERE id = $3', [Buffer.from(modifiedBytes), 'signed', document.id]);
        await updateSignatureStatus(signature.id, 'signed');
        
        // Try to find the receiver details for auditing
        let receiverName = signerName || 'Unknown Receiver';
        let receiverEmail = 'Unknown Email';
        let receiverRole = 'Signer';
        try {
            if (signature.metadata && signature.metadata.receiverId) {
                const receiverResult = await pool.query('SELECT name, email, role FROM document_receivers WHERE id = $1', [signature.metadata.receiverId]);
                if (receiverResult.rows.length > 0) {
                    receiverName = receiverResult.rows[0].name;
                    receiverEmail = receiverResult.rows[0].email;
                    receiverRole = receiverResult.rows[0].role || 'Signer';
                }
            }
        } catch (err) {
            console.error('Error fetching receiver for audit:', err);
        }

        const auditAction = receiverRole === 'Validator'
            ? 'DOCUMENT_VALIDATED'
            : receiverRole === 'Witness'
                ? 'DOCUMENT_WITNESSED'
                : AUDIT_ACTIONS.DOCUMENT_SIGNED;

        await logAudit({
            documentId: document.id,
            action: auditAction,
            req,
            metadata: { signatureId: signature.id, receiverName, receiverEmail, role: receiverRole }
        });

        res.status(200).json({ message: 'Document signed successfully' });
    } catch (err) {
        console.error('Error signing document:', err);
        res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};

export const emailSignatureLink = async (req, res) => {
    try {
        const { signatureId } = req.params;
        const { email } = req.body;
        const userId = req.user.userId;

        if (!email) return res.status(400).json({ error: 'Email is required' });

        const signature = await getSignatureById(signatureId);
        if (!signature) return res.status(404).json({ error: 'Signature not found' });

        const docResult = await pool.query('SELECT original_name FROM documents WHERE id = $1 AND user_id = $2', [signature.document_id, userId]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found or access denied' });

        const documentName = docResult.rows[0].original_name;

        // Generate token
        const token = jwt.sign({ signatureId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = `${frontendUrl}/sign?token=${encodeURIComponent(token)}`;

        await sendSignatureEmail(email, documentName, link);

        await logAudit({
            documentId: signature.document_id,
            actorId: userId,
            action: AUDIT_ACTIONS.EMAIL_SENT,
            req,
            metadata: { signatureId, receiverEmail: email }
        });

        res.status(200).json({ message: 'Email sent successfully' });
    } catch (err) {
        console.error('Error emailing signature link:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAuditLogs = async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.user.userId;

        // Ensure user owns document
        const docResult = await pool.query('SELECT id FROM documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found or access denied' });

        const result = await pool.query(
            `SELECT a.id, a.action, a.ip_address, a.user_agent, a.metadata, a.created_at, a.country, a.city, a.device_type, u.name as actor_name, u.email as actor_email, d.original_name as document_name
             FROM audit_logs a
             LEFT JOIN users u ON a.actor_id = u.id
             LEFT JOIN documents d ON a.document_id = d.id
             WHERE a.document_id = $1
             ORDER BY a.created_at DESC`,
            [documentId]
        );

        res.status(200).json({ logs: result.rows });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const saveSeveralPeopleConfig = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { receivers, settings } = req.body;
        const userId = req.user ? req.user.userId : null;

        // Verify document exists
        const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Only owner or anon if no owner
        const doc = docResult.rows[0];
        if (doc.user_id && doc.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to modify this document' });
        }

        await pool.query('BEGIN');

        // Update settings on document
        await pool.query(`
            UPDATE documents 
            SET 
                signing_mode = 'several_people',
                signing_order_enabled = $1,
                expiration_days = $2,
                reminders_enabled = $3,
                reminder_days = $4,
                language = $5,
                customize_email = $6,
                uuid_enabled = $7,
                verification_code_enabled = $8
            WHERE id = $9
        `, [
            settings.orderReceivers || false,
            settings.expirationDays || 15,
            settings.reminders || false,
            settings.reminderDays || 1,
            settings.language || 'English',
            settings.customizeEmail || false,
            settings.uuid || false,
            settings.verificationCode || false,
            documentId
        ]);

        // Delete any existing receivers for this document (overwrite logic)
        await pool.query('DELETE FROM document_receivers WHERE document_id = $1', [documentId]);

        // Insert new receivers
        for (let i = 0; i < receivers.length; i++) {
            const r = receivers[i];
            await pool.query(`
                INSERT INTO document_receivers (
                    document_id, name, email, role, 
                    auth_password, auth_phone, auth_format, display_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                documentId,
                r.name,
                r.email,
                r.role || 'Signer',
                r.showPassword ? r.password : null,
                r.showPhone ? r.phone : null,
                r.showFormat ? r.format : null,
                i
            ]);
        }

        await pool.query('COMMIT');

        // Log audit
        await logAudit({
            documentId: documentId,
            actorId: userId,
            action: AUDIT_ACTIONS.CONFIG_SAVED,
            req,
            metadata: {
                receiversCount: receivers.length,
                receivers: receivers.map(r => ({ name: r.name, email: r.email }))
            }
        });
        
        res.status(200).json({ message: 'Configuration saved successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error saving several people config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
