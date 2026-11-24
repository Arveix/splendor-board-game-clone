import { useEffect, useState } from 'react';
import type { GameSession, UserSession } from '../types';

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
  const [error, setError] = useState<string | null>(null);

  const fetchActiveLobbies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games', {
        headers: {
          'x-session-id': session.sessionId,
        },
      });

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
    fetchActiveLobbies();
  }, [session.sessionId]);

  const handleCreateGameClick = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session.sessionId,
        },
        body: JSON.stringify({
          name: `${session.username}'s Guild`,
          maxPlayers: 4,
        }),
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
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session.sessionId,
        },
      });

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

  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-y-auto font-['EB_Garamond',serif]">
      {/* Top Banner / Create Game Card */}
      <div className="w-full bg-[#1A110B] border border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider block font-['EB_Garamond']">
            Merchant Guildhall
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#B8923A] mt-0.5 font-['Cinzel']">
            Start a New Game
          </h2>
          <p className="text-[17px] not-italic text-[#F3E9D2] mt-1 max-w-md leading-relaxed font-['EB_Garamond']">
            Welcome, <strong className="text-[#F3E9D2] font-semibold">{session.username}</strong>. Establish an open trading session for other Renaissance merchants to join.
          </p>
        </div>

        {/* Create Game Session Button */}
        <button
          type="button"
          onClick={handleCreateGameClick}
          disabled={creating}
          className="self-start sm:self-auto px-5 py-3 rounded-xl bg-[#B8923A] hover:bg-[#D4A83A] text-[#1B1712] font-['Cinzel'] font-semibold text-base uppercase tracking-[0.08em] shadow-md transition-all cursor-pointer whitespace-nowrap disabled:bg-[#4A4338] disabled:text-[#8A8272]"
        >
          {creating ? 'Creating Session...' : '+ Create Game Session'}
        </button>
      </div>

      {/* Active Lobbies Section */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-[#B8923A] uppercase tracking-wider font-['Cinzel']">
              Active Lobbies
            </h3>
            <span className="text-xs font-bold text-[#F3E9D2] bg-[#120A05] border border-black/50 px-2.5 py-0.5 rounded-full font-['Inter']">
              {games.length}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchActiveLobbies}
            disabled={loading}
            className="text-sm text-[#B9AE96] hover:text-[#F3E9D2] transition-colors disabled:opacity-50 cursor-pointer font-['EB_Garamond']"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Loading state */}
        {loading && games.length === 0 && (
          <div className="w-full py-12 rounded-2xl bg-[#1A110B] border border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#B8923A] border-t-transparent rounded-full animate-spin" />
            <p className="text-[17px] not-italic text-[#F3E9D2]">Loading active lobbies from guildhall...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full p-3 sm:p-4 rounded-xl bg-[#C8283B]/20 border border-[#C8283B]/60 text-[#F0707F] text-sm flex items-center justify-between gap-3 font-['EB_Garamond']">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              title="Close"
              aria-label="Close error message"
              className="w-8 h-8 rounded-lg hover:bg-[#C8283B]/30 text-[#F0707F] hover:text-[#FFFFFF] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Empty state box: fill #1A110B, with a #B8923A border at 40% opacity */}
        {!loading && games.length === 0 && !error && (
          <div className="w-full py-12 px-4 rounded-2xl border border-[#B8923A]/40 bg-[#1A110B] shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] text-center flex flex-col items-center justify-center gap-2">
            <span className="text-lg font-semibold text-[#F3E9D2] uppercase tracking-wider font-['Cinzel']">
              No Active Lobbies Found
            </span>
            <p className="text-[17px] not-italic text-[#F3E9D2] max-w-sm leading-relaxed font-['EB_Garamond']">
              There are currently no waiting game sessions. Click &quot;+ Create Game Session&quot; above to establish one.
            </p>
          </div>
        )}

        {/* Lobbies List */}
        {games.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {games.map((game) => {
              const isFull = game.playerCount >= game.maxPlayers;
              const isWaiting = game.status === 'waiting';
              const isJoining = joiningId === game.id;

              return (
                <div
                  key={game.id}
                  className="w-full p-4 rounded-xl border border-black/40 bg-[#1A110B] shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#B8923A]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F3E9D2] bg-[#120A05] border border-black/50 px-2 py-0.5 rounded font-['Inter']">
                        {game.id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border font-['Cinzel'] ${
                          isWaiting
                            ? 'bg-[#120A05] text-[#F3E9D2] border-black/40'
                            : 'bg-[#120A05] text-[#6FD79A] border-[#2E9E5B]/50'
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>

                    <h4 className="text-lg font-semibold text-[#F3E9D2] mt-0.5 font-['Cinzel']">
                      {game.name}
                    </h4>

                    <div className="flex items-center gap-3 text-[17px] not-italic text-[#F3E9D2] font-['EB_Garamond']">
                      <span>
                        Host: <strong className="text-[#F3E9D2] font-medium">{game.hostUsername}</strong>
                      </span>
                      <span className="text-[#B9AE96]">&bull;</span>
                      <span>
                        Players: <strong className="text-[#F3E9D2] font-['Inter'] font-bold">{game.playerCount}/{game.maxPlayers}</strong>
                      </span>
                    </div>

                    {/* Players list */}
                    {game.players && game.players.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {game.players.map((p) => (
                          <span
                            key={p.id}
                            className="text-sm bg-[#120A05] border border-black/30 px-2 py-0.5 rounded text-[#F3E9D2] font-['EB_Garamond']"
                          >
                            {p.name}
                            {p.name === game.hostUsername ? ' (Host)' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Join Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isFull || isJoining}
                      onClick={() => handleJoinLobby(game.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                        isFull
                          ? 'bg-[#4A4338] text-[#8A8272] cursor-not-allowed'
                          : 'bg-[#B8923A] hover:bg-[#D4A83A] text-[#1B1712] shadow-md active:scale-95'
                      }`}
                    >
                      {isJoining ? 'Joining...' : isFull ? 'Full' : 'Join'}
                    </button>
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
