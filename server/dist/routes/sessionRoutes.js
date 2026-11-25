import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as sessionController from '../controllers/sessionController.js';
const router = Router();
// Route declarations mapped to session controller
router.post('/', sessionController.createSession);
router.get('/me', authMiddleware, sessionController.getCurrentSession);
export default router;
