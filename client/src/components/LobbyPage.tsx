import { useEffect, useState } from 'react';
import type { GameSession, GameSettings, GameStatus } from '../types';

interface LobbyPageProps {
  gameId: string;
  sessionId: string;
  currentUsername: string;
  initialStatus?: GameStatus;
  onLeaveGame: () => Promise<void> | void;
  onGameNotFound: () => void;
  onStatusChange?: (status: GameStatus) => void;
}

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
  const [hasUserCustomized, setHasUserCustomized] = useState<boolean>(false);

  // Update default options based on standard Splendor rules when player count changes
  useEffect(() => {
    if (game && !hasUserCustomized) {
      const pCount = game.players.length;
      const defaultGems = pCount === 2 ? 4 : pCount === 3 ? 5 : 7;
      const defaultNobles = Math.min(10, pCount + 1);
      setGemTokens(defaultGems);
      setGoldTokens(5);
      setFaceUpCards(4);
      setNobleCount(defaultNobles);
    }
  }, [game?.players.length, hasUserCustomized]);

  // Initial fetch to load initial game session state upon opening
  useEffect(() => {
    let isCancelled = false;

    fetch(`/api/games/${encodeURIComponent(gameId)}`, {
      headers: {
        'x-session-id': sessionId,
      },
    })
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

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host =
      window.location.port === '5173'
        ? `${window.location.hostname}:3000`
        : window.location.host;
    const wsUrl = `${protocol}//${host}/ws?gameId=${encodeURIComponent(gameId)}&sessionId=${encodeURIComponent(sessionId)}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'GAME_UPDATED' && message.game) {
            setGame(message.game);
            onStatusChange?.(message.game.status);
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
  }, [gameId, sessionId, onGameNotFound, onStatusChange]);

  const handleStartGameClick = async () => {
    if (playersList.length < 2 || starting) return;
    setStarting(true);
    setStartError(null);

    const payload: GameSettings = {
      gemTokenCount: gemTokens,
      goldTokenCount: goldTokens,
      faceUpCardsCount: faceUpCards,
      nobleTilesCount: nobleCount,
    };

    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify(payload),
      });

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

  const playersList = game?.players || [];
  const maxPlayers = game?.maxPlayers || 4;
  const canStart = playersList.length >= 2;
  const isHost = Boolean(game && currentUsername && game.hostUsername === currentUsername);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 font-['EB_Garamond',serif]">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        <div className="w-full flex flex-col items-center gap-3">
              {/* Game Session ID with Copy Button */}
              <div className="text-center flex flex-col items-center">
                <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-[0.08em] block mb-2 font-['Cinzel']">
                  Game Session ID
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl sm:text-4xl font-bold font-['Inter'] tracking-wider text-[#F3E9D2] bg-[#1A110B] border border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] px-6 py-2.5 rounded-2xl inline-block">
                    {gameId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(gameId, 'id')}
                    title={copiedGameId ? 'Copied ID' : 'Copy Game ID'}
                    aria-label="Copy Game ID"
                    className={`p-2.5 rounded-xl bg-[#120A05] border transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 ${
                      copiedGameId
                        ? 'border-[#6FD79A] text-[#6FD79A]'
                        : 'border-black/40 hover:border-[#B8923A]/40 text-[#B9AE96] hover:text-[#F3E9D2]'
                    }`}
                  >
                    {copiedGameId ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Join Link Display & Copy Button */}
              <div className="w-full bg-[#1A110B] border border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-left">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider font-['Cinzel']">
                    Join Link
                  </span>
                  <span className="text-[17px] not-italic text-[#F3E9D2] font-['EB_Garamond'] truncate select-all mt-0.5">
                    {joinUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(joinUrl, 'link')}
                  title={copiedJoinLink ? 'Copied Link' : 'Copy Join Link'}
                  aria-label="Copy Join Link"
                  className={`p-2.5 rounded-xl bg-[#120A05] border transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 ${
                    copiedJoinLink
                      ? 'border-[#6FD79A] text-[#6FD79A]'
                      : 'border-black/40 hover:border-[#B8923A]/40 text-[#B9AE96] hover:text-[#F3E9D2]'
                  }`}
                >
                  {copiedJoinLink ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* List of joined players */}
            <div className="w-full bg-[#1A110B] border border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-black/40 pb-3">
                <span className="text-base font-semibold uppercase tracking-wider text-[#F3E9D2] font-['Cinzel']">
                  Joined Players
                </span>
                <span className="text-xs font-['Inter'] font-bold text-[#F3E9D2] bg-[#120A05] px-2.5 py-0.5 rounded-md border border-black/50">
                  {playersList.length} / {maxPlayers}
                </span>
              </div>

              {playersList.length === 0 ? (
                <div className="py-4 text-center text-[17px] text-[#B9AE96] font-['EB_Garamond'] italic">
                  Waiting for players to join...
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playersList.map((player, idx) => {
                    const isPlayerHost = game?.hostUsername === player.name;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#120A05] border border-black/30"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-['Inter'] text-[#B9AE96] font-bold">
                            {idx + 1}.
                          </span>
                          <span className="text-[17px] not-italic font-normal text-[#F3E9D2] font-['EB_Garamond']">
                            {player.name}
                          </span>
                        </div>

                        {isPlayerHost && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B1712] bg-[#B8923A] px-2 py-0.5 rounded font-['Cinzel']">
                            Host
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Host Setup & Start Game Controls */}
              {isHost ? (
                <div className="flex flex-col gap-3.5 border-t border-black/40 pt-4 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wider text-[#B8923A] font-['Cinzel']">
                      Game Setup Options
                    </span>
                    <span className="text-xs text-[#B9AE96] font-['EB_Garamond'] italic">
                      Host Configuration
                    </span>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {/* Gem Tokens per Color */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#B9AE96] font-medium font-['EB_Garamond']">
                        Gem Tokens (max 8)
                      </label>
                      <select
                        value={gemTokens}
                        onChange={(e) => {
                          setGemTokens(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#120A05] border border-black/50 text-xs font-bold text-[#F3E9D2] font-['Inter'] focus:outline-none focus:border-[#B8923A]"
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
                      <label className="text-xs text-[#B9AE96] font-medium font-['EB_Garamond']">
                        Gold Tokens (max 5)
                      </label>
                      <select
                        value={goldTokens}
                        onChange={(e) => {
                          setGoldTokens(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#120A05] border border-black/50 text-xs font-bold text-[#D4A83A] font-['Inter'] focus:outline-none focus:border-[#B8923A]"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num} gold wild
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Face-up Cards */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#B9AE96] font-medium font-['EB_Garamond']">
                        Face-Up Cards
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFaceUpCards(3);
                            setHasUserCustomized(true);
                          }}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer font-['Cinzel'] ${
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
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer font-['Cinzel'] ${
                            faceUpCards === 4
                              ? 'bg-[#B8923A] text-[#1B1712] border-[#B8923A] shadow-xs'
                              : 'bg-[#120A05] text-[#B9AE96] border-black/40 hover:border-[#B8923A]'
                          }`}
                        >
                          4 Cards
                        </button>
                      </div>
                    </div>

                    {/* Noble Tiles Count */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#B9AE96] font-medium font-['EB_Garamond']">
                        Noble Tiles
                      </label>
                      <select
                        value={nobleCount}
                        onChange={(e) => {
                          setNobleCount(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#120A05] border border-black/50 text-xs font-bold text-[#F3E9D2] font-['Inter'] focus:outline-none focus:border-[#B8923A]"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} noble tiles
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Start Game Button */}
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      disabled={!canStart || starting}
                      onClick={handleStartGameClick}
                      className={`w-full py-3.5 px-4 rounded-xl text-base font-semibold uppercase tracking-[0.08em] transition-all shadow-md font-['Cinzel'] ${
                        !canStart || starting
                          ? 'bg-[#4A4338] text-[#8A8272] cursor-not-allowed'
                          : 'bg-[#B8923A] hover:bg-[#D4A83A] text-[#1B1712] shadow-[#B8923A]/20 active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      {starting ? 'Initializing Game Session...' : 'Start Game'}
                    </button>

                    {!canStart && (
                      <span className="text-xs text-[#B9AE96] font-['EB_Garamond'] italic">
                        Waiting for at least 2 players to start
                      </span>
                    )}

                    {startError && (
                      <span className="text-xs text-[#F0707F] font-medium font-['EB_Garamond']">
                        {startError}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 mt-1 border-t border-black/40 pt-3">
                  <span className="text-sm text-[#B9AE96] font-['EB_Garamond']">
                    Waiting for host <strong className="text-[#B8923A] font-semibold">{game?.hostUsername}</strong> to configure and start the game...
                  </span>
                </div>
              )}
            </div>

        {/* Leave Game Button */}
        <button
          type="button"
          disabled={leaving}
          onClick={handleLeaveClick}
          className="px-5 py-2.5 rounded-xl bg-[#C8283B]/20 hover:bg-[#C8283B]/35 border border-[#C8283B]/60 text-[#F0707F] text-xs font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer active:scale-95 disabled:opacity-50 font-['Cinzel']"
        >
          {leaving ? 'Leaving Game...' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
}
