import React, { useEffect, useRef } from 'react';
import { Shield, Cpu, Lock, Network } from 'lucide-react';

interface ShieldHeroArtifactProps {
  paused?: boolean;
}

/**
 * Decoupled 3D Floating Hero Artifact
 * Inspired by MediCluster / Yuva Garden reference:
 * - Orbit trajectory rings
 * - Mouse spring follower coordinates (--artifact-x, --artifact-y, --artifact-tilt)
 * - 7s idle floating keyframes + blur shadow pulse
 * - Automatic pause on reduced-motion, motion toggle, and tab visibility
 */
export const ShieldHeroArtifact: React.FC<ShieldHeroArtifactProps> = ({ paused = false }) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let x = 0;
    let y = 0;
    let inView = true;

    const paint = () => {
      frame = 0;
      scene.style.setProperty('--artifact-x', `${x * 20}px`);
      scene.style.setProperty('--artifact-y', `${y * 14}px`);
      scene.style.setProperty('--artifact-tilt', `${x * 2.5}deg`);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const reset = () => {
      x = y = 0;
      schedule();
    };

    const move = (e: PointerEvent) => {
      if (paused || reduced.matches || e.pointerType === 'touch') return;
      const rect = scene.getBoundingClientRect();
      x = (e.clientX - rect.left) / rect.width - 0.5;
      y = (e.clientY - rect.top) / rect.height - 0.5;
      schedule();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    });
    observer.observe(scene);

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerleave', reset);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerleave', reset);
    };
  }, [paused]);

  return (
    <figure ref={sceneRef} className="shield-artifact-stage" aria-label="S.H.I.E.L.D Autonomous Orchestration Core">
      {/* Precision Astrolabe / Orbit Trajectory Rings */}
      <svg className="shield-artifact-orbit" viewBox="0 0 600 600" fill="none" aria-hidden="true">
        <circle cx="300" cy="300" r="240" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
        <circle cx="300" cy="300" r="270" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 14" opacity="0.6" />
        <circle cx="300" cy="300" r="180" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 8" opacity="0.4" />
      </svg>

      {/* Floating Blur Shadow */}
      <div className="shield-artifact-shadow" aria-hidden="true" />

      {/* Interactive Spring Follower */}
      <div className="shield-artifact-pointer">
        {/* Rhythmic Float Core */}
        <div className="shield-artifact-float">
          <div
            style={{
              position: 'relative',
              width: '280px',
              height: '280px',
              borderRadius: '40px',
              background: 'linear-gradient(145deg, #1f2d26 0%, #111a15 100%)',
              border: '1px solid rgba(228, 235, 220, 0.15)',
              boxShadow: '0 28px 60px -12px rgba(23, 34, 29, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              color: '#fbfaf7',
            }}
          >
            {/* Center Insignia */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '24px',
                background: 'rgba(200, 115, 80, 0.15)',
                border: '1px solid rgba(200, 115, 80, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c87350',
                marginBottom: '16px',
              }}
            >
              <Shield size={38} strokeWidth={1.8} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--shield-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#9da38f',
                  marginBottom: '4px',
                }}
              >
                Orchestration Engine
              </div>
              <div
                style={{
                  fontFamily: 'var(--shield-sans)',
                  fontSize: '19px',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}
              >
                Autonomous S.H.I.E.L.D
              </div>
            </div>

            {/* Satellite Status Badges */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '18px',
                fontSize: '11px',
                color: '#a5b099',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={12} /> Asyncio
              </span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> Bubblewrap
              </span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Network size={12} /> Ed25519
              </span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
};
