import express from 'express';
import { uploadDocument } from '../controllers/docController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/upload', authenticateToken, upload.single('document'), uploadDocument);

export default router;