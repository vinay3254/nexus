import { $, esc, icon, pretty, dialog } from './dom';
import { state, catalog } from './models';
import { renderNetwork } from './network';
import { renderStore, showStoreAgent } from './store';
import { renderWorkflow } from './workflows';
import type { AgentManifest, EventFilter, EventKind } from './types';
export function displayPipeline(stage = 4, title?: string) {
  if (title) $('execution-title').textContent = title;
  const labels = [
    ['Decompose & route', 'Capability match'],
    ['Run specialists', 'Shared context'],
    ['Sandbox & repair', 'Code outputs only'],
    ['Sign receipt', 'Ed25519 / SHA-256'],
  ];
  $('pipeline').innerHTML = labels
    .map(
      (s, i) =>
        `<li><span class="step-dot ${i < stage ? 'done' : ''}">${i < stage ? '✓' : i + 1}</span><span>${s[0]}</span><span class="step-detail">${s[1]}</span></li>`,
    )
    .join('');
}
export function renderAgents() {
  const q = $('agent-search').value.toLowerCase(),
    cards = (agents: AgentManifest[]) =>
      agents
        .map((a) => {
          const ref = catalog.find((x) => x.id === a.id),
            busy = state.busy && state.activeAgent === a.id;
          return `<button class="card agent-card" data-agent="${esc(a.id)}" aria-label="Inspect ${esc(a.name)}"><div class="agent-top"><span class="agent-symbol">${esc(ref?.symbol || 'A')}</span><span class="agent-state"><span class="dot"></span>${busy ? 'Working' : state.mode === 'preview' ? 'Sample' : 'Registered'}</span></div><h3>${esc(a.name)}</h3><p class="agent-desc">${esc(ref?.desc || a.capabilities.join(' · '))}</p><div class="agent-foot"><span>${esc(a.capabilities.slice(0, 3).join(' / '))}</span>${icon('arrow')}</div></button>`;
        })
        .join('');
  $('overview-agents').innerHTML =
    cards(state.agents.slice(0, 4)) || '<p class="empty">No agents registered.</p>';
  if (state.mode === 'preview') $('registry-agents').innerHTML =
    cards(
      state.agents.filter((a) =>
        `${a.name} ${a.id} ${a.capabilities.join(' ')}`.toLowerCase().includes(q),
      ),
    ) || '<p class="empty">No matching agents.</p>';
  const selected = $('task-agent').value;
  $('task-agent').innerHTML = '<option value="">Automatic routing · installed agents</option>' + state.agents.map((agent) => `<option value="${esc(agent.id)}">${esc(agent.name)}</option>`).join('');
  $('task-agent').value = state.agents.some((agent) => agent.id === selected) ? selected : '';
  renderStore();
  $('agent-total').textContent = state.agents.length + ' agents';
  $('specialist-count').textContent = state.agents.length + ' registered';
  renderWorkflow();
}
export function showAgent(id: string) {
  if (state.mode === 'live') { showStoreAgent(id); return; }
  const a = state.agents.find((x) => x.id === id);
  if (!a) return;
  dialog(
    a.name,
    `<span class="label-tag">${esc(a.id)}</span><dl class="definition"><dt>Version</dt><dd>${esc(a.version)}</dd><dt>Timeout</dt><dd>${esc(a.timeout_secs)} seconds</dd><dt>Capabilities</dt><dd>${esc(a.capabilities.join(' · '))}</dd><dt>Routing</dt><dd>Automatic capability matching</dd></dl><p>Registered workers receive subtasks from the supervisor and publish results to the shared blackboard.</p><button class="button" data-view-workflow="${esc(a.id)}" style="margin-top:16px">View workflow ${icon('flow')}</button><br><button class="button primary" data-use-agent="${esc(a.id)}" style="margin-top:20px">Start a task with this specialist ${icon('arrow')}</button>`,
  );
}
export function renderBoard() {
  renderNetwork();
  const q = $('board-search').value.toLowerCase();
  $('board-count').textContent = state.board.length + ' entries';
  $('overview-board').innerHTML =
    state.board
      .slice(-3)
      .reverse()
      .map(
        (e, i) =>
          `<div class="output-row"><span class="file-icon">${icon('file')}</span><div class="output-info"><div class="output-key">${esc(e.key)}</div><p class="output-meta">${esc(e.author)} · v${esc(e.version)}</p><p class="output-excerpt">${esc(pretty(e.value))}</p></div><button class="icon-button" data-entry="${esc(e.key)}" aria-label="Inspect ${esc(e.key)}">${icon('arrow')}</button></div>`,
      )
      .join('') ||
    '<p class="empty">No shared outputs yet. Run a task to populate the blackboard.</p>';
  $('board-entries').innerHTML =
    state.board
      .filter((e) => `${e.key} ${e.author} ${pretty(e.value)}`.toLowerCase().includes(q))
      .map(
        (e) =>
          `<details class="record"><summary>${esc(e.key)}</summary><p class="secondary">${esc(e.author)} · version ${esc(e.version)}${e.timestamp ? ' · ' + esc(new Date(e.timestamp).toLocaleString()) : ''}</p><pre class="code">${esc(pretty(e.value))}</pre><div class="record-actions"><button class="text-link" data-copy-entry="${esc(e.key)}">Copy output</button><button class="text-link" data-download-entry="${esc(e.key)}">Download JSON</button></div></details>`,
      )
      .join('') || '<p class="empty">No matching entries.</p>';
}
export function renderEvents() {
  const markup = (filter: EventFilter) => {
    const rows = state.events.filter((e) => filter === 'all' || e.kind === filter);
    return (
      rows
        .map(
          (e) =>
            `<div class="event-row" data-kind="${esc(e.kind)}"><span class="dot"></span><div><p class="event-title">${esc(e.message)}</p><p class="event-kind">${esc(e.kind)}</p></div><time class="event-time">${esc(e.time)}</time></div>`,
        )
        .join('') || '<p class="empty">No events to show.</p>'
    );
  };
  $('overview-events').innerHTML = markup(state.overviewFilter);
  $('full-events').innerHTML = markup(state.filter);
  $('event-count').textContent = `${state.events.length} ${state.sample ? 'sample ' : ''}events`;
  if ($('auto-scroll').checked) {
    $('full-events').scrollTop = $('full-events').scrollHeight;
    $('overview-events').scrollTop = $('overview-events').scrollHeight;
  }
}
export function addEvent(kind: EventKind, message: string) {
  state.events.push({
    kind,
    message: String(message).replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, ''),
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date().toISOString(),
  });
  if (state.events.length > state.max) state.events = state.events.slice(-state.max);
  renderEvents();
}
export function renderHistory() {
  $('run-count').textContent = String(state.runs.length);
  $('history').innerHTML =
    [...state.runs]
      .reverse()
      .map(
        (r, i) =>
          `<details class="record" ${i === 0 ? 'open' : ''}><summary>${esc(r.task)}</summary><p class="secondary">${esc(r.status)} · ${esc(r.time)} · ${r.preview ? 'Preview simulation' : 'Live server'}</p>${r.plan ? `<ol style="font-size:11px;padding-left:19px;line-height:2">${r.plan.map((p) => `<li>${esc(p[1])} → ${esc(p[0])}</li>`).join('')}</ol>` : ''}<button class="text-link" data-reuse="${state.runs.length - 1 - i}">Use prompt again</button></details>`,
      )
      .join('') || '<p class="empty">Tasks dispatched from this page appear here.</p>';
}
export function renderSandbox() {
  $('sandbox-events').innerHTML =
    state.sandbox
      .map(
        (e, i) =>
          `<details class="record"><summary>${esc(e.message || 'Sandbox event')}</summary><p class="secondary">${esc(e.status || 'Execution requested')}</p>${(
            ['code', 'stderr', 'healed_code'] as const
          )
            .filter((k) => e[k])
            .map(
              (k) =>
                `<p class="hint">${esc(k.replace('_', ' ').toUpperCase())}</p><pre class="code">${esc(e[k])}</pre>`,
            )
            .join('')}</details>`,
      )
      .join('') || '<p class="empty">No sandbox events. Code tasks populate this inspector.</p>';
}
export function renderReceipts() {
  renderNetwork();
  $('receipt-list').innerHTML =
    state.receipts
      .map(
        (r, i) =>
          `<details class="record" open><summary>${esc(r.task_id)} <span class="label-tag ${r.preview ? 'neutral' : ''}">${r.preview ? 'Sample · unsigned' : r.verified === true ? 'Signature verified' : r.verified === false ? 'Verification failed' : 'Not verified'}</span></summary><p class="secondary">${esc(r.timestamp)}</p><dl class="definition"><dt>SHA-256 digest</dt><dd style="font-family:var(--mono)">${esc(r.payload_digest || 'Not provided')}</dd><dt>Ed25519 signature</dt><dd style="font-family:var(--mono)">${esc(r.signature || 'Preview has no real signature')}</dd><dt>Public key</dt><dd style="font-family:var(--mono)">${esc(r.public_key || 'Not included in server event')}</dd></dl><div class="record-actions"><button class="text-link" data-download-receipt="${i}">Export JSON</button>${!r.preview ? `<button class="text-link" data-verify-receipt="${i}">Verify signature</button>` : ''}</div><p class="hint">${r.preview ? 'Illustrative receipt only. No cryptographic claim.' : r.public_key ? 'Verification checks the signature against the included key. Key ownership and payload integrity require separate checks.' : 'Server emits a digest and signature without a public key. Import a full CLI receipt to verify.'}</p></details>`,
      )
      .join('') ||
    '<p class="empty">No receipts received. Complete a task or import an exported CLI receipt.</p>';
}
export function render() {
  renderAgents();
  renderBoard();
  renderEvents();
  renderHistory();
  renderSandbox();
  renderReceipts();
  renderWorkflow();
}
export function setBusy(busy: boolean) {
  state.busy = busy;
  $('run-task').disabled = busy;
  $('run-label').textContent = busy
    ? 'Running…'
    : state.mode === 'preview'
      ? 'Run preview'
      : 'Run task';
  renderAgents();
}
