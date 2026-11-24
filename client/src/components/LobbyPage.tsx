import { useEffect, useState } from 'react';
import { getCardDetails, getNobleDetails } from '../data/cards';
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
  initialStatus = 'waiting',
  onLeaveGame,
  onGameNotFound,
  onStatusChange,
}: LobbyPageProps) {
  const [game, setGame] = useState<GameSession | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(initialStatus);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
          // Game does not exist anymore: clear game session ID and navigate home
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
          setGameStatus(gameData.status);
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

  // WebSocket connection: push changes from the server whenever an update is made to the game session
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
            setGameStatus(message.game.status);
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
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        {/* ============================================================ */}
        {/* ACTIVE GAME SCREEN: Displays all initialized game information */}
        {/* ============================================================ */}
        {gameStatus === 'active' && (
          <div className="w-full flex flex-col items-center gap-5">
            {/* Header */}
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full inline-block mb-1.5">
                Game is active
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {game?.name || 'Splendor Session'}
              </h2>
              <span className="text-xs font-mono font-bold text-yellow-400 bg-gray-900 border border-yellow-500/30 px-3 py-1 rounded-lg inline-block mt-2">
                Session ID: {gameId}
              </span>
            </div>

            {/* Game Settings & Resources Overview */}
            <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                  Initialized Game Settings
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">
                  Standard Splendor Rules
                </span>
              </div>

              {/* Settings Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                    Noble Tiles
                  </span>
                  <span className="text-lg font-black text-white">
                    {game?.settings?.nobleTilesCount ?? game?.nobleTiles?.length ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                    Face-Up Cards
                  </span>
                  <span className="text-lg font-black text-white">
                    {game?.settings?.faceUpCardsCount ?? 4}
                  </span>
                </div>

                <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                    Gem Tokens
                  </span>
                  <span className="text-lg font-black text-white">
                    {game?.settings?.gemTokenCount ?? 7} <span className="text-xs text-gray-500 font-normal">/color</span>
                  </span>
                </div>

                <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                    Gold Tokens
                  </span>
                  <span className="text-lg font-black text-yellow-400">
                    {game?.settings?.goldTokenCount ?? 5} <span className="text-xs text-gray-500 font-normal">wild</span>
                  </span>
                </div>
              </div>

              {/* Tokens Bank */}
              <div className="mt-1 flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Available Token Bank
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Emerald</span>
                    <span className="text-base font-black text-emerald-200">{game?.tokens?.emerald ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-400 block">Sapphire</span>
                    <span className="text-base font-black text-blue-200">{game?.tokens?.sapphire ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-red-400 block">Ruby</span>
                    <span className="text-base font-black text-red-200">{game?.tokens?.ruby ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-400/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-200 block">Diamond</span>
                    <span className="text-base font-black text-white">{game?.tokens?.diamond ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Onyx</span>
                    <span className="text-base font-black text-gray-200">{game?.tokens?.onyx ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-yellow-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-yellow-400 block">Gold</span>
                    <span className="text-base font-black text-yellow-300">{game?.tokens?.gold ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Revealed Cards (Face-Up on Table) */}
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                    Revealed Cards (Face-Up on Table)
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Derived from unique card IDs
                  </span>
                </div>

                {(['tier3', 'tier2', 'tier1'] as const).map((tierKey) => {
                  const tierNum = tierKey === 'tier3' ? 3 : tierKey === 'tier2' ? 2 : 1;
                  const tierLabel = `Tier ${tierNum}`;
                  const tierRevealed = game?.revealedCards?.[tierKey] || [];
                  const deckRemaining = game?.availableCards?.[tierKey]?.length ?? 0;
                  const topDeckId = game?.topDeckCards?.[tierKey];

                  return (
                    <div key={tierKey} className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-bold border-b border-gray-800/70 pb-1.5">
                        <span className={tierNum === 3 ? 'text-blue-400' : tierNum === 2 ? 'text-amber-400' : 'text-emerald-400'}>
                          {tierLabel} ({tierRevealed.length} Face-Up)
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          Unrevealed Deck: <strong className="text-gray-200">{deckRemaining}</strong> cards | Top Card ID: <strong className="text-yellow-400">{topDeckId || 'Empty'}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {tierRevealed.map((cardId) => {
                          const details = getCardDetails(cardId);
                          return (
                            <div
                              key={cardId}
                              id={cardId}
                              data-card-id={cardId}
                              className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-yellow-500/40 transition-colors flex flex-col justify-between gap-1 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-yellow-400">{cardId}</span>
                                {details && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-950 border border-gray-700 text-gray-300">
                                    {details.color}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between mt-1">
                                <span className="text-[10px] text-gray-400">Prestige</span>
                                <span className="text-base font-black text-white">{details?.points ?? 0}</span>
                              </div>
                              {details?.cost && (
                                <div className="flex flex-wrap gap-1 mt-1 text-[9px] text-gray-400 font-mono">
                                  {details.cost.emerald > 0 && <span className="text-emerald-400">G:{details.cost.emerald}</span>}
                                  {details.cost.sapphire > 0 && <span className="text-blue-400">B:{details.cost.sapphire}</span>}
                                  {details.cost.ruby > 0 && <span className="text-red-400">R:{details.cost.ruby}</span>}
                                  {details.cost.diamond > 0 && <span className="text-gray-200">W:{details.cost.diamond}</span>}
                                  {details.cost.onyx > 0 && <span className="text-gray-500">K:{details.cost.onyx}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Noble Tiles */}
              {game?.nobleTiles && game.nobleTiles.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Active Noble Tiles ({game.nobleTiles.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {game.nobleTiles.map((nobleId) => {
                      const nobleInfo = getNobleDetails(nobleId);
                      return (
                        <div
                          key={nobleId}
                          className="px-3 py-2 rounded-xl bg-gray-950 border border-gray-800 flex items-center gap-2.5 shadow-sm"
                        >
                          <span className="text-[10px] font-mono font-bold text-yellow-400">{nobleId}</span>
                          <span className="text-xs text-gray-200 font-medium">
                            {nobleInfo?.name || 'Noble Patron'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Players in Game */}
              <div className="mt-2 flex flex-col gap-2 border-t border-gray-800 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Players in Current Game ({playersList.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {playersList.map((player, idx) => (
                    <div
                      key={player.id}
                      className="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 flex items-center gap-2"
                    >
                      <span className="text-xs text-gray-500 font-mono">{idx + 1}.</span>
                      <span className="text-xs font-bold text-gray-200">{player.name}</span>
                      {game?.hostUsername === player.name && (
                        <span className="text-[9px] font-bold uppercase text-yellow-300 bg-yellow-950/60 border border-yellow-500/40 px-1.5 py-0.5 rounded">
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* COMPLETED GAME SCREEN                                        */}
        {/* ============================================================ */}
        {gameStatus === 'completed' && (
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Game is completed
            </h2>
            <span className="text-xs font-mono font-bold text-yellow-400 bg-gray-900 border border-yellow-500/30 px-4 py-1.5 rounded-xl inline-block mb-2">
              Session ID: {gameId}
            </span>
          </div>
        )}

        {/* ============================================================ */}
        {/* WAITING LOBBY SCREEN: Joined Players & Host Game Setup       */}
        {/* ============================================================ */}
        {gameStatus === 'waiting' && (
          <>
            <div className="text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Game Session ID
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-gray-900 border border-yellow-500/30 px-6 py-3 rounded-2xl shadow-xl">
                {gameId}
              </span>
            </div>

            {/* List of joined players */}
            <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Joined Players
                </span>
                <span className="text-xs font-mono font-bold text-yellow-400 bg-gray-950 px-2.5 py-0.5 rounded-md border border-yellow-500/30">
                  {playersList.length} / {maxPlayers}
                </span>
              </div>

              {playersList.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500">
                  Waiting for players to join...
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playersList.map((player, idx) => {
                    const isPlayerHost = game?.hostUsername === player.name;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800/90"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-gray-500">
                            {idx + 1}.
                          </span>
                          <span className="text-xs font-bold text-gray-200">
                            {player.name}
                          </span>
                        </div>

                        {isPlayerHost && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300 bg-yellow-950/60 border border-yellow-500/40 px-2 py-0.5 rounded">
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
                <div className="flex flex-col gap-3.5 border-t border-gray-800/80 pt-4 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                      Game Setup Options
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Host Configuration
                    </span>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {/* Gem Tokens per Color */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-300 font-medium">
                        Gem Tokens (max 8)
                      </label>
                      <select
                        value={gemTokens}
                        onChange={(e) => {
                          setGemTokens(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-gray-950 border border-gray-700 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
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
                      <label className="text-[11px] text-gray-300 font-medium">
                        Gold Tokens (max 5)
                      </label>
                      <select
                        value={goldTokens}
                        onChange={(e) => {
                          setGoldTokens(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-gray-950 border border-gray-700 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
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
                      <label className="text-[11px] text-gray-300 font-medium">
                        Face-Up Cards
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFaceUpCards(3);
                            setHasUserCustomized(true);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            faceUpCards === 3
                              ? 'bg-yellow-500 text-gray-950 border-yellow-400 shadow-sm'
                              : 'bg-gray-950 text-gray-400 border-gray-700 hover:border-gray-500'
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
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            faceUpCards === 4
                              ? 'bg-yellow-500 text-gray-950 border-yellow-400 shadow-sm'
                              : 'bg-gray-950 text-gray-400 border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          4 Cards
                        </button>
                      </div>
                    </div>

                    {/* Noble Tiles Count */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-300 font-medium">
                        Noble Tiles
                      </label>
                      <select
                        value={nobleCount}
                        onChange={(e) => {
                          setNobleCount(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-gray-950 border border-gray-700 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
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
                      className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                        !canStart || starting
                          ? 'bg-gray-950 border border-gray-800 text-gray-600 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-gray-950 shadow-yellow-500/20 active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      {starting ? 'Initializing Game Session...' : 'Start Game'}
                    </button>

                    {!canStart && (
                      <span className="text-[11px] text-gray-500">
                        Waiting for at least 2 players to start
                      </span>
                    )}

                    {startError && (
                      <span className="text-[11px] text-red-400 font-medium">
                        {startError}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 mt-1 border-t border-gray-800/80 pt-3">
                  <span className="text-[11px] text-gray-400">
                    Waiting for host <strong className="text-yellow-400 font-bold">{game?.hostUsername}</strong> to configure and start the game...
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Leave Game Button */}
        <button
          type="button"
          disabled={leaving}
          onClick={handleLeaveClick}
          className="px-5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 hover:text-red-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {leaving ? 'Leaving Game...' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
}
