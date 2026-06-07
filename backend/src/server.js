import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import docRoutes from './routes/docRoutes.js';
import { initDb } from './db.js';

dotenv.config();

// Initialize Database
initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'API is healthy' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
