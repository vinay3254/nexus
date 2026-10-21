import './styles.css';
import './store.css';
import './control.css';
import './studio.css';
import { setupNetwork } from './network';
import { setupStore, loadStore } from './store';
import {
  $,
  esc,
  icon,
  safe,
  pretty,
  toast,
  dialog,
  feedback,
  download,
  copy,
  buttonFrom,
  inputValue,
} from './dom';
import { state } from './models';
import { navigate, closeMenu } from './routing';
import { plan } from './planner';
import {
  render,
  renderAgents,
  renderBoard,
  renderEvents,
  renderHistory,
  renderReceipts,
  displayPipeline,
  setBusy,
  showAgent,
} from './views';
import { seed, runPreview } from './preview';
import {
  request,
  connect,
  usePreview,
  loadAgents,
  loadBoard,
  updateMode,
  openSocket,
  stopConnection,
} from './transport';
import { verifyReceipt } from './receipts';
import {
  workflow,
  workflowSpec,
  beginWorkflow,
  resetWorkflow,
  renderWorkflow,
  selectWorkflow,
} from './workflows';
import { isNodeKey, eventFilter, errorMessage, type Page, type TaskRun } from './types';
import { parseReceipt } from './validation';
async function dispatch(e: Event) {
  e.preventDefault();
  const task = $('task-input').value.trim();
  if (!task) {
    feedback('Describe a task first.', true);
    $('task-input').focus();
    return;
  }
  if (state.busy) return;
  if (state.mode === 'preview') {
    if ($('task-agent').value) { feedback('Preview uses automatic sample routing. Choose automatic routing or connect to run a specific agent.', true); return; }
    runPreview(task);
    return;
  }
  if (!state.connected) {
    feedback('Server disconnected. Reconnect before dispatching.', true);
    return;
  }
  const agentId = $('task-agent').value;
  beginWorkflow(task, agentId ? [[agentId, task]] : plan(task), false);
  setBusy(true);
  feedback('Dispatching task…');
  const epoch = state.epoch;
  const run: TaskRun = {
    task,
    status: 'Dispatching',
    time: new Date().toLocaleTimeString(),
    preview: false,
  };
  state.runs.push(run);
  displayPipeline(0, task);
  $('execution-status').textContent = 'Dispatching';
  $('execution-caption').textContent = 'Awaiting server events';
  renderHistory();
  try {
    await request('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, ...(agentId ? { agent_id: agentId } : {}) }),
    });
    if (epoch !== state.epoch) return;
    if (run.status === 'Dispatching') {
      run.status = 'Dispatched';
      $('execution-status').textContent = 'Dispatched';
    }
    feedback('Task dispatched. Follow server activity for completion.');
    renderHistory();
  } catch (err) {
    if (epoch !== state.epoch) return;
    const uncertain =
      (err instanceof Error && err.name === 'TimeoutError') || err instanceof TypeError;
    run.status = uncertain ? 'Dispatch unconfirmed' : 'Dispatch failed';
    feedback(
      uncertain
        ? 'No confirmation. Task may have started; inspect activity before retrying.'
        : errorMessage(err),
      true,
    );
    $('execution-status').textContent = run.status;
    setBusy(false);
    renderHistory();
  }
}
function shellQuote(s: string) {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}
function commands() {
  const provider = $('provider').value,
    db = $('db-path').value.trim(),
    plugins = $('plugin-path').value.trim();
  $('provider-command').textContent =
    `uv run nexus run "Your task here" --provider ${provider} --export-receipt ./receipt.json`;
  $('serve-command').textContent =
    'uv run nexus serve' +
    (db ? ' --persist ' + shellQuote(db) : '') +
    (plugins ? ' --plugins ' + shellQuote(plugins) : '');
  safe.set('provider', provider);
  safe.set('db', db);
  safe.set('plugins', plugins);
}
function previewPlan() {
  const task = $('task-input').value.trim();
  if (!task) {
    feedback('Describe a task to preview its plan.', true);
    $('task-input').focus();
    return;
  }
  const agentId = $('task-agent').value;
  const p = agentId ? [[agentId, task]] : plan(task);
  dialog(
    'Execution plan',
    `<span class="label-tag neutral">LOCAL DRY RUN · NO EXECUTION</span><p style="margin-top:15px">${esc(task)}</p><ol style="padding-left:20px;font-size:12px;line-height:2.1">${p.map(([id, label]) => `<li>${esc(label)}<br><span class="secondary">${esc(id)} · capability-based match</span></li>`).join('')}</ol><p class="hint">Matches the built-in keyword planner. Live routing depends on the registered agent catalog. Only code outputs enter the sandbox.</p><div class="dialog-actions"><button class="button primary" id="plan-run">${state.mode === 'preview' ? 'Run preview' : 'Run task'} ${icon('arrow')}</button></div>`,
  );
}
const destinations: Array<[string, Page]> = [
  ['Agent store', 'store'],
  ['Dashboard', 'workspace'],
  ['Executions', 'executions'],
  ['Installed agents', 'agents'],
  ['Blackboard', 'blackboard'],
  ['Trust & receipts', 'trust'],
  ['Runtime & settings', 'runtime'],
];
function renderCommand() {
  const q = $('command-query').value.toLowerCase();
  $('command-list').innerHTML =
    destinations
      .filter(([name]) => name.toLowerCase().includes(q))
      .map(
        ([name, page]) =>
          `<button data-command-page="${page}">${name}<span>Open ${icon('arrow')}</span></button>`,
      )
      .join('') || '<p class="no-results">No matching pages.</p>';
}
function openCommand() {
  renderCommand();
  $('command-dialog').showModal();
  $('command-query').focus();
}
document.addEventListener('click', (e) => {
  const b = buttonFrom(e);
  if (!b) return;
  if (b.dataset.page) navigate(b.dataset.page);
  if (b.dataset.agent) showAgent(b.dataset.agent);
  if (b.dataset.prompt) {
    $('task-input').value = b.dataset.prompt;
    safe.set('draft', b.dataset.prompt);
    $('task-input').focus();
    feedback('');
  }
  if (b.dataset.entry) {
    const entry = state.board.find((x) => x.key === b.dataset.entry);
    if (entry)
      dialog(
        'Shared output',
        `<span class="label-tag neutral">v${esc(entry.version)} · ${esc(entry.author)}</span><h3 style="font:13px var(--mono);margin-top:16px">${esc(entry.key)}</h3><pre class="code">${esc(pretty(entry.value))}</pre><div class="dialog-actions"><button class="button" data-copy-entry="${esc(entry.key)}">Copy output</button><button class="button" data-download-entry="${esc(entry.key)}">Download</button></div>`,
      );
  }
  if (b.dataset.copyEntry) {
    const entry = state.board.find((x) => x.key === b.dataset.copyEntry);
    if (entry) copy(pretty(entry.value));
  }
  if (b.dataset.downloadEntry) {
    const entry = state.board.find((x) => x.key === b.dataset.downloadEntry);
    if (entry) download('nexus-output.json', entry);
  }
  if (b.dataset.copy) copy(b.dataset.copy);
  if (b.dataset.downloadReceipt !== undefined)
    download('nexus-receipt.json', state.receipts[Number(b.dataset.downloadReceipt)]);
  if (b.dataset.verifyReceipt !== undefined) verifyReceipt(Number(b.dataset.verifyReceipt));
  if (b.dataset.reuse !== undefined) {
    $('task-input').value = state.runs[Number(b.dataset.reuse)].task;
    navigate('workspace');
    $('task-input').focus();
  }
  if (b.dataset.useAgent) {
    const id = b.dataset.useAgent,
      prompts: Record<string, string> = {
        'coding-agent': 'Write a Python script to ',
        'research-agent': 'Research and summarize ',
        'data-agent': 'Analyze CSV data to ',
        'ops-agent': 'Configure Docker deployment for ',
      };
    $('task-agent').value = state.mode === 'live' ? id : '';
    $('task-input').value = prompts[id] || 'Describe a task for ' + id + ': ';
    $('detail-dialog').close();
    navigate('workspace');
    $('task-input').focus();
  }
  if (b.dataset.commandPage) {
    $('command-dialog').close();
    navigate(b.dataset.commandPage);
  }
  if (b.id === 'plan-run') {
    $('detail-dialog').close();
    $('task-form').requestSubmit();
  }
});
$('task-form').addEventListener('submit', dispatch);
$('task-input').value = safe.get('draft');
$('task-input').addEventListener('input', () => safe.set('draft', $('task-input').value));
$('task-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    $('task-form').requestSubmit();
  }
});
$('new-task').onclick = () => {
  $('task-input').value = '';
  safe.set('draft', '');
  $('task-input').focus();
  feedback('');
};
$('preview-plan').onclick = previewPlan;
$('agent-search').oninput = renderAgents;
$('board-search').oninput = renderBoard;
$('refresh-agents').onclick = () => {
  loadAgents();
  loadStore();
  if (state.mode === 'preview') toast('Showing sample registry. Connect a server for live agents.');
};
$('refresh-board').onclick = () => {
  loadBoard();
  if (state.mode === 'preview') toast('Showing sample entries. Connect a server for live memory.');
};
$('event-filter').onchange = (e) => {
  state.filter = eventFilter(inputValue(e));
  renderEvents();
};
$('overview-filters').onclick = (e) => {
  const b =
    e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-filter]') : null;
  if (!b) return;
  state.overviewFilter = eventFilter(b.dataset.filter ?? 'all');
  document
    .querySelectorAll<HTMLButtonElement>('#overview-filters button')
    .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderEvents();
};
$('clear-events').onclick = () => {
  state.events = [];
  renderEvents();
  toast('Event history cleared from this page.');
};
$('export-events').onclick = () => download('nexus-events.json', state.events);
$('export-board').onclick = () => download('nexus-blackboard.json', state.board);
$('plugin-guide').onclick = () =>
  dialog(
    'Add a specialist',
    `<p>Put an Agent subclass in your Python plugin directory. Its manifest declares worker ID, capabilities, version, and timeout.</p><pre class="code">from nexus.agents.base import Agent, AgentOutput\nfrom nexus.app_store import AgentManifest\n\nclass CustomAgent(Agent):\n    def manifest(self):\n        return AgentManifest(\n            id="custom-agent",\n            name="Custom Specialist",\n            capabilities=["custom"],\n        )\n\n    async def execute(self, task, blackboard):\n        result = await self.llm.complete(task)\n        await blackboard.set(\n            "custom-agent:output", result,\n            author="custom-agent",\n        )\n        return AgentOutput(\n            agent_id="custom-agent",\n            result=result, is_code=False,\n        )</pre><p class="hint">Save as ./plugins/custom.py, then restart Nexus with --plugins ./plugins.</p><button class="button" data-copy="uv run nexus serve --plugins ./plugins" style="margin-top:14px">Copy startup command</button>`,
  );
