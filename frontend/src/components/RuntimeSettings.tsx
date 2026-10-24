import React, { useState } from 'react';
import { Sliders, Cpu, Copy, Check, Terminal, Radio } from 'lucide-react';

interface RuntimeSettingsProps {
  mode: 'live' | 'preview';
  onTogglePreview: () => void;
}

export const RuntimeSettings: React.FC<RuntimeSettingsProps> = ({
  mode,
  onTogglePreview,
}) => {
  const [provider, setProvider] = useState<string>('auto');
  const [copied, setCopied] = useState(false);

  const command = `uv run nexus serve --port 8000 --provider ${provider} --persist blackboard.db`;

  const copyCommand = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="shield-container" style={{ paddingBlock: '40px' }}>
      <div style={{ marginBottom: '36px' }}>
        <span className="shield-section-label">Daemon & Orchestration Engine</span>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: '0 0 8px' }}>
          Runtime Architecture & <em>LLM Providers.</em>
        </h2>
        <p style={{ color: 'var(--shield-muted)', fontSize: '16px', maxWidth: '720px' }}>
          Configure live LLM backend auto-discovery, sandbox execution policies, and local offline deterministic preview simulation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
        {/* Provider Switcher Card */}
        <div
          style={{
            background: 'var(--shield-surface)',
            border: '1px solid var(--shield-line)',
            borderRadius: '24px',
            padding: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--shield-paper-warm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--shield-terracotta)',
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Model Provider Driver</h3>
              <p style={{ fontSize: '13px', color: 'var(--shield-muted)', margin: 0 }}>
                Auto-detection across Anthropic, Ollama, OpenAI, or Mock LLM
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="provider"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}
            >
              Active Driver Engine:
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '100px',
                border: '1px solid var(--shield-line)',
                background: 'var(--shield-paper)',
                fontFamily: 'var(--shield-sans)',
                fontSize: '14px',
                color: 'var(--shield-ink)',
                outline: 'none',
              }}
            >
              <option value="auto">Auto-discover best available API key</option>
              <option value="claude">Anthropic Claude (CLAUDE_API_KEY)</option>
              <option value="ollama">Local Ollama Daemon (localhost:11434)</option>
              <option value="openai">OpenAI GPT-4o (OPENAI_API_KEY)</option>
              <option value="mock">Offline Mock LLM (Deterministic testing)</option>
            </select>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--shield-muted)', textTransform: 'uppercase' }}>
              Daemon Launch Command:
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--shield-ink)',
                borderRadius: '12px',
                marginTop: '6px',
              }}
            >
              <code
                id="provider-command"
                style={{
                  fontFamily: 'var(--shield-mono)',
                  fontSize: '12px',
                  color: '#e2ecd9',
                  wordBreak: 'break-all',
                }}
              >
                {command}
              </code>
              <button
                type="button"
                onClick={copyCommand}
                style={{
                  background: 'none',
                  border: 0,
                  color: '#fbfaf7',
                  cursor: 'pointer',
                  marginLeft: '12px',
                }}
                aria-label="Copy Command"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Offline Preview Simulation Card */}
        <div
          style={{
            background: 'var(--shield-surface)',
            border: '1px solid var(--shield-line)',
            borderRadius: '24px',
            padding: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--shield-paper-warm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--shield-sage-deep)',
              }}
            >
              <Radio size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Execution Environment</h3>
              <p style={{ fontSize: '13px', color: 'var(--shield-muted)', margin: 0 }}>
                Toggle between live daemon WebSocket and offline sandbox simulator
              </p>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--shield-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            Preview mode generates synthetic capability matches, Bubblewrap sandbox repairs, and Ed25519 receipts locally in the browser without requiring a live Python daemon or network connectivity.
          </p>

          <button
            id="preview-mode"
            type="button"
            className={`shield-pill ${mode === 'preview' ? 'shield-pill-terracotta' : 'shield-pill-dark'}`}
            onClick={onTogglePreview}
          >
            <span>{mode === 'preview' ? 'Switch to Live Daemon Connection' : 'Enable Offline Preview Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
