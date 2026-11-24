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

const GEM_STYLES: Record<
  string,
  {
    main: string;
    highlight: string;
    shadow: string;
    text: string;
    label: string;
  }
> = {
  emerald: {
    main: '#2E9E5B',
    highlight: '#6FD79A',
    shadow: '#17613A',
    text: '#FFFFFF',
    label: 'Emerald',
  },
  sapphire: {
    main: '#2F6FD6',
    highlight: '#7FAAF0',
    shadow: '#1B4391',
    text: '#FFFFFF',
    label: 'Sapphire',
  },
  ruby: {
    main: '#C8283B',
    highlight: '#F0707F',
    shadow: '#7E1523',
    text: '#FFFFFF',
    label: 'Ruby',
  },
  onyx: {
    main: '#2B2B33',
    highlight: '#6B6B78',
    shadow: '#111116',
    text: '#FFFFFF',
    label: 'Onyx',
  },
  diamond: {
    main: '#F2EEE4',
    highlight: '#FFFFFF',
    shadow: '#B9B2A0',
    text: '#2A1F14',
    label: 'Diamond',
  },
  gold: {
    main: '#D4A83A',
    highlight: '#F3D679',
    shadow: '#8C6A17',
    text: '#2A1F14',
    label: 'Gold',
  },
};

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
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 font-['EB_Garamond',serif]">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        {/* ============================================================ */}
        {/* ACTIVE GAME SCREEN: Displays all initialized game information */}
        {/* ============================================================ */}
        {gameStatus === 'active' && (
          <div className="w-full flex flex-col items-center gap-5">
            {/* Header */}
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6FD79A] bg-[#0F2A22] border border-[#2E9E5B] px-3 py-1 rounded-full inline-block mb-1.5 font-['Cinzel']">
                Game is active
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F3E9D2] font-['Cinzel']">
                {game?.name || 'Splendor Session'}
              </h2>
              <span className="text-xs font-bold text-[#B8923A] bg-[#1B1712] border border-[#B8923A] px-3 py-1 rounded-lg inline-block mt-2 font-['Inter']">
                Session ID: {gameId}
              </span>
            </div>

            {/* Game Settings & Resources Overview */}
            <div className="w-full bg-[#1B1712] border border-[#B8923A] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#B8923A]/40 pb-3">
                <h3 className="text-lg font-semibold uppercase tracking-wider text-[#B8923A] font-['Cinzel']">
                  Initialized Game Settings
                </h3>
                <span className="text-sm text-[#B9AE96] font-['EB_Garamond'] italic">
                  Standard Splendor Rules
                </span>
              </div>

              {/* Settings Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#111116] border border-[#B8923A]/30 rounded-xl text-center">
                  <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-['EB_Garamond']">
                    Noble Tiles
                  </span>
                  <span className="text-xl font-bold text-[#F3E9D2] font-['Inter']">
                    {game?.settings?.nobleTilesCount ?? game?.nobleTiles?.length ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-[#111116] border border-[#B8923A]/30 rounded-xl text-center">
                  <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-['EB_Garamond']">
                    Face-Up Cards
                  </span>
                  <span className="text-xl font-bold text-[#F3E9D2] font-['Inter']">
                    {game?.settings?.faceUpCardsCount ?? 4}
                  </span>
                </div>

                <div className="p-3 bg-[#111116] border border-[#B8923A]/30 rounded-xl text-center">
                  <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-['EB_Garamond']">
                    Gem Tokens
                  </span>
                  <span className="text-xl font-bold text-[#F3E9D2] font-['Inter']">
                    {game?.settings?.gemTokenCount ?? 7} <span className="text-xs text-[#B9AE96] font-normal font-['EB_Garamond']">/color</span>
                  </span>
                </div>

                <div className="p-3 bg-[#111116] border border-[#B8923A]/30 rounded-xl text-center">
                  <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-['EB_Garamond']">
                    Gold Tokens
                  </span>
                  <span className="text-xl font-bold text-[#D4A83A] font-['Inter']">
                    {game?.settings?.goldTokenCount ?? 5} <span className="text-xs text-[#B9AE96] font-normal font-['EB_Garamond']">wild</span>
                  </span>
                </div>
              </div>

              {/* Tokens Bank */}
              <div className="mt-1 flex flex-col gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-[#B9AE96] font-['Cinzel']">
                  Available Token Bank
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#2E9E5B] border-2 border-[#17613A] shadow-md text-center text-white">
                    <span className="text-xs uppercase font-semibold block font-['Cinzel']">Emerald</span>
                    <span className="text-lg font-bold font-['Inter']">{game?.tokens?.emerald ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#2F6FD6] border-2 border-[#1B4391] shadow-md text-center text-white">
                    <span className="text-xs uppercase font-semibold block font-['Cinzel']">Sapphire</span>
                    <span className="text-lg font-bold font-['Inter']">{game?.tokens?.sapphire ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#C8283B] border-2 border-[#7E1523] shadow-md text-center text-white">
                    <span className="text-xs uppercase font-semibold block font-['Cinzel']">Ruby</span>
                    <span className="text-lg font-bold font-['Inter']">{game?.tokens?.ruby ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2EEE4] border-2 border-[#B9B2A0] shadow-md text-center text-[#2A1F14]">
                    <span className="text-xs uppercase font-semibold block font-['Cinzel']">Diamond</span>
                    <span className="text-lg font-bold font-['Inter']">{game?.tokens?.diamond ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#2B2B33] border-2 border-[#111116] shadow-md text-center text-white">
                    <span className="text-xs uppercase font-semibold block font-['Cinzel']">Onyx</span>
                    <span className="text-lg font-bold font-['Inter']">{game?.tokens?.onyx ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#D4A83A] border-2 border-[#8C6A17] shadow-md text-center text-[#2A1F14]">
                    <span className="text-xs uppercase font-semibold block font-['Cinzel']">Gold</span>
                    <span className="text-lg font-bold font-['Inter']">{game?.tokens?.gold ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Revealed Cards (Face-Up on Table) */}
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#B8923A]/40 pb-2">
                  <span className="text-base font-semibold uppercase tracking-wider text-[#B8923A] font-['Cinzel']">
                    Revealed Cards (Face-Up on Table)
                  </span>
                  <span className="text-xs text-[#B9AE96] font-['EB_Garamond'] italic">
                    Parchment cards with brass borders
                  </span>
                </div>

                {(['tier3', 'tier2', 'tier1'] as const).map((tierKey) => {
                  const tierNum = tierKey === 'tier3' ? 3 : tierKey === 'tier2' ? 2 : 1;
                  const tierLabel = `Tier ${tierNum}`;
                  const tierRevealed = game?.revealedCards?.[tierKey] || [];
                  const deckRemaining = game?.availableCards?.[tierKey]?.length ?? 0;
                  const topDeckId = game?.topDeckCards?.[tierKey];

                  const tierColorClass =
                    tierNum === 3 ? 'text-[#7FAAF0]' : tierNum === 2 ? 'text-[#F3D679]' : 'text-[#6FD79A]';

                  return (
                    <div key={tierKey} className="p-3.5 rounded-xl bg-[#111116] border border-[#B8923A]/40 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-sm font-semibold border-b border-[#1B1712] pb-1.5 font-['Cinzel']">
                        <span className={tierColorClass}>
                          {tierLabel} ({tierRevealed.length} Face-Up)
                        </span>
                        <span className="text-xs font-['EB_Garamond'] text-[#B9AE96]">
                          Unrevealed Deck: <strong className="text-[#F3E9D2] font-['Inter'] font-bold">{deckRemaining}</strong> cards | Top Card ID: <strong className="text-[#B8923A] font-['Inter'] font-bold">{topDeckId || 'Empty'}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {tierRevealed.map((cardId) => {
                          const details = getCardDetails(cardId);
                          const gemKey = details?.color || 'diamond';
                          const gemStyle = GEM_STYLES[gemKey] || GEM_STYLES.diamond;

                          const costItems = details?.cost
                            ? [
                                { key: 'emerald', label: 'E', count: details.cost.emerald, style: GEM_STYLES.emerald },
                                { key: 'sapphire', label: 'S', count: details.cost.sapphire, style: GEM_STYLES.sapphire },
                                { key: 'ruby', label: 'R', count: details.cost.ruby, style: GEM_STYLES.ruby },
                                { key: 'diamond', label: 'D', count: details.cost.diamond, style: GEM_STYLES.diamond },
                                { key: 'onyx', label: 'O', count: details.cost.onyx, style: GEM_STYLES.onyx },
                              ].filter((c) => c.count > 0)
                            : [];

                          return (
                            <div
                              key={cardId}
                              id={cardId}
                              data-card-id={cardId}
                              className="rounded-xl overflow-hidden bg-[#E8DCC0] border-2 border-[#B8923A] shadow-lg flex flex-col justify-between text-left transition-all hover:scale-[1.02] hover:border-[#D4A83A]"
                              style={{
                                backgroundImage: `url('/textures/parchment.jpg')`,
                                backgroundSize: 'cover',
                                backgroundBlendMode: 'multiply',
                              }}
                            >
                              {/* Top Card Color Band */}
                              <div
                                className="px-2 py-1 flex items-center justify-between border-b border-[#B8923A]/40"
                                style={{ backgroundColor: gemStyle.main, color: gemStyle.text }}
                              >
                                <span className="text-xs font-['Inter'] font-bold">
                                  {cardId}
                                </span>
                                <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded" style={{ backgroundColor: gemStyle.shadow }}>
                                  {gemStyle.label}
                                </span>
                              </div>

                              {/* Card Body: Points */}
                              <div className="p-2.5 flex items-baseline justify-between text-[#2A1F14]">
                                <div>
                                  {Boolean(details?.points && details.points > 0) && (
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-2xl font-black font-['Inter'] leading-none text-[#2A1F14]">
                                        {details?.points}
                                      </span>
                                      <span className="text-[10px] font-['Cinzel'] font-bold uppercase text-[#2A1F14]/70">
                                        Pts
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card Costs at Bottom Left */}
                              {costItems.length > 0 && (
                                <div className="p-2 pt-0 flex flex-wrap gap-1 items-center font-['Inter']">
                                  {costItems.map((c) => (
                                    <span
                                      key={c.key}
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs border border-black/20"
                                      style={{ backgroundColor: c.style.main, color: c.style.text }}
                                      title={`${c.count} ${c.style.label}`}
                                    >
                                      {c.count}
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
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#B9AE96] font-['Cinzel']">
                    Active Noble Tiles ({game.nobleTiles.length})
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {game.nobleTiles.map((nobleId) => {
                      const nobleInfo = getNobleDetails(nobleId);
                      return (
                        <div
                          key={nobleId}
                          className="px-3.5 py-2.5 rounded-xl bg-[#E8DCC0] border-2 border-[#B8923A] shadow-md flex items-center gap-3 text-[#2A1F14]"
                          style={{
                            backgroundImage: `url('/textures/parchment.jpg')`,
                            backgroundSize: 'cover',
                            backgroundBlendMode: 'multiply',
                          }}
                        >
                          <span className="w-6 h-6 rounded-full bg-[#B8923A] text-[#1B1712] font-['Inter'] font-bold text-xs flex items-center justify-center shadow-xs">
                            3
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-['Cinzel'] font-bold text-[#2A1F14]">
                              {nobleInfo?.name || 'Noble Patron'}
                            </span>
                            <span className="text-[10px] font-['Inter'] text-[#2A1F14]/70">
                              {nobleId}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Players in Game */}
              <div className="mt-2 flex flex-col gap-2 border-t border-[#B8923A]/40 pt-3">
                <span className="text-sm font-semibold uppercase tracking-wider text-[#B9AE96] font-['Cinzel']">
                  Players in Current Game ({playersList.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {playersList.map((player, idx) => (
                    <div
                      key={player.id}
                      className="px-3 py-1.5 rounded-xl bg-[#111116] border border-[#B8923A]/30 flex items-center gap-2"
                    >
                      <span className="text-xs text-[#B9AE96] font-['Inter'] font-bold">{idx + 1}.</span>
                      <span className="text-base font-medium text-[#F3E9D2] font-['EB_Garamond']">{player.name}</span>
                      {game?.hostUsername === player.name && (
                        <span className="text-[10px] font-bold uppercase text-[#1B1712] bg-[#B8923A] px-1.5 py-0.5 rounded font-['Cinzel']">
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
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F3E9D2] font-['Cinzel'] mb-2">
              Game is completed
            </h2>
            <span className="text-sm font-bold text-[#B8923A] bg-[#1B1712] border border-[#B8923A] px-4 py-1.5 rounded-xl inline-block mb-2 font-['Inter']">
              Session ID: {gameId}
            </span>
          </div>
        )}

        {/* ============================================================ */}
        {/* WAITING LOBBY SCREEN: Joined Players & Host Game Setup       */}
        {/* ============================================================ */}
        {gameStatus === 'waiting' && (
          <>
            <div className="w-full flex flex-col items-center gap-3">
              {/* Game Session ID with Copy Button */}
              <div className="text-center flex flex-col items-center">
                <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-[0.08em] block mb-2 font-['Cinzel']">
                  Game Session ID
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl sm:text-4xl font-bold font-['Inter'] tracking-wider text-[#B8923A] bg-[#1B1712] border border-[#B8923A] px-6 py-2.5 rounded-2xl shadow-xl inline-block">
                    {gameId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(gameId, 'id')}
                    title={copiedGameId ? 'Copied ID' : 'Copy Game ID'}
                    aria-label="Copy Game ID"
                    className={`p-2.5 rounded-xl bg-[#1B1712] border transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 ${
                      copiedGameId
                        ? 'border-[#6FD79A] text-[#6FD79A]'
                        : 'border-[#B8923A]/40 hover:border-[#B8923A] text-[#B9AE96] hover:text-[#B8923A]'
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
              <div className="w-full bg-[#1B1712] border border-[#B8923A] rounded-2xl px-4 py-3 shadow-xl flex items-center justify-between gap-3 text-left">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider font-['Cinzel']">
                    Join Link
                  </span>
                  <span className="text-sm text-[#F3E9D2] font-['Inter'] truncate select-all mt-0.5">
                    {joinUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(joinUrl, 'link')}
                  title={copiedJoinLink ? 'Copied Link' : 'Copy Join Link'}
                  aria-label="Copy Join Link"
                  className={`p-2.5 rounded-xl bg-[#1B1712] border transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 ${
                    copiedJoinLink
                      ? 'border-[#6FD79A] text-[#6FD79A]'
                      : 'border-[#B8923A]/40 hover:border-[#B8923A] text-[#B9AE96] hover:text-[#B8923A]'
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
            <div className="w-full bg-[#1B1712] border border-[#B8923A] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#B8923A]/40 pb-3">
                <span className="text-base font-semibold uppercase tracking-wider text-[#F3E9D2] font-['Cinzel']">
                  Joined Players
                </span>
                <span className="text-xs font-['Inter'] font-bold text-[#B8923A] bg-[#111116] px-2.5 py-0.5 rounded-md border border-[#B8923A]/50">
                  {playersList.length} / {maxPlayers}
                </span>
              </div>

              {playersList.length === 0 ? (
                <div className="py-4 text-center text-base text-[#B9AE96] font-['EB_Garamond'] italic">
                  Waiting for players to join...
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playersList.map((player, idx) => {
                    const isPlayerHost = game?.hostUsername === player.name;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#111116] border border-[#B8923A]/30"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-['Inter'] text-[#B9AE96] font-bold">
                            {idx + 1}.
                          </span>
                          <span className="text-base font-medium text-[#F3E9D2] font-['EB_Garamond']">
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
                <div className="flex flex-col gap-3.5 border-t border-[#B8923A]/40 pt-4 mt-1">
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
                        className="px-3 py-2 rounded-xl bg-[#111116] border border-[#B8923A]/50 text-xs font-bold text-[#F3E9D2] font-['Inter'] focus:outline-none focus:border-[#B8923A]"
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
                        className="px-3 py-2 rounded-xl bg-[#111116] border border-[#B8923A]/50 text-xs font-bold text-[#D4A83A] font-['Inter'] focus:outline-none focus:border-[#B8923A]"
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
                              : 'bg-[#111116] text-[#B9AE96] border-[#B8923A]/30 hover:border-[#B8923A]'
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
                              : 'bg-[#111116] text-[#B9AE96] border-[#B8923A]/30 hover:border-[#B8923A]'
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
                        className="px-3 py-2 rounded-xl bg-[#111116] border border-[#B8923A]/50 text-xs font-bold text-[#F3E9D2] font-['Inter'] focus:outline-none focus:border-[#B8923A]"
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
                <div className="text-center py-2 mt-1 border-t border-[#B8923A]/40 pt-3">
                  <span className="text-sm text-[#B9AE96] font-['EB_Garamond']">
                    Waiting for host <strong className="text-[#B8923A] font-semibold">{game?.hostUsername}</strong> to configure and start the game...
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
          className="px-5 py-2.5 rounded-xl bg-[#C8283B]/20 hover:bg-[#C8283B]/35 border border-[#C8283B]/60 text-[#F0707F] text-xs font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer active:scale-95 disabled:opacity-50 font-['Cinzel']"
        >
          {leaving ? 'Leaving Game...' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
}
