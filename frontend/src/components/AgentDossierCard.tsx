import React from 'react';
import { ArrowRight, Terminal, Search, Database, Layers, Sparkles } from 'lucide-react';
import type { AgentManifest } from '../types';

interface AgentDossierCardProps {
  agent: AgentManifest;
  isWorking?: boolean;
  isSample?: boolean;
  onSelect?: (agentId: string) => void;
  onViewWorkflow?: (agentId: string) => void;
}

const AGENT_SYMBOLS: Record<string, string> = {
  'coding-agent': 'C',
  'research-agent': 'R',
  'data-agent': 'D',
  'ops-agent': 'O',
};

const AGENT_GRADIENTS: Record<string, string> = {
  'coding-agent': 'linear-gradient(135deg, #1b2620 0%, #293d33 50%, #151e19 100%)',
  'research-agent': 'linear-gradient(135deg, #24222a 0%, #3a3443 50%, #19171e 100%)',
  'data-agent': 'linear-gradient(135deg, #1a2729 0%, #2b4144 50%, #141f21 100%)',
  'ops-agent': 'linear-gradient(135deg, #29231f 0%, #46372d 50%, #1c1815 100%)',
};

export const AgentDossierCard: React.FC<AgentDossierCardProps> = ({
  agent,
  isWorking = false,
  isSample = false,
  onSelect,
  onViewWorkflow,
}) => {
  const symbol = agent.symbol || AGENT_SYMBOLS[agent.id] || 'A';
  const gradient = AGENT_GRADIENTS[agent.id] || AGENT_GRADIENTS['coding-agent'];

  return (
    <article
      className="agent-card shield-agent-card"
      data-agent={agent.id}
      onClick={() => onSelect?.(agent.id)}
      style={{ cursor: 'pointer' }}
    >
      {/* Visual Architectural Media Banner */}
      <div className="mc-workspace-media">
        <div
          className="mc-workspace-image"
          style={{
            background: gradient,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Architectural Grid pattern */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id={`grid-${agent.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#fbfaf7" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${agent.id})`} />
          </svg>

          {/* Dossier Monogram */}
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              border: '1px solid rgba(251, 250, 247, 0.25)',
              background: 'rgba(23, 34, 29, 0.45)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--shield-mono)',
              fontSize: '22px',
              fontWeight: 700,
              color: '#fbfaf7',
            }}
          >
            {symbol}
          </div>
        </div>
      </div>

      {/* Dossier Content Body */}
      <div className="shield-agent-body">
        <div className="shield-agent-top">
          <span className="agent-symbol">{symbol}</span>
          <span className="agent-state">
            <span
              className="dot"
              style={{
                background: isWorking ? '#c87350' : '#78866b',
                animation: isWorking ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            {isWorking ? 'Working' : isSample ? 'Sample' : 'Registered'}
          </span>
        </div>

        {/* Masked Title with Sliding Arrow Reveal on Card Hover */}
        <div className="mc-workspace-caption">
          <h3 className="shield-agent-title">
            <ArrowRight className="mc-workspace-title-arrow" aria-hidden="true" />
            <span className="mc-workspace-title-mask">{agent.name}</span>
          </h3>
        </div>

        <p className="agent-desc">{agent.desc || agent.capabilities.join(' · ')}</p>

        <div className="agent-foot">
          <span>{agent.capabilities.slice(0, 3).join(' / ')}</span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--shield-mono)',
              color: 'var(--shield-muted)',
            }}
          >
            v{agent.version} · {agent.timeout_secs}s
          </span>
        </div>
      </div>
    </article>
  );
};
