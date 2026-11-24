import { Router } from 'express';
import gameRoutes from './gameRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import { games, userSessions } from '../store.js';
const router = Router();
// Healthcheck
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        activeSessions: userSessions.size,
        activeGames: games.size,
    });
});
// Specific route modules
router.use('/session', sessionRoutes);
router.use('/games', gameRoutes);
export default router;
