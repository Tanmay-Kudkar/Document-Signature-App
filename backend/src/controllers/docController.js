import { pool } from '../db.js';

export const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const userId = req.user.userId;
        const filePath = req.file.path;
        const originalName = req.file.originalname;

        const result = await pool.query(
            `INSERT INTO documents (user_id, file_path, original_name) 
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, filePath, originalName]
        );

        res.status(201).json({
            message: 'Document uploaded successfully',
            document: result.rows[0]
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};