import React, { useState } from 'react';
import { GitBranch, X, Wrench, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { workflowShape } from '../workflows';
import type { NodeKey, NodeStatus, WorkflowProgress } from '../types';

interface WorkflowDagProps {
  activeAgent: string;
  onSelectAgent: (agentId: string) => void;
  progress?: Record<string, WorkflowProgress>;
}

const AGENTS = [
  { id: 'coding-agent', name: 'Coding Agent', role: 'Python Sandbox & Healing' },
  { id: 'research-agent', name: 'Research Agent', role: 'Web & Context Synthesis' },
  { id: 'data-agent', name: 'Data Agent', role: 'CSV/SQL Analytics' },
  { id: 'ops-agent', name: 'Ops Agent', role: 'Container & Deployment' },
];

export const WorkflowDag: React.FC<WorkflowDagProps> = ({
  activeAgent,
  onSelectAgent,
  progress = {},
}) => {
  const [selectedNodeKey, setSelectedNodeKey] = useState<NodeKey | null>(null);

  const shape = workflowShape(activeAgent);
  const agentProgress = progress[activeAgent] || {};
  const selectedNode = shape.nodes.find((n) => n.key === selectedNodeKey);

  const getNodeStatus = (key: NodeKey): NodeStatus => {
    return agentProgress[key] || 'pending';
  };

  const statusThemes: Record<NodeStatus, { bg: string; border: string; text: string; dot: string }> = {
    pending: { bg: 'var(--shield-paper, #fbfaf7)', border: 'var(--shield-line, #d7dacf)', text: 'var(--shield-muted, #62675e)', dot: '#9da38f' },
    routed: { bg: 'var(--shield-paper-warm, #f7f5f0)', border: 'var(--shield-sage-deep, #78866b)', text: 'var(--shield-ink, #17221d)', dot: 'var(--shield-sage-deep, #78866b)' },
    sandbox: { bg: '#fdf7f2', border: '#e8b8a2', text: 'var(--shield-terracotta, #c87350)', dot: 'var(--shield-terracotta, #c87350)' },
    healed: { bg: '#f2f6ee', border: 'var(--shield-sage-deep, #78866b)', text: 'var(--shield-dark-slate, #2d4a3b)', dot: '#3d694e' },
    completed: { bg: 'var(--shield-ink, #17221d)', border: 'var(--shield-ink, #17221d)', text: 'var(--shield-paper, #fbfaf7)', dot: 'var(--shield-terracotta, #c87350)' },
    error: { bg: '#fdf3f0', border: 'var(--shield-crimson, #a63a2a)', text: 'var(--shield-crimson, #a63a2a)', dot: 'var(--shield-crimson, #a63a2a)' },
  };

  return (
    <div
      style={{
        background: 'var(--shield-surface)',
        border: '1px solid var(--shield-line)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 12px 32px -8px rgba(23, 34, 29, 0.05)',
        marginBlock: '28px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #f0f2eb',
          paddingBottom: '16px',
        }}
      >
        <div>
          <span className="shield-section-label">Directed Acyclic Graph</span>
          <h3 style={{ fontSize: '20px', fontWeight: 500, margin: 0 }}>
            Specialist Internal <em>Routing Flow.</em>
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--shield-muted)', margin: '4px 0 0' }}>
            Select a worker to inspect internal execution checkpoints and isolation gates.
          </p>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            fontFamily: 'var(--shield-mono)',
            color: 'var(--shield-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9da38f' }} />
            Pending
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#78866b' }} />
            Routed
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--shield-terracotta, #c87350)' }} />
            Sandbox
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--shield-ink, #17221d)' }} />
            Completed
          </span>
        </div>
      </div>

      {/* Agent Selector Capsule Bar */}
      <div
        id="workflow-tabs"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBlock: '20px 24px',
          padding: '6px',
          background: 'var(--shield-paper-warm)',
          borderRadius: '100px',
          border: '1px solid var(--shield-line)',
        }}
      >
        {AGENTS.map((ag) => {
          const isActive = activeAgent === ag.id;
          return (
            <button
              key={ag.id}
              type="button"
              data-workflow-agent={ag.id}
              onClick={() => {
                onSelectAgent(ag.id);
                setSelectedNodeKey(null);
              }}
              style={{
                flex: '1 1 180px',
                padding: '8px 18px',
                borderRadius: '100px',
                border: isActive ? '1px solid var(--shield-ink)' : '1px solid transparent',
                background: isActive ? 'var(--shield-ink)' : 'transparent',
                color: isActive ? 'var(--shield-paper)' : 'var(--shield-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400 }}>{ag.name}</span>
                {isActive && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--shield-terracotta)',
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--shield-mono)',
                  opacity: 0.8,
                  marginTop: '1px',
                }}
              >
                {ag.role}
              </div>
            </button>
          );
        })}
      </div>

      {/* DAG Flow Canvas */}
      <div
        style={{
          background: 'var(--shield-paper)',
          border: '1px solid var(--shield-line)',
          borderRadius: '18px',
          padding: '16px',
          overflowX: 'auto',
          minHeight: '280px',
        }}
      >
        <svg viewBox="0 0 1180 280" style={{ minWidth: '940px', height: '260px', overflow: 'visible' }}>
          {/* Connector Curved Edges */}
          {shape.edges.map(([fromKey, toKey], idx) => {
            const fromNode = shape.nodes.find((n) => n.key === fromKey);
            const toNode = shape.nodes.find((n) => n.key === toKey);
            if (!fromNode || !toNode) return null;

            const startX = fromNode.x + 130;
            const startY = fromNode.y + 24;
            const endX = toNode.x;
            const endY = toNode.y + 24;
            const midX = (startX + endX) / 2;

            const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            const isCompleted = getNodeStatus(toKey) === 'completed';

            return (
              <g key={idx}>
                <path
                  d={d}
                  fill="none"
                  stroke={isCompleted ? 'var(--shield-terracotta)' : '#d7dacf'}
                  strokeWidth="2"
                  opacity={isCompleted ? 1 : 0.6}
                />
              </g>
            );
          })}

          {/* Interactive DAG Nodes */}
          {shape.nodes.map((node) => {
            const status = getNodeStatus(node.key);
            const theme = statusThemes[status];
            const isSelected = selectedNodeKey === node.key;

            return (
              <g
                key={node.key}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNodeKey(node.key)}
                style={{ cursor: 'pointer' }}
              >
                {isSelected && (
                  <rect
                    x="-4"
                    y="-4"
                    width="138"
                    height="56"
                    rx="18"
                    fill="none"
                    stroke="var(--shield-terracotta)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                )}

                <foreignObject width="130" height="48">
                  <button
                    type="button"
                    data-workflow-node={node.key}
                    data-status={status}
                    className="workflow-node"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '14px',
                      padding: '8px 12px',
                      background: theme.bg,
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      textAlign: 'left',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 16px rgba(200, 115, 80, 0.2)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {node.title}
                      </span>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: theme.dot,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--shield-mono)',
                        textTransform: 'capitalize',
                        opacity: 0.8,
                        marginTop: '2px',
                      }}
                    >
                      {status}
                    </div>
                  </button>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div
          id="workflow-inspector"
          style={{
            marginTop: '20px',
            padding: '20px 24px',
            borderRadius: '16px',
            background: 'var(--shield-paper-warm)',
            border: '1px solid var(--shield-line)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--shield-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: 'var(--shield-terracotta)',
                  fontWeight: 600,
                }}
              >
                [{activeAgent}]
              </span>
              <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                {selectedNode.title} ({selectedNode.key})
              </h4>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--shield-muted)', margin: 0, lineHeight: 1.5 }}>
              {selectedNode.description ||
                'Pipeline checkpoint ensuring deterministic execution bounds, container sandbox verification, and receipt logging.'}
            </p>
          </div>

          <button
            id="workflow-inspector-close"
            type="button"
            className="shield-text-link"
            onClick={() => setSelectedNodeKey(null)}
          >
            <span>Close</span>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
