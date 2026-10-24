import React from 'react';
import { Check } from 'lucide-react';

interface PipelineRibbonProps {
  currentStage?: number;
  status: string;
  title: string;
}

const STAGES = [
  { title: 'Decompose & route', detail: 'Capability match' },
  { title: 'Run specialists', detail: 'Shared context' },
  { title: 'Sandbox & repair', detail: 'Code outputs only' },
  { title: 'Sign receipt', detail: 'Ed25519 / SHA-256' },
];

export const PipelineRibbon: React.FC<PipelineRibbonProps> = ({
  currentStage = 0,
  status,
  title,
}) => {
  const isCompleted = status.toLowerCase().includes('completed');
  const activeStageIndex = isCompleted ? 4 : currentStage;

  return (
    <div style={{ marginBlock: '28px 36px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span className="shield-section-label">Execution Pipeline</span>
          <h2
            id="execution-title"
            style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}
          >
            {title}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--shield-muted)' }}>Status:</span>
          <span
            id="execution-status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '100px',
              background: isCompleted ? 'var(--shield-sage, #e4ebdc)' : 'rgba(200, 115, 80, 0.12)',
              color: isCompleted ? 'var(--shield-ink, #17221d)' : 'var(--shield-terracotta, #c87350)',
              border: `1px solid ${isCompleted ? '#b8c7ae' : 'var(--shield-terracotta, #c87350)'}`,
              fontFamily: 'var(--shield-mono)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {status}
          </span>
        </div>
      </div>

      <ul id="pipeline" className="shield-pipeline-ribbon">
        {STAGES.map((s, i) => {
          const isDone = i < activeStageIndex;
          const isActive = i === activeStageIndex && !isCompleted;

          return (
            <li
              key={s.title}
              className={`shield-pipeline-step ${isDone ? 'done' : ''}`}
              style={{
                borderLeft: isActive ? '3px solid var(--shield-terracotta)' : undefined,
              }}
            >
              <span className={`step-dot ${isDone ? 'done' : ''}`}>
                {isDone ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </span>
              <div className="step-info">
                <span className="step-title">{s.title}</span>
                <span className="step-detail">{s.detail}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
