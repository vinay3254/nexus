import React, { useEffect, useRef, useState } from 'react';
import { HexagonShieldMark } from './HexagonShieldMark';

// Exact MediCluster + User SVG Path Formation Sequence:
// 0.0s – 1.35s : Vector outline draws the exact hexagonal ribbon contour (shield-draw)
// 1.28s – 1.98s: Metallic gradient silhouette illuminates (shield-fillIn)
// 1.8s – 2.65s : 3D photorealistic metallic ribbon materializes (shield-revealLogo)
// 2.4s         : Mark scales down (1.5 ➔ 1.0) and slides left as wordmark column opens (0fr ➔ 1fr)
// 2.85s        : Letters of "Agent S.H.I.E.L.D" pop in with bouncy spring (mc-pop)
// 3.45s        : Monospace uppercase tagline rises into place (mc-rise)
// hold 900ms   : Smooth 500ms opacity fade out into workspace.
const WORD = 'Agent S.H.I.E.L.D';
const HOLD_MS = 900;
const FALLBACK_MS = 5800;
const FADE_MS = 500;

interface ShieldSplashScreenProps {
  onDone?: () => void;
  tagline?: string;
  motionPaused?: boolean;
}

export const ShieldSplashScreen: React.FC<ShieldSplashScreenProps> = ({
  onDone,
  tagline = 'Autonomous runtime & verifiable trust at scale',
  motionPaused = false,
}) => {
  // If in automated E2E testing (Playwright), dismiss instantly so tests are never delayed
  const isE2E = typeof window !== 'undefined' && (
    Boolean((window as unknown as { __E2E__?: boolean }).__E2E__) ||
    Boolean(window.navigator?.webdriver) ||
    window.location.search.includes('skip_intro=1')
  );

  const reduced = motionPaused || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [landed, setLanded] = useState(reduced || isE2E);
  const [leaving, setLeaving] = useState(isE2E);
  const [isFinished, setIsFinished] = useState(isE2E);
  const skipButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isE2E) {
      onDone?.();
      return;
    }
    const previousFocus = document.activeElement;
    skipButton.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isE2E, onDone]);

  useEffect(() => {
    if (isE2E) return;
    const timer = setTimeout(() => setLeaving(true), landed ? HOLD_MS : FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [landed, isE2E]);

  useEffect(() => {
    if (!leaving || isE2E) return;
    const timer = setTimeout(() => {
      setIsFinished(true);
      onDone?.();
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDone, isE2E]);

  useEffect(() => {
    if (isE2E) return;
    const skip = (e: KeyboardEvent) => {
      if (['Escape', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        setLeaving(true);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        skipButton.current?.focus();
      }
    };
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [isE2E]);

  if (isFinished) return null;

  return (
    <div
      id="shield-splash-screen"
      className="mc-splash"
      data-leaving={leaving}
      data-reduced={reduced}
      onClick={() => setLeaving(true)}
      role="dialog"
      aria-modal="true"
      aria-label="Starting Agent S.H.I.E.L.D"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#17221d',
        color: '#fbfaf7',
        transition: 'opacity 500ms ease',
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div className="mc-splash-lockup" role="img" aria-label="Agent S.H.I.E.L.D">
        {/* Animated 3D Hexagonal S Ribbon */}
        <div className="mc-splash-mark">
          <HexagonShieldMark size={120} animated={!reduced} />
        </div>

        {/* Sliding wordmark column (opens from 0fr to 1fr at 2.4s) */}
        <div className="mc-splash-word" aria-hidden="true">
          <div>
            <span className="mc-splash-letters">
              {[...WORD].map((ch, i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${2850 + i * 40}ms` }}
                >
                  {ch === ' ' ? '\u00A0' : ch}
                </span>
              ))}
            </span>
            <span
              className="mc-splash-tagline"
              onAnimationEnd={() => setLanded(true)}
            >
              {tagline}
            </span>
          </div>
        </div>
      </div>

      <button
        ref={skipButton}
        type="button"
        className="mc-splash-skip"
        aria-label="Skip intro"
        onClick={(e) => {
          e.stopPropagation();
          setLeaving(true);
        }}
      >
        Tap or press Esc to skip
      </button>

      {/* Scoped Motion Rules & Keyframes */}
      <style>{`
        .mc-splash-lockup {
          display: flex;
          align-items: center;
          max-width: calc(100vw - 40px);
        }

        .mc-splash-mark {
          width: auto;
          height: clamp(86px, 14vh, 130px);
          aspect-ratio: 464 / 635;
          overflow: visible;
          flex: none;
          scale: 1.45;
          display: flex;
          align-items: center;
          justifyContent: center;
          animation: mc-settle 650ms cubic-bezier(.65, 0, .35, 1) 2400ms both;
        }

        @keyframes mc-settle {
          to { scale: 1; }
        }

        .mc-splash-word {
          display: grid;
          grid-template-columns: 0fr;
          min-width: 0;
          animation: mc-open 650ms cubic-bezier(.65, 0, .35, 1) 2400ms both;
        }

        .mc-splash-word > div {
          overflow: hidden;
          min-width: 0;
          padding-left: clamp(16px, 2.8vw, 32px);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        @keyframes mc-open {
          to { grid-template-columns: 1fr; }
        }

        .mc-splash-letters {
          display: flex;
          white-space: nowrap;
          font-family: 'Bodoni Moda', 'Newsreader', Georgia, serif;
          font-weight: 400;
          font-size: clamp(38px, 7vw, 76px);
          line-height: 1;
          letter-spacing: -0.025em;
          color: #fbfaf7;
        }

        .mc-splash-letters > span {
          display: inline-block;
          animation: mc-pop 480ms cubic-bezier(.34, 1.4, .64, 1) both;
        }

        @keyframes mc-pop {
          from {
            opacity: 0;
            transform: translateY(14px) scale(.3);
          }
          40% {
            opacity: 1;
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        .mc-splash-tagline {
          font-family: 'Geist Mono', 'IBM Plex Mono', monospace;
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9da38f;
          line-height: 1.6;
          animation: mc-rise 450ms ease 3450ms both;
        }

        @keyframes mc-rise {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        .mc-splash-skip {
          position: absolute;
          left: 50%;
          bottom: clamp(14px, 3.5vh, 36px);
          transform: translateX(-50%);
          font-family: 'Hanken Grotesk', 'IBM Plex Sans', system-ui, sans-serif;
          font-size: 12px;
          color: #fbfaf7;
          opacity: 0;
          white-space: nowrap;
          border: 0;
          background: transparent;
          min-height: 44px;
          padding: 8px 12px;
          cursor: pointer;
          animation: mc-skip 400ms ease 600ms both;
        }

        .mc-splash-skip:focus-visible {
          outline: 2px solid #fbfaf7;
          outline-offset: 2px;
        }

        @keyframes mc-skip {
          to { opacity: .45; }
        }

        /* Reduced motion support */
        .mc-splash[data-reduced="true"] :is(.mc-splash-mark, .mc-splash-word, .mc-splash-letters > span, .mc-splash-tagline, .mc-splash-skip) {
          animation: none;
        }
        .mc-splash[data-reduced="true"] .mc-splash-mark { scale: 1; }
        .mc-splash[data-reduced="true"] .mc-splash-word { grid-template-columns: 1fr; }
        .mc-splash[data-reduced="true"] .mc-splash-skip { opacity: .45; }
        .mc-splash[data-reduced="true"] { transition: none; }
      `}</style>
    </div>
  );
};
