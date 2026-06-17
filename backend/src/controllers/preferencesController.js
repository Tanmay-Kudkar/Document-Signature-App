import { pool } from '../db.js';

/**
 * GET /api/user/preferences
 * Returns the stored sig_config and field_colors for the authenticated user.
 */
export const getPreferences = async (req, res) => {
    try {
        const { userId } = req.user;
        const result = await pool.query(
            'SELECT sig_config, field_colors FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            return res.json({ sig_config: null, field_colors: null });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('getPreferences error:', err);
        res.status(500).json({ error: 'Failed to load preferences' });
    }
};

/**
 * PUT /api/user/preferences
 * Upserts (insert or update) the sig_config and/or field_colors for the user.
 * Body: { sig_config?: object, field_colors?: object }
 */
export const savePreferences = async (req, res) => {
    try {
        const { userId } = req.user;
        const { sig_config, field_colors } = req.body;

        await pool.query(
            `INSERT INTO user_preferences (user_id, sig_config, field_colors, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) DO UPDATE
               SET sig_config   = COALESCE($2, user_preferences.sig_config),
                   field_colors = COALESCE($3, user_preferences.field_colors),
                   updated_at   = NOW()`,
            [userId, sig_config ?? null, field_colors ?? null]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('savePreferences error:', err);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
};
