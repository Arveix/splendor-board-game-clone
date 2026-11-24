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
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        {/* ============================================================ */}
        {/* ACTIVE GAME SCREEN: Displays all initialized game information */}
        {/* ============================================================ */}
        {gameStatus === 'active' && (
          <div className="w-full flex flex-col items-center gap-5">
            {/* Header */}
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#278451] bg-[#278451]/15 border border-[#278451]/40 px-3 py-1 rounded-full inline-block mb-1.5 font-['Cinzel']">
                Game is active
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#D8C8A5] font-['Cinzel']">
                {game?.name || 'Splendor Session'}
              </h2>
              <span className="text-xs font-bold text-[#B69A65] bg-[#25211D] border border-[#B69A65]/40 px-3 py-1 rounded-lg inline-block mt-2 font-['IBM_Plex_Sans']">
                Session ID: {gameId}
              </span>
            </div>

            {/* Game Settings & Resources Overview */}
            <div className="w-full bg-[#25211D] border border-[#80643D]/40 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#302A22] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#B69A65] font-['Cinzel']">
                  Initialized Game Settings
                </h3>
                <span className="text-[11px] text-[#80643D] font-['Inter']">
                  Standard Splendor Rules
                </span>
              </div>

              {/* Settings Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#302A22] border border-[#80643D]/30 rounded-xl text-center">
                  <span className="text-[10px] text-[#80643D] uppercase tracking-wider block font-['Inter']">
                    Noble Tiles
                  </span>
                  <span className="text-lg font-bold text-[#D8C8A5] font-['IBM_Plex_Sans']">
                    {game?.settings?.nobleTilesCount ?? game?.nobleTiles?.length ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-[#302A22] border border-[#80643D]/30 rounded-xl text-center">
                  <span className="text-[10px] text-[#80643D] uppercase tracking-wider block font-['Inter']">
                    Face-Up Cards
                  </span>
                  <span className="text-lg font-bold text-[#D8C8A5] font-['IBM_Plex_Sans']">
                    {game?.settings?.faceUpCardsCount ?? 4}
                  </span>
                </div>

                <div className="p-3 bg-[#302A22] border border-[#80643D]/30 rounded-xl text-center">
                  <span className="text-[10px] text-[#80643D] uppercase tracking-wider block font-['Inter']">
                    Gem Tokens
                  </span>
                  <span className="text-lg font-bold text-[#D8C8A5] font-['IBM_Plex_Sans']">
                    {game?.settings?.gemTokenCount ?? 7} <span className="text-xs text-[#80643D] font-normal font-['Inter']">/color</span>
                  </span>
                </div>

                <div className="p-3 bg-[#302A22] border border-[#80643D]/30 rounded-xl text-center">
                  <span className="text-[10px] text-[#80643D] uppercase tracking-wider block font-['Inter']">
                    Gold Tokens
                  </span>
                  <span className="text-lg font-bold text-[#D5A936] font-['IBM_Plex_Sans']">
                    {game?.settings?.goldTokenCount ?? 5} <span className="text-xs text-[#80643D] font-normal font-['Inter']">wild</span>
                  </span>
                </div>
              </div>

              {/* Tokens Bank */}
              <div className="mt-1 flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#80643D] font-['Cinzel']">
                  Available Token Bank
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#278451]/15 border border-[#278451]/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#278451] block font-['Cinzel']">Emerald</span>
                    <span className="text-base font-bold text-[#278451] font-['IBM_Plex_Sans']">{game?.tokens?.emerald ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#2766B5]/15 border border-[#2766B5]/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#2766B5] block font-['Cinzel']">Sapphire</span>
                    <span className="text-base font-bold text-[#2766B5] font-['IBM_Plex_Sans']">{game?.tokens?.sapphire ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#C33C42]/15 border border-[#C33C42]/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#C33C42] block font-['Cinzel']">Ruby</span>
                    <span className="text-base font-bold text-[#C33C42] font-['IBM_Plex_Sans']">{game?.tokens?.ruby ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#E6E3D9]/15 border border-[#E6E3D9]/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#E6E3D9] block font-['Cinzel']">Diamond</span>
                    <span className="text-base font-bold text-[#E6E3D9] font-['IBM_Plex_Sans']">{game?.tokens?.diamond ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#343638]/40 border border-[#80643D]/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#D8C8A5] block font-['Cinzel']">Onyx</span>
                    <span className="text-base font-bold text-[#D8C8A5] font-['IBM_Plex_Sans']">{game?.tokens?.onyx ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#D5A936]/15 border border-[#D5A936]/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#D5A936] block font-['Cinzel']">Gold</span>
                    <span className="text-base font-bold text-[#D5A936] font-['IBM_Plex_Sans']">{game?.tokens?.gold ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Revealed Cards (Face-Up on Table) */}
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#302A22] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B69A65] font-['Cinzel']">
                    Revealed Cards (Face-Up on Table)
                  </span>
                  <span className="text-[10px] text-[#80643D] font-['Inter']">
                    Derived from unique card IDs
                  </span>
                </div>

                {(['tier3', 'tier2', 'tier1'] as const).map((tierKey) => {
                  const tierNum = tierKey === 'tier3' ? 3 : tierKey === 'tier2' ? 2 : 1;
                  const tierLabel = `Tier ${tierNum}`;
                  const tierRevealed = game?.revealedCards?.[tierKey] || [];
                  const deckRemaining = game?.availableCards?.[tierKey]?.length ?? 0;
                  const topDeckId = game?.topDeckCards?.[tierKey];

                  const tierColorClass =
                    tierNum === 3 ? 'text-[#2766B5]' : tierNum === 2 ? 'text-[#D5A936]' : 'text-[#278451]';

                  return (
                    <div key={tierKey} className="p-3.5 rounded-xl bg-[#302A22] border border-[#80643D]/30 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-bold border-b border-[#25211D] pb-1.5 font-['Cinzel']">
                        <span className={tierColorClass}>
                          {tierLabel} ({tierRevealed.length} Face-Up)
                        </span>
                        <span className="text-[11px] font-['IBM_Plex_Sans'] text-[#80643D]">
                          Unrevealed Deck: <strong className="text-[#D8C8A5]">{deckRemaining}</strong> cards | Top Card ID: <strong className="text-[#B69A65]">{topDeckId || 'Empty'}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {tierRevealed.map((cardId) => {
                          const details = getCardDetails(cardId);
                          const color = details?.color;
                          const gemBadgeClass =
                            color === 'emerald'
                              ? 'bg-[#278451] text-white'
                              : color === 'sapphire'
                              ? 'bg-[#2766B5] text-white'
                              : color === 'ruby'
                              ? 'bg-[#C33C42] text-white'
                              : color === 'diamond'
                              ? 'bg-[#E6E3D9] text-[#171615] border border-[#80643D]/40'
                              : 'bg-[#343638] text-white';

                          const costItems = details?.cost
                            ? [
                                { key: 'emerald', label: 'E', count: details.cost.emerald, color: 'text-[#278451] bg-[#278451]/10' },
                                { key: 'sapphire', label: 'S', count: details.cost.sapphire, color: 'text-[#2766B5] bg-[#2766B5]/10' },
                                { key: 'ruby', label: 'R', count: details.cost.ruby, color: 'text-[#C33C42] bg-[#C33C42]/10' },
                                { key: 'diamond', label: 'D', count: details.cost.diamond, color: 'text-[#171615] bg-[#171615]/10' },
                                { key: 'onyx', label: 'O', count: details.cost.onyx, color: 'text-[#343638] bg-[#343638]/10' },
                              ].filter((c) => c.count > 0)
                            : [];

                          return (
                            <div
                              key={cardId}
                              id={cardId}
                              data-card-id={cardId}
                              className="p-2.5 rounded-xl bg-[#D8C8A5] text-[#171615] border border-[#80643D]/50 hover:border-[#B69A65] shadow-md transition-all flex flex-col justify-between gap-1.5 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-['IBM_Plex_Sans'] font-bold text-[#80643D]">{cardId}</span>
                                {details && (
                                  <span className={`text-[9px] font-['Cinzel'] font-bold uppercase px-1.5 py-0.5 rounded shadow-xs ${gemBadgeClass}`}>
                                    {details.color}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between mt-0.5">
                                <span className="text-[10px] text-[#80643D] font-['Inter']">Prestige</span>
                                <span className="text-base font-bold text-[#171615] font-['Cinzel']">{details?.points ?? 0}</span>
                              </div>
                              {costItems.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5 font-['IBM_Plex_Sans'] text-[9px] font-bold">
                                  {costItems.map((c) => (
                                    <span key={c.key} className={`px-1 py-0.5 rounded border border-[#80643D]/30 ${c.color}`}>
                                      {c.label}:{c.count}
                                    </span>
                                  ))}
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#80643D] font-['Cinzel']">
                    Active Noble Tiles ({game.nobleTiles.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {game.nobleTiles.map((nobleId) => {
                      const nobleInfo = getNobleDetails(nobleId);
                      return (
                        <div
                          key={nobleId}
                          className="px-3 py-2 rounded-xl bg-[#302A22] border border-[#80643D]/30 flex items-center gap-2.5 shadow-sm"
                        >
                          <span className="text-[10px] font-['IBM_Plex_Sans'] font-bold text-[#B69A65]">{nobleId}</span>
                          <span className="text-xs text-[#D8C8A5] font-['Cormorant_Garamond'] italic font-medium">
                            {nobleInfo?.name || 'Noble Patron'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Players in Game */}
              <div className="mt-2 flex flex-col gap-2 border-t border-[#302A22] pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#80643D] font-['Cinzel']">
                  Players in Current Game ({playersList.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {playersList.map((player, idx) => (
                    <div
                      key={player.id}
                      className="px-3 py-1.5 rounded-xl bg-[#302A22] border border-[#80643D]/30 flex items-center gap-2"
                    >
                      <span className="text-xs text-[#80643D] font-['IBM_Plex_Sans']">{idx + 1}.</span>
                      <span className="text-xs font-bold text-[#D8C8A5] font-['Inter']">{player.name}</span>
                      {game?.hostUsername === player.name && (
                        <span className="text-[9px] font-bold uppercase text-[#171615] bg-[#B69A65] px-1.5 py-0.5 rounded font-['Cinzel']">
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
            <h2 className="text-2xl sm:text-3xl font-black text-[#D8C8A5] font-['Cinzel'] mb-2">
              Game is completed
            </h2>
            <span className="text-xs font-bold text-[#B69A65] bg-[#25211D] border border-[#B69A65]/40 px-4 py-1.5 rounded-xl inline-block mb-2 font-['IBM_Plex_Sans']">
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
              <span className="text-[11px] font-bold text-[#80643D] uppercase tracking-widest block mb-2 font-['Cinzel']">
                Game Session ID
              </span>
              <span className="text-3xl sm:text-4xl font-black font-['IBM_Plex_Sans'] tracking-widest text-[#B69A65] bg-[#25211D] border border-[#B69A65]/40 px-6 py-3 rounded-2xl shadow-xl inline-block">
                {gameId}
              </span>
            </div>

            {/* List of joined players */}
            <div className="w-full bg-[#25211D] border border-[#80643D]/40 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#302A22] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D8C8A5] font-['Cinzel']">
                  Joined Players
                </span>
                <span className="text-xs font-['IBM_Plex_Sans'] font-bold text-[#B69A65] bg-[#171615] px-2.5 py-0.5 rounded-md border border-[#80643D]/50">
                  {playersList.length} / {maxPlayers}
                </span>
              </div>

              {playersList.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#80643D] font-['Cormorant_Garamond'] italic text-sm">
                  Waiting for players to join...
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playersList.map((player, idx) => {
                    const isPlayerHost = game?.hostUsername === player.name;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#302A22] border border-[#80643D]/30"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-['IBM_Plex_Sans'] text-[#80643D]">
                            {idx + 1}.
                          </span>
                          <span className="text-xs font-bold text-[#D8C8A5] font-['Inter']">
                            {player.name}
                          </span>
                        </div>

                        {isPlayerHost && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#171615] bg-[#B69A65] px-2 py-0.5 rounded font-['Cinzel']">
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
                <div className="flex flex-col gap-3.5 border-t border-[#302A22] pt-4 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#B69A65] font-['Cinzel']">
                      Game Setup Options
                    </span>
                    <span className="text-[10px] text-[#80643D] font-['Inter']">
                      Host Configuration
                    </span>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {/* Gem Tokens per Color */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[#D8C8A5]/80 font-medium font-['Inter']">
                        Gem Tokens (max 8)
                      </label>
                      <select
                        value={gemTokens}
                        onChange={(e) => {
                          setGemTokens(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#171615] border border-[#80643D]/50 text-xs font-bold text-[#D8C8A5] font-['IBM_Plex_Sans'] focus:outline-none focus:border-[#B69A65]"
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
                      <label className="text-[11px] text-[#D8C8A5]/80 font-medium font-['Inter']">
                        Gold Tokens (max 5)
                      </label>
                      <select
                        value={goldTokens}
                        onChange={(e) => {
                          setGoldTokens(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#171615] border border-[#80643D]/50 text-xs font-bold text-[#D5A936] font-['IBM_Plex_Sans'] focus:outline-none focus:border-[#B69A65]"
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
                      <label className="text-[11px] text-[#D8C8A5]/80 font-medium font-['Inter']">
                        Face-Up Cards
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFaceUpCards(3);
                            setHasUserCustomized(true);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer font-['Inter'] ${
                            faceUpCards === 3
                              ? 'bg-[#B69A65] text-[#171615] border-[#B69A65] shadow-xs'
                              : 'bg-[#171615] text-[#80643D] border-[#80643D]/40 hover:border-[#80643D]'
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
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer font-['Inter'] ${
                            faceUpCards === 4
                              ? 'bg-[#B69A65] text-[#171615] border-[#B69A65] shadow-xs'
                              : 'bg-[#171615] text-[#80643D] border-[#80643D]/40 hover:border-[#80643D]'
                          }`}
                        >
                          4 Cards
                        </button>
                      </div>
                    </div>

                    {/* Noble Tiles Count */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[#D8C8A5]/80 font-medium font-['Inter']">
                        Noble Tiles
                      </label>
                      <select
                        value={nobleCount}
                        onChange={(e) => {
                          setNobleCount(Number(e.target.value));
                          setHasUserCustomized(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#171615] border border-[#80643D]/50 text-xs font-bold text-[#D8C8A5] font-['IBM_Plex_Sans'] focus:outline-none focus:border-[#B69A65]"
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
                      className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md font-['Cinzel'] ${
                        !canStart || starting
                          ? 'bg-[#302A22] border border-[#80643D]/40 text-[#80643D] cursor-not-allowed opacity-60'
                          : 'bg-[#B69A65] hover:bg-[#c4a974] text-[#171615] shadow-[#B69A65]/20 active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      {starting ? 'Initializing Game Session...' : 'Start Game'}
                    </button>

                    {!canStart && (
                      <span className="text-[11px] text-[#80643D] font-['Inter']">
                        Waiting for at least 2 players to start
                      </span>
                    )}

                    {startError && (
                      <span className="text-[11px] text-[#C33C42] font-medium font-['Inter']">
                        {startError}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 mt-1 border-t border-[#302A22] pt-3">
                  <span className="text-[11px] text-[#80643D] font-['Inter']">
                    Waiting for host <strong className="text-[#B69A65] font-bold">{game?.hostUsername}</strong> to configure and start the game...
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
          className="px-5 py-2.5 rounded-xl bg-[#C33C42]/20 hover:bg-[#C33C42]/30 border border-[#C33C42]/40 text-[#C33C42] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-50 font-['Inter']"
        >
          {leaving ? 'Leaving Game...' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
}
