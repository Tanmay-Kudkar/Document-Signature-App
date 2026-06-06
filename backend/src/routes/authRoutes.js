import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Example of a protected route
router.get('/me', authenticateToken, (req, res) => {
    // req.user is set by the middleware
    res.json({ message: 'This is a protected route', user: req.user });
});

export default router;