$('upload-receipt').onclick = () => $('receipt-file').click();
$('receipt-file').onchange = async (e) => {
  const file = $('receipt-file').files?.[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Receipt exceeds 1 MB.');
    const r = parseReceipt(JSON.parse(await file.text()));
    state.receipts.unshift(r);
    renderReceipts();
    toast('Receipt imported. Select Verify signature to check it.');
  } catch (err) {
    toast('Import failed: ' + errorMessage(err));
  }
  $('receipt-file').value = '';
};
$('connect-form').onsubmit = connect;
$('server-url').value = safe.get(
  'server',
  location.protocol.startsWith('http') ? location.origin : 'http://localhost:8000',
);
$('connection').onclick = () => navigate('runtime');
$('workspace-switch').onclick = () => navigate('runtime');
$('preview-mode').onclick = usePreview;
$('reset-preview').onclick = () => {
  if (state.mode !== 'preview') {
    toast('Switch to preview mode before resetting samples.');
    return;
  }
  if (state.busy) {
    toast('Wait for the preview to finish.');
    return;
  }
  seed();
  feedback('');
  toast('Sample workspace restored.');
};
$('provider').value = safe.get('provider', 'auto');
$('db-path').value = safe.get('db', './blackboard.db');
$('plugin-path').value = safe.get('plugins', './plugins');
(['provider', 'db-path', 'plugin-path'] as const).forEach((id) =>
  $(id).addEventListener('input', commands),
);
$('copy-provider').onclick = () => copy($('provider-command').textContent);
$('copy-serve').onclick = () => copy($('serve-command').textContent);
state.max = [100, 300, 1000].includes(Number(safe.get('retention')))
  ? Number(safe.get('retention'))
  : 300;
