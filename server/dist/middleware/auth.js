import { userSessions } from '../store.js';
export function authMiddleware(req, res, next) {
    const headerValue = req.headers['x-session-id'] || req.headers['authorization'];
    const rawId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const cleanId = rawId ? rawId.replace(/^Bearer\s+/i, '').trim() : '';
    if (!cleanId) {
        return res.status(401).json({ error: 'no session ID' });
    }
    const session = userSessions.get(cleanId);
    if (!session) {
        return res.status(401).json({ error: 'Invalid session ID' });
    }
    req.userSession = session;
    next();
}
