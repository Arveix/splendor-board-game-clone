import { useState } from 'react';
import type { UserSession } from '../types';

interface UsernameGateProps {
  onSessionInitialized: (session: UserSession) => void;
}

export default function UsernameGate({ onSessionInitialized }: UsernameGateProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = usernameInput.trim();

    if (!cleanName) {
      setError('Please enter a username to continue.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Username must be at least 2 characters long.');
      return;
    }

    if (cleanName.length > 20) {
      setError('Username must not exceed 20 characters.');
      return;
    }

    setLoading(true);
    setError('');

    let session: UserSession;

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanName }),
      });

      if (res.ok) {
        session = await res.json();
      } else {
        throw new Error('Server session initialization failed');
      }
    } catch {
      // Offline fallback: network errors or disconnections do not stop the session
      session = {
        sessionId: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        username: cleanName,
        currentGameSessionId: null,
        createdAt: Date.now(),
      };
    } finally {
      setLoading(false);
    }

    // Persist session in local storage
    try {
      localStorage.setItem('splendor_username', session.username);
      localStorage.setItem('splendor_session_id', session.sessionId);
    } catch {
      // Local storage protection
    }

    onSessionInitialized(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-gray-900 border border-yellow-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-yellow-500/10 text-center flex flex-col items-center">
        {/* Brand Crest */}
        <div className="mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 p-0.5 mx-auto shadow-lg shadow-yellow-500/20">
            <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
              <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400 font-serif">
                S
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mt-2">
            SPLENDOR
          </h1>
          <p className="text-xs text-gray-400 font-medium tracking-wide mt-1">
            Renaissance Guild Merchants
          </p>
        </div>

        {/* Informational Prompt */}
        <div className="mb-6">
          <h2 className="text-base font-bold text-gray-100">
            Welcome, Merchant
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Please enter your username to enter the website. Your session will remain active across pages and reloads.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col text-left gap-1">
            <label htmlFor="username-input" className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Username
            </label>
            <input
              id="username-input"
              type="text"
              autoFocus
              maxLength={20}
              placeholder="e.g. Cosimo"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 text-white placeholder-gray-600 font-medium text-sm transition-all"
            />
            {error && (
              <span className="text-xs text-red-400 mt-1 font-medium">
                {error}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-gray-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-yellow-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Entering Guild...' : 'Enter Splendor'}
          </button>
        </form>

        <p className="text-[10px] text-gray-500 mt-6 max-w-xs leading-relaxed">
          Access to any part of this website requires an active merchant session stored in your browser.
        </p>
      </div>
    </div>
  );
}
