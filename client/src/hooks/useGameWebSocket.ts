import { useEffect, useRef } from 'react';
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
  // Keep latest callbacks in refs so re-renders don't tear down the WebSocket
  const onGameUpdateRef = useRef(onGameUpdate);
  const onGameNotFoundRef = useRef(onGameNotFound);

  useEffect(() => {
    onGameUpdateRef.current = onGameUpdate;
    onGameNotFoundRef.current = onGameNotFound;
  });

  useEffect(() => {
    if (!gameId || !sessionId) return;

    const wsProto = BACKEND_URL.startsWith('https:') ? 'wss:' : 'ws:';
    const host = BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProto}//${host}/ws?gameId=${encodeURIComponent(gameId)}&sessionId=${encodeURIComponent(sessionId)}`;

    let ws: WebSocket | null = null;
    let isCleanedUp = false;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isCleanedUp && ws) {
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'GAME_UPDATED' && message.game) {
            onGameUpdateRef.current(message.game);
          } else if (message.type === 'GAME_DISCARDED') {
            onGameNotFoundRef.current();
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = (event) => {
        if (!isCleanedUp && event.code === 4004) {
          onGameNotFoundRef.current();
        }
      };
    } catch {
      // WebSocket connection error handled gracefully
    }

    return () => {
      isCleanedUp = true;
      // Only close immediately if already open; otherwise onopen closes it cleanly
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [gameId, sessionId]);
}
