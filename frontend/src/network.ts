import { $, esc, icon, toast, dialog, pretty } from './dom';
import { state } from './models';
import { storeState } from './store';
import { navigate } from './routing';
import { selectWorkflow, workflowShape } from './workflows';
import type { AgentManifest } from './types';

type Branch = 'skills' | 'outputs' | 'workflow' | 'receipts';
type View = 'overview' | 'focus';
interface Leaf { title: string; meta: string; status: string; action?: string; target?: string }
const network = { selected: 'coding-agent', view: 'overview' as View, branch: 'skills' as Branch,
  labels: false, zoom: 1, panX: 0, panY: 0 };
let previousView = '';
let previousAgent = '';
let previousCount = 0;
const bezier = (x1: number, y1: number, x2: number, y2: number) =>
  `M${x1},${y1} C${x1 + (x2 - x1) * .55},${y1} ${x2 - (x2 - x1) * .42},${y2} ${x2},${y2}`;
const cut = (text: string, length = 28) => text.length > length ? text.slice(0, length - 1) + '…' : text;
function rays(x: number, y: number, radius: number, color: string, count = 100): string {
  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2;
    const start = radius * (1.06 + Math.sin(index * 3.1) * .04);
    const end = radius * (1.25 + (Math.sin(index * 7.3) + 1) * .19);
    return `<path d="M${x + Math.cos(angle) * start},${y + Math.sin(angle) * start} L${x + Math.cos(angle) * end},${y + Math.sin(angle) * end}" stroke="${color}" opacity="${.2 + (Math.sin(index * 1.3) + 1) * .27}"/>`;
  }).join('');
}
function orb(x: number, y: number, radius: number, color = 'gold', core = false): string {
  return `<g class="scene-orb ${core ? 'scene-core' : ''}">
    <circle class="orb-aura" cx="${x}" cy="${y}" r="${radius * 2.7}" fill="url(#aura-${color})"/>
    ${core ? `<g class="orb-corona" style="transform-origin:${x}px ${y}px">${rays(x, y, radius, color === 'gold' ? '#e6cd82' : '#ae9cdb', 150)}</g><circle class="orb-track" cx="${x}" cy="${y}" r="${radius * 1.72}"/><circle class="orb-track inner" cx="${x}" cy="${y}" r="${radius * 1.9}"/>` : ''}
    <circle class="orb-rim" cx="${x}" cy="${y}" r="${radius * 1.09}" stroke="${color === 'gold' ? '#e9dbac' : '#aaa2c6'}"/>
    <circle class="orb-surface" cx="${x}" cy="${y}" r="${radius}" fill="url(#sphere-${color})"/>
    <ellipse class="orb-highlight" cx="${x - radius * .32}" cy="${y - radius * .43}" rx="${radius * .3}" ry="${radius * .13}" fill="#fff" transform="rotate(-35 ${x - radius * .32} ${y - radius * .43})"/>
  </g>`;
}
// Shared vector geometry keeps agent identity consistent in overview and inspection.
function identity(x: number, y: number, size: number, key: string): string {
  const glyphs: Record<string, string> = {
    coding: '<path d="m18 16-8 8 8 8m12-16 8 8-8 8m-4-19-4 22"/>',
    research: '<path d="M14 8h17l5 5v12M14 8v31h13M30 8v7h6M19 19h9M19 24h5"/><circle cx="30" cy="30" r="8"/><path class="identity-accent" d="m36 36 6 6"/>',
    ops: '<path d="m24 7 4 5 6-1 3 6 5 3-2 6 1 6-6 3-3 6-6-1-6 2-3-5-6-3 1-6-5-4 3-6 6-1 3-5Z"/><circle cx="24" cy="24" r="7"/><path class="identity-accent" d="m21 24 2 2 4-5"/>',
    data: '<path d="M9 11v28h31M16 31V21h5v10m6 0V15h5v16"/><path class="identity-accent" d="m14 17 9-5 7 1 8-6"/>',
    router: '<path d="M24 10v13M12 34V23h24v11"/><circle cx="24" cy="9" r="4"/><circle cx="12" cy="37" r="4"/><circle cx="36" cy="37" r="4"/>',
    blackboard: '<path d="M8 9h32v27H8zM17 40h14M24 36v4"/><path class="identity-accent" d="M14 16h9m-9 6h20m-20 6h14"/>',
    trust: '<path d="m24 6 15 6v12c0 9-15 18-15 18S9 33 9 24V12Z"/><path class="identity-accent" d="m17 24 5 5 10-11"/>',
    runtime: '<path d="M7 24h8l5-12 8 25 5-13h8"/>',
    nexus: '<path d="m24 4 17 10v20L24 44 7 34V14Z"/><path d="M15 32V16l18 16V16M15 24h18"/>',
    custom: '<path d="m24 7 16 9v17l-16 9-16-9V16Z"/><path class="identity-accent" d="m8 16 16 9 16-9M24 25v17"/>',
  };
  const kind = Object.keys(glyphs).find((name) => key.toLowerCase().includes(name)) ?? 'custom';
  return `<g class="agent-identity identity-${kind}" aria-hidden="true" transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 48})"><path class="identity-tile" d="M10 1h28a9 9 0 0 1 9 9v28a9 9 0 0 1-9 9H10a9 9 0 0 1-9-9V10a9 9 0 0 1 9-9Z"/><g class="identity-lines">${glyphs[kind]}</g></g>`;
}
function definitions(): string {
  const colors: Record<string, [string, string, string]> = {
    gold: ['#fff6c9', '#cdbb7a', '#3c483a'], violet: ['#ded0fa', '#947cc3', '#362846'],
    rose: ['#ffe0eb', '#bb779d', '#493242'], cyan: ['#daf9ec', '#7cbea9', '#204c4b'],
  };
  return `<defs>${Object.entries(colors).map(([name, [light, middle, dark]]) =>
    `<radialGradient id="sphere-${name}" cx="32%" cy="24%" r="77%"><stop stop-color="${light}"/><stop offset=".33" stop-color="${middle}"/><stop offset=".79" stop-color="${dark}"/><stop offset="1" stop-color="#172024"/></radialGradient><radialGradient id="aura-${name}"><stop stop-color="${middle}" stop-opacity=".25"/><stop offset="1" stop-color="${middle}" stop-opacity="0"/></radialGradient>`).join('')}
    <linearGradient id="gold-wire"><stop stop-color="#a69f77"/><stop offset=".55" stop-color="#f2e1a9"/><stop offset="1" stop-color="#6d9b97"/></linearGradient>
    <linearGradient id="branch-glass"><stop stop-color="#102225"/><stop offset="1" stop-color="#223d3c"/></linearGradient>
    <filter id="scene-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>`;
}
function stream(path: string, index: number, bright = false): string {
  return `<path pathLength="1" class="orbital-wire ${bright ? 'lit' : ''}" d="${path}"/>
    <circle r="${bright ? 2.8 : 1.5}" class="flow-spark ${bright ? 'gold' : ''}" style="offset-path:path('${path}');--travel:${5 + index % 5}s;animation-delay:-${index % 7}s"/>`;
}
function overview(agents: AgentManifest[]): string {
  const center = { x: 780, y: 437 };
  const branches: string[] = [];
  const nodes: string[] = [];
  agents.forEach((agent, index) => {
    const angle = (-138 + index * 360 / Math.max(agents.length, 1)) * Math.PI / 180;
    const x = center.x + Math.cos(angle) * 410;
    const y = center.y + Math.sin(angle) * 252;
    branches.push(stream(`M${center.x},${center.y} L${x},${y}`, index, true));
    const caps = agent.capabilities.slice(0, 12);
    caps.forEach((capability, skillIndex) => {
      const smallAngle = angle + (skillIndex - (caps.length - 1) / 2) * .55;
      const reach = 60 + ((index * 31 + skillIndex * 23) % 67);
      const sx = x + Math.cos(smallAngle) * reach;
      const sy = y + Math.sin(smallAngle) * reach;
      const px = sx + Math.cos(smallAngle + 1.1) * 23;
      const py = sy + Math.sin(smallAngle + 1.1) * 23;
      branches.push(stream(`M${x},${y} L${sx},${sy} L${px},${py}`, index * 7 + skillIndex));
      nodes.push(`<g class="skill-satellite" aria-hidden="true">${orb(sx, sy, skillIndex % 3 === 0 ? 7 : 4, skillIndex % 2 ? 'violet' : 'cyan')}<circle class="satellite-tip" cx="${px}" cy="${py}" r="1.6"/><text class="satellite-name" x="${sx + 11}" y="${sy + 4}">${esc(cut(capability, 17))}</text></g>`);
    });
    const outputs = state.board.filter((entry) => entry.author === agent.id).length;
    const busy = state.busy && state.activeAgent === agent.id;
    nodes.push(`<g class="network-agent orbital-agent ${busy ? 'working' : ''}" role="button" tabindex="0" aria-label="Select ${esc(agent.name)} in network" aria-pressed="false" data-network-agent="${esc(agent.id)}">
      <rect class="agent-hit-area" x="${x - 26}" y="${y - 29}" width="245" height="62" rx="6"/>
      ${identity(x, y, 32, agent.id)}<text class="orbital-agent-name" x="${x + 27}" y="${y - 1}">${esc(cut(agent.name, 27))}</text>
      <text class="orbital-agent-meta" x="${x + 27}" y="${y + 17}">${agent.capabilities.length} skills <tspan>· ${outputs} outputs</tspan></text>
      ${busy ? `<circle class="working-ring" cx="${x}" cy="${y}" r="23"/>` : ''}
    </g>`);
  });
  // Real runtime services complete the map without inventing extra installed agents.
  const services: Array<[string, string, string, number, number, string[]]> = [
    ['router', 'Task router', 'Plan · match · reroute', 780, 138, ['Planner', 'Capability match', 'Failover']],
    ['blackboard', 'Shared blackboard', `${state.board.length} shared outputs`, 1280, 445, ['Shared context', 'Versions', 'Pub/sub']],
    ['trust', 'Trust layer', `${state.receipts.length} session receipts`, 790, 750, ['Sandbox', 'Self-healing', 'Ed25519']],
    ['runtime', 'Event stream', state.mode === 'preview' ? 'Preview data' : state.connected ? 'Connected' : 'Disconnected', 287, 445, ['WebSocket', 'REST API']],
  ];
  services.forEach(([id, name, meta, x, y, tags], index) => {
    const angle = Math.atan2(y - center.y, x - center.x);
    branches.push(stream(`M${center.x},${center.y} L${x},${y}`, index + 10, true));
    tags.forEach((tag, tagIndex) => {
      const a = angle + (tagIndex - 1) * .7;
      const tx = x + Math.cos(a) * (53 + tagIndex * 17);
      const ty = y + Math.sin(a) * (53 + tagIndex * 17);
      branches.push(stream(`M${x},${y} L${tx},${ty}`, index * 4 + tagIndex + 20));
      nodes.push(`<g class="skill-satellite" aria-hidden="true">${orb(tx, ty, 4, 'cyan')}<text class="satellite-name" x="${tx + 9}" y="${ty + 4}">${esc(tag)}</text></g>`);
    });
    nodes.push(`<g class="runtime-service network-agent" role="button" tabindex="0" aria-label="Open ${name}" data-network-service="${id}"><rect class="agent-hit-area" x="${x - 24}" y="${y - 26}" width="225" height="56" rx="6"/>${identity(x, y, 29, id)}<text class="orbital-agent-name service-name" x="${x + 22}" y="${y - 2}">${name}</text><text class="orbital-agent-meta" x="${x + 22}" y="${y + 15}">${esc(meta)}</text></g>`);
  });
  return `<g class="orbital-overview">${branches.join('')}${nodes.join('')}
    <g class="nexus-nucleus">${identity(center.x, center.y, 64, 'nexus')}<text class="nucleus-name" x="${center.x + 48}" y="${center.y - 4}">Nexus runtime</text><text class="nucleus-meta" x="${center.x + 48}" y="${center.y + 15}">${agents.length} installed ${agents.length === 1 ? 'agent' : 'agents'}</text></g>
    ${agents.length ? '' : '<text class="scene-empty" x="800" y="570" text-anchor="middle">Install an agent from the store to begin.</text>'}
  </g>`;
}
function getLeaves(agent: AgentManifest): Leaf[] {
  if (network.branch === 'skills') return agent.capabilities.map((capability) => ({ title: capability, meta: 'Declared capability', status: 'declared', action: 'skill', target: capability }));
  if (network.branch === 'outputs') return state.board.filter((entry) => entry.author === agent.id).map((entry) => ({ title: entry.key, meta: `Version ${entry.version}`, status: 'published', action: 'output', target: entry.key }));
  if (network.branch === 'workflow') return workflowShape(agent.id).nodes.map((node) => ({ title: node.title, meta: 'Inspect workflow step', status: 'step', action: 'workflow', target: node.key }));
  return state.receipts.slice(0, 12).map((receipt) => ({ title: receipt.task_id, meta: receipt.preview ? 'Unsigned preview' : 'Session execution receipt', status: receipt.preview ? 'preview' : 'signed', action: 'receipt', target: receipt.task_id }));
}
function focusGraph(agent: AgentManifest): string {
  const x = 175, y = 460;
  const outputs = state.board.filter((entry) => entry.author === agent.id);
  const branches: Array<[Branch, number, string]> = [['outputs', outputs.length, 'Shared outputs'], ['workflow', workflowShape(agent.id).nodes.length, 'Workflow steps'], ['skills', agent.capabilities.length, 'Capabilities'], ['receipts', state.receipts.length, 'Session receipts']];
  const leaves = getLeaves(agent);
  const selectedIndex = branches.findIndex(([branch]) => branch === network.branch);
  const branchY = 290 + selectedIndex * 100;
  const paths = branches.map((_, index) => stream(bezier(x + 42, y, 405, 290 + index * 100), index, index === selectedIndex)).join('');
  const leafPaths = leaves.slice(0, 15).map((_, index) => stream(bezier(590, branchY, 905 - Math.abs(index - (Math.min(leaves.length, 15) - 1) / 2) * 6, 165 + index * 540 / Math.max(1, Math.min(leaves.length, 15) - 1)), index + 4, true)).join('');
  const leafNodes = leaves.slice(0, 15).map((leaf, index) => {
    const ly = 165 + index * 540 / Math.max(1, Math.min(leaves.length, 15) - 1);
    const lx = 905 - Math.abs(index - (Math.min(leaves.length, 15) - 1) / 2) * 6;
    return `<g class="fan-leaf" role="button" tabindex="0" aria-label="Inspect ${esc(leaf.title)}" data-network-leaf="${esc(leaf.action ?? '')}" data-network-target="${esc(leaf.target ?? '')}"><rect class="leaf-hit-area" x="${lx - 12}" y="${ly - 19}" width="220" height="61" rx="6"/>${orb(lx, ly, 4.4, 'gold')}<text class="fan-leaf-title" x="${lx + 15}" y="${ly - 2}">${esc(cut(leaf.title, 26))}</text><text class="fan-leaf-meta" x="${lx + 15}" y="${ly + 15}">${esc(leaf.meta)}</text><rect class="leaf-state" x="${lx + 15}" y="${ly + 22}" width="${leaf.status.length * 5.5 + 11}" height="13" rx="2"/><text class="leaf-state-text" x="${lx + 20}" y="${ly + 31}">${esc(leaf.status)}</text></g>`;
  }).join('');
  return `<g class="focused-network"><circle class="focus-orbit" cx="${x}" cy="${y}" r="186"/>
    ${paths}${leafPaths}
    <g class="focused-agent network-agent" role="button" tabindex="0" aria-label="Select ${esc(agent.name)} in network" aria-pressed="true" data-network-agent="${esc(agent.id)}">${identity(x, y, 76, agent.id)}<text class="focused-agent-title" x="${x}" y="${y - 115}" text-anchor="middle">${esc(cut(agent.name, 25))}</text><text class="focused-agent-version" x="${x}" y="${y - 89}" text-anchor="middle">v${esc(agent.version)}</text><text class="focused-agent-state" x="${x}" y="${y + 110}" text-anchor="middle">${state.activeAgent === agent.id ? 'WORKING' : 'INSTALLED'}</text></g>
    ${branches.map(([branch, count, label], index) => `<g class="network-branch ${branch === network.branch ? 'selected' : ''}" role="button" tabindex="0" aria-pressed="${branch === network.branch}" aria-label="Show ${esc(label.toLowerCase())}" data-network-branch="${branch}"><rect x="405" y="${260 + index * 100}" width="185" height="64" rx="8"/><path class="branch-marker" d="M408 ${272 + index * 100}v38"/><text class="branch-count" x="425" y="${288 + index * 100}">${count}</text><text class="branch-name" x="425" y="${309 + index * 100}">${label}</text></g>`).join('')}
    ${!leaves.length ? `<text class="scene-empty" x="780" y="${branchY}">${network.branch === 'outputs' ? 'Run this agent to create shared outputs.' : 'Complete a task to receive a session receipt.'}</text>` : ''}
    ${leafNodes}
    ${leaves.length > 15 ? `<text class="scene-empty" x="920" y="770">${leaves.length - 15} more · open details to view all</text>` : ''}
  </g>`;
}
function renderInspector(agent: AgentManifest | undefined, entering: boolean) {
  const el = $('network-inspector');
  el.hidden = network.view !== 'focus' || !agent;
  el.classList.toggle('inspector-entering', entering);
  if (!agent) { el.innerHTML = ''; return; }
  const listing = state.mode === 'live' ? storeState.agents.find((item) => item.id === agent.id) : undefined;
  const outputs = state.board.filter((entry) => entry.author === agent.id);
  const text = listing?.installed_definition?.description ?? listing?.description ?? agent.capabilities.join(' · ');
  const latest = outputs.at(-1);
  el.innerHTML = `<div class="inspector-category"><span>${icon('agents')}${esc(listing?.category ?? 'Specialist')}</span><button class="icon-button" data-network-close aria-label="Close agent inspector">${icon('close')}</button></div>
    <h2>${esc(agent.name)}</h2><p class="inspector-description">${esc(text)}</p>
    <div class="inspector-status"><div><span class="label-tag">${state.mode === 'preview' ? 'Sample' : state.activeAgent === agent.id ? 'Working' : state.connected ? 'Available' : 'Disconnected'}</span><p>Version ${esc(agent.version)} · ${esc(listing?.publisher ?? 'Nexus')}</p></div><button class="button compact" data-agent="${esc(agent.id)}">Explore details ${icon('arrow')}</button></div>
    <div class="inspector-evidence"><div><span>Shared context</span><span class="label-tag neutral">${outputs.length ? 'Published' : 'No outputs yet'}</span></div><p>${latest ? esc(cut(pretty(latest.value), 180)) : 'Run a task to populate this agent’s shared context.'}</p>${latest ? `<button class="text-link" data-entry="${esc(latest.key)}">Open latest output ${icon('arrow')}</button>` : ''}</div>
    <div class="network-stat-grid"><button data-network-branch="skills">${icon('agents')}<strong>${agent.capabilities.length}</strong><span>Capabilities</span></button><button data-network-branch="outputs">${icon('file')}<strong>${outputs.length}</strong><span>Shared outputs</span></button><div>${icon('flow')}<strong>${esc(agent.timeout_secs)}s</strong><span>Task timeout</span></div><button data-network-branch="receipts">${icon('shield')}<strong>${state.receipts.length}</strong><span>Session receipts</span></button></div>
    <div class="inspector-footer"><button class="text-link" data-view-workflow="${esc(agent.id)}">${icon('flow')}Agent workflow</button><button class="button compact" data-network-use="${esc(agent.id)}">Use agent ${icon('arrow')}</button></div>`;
}
function centerMobile() {
  if (innerWidth <= 700 && network.panX === 0 && network.panY === 0) {
    const viewport = $('network-viewport');
    viewport.scrollLeft = network.view === 'focus' ? 0 : Math.max(0, ($('network-graph').clientWidth - viewport.clientWidth) / 2);
  }
}
function applyCamera() {
  $('network-graph').querySelector('#network-camera')?.setAttribute('transform', `translate(${800 * (1 - network.zoom) + network.panX} ${450 * (1 - network.zoom) + network.panY}) scale(${network.zoom})`);
}
export function renderNetwork() {
  const agents = state.agents;
  if (!agents.some((agent) => agent.id === network.selected)) {
    network.selected = agents[0]?.id ?? '';
    network.view = 'overview';
  }
  const selected = agents.find((agent) => agent.id === network.selected);
  const graph = $('network-graph');
  const focus = network.view === 'focus' && selected;
  const changingView = previousView !== network.view || previousAgent !== network.selected;
  const entering = changingView || previousCount === 0 && agents.length > 0;
  const focusedId = document.activeElement instanceof SVGElement ? document.activeElement.getAttribute('data-network-agent') : null;
  graph.dataset.view = network.view;
  graph.classList.toggle('show-labels', network.labels);
  graph.innerHTML = `${definitions()}<g id="network-camera"><g class="scene-layout ${entering ? 'entering' : ''}">${focus ? focusGraph(selected) : overview(agents)}</g></g>`;
  applyCamera();
  requestAnimationFrame(centerMobile);
  if (entering && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    graph.querySelector('.scene-layout')?.animate(focus
      ? [{ opacity: 0, transform: 'translate(100px,0) scale(.95)' }, { opacity: 1, transform: 'translate(0,0) scale(1)' }]
      : [{ opacity: 0, transform: 'translate(80px,40px) scale(.9)' }, { opacity: 1, transform: 'translate(0,0) scale(1)' }],
    { duration: 850, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  previousView = network.view;
  previousAgent = network.selected;
  previousCount = agents.length;
  if (focusedId) graph.querySelector<SVGGElement>(`[data-network-agent="${CSS.escape(focusedId)}"]`)?.focus({ preventScroll: true });
  $('network-overview').setAttribute('aria-pressed', String(network.view === 'overview'));
  $('network-focus').setAttribute('aria-pressed', String(network.view === 'focus'));
  $('network-focus').disabled = !selected;
  $('network-labels').setAttribute('aria-pressed', String(network.labels));
  $('network-total').textContent = `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} · ${state.board.length} outputs`;
  $('network-caption').textContent = state.mode === 'preview' ? 'Preview network · sample data' : state.connected ? 'Live agent network' : 'Connecting to your network…';
  document.querySelector('.nexus-observatory')?.setAttribute('data-view', network.view);
  renderInspector(selected, changingView);
  $('dock-telemetry').innerHTML = `<span><small>Installed agents</small><strong>${agents.length}</strong></span><span><small>Shared outputs</small><strong>${state.board.length}</strong></span><span><small>Session receipts</small><strong>${state.receipts.length}</strong></span><span><small>Runtime</small><strong class="dock-runtime">${state.busy ? 'Running' : state.mode === 'preview' ? 'Preview' : state.connected ? 'Ready' : 'Offline'}</strong></span>`;
}
function chooseAgent(id: string) {
  if (!state.agents.some((agent) => agent.id === id)) return;
  network.selected = id;
  network.view = 'focus';
  network.branch = 'skills';
  network.zoom = 1; network.panX = 0; network.panY = 0;
  if (state.mode === 'live') $('task-agent').value = id;
  renderNetwork();
}
function reset() {
  network.view = 'overview'; network.zoom = 1; network.panX = 0; network.panY = 0;
  renderNetwork();
}
function inspectLeaf(action: string, target: string) {
  if (action === 'skill') dialog('Declared capability', `<span class="label-tag">${esc(target)}</span><p style="margin-top:16px">This capability is declared by ${esc(state.agents.find((agent) => agent.id === network.selected)?.name)}. Nexus uses capability tags to route subtasks; a tag is not an independent skill verification.</p>`);
  if (action === 'output') {
    const entry = state.board.find((item) => item.key === target);
    if (entry) dialog('Shared output', `<p>${esc(entry.key)} · v${entry.version}</p><pre class="code">${esc(pretty(entry.value))}</pre>`);
  }
  if (action === 'workflow') {
    selectWorkflow(network.selected, true);
    $('workflow-canvas').querySelector<HTMLButtonElement>(`[data-workflow-node="${CSS.escape(target)}"]`)?.click();
  }
  if (action === 'receipt') navigate('trust');
}
export function setupNetwork() {
  new ResizeObserver(() => requestAnimationFrame(centerMobile)).observe($('network-viewport'));
  const dock = document.querySelector<HTMLElement>('.composer-card');
  const studio = document.querySelector<HTMLElement>('.nexus-observatory');
  if (dock && studio) new ResizeObserver(() => studio.style.setProperty('--task-dock-height', `${dock.offsetHeight}px`)).observe(dock);
  $('task-input').addEventListener('input', () => {
    const field = $('task-input');
    field.style.height = '45px';
    field.style.height = `${Math.min(125, Math.max(45, field.scrollHeight))}px`;
  });
  const activate = (element: Element) => {
    const agent = element.closest<SVGGElement>('[data-network-agent]');
    const branch = element.closest<SVGGElement>('[data-network-branch]');
    const leaf = element.closest<SVGGElement>('[data-network-leaf]');
    const service = element.closest<SVGGElement>('[data-network-service]')?.dataset.networkService;
    if (service) navigate(({ router: 'executions', blackboard: 'blackboard', trust: 'trust', runtime: 'runtime' } as Record<string, string>)[service] ?? 'runtime');
    if (agent?.dataset.networkAgent) chooseAgent(agent.dataset.networkAgent);
    if (branch?.dataset.networkBranch) { network.branch = branch.dataset.networkBranch as Branch; renderNetwork(); }
    if (leaf?.dataset.networkLeaf) inspectLeaf(leaf.dataset.networkLeaf, leaf.dataset.networkTarget ?? '');
  };
  $('network-graph').addEventListener('click', (event) => { if (event.target instanceof Element) activate(event.target); });
  $('network-graph').addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key) || !(event.target instanceof Element)) return;
    event.preventDefault(); activate(event.target);
  });
  $('network-overview').onclick = reset;
  $('network-focus').onclick = () => chooseAgent(network.selected);
  $('network-labels').onclick = () => { network.labels = !network.labels; $('network-graph').classList.toggle('show-labels', network.labels); $('network-labels').setAttribute('aria-pressed', String(network.labels)); };
  $('network-zoom-in').onclick = () => { network.zoom = Math.min(1.8, network.zoom + .15); applyCamera(); };
  $('network-zoom-out').onclick = () => { network.zoom = Math.max(.55, network.zoom - .15); applyCamera(); };
  $('network-reset').onclick = reset;
  $('studio-evidence').onclick = () => $('agent-workflow').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const graph = $('network-graph');
  let drag: { id: number; x: number; y: number; panX: number; panY: number } | null = null;
  const point = (event: PointerEvent) => { const p = new DOMPoint(event.clientX, event.clientY); return graph.getScreenCTM() ? p.matrixTransform(graph.getScreenCTM()!.inverse()) : p; };
  graph.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target instanceof Element && event.target.closest('[role="button"]')) return;
    const p = point(event); drag = { id: event.pointerId, x: p.x, y: p.y, panX: network.panX, panY: network.panY };
    graph.setPointerCapture(event.pointerId); graph.classList.add('is-dragging');
  });
  graph.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event); network.panX = drag.panX + p.x - drag.x; network.panY = drag.panY + p.y - drag.y; applyCamera();
  });
  const stopDrag = () => { drag = null; graph.classList.remove('is-dragging'); };
  graph.addEventListener('pointerup', stopDrag); graph.addEventListener('pointercancel', stopDrag);
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button) return;
    if (button.hasAttribute('data-network-close')) reset();
    if (button.dataset.networkBranch) { network.branch = button.dataset.networkBranch as Branch; renderNetwork(); }
    const agent = state.agents.find((item) => item.id === button.dataset.networkUse);
    if (!agent) return;
    if (state.mode === 'preview') { toast('Connect a live server to run a selected agent.'); return; }
    $('task-agent').value = agent.id;
    const listing = storeState.agents.find((item) => item.id === agent.id);
    $('task-input').value = listing?.installed_definition?.sample_task ?? '';
    $('task-input').focus();
  });
  document.querySelectorAll<HTMLButtonElement>('.nav-link').forEach((button) => button.title = button.textContent?.trim().replace(/\s+/g, ' ') ?? '');
}
