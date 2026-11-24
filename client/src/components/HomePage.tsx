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
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-y-auto">
      {/* Top Banner / Create Game Card */}
      <div className="w-full bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900/90 border border-yellow-500/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
            Merchant Guild
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
            Start a New Game
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
            Welcome, <strong className="text-yellow-400 font-bold">{session.username}</strong>. Create an open game session with a unique 5-character ID for other merchants to join.
          </p>
        </div>

        {/* Create Game Session Button */}
        <button
          type="button"
          onClick={handleCreateGameClick}
          disabled={creating}
          className="self-start sm:self-auto px-5 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 transition-all cursor-pointer whitespace-nowrap"
        >
          {creating ? 'Creating Session...' : '+ Create Game Session'}
        </button>
      </div>

      {/* Active Lobbies Section */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
              Active Lobbies
            </h3>
            <span className="text-xs font-mono font-bold text-yellow-400 bg-gray-900 border border-yellow-500/30 px-2 py-0.5 rounded-full">
              {games.length}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchActiveLobbies}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Loading state */}
        {loading && games.length === 0 && (
          <div className="w-full py-12 rounded-2xl border border-gray-800 bg-gray-900/40 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading active lobbies from server...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
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
          <div className="w-full py-12 px-4 rounded-2xl border border-dashed border-gray-800 bg-gray-900/30 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              No Active Lobbies Found
            </span>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              There are currently no waiting game sessions. Click &quot;+ Create Game Session&quot; above to create one.
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
                  className="w-full p-4 rounded-xl border border-gray-800 bg-gray-900 hover:border-yellow-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-yellow-400 bg-gray-950 border border-yellow-500/30 px-2 py-0.5 rounded">
                        {game.id}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          isWaiting
                            ? 'bg-yellow-950/60 text-yellow-300 border-yellow-500/30'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mt-0.5">
                      {game.name}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        Host: <strong className="text-gray-200">{game.hostUsername}</strong>
                      </span>
                      <span className="text-gray-600">&bull;</span>
                      <span>
                        Players: <strong className="text-gray-200">{game.playerCount}/{game.maxPlayers}</strong>
                      </span>
                    </div>

                    {/* Players list */}
                    {game.players && game.players.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {game.players.map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] bg-gray-950 border border-gray-800 px-2 py-0.5 rounded text-gray-300"
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
                          ? 'bg-gray-950 border border-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-yellow-500 hover:bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/20 active:scale-95'
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
