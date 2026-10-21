import { $, toast, safe, feedback } from './dom';
import { state } from './models';
import { seed } from './preview';
import {
  render,
  renderAgents,
  renderBoard,
  renderHistory,
  renderSandbox,
  renderReceipts,
  addEvent,
  setBusy,
  displayPipeline,
} from './views';
import {
  observeWorkflow,
  resetWorkflow,
  renderWorkflow,
  renderWorkflowInspector,
} from './workflows';
import {
  isRecord,
  errorMessage,
  type AgentManifest,
  type BoardEntry,
  type ServerMessage,
} from './types';
import { renderNetwork } from './network';
import { loadStore, renderStore } from './store';
import { request } from './net';
export { request } from './net';
import { parseAgents, parseBoard, parseServerMessage } from './validation';
export function normalizeAgents(agents: unknown): AgentManifest[] {
  return parseAgents(agents);
}
export async function loadAgents() {
  if (state.mode === 'preview') {
    renderAgents();
    return;
  }
  const epoch = state.epoch;
  try {
    const agents = normalizeAgents(await request('/api/agents'));
    if (epoch !== state.epoch) return;
    state.agents = agents;
    renderAgents();
  } catch (e) {
    toast('Agent refresh failed: ' + errorMessage(e));
  }
}
export async function loadBoard() {
  if (state.mode === 'preview') {
    renderBoard();
    return;
  }
  const epoch = state.epoch,
    seq = ++state.boardSequence;
  try {
    const entries = parseBoard(await request('/api/blackboard'));
    if (epoch !== state.epoch || seq !== state.boardSequence) return;
    if (!Array.isArray(entries)) throw new Error('Invalid blackboard response.');
    state.board = entries;
    renderBoard();
    renderWorkflowInspector();
  } catch (e) {
    toast('Blackboard refresh failed: ' + errorMessage(e));
  }
}
export function updateMode() {
  const live = state.mode === 'live';
  $('mode-label').textContent = live
    ? 'Live server · session events'
    : 'Local preview · sample data';
  $('sidebar-mode').textContent = live ? 'Live server connection' : 'Standalone preview';
  $('footer-mode').textContent = live ? 'LIVE SERVER' : 'LOCAL PREVIEW';
  $('memory-caption').textContent = live
    ? 'Shared memory · live updates'
    : 'Sample entries · local preview';
  $('connection').classList.toggle('live', live && state.connected);
  $('connection-text').textContent = live
    ? state.connected
      ? 'Connected'
      : 'Disconnected'
    : 'Preview mode';
  $('run-label').textContent = live ? 'Run task' : 'Run preview';
  renderNetwork();
}
export function stopConnection() {
  state.epoch++;
  if (state.timer !== null) clearTimeout(state.timer);
  state.timer = null;
  if (state.socket) {
    state.socket.onclose = null;
    state.socket.close();
    state.socket = null;
  }
  state.connected = false;
}
export function handleMessage(data: ServerMessage) {
  if (data.type === 'catalog_changed') { void loadStore(); void loadAgents(); return; }
  observeWorkflow(data);
  processMessage(data);
}
export function processMessage(data: ServerMessage) {
  if (data.type === 'log') {
    const msg = String(data.message || '');
    addEvent(/error|failed|⚠/i.test(msg) ? 'error' : 'activity', msg);
    if (/Task failed:/.test(msg)) {
      const run = [...state.runs].reverse().find((item) => !item.preview && ['Dispatching', 'Dispatched', 'Running'].includes(item.status));
      if (run) run.status = 'Failed';
      $('execution-status').textContent = 'Failed';
      $('execution-caption').textContent = msg;
      feedback(msg, true);
      state.activeAgent = null;
      setBusy(false);
      renderHistory();
    }
    if (/Decomposing/.test(msg)) {
      displayPipeline(1);
      $('execution-status').textContent = 'Running';
    }
    if (/Routed subtask/.test(msg)) {
      displayPipeline(1);
      state.activeAgent = msg.match(/to ([\w-]+)/)?.[1] ?? null;
      renderAgents();
    }
    if (/Task completed successfully/.test(msg)) {
      const run = [...state.runs]
        .reverse()
        .find((r) => !r.preview && ['Dispatched', 'Dispatching', 'Running'].includes(r.status));
      if (run) run.status = 'Completed';
      displayPipeline(4);
      $('execution-status').textContent = 'Completed';
      $('execution-caption').textContent = 'Server reported completion';
      setBusy(false);
      state.activeAgent = null;
      renderHistory();
      renderAgents();
    }
  } else if (data.type === 'blackboard_update') {
    addEvent('output', `${data.author} updated ${data.key} (v${data.version}).`);
    loadBoard();
  } else if (data.type === 'sandbox_event') {
    state.sandbox.push(data);
    if (state.sandbox.length > 100) state.sandbox.shift();
    addEvent('sandbox', data.message);
    displayPipeline(2);
    renderSandbox();
  } else if (data.type === 'receipt') {
    state.receipts.unshift(data);
    renderWorkflow();
    state.receipts = state.receipts.slice(0, 50);
    addEvent(
      'receipt',
      'Signed receipt received. Public key required for independent verification.',
    );
    displayPipeline(3);
    renderReceipts();
    loadBoard();
  }
}
export function openSocket() {
  if (state.mode !== 'live') return;
  const epoch = state.epoch,
    url = new URL(state.base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  const socket = new WebSocket(url.href);
  state.socket = socket;
  socket.onopen = () => {
    if (epoch !== state.epoch) return;
    state.connected = true;
    state.retry = 0;
    updateMode();
    $('connect-feedback').textContent = 'Connected. Receiving live events.';
    loadAgents();
    loadBoard();
    loadStore();
  };
  socket.onmessage = (e) => {
    if (epoch !== state.epoch) return;
    try {
      handleMessage(parseServerMessage(JSON.parse(String(e.data))));
    } catch {
      addEvent('error', 'Could not display a server event.');
    }
  };
  socket.onerror = () => {
    if (epoch === state.epoch) {
      state.connected = false;
      updateMode();
      $('connect-feedback').textContent = 'WebSocket unavailable. Check server URL and origin.';
    }
  };
  socket.onclose = () => {
    if (epoch !== state.epoch || state.mode !== 'live') return;
    state.connected = false;
    updateMode();
    $('connect-feedback').textContent = 'Disconnected. Reconnecting automatically…';
    state.timer = setTimeout(openSocket, Math.min(1000 * 2 ** state.retry++, 15000));
  };
}
export async function connect(e: Event) {
  e.preventDefault();
  if (state.busy) {
    toast('Wait for the current task before switching connections.');
    return;
  }
  let base;
  try {
    const u = new URL($('server-url').value || location.origin);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error();
    base = u.origin;
  } catch {
    $('connect-feedback').textContent = 'Enter an HTTP or HTTPS server URL.';
    return;
  }
  $('connect-submit').disabled = true;
  $('connect-feedback').textContent = 'Checking server…';
  try {
    const r = await fetch(base + '/health', { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const health: unknown = await r.json();
    if (!isRecord(health) || health.status !== 'ok') throw new Error('Unexpected health response');
    stopConnection();
    state.base = base;
    state.mode = 'live';
    state.sample = false;
    state.agents = [];
    resetWorkflow(false);
    state.board = [];
    state.events = [];
    state.receipts = [];
    state.runs = [];
    state.sandbox = [];
    safe.set('server', base);
    updateMode();
    displayPipeline(0, 'Waiting for your first live task');
    $('execution-status').textContent = 'Ready';
    $('execution-caption').textContent = 'No execution received in this session';
    render();
    openSocket();
    toast('Server reached. Opening event stream.');
  } catch (err) {
    $('connect-feedback').textContent =
      'Connection failed. Serve this HTML from the Nexus origin, or enable server CORS. ' +
      errorMessage(err);
  } finally {
    $('connect-submit').disabled = false;
  }
}
export function usePreview() {
  if (state.busy) {
    toast('Wait for the current task before changing mode.');
    return;
  }
  stopConnection();
  state.mode = 'preview';
  updateMode();
  seed();
  renderStore();
  $('connect-feedback').textContent = 'Standalone preview active.';
  feedback('');
}
