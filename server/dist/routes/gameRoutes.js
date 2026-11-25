import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validateActivePlayer } from '../middleware/gameValidation.js';
import * as gameController from '../controllers/gameController.js';
const router = Router();
// Apply authMiddleware to all game routes
router.use(authMiddleware);
// Route declarations mapped to game controller
router.get('/', gameController.listGames);
router.post('/', gameController.createGame);
router.get('/:id', gameController.getGame);
router.post('/:id/join', gameController.joinGame);
router.post('/:id/remove-player', gameController.removePlayer);
router.post('/:id/start', gameController.startGame);
router.post('/:id/rematch', gameController.rematchGame);
// Scoped router for player actions executed during active turn
const playerActionRouter = Router({ mergeParams: true });
playerActionRouter.use(validateActivePlayer);
playerActionRouter.post('/end-turn', gameController.endTurn);
playerActionRouter.post('/buy-card', gameController.buyCard);
playerActionRouter.post('/reserve-card', gameController.reserveCard);
playerActionRouter.post('/update-tokens', gameController.updateTokens);
playerActionRouter.post('/invite-noble', gameController.inviteNoble);
router.use('/:id/execute-player-action', playerActionRouter);
export default router;
