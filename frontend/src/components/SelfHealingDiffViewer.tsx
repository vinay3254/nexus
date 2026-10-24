import React, { useState } from 'react';
import { Lock, ShieldAlert, Cpu, Sparkles, Filter, Terminal, CheckCircle2 } from 'lucide-react';
import type { SandboxEvent, ActivityEvent, TaskRun } from '../types';

interface SelfHealingDiffViewerProps {
  sandboxEvents: SandboxEvent[];
  events: ActivityEvent[];
  runs: TaskRun[];
}

export const SelfHealingDiffViewer: React.FC<SelfHealingDiffViewerProps> = ({
  sandboxEvents,
  events,
  runs,
}) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredEvents = events.filter((e) => filter === 'all' || e.kind === filter);

  return (
    <div className="shield-container" style={{ paddingBlock: '40px' }}>
      <div style={{ marginBottom: '36px' }}>
        <span className="shield-section-label">Zero-Trust Linux Sandbox</span>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: '0 0 8px' }}>
          Bubblewrap Container & <em>Self-Healing Loop.</em>
        </h2>
        <p style={{ color: 'var(--shield-muted)', fontSize: '16px', maxWidth: '720px' }}>
          Untrusted agent code runs isolated in unprivileged namespaces (<code style={{ fontFamily: 'var(--shield-mono)' }}>bwrap</code>).
          Container crashes trigger automated AST inspection and repair loops.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        {/* Left Column: Sandbox Events & Diff Inspection */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Sandbox Interventions</h3>
            <span
              style={{
                fontFamily: 'var(--shield-mono)',
                fontSize: '12px',
                color: 'var(--shield-muted)',
              }}
            >
              {sandboxEvents.length} incidents
            </span>
          </div>

          <div id="sandbox-events" className="shield-records">
            {sandboxEvents.length > 0 ? (
              sandboxEvents.map((sb, i) => (
                <details key={i} className="record" open>
                  <summary>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldAlert size={18} style={{ color: 'var(--shield-terracotta, #c87350)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{sb.message}</span>
                    </div>
                  </summary>

                  {sb.stderr && (
                    <div style={{ marginTop: '14px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--shield-crimson, #a63a2a)', fontWeight: 600 }}>Container Stderr:</span>
                      <pre className="code-block" style={{ color: '#f2a89b', marginTop: '6px' }}>
                        {sb.stderr}
                      </pre>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: sb.healed_code ? '1fr 1fr' : '1fr',
                      gap: '16px',
                      marginTop: '16px',
                    }}
                  >
                    {sb.code && (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--shield-sage-deep, #78866b)', fontWeight: 600 }}>Failed Candidate:</span>
                        <pre className="code-block" style={{ marginTop: '6px' }}>{sb.code}</pre>
                      </div>
                    )}
                    {sb.healed_code && (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--shield-emerald, #2e5a44)', fontWeight: 600 }}>
                          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Self-Healed Repair:
                        </span>
                        <pre className="code-block" style={{ border: '1px solid var(--shield-sage-deep, #78866b)', marginTop: '6px' }}>
                          {sb.healed_code}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              ))
            ) : (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: '1px dashed var(--shield-line)',
                  borderRadius: '20px',
                  color: 'var(--shield-muted)',
                }}
              >
                <Lock size={28} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p>No container sandbox faults logged. All executing agents operating within integrity thresholds.</p>
              </div>
            )}
          </div>

          {/* Past Task Execution History */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 16px' }}>Task Execution History</h3>
            <div id="history" className="shield-records">
              {runs.map((r, i) => (
                <details key={i} className="record" open>
                  <summary>
                    <span>{r.task}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: 'var(--shield-mono)',
                        color: r.status === 'Running' ? 'var(--shield-terracotta, #c87350)' : 'var(--shield-emerald, #2e5a44)',
                      }}
                    >
                      {r.status}
                    </span>
                  </summary>
                  <p className="secondary">Time: {r.time} · Mode: {r.preview ? 'Simulation' : 'Live'}</p>
                  {r.plan && (
                    <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--shield-ink)' }}>
                      {r.plan.map(([agent, action], idx) => (
                        <li key={idx}>
                          <strong>[{agent}]</strong>: {action}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Telemetry Event Stream */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Telemetry Stream</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} style={{ color: 'var(--shield-muted)' }} />
              <select
                id="event-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '100px',
                  border: '1px solid var(--shield-line)',
                  background: 'var(--shield-surface)',
                  fontSize: '12px',
                  fontFamily: 'var(--shield-sans)',
                  color: 'var(--shield-ink)',
                }}
              >
                <option value="all">All Events</option>
                <option value="sandbox">Sandbox</option>
                <option value="activity">Activity</option>
                <option value="output">Output</option>
                <option value="receipt">Receipt</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          <div
            id="full-events"
            style={{
              background: 'var(--shield-surface)',
              border: '1px solid var(--shield-line)',
              borderRadius: '20px',
              overflow: 'hidden',
              maxHeight: '600px',
              overflowY: 'auto',
            }}
          >
            {filteredEvents.map((evt, i) => (
              <div key={i} className="event-row" data-kind={evt.kind}>
                <span className="dot" />
                <div style={{ flex: 1 }}>
                  <p className="event-title">{evt.message}</p>
                  <p className="event-kind">{evt.kind}</p>
                </div>
                <time className="event-time">{evt.time}</time>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
