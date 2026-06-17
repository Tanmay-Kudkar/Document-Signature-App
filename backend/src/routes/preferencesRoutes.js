import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { getPreferences, savePreferences } from '../controllers/preferencesController.js';

const router = Router();

router.get('/',  authenticateToken, getPreferences);
router.put('/',  authenticateToken, savePreferences);

export default router;
