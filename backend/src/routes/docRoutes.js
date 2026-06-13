import express from 'express';
import {
    uploadDocument,
    getDocuments,
    getDocumentById,
    streamDocument,
    deleteDocument,
    addSignature,
    getSignatures,
    removeSignature,
    updateSignatureCoords,
    generateSignatureToken,
    validateSignatureToken,
    signWithToken,
} from '../controllers/docController.js';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public routes (with optional auth for sandbox mode)
router.post('/upload', optionalAuthenticateToken, upload.single('document'), uploadDocument);
router.get('/:documentId/file', optionalAuthenticateToken, streamDocument);

// Signature Public routes (token based) — MUST come before /:documentId
router.get('/signatures/validate', validateSignatureToken);
router.post('/signatures/sign', signWithToken);

// Auth protected routes
router.get('/', authenticateToken, getDocuments);
router.get('/:documentId', authenticateToken, getDocumentById);
router.delete('/:documentId', authenticateToken, deleteDocument);

// Signatures Management (Owner only)
router.post('/:documentId/signatures', authenticateToken, addSignature);
router.get('/:documentId/signatures', authenticateToken, getSignatures);
router.put('/:documentId/signatures/:signatureId', authenticateToken, updateSignatureCoords);
router.delete('/:documentId/signatures/:signatureId', authenticateToken, removeSignature);
router.post('/signatures/:signatureId/token', authenticateToken, generateSignatureToken);

export default router;
