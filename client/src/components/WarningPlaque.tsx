import { useEffect } from 'react';

interface WarningPlaqueProps {
  message: string;
  heading?: string;
  onClose?: () => void;
  autoDismissMs?: number;
}

export const WarningPlaque = ({
  message,
  heading = 'INVALID MOVE',
  onClose,
  autoDismissMs = 3000,
}: WarningPlaqueProps) => {
  useEffect(() => {
    if (!autoDismissMs || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onClose]);

  return (
    <div
      role="alert"
      className="warning-plaque w-full max-w-[320px] mx-auto flex items-center gap-2.5 shadow-lg select-none"
    >
      {/* Icon plate: #7E1523 */}
      <div className="w-6 h-6 rounded-lg bg-[#7E1523] flex items-center justify-center shrink-0">
        <svg
          className="w-3.5 h-3.5 text-[#F3A0A4]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      {/* Content: Heading (Inter 600) + Message (EB Garamond 400, upright) */}
      <div className="flex flex-col min-w-0 flex-1 text-left">
        <span className="font-cinzel font-semibold text-[11px] sm:text-xs uppercase tracking-wider text-[#F3A0A4] leading-tight">
          {heading}
        </span>
        <span className="font-garamond text-[15px] sm:text-[17px] not-italic text-[#F3E9D2] leading-snug line-clamp-2">
          {message}
        </span>
      </div>

      {/* Optional close icon: #B9AE96 */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="w-5 h-5 rounded-lg flex items-center justify-center text-[#B9AE96] hover:text-[#F3E9D2] transition-colors shrink-0 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};
