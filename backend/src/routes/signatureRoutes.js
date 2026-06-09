import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  generateSignatureToken,
  validateSignatureToken,
  signWithToken,
} from '../controllers/docController.js';

const router = express.Router();

// Owner generates a token for a specific signature
router.post('/:signatureId/token', authenticateToken, generateSignatureToken);

// Public: validate token and get signature/document info
router.get('/validate', validateSignatureToken);

// Public: sign using a token (body: { token, signatureText, signerName })
router.put('/sign', signWithToken);

export default router;
