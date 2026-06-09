import { pool } from '../db.js';
import jwt from 'jsonwebtoken';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createSignature, getSignaturesByDocument, getSignatureById, updateSignatureStatus } from '../models/signatureModel.js';

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
        uploadDate: document.upload_date,
        fileSize: document.file_data ? document.file_data.length : (document.file_size || null),
        ...getDocumentUrls(req, document.id),
    };
};

const findUserDocument = async (documentId, userId, includeData = false) => {
    const cols = includeData ? '*' : 'id, original_name, upload_date, status, octet_length(file_data) as file_size';
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

        if (!userId) {
            // Free service / Sandbox mode - No document saved to DB
            const base64Content = fileBuffer.toString('base64');
            return res.status(200).json({
                message: 'Free preview mode - document not saved to database',
                document: {
                    originalName,
                    fileSize: fileBuffer.length,
                    status: 'temporary',
                    previewData: `data:application/pdf;base64,${base64Content}`
                }
            });
        }

        // Saved mode for registered users
        const result = await pool.query(
            `INSERT INTO documents (user_id, file_data, original_name)
             VALUES ($1, $2, $3)
             RETURNING id, original_name, upload_date, status, octet_length(file_data) as file_size`,
            [userId, fileBuffer, originalName]
        );

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
            `SELECT id, original_name, upload_date, status, octet_length(file_data) as file_size
             FROM documents
             WHERE user_id = $1
             ORDER BY upload_date DESC`,
            [userId]
        );

        res.status(200).json({
            documents: result.rows.map((document) => mapDocument(req, document)),
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

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${safeFileName}"`);
        res.send(document.file_data);
    } catch (error) {
        console.error('Error streaming document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addSignature = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { pageNumber = 1, x, y, signerId = null } = req.body;

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
        });

        res.status(201).json({ signature });
    } catch (error) {
        console.error('Error adding signature placeholder:', error);
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

        const docResult = await pool.query('SELECT id, original_name, status FROM documents WHERE id = $1', [signature.document_id]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        res.status(200).json({ signature, document: docResult.rows[0] });
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

        const { signatureText = 'Signed', signerName = null } = req.body || {};

        const signature = await getSignatureById(payload.signatureId);
        if (!signature) return res.status(404).json({ error: 'Signature not found' });

        const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [signature.document_id]);
        if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const document = docResult.rows[0];
        if (!document.file_data) return res.status(404).json({ error: 'Document content missing' });

        const pdfDoc = await PDFDocument.load(document.file_data);

        const pageIndex = Math.max(0, signature.page_number - 1);
        const page = pdfDoc.getPage(pageIndex);
        const { width, height } = page.getSize();

        const xPercent = Number(signature.x);
        const yPercent = Number(signature.y);

        const x = (xPercent / 100) * width;
        const y = height - (yPercent / 100) * height;

        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 14;

        page.drawText(signerName ? `${signerName} — ${signatureText}` : signatureText, {
            x: x - 10,
            y: y - (fontSize / 2),
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
        });

        const modifiedBytes = await pdfDoc.save();

        // Update DB with modified file
        await pool.query('UPDATE documents SET file_data = $1, status = $2 WHERE id = $3', [Buffer.from(modifiedBytes), 'signed', document.id]);
        await updateSignatureStatus(signature.id, 'signed');

        res.status(200).json({ message: 'Document signed successfully' });
    } catch (err) {
        console.error('Error signing document:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
