import express from 'express';
import {
    uploadDocument,
    getDocuments,
    getDocumentById,
    streamDocument,
} from '../controllers/docController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Upload a new PDF document
router.post('/upload', authenticateToken, upload.single('document'), uploadDocument);

// Get list of documents for the authenticated user
router.get('/', authenticateToken, getDocuments);
router.get('/:documentId/file', authenticateToken, streamDocument);
router.get('/:documentId', authenticateToken, getDocumentById);

export default router;
