import React from 'react';
import { Play, X, ArrowRight, ShieldCheck } from 'lucide-react';
import type { PlanStep } from '../types';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskText: string;
  steps: PlanStep[];
  onConfirmRun: () => void;
}

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  taskText,
  steps,
  onConfirmRun,
}) => {
  if (!isOpen) return null;

  return (
    <div className="shield-dialog-overlay" onClick={onClose}>
      <div
        className="shield-dialog-card"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '36px', maxWidth: '640px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            <span className="shield-section-label">Automated Task Decomposition</span>
            <h3 style={{ fontSize: '24px', fontWeight: 500, margin: '4px 0 0' }}>
              Decomposed Execution <em>Plan.</em>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: 'none',
              color: 'var(--shield-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--shield-muted)', margin: '0 0 24px' }}>
          Supervisor matched your request against registered worker manifests:
        </p>

        {/* Dialog body containing li items for test expectation */}
        <div id="dialog-body" style={{ marginBottom: '32px' }}>
          <ol
            style={{
              padding: 0,
              margin: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {steps.map(([agentId, desc], i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 18px',
                  background: 'var(--shield-paper-warm)',
                  border: '1px solid var(--shield-line)',
                  borderRadius: '16px',
                  fontSize: '14px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--shield-ink)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontFamily: 'var(--shield-mono)',
                    fontWeight: 600,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: 'var(--shield-mono)',
                        fontWeight: 600,
                        color: 'var(--shield-terracotta)',
                        textTransform: 'uppercase',
                      }}
                    >
                      [{agentId}]
                    </span>
                  </div>
                  <div style={{ color: 'var(--shield-ink)' }}>{desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
          <button type="button" className="shield-pill" onClick={onClose}>
            <span>Cancel</span>
          </button>
          <button
            id="plan-run"
            type="button"
            className="shield-pill shield-pill-terracotta"
            onClick={() => {
              onConfirmRun();
              onClose();
            }}
          >
            <Play size={14} />
            <span>Execute Distributed Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
