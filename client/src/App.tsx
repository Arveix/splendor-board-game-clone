import { useEffect, useState } from 'react';
import HomePage from './components/HomePage';
import LobbyPage from './components/LobbyPage';
import UsernameGate from './components/UsernameGate';
import type { GameStatus, UserSession } from './types';

const STORAGE_USERNAME_KEY = 'splendor_username';
const STORAGE_SESSION_ID_KEY = 'splendor_session_id';
const STORAGE_CURRENT_GAME_KEY = 'splendor_current_game_id';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const storedName = localStorage.getItem(STORAGE_USERNAME_KEY);
      const storedId = localStorage.getItem(STORAGE_SESSION_ID_KEY);
      const storedGameId = localStorage.getItem(STORAGE_CURRENT_GAME_KEY);

      if (storedName && storedName.trim() && storedId && storedId.trim()) {
        return {
          username: storedName.trim(),
          sessionId: storedId.trim(),
          currentGameSessionId: storedGameId && storedGameId.trim() ? storedGameId.trim() : null,
          createdAt: Date.now(),
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  // URL format: Base URL followed by the game session ID without any keyword in between
  const getGameIdFromUrl = (): string | null => {
    const pathname = window.location.pathname;
    if (!pathname || pathname === '/') return null;
    const match = pathname.match(/^\/([^/]+)/);
    if (!match) return null;
    const segment = decodeURIComponent(match[1]).trim();
    if (segment === 'api') return null;
    return segment;
  };

  const [urlGameId, setUrlGameId] = useState<string | null>(getGameIdFromUrl());
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');

  const handleSessionInvalidated = () => {
    try {
      localStorage.removeItem(STORAGE_USERNAME_KEY);
      localStorage.removeItem(STORAGE_SESSION_ID_KEY);
      localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
    } catch {
      // Ignore storage errors
    }
    setSession(null);
    setUrlGameId(null);
    window.history.replaceState(null, '', '/');
  };

  const handleGameNotFound = () => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentGameSessionId: null,
      };
    });
    try {
      localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
    } catch {
      // Ignore
    }
    window.history.replaceState(null, '', '/');
    setUrlGameId(null);
    setGameStatus('waiting');
  };

  // Verify session with server on initial load and handle auth verification
  useEffect(() => {
    if (!session?.sessionId) return;

    fetch('/api/session/me', {
      headers: {
        'x-session-id': session.sessionId,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          // Missing or invalid session ID: server rejected auth
          handleSessionInvalidated();
          return null;
        }
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .then((serverSession: UserSession | null) => {
        if (serverSession) {
          setSession(serverSession);
          try {
            localStorage.setItem(STORAGE_USERNAME_KEY, serverSession.username);
            localStorage.setItem(STORAGE_SESSION_ID_KEY, serverSession.sessionId);
            if (serverSession.currentGameSessionId) {
              localStorage.setItem(STORAGE_CURRENT_GAME_KEY, serverSession.currentGameSessionId);
            } else {
              localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
            }
          } catch {
            // Ignore
          }
        }
      })
      .catch(() => {
        // Network error / disconnected: session persists across network error
      });
  }, [session?.sessionId]);

  // When the user is being redirected to a particular game based on the game session ID
  // attached to the user session, check whether that particular game exists.
  // If the game does not exist anymore, remove the associated game session ID from the user session.
  // URL format is base URL followed by game session ID (e.g. /:gameId).
  useEffect(() => {
    if (!session?.sessionId || !session.currentGameSessionId) return;

    const gameIdToCheck = session.currentGameSessionId;
    let isCancelled = false;

    fetch(`/api/games/${encodeURIComponent(gameIdToCheck)}`, {
      headers: {
        'x-session-id': session.sessionId,
      },
    })
      .then((res) => {
        if (isCancelled) return;
        if (res.status === 401) {
          handleSessionInvalidated();
          return;
        }
        if (res.status === 404) {
          // Game does not exist anymore: remove currentGameSessionId from user session
          handleGameNotFound();
          return;
        }
        if (res.ok) {
          return res.json();
        }
      })
      .then((gameData) => {
        if (!gameData || isCancelled) return;
        setGameStatus(gameData.status);
        // Base URL followed directly by the game session ID without any keyword in between
        const targetUrl = `/${encodeURIComponent(gameIdToCheck)}`;
        if (window.location.pathname !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
          setUrlGameId(gameIdToCheck);
        }
      })
      .catch(() => {
        // Network error / offline: retain current session state without crashing
      });

    return () => {
      isCancelled = true;
    };
  }, [session?.sessionId, session?.currentGameSessionId, urlGameId]);

  useEffect(() => {
    const handlePopState = () => {
      const nextId = getGameIdFromUrl();
      if (session?.currentGameSessionId) {
        // Enforce stay on game page: base URL followed by game session ID
        const targetUrl = `/${encodeURIComponent(session.currentGameSessionId)}`;
        if (window.location.pathname !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
          setUrlGameId(session.currentGameSessionId);
          return;
        }
      }
      setUrlGameId(nextId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session?.currentGameSessionId]);

  const handleSessionInitialized = (newSession: UserSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(STORAGE_USERNAME_KEY, newSession.username);
      localStorage.setItem(STORAGE_SESSION_ID_KEY, newSession.sessionId);
      if (newSession.currentGameSessionId) {
        localStorage.setItem(STORAGE_CURRENT_GAME_KEY, newSession.currentGameSessionId);
      } else {
        localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
      }
    } catch {
      // Ignore
    }
  };

  const handleGameJoined = (gameId: string) => {
    if (!session) return;
    const updatedSession: UserSession = {
      ...session,
      currentGameSessionId: gameId,
    };
    setSession(updatedSession);
    setGameStatus('waiting');
    try {
      localStorage.setItem(STORAGE_CURRENT_GAME_KEY, gameId);
    } catch {
      // Ignore
    }
    // Base URL followed directly by game session ID without any keyword
    window.history.pushState(null, '', `/${encodeURIComponent(gameId)}`);
    setUrlGameId(gameId);
  };

  const handleLeaveGame = async () => {
    if (!session) return;
    const targetGameId = session.currentGameSessionId || urlGameId;

    if (targetGameId) {
      try {
        const res = await fetch(`/api/games/${targetGameId}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': session.sessionId,
          },
        });
        if (res.status === 401) {
          handleSessionInvalidated();
          return;
        }
      } catch {
        // Disconnected fallback: still remove game session ID locally
      }
    }

    const updatedSession: UserSession = {
      ...session,
      currentGameSessionId: null,
    };
    setSession(updatedSession);
    setGameStatus('waiting');

    try {
      localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
    } catch {
      // Ignore
    }

    window.history.pushState(null, '', '/');
    setUrlGameId(null);
  };

  // MANDATORY USERNAME GATE: Prompt user for username if no session initialized
  // User cannot access any part of the site without setting a username first
  if (!session) {
    return <UsernameGate onSessionInitialized={handleSessionInitialized} />;
  }

  const activeGameId = session.currentGameSessionId || urlGameId;
  const isInGame = Boolean(session.currentGameSessionId);

  return (
    <div className="min-h-screen bg-[#2A1A10] bg-[radial-gradient(ellipse_at_center,_#2A1A10_0%,_#120A05_100%)] text-[#F3E9D2] flex flex-col justify-between font-['EB_Garamond',serif]">
      {/* Top Header */}
      <header className="w-full bg-[#1B1712] border-b border-[#B8923A] px-4 py-3 flex-shrink-0 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-[#B8923A] font-['Cinzel'] leading-none">
              SPLENDOR
            </h1>
            <p className="text-xs text-[#B9AE96] font-['EB_Garamond'] italic leading-tight mt-0.5">
              Renaissance Merchant&apos;s Table
            </p>
          </div>

          {/* Right Header Navigation & Session Pill */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1B1712] border border-[#B8923A] shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E9E5B] shadow-[0_0_6px_#6FD79A]" />
              <span className="text-base font-medium text-[#F3E9D2] font-['EB_Garamond']">
                {session.username}
              </span>
            </div>

            {!isInGame && (
              <button
                onClick={handleSessionInvalidated}
                title="Reset username session"
                className="text-xs font-['Cinzel'] uppercase tracking-wider text-[#B9AE96] hover:text-[#F0707F] bg-[#1B1712] hover:bg-[#25211D] border border-[#B8923A]/50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View: Render LobbyPage (handling waiting, active, completed states) if in game; HomePage otherwise */}
      {isInGame && activeGameId ? (
        <LobbyPage
          gameId={activeGameId}
          sessionId={session.sessionId}
          currentUsername={session.username}
          initialStatus={gameStatus}
          onStatusChange={setGameStatus}
          onLeaveGame={handleLeaveGame}
          onGameNotFound={handleGameNotFound}
        />
      ) : (
        <HomePage
          session={session}
          onGameJoined={handleGameJoined}
          onSessionInvalidated={handleSessionInvalidated}
        />
      )}

      {/* Footer */}
      <footer className="w-full border-t border-[#B8923A]/30 py-3 text-center text-xs text-[#B9AE96] font-['EB_Garamond'] italic">
        Splendor Renaissance Merchant&apos;s Table &bull; Private Game
      </footer>
    </div>
  );
}
