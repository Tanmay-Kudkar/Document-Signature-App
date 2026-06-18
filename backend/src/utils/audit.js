import { pool } from '../db.js';

export const AUDIT_ACTIONS = {
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    DOCUMENT_VIEWED: 'DOCUMENT_VIEWED',
    DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    DOCUMENT_SIGNED: 'DOCUMENT_SIGNED',
    DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
    DOCUMENT_DELETED: 'DOCUMENT_DELETED',
    DOCUMENT_COMPLETED: 'DOCUMENT_COMPLETED',
    SIGNATURE_ADDED: 'SIGNATURE_ADDED',
    SIGNATURE_DELETED: 'SIGNATURE_DELETED',
    EMAIL_SENT: 'EMAIL_SENT',
    LINK_SHARED: 'LINK_SHARED',
    CONFIG_SAVED: 'CONFIG_SAVED'
};

/**
 * Create audit trail entry
 */
export const logAudit = async ({
    documentId,
    actorId = null,
    action,
    req = null,
    ipAddress = null,
    userAgent = null,
    metadata = {}
}) => {
    try {
        // Validation
        if (!documentId) {
            throw new Error('documentId is required');
        }

        if (!action) {
            throw new Error('action is required');
        }

        let finalIp = ipAddress || 'Unknown';
        let finalUa = userAgent || 'Unknown';
        let requestId = null;
        let sessionId = null;
        let country = null;
        let city = null;

        if (req) {
            finalIp =
                req.headers['cf-connecting-ip'] ||
                req.headers['x-real-ip'] ||
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.ip ||
                req.socket?.remoteAddress ||
                'Unknown';

            finalUa = req.get('User-Agent') || 'Unknown';

            // Extract request_id if present
            const headerReqId = req.headers['x-request-id'] || req.id || null;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (headerReqId && uuidRegex.test(headerReqId)) {
                requestId = headerReqId;
            }

            // Extract session_id if present
            sessionId = req.sessionID || req.session?.id || req.headers['x-session-id'] || null;

            // Extract country & city (Cloudflare / Vercel headers)
            country = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || null;
            city = req.headers['cf-ipcity'] || req.headers['x-vercel-ip-city'] || null;
        }

        // Normalize localhost addresses
        const localhostIps = [
            '::1',
            '127.0.0.1',
            '::ffff:127.0.0.1',
            'localhost',
            '1'
        ];

        if (localhostIps.includes(finalIp)) {
            finalIp = 'Localhost';
        }

        // Parse device type from User Agent
        let deviceType = 'Desktop';
        const ua = finalUa.toLowerCase();
        if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
            deviceType = 'Mobile';
        } else if (ua.includes('ipad') || ua.includes('tablet')) {
            deviceType = 'Tablet';
        } else if (ua.includes('unknown')) {
            deviceType = 'Unknown';
        }

        await pool.query(
            `
            INSERT INTO audit_logs (
                document_id,
                actor_id,
                action,
                ip_address,
                user_agent,
                metadata,
                request_id,
                session_id,
                country,
                city,
                device_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `,
            [
                documentId,
                actorId,
                action,
                finalIp,
                finalUa,
                JSON.stringify(metadata || {}),
                requestId,
                sessionId,
                country,
                city,
                deviceType
            ]
        );

    } catch (error) {
        console.error('[AUDIT_LOG_ERROR]', {
            message: error.message,
            documentId,
            actorId,
            action
        });
    }
};
