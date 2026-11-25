import { useState } from 'react';
import { createSessionApi } from '../api';
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
      session = await createSessionApi(cleanName);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 409 || errorObj?.message === 'Username is already taken') {
        setError(errorObj.message || 'Username is already taken. Please choose another.');
      } else {
        setError(errorObj?.message || 'Failed to connect to server. Please try again.');
      }
      return;
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
      className="fixed inset-0 z-50 overflow-y-auto bg-cover bg-center bg-no-repeat font-garamond min-h-[100dvh]"
      style={{
        backgroundImage: "linear-gradient(rgba(18, 10, 5, 0.62), rgba(18, 10, 5, 0.82)), url('/assets/splendor_background.webp')",
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      <div className="min-h-[calc(100dvh-1.5rem)] flex flex-col items-center justify-center p-3.5 sm:p-6">
        <div className="relative w-full max-w-md my-auto splendor-panel border border-[#B8923A] rounded-lg p-7 sm:p-10 text-center flex flex-col items-center gap-8 sm:gap-10 overflow-hidden shadow-2xl">
          {/* 4 Corner Stepped Brackets with Diamond Stars */}
          {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map((pos, i) => (
            <div key={i} className={`absolute w-7 h-7 sm:w-8 sm:h-8 pointer-events-none select-none ${pos}`}>
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
                <path d="M 2 16 L 2 6 A 4 4 0 0 1 6 2 L 16 2 M 10 2 L 10 10 L 2 10" stroke="#B8923A" strokeWidth="1.2" />
                <polygon points="6,1.5 7.2,4.8 10.5,6 7.2,7.2 6,10.5 4.8,7.2 1.5,6 4.8,4.8" fill="#F3D679" />
              </svg>
            </div>
          ))}

          {/* Brand Logo */}
          <div className="flex flex-col items-center">
            <img
              src="/assets/splendor_logo.webp"
              alt="Splendor"
              className="w-48 sm:w-56 h-auto object-contain drop-shadow-md mx-auto"
            />
          </div>

          {/* Informational Prompt */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#F3E9D2] font-cinzel tracking-wide">
              Welcome, Merchant
            </h2>
            <p className="text-sm sm:text-[17px] not-italic text-[#F3E9D2] mt-2 max-w-xs mx-auto leading-normal">
              Please enter your merchant name to enter the guildhall.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6 sm:gap-7">
            <div className="flex flex-col text-left gap-2.5">
              <label htmlFor="username-input" className="text-xs font-semibold text-[#B9AE96] uppercase tracking-wider font-cinzel px-1">
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
                className="w-full px-4 py-3 rounded-lg bg-[#120A05]/75 border border-black/40 focus:border-[#B8923A] focus:outline-none text-[#F3E9D2] placeholder-[#B9AE96]/40 font-garamond text-sm sm:text-[17px] transition-all shadow-inner"
              />
              {error && (
                <div className="warning-plaque flex items-center gap-2 mt-1">
                  <div className="w-5 h-5 rounded-lg bg-[#7E1523] flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-[#F3A0A4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm text-[#F3A0A4] font-garamond font-medium">
                    {error}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 sm:py-4 px-5 rounded-lg btn-brass-primary shadow-md active:scale-[0.99] cursor-pointer"
            >
              {loading ? 'Entering Guildhall...' : 'Enter Splendor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
