import { useEffect, useRef, useState } from 'react';
import {
  buyCardApi,
  endTurnApi,
  getGameApi,
  inviteNobleApi,
  rematchGameApi,
  reserveCardApi,
  updateTokensApi,
} from '../../api';
import { useFullscreen, useGameWebSocket, usePlayerTurnSelection } from '../../hooks';
import type { GameSession, GameStatus } from '../../types';
import { GameBoard } from './GameBoard';
import { PlayerPanel } from './PlayerPanel';
import { AnimationOverlay, type AnimationPayload, type AnimationPayloadInput } from './Animations';
import { isSoundMuted, setSoundMuted, playSound } from '../../utils/audio';
import { getCardDetails } from '../../utils/cardUtils';
import { ALL_GEMS } from '../../constants/gems';

interface GamePageProps {
  gameId: string;
  sessionId: string;
  currentUsername: string;
  onLeaveGame?: () => Promise<void> | void;
  onGameNotFound: () => void;
  onStatusChange?: (status: GameStatus) => void;
}

export const GamePage = ({
  gameId,
  sessionId,
  currentUsername,
  onLeaveGame,
  onGameNotFound,
  onStatusChange,
}: GamePageProps) => {
  const [game, setGame] = useState<GameSession | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => isSoundMuted());
  const [animations, setAnimations] = useState<AnimationPayload[]>([]);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [isEndingTurn, setIsEndingTurn] = useState<boolean>(false);
  const [isRematching, setIsRematching] = useState<boolean>(false);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
    if (!next) {
      playSound('gemCollect');
    }
  };

  const addAnimation = (anim: AnimationPayloadInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setAnimations((prev) => [...prev, { ...anim, id } as AnimationPayload]);
  };

  const removeAnimation = (id: string) => {
    setAnimations((prev) => prev.filter((a) => a.id !== id));
  };

  // Fullscreen and orientation state via custom hook
  const {
    isFullscreen,
    showFullscreenPrompt,
    setShowFullscreenPrompt,
    enterFullscreen,
    exitFullscreen,
  } = useFullscreen();

  // Players info
  const playersList = game?.players || [];
  const currentUserPlayer =
    playersList.find((p) => p.name === currentUsername) ||
    playersList.find((p) => p.id === sessionId);

  const isCurrentUserActive = Boolean(
    game?.status === 'active' &&
      currentUserPlayer &&
      game?.activePlayer &&
      (game.activePlayer.id === currentUserPlayer.id ||
        game.activePlayer.name === currentUserPlayer.name)
  );

  // Turn selection and token manipulation via custom hook
  const {
    selectedCard,
    selectedNoble,
    selectedBankTokens,
    selectedUserTokens,
    totalBankSelected,
    totalUserSelected,
    hasTokensSelected,
    hasCardSelected,
    hasNobleSelected,
    validationContext,
    clearSelection,
    handleCardClick,
    handleNobleClick,
    handleBankTokenClick,
    handleBankTokenDecrement,
    handleUserTokenClick,
    handleUserTokenDecrement,
  } = usePlayerTurnSelection({
    isCurrentUserActive,
    currentUserTokens: currentUserPlayer?.tokens,
    bankTokens: game?.tokens,
    currentUserBonuses: currentUserPlayer?.bonuses,
  });

  // Centralized action execution helper that synchronizes game state on response
  const executeGameAction = async (actionFn: () => Promise<Response>) => {
    try {
      const res = await actionFn();
      if (res.ok) {
        const data = await res.json();
        if (data.game) {
          setGame(data.game);
        }
      }
    } catch {
      // Handled via WebSocket or retry
    }
  };

  const triggerTokenPulse = (selector: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.classList.remove('token-pulse-anim');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('token-pulse-anim');
      setTimeout(() => {
        el.classList.remove('token-pulse-anim');
      }, 350);
    }
  };

  const animateCardFlight = (
    cardId: string,
    tier: 1 | 2 | 3,
    fromEl: Element,
    toEl: Element,
    isFaceDown = false
  ) => {
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // Canonical card ratio: 180 / 250
    const CARD_ASPECT = 180 / 250;
    let targetWidth = toRect.width;
    let targetHeight = toRect.height;

    // If target element is wider than standard card proportions (e.g. multi-column tray),
    // clamp width so the flying card maintains correct single-card dimensions
    if (targetHeight > 0 && (targetWidth > targetHeight || targetWidth / targetHeight > 0.85)) {
      targetWidth = targetHeight * CARD_ASPECT;
    } else if (targetWidth > 0 && targetHeight === 0) {
      targetHeight = targetWidth / CARD_ASPECT;
    }

    addAnimation({
      type: 'card',
      cardId,
      tier,
      isFaceDown,
      from: {
        x: fromRect.left,
        y: fromRect.top,
        width: fromRect.width || 120,
        height: fromRect.height || 166,
      },
      to: {
        x: toRect.left,
        y: toRect.top,
        width: targetWidth || fromRect.width || 120,
        height: targetHeight || fromRect.height || 166,
      },
    });
  };

  const animateNobleFlight = (nobleId: string, fromEl: Element, toEl: Element) => {
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // Canonical noble ratio: 140 / 164
    const NOBLE_ASPECT = 140 / 164;
    let targetWidth = toRect.width;
    let targetHeight = toRect.height;

    if (targetHeight > 0 && (targetWidth > targetHeight || targetWidth / targetHeight > 0.95)) {
      targetWidth = targetHeight * NOBLE_ASPECT;
    } else if (targetWidth > 0 && targetHeight === 0) {
      targetHeight = targetWidth / NOBLE_ASPECT;
    }

    addAnimation({
      type: 'noble',
      nobleId,
      from: {
        x: fromRect.left,
        y: fromRect.top,
        width: fromRect.width || 100,
        height: fromRect.height || 117,
      },
      to: {
        x: toRect.left,
        y: toRect.top,
        width: targetWidth || fromRect.width || 100,
        height: targetHeight || fromRect.height || 117,
      },
    });
  };

  const handleBuyCard = async (cardId: string) => {
    if (!isCurrentUserActive || !cardId) return;
    const details = getCardDetails(cardId);

    if (details && currentUserPlayer) {
      let playedReturnSound = false;
      ALL_GEMS.forEach((gem) => {
        const bonus = currentUserPlayer.bonuses?.[gem] ?? 0;
        const required = Math.max(0, details.cost[gem] - bonus);
        const playerTokens = currentUserPlayer.tokens?.[gem] ?? 0;
        const regularPaid = Math.min(required, playerTokens);
        const goldPaid = Math.max(0, required - regularPaid);

        if (regularPaid > 0) {
          triggerTokenPulse(`[data-user-token="${gem}"]`);
          triggerTokenPulse(`[data-bank-token="${gem}"]`);
          playedReturnSound = true;
        }

        if (goldPaid > 0) {
          triggerTokenPulse(`[data-user-token="gold"]`);
          triggerTokenPulse(`[data-bank-token="gold"]`);
          playedReturnSound = true;
        }
      });
      if (playedReturnSound) {
        playSound('gemReturn');
      }

      const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
      const targetStackEl = document.querySelector(`[data-bonus-stack="${details.bonus}"]`);
      if (cardEl && targetStackEl) {
        animateCardFlight(cardId, details.tier, cardEl, targetStackEl);
        playSound('cardBuy');
      }
    }

    clearSelection();
    await executeGameAction(() => buyCardApi(sessionId, gameId, cardId));
  };

  const handleReserveCard = async (cardId: string) => {
    if (!isCurrentUserActive || !cardId) return;

    const details = getCardDetails(cardId);
    let cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
    let isFaceDown = false;
    let tierNum: 1 | 2 | 3 = details?.tier ?? 1;

    if (!cardEl) {
      ([1, 2, 3] as const).forEach((t) => {
        const deckEl = document.querySelector(`[data-tier="${t}"]`);
        if (
          deckEl &&
          (game?.topDeckCards?.[`tier${t}`] === cardId ||
            game?.availableCards?.[`tier${t}`]?.[0] === cardId)
        ) {
          cardEl = deckEl;
          isFaceDown = true;
          tierNum = t;
        }
      });
    }

    const nextSlotIdx = currentUserPlayer?.reservedCards?.length ?? 0;
    const targetSlot =
      document.querySelector(`[data-reserved-slot="${nextSlotIdx}"]`) ||
      document.querySelector(`[data-reserved-slot="0"]`) ||
      document.querySelector(`[data-reserved-tray]`);
    if (cardEl && targetSlot) {
      animateCardFlight(cardId, tierNum, cardEl, targetSlot, isFaceDown);
      playSound('cardReserve');
    }

    const goldCount = game?.tokens?.gold ?? 0;
    if (goldCount > 0) {
      triggerTokenPulse(`[data-bank-token="gold"]`);
      triggerTokenPulse(`[data-user-token="gold"]`);
      playSound('gemCollect', { isGold: true });
    }

    clearSelection();
    await executeGameAction(() => reserveCardApi(sessionId, gameId, cardId));
  };

  const handleInviteNoble = async (nobleId: string) => {
    if (!isCurrentUserActive || !nobleId) return;

    const nobleEl = document.querySelector(`[data-noble-id="${nobleId}"]`);
    const nextNobleIdx = currentUserPlayer?.nobles?.length ?? 0;
    const targetSlot =
      document.querySelector(`[data-noble-slot="${nextNobleIdx}"]`) ||
      document.querySelector(`[data-noble-slot="0"]`) ||
      document.querySelector(`[data-nobles-tray]`);
    if (nobleEl && targetSlot) {
      animateNobleFlight(nobleId, nobleEl, targetSlot);
      playSound('nobleVisit');
    }

    clearSelection();
    await executeGameAction(() => inviteNobleApi(sessionId, gameId, nobleId));
  };

  const handleTakeTokens = async () => {
    if (!isCurrentUserActive) return;
    if (totalBankSelected === 0 && totalUserSelected === 0) return;

    const tokensToTake = { ...selectedBankTokens };
    const tokensToReturn = { ...selectedUserTokens };

    let playedCollect = false;
    let hasGold = false;
    Object.entries(tokensToTake).forEach(([gem, count]) => {
      if (count <= 0) return;
      triggerTokenPulse(`[data-bank-token="${gem}"]`);
      triggerTokenPulse(`[data-user-token="${gem}"]`);
      playedCollect = true;
      if (gem === 'gold') hasGold = true;
    });
    if (playedCollect) {
      playSound('gemCollect', { isGold: hasGold });
    }

    let playedReturn = false;
    Object.entries(tokensToReturn).forEach(([gem, count]) => {
      if (count <= 0) return;
      triggerTokenPulse(`[data-user-token="${gem}"]`);
      triggerTokenPulse(`[data-bank-token="${gem}"]`);
      playedReturn = true;
    });
    if (playedReturn) {
      playSound('gemReturn');
    }

    clearSelection();
    await executeGameAction(() => updateTokensApi(sessionId, gameId, tokensToTake, tokensToReturn));
  };

  const handleEndTurn = async () => {
    if (!isCurrentUserActive || isEndingTurn) return;
    setIsEndingTurn(true);
    clearSelection();
    try {
      await executeGameAction(() => endTurnApi(sessionId, gameId));
    } finally {
      setIsEndingTurn(false);
    }
  };

  // Turn timer countdown state
  const turnDuration = game?.currentTurnDuration ?? game?.settings?.turnDurationSeconds ?? 90;
  const [now, setNow] = useState<number>(() => Date.now());
  const hasAutoEndedRef = useRef<boolean>(false);

  useEffect(() => {
    if (game?.status !== 'active') return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [game?.status]);

  // Reset auto-ended guard when turn start time, duration, or active player changes
  useEffect(() => {
    hasAutoEndedRef.current = false;
  }, [game?.turnStartTime, game?.currentTurnDuration, game?.activePlayer?.id]);

  const turnExpiresAt =
    game?.turnExpiresAt ||
    (game?.turnStartTime ? game.turnStartTime + turnDuration * 1000 : null);

  const timeLeft = turnExpiresAt
    ? Math.max(0, Math.ceil((turnExpiresAt - now) / 1000))
    : turnDuration;

  // Auto-end active player's turn when turn timer expires
  useEffect(() => {
    if (
      game?.status === 'active' &&
      isCurrentUserActive &&
      !isEndingTurn &&
      timeLeft <= 0 &&
      !hasAutoEndedRef.current
    ) {
      hasAutoEndedRef.current = true;
      handleEndTurn();
    }
  }, [timeLeft, isCurrentUserActive, isEndingTurn, game?.status]);

  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const formattedTurnTime = `${timerMinutes}:${timerSeconds < 10 ? '0' : ''}${timerSeconds}`;
  const isUrgentTimer = timeLeft <= 15;

  const handleRematch = async () => {
    if (isRematching) return;
    setIsRematching(true);
    try {
      const res = await rematchGameApi(sessionId, gameId);
      if (res.ok) {
        const data = await res.json();
        if (data.game) {
          setGame(data.game);
          onStatusChange?.(data.game.status);
        }
      }
    } catch {
      // Retried via WebSocket
    } finally {
      setIsRematching(false);
    }
  };

  // Initial fetch of game session
  useEffect(() => {
    let isCancelled = false;

    getGameApi(sessionId, gameId)
      .then((res) => {
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
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [gameId, sessionId, onGameNotFound, onStatusChange]);

  // Real-time WebSocket sync via custom hook
  useGameWebSocket({
    gameId,
    sessionId,
    onGameUpdate: (updatedGame) => {
      setGame(updatedGame);
      onStatusChange?.(updatedGame.status);
    },
    onGameNotFound,
  });

  // Track game state changes for automatic card replenishment, other players' actions, and win fanfare
  const prevGameRef = useRef<GameSession | null>(null);

  useEffect(() => {
    if (!game) return;
    const prev = prevGameRef.current;
    prevGameRef.current = game;

    if (!prev) return;

    // 1. Victory Fanfare
    if (prev.status === 'active' && game.status === 'completed') {
      playSound('gameWin');
    }

    // 2. Auto Card Replenishment: slide new card from deck into newly opened board slot
    ([1, 2, 3] as const).forEach((tier) => {
      const tierKey = `tier${tier}` as const;
      const prevRevealed = prev.revealedCards?.[tierKey] || [];
      const newRevealed = game.revealedCards?.[tierKey] || [];

      newRevealed.forEach((newCardId, idx) => {
        const oldCardId = prevRevealed[idx];
        if (newCardId && newCardId !== oldCardId) {
          const deckEl = document.querySelector(`[data-tier="${tier}"]`);
          const cardEl = document.querySelector(`[data-card-id="${newCardId}"]`);
          if (deckEl && cardEl) {
            animateCardFlight(newCardId, tier, deckEl, cardEl);
            playSound('cardReserve');
          }
        }
      });
    });

    // 3. Other players' moves (multiplayer animation)
    if (prev.activePlayer && prev.activePlayer.id !== currentUserPlayer?.id) {
      const otherId = prev.activePlayer.id;
      const prevPlayer = prev.players?.find((p) => p.id === otherId);
      const currPlayer = game.players?.find((p) => p.id === otherId);
      if (prevPlayer && currPlayer) {
        if ((currPlayer.cards?.length || 0) > (prevPlayer.cards?.length || 0)) {
          playSound('cardBuy');
        } else if ((currPlayer.reservedCards?.length || 0) > (prevPlayer.reservedCards?.length || 0)) {
          playSound('cardReserve');
        }
        if ((currPlayer.nobles?.length || 0) > (prevPlayer.nobles?.length || 0)) {
          playSound('nobleVisit');
        }
      }
    }
  }, [game, currentUserPlayer?.id]);

  const handleLeaveClick = async () => {
    setLeaving(true);
    try {
      await onLeaveGame?.();
    } finally {
      setLeaving(false);
      setIsMenuOpen(false);
    }
  };

  // Directly use player score from backend
  const userScore = currentUserPlayer?.score ?? 0;

  // Active player from the game session
  const activePlayer =
    playersList.find(
      (p) => p.id === game?.activePlayer?.id || p.name === game?.activePlayer?.name
    ) ||
    game?.activePlayer ||
    null;

  const otherPlayers = currentUserPlayer
    ? playersList.filter((p) => p.id !== currentUserPlayer.id)
    : playersList;

  return (
    <div className="w-full h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden flex flex-col p-2 sm:p-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] font-garamond">
      {/* Top-level Floating Animation Layer */}
      <AnimationOverlay animations={animations} onAnimationEnd={removeAnimation} />

      {/* Game Menu Modal Pop-up */}
      {isMenuOpen && (
        <div className="modal-backdrop">
          <div className="m-auto w-full max-w-xs splendor-panel rounded-lg p-4 sm:p-5 flex flex-col gap-3 font-garamond">
            {/* Header: User Info & Close button */}
            <div className="flex items-center justify-between border-b border-[#B8923A]/30 pb-2.5">
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B9AE96]">
                  Player
                </span>
                <span className="text-[18px] font-medium text-[#F3E9D2] font-garamond truncate">
                  {currentUsername}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="btn-icon-close"
                title="Close menu"
                aria-label="Close menu"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Options */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                className="menu-option-btn"
              >
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
                <span className="text-xs text-[#B9AE96] font-garamond italic">
                  {isFullscreen ? 'Normal' : 'Fullscreen'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="menu-option-btn"
              >
                <span>Game Settings</span>
                <span className="text-xs text-[#B9AE96] font-garamond italic">View</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className="menu-option-btn"
              >
                <span>Sound Effects</span>
                <span className="text-xs text-[#B9AE96] font-garamond italic">
                  {isMuted ? 'Muted' : 'Enabled'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLeaveClick}
                disabled={leaving}
                className="min-h-[44px] w-full px-3.5 py-2.5 rounded-lg bg-[#260F10] hover:bg-[#3A1416] border border-[#9B3038] text-left text-xs font-cinzel font-semibold uppercase tracking-[0.08em] text-[#F3A0A4] flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{leaving ? 'Leaving Game...' : 'Leave Game'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Settings Modal Popup */}
      {isSettingsOpen && (
        <div className="modal-backdrop">
          <div className="m-auto w-full max-w-lg splendor-panel rounded-lg p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 font-garamond">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#B8923A]/30 pb-2.5">
              <div>
                <h3 className="text-lg sm:text-[20px] font-semibold text-[#F3E9D2] font-cinzel leading-tight">
                  Game Settings
                </h3>
                <span className="text-[16px] text-[#B9AE96] font-garamond italic">
                  Active match settings (read-only)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="btn-icon-close"
                title="Close settings"
                aria-label="Close settings"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Username & Session Info */}
            <div className="p-2.5 sm:p-3 bg-[#120A05] rounded-lg border border-[#B8923A]/30 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B9AE96]">
                  Username
                </span>
                <span className="text-[18px] font-medium text-[#F3E9D2] font-garamond truncate">
                  {currentUsername}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0 ml-3">
                <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B9AE96]">
                  Session ID
                </span>
                <span className="text-xs font-mono text-[#F3D679]">
                  {gameId}
                </span>
              </div>
            </div>

            {/* Read-only Settings Grid */}
            <div className="grid grid-cols-2 landscape:grid-cols-4 sm:grid-cols-4 gap-2">
              <div className="settings-stat-box">
                <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-cinzel font-semibold">
                  Win Points
                </span>
                <span className="text-xl sm:text-[22px] font-bold text-[#F3D679] font-garamond">
                  {game?.winPoints ?? 15}
                </span>
                <span className="text-[10px] text-[#B9AE96] block font-garamond">target</span>
              </div>

              <div className="settings-stat-box">
                <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-cinzel font-semibold">
                  Noble Tiles
                </span>
                <span className="text-xl sm:text-[22px] font-bold text-[#F3E9D2] font-garamond">
                  {game?.settings?.nobleTilesCount ?? game?.nobleTiles?.length ?? 0}
                </span>
              </div>

              <div className="settings-stat-box">
                <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-cinzel font-semibold">
                  Face-Up Cards
                </span>
                <span className="text-xl sm:text-[22px] font-bold text-[#F3E9D2] font-garamond">
                  {game?.settings?.faceUpCardsCount ?? 4}
                </span>
              </div>

              <div className="settings-stat-box">
                <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-cinzel font-semibold">
                  Gem Tokens
                </span>
                <span className="text-xl sm:text-[22px] font-bold text-[#F3E9D2] font-garamond">
                  {game?.settings?.gemTokenCount ?? 7}
                </span>
                <span className="text-[10px] text-[#B9AE96] block font-garamond">/color</span>
              </div>

              <div className="settings-stat-box">
                <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-cinzel font-semibold">
                  Gold Tokens
                </span>
                <span className="text-xl sm:text-[22px] font-bold text-[#D4A83A] font-garamond">
                  {game?.settings?.goldTokenCount ?? 5}
                </span>
                <span className="text-[10px] text-[#B9AE96] block font-garamond">wild</span>
              </div>

              <div className="settings-stat-box">
                <span className="text-xs text-[#B9AE96] uppercase tracking-wider block font-cinzel font-semibold">
                  Turn Timer
                </span>
                <span className="text-xl sm:text-[22px] font-bold text-[#F3E9D2] font-garamond">
                  {game?.settings?.turnDurationSeconds ?? 90}s
                </span>
                <span className="text-[10px] text-[#B9AE96] block font-garamond">per turn</span>
              </div>
            </div>

            <p className="text-[16px] text-[#B9AE96] font-garamond italic text-center">
              Settings are locked during an active match and cannot be modified.
            </p>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="min-h-[44px] w-full px-4 py-2.5 btn-brass-primary rounded-lg cursor-pointer shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen & Landscape Modal Prompt */}
      {showFullscreenPrompt && !isFullscreen && (
        <div className="modal-backdrop">
          <div className="m-auto w-full max-w-md splendor-panel rounded-lg p-4 sm:p-6 text-center flex flex-col items-center gap-3 sm:gap-4 font-garamond">
            <span className="text-xs uppercase tracking-widest text-[#B8923A] font-cinzel font-semibold">
              Immersive Mode
            </span>
            <h3 className="text-xl sm:text-[20px] font-semibold text-[#F3E9D2] font-cinzel">
              Play in Fullscreen
            </h3>
            <p className="text-[17px] text-[#F3E9D2] font-garamond leading-relaxed">
              Splendor is crafted for full-screen landscape orientation. Enter fullscreen now for the optimal merchant experience.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
              <button
                type="button"
                onClick={enterFullscreen}
                className="w-full sm:flex-1 min-h-[44px] px-5 py-2.5 btn-brass-primary rounded-lg cursor-pointer shadow-md"
              >
                Enter Fullscreen
              </button>
              <button
                type="button"
                onClick={() => setShowFullscreenPrompt(false)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-transparent hover:bg-white/5 border border-[#B8923A]/30 text-xs font-cinzel font-semibold uppercase tracking-wider text-[#B9AE96] hover:text-[#F3E9D2] rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Round Announcement Banner */}
      {game?.isFinalRound && game?.status === 'active' && (
        <div className="w-full py-1.5 px-3 mb-1.5 rounded-lg bg-[#2A1F14]/95 border border-[#F3D679]/60 text-center flex items-center justify-center gap-2 shrink-0 shadow-md">
          <span className="text-xs uppercase font-cinzel font-bold tracking-widest text-[#F3D679]">
            Final Round
          </span>
          <span className="text-xs font-garamond text-[#F3E9D2]">
            — A merchant has reached {game.winPoints || 15} points. Only this final round will be completed, then the winner will be determined.
          </span>
        </div>
      )}

      {/* Winner Display */}
      {game?.status === 'completed' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 gap-6 select-none transition-all duration-500">
          <div className="flex flex-col items-center gap-3 text-center max-w-4xl px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.12em] uppercase text-[#D4A83A] font-cinzel leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              {game.winner ? `${game.winner.name} is the winner!` : 'Game Over!'}
            </h2>
            {game.winner && (
              <p className="text-base sm:text-lg md:text-xl text-[#F3E9D2]/90 font-garamond italic drop-shadow-md">
                Achieved with {game.winner.score ?? 0} prestige points &middot; {game.winner.cards?.length || 0} development cards bought
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-2">
            <button
              type="button"
              onClick={handleRematch}
              disabled={isRematching}
              className="min-h-[46px] px-8 py-3 btn-brass-primary rounded-lg cursor-pointer shadow-xl hover:scale-105 active:scale-95 transition-all text-sm sm:text-base font-cinzel tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRematching ? 'Starting Rematch...' : 'Rematch'}
            </button>
            <button
              type="button"
              onClick={onLeaveGame}
              className="min-h-[46px] px-6 py-3 bg-[#120A05]/90 hover:bg-[#260F10] border border-[#9B3038]/70 hover:border-[#9B3038] text-[#F3A0A4] rounded-lg cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all text-sm sm:text-base font-cinzel tracking-wider"
            >
              Exit to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Three-Column Board Layout */}
      <div className="grid grid-cols-1 landscape:grid-cols-12 lg:grid-cols-12 gap-2 sm:gap-3 w-full flex-1 h-full min-h-0 max-h-full overflow-hidden">
        {/* Left Column: Player Panel for Current User */}
        <PlayerPanel
          player={currentUserPlayer}
          isCurrentUser={true}
          isActive={isCurrentUserActive}
          score={userScore}
          onEndTurn={handleEndTurn}
          isEndTurnDisabled={!isCurrentUserActive || isEndingTurn}
          selectedCard={selectedCard}
          selectedUserTokens={selectedUserTokens}
          hasCardSelected={hasCardSelected}
          hasTokensSelected={hasTokensSelected}
          validationContext={validationContext}
          onCardClick={handleCardClick}
          onUserTokenClick={handleUserTokenClick}
          onUserTokenDecrement={handleUserTokenDecrement}
        />

        {/* Center Column: Common Cards & Bank Tokens */}
        <GameBoard
          game={game}
          selectedCard={selectedCard}
          selectedNoble={selectedNoble}
          selectedBankTokens={selectedBankTokens}
          selectedUserTokens={selectedUserTokens}
          totalBankSelected={totalBankSelected}
          totalUserSelected={totalUserSelected}
          hasCardSelected={hasCardSelected}
          hasTokensSelected={hasTokensSelected}
          hasNobleSelected={hasNobleSelected}
          validationContext={validationContext}
          onCardClick={handleCardClick}
          onNobleClick={handleNobleClick}
          onBuyCard={handleBuyCard}
          onReserveCard={handleReserveCard}
          onInviteNoble={handleInviteNoble}
          isReserveDisabled={
            !isCurrentUserActive ||
            (currentUserPlayer?.reservedCards?.length ?? 0) >= 3 ||
            (selectedCard ? currentUserPlayer?.reservedCards?.includes(selectedCard) : false)
          }
          onTakeTokens={handleTakeTokens}
          onBankTokenClick={handleBankTokenClick}
          onBankTokenDecrement={handleBankTokenDecrement}
          onClearSelection={clearSelection}
        />

        {/* Right Column: Other Players Stacked Vertically */}
        <div className="landscape:col-span-3 lg:col-span-3 flex flex-col gap-2 sm:gap-2.5 overflow-y-auto overflow-x-hidden max-h-full custom-scrollbar min-h-0">
          {otherPlayers.length > 0 ? (
            otherPlayers.map((otherPlayer) => {
              const isOtherPlayerActive = Boolean(
                game?.status === 'active' &&
                  activePlayer &&
                  (activePlayer.id === otherPlayer.id || activePlayer.name === otherPlayer.name)
              );
              return (
                <PlayerPanel
                  key={otherPlayer.id}
                  player={otherPlayer}
                  isCurrentUser={false}
                  isActive={isOtherPlayerActive}
                />
              );
            })
          ) : (
            <PlayerPanel
              player={null}
              isCurrentUser={false}
              isActive={false}
            />
          )}

          {/* Bottom Row: Turn Timer (left) & Settings & Menu Button (right) */}
          <div className="w-full mt-auto flex items-center gap-2 shrink-0 pt-1">
            {/* Turn Timer on the left */}
            <div
              className={`flex-1 min-w-0 py-2 px-2.5 sm:px-3 rounded-lg splendor-panel border transition-all flex items-center justify-center gap-2 select-none shadow-sm ${
                isUrgentTimer
                  ? 'border-[#C8283B] bg-[#260F10]/85 shadow-[0_0_10px_rgba(200,40,59,0.35)]'
                  : 'border-[#B8923A]/30'
              }`}
              title={`Time remaining in ${isCurrentUserActive ? 'your' : `${activePlayer?.name || 'current player'}'s`} turn`}
            >
              <svg
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isUrgentTimer ? 'text-[#F0707F] animate-pulse' : 'text-[#B8923A]'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span
                className={`font-garamond font-bold text-sm sm:text-base tracking-wider shrink-0 tabular-nums ${
                  isUrgentTimer ? 'text-[#F0707F]' : 'text-[#F3D679]'
                }`}
              >
                {formattedTurnTime}
              </span>
            </div>

            {/* Quick Mute Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className="py-2 px-2.5 rounded-lg splendor-panel border border-[#B8923A]/30 hover:border-[#B8923A]/70 text-[#B9AE96] hover:text-[#F3D679] flex items-center justify-center cursor-pointer transition-all shrink-0 hover:bg-[#25211D]/80 shadow-sm"
              title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {isMuted ? (
                <svg className="w-4 h-4 text-[#C8283B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h2.24z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#B8923A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9c0-.414.336-.75.75-.75h2.24z" />
                </svg>
              )}
            </button>

            {/* Settings & Menu Button on the right */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="py-2 px-3 rounded-lg splendor-panel border border-[#B8923A]/30 hover:border-[#B8923A]/70 text-[#B9AE96] hover:text-[#F3D679] flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 hover:bg-[#25211D]/80 shadow-sm"
              title="Settings & Menu"
              aria-label="Open settings menu"
            >
              <svg className="w-4 h-4 text-[#B8923A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs uppercase font-cinzel font-semibold tracking-wider">
                Menu
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
