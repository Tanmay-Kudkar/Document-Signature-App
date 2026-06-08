import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

const normalizeStoredPath = (storedPath) => storedPath.replace(/\\/g, '/');

const resolveStoredFilePath = (storedPath) => {
    if (!storedPath) {
        return null;
    }

    if (path.isAbsolute(storedPath) && fs.existsSync(storedPath)) {
        return storedPath;
    }

    const normalizedPath = normalizeStoredPath(storedPath);
    const candidatePaths = [
        path.resolve(projectRoot, normalizedPath),
        path.resolve(projectRoot, 'backend', normalizedPath),
        path.resolve(projectRoot, 'uploads', path.basename(normalizedPath)),
    ];

    return candidatePaths.find((candidate) => fs.existsSync(candidate)) || candidatePaths[0];
};

const getDocumentUrls = (req, documentId) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    return {
        previewUrl: `${baseUrl}/api/docs/${documentId}/file`,
        downloadUrl: `${baseUrl}/api/docs/${documentId}/file?download=1`,
    };
};

const mapDocument = (req, document) => {
    const resolvedPath = resolveStoredFilePath(document.file_path);
    const fileStats = resolvedPath && fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath) : null;

    return {
        id: document.id,
        originalName: document.original_name,
        filePath: normalizeStoredPath(document.file_path),
        status: document.status,
        uploadDate: document.upload_date,
        fileSize: fileStats?.size || null,
        ...getDocumentUrls(req, document.id),
    };
};

const findUserDocument = async (documentId, userId) => {
    const result = await pool.query(
        `SELECT id, original_name, file_path, upload_date, status
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

        const userId = req.user.userId;
        const storedPath = `uploads/${req.file.filename}`;
        const originalName = req.file.originalname;

        const result = await pool.query(
            `INSERT INTO documents (user_id, file_path, original_name)
             VALUES ($1, $2, $3)
             RETURNING id, original_name, file_path, upload_date, status`,
            [userId, storedPath, originalName]
        );

        res.status(201).json({
            message: 'Document uploaded successfully',
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
            `SELECT id, original_name, file_path, upload_date, status
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

export const streamDocument = async (req, res) => {
    try {
        const document = await findUserDocument(req.params.documentId, req.user.userId);

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const absolutePath = resolveStoredFilePath(document.file_path);

        if (!absolutePath || !fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'Stored file is missing' });
        }

        const safeFileName = document.original_name.replace(/"/g, '');
        const disposition = req.query.download === '1' || req.query.download === 'true'
            ? 'attachment'
            : 'inline';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${safeFileName}"`);
        res.sendFile(absolutePath);
    } catch (error) {
        console.error('Error streaming document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
