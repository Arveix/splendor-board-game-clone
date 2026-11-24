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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#120A05]/95 font-['EB_Garamond',serif] min-h-[100dvh]"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      <div className="min-h-[calc(100dvh-1.5rem)] flex flex-col items-center justify-center py-2 sm:py-6">
        <div className="w-full max-w-md my-auto bg-[#1A110B] border border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),_inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-8 text-center flex flex-col items-center">
          {/* Brand Crest */}
          <div className="mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-[#120A05] border border-black/50 flex items-center justify-center mx-auto shadow-md">
              <span className="text-xl sm:text-2xl font-bold text-[#B8923A] font-['Cinzel']">
                S
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-[#B8923A] font-['Cinzel'] mt-1.5 sm:mt-3">
              SPLENDOR
            </h1>
            <p className="text-xs sm:text-sm text-[#B9AE96] font-['EB_Garamond'] italic tracking-wide mt-0.5">
              The Renaissance Merchant&apos;s Guild
            </p>
          </div>

          {/* Informational Prompt */}
          <div className="mb-3 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-[#F3E9D2] font-['Cinzel']">
              Welcome, Merchant
            </h2>
            <p className="text-sm sm:text-[17px] not-italic text-[#F3E9D2] mt-1 sm:mt-1.5 max-w-xs mx-auto leading-relaxed">
              Please enter your merchant name to enter the guildhall. Your session will remain active across pages and reloads.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5 sm:gap-4">
            <div className="flex flex-col text-left gap-1">
              <label htmlFor="username-input" className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider">
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
                className="w-full px-3.5 sm:px-4 py-2 sm:py-3 rounded-xl bg-[#120A05] border border-black/40 focus:border-[#B8923A] focus:outline-none text-[#F3E9D2] placeholder-[#B9AE96]/40 font-['EB_Garamond'] text-sm sm:text-[17px] transition-all"
              />
              {error && (
                <span className="text-xs sm:text-sm text-[#F0707F] mt-1 font-['EB_Garamond'] font-medium">
                  {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 sm:mt-2 py-2.5 sm:py-3.5 px-4 rounded-xl bg-[#B8923A] hover:bg-[#D4A83A] text-[#1B1712] font-['Cinzel'] font-semibold text-sm sm:text-base uppercase tracking-[0.08em] shadow-md active:scale-[0.99] transition-all cursor-pointer disabled:bg-[#4A4338] disabled:text-[#8A8272]"
            >
              {loading ? 'Entering Guildhall...' : 'Enter Splendor'}
            </button>
          </form>

          <p className="text-[11px] sm:text-xs text-[#B9AE96]/70 mt-3 sm:mt-6 max-w-xs leading-relaxed font-['EB_Garamond'] italic">
            Access to any part of this website requires an active merchant session stored in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
