import React from 'react';
import {
  Shield,
  Play,
  Pause,
  Menu,
  X,
  Command,
  LayoutGrid,
  Users,
  Terminal,
  Database,
  Lock,
  Sliders,
} from 'lucide-react';
import { HexagonShieldMark } from './HexagonShieldMark';
import type { Page } from '../types';

interface ShieldHeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  connected: boolean;
  mode: 'live' | 'preview';
  motionPaused: boolean;
  onToggleMotion: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onOpenCommand: () => void;
}

export const ShieldHeader: React.FC<ShieldHeaderProps> = ({
  currentPage,
  onNavigate,
  connected,
  mode,
  motionPaused,
  onToggleMotion,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onOpenCommand,
}) => {
  const pages: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'workspace', label: 'Workspace', icon: <LayoutGrid size={15} /> },
    { id: 'agents', label: 'Agents', icon: <Users size={15} /> },
    { id: 'executions', label: 'Executions', icon: <Terminal size={15} /> },
    { id: 'blackboard', label: 'Blackboard', icon: <Database size={15} /> },
    { id: 'trust', label: 'Trust Vault', icon: <Lock size={15} /> },
    { id: 'runtime', label: 'Runtime', icon: <Sliders size={15} /> },
  ];

  return (
    <header className="shield-header download-header" role="banner">
      <div className="shield-header-inner download-header-inner shield-container">
        {/* Brand Lockup */}
        <a
          className="shield-brand download-brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('workspace');
          }}
          aria-label="S.H.I.E.L.D Home"
        >
          <div className="shield-brand-badge" style={{ padding: '2px' }}>
            <HexagonShieldMark size={24} animated={false} />
          </div>
          <span>
            S.H.I.E.L.D
            <small>Nexus Core</small>
          </span>
        </a>

        {/* Single Navigation Element: Switches to dropdown on mobile */}
        <nav
          className={`shield-nav download-nav ${isMobileMenuOpen ? 'open' : ''}`}
          aria-label="Primary Navigation"
        >
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`nav-link ${currentPage === p.id ? 'active' : ''}`}
              data-page={p.id}
              onClick={() => {
                onNavigate(p.id);
                if (isMobileMenuOpen) onToggleMobileMenu();
              }}
              aria-selected={currentPage === p.id}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </nav>

        {/* Action Controls & Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection Status Pill */}
          <div
            id="connection-text"
            className={`shield-connection-pill ${!connected && mode !== 'preview' ? 'disconnected' : ''}`}
          >
            <span className="dot" aria-hidden="true" />
            <span>{mode === 'preview' ? 'Preview mode' : connected ? 'Connected' : 'Reconnecting'}</span>
          </div>

          {/* Command Palette Trigger */}
          <button
            type="button"
            className="shield-pill"
            style={{ minHeight: '38px', padding: '6px 14px', fontSize: '13px' }}
            onClick={onOpenCommand}
            aria-label="Open Command Palette"
          >
            <Command size={13} aria-hidden="true" />
            <kbd className="shield-kbd">Ctrl+K</kbd>
          </button>

          {/* Motion Pause Toggle */}
          <button
            type="button"
            className="download-motion-toggle shield-motion-toggle"
            onClick={onToggleMotion}
            aria-pressed={motionPaused}
            aria-label={motionPaused ? 'Resume animations' : 'Pause animations'}
          >
            {motionPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
            <span>{motionPaused ? 'Motion paused' : 'Pause motion'}</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            id="menu"
            type="button"
            className="shield-pill"
            style={{ display: 'none', padding: '8px 12px', minHeight: '38px' }}
            onClick={onToggleMobileMenu}
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
