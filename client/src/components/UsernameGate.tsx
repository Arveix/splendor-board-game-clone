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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171615]/95 p-4 font-['Inter',sans-serif]">
      <div className="w-full max-w-md bg-[#25211D] border border-[#B69A65]/40 rounded-2xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
        {/* Brand Crest */}
        <div className="mb-4">
          <div className="w-14 h-14 rounded-xl bg-[#171615] border border-[#B69A65]/60 flex items-center justify-center mx-auto shadow-md">
            <span className="text-2xl font-black text-[#B69A65] font-['Cinzel']">
              S
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-[#B69A65] font-['Cinzel'] mt-3">
            SPLENDOR
          </h1>
          <p className="text-xs text-[#D8C8A5]/80 font-['Cormorant_Garamond'] italic tracking-wide mt-0.5">
            The Renaissance Merchant&apos;s Guild
          </p>
        </div>

        {/* Informational Prompt */}
        <div className="mb-6">
          <h2 className="text-base font-bold text-white font-['Cinzel']">
            Welcome, Merchant
          </h2>
          <p className="text-xs text-[#D8C8A5]/70 mt-1 max-w-xs mx-auto leading-relaxed">
            Please enter your username to enter the guildhall. Your session will remain active across pages and reloads.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col text-left gap-1">
            <label htmlFor="username-input" className="text-[11px] font-bold text-[#D8C8A5] uppercase tracking-wider">
              Merchant Identity
            </label>
            <input
              id="username-input"
              type="text"
              autoFocus
              maxLength={20}
              placeholder="e.g. Cosimo de' Medici"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#171615] border border-[#302A22] focus:border-[#B69A65] focus:outline-none text-[#D8C8A5] placeholder-[#80643D] font-medium text-sm transition-all"
            />
            {error && (
              <span className="text-xs text-[#C33C42] mt-1 font-medium">
                {error}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#B69A65] hover:bg-[#D5A936] text-[#171615] font-black text-xs uppercase tracking-wider shadow-md active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Entering Guildhall...' : 'Enter Splendor'}
          </button>
        </form>

        <p className="text-[10px] text-[#80643D] mt-6 max-w-xs leading-relaxed font-['Cormorant_Garamond'] italic">
          Access to any part of this website requires an active merchant session stored in your browser.
        </p>
      </div>
    </div>
  );
}
