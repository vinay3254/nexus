import React, { useState, useEffect } from 'react';
import { Search, LayoutGrid, Users, Terminal, Database, Lock, Sliders, X } from 'lucide-react';
import type { Page } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'workspace', name: 'Workspace Command Hub', icon: <LayoutGrid size={16} /> },
    { id: 'agents', name: 'Agents Capability Store', icon: <Users size={16} /> },
    { id: 'executions', name: 'Executions & Sandbox Inspector', icon: <Terminal size={16} /> },
    { id: 'blackboard', name: 'Blackboard Shared Ledger', icon: <Database size={16} /> },
    { id: 'trust', name: 'Trust Vault & Cryptographic Receipts', icon: <Lock size={16} /> },
    { id: 'runtime', name: 'Runtime Settings & Providers', icon: <Sliders size={16} /> },
  ];

  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (pageId: string) => {
    onNavigate(pageId as Page);
    onClose();
  };

  return (
    <div className="shield-dialog-overlay" onClick={onClose}>
      <div
        className="shield-dialog-card"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '24px', maxWidth: '520px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Search size={18} style={{ color: 'var(--shield-muted)' }} />
          <input
            id="command-query"
            type="text"
            placeholder="Type a page name or command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                handleSelect(filtered[0].id);
              }
            }}
            autoFocus
            style={{
              width: '100%',
              border: 0,
              outline: 'none',
              background: 'transparent',
              fontSize: '16px',
              fontFamily: 'var(--shield-sans)',
              color: 'var(--shield-ink)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{ border: 0, background: 'none', color: 'var(--shield-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--shield-line)', paddingTop: '12px' }}>
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 0,
                background: 'transparent',
                color: 'var(--shield-ink)',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eef0e8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: 'var(--shield-terracotta)' }}>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ padding: '16px', textAlign: 'center', color: 'var(--shield-muted)', margin: 0 }}>
              No matching commands found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
