import { WebSocket, WebSocketServer } from 'ws';
import { games, userSessions } from './store.js';
// Map of gameId -> Set of active WebSocket connections
const gameSockets = new Map();
export function initWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    // Log raw HTTP upgrade attempts before ws processes them
    server.on('upgrade', (req) => {
        console.log('Upgrade request received:', req.url, req.headers.origin);
    });
    wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '', 'http://localhost');
        const gameId = url.searchParams.get('gameId');
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId || !userSessions.has(sessionId)) {
            ws.close(4001, 'Invalid or missing session ID');
            return;
        }
        if (!gameId || !games.has(gameId)) {
            ws.close(4004, 'Game not found');
            return;
        }
        if (!gameSockets.has(gameId)) {
            gameSockets.set(gameId, new Set());
        }
        const sockets = gameSockets.get(gameId);
        sockets.add(ws);
        // Immediately push current game state upon connection
        const currentGame = games.get(gameId);
        if (currentGame) {
            ws.send(JSON.stringify({ type: 'GAME_UPDATED', game: currentGame.toJSON() }));
        }
        const removeSocket = () => {
            sockets.delete(ws);
            if (sockets.size === 0) {
                gameSockets.delete(gameId);
            }
        };
        ws.on('close', removeSocket);
        ws.on('error', removeSocket);
    });
    return wss;
}
export function broadcastGameUpdate(gameId, payload) {
    const sockets = gameSockets.get(gameId);
    if (!sockets)
        return;
    const data = JSON.stringify(payload);
    for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}
