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
    emailSignatureLink,
    getAuditLogs,
    saveSeveralPeopleConfig
} from '../controllers/docController.js';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { validateUuidParams } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Public routes (with optional auth for sandbox mode)
router.post('/upload', optionalAuthenticateToken, upload.single('document'), uploadDocument);
router.get('/:documentId/file', validateUuidParams(['documentId']), optionalAuthenticateToken, streamDocument);

// Signature Public routes (token based) — MUST come before /:documentId
router.get('/signatures/validate', validateSignatureToken);
router.post('/signatures/sign', signWithToken);

// Auth protected routes
router.get('/', authenticateToken, getDocuments);
router.get('/:documentId', validateUuidParams(['documentId']), authenticateToken, getDocumentById);
router.delete('/:documentId', validateUuidParams(['documentId']), authenticateToken, deleteDocument);
router.get('/:documentId/audit', validateUuidParams(['documentId']), authenticateToken, getAuditLogs);

// Signatures Management (Owner only)
router.post('/:documentId/signatures', validateUuidParams(['documentId']), authenticateToken, addSignature);
router.get('/:documentId/signatures', validateUuidParams(['documentId']), authenticateToken, getSignatures);
router.put('/:documentId/signatures/:signatureId', validateUuidParams(['documentId', 'signatureId']), authenticateToken, updateSignatureCoords);
router.delete('/:documentId/signatures/:signatureId', validateUuidParams(['documentId', 'signatureId']), authenticateToken, removeSignature);
router.post('/signatures/:signatureId/token', validateUuidParams(['signatureId']), authenticateToken, generateSignatureToken);
router.post('/signatures/:signatureId/email', validateUuidParams(['signatureId']), authenticateToken, emailSignatureLink);

// Several People Configuration
router.post('/:documentId/several-people-config', validateUuidParams(['documentId']), optionalAuthenticateToken, saveSeveralPeopleConfig);

export default router;
