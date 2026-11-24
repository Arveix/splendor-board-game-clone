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
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-y-auto font-['Inter',sans-serif]">
      {/* Top Banner / Create Game Card */}
      <div className="w-full bg-[#25211D] border border-[#B69A65]/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#B69A65] uppercase tracking-widest block font-['Inter']">
            Merchant Guildhall
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 font-['Cinzel']">
            Start a New Game
          </h2>
          <p className="text-xs text-[#D8C8A5]/70 mt-1 max-w-md leading-relaxed">
            Welcome, <strong className="text-[#B69A65] font-bold">{session.username}</strong>. Establish an open trading session for other Renaissance merchants to join.
          </p>
        </div>

        {/* Create Game Session Button */}
        <button
          type="button"
          onClick={handleCreateGameClick}
          disabled={creating}
          className="self-start sm:self-auto px-5 py-3 rounded-xl bg-[#B69A65] hover:bg-[#D5A936] text-[#171615] font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {creating ? 'Creating Session...' : '+ Create Game Session'}
        </button>
      </div>

      {/* Active Lobbies Section */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[#D8C8A5] uppercase tracking-wider font-['Cinzel']">
              Active Lobbies
            </h3>
            <span className="text-xs font-mono font-bold text-[#B69A65] bg-[#171615] border border-[#80643D]/50 px-2.5 py-0.5 rounded-full font-['IBM_Plex_Sans']">
              {games.length}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchActiveLobbies}
            disabled={loading}
            className="text-xs text-[#80643D] hover:text-[#D8C8A5] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Loading state */}
        {loading && games.length === 0 && (
          <div className="w-full py-12 rounded-2xl border border-[#302A22] bg-[#25211D]/60 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#B69A65] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#D8C8A5]/70">Loading active lobbies from guildhall...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full p-4 rounded-xl bg-[#C33C42]/20 border border-[#C33C42]/50 text-[#D8C8A5] text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchActiveLobbies}
              className="text-xs font-bold underline hover:text-white cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && games.length === 0 && !error && (
          <div className="w-full py-12 px-4 rounded-2xl border border-dashed border-[#302A22] bg-[#25211D]/40 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-bold text-[#80643D] uppercase tracking-wider font-['Cinzel']">
              No Active Lobbies Found
            </span>
            <p className="text-xs text-[#D8C8A5]/60 max-w-xs leading-relaxed font-['Cormorant_Garamond'] italic text-sm">
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
                  className="w-full p-4 rounded-xl border border-[#302A22] bg-[#25211D] hover:border-[#B69A65]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#B69A65] bg-[#171615] border border-[#80643D]/50 px-2 py-0.5 rounded font-['IBM_Plex_Sans']">
                        {game.id}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          isWaiting
                            ? 'bg-[#302A22] text-[#B69A65] border-[#80643D]/50'
                            : 'bg-[#171615] text-[#278451] border-[#278451]/50'
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mt-0.5 font-['Cormorant_Garamond'] text-lg">
                      {game.name}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-[#D8C8A5]/70">
                      <span>
                        Host: <strong className="text-[#D8C8A5]">{game.hostUsername}</strong>
                      </span>
                      <span className="text-[#80643D]">&bull;</span>
                      <span>
                        Players: <strong className="text-[#D8C8A5] font-['IBM_Plex_Sans']">{game.playerCount}/{game.maxPlayers}</strong>
                      </span>
                    </div>

                    {/* Players list */}
                    {game.players && game.players.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {game.players.map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] bg-[#171615] border border-[#302A22] px-2 py-0.5 rounded text-[#D8C8A5]/90"
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
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        isFull
                          ? 'bg-[#171615] border border-[#302A22] text-[#80643D] cursor-not-allowed'
                          : 'bg-[#B69A65] hover:bg-[#D5A936] text-[#171615] shadow-md active:scale-95'
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
