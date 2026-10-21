import { renderNetwork } from './network';
import { $, esc, icon, dialog, toast, download } from './dom';
import { state, catalog as builtinCatalog } from './models';
import { request } from './net';
import { navigate } from './routing';
import { renderAgents } from './views';
import { parseAgents } from './validation';
import { errorMessage } from './types';
import { categories, parseDefinition, parseStore, type AgentDefinition, type StoreAgent } from './store-types';

export const storeState: { agents: StoreAgent[]; loading: boolean; error: string; sequence: number; changing: boolean } = {
  agents: [], loading: false, error: '', sequence: 0, changing: false,
};
const sourceLabel = (agent: StoreAgent) => ({ builtin: 'Nexus built-in', local: 'Local publisher', plugin: 'Server plugin' })[agent.source];
const statusLabel = (agent: StoreAgent) => !agent.available ? 'Plugin unavailable' : !agent.installed ? 'Not installed'
  : agent.update_available ? 'Update available' : agent.enabled ? 'Installed' : 'Disabled';
function card(agent: StoreAgent): string {
  const symbol = builtinCatalog.find((item) => item.id === agent.id)?.symbol ?? agent.name.slice(0, 2).toUpperCase();
  return `<article class="card store-card" data-store-card="${esc(agent.id)}" data-category="${esc(agent.category)}">
    <div class="store-card-top"><span class="store-icon" data-category="${esc(agent.category)}">${esc(symbol)}</span><span class="store-source">${esc(sourceLabel(agent))}</span></div>
    <div class="store-card-heading"><h3><button data-store-agent="${esc(agent.id)}">${esc(agent.name)}</button></h3><span class="store-version">v${esc(agent.version)}</span></div>
    <p class="store-publisher">by ${esc(agent.publisher)}</p><p class="store-description">${esc(agent.description)}</p>
    <div class="store-tags">${agent.capabilities.slice(0, 4).map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>
    <div class="store-card-foot"><span class="store-installed ${agent.enabled ? 'is-enabled' : ''}">${agent.enabled ? '<span class="dot"></span>' : ''}${esc(statusLabel(agent))}</span><button class="button compact" data-store-agent="${esc(agent.id)}">${agent.installed ? 'Manage' : 'View agent'} ${icon('arrow')}</button></div></article>`;
}
export function renderStore() {
  const preview = state.mode === 'preview';
  const agents = preview ? [] : storeState.agents;
  const query = $('store-search').value.trim().toLowerCase();
  const category = $('store-category').value;
  const filtered = agents.filter((agent) => (!category || agent.category === category) &&
    `${agent.name} ${agent.description} ${agent.publisher} ${agent.capabilities.join(' ')}`.toLowerCase().includes(query));
  if ($('store-sort').value === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if ($('store-sort').value === 'available') filtered.sort((a, b) => Number(a.installed) - Number(b.installed));
  $('store-summary').textContent = storeState.loading && !agents.length ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'agent' : 'agents'}`;
  const message = preview ? 'Agent installation and publishing require a live server. Connect in Runtime & settings.' : storeState.error;
  $('store-status').textContent = message;
  $('store-status').hidden = !message;
  $('store-grid').innerHTML = filtered.map(card).join('') || `<div class="store-empty">${storeState.loading ? 'Loading the catalog…' : preview ? 'Your live catalog will appear here when connected.' : agents.length ? 'No agents match. Try another skill or category.' : 'Catalog unavailable. Refresh to try again.'}</div>`;
  $('installed-count').textContent = String(agents.filter((agent) => agent.installed).length);
  if (!preview) {
    const filter = $('installed-filter').value;
    const q = $('agent-search').value.trim().toLowerCase();
    const installed = agents.filter((agent) => agent.installed &&
      (filter === 'all' || filter === 'enabled' && agent.enabled || filter === 'disabled' && !agent.enabled || filter === 'updates' && agent.update_available) &&
      `${agent.name} ${agent.id} ${agent.capabilities.join(' ')}`.toLowerCase().includes(q));
    $('registry-agents').innerHTML = installed.map(card).join('') || `<div class="store-empty">No matching installed agents. <button class="text-link" data-page="store">Explore the store</button></div>`;
  }
  $('store-publish').disabled = preview;
  $('store-import').disabled = preview;
  $('store-refresh').disabled = preview || storeState.loading;
  renderNetwork();
}
export async function loadStore() {
  if (state.mode !== 'live') { renderStore(); return; }
  const epoch = state.epoch;
  const sequence = ++storeState.sequence;
  storeState.loading = true;
  renderStore();
  try {
    const agents = parseStore(await request('/api/store'));
    if (epoch !== state.epoch || sequence !== storeState.sequence) return;
    storeState.agents = agents;
    storeState.error = '';
  } catch (error) {
    if (epoch !== state.epoch || sequence !== storeState.sequence) return;
    storeState.error = `Catalog could not load: ${errorMessage(error)}`;
  } finally {
    if (epoch === state.epoch && sequence === storeState.sequence) storeState.loading = false;
    renderStore();
  }
}
function find(id: string): StoreAgent | undefined { return storeState.agents.find((agent) => agent.id === id); }
export function showStoreAgent(id: string) {
  const agent = find(id);
  if (!agent || state.mode !== 'live') return;
  const installed = agent.installed_definition;
  dialog(agent.name, `<div class="store-detail-meta"><span class="label-tag neutral">${esc(agent.category)}</span><span>${esc(sourceLabel(agent))} · ${esc(agent.publisher)}</span></div>
    <p>${esc(agent.description)}</p><dl class="definition"><dt>Catalog version</dt><dd>${esc(agent.version)}</dd><dt>Installed version</dt><dd>${esc(agent.installed_version ?? 'Not installed')}</dd><dt>Status</dt><dd>${esc(statusLabel(agent))}</dd><dt>Capabilities</dt><dd>${esc(agent.capabilities.join(' · '))}</dd><dt>Timeout</dt><dd>${esc(agent.timeout_secs)} seconds</dd></dl>
    <h3 class="store-detail-heading">Permissions</h3><ul class="store-permissions">${agent.permissions.map((permission) => `<li>${esc(permission)}</li>`).join('')}</ul>
    <p class="hint">${agent.source === 'local' ? 'Publisher name is self-declared. This prompt agent returns text; it cannot execute tools or uploaded Python.' : agent.source === 'plugin' ? 'Python plugins run as trusted server code. This catalog does not sandbox plugin implementations.' : 'Included with Nexus. Uses the model configured on your server.'}</p>
    ${agent.source === 'local' ? `<details class="store-instructions"><summary>System instructions · v${esc(agent.version)}</summary><pre class="code">${esc(agent.system_prompt)}</pre></details>${agent.update_available && installed ? `<details class="store-instructions"><summary>Currently installed instructions · v${esc(installed.version)}</summary><pre class="code">${esc(installed.system_prompt)}</pre></details>` : ''}` : ''}
    <h3 class="store-detail-heading">Try a task</h3><p class="store-sample">${esc(installed?.sample_task ?? agent.sample_task)}</p>
    <p id="store-action-feedback" class="feedback" role="status" hidden></p><div class="store-detail-actions">
      ${!agent.installed && agent.available ? `<button class="button primary" data-store-action="install" data-store-id="${esc(id)}">Install agent ${icon('plus')}</button>` : ''}
      ${agent.installed && agent.enabled ? `<button class="button primary" data-store-run="${esc(id)}">Run agent ${icon('play')}</button>` : ''}
      ${agent.installed && agent.available ? `<button class="button" data-store-action="${agent.enabled ? 'disable' : 'enable'}" data-store-id="${esc(id)}">${agent.enabled ? 'Disable' : 'Enable'}</button>` : ''}
      ${agent.installed && agent.available && agent.update_available ? `<button class="button" data-store-action="update" data-store-id="${esc(id)}">Update to ${esc(agent.version)}</button>` : ''}
      ${agent.installed ? `<button class="button danger" data-store-uninstall="${esc(id)}">Uninstall</button>` : ''}
      ${agent.source === 'local' ? `<button class="button" data-store-edit="${esc(id)}">Publish new version</button><button class="text-link" data-store-export="${esc(id)}">Export agent JSON</button>` : ''}
      ${agent.enabled ? `<button class="text-link" data-view-workflow="${esc(id)}">View workflow ${icon('flow')}</button>` : ''}
    </div>`);
}
async function refreshWorkers() {
  const epoch = state.epoch;
  const agents = parseAgents(await request('/api/agents'));
  if (epoch !== state.epoch) return;
  state.agents = agents;
  renderAgents();
}
async function changeAgent(id: string, action: string) {
  if (storeState.changing || state.mode !== 'live') return;
  storeState.changing = true;
  const epoch = state.epoch;
  document.querySelectorAll<HTMLButtonElement>('#dialog-body button').forEach((button) => button.disabled = true);
  try {
    const path = `/api/store/${encodeURIComponent(id)}`;
    await request(path + (action === 'install' || action === 'uninstall' ? '/install' : action === 'update' ? '/update' : ''), {
      method: action === 'uninstall' ? 'DELETE' : ['enable', 'disable'].includes(action) ? 'PATCH' : 'POST',
      ...(['enable', 'disable'].includes(action) ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: action === 'enable' }) } : {}),
    });
    if (epoch !== state.epoch) return;
    await Promise.all([loadStore(), refreshWorkers()]);
    showStoreAgent(id);
    toast(({ install: 'Agent installed.', update: 'Agent updated.', enable: 'Agent enabled.', disable: 'Agent disabled.', uninstall: 'Agent uninstalled. Shared outputs retained.' } as Record<string, string>)[action] ?? 'Agent updated.');
  } catch (error) {
    const feedback = document.getElementById('store-action-feedback');
    if (feedback) { feedback.textContent = errorMessage(error); feedback.hidden = false; }
    else toast(errorMessage(error));
  } finally {
    storeState.changing = false;
    document.querySelectorAll<HTMLButtonElement>('#dialog-body button').forEach((button) => button.disabled = false);
  }
}
function editor(agent?: AgentDefinition) {
  const updating = !!agent && storeState.agents.some((item) => item.id === agent.id);
  const definition: AgentDefinition = agent ?? { id: '', name: '', description: '', publisher: '', version: '1.0.0', category: 'Productivity', capabilities: [], system_prompt: '', sample_task: '', timeout_secs: 45 };
  const field = (label: string, name: keyof AgentDefinition, attributes = '') => `<label>${label}<input class="input" name="${name}" value="${esc(definition[name])}" required ${attributes}></label>`;
  dialog(updating ? 'Publish a new version' : 'Publish an agent', `<p>Create a prompt agent in this server’s catalog. Install it after publishing. JSON exports let others import it.</p>
    <form id="publish-agent-form" class="store-form"><div class="store-form-grid">
      ${field('Agent name', 'name', 'minlength="2" maxlength="80" placeholder="e.g. Code Reviewer"')}
      ${field('Publisher name · self-declared', 'publisher', 'minlength="2" maxlength="80" placeholder="Your name or team"')}
      ${field('Agent ID', 'id', `pattern="[a-z](?:[a-z0-9]|-){2,63}" maxlength="64" placeholder="code-reviewer" ${updating ? 'readonly' : ''}`)}
      ${field('Version', 'version', 'pattern="(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)" placeholder="1.0.0"')}
      <label>Category<select class="input" name="category">${categories.map((category) => `<option ${category === definition.category ? 'selected' : ''}>${category}</option>`).join('')}</select></label>
      ${field('Timeout · seconds', 'timeout_secs', 'type="number" min="1" max="300"')}
    </div><label>Description<textarea class="input" name="description" required minlength="10" maxlength="600" rows="2" placeholder="What does this agent help with?">${esc(definition.description)}</textarea></label>
    <label>Capabilities · comma separated<input class="input" name="capabilities" required maxlength="600" value="${esc(definition.capabilities.join(', '))}" placeholder="review, code, python"></label>
    <label>System instructions<textarea class="input" name="system_prompt" required minlength="10" maxlength="12000" rows="5" placeholder="Describe the role, expected behavior, and output format.">${esc(definition.system_prompt)}</textarea></label>
    <label>Example task<textarea class="input" name="sample_task" required minlength="5" maxlength="1000" rows="2" placeholder="A useful starting task for this agent.">${esc(definition.sample_task)}</textarea></label>
    <p class="hint">Permissions: send task text to your configured model; write its response to the shared blackboard. No tool execution.</p>
    <p id="publish-feedback" class="feedback" role="status" hidden></p><div class="dialog-actions"><button class="button primary" type="submit">${updating ? 'Publish version' : 'Publish agent'} ${icon('arrow')}</button></div></form>`);
  const form = document.querySelector<HTMLFormElement>('#publish-agent-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const candidate = Object.fromEntries(data);
    await publish({ ...candidate, timeout_secs: Number(data.get('timeout_secs')), capabilities: String(data.get('capabilities')).split(',').map((tag) => tag.trim()).filter(Boolean) });
  });
}
async function publish(value: unknown) {
  const button = document.querySelector<HTMLButtonElement>('#publish-agent-form button[type="submit"]');
  if (button?.disabled) return;
  if (button) button.disabled = true;
  const epoch = state.epoch;
  try {
    // Server validates unknown fields too; never silently accept permission or identity claims.
    const definition = parseDefinition(value);
    await request('/api/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    if (epoch !== state.epoch) return;
    await loadStore();
    showStoreAgent(definition.id);
    toast('Published to this server’s catalog. Install when ready.');
  } catch (error) {
    const feedback = document.getElementById('publish-feedback');
    if (feedback) { feedback.textContent = errorMessage(error); feedback.hidden = false; }
    else toast(`Publish failed: ${errorMessage(error)}`);
  } finally { if (button) button.disabled = false; }
}
export function setupStore() {
  for (const id of ['store-search', 'store-category', 'store-sort', 'installed-filter'] as const) $(id).addEventListener('input', renderStore);
  $('store-refresh').onclick = () => { void loadStore(); };
  $('store-publish').onclick = () => editor();
  $('store-import').onclick = () => $('store-file').click();
  $('store-file').onchange = async () => {
    const file = $('store-file').files?.[0];
    if (!file) return;
    try {
      if (file.size > 64 * 1024) throw new Error('Agent JSON exceeds 64 KB.');
      const value: unknown = JSON.parse(await file.text());
      const definition = parseDefinition(value);
      // Reviewing the definition precedes publishing. Server revalidates the submitted fields.
      const extra = Object.keys(value as Record<string, unknown>).filter((key) => !(key in definition));
      if (extra.length) throw new Error(`Unknown definition fields: ${extra.join(', ')}`);
      editor(definition);
    } catch (error) { toast(`Import failed: ${errorMessage(error)}`); }
    $('store-file').value = '';
  };
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button) return;
    if (button.dataset.storeAgent) showStoreAgent(button.dataset.storeAgent);
    if (button.dataset.storeAction && button.dataset.storeId) void changeAgent(button.dataset.storeId, button.dataset.storeAction);
    if (button.dataset.storeEdit) editor(find(button.dataset.storeEdit));
    if (button.dataset.storeExport) {
      const agent = find(button.dataset.storeExport);
      if (agent) download(`${agent.id}-${agent.version}.json`, parseDefinition(agent));
    }
    if (button.dataset.storeUninstall) {
      const id = button.dataset.storeUninstall;
      dialog('Uninstall agent?', `<p>Remove ${esc(find(id)?.name)} from your library and task routing? Its catalog listing and shared outputs remain.</p><p id="store-action-feedback" class="feedback" role="status" hidden></p><div class="dialog-actions"><button class="button" data-store-agent="${esc(id)}">Keep agent</button><button class="button danger" data-store-action="uninstall" data-store-id="${esc(id)}">Uninstall agent</button></div>`);
    }
    if (button.dataset.storeRun) {
      const agent = find(button.dataset.storeRun);
      if (!agent?.enabled) return;
      $('detail-dialog').close();
      navigate('workspace');
      $('task-agent').value = agent.id;
      $('task-input').value = agent.installed_definition?.sample_task ?? agent.sample_task;
      $('task-input').focus();
    }
  });
}
