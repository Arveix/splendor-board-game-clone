import { useEffect, useState } from 'react';
import { getGameApi, removePlayerApi, startGameApi } from '../api';
import { useGameWebSocket } from '../hooks';
import type { GameSession, GameSettings, GameStatus } from '../types';
import { WarningPlaque } from './WarningPlaque';

interface LobbyPageProps {
  gameId: string;
  sessionId: string;
  currentUsername: string;
  onLeaveGame: () => Promise<void> | void;
  onGameNotFound: () => void;
  onStatusChange?: (status: GameStatus) => void;
}

// Reusable copy-to-clipboard button
const CopyButton = ({
  copied,
  onClick,
  label,
}: {
  copied: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={copied ? `Copied ${label}` : `Copy ${label}`}
    aria-label={`Copy ${label}`}
    className={`px-3 py-2 transition-colors cursor-pointer flex items-center justify-center shrink-0 hover:bg-white/[0.04] ${
      copied
        ? 'text-[#6FD79A]'
        : 'text-[#B9AE96] hover:text-[#F3E9D2]'
    }`}
  >
    {copied ? (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    )}
  </button>
);

export default function LobbyPage({
  gameId,
  sessionId,
  currentUsername,
  onLeaveGame,
  onGameNotFound,
  onStatusChange,
}: LobbyPageProps) {
  const [game, setGame] = useState<GameSession | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [copiedGameId, setCopiedGameId] = useState(false);
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${encodeURIComponent(gameId)}`
      : `/${encodeURIComponent(gameId)}`;

  const copyToClipboard = async (text: string, type: 'id' | 'link') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (type === 'id') {
        setCopiedGameId(true);
        setTimeout(() => setCopiedGameId(false), 2000);
      } else {
        setCopiedJoinLink(true);
        setTimeout(() => setCopiedJoinLink(false), 2000);
      }
    } catch {
      // Ignore clipboard write failures
    }
  };

  // Lobby Configuration Options for the Host
  const [gemTokens, setGemTokens] = useState<number>(7);
  const [goldTokens, setGoldTokens] = useState<number>(5);
  const [faceUpCards, setFaceUpCards] = useState<number>(4);
  const [nobleCount, setNobleCount] = useState<number>(5);
  const [winPoints, setWinPoints] = useState<number>(15);
  const [turnDuration, setTurnDuration] = useState<number>(90);
  const [hasUserCustomized, setHasUserCustomized] = useState<boolean>(false);

  // Update default options based on standard Splendor rules when player count changes
  useEffect(() => {
    if (game && !hasUserCustomized) {
      const pCount = game.players.length;
      const defaultGems = pCount === 2 ? 4 : pCount === 3 ? 5 : 7;
      const defaultNobles = Math.min(10, pCount + 1);
      const timer = setTimeout(() => {
        setGemTokens(defaultGems);
        setGoldTokens(5);
        setFaceUpCards(4);
        setNobleCount(defaultNobles);
        setWinPoints(game.winPoints ?? 15);
        setTurnDuration(game.settings?.turnDurationSeconds ?? 90);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [game?.players.length, game?.winPoints, game?.settings?.turnDurationSeconds, hasUserCustomized]);

  // Initial fetch to load initial game session state upon opening
  useEffect(() => {
    let isCancelled = false;

    getGameApi(sessionId, gameId)
      .then((res) => {
        if (isCancelled) return;
        if (res.status === 404) {
          onGameNotFound();
          return;
        }
        if (res.ok) {
          return res.json();
        }
      })
      .then((gameData: GameSession | undefined) => {
        if (gameData && !isCancelled) {
          setGame(gameData);
          onStatusChange?.(gameData.status);
        }
      })
      .catch(() => {
        // Disconnected / offline
      });

    return () => {
      isCancelled = true;
    };
  }, [gameId, sessionId, onGameNotFound, onStatusChange]);

  // WebSocket connection via centralized hook
  useGameWebSocket({
    gameId,
    sessionId,
    onGameUpdate: (updatedGame) => {
      setGame(updatedGame);
      onStatusChange?.(updatedGame.status);
    },
    onGameNotFound,
  });

  const handleStartGameClick = async () => {
    if (playersList.length < 2 || starting) return;
    setStarting(true);
    setStartError(null);

    const payload: GameSettings = {
      gemTokenCount: gemTokens,
      goldTokenCount: goldTokens,
      faceUpCardsCount: faceUpCards,
      nobleTilesCount: nobleCount,
      winPoints: winPoints,
      turnDurationSeconds: turnDuration,
    };

    try {
      const res = await startGameApi(sessionId, gameId, payload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start game');
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Error starting game');
    } finally {
      setStarting(false);
    }
  };

  const handleLeaveClick = async () => {
    setLeaving(true);
    try {
      await onLeaveGame();
    } finally {
      setLeaving(false);
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (kickingId || !isHost) return;
    setKickingId(playerId);
    setStartError(null);
    try {
      const res = await removePlayerApi(sessionId, gameId, playerId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to kick player');
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Error kicking player');
    } finally {
      setKickingId(null);
    }
  };

  // If the current player was kicked from the lobby, automatically redirect them back to home
  useEffect(() => {
    if (game && currentUsername && game.players.length > 0) {
      const stillInGame = game.players.some((p) => p.name === currentUsername);
      if (!stillInGame) {
        onLeaveGame();
      }
    }
  }, [game, currentUsername, onLeaveGame]);

  const playersList = game?.players || [];
  const maxPlayers = game?.maxPlayers || 4;
  const canStart = playersList.length >= 2;
  const isHost = Boolean(game && currentUsername && game.hostUsername === currentUsername);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-garamond">
      <div className="w-full max-w-2xl flex flex-col items-center gap-5 sm:gap-6">
        {/* Two-Column Layout: Join Link (left, flex-1) | Game ID (right, separate container) */}
        <div className="w-full flex items-stretch gap-2.5 sm:gap-3">
          {/* Left Column: Join Link Component */}
          <div className="flex-1 min-w-0 splendor-panel rounded-lg px-3 sm:px-4 py-3 sm:py-3.5 flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider font-cinzel">
              Join Link
            </span>
            <div className="flex items-center rounded-lg bg-[#120A05] border border-[#B8923A]/30 overflow-hidden">
              <span className="flex-1 min-w-0 px-2.5 sm:px-3.5 py-2 text-[15px] sm:text-[17px] not-italic text-[#F3E9D2] font-garamond truncate select-all">
                {joinUrl}
              </span>
              <div className="h-5 w-px bg-[#B8923A]/30 shrink-0" />
              <CopyButton copied={copiedJoinLink} onClick={() => copyToClipboard(joinUrl, 'link')} label="Join Link" />
            </div>
          </div>

          {/* Right Column: Game ID Component (Separate container) */}
          <div className="shrink-0 splendor-panel rounded-lg px-3 sm:px-4 py-3 sm:py-3.5 flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider font-cinzel">
              Game ID
            </span>
            <div className="flex items-center rounded-lg bg-[#120A05] border border-[#B8923A]/30 overflow-hidden">
              <span className="px-2.5 sm:px-3.5 py-2 text-[15px] sm:text-[17px] font-semibold text-[#F3E9D2] font-garamond tracking-wider select-all">
                {gameId}
              </span>
              <div className="h-5 w-px bg-[#B8923A]/30 shrink-0" />
              <CopyButton copied={copiedGameId} onClick={() => copyToClipboard(gameId, 'id')} label="Game ID" />
            </div>
          </div>
        </div>

        {/* List of joined players: Splendor panel */}
        <div className="w-full splendor-panel rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#B8923A]/30 pb-3">
            <span className="text-base font-semibold uppercase tracking-wider text-[#F3E9D2] font-cinzel">
              Joined Players
            </span>
            <span className="text-[14px] font-garamond font-bold text-[#F3E9D2] bg-[#120A05] px-2.5 py-0.5 rounded-lg border border-black/50">
              {playersList.length} / {maxPlayers}
            </span>
          </div>

          {playersList.length === 0 ? (
            <div className="py-4 text-center text-[16px] text-[#B9AE96] font-garamond italic">
              Waiting for players to join...
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {playersList.map((player, idx) => {
                const isPlayerHost = game?.hostUsername === player.name;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#120A05] border border-[#B8923A]/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-garamond text-[#B9AE96] font-bold">
                        {idx + 1}.
                      </span>
                      <span className="text-[18px] not-italic font-medium text-[#F3E9D2] font-garamond truncate">
                        {player.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPlayerHost && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B1712] bg-[#B8923A] px-2 py-0.5 rounded-lg font-cinzel">
                          Host
                        </span>
                      )}

                      {isHost && !isPlayerHost && (
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(player.id)}
                          disabled={kickingId === player.id}
                          title={`Kick ${player.name}`}
                          aria-label={`Kick ${player.name}`}
                          className="p-1.5 rounded-lg text-[#B9AE96]/60 hover:text-[#F0707F] hover:bg-[#260F10] border border-transparent hover:border-[#9B3038]/50 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Host Setup & Start Game Controls */}
          {isHost ? (
            <div className="flex flex-col gap-3.5 border-t border-[#B8923A]/30 pt-4 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wider text-[#B8923A] font-cinzel">
                  Game Setup Options
                </span>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-3 text-left">
                {/* Win Points (Points required to win) */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#B9AE96] font-medium font-garamond pl-[calc(0.75rem+1px)]">
                    Win Points
                  </label>
                  <select
                    value={winPoints}
                    onChange={(e) => {
                      setWinPoints(Number(e.target.value));
                      setHasUserCustomized(true);
                    }}
                    className="input-select-brass text-[#F3D679]"
                  >
                    {Array.from({ length: 26 }, (_, i) => i + 5).map((pts) => (
                      <option key={pts} value={pts}>
                        {pts} points {pts === 15 ? '(Standard)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Turn Timer Duration */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#B9AE96] font-medium font-garamond pl-[calc(0.75rem+1px)]">
                    Turn Timer
                  </label>
                  <select
                    value={turnDuration}
                    onChange={(e) => {
                      setTurnDuration(Number(e.target.value));
                      setHasUserCustomized(true);
                    }}
                    className="input-select-brass"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds (1 min)</option>
                    <option value={90}>90 seconds (1.5 min) (Default)</option>
                    <option value={120}>120 seconds (2 min)</option>
                    <option value={180}>180 seconds (3 min)</option>
                    <option value={300}>300 seconds (5 min)</option>
                  </select>
                </div>

                {/* Noble Tiles Count */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#B9AE96] font-medium font-garamond pl-[calc(0.75rem+1px)]">
                    Noble Tiles
                  </label>
                  <select
                    value={nobleCount}
                    onChange={(e) => {
                      setNobleCount(Number(e.target.value));
                      setHasUserCustomized(true);
                    }}
                    className="input-select-brass"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} noble tiles
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gem Tokens per Color */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#B9AE96] font-medium font-garamond pl-[calc(0.75rem+1px)]">
                    Gem Tokens (max 8)
                  </label>
                  <select
                    value={gemTokens}
                    onChange={(e) => {
                      setGemTokens(Number(e.target.value));
                      setHasUserCustomized(true);
                    }}
                    className="input-select-brass"
                  >
                    {[4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>
                        {num} tokens each
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gold Tokens */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#B9AE96] font-medium font-garamond pl-[calc(0.75rem+1px)]">
                    Gold Tokens (max 5)
                  </label>
                  <select
                    value={goldTokens}
                    onChange={(e) => {
                      setGoldTokens(Number(e.target.value));
                      setHasUserCustomized(true);
                    }}
                    className="input-select-brass text-[#D4A83A]"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num} tokens
                      </option>
                    ))}
                  </select>
                </div>

                {/* Face-up Cards */}
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-sm text-[#B9AE96] font-medium font-garamond pl-[calc(0.75rem+1px)]">
                    Face-Up Cards
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFaceUpCards(3);
                        setHasUserCustomized(true);
                      }}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer font-cinzel ${
                        faceUpCards === 3
                          ? 'bg-[#B8923A] text-[#1B1712] border-[#B8923A] shadow-xs'
                          : 'bg-[#120A05] text-[#B9AE96] border-black/40 hover:border-[#B8923A]'
                      }`}
                    >
                      3 Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFaceUpCards(4);
                        setHasUserCustomized(true);
                      }}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer font-cinzel ${
                        faceUpCards === 4
                          ? 'bg-[#B8923A] text-[#1B1712] border-[#B8923A] shadow-xs'
                          : 'bg-[#120A05] text-[#B9AE96] border-black/40 hover:border-[#B8923A]'
                      }`}
                    >
                      4 Cards
                    </button>
                  </div>
                </div>
              </div>

              {/* Start Game Button: Primary button per Section 1 (Cinzel 600, 16px uppercase, letter-spacing 0.08em) */}
              <div className="flex flex-col items-center gap-2 mt-2">
                <button
                  type="button"
                  disabled={!canStart || starting}
                  onClick={handleStartGameClick}
                  className="w-full py-3.5 px-4 rounded-lg btn-brass-primary shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  {starting ? 'Initializing Game Session...' : 'Start Game'}
                </button>

                {!canStart && (
                  <span className="text-xs text-[#B9AE96] font-garamond italic">
                    Waiting for at least 2 players to start
                  </span>
                )}

                {startError && (
                  <WarningPlaque
                    message={startError}
                    heading="SETUP ERROR"
                    onClose={() => setStartError(null)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 mt-1 border-t border-[#B8923A]/30 pt-3">
              <span className="text-sm text-[#B9AE96] font-garamond">
                Waiting for host <strong className="text-[#B8923A] font-semibold">{game?.hostUsername}</strong> to configure and start the game...
              </span>
            </div>
          )}
        </div>

        {/* Leave Game Button: Secondary utility button */}
        <button
          type="button"
          disabled={leaving}
          onClick={handleLeaveClick}
          className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#260F10] hover:bg-[#3A1416] border border-[#9B3038] text-[#F3A0A4] text-xs font-cinzel font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {leaving ? 'Leaving Game...' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
}
