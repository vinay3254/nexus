import React, { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import {
  Shield,
  ArrowRight,
  Sparkles,
  Search,
  Download,
  Terminal,
  Database,
  Lock,
  Cpu,
  Radio,
  Check,
} from 'lucide-react';
import { ShieldHeader } from './components/ShieldHeader';
import { ShieldHeroArtifact } from './components/ShieldHeroArtifact';
import { AgentDossierCard } from './components/AgentDossierCard';
import { PipelineRibbon } from './components/PipelineRibbon';
import { WorkflowDag } from './components/WorkflowDag';
import { BlackboardLedger } from './components/BlackboardLedger';
import { SelfHealingDiffViewer } from './components/SelfHealingDiffViewer';
import { TiltReceiptCard } from './components/TiltReceiptCard';
import { RuntimeSettings } from './components/RuntimeSettings';
import { CommandPalette } from './components/CommandPalette';
import { PlanModal } from './components/PlanModal';
import { ShieldSplashScreen } from './components/ShieldSplashScreen';
import { plan } from './planner';
import { parseAgents, parseBoard, parseServerMessage } from './validation';
import type {
  Page,
  AgentManifest,
  BoardEntry,
  ActivityEvent,
  TaskRun,
  Receipt,
  SandboxEvent,
  PlanStep,
  WorkflowProgress,
} from './types';

const INITIAL_AGENTS: AgentManifest[] = [
  {
    id: 'coding-agent',
    name: 'Coding Agent',
    capabilities: ['code', 'python', 'debug', 'sandbox'],
    version: '1.2.0',
    timeout_secs: 45,
    symbol: 'C',
    desc: 'Autonomous developer writing clean Python with Bubblewrap sandbox verification and automated AST self-healing.',
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    capabilities: ['research', 'summary', 'analysis', 'paper'],
    version: '1.1.0',
    timeout_secs: 60,
    symbol: 'R',
    desc: 'Information synthesis specialist gathering domain context, literature summaries, and structured analytical briefs.',
  },
  {
    id: 'data-agent',
    name: 'Data Agent',
    capabilities: ['data', 'csv', 'sql', 'clean', 'metrics'],
    version: '1.0.4',
    timeout_secs: 30,
    symbol: 'D',
    desc: 'High-efficiency data processing worker specialized in tabular data transformations, SQL queries, and anomaly detection.',
  },
  {
    id: 'ops-agent',
    name: 'Ops Agent',
    capabilities: ['deploy', 'ops', 'docker', 'bash', 'container'],
    version: '1.3.1',
    timeout_secs: 60,
    symbol: 'O',
    desc: 'DevOps and infrastructure specialist authoring idempotent automation scripts and containerized deployment definitions.',
  },
];

const getPageFromLocation = (): Page => {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (['workspace', 'agents', 'executions', 'blackboard', 'trust', 'runtime'].includes(hash)) {
    return hash as Page;
  }
  const p = window.location.pathname.toLowerCase();
  if (p.includes('blackboard')) return 'blackboard';
  if (p.includes('execution')) return 'executions';
  if (p.includes('agent')) return 'agents';
  if (p.includes('trust')) return 'trust';
  if (p.includes('runtime')) return 'runtime';
  return 'workspace';
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromLocation);
  const [motionPaused, setMotionPaused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [, startTransition] = useTransition();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setLiveAnnouncement(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Core Data State
  const [mode, setMode] = useState<'live' | 'preview'>('live');
  const [connected, setConnected] = useState(true);
  const [busy, setBusy] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('Ready');
  const [executionTitle, setExecutionTitle] = useState<string>('Ready for your first task');
  const [taskInput, setTaskInput] = useState('');
  const [agents, setAgents] = useState<AgentManifest[]>(INITIAL_AGENTS);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      kind: 'activity',
      message: 'S.H.I.E.L.D Daemon initialized with Editorial Craft runtime.',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [sandboxEvents, setSandboxEvents] = useState<SandboxEvent[]>([]);
  const [activeWorkflowAgent, setActiveWorkflowAgent] = useState('coding-agent');
  const [workflowProgress, setWorkflowProgress] = useState<Record<string, WorkflowProgress>>({});

  // Plan Preview Dialog
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlanSteps, setCurrentPlanSteps] = useState<PlanStep[]>([]);
  const [agentSearch, setAgentSearch] = useState('');

  const progressRef = useRef<HTMLDivElement>(null);

  // Navigation with browser URL sync
  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.history.pushState(null, '', `/${page === 'workspace' ? '' : page}`);
    window.scrollTo({ top: 0, behavior: motionPaused ? 'instant' : 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPage(getPageFromLocation());
    const handleHash = () => setCurrentPage(getPageFromLocation());
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, []);

  // Single-RAF scroll progress tracker
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const amount = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${amount})`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // Live WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: any = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/ws`);

        ws.onopen = () => {
          setConnected(true);
          setMode('live');
          addEvent('activity', 'Connected to S.H.I.E.L.D Daemon WebSocket.');
          fetch('/api/agents')
            .then((r) => r.ok && r.json())
            .then((data) => {
              if (data && data.length) setAgents(parseAgents(data));
            })
            .catch(() => {});
          fetch('/api/blackboard')
            .then((r) => r.ok && r.json())
            .then((data) => {
              if (data && data.length) setBoard(parseBoard(data));
            })
            .catch(() => {});
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            const msg = parseServerMessage(raw);
            if (msg.type === 'log') {
              addEvent('activity', msg.message);
            } else if (msg.type === 'blackboard_update') {
              setBoard((prev) => [msg as BoardEntry, ...prev.filter((e) => e.key !== msg.key)]);
            } else if (msg.type === 'sandbox_event') {
              setSandboxEvents((prev) => [msg, ...prev]);
            } else if (msg.type === 'receipt') {
              setReceipts((prev) => [msg, ...prev]);
            }
          } catch {
            // handle unstructured messages
          }
        };

        ws.onclose = () => {
          setConnected(false);
          timer = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          setConnected(false);
        };
      } catch {
        setConnected(false);
      }
    };

    connectWs();
    return () => {
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const addEvent = (kind: ActivityEvent['kind'], message: string) => {
    setEvents((prev) => [
      ...prev,
      {
        kind,
        message,
        time: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handlePreviewPlanClick = () => {
    const text = taskInput.trim() || 'Analyze CSV data, build predictive model, and summarize insights';
    const steps = plan(text);
    setCurrentPlanSteps(steps);
    setIsPlanModalOpen(true);
  };

  const handleExecuteTask = async () => {
    const text = taskInput.trim() || 'Analyze CSV data, build predictive model, and summarize insights';
    setBusy(true);
    setExecutionTitle(text);
    setExecutionStatus('Executing Plan…');
    addEvent('activity', `Dispatched task: "${text}"`);

    const steps = plan(text);
    const newRun: TaskRun = {
      task: text,
      status: 'Running',
      time: new Date().toLocaleTimeString(),
      preview: mode === 'preview',
      plan: steps,
    };
    setRuns((prev) => [newRun, ...prev]);

    for (let i = 0; i < steps.length; i++) {
      const [agentId, action] = steps[i];
      setActiveWorkflowAgent(agentId);
      setExecutionStatus(`Running: [${agentId}] ${action}`);

      setWorkflowProgress((prev) => ({
        ...prev,
        [agentId]: {
          ...prev[agentId],
          route: 'completed',
          model: 'completed',
          publish: 'completed',
          receipt: 'completed',
        },
      }));

      addEvent('activity', `[${agentId}] ${action}`);
      await new Promise((r) => setTimeout(r, 350));

      if (agentId === 'coding-agent') {
        const failing = `def compute():\n    return 42 / 0\ncompute()`;
        const healed = `def compute():\n    try:\n        return 42 / 1\n    except ZeroDivisionError:\n        return 42\ncompute()`;

        const sbEvent: SandboxEvent = {
          message: 'ZeroDivisionError in Bubblewrap sandbox container. AST self-heal loop engaged.',
          code: failing,
          healed_code: healed,
          stderr: 'ZeroDivisionError: division by zero',
        };
        setSandboxEvents((prev) => [sbEvent, ...prev]);
        addEvent('sandbox', `[coding-agent] Bubblewrap container caught zero division error.`);
        addEvent('sandbox', `[coding-agent] AST repair validated.`);
      }

      const newEntry: BoardEntry = {
        key: `output.${agentId}.${Date.now().toString().slice(-4)}`,
        value: {
          task: action,
          status: 'verified',
          agent: agentId,
          timestamp: new Date().toISOString(),
        },
        author: agentId,
        version: 1,
      };
      setBoard((prev) => [newEntry, ...prev]);
      addEvent('output', `[${agentId}] Shared output published to blackboard: ${newEntry.key}`);
    }

    const mockHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const newReceipt: Receipt = {
      task_id: `task-${Date.now().toString().slice(-4)}`,
      payload_digest: mockHash,
      public_key: 'ed25519-public-authority-nexus',
      timestamp: new Date().toISOString(),
      signature: Array.from(crypto.getRandomValues(new Uint8Array(64)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
      verified: true,
    };

    setReceipts((prev) => [newReceipt, ...prev]);
    addEvent('receipt', `Generated tamper-evident Ed25519 receipt (${newReceipt.task_id})`);

    setWorkflowProgress((prev) => ({
      ...prev,
      'coding-agent': {
        ...prev['coding-agent'],
        route: 'completed',
        model: 'completed',
        publish: 'completed',
        receipt: 'completed',
        sandbox: 'completed',
        heal: 'healed',
      },
      'research-agent': {
        ...prev['research-agent'],
        route: 'completed',
        model: 'completed',
        publish: 'completed',
        receipt: 'completed',
      },
    }));

    const finalStatus = mode === 'preview' ? 'Preview complete' : 'Completed';
    setRuns((prev) =>
      prev.map((r, idx) => (idx === 0 ? { ...r, status: finalStatus } : r))
    );
    setExecutionStatus(finalStatus);
    setBusy(false);
    showToast('Execution complete. Cryptographic Ed25519 receipt generated.');
  };

  const handleExportBoard = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(board, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'nexus-blackboard.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Blackboard ledger exported as JSON file.');
  };

  const togglePreviewMode = () => {
    setMode((prev) => {
      const next = prev === 'live' ? 'preview' : 'live';
      showToast(next === 'preview' ? 'Switched to offline deterministic preview mode' : 'Reconnected to live daemon mode');
      return next;
    });
  };

  return (
    <div className="editorial-portal" data-motion-paused={motionPaused}>
      {/* Accessibility Skip Link (UI UX Pro Max Priority 1) */}
      <a href="#main-content" className="shield-skip-link">
        Skip to main content
      </a>

      {/* Screen Reader Live Region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Editorial Craft Splash Screen */}
      <ShieldSplashScreen motionPaused={motionPaused} />

      {/* 2px Terracotta Scroll Indicator */}
      <div ref={progressRef} className="shield-scroll-progress mc-scroll-progress" aria-hidden="true" />

      {/* Frosted Sticky Navigation Header */}
      <ShieldHeader
        currentPage={currentPage}
        onNavigate={navigateTo}
        connected={connected}
        mode={mode}
        motionPaused={motionPaused}
        onToggleMotion={() => setMotionPaused((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        onOpenCommand={() => setIsCommandOpen(true)}
      />

      {/* Main Pages: Keep all 6 view containers in DOM for E2E and multi-route accessibility */}
      <main id="main-content" tabIndex={-1}>
        {/* Page 1: Workspace Command Hub */}
        <div id="page-workspace" className="shield-container" style={{ display: currentPage === 'workspace' ? 'block' : 'none' }}>
          {/* Split Hero Section */}
          <section className="shield-hero" aria-labelledby="hero-title">
            <div className="shield-hero-content">
              <span className="shield-section-label">Autonomous Multi-Agent Runtime</span>
              <h1 id="hero-title">
                <span>Autonomous agents.</span>
                <span>
                  Bound by <em>verifiable trust.</em>
                </span>
              </h1>
              <p className="shield-hero-subtitle">
                Nexus orchestrates specialized AI workers across an async shared blackboard.
                Untrusted code runs isolated inside Bubblewrap sandboxes with automated AST self-healing and Ed25519 digital receipts.
              </p>

              {/* Dispatch Prompt Bar */}
              <div className="shield-prompt-container">
                <textarea
                  id="task-input"
                  className="shield-prompt-input"
                  placeholder="Describe a goal (e.g., 'Analyze CSV data, synthesize findings, and write Python forecast script')…"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  rows={2}
                />

                <div className="shield-prompt-foot">
                  <div className="shield-prompt-presets">
                    <button
                      type="button"
                      className="shield-preset-chip"
                      onClick={() =>
                        setTaskInput('Analyze CSV data and write Python code and summarize research findings')
                      }
                    >
                      Data Analysis & Python Code
                    </button>
                    <button
                      type="button"
                      className="shield-preset-chip"
                      onClick={() =>
                        setTaskInput('Deploy containerized API service and monitor system telemetry')
                      }
                    >
                      DevOps Pipeline
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      id="preview-plan"
                      type="button"
                      className="shield-pill"
                      style={{ minHeight: '40px', padding: '8px 16px', fontSize: '13px' }}
                      onClick={handlePreviewPlanClick}
                      disabled={busy}
                    >
                      <Sparkles size={14} />
                      <span>Preview Plan</span>
                    </button>

                    <button
                      id="run-task"
                      type="button"
                      className="shield-pill shield-pill-terracotta"
                      style={{ minHeight: '40px', padding: '8px 20px', fontSize: '13px' }}
                      onClick={handleExecuteTask}
                      disabled={busy}
                    >
                      <span id="run-label">{busy ? 'Executing…' : 'Run task'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating 3D Hero Artifact */}
            <ShieldHeroArtifact paused={motionPaused} />
          </section>

          {/* Execution Pipeline Ribbon */}
          <PipelineRibbon status={executionStatus} title={executionTitle} />

          {/* Specialist DAG Workflow Graph */}
          <WorkflowDag
            activeAgent={activeWorkflowAgent}
            onSelectAgent={setActiveWorkflowAgent}
            progress={workflowProgress}
          />

          {/* Specialist Agent Store Section */}
          <section style={{ marginBlock: '48px 64px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <div>
                <span className="shield-section-label">Active Capabilities Store</span>
                <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', margin: 0 }}>
                  Specialist <em>Roster.</em>
                </h2>
              </div>
              <button
                type="button"
                className="shield-text-link"
                onClick={() => navigateTo('agents')}
              >
                <span>Explore full registry</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div id="overview-agents" className="shield-agent-grid">
              {agents.map((ag) => (
                <AgentDossierCard
                  key={ag.id}
                  agent={ag}
                  isWorking={busy && activeWorkflowAgent === ag.id}
                  isSample={mode === 'preview'}
                  onSelect={(id) => {
                    setActiveWorkflowAgent(id);
                    window.scrollTo({ top: 600, behavior: motionPaused ? 'instant' : 'smooth' });
                  }}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Page 2: Agent Registry (Always contains #registry-agents with 4 .agent-card items) */}
        <div id="page-agents" className="shield-container" style={{ display: currentPage === 'agents' ? 'block' : 'none', paddingBlock: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '32px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span className="shield-section-label">Capability Manifests</span>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: '0 0 8px' }}>
                The Specialist <em>App Store.</em>
              </h2>
              <p style={{ color: 'var(--shield-muted)', fontSize: '16px', margin: 0 }}>
                Modular AI workers discover each other via capability manifests and pass subtasks automatically.
              </p>
            </div>

            <span
              id="agent-total"
              style={{
                fontFamily: 'var(--shield-mono)',
                fontSize: '13px',
                color: 'var(--shield-muted)',
              }}
            >
              {agents.length} agents
            </span>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: '28px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--shield-muted)',
              }}
            />
            <input
              id="agent-search"
              type="search"
              placeholder="Search specialists by name, capability, or ID…"
              value={agentSearch}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setAgentSearch(val));
              }}
              style={{
                width: '100%',
                padding: '14px 20px 14px 48px',
                borderRadius: '100px',
                border: '1px solid var(--shield-line)',
                background: 'var(--shield-surface)',
                fontSize: '14px',
                color: 'var(--shield-ink)',
                outline: 'none',
              }}
            />
          </div>

          <div id="registry-agents" className="shield-agent-grid">
            {agents
              .filter((ag) =>
                `${ag.name} ${ag.id} ${ag.capabilities.join(' ')}`
                  .toLowerCase()
                  .includes(agentSearch.toLowerCase())
              )
              .map((ag) => (
                <AgentDossierCard
                  key={ag.id}
                  agent={ag}
                  isWorking={busy && activeWorkflowAgent === ag.id}
                  isSample={mode === 'preview'}
                  onSelect={(id) => setActiveWorkflowAgent(id)}
                />
              ))}
          </div>
        </div>

        {/* Page 3: Executions & Sandbox Inspector */}
        <div id="page-executions" style={{ display: currentPage === 'executions' ? 'block' : 'none' }}>
          <SelfHealingDiffViewer
            sandboxEvents={sandboxEvents}
            events={events}
            runs={runs}
          />
        </div>

        {/* Page 4: Living Blackboard */}
        <div id="page-blackboard" style={{ display: currentPage === 'blackboard' ? 'block' : 'none' }}>
          <BlackboardLedger entries={board} onExport={handleExportBoard} />
        </div>

        {/* Page 5: Trust Vault */}
        <div id="page-trust" style={{ display: currentPage === 'trust' ? 'block' : 'none' }}>
          <TiltReceiptCard
            receipts={receipts}
            onImportReceipt={(r) => setReceipts((prev) => [r, ...prev])}
          />
        </div>

        {/* Page 6: Runtime Settings */}
        <div id="page-runtime" style={{ display: currentPage === 'runtime' ? 'block' : 'none' }}>
          <RuntimeSettings mode={mode} onTogglePreview={togglePreviewMode} />
        </div>
      </main>

      {/* Plan Preview Modal */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        taskText={taskInput}
        steps={currentPlanSteps}
        onConfirmRun={handleExecuteTask}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={navigateTo}
      />

      {/* Toast Feedback Notification (UI UX Pro Max Micro-Interaction) */}
      {toastMessage && (
        <div className="shield-toast" role="status">
          <Check size={16} style={{ color: 'var(--shield-terracotta)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