$('retention').value = String(state.max);
$('retention').onchange = (e) => {
  state.max = Number(inputValue(e));
  safe.set('retention', state.max);
  state.events = state.events.slice(-state.max);
  renderEvents();
};
commands();
function bootWorkspace() {
  if (!['http:', 'https:'].includes(location.protocol)) {
    seed();
    updateMode();
    return;
  }
  state.base = location.origin;
  state.mode = 'live';
  state.sample = false;
  state.agents = [];
  state.board = [];
  state.events = [];
  state.receipts = [];
  state.runs = [];
  state.sandbox = [];
  resetWorkflow(false);
  $('server-url').value = location.origin;
  $('connection-text').textContent = 'Connecting…';
  $('connect-feedback').textContent = 'Connecting to this Nexus server…';
  displayPipeline(0, 'Ready for your first task');
  $('execution-status').textContent = 'Ready';
  $('execution-caption').textContent = 'No execution received in this session';
  updateMode();
  render();
  openSocket();
}
$('agent-workflow').tabIndex = -1;
$('workflow-tabs').addEventListener('click', (e) => {
  const tab =
    e.target instanceof Element
      ? e.target.closest<HTMLButtonElement>('[data-workflow-agent]')
      : null;
  if (!tab) return;
  workflow.agent = tab.dataset.workflowAgent ?? workflow.agent;
  workflow.selected = null;
  renderWorkflow();
  $('workflow-tabs')
    .querySelector<HTMLButtonElement>('[aria-selected="true"]')
    ?.focus({ preventScroll: true });
  $('workflow-viewport').scrollLeft = 0;
});
$('workflow-tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const tabs = [...$('workflow-tabs').querySelectorAll<HTMLButtonElement>('[role=tab]')],
    i = tabs.findIndex((node) => node === document.activeElement),
    j =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? tabs.length - 1
          : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[j]?.click();
});
$('workflow-canvas').addEventListener('click', (e) => {
  const node =
    e.target instanceof Element
      ? e.target.closest<HTMLButtonElement>('[data-workflow-node]')
      : null;
  if (!node) return;
  if (!isNodeKey(node.dataset.workflowNode)) return;
  workflow.selected = node.dataset.workflowNode;
  renderWorkflow();
});
$('workflow-canvas').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const nodes = [
      ...$('workflow-canvas').querySelectorAll<HTMLButtonElement>('[data-workflow-node]'),
    ],
    i = nodes.findIndex((node) => node === document.activeElement),
    j =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? nodes.length - 1
          : (i + (e.key === 'ArrowRight' ? 1 : -1) + nodes.length) % nodes.length;
  nodes[j]?.focus();
});
$('workflow-source').onclick = () =>
  dialog(
    'Workflow source',
    `<p>Workflows map the current Nexus agent implementations and server trust pipeline. Branches combine system and task prompts before the LLM call.</p><dl class="definition"><dt>Agent</dt><dd>${esc(workflowSpec(workflow.agent).source)}</dd><dt>Orchestration</dt><dd>router/planner.py · router/supervisor.py</dd><dt>Trust layer</dt><dd>server/app.py · trust/healer.py</dd></dl><p class="hint">Blackboard writes happen before sandbox execution. Repair runs only when code fails. Receipts belong to the merged task. The current server does not emit step-level prompt events or per-node durations.</p>`,
  );
