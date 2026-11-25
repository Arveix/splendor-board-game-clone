import { useEffect, useState } from 'react';
import { createGameApi, joinGameApi, listGamesApi } from '../api';
import type { GameSession, UserSession } from '../types';
import { WarningPlaque } from './WarningPlaque';

interface HomePageProps {
  session: UserSession;
  onGameJoined: (gameId: string) => void;
  onSessionInvalidated: () => void;
}

export default function HomePage({
  session,
  onGameJoined,
  onSessionInvalidated,
}: HomePageProps) {
  const [games, setGames] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchActiveLobbies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listGamesApi(session.sessionId);

      if (res.status === 401) {
        onSessionInvalidated();
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load lobbies (${res.status})`);
      }
      const data: GameSession[] = await res.json();
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveLobbies();
    }, 0);
    return () => clearTimeout(timer);
  }, [session.sessionId]);

  const handleCreateGameClick = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createGameApi(session.sessionId, {
        name: `${session.username}'s Guild`,
        maxPlayers: 4,
      });

      if (res.status === 401) {
        onSessionInvalidated();
        return;
      }

      if (!res.ok) {
        throw new Error(`Server failed to initialize game session (${res.status})`);
      }

      const newGame: GameSession = await res.json();
      onGameJoined(newGame.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating game session');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinLobby = async (gameId: string) => {
    setJoiningId(gameId);
    setError(null);
    try {
      const res = await joinGameApi(session.sessionId, gameId);

      if (res.status === 401) {
        onSessionInvalidated();
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to join lobby (${res.status})`);
      }

      onGameJoined(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error joining lobby');
    } finally {
      setJoiningId(null);
    }
  };

  const handleJoinByIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinGameId.trim();
    if (!trimmed) return;
    handleJoinLobby(trimmed);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-7 sm:gap-8 p-4 sm:p-6 overflow-y-auto font-garamond">
      {/* Page Title & User Welcome */}
      <div className="text-left px-1 flex flex-col">
        <h2 className="text-[24px] font-semibold uppercase tracking-wider text-[#B8923A] font-cinzel leading-none">
          Merchant Guildhall
        </h2>
        <p className="text-[15px] font-normal text-[#B9AE96]/75 font-garamond leading-none mt-1">
          Welcome, <strong className="text-[#F3E9D2]/90 font-medium">{session.username}</strong>. Ready to trade?
        </p>
      </div>

      {/* Top Banner: Two-Column Layout (Join Game | Create a New Game) */}
      <div className="w-full splendor-panel rounded-lg p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch">
        {/* Left Column: Join Game */}
        <div className="flex flex-col justify-between gap-4 text-left">
          <div>
            <h3 className="text-[22px] font-semibold text-[#F3E9D2] font-garamond">
              Join Game
            </h3>
            <p className="text-[17px] font-normal leading-[1.5] text-[#B9AE96] mt-1 font-garamond">
              Enter a game ID to join an active trading session.
            </p>
          </div>

          <form onSubmit={handleJoinByIdSubmit} className="flex items-center gap-2.5 mt-auto pt-2">
            <input
              type="text"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
              placeholder="ENTER GAME ID"
              maxLength={12}
              className="flex-1 min-w-0 bg-[#120A05] border border-[#B8923A]/40 rounded-lg px-3.5 py-2.5 text-[#F3E9D2] font-garamond text-base placeholder:text-[#B9AE96]/40 uppercase tracking-wider focus:outline-none focus:border-[#B8923A] transition-colors"
            />
            <button
              type="submit"
              disabled={!joinGameId.trim()}
              className="px-5 py-2.5 rounded-lg btn-brass-primary shadow-md cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Game
            </button>
          </form>
        </div>

        {/* Right Column: Create a New Game */}
        <div className="flex flex-col justify-between gap-4 text-left border-t md:border-t-0 md:border-l border-[#B8923A]/30 pt-5 md:pt-0 md:pl-8">
          <div>
            <h3 className="text-[22px] font-semibold text-[#F3E9D2] font-garamond">
              Create a New Game
            </h3>
            <p className="text-[17px] font-normal leading-[1.5] text-[#B9AE96] mt-1 font-garamond">
              Start a trading session for other merchants to join.
            </p>
          </div>

          <div className="mt-auto pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCreateGameClick}
              disabled={creating}
              className="px-5 py-2.5 rounded-lg btn-brass-primary shadow-md cursor-pointer whitespace-nowrap"
            >
              {creating ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Games Section */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] sm:text-[13px] font-medium text-[#B8923A] uppercase tracking-[0.16em] font-cinzel">
              Current Games
            </span>
            <span className="text-[13px] font-bold text-[#B8923A] bg-[#120A05] border border-[#B8923A]/60 px-3 py-1 rounded-full font-cinzel leading-none inline-flex items-center justify-center min-w-[26px]">
              {games.length}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchActiveLobbies}
            disabled={loading}
            className="text-[17px] font-medium font-garamond text-[#B9AE96] hover:text-[#F3E9D2] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Loading state */}
        {loading && games.length === 0 && (
          <div className="w-full py-12 rounded-lg splendor-panel text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#B8923A] border-t-transparent rounded-full animate-spin" />
            <p className="text-[17px] font-normal leading-[1.5] text-[#F3E9D2] font-garamond">Loading current games from guildhall...</p>
          </div>
        )}

        {/* Error state: Section 3.5 compact red-wax warning plaque */}
        {error && (
          <WarningPlaque
            message={error}
            heading="ERROR"
            onClose={() => setError(null)}
          />
        )}

        {/* Empty state box */}
        {!loading && games.length === 0 && !error && (
          <div className="w-full py-12 px-4 rounded-lg empty-state-box text-center flex flex-col items-center justify-center gap-2">
            <span className="text-[22px] font-semibold text-[#F3E9D2] font-garamond">
              No current games found
            </span>
            <p className="text-[17px] font-normal leading-[1.5] text-[#B9AE96] max-w-sm font-garamond">
              There are currently no waiting game sessions. Click &quot;Create Game&quot; above to establish one.
            </p>
          </div>
        )}

        {/* Lobbies List: Single Unified Container */}
        {games.length > 0 && (
          <div className="w-full rounded-lg splendor-panel flex flex-col overflow-hidden">
            {games.map((game, index) => {
              const isActive = game.status === 'active';
              const isFull = game.playerCount >= game.maxPlayers;
              const isJoining = joiningId === game.id;
              const isDisabled = isActive || isFull || isJoining;

              let buttonText = 'Join';
              let tooltip = '';
              if (isJoining) {
                buttonText = 'Joining...';
              } else if (isActive) {
                buttonText = 'Active';
                tooltip = 'Cannot join active games.';
              } else if (isFull) {
                buttonText = 'Full';
                tooltip = 'Lobby is full.';
              }

              return (
                <div key={game.id} className="flex flex-col">
                  {index > 0 && <div className="mx-4 my-1 h-px bg-[#B8923A]/20" />}
                  <div className="w-full px-4 py-4 sm:py-4.5 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-3">
                    {/* Left Column: Lobby Name + ID on Line 1; Host & Player count on Line 2 */}
                    <div className="flex flex-col text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-[20px] font-semibold text-[#F3E9D2] font-garamond truncate leading-tight">
                          {game.name}
                        </h4>
                        <span className="text-[14px] font-medium text-[#B9AE96] bg-[#120A05]/80 border border-black/50 px-2 py-0.5 rounded-lg font-garamond shrink-0 leading-none">
                          {game.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[14px] text-[#B9AE96] font-garamond leading-snug mt-0.5">
                        <span>
                          Host: <strong className="text-[#F3E9D2] font-medium font-garamond text-[14px]">{game.hostUsername}</strong>
                        </span>
                        <span className="text-[#B9AE96]/40">&bull;</span>
                        <span>
                          Players: <strong className="text-[#F3E9D2] font-medium font-garamond text-[14px]">{game.playerCount}/{game.maxPlayers}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Consolidated Action Button on the same line */}
                    <div title={tooltip || undefined} className="shrink-0 flex items-center">
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleJoinLobby(game.id)}
                        className={`px-4 py-1.5 rounded-lg text-[14px] font-cinzel font-bold uppercase tracking-[0.1em] transition-all ${
                          isActive
                            ? 'bg-[#1E1712] text-[#8A8272] border border-[#B8923A]/20 cursor-not-allowed opacity-60'
                            : isFull
                            ? 'bg-[#3A3026] text-[#8A8272] border border-black/40 cursor-not-allowed'
                            : 'btn-brass-primary shadow-sm cursor-pointer active:scale-95'
                        }`}
                      >
                        {buttonText}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
