import { useEffect } from 'react';
import type { GameSession } from '../types';
import { BACKEND_URL } from '../api/config';

interface UseGameWebSocketOptions {
  gameId: string | null | undefined;
  sessionId: string | null | undefined;
  onGameUpdate: (game: GameSession) => void;
  onGameNotFound: () => void;
}

export function useGameWebSocket({
  gameId,
  sessionId,
  onGameUpdate,
  onGameNotFound,
}: UseGameWebSocketOptions): void {
  useEffect(() => {
    if (!gameId || !sessionId) return;

    const wsProto = BACKEND_URL.startsWith('https:') ? 'wss:' : 'ws:';
    const host = BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProto}//${host}/ws?gameId=${encodeURIComponent(gameId)}&sessionId=${encodeURIComponent(sessionId)}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'GAME_UPDATED' && message.game) {
            onGameUpdate(message.game);
          } else if (message.type === 'GAME_DISCARDED') {
            onGameNotFound();
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = (event) => {
        if (event.code === 4004) {
          onGameNotFound();
        }
      };
    } catch {
      // WebSocket connection error handled gracefully
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [gameId, sessionId, onGameUpdate, onGameNotFound]);
}
