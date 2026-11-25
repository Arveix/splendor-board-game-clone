import { useEffect, useState } from 'react';
import { getCurrentSessionApi, getGameApi, removePlayerApi } from './api';
import { GamePage } from './components/GamePage';
import HomePage from './components/HomePage';
import LobbyPage from './components/LobbyPage';
import UsernameGate from './components/UsernameGate';
import type { GameStatus, UserSession } from './types';
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
  updateStoredGameId,
} from './utils/authStorage';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(getStoredSession);

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSessionInvalidated = () => {
    clearStoredSession();
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
    updateStoredGameId(null);
    window.history.replaceState(null, '', '/');
    setUrlGameId(null);
    setGameStatus('waiting');
  };

  // Verify session with server on initial load and handle auth verification
  useEffect(() => {
    if (!session?.sessionId) return;

    getCurrentSessionApi(session.sessionId)
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
          saveStoredSession(serverSession);
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

    getGameApi(session.sessionId, gameIdToCheck)
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
    saveStoredSession(newSession);
  };

  const handleGameJoined = (gameId: string) => {
    if (!session) return;
    const updatedSession: UserSession = {
      ...session,
      currentGameSessionId: gameId,
    };
    setSession(updatedSession);
    setGameStatus('waiting');
    updateStoredGameId(gameId);
    // Base URL followed directly by game session ID without any keyword
    window.history.pushState(null, '', `/${encodeURIComponent(gameId)}`);
    setUrlGameId(gameId);
  };

  const handleLeaveGame = async () => {
    if (!session) return;
    const targetGameId = session.currentGameSessionId || urlGameId;

    if (targetGameId) {
      try {
        const res = await removePlayerApi(session.sessionId, targetGameId);
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
    updateStoredGameId(null);

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
  const isGameActive = isInGame && Boolean(activeGameId) && (gameStatus === 'active' || gameStatus === 'completed');

  // When game is active or completed, dedicate the entire screen to the game board (no header/footer website chrome)
  if (isGameActive && activeGameId) {
    return (
      <main className="w-full min-h-[100dvh] text-[#F3E9D2] flex flex-col font-garamond">
        <GamePage
          gameId={activeGameId}
          sessionId={session.sessionId}
          currentUsername={session.username}
          onStatusChange={setGameStatus}
          onLeaveGame={handleLeaveGame}
          onGameNotFound={handleGameNotFound}
        />
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] text-[#F3E9D2] flex flex-col justify-between font-garamond">

      {/* Top Header: #120A05 with gold 1px line on inner edge */}
      <header className="w-full bg-[#120A05] border-b border-[#B8923A] px-4 py-3 sm:py-4 pt-[max(0.75rem,env(safe-area-inset-top))] flex-shrink-0 z-40 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-[28px] font-bold tracking-[0.12em] uppercase text-[#D4A83A] font-cinzel leading-none select-none">
              SPLENDOR
            </h1>
          </div>

          {/* Right Header Navigation & Session Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg splendor-panel hover:brightness-110 transition-all cursor-pointer"
            >
              <span className="text-[18px] font-medium text-[#F3E9D2] font-garamond">
                {session.username}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-[#B9AE96] transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-lg splendor-panel z-50 flex flex-col font-garamond">
                  <button
                    type="button"
                    onClick={() => {
                      // Placeholder for future change username feature
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-[14px] font-semibold text-[#F3E9D2] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Change Username</span>
                  </button>
                  <div className="h-[1px] bg-[#B8923A]/30 my-1 mx-2" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleSessionInvalidated();
                    }}
                    className="w-full px-4 py-2 text-left text-[14px] font-semibold text-[#F0707F] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main View: Render GamePage if active or completed; LobbyPage if in waiting lobby; HomePage otherwise */}
      {isInGame && activeGameId ? (
        gameStatus === 'active' || gameStatus === 'completed' ? (
          <GamePage
            gameId={activeGameId}
            sessionId={session.sessionId}
            currentUsername={session.username}
            onStatusChange={setGameStatus}
            onLeaveGame={handleLeaveGame}
            onGameNotFound={handleGameNotFound}
          />
        ) : (
          <LobbyPage
            gameId={activeGameId}
            sessionId={session.sessionId}
            currentUsername={session.username}
            onStatusChange={setGameStatus}
            onLeaveGame={handleLeaveGame}
            onGameNotFound={handleGameNotFound}
          />
        )
      ) : (
        <HomePage
          session={session}
          onGameJoined={handleGameJoined}
          onSessionInvalidated={handleSessionInvalidated}
        />
      )}

      {/* Footer: #120A05 with gold line */}
      <footer className="w-full bg-[#120A05] border-t border-[#B8923A] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-[#B9AE96] font-garamond italic shrink-0">
        Splendor &bull; Merchant&apos;s Table
      </footer>
    </div>
  );
}
