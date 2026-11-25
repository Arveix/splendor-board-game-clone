import { useEffect, useState } from 'react';

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
}

interface WebkitHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

type ScreenOrientationWithLock = ScreenOrientation & {
  unlock?: () => void;
};

export function useFullscreen() {
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.fullscreenElement : true;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  const enterFullscreen = async () => {
    setShowFullscreenPrompt(false);
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as WebkitHTMLElement).webkitRequestFullscreen) {
          await (document.documentElement as WebkitHTMLElement).webkitRequestFullscreen?.();
        }
      }
    } catch {
      // Browser may reject fullscreen without active user interaction
    }

    try {
      const orientation = window.screen?.orientation as ScreenOrientationWithLock | undefined;
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
      }
    } catch {
      // Orientation lock not supported on all devices
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as WebkitDocument).webkitExitFullscreen) {
          await (document as WebkitDocument).webkitExitFullscreen?.();
        }
      }
    } catch {
      // Browser may reject exit fullscreen
    }

    try {
      const orientation = window.screen?.orientation as ScreenOrientationWithLock | undefined;
      if (orientation && typeof orientation.unlock === 'function') {
        orientation.unlock();
      }
    } catch {
      // Unsupported in some desktop/iOS browsers
    }
  };

  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFs = Boolean(
        document.fullscreenElement || (document as WebkitDocument).webkitFullscreenElement
      );
      setIsFullscreen(isFs);

      if (isFs) {
        try {
          const orientation = window.screen?.orientation as ScreenOrientationWithLock | undefined;
          if (orientation && typeof orientation.lock === 'function') {
            await orientation.lock('landscape');
          }
        } catch {
          // Unsupported in some desktop/iOS browsers
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.classList.add('overflow-hidden');
      document.body.classList.add('overflow-hidden');
    } else {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, [isFullscreen]);

  return {
    isFullscreen,
    showFullscreenPrompt,
    setShowFullscreenPrompt,
    enterFullscreen,
    exitFullscreen,
  };
}