document.addEventListener('click', (e) => {
  const b = buttonFrom(e);
  if (b?.dataset.viewWorkflow) {
    $('detail-dialog').close();
    selectWorkflow(b.dataset.viewWorkflow, true);
  }
  if (b?.id === 'workflow-inspector-close') {
    workflow.selected = null;
    renderWorkflow();
  }
});
$('dialog-close').onclick = () => $('detail-dialog').close();
$('command-close').onclick = () => $('command-dialog').close();
[$('detail-dialog'), $('command-dialog')].forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        d.close();
    }
  }),
);
$('command-open').onclick = openCommand;
$('command-query').oninput = renderCommand;
$('command-query').onkeydown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('command-list').querySelector('button')?.click();
  }
  if (e.key === 'ArrowDown') {
    $('command-list').querySelector('button')?.focus();
    e.preventDefault();
  }
};
$('command-list').onkeydown = (e) => {
  if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
  const items = [...$('command-list').querySelectorAll<HTMLButtonElement>('button')],
    i = items.findIndex((node) => node === document.activeElement);
  items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  e.preventDefault();
};
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if ($('command-dialog').open) $('command-dialog').close();
    else openCommand();
  }
  if (e.key === 'Escape') closeMenu();
});
$('menu').onclick = () => {
  const open = $('sidebar').classList.toggle('open');
  $('mobile-shade').classList.toggle('open', open);
  $('menu').setAttribute('aria-expanded', String(open));
};
$('mobile-shade').onclick = closeMenu;
window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
window.addEventListener('pagehide', stopConnection);
window.addEventListener('pageshow', (e) => {
  if (e.persisted && state.mode === 'live') openSocket();
});
setupStore();
setupNetwork();
bootWorkspace();
const routePage: Record<string, Page> = {
  '/dashboard': 'workspace',
  '/store': 'store',
  '/installed': 'agents',
  '/workspace': 'workspace',
  '/agents': 'agents',
  '/executions': 'executions',
  '/blackboard': 'blackboard',
  '/execution-inspector': 'executions',
  '/trust': 'trust',
  '/runtime': 'runtime',
};
navigate(location.hash.slice(1) || routePage[location.pathname] || 'store');
