import { $, esc, icon, pretty, dialog } from './dom';
import { state } from './models';
import { storeState } from './store';
import { navigate } from './routing';
import type {
  NodeKey,
  NodeStatus,
  WorkflowState,
  WorkflowSpec,
  WorkflowShape,
  WorkflowNode,
  WorkflowEdge,
  WorkflowProgress,
  PlanStep,
  ServerMessage,
} from './types';
export const workflow: WorkflowState = {
  agent: 'coding-agent',
  selected: null,
  progress: {},
  task: '',
  preview: true,
};
export const workflowSpecs: Record<string, WorkflowSpec> = {
  'coding-agent': {
    prefix: 'CD',
    model: 'Generate Python code',
    system: 'Expert software developer. Return working code without fluff.',
    prompt: 'Write clean, executable Python code for: ',
    field: 'code',
    code: true,
    source: 'agents/coding.py',
  },
  'research-agent': {
    prefix: 'RS',
    model: 'Synthesize research',
    system: 'Senior research analyst. Focus on facts, evidence, and structured summaries.',
    prompt: 'Conduct comprehensive research and provide concise synthesis for: ',
    field: 'summary',
    code: false,
    source: 'agents/research.py',
  },
  'data-agent': {
    prefix: 'DT',
    model: 'Analyze & transform data',
    system: 'Expert data engineer and scientist. Deliver structured data outputs.',
    prompt: 'Perform data analysis, extraction, or transformation for: ',
    field: 'data',
    code: false,
    source: 'agents/data.py',
  },
  'ops-agent': {
    prefix: 'OP',
    model: 'Generate ops instructions',
    system: 'Site Reliability and DevOps engineer. Ensure high safety and idempotency.',
    prompt: 'Write operational shell automation or deployment instructions for: ',
    field: 'ops',
    code: true,
    source: 'agents/ops.py',
  },
};
export function workflowSpec(id: string): WorkflowSpec {
  const listing = state.mode === 'live' ? storeState.agents.find((agent) => agent.id === id) : undefined;
  if (listing?.source === 'local' && listing.installed_definition) {
    return { prefix: 'AG', model: 'Generate response', field: 'result', code: false,
      source: 'app_store/catalog.py · installed prompt definition',
      system: listing.installed_definition.system_prompt, prompt: '' };
  }
  return (
    workflowSpecs[id] || {
      prefix: 'AG',
      model: 'Execute plugin worker',
      field: 'output',
      code: false,
      source: 'Plugin manifest',
      custom: true,
      system: 'Plugin-defined',
      prompt: '',
    }
  );
}
export function workflowShape(id: string): WorkflowShape {
  const s = workflowSpec(id),
    n = (key: NodeKey, title: string, x: number, y: number, description: string): WorkflowNode => ({
      key,
      title,
      x,
      y,
      description,
    });
  if (s.custom)
    return {
      nodes: [
        n(
          'route',
          'Route to plugin',
          30,
          128,
          'The supervisor selects this worker by its registered capabilities.',
        ),
        n(
          'model',
          'Execute custom agent',
          248,
          128,
          'Plugin-defined execute() method. Internal steps are not exposed by its manifest.',
        ),
        n(
          'publish',
          'Shared output (if emitted)',
          466,
          128,
          'Only an observed blackboard update confirms a plugin output.',
        ),
        n(
          'receipt',
          'Merged task receipt',
          684,
          128,
          'The server signs the merged task output, not an individual worker result.',
        ),
      ],
      edges: [
        ['route', 'model'],
        ['model', 'publish'],
        ['model', 'receipt'],
      ],
      width: 900,
    };
  const nodes = [
    n(
      'route',
      'Route specialist task',
      26,
      128,
      'The planner creates a subtask. The supervisor matches its tags to agent capabilities.',
    ),
    n('system', 'Set specialist role', 246, 42, s.system),
    n('prompt', 'Build task prompt', 246, 214, s.prompt + 'your task'),
    n(
      'model',
      s.model,
      466,
      128,
      'The agent calls the configured LLM with the system role and task prompt.',
    ),
    n(
      'publish',
      'Publish ' + s.field + ' output',
      686,
      42,
      `Write { ${s.field}: result } to ${id}:output, with agent authorship and an incremented entry version.`,
    ),
    n(
      'receipt',
      'Merge & sign task',
      1064,
      128,
      'The server merges subtask results, hashes the payload with SHA-256, and signs one task receipt with Ed25519.',
    ),
  ];
  const edges: WorkflowEdge[] = [
    ['route', 'system'],
    ['route', 'prompt'],
    ['system', 'model'],
    ['prompt', 'model'],
    ['model', 'publish'],
  ];
  if (s.code) {
    nodes.push(
      n(
        'sandbox',
        'Execute in sandbox',
        686,
        214,
        'The server runs code through Bubblewrap. Successful output proceeds to the merged result.',
      ),
      n(
        'heal',
        'Repair & retry',
        906,
        214,
        'Conditional branch: stderr is returned to the LLM for repair. The server permits up to two retries.',
      ),
    );
    edges.push(
      ['model', 'sandbox'],
      ['sandbox', 'receipt'],
      ['sandbox', 'heal', 'on failure'],
      ['heal', 'sandbox', 'retry'],
    );
  } else {
    nodes.find((n) => n.key === 'receipt')!.x = 906;
    edges.push(['model', 'receipt']);
  }
  return { nodes, edges, width: s.code ? 1256 : 1110 };
}
export function resetWorkflow(sample = false) {
  workflow.progress = {};
  workflow.selected = null;
  workflow.preview = sample;
  workflow.task = sample ? 'Clean CSV data and write a summary report' : '';
  if (sample) {
    for (const id of ['coding-agent', 'data-agent', 'research-agent']) {
      workflow.progress[id] = {
        route: 'completed',
        system: 'completed',
        prompt: 'completed',
        model: 'completed',
        publish: 'completed',
        receipt: 'completed',
        note: 'Illustrative example. No execution evidence.',
      };
      if (id === 'coding-agent')
        Object.assign(workflow.progress[id], { sandbox: 'completed', heal: 'healed' });
    }
  }
}
export function workflowUpdate(id: string | null | undefined, values: WorkflowProgress) {
  if (!id) return;
  workflow.progress[id] = { ...(workflow.progress[id] || {}), ...values };
  renderWorkflow();
}
export function beginWorkflow(task: string, p: PlanStep[], preview: boolean) {
  resetWorkflow(false);
  workflow.preview = preview;
  workflow.task = task;
  workflow.agent = p[0]?.[0] || workflow.agent;
  for (const [id] of p) workflow.progress[id] = {};
  renderWorkflow();
}
export function selectWorkflow(id: string, focus = false) {
  workflow.agent = id;
  workflow.selected = null;
  navigate('workspace');
  renderWorkflow();
  if (focus) {
    $('agent-workflow').focus({ preventScroll: true });
    const bounds = $('agent-workflow').getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + bounds.top - 20,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
}
export function workflowStatus(key: NodeKey): NodeStatus {
  return workflow.progress[workflow.agent]?.[key] || 'pending';
}
export function workflowEdgePath(from: WorkflowNode, to: WorkflowNode, label?: string) {
  const x1 = from.x + 162,
    y1 = from.y + 31,
    x2 = to.x,
    y2 = to.y + 31;
  if (from.key === 'sandbox' && to.key === 'receipt')
    return `M ${x1} ${y1} C ${x1 + 30} ${y1} ${x1 + 30} ${y2} ${x1 + 70} ${y2} L ${x2} ${y2}`;
  if (label === 'retry')
    return `M ${from.x + 81} ${from.y + 62} C ${from.x + 81} 311 ${to.x + 81} 311 ${to.x + 81} ${to.y + 62}`;
  if (label === 'on failure')
    return `M ${x1} ${y1} C ${x1 + 28} ${y1} ${x2 - 28} ${y2} ${x2} ${y2}`;
  return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.5} ${y1} ${x2 - (x2 - x1) * 0.5} ${y2} ${x2} ${y2}`;
}
export function renderWorkflow() {
  const agents = state.agents;
  if (!agents.some((a) => a.id === workflow.agent)) {
    workflow.agent = agents[0]?.id || '';
    workflow.selected = null;
  }
  const focused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.workflowNode
      : undefined;
  $('workflow-tabs').innerHTML = agents
    .map(
      (a) =>
        `<button class="workflow-tab" role="tab" id="wf-tab-${esc(a.id)}" aria-controls="workflow-viewport" aria-selected="${a.id === workflow.agent}" tabindex="${a.id === workflow.agent ? 0 : -1}" data-workflow-agent="${esc(a.id)}"><span class="dot"></span>${esc(a.name.replace(' Specialist', ''))}</button>`,
    )
    .join('');
  if (!agents.length) {
    $('workflow-canvas').style.width = '100%';
    $('workflow-canvas').innerHTML =
      '<p class="workflow-empty">Connect to a registered worker to inspect its workflow.</p>';
    $('workflow-count').textContent = 'No registered agents';
    $('workflow-branch').textContent = '';
    $('workflow-inspector').hidden = true;
    return;
  }
  const shape = workflowShape(workflow.agent),
    spec = workflowSpec(workflow.agent),
    agent = agents.find((a) => a.id === workflow.agent)!,
    p = workflow.progress[workflow.agent] || {};
  $('workflow-viewport').setAttribute('aria-labelledby', 'wf-tab-' + workflow.agent);
  $('workflow-subtitle').textContent =
    `${agent.name} · ${workflow.preview ? 'Illustrative preview' : 'Observed server events; internal steps may be unreported'} · Click a node to inspect`;
  $('workflow-canvas').style.width = shape.width + 'px';
  const edges = shape.edges
    .map(([a, b, label]) => {
      const from = shape.nodes.find((n) => n.key === a)!,
        to = shape.nodes.find((n) => n.key === b)!,
        status = label === 'retry' ? workflowStatus('heal') : workflowStatus(b);
      return `<path class="workflow-edge ${workflow.selected !== null && [a, b].includes(workflow.selected) ? 'is-selected' : ''}" data-status="${esc(status)}" d="${workflowEdgePath(from, to, label)}"/>${label ? `<text class="workflow-edge-label" x="${label === 'retry' ? 890 : 865}" y="${label === 'retry' ? 316 : 236}">${esc(label)}</text>` : ''}`;
    })
    .join('');
  $('workflow-canvas').innerHTML =
    `<svg class="workflow-edges" style="width:${shape.width}px" viewBox="0 0 ${shape.width} 322" aria-hidden="true">${edges}</svg>` +
    shape.nodes
      .map(
        (n, i) =>
          `<button class="workflow-node" data-workflow-node="${n.key}" data-status="${workflowStatus(n.key)}" style="left:${n.x}px;top:${n.y}px" aria-pressed="${workflow.selected === n.key}" aria-label="${esc(n.title)}: ${workflowStatus(n.key)}"><span class="workflow-node-code">${spec.prefix}-${String(i + 1).padStart(3, '0')}<span class="dot"></span></span><span class="workflow-node-name">${esc(n.title)}</span></button>`,
      )
      .join('');
  $('workflow-count').innerHTML =
    icon('flow') + `${shape.nodes.length} nodes · ${shape.edges.length} edges`;
  $('workflow-branch').textContent = spec.code
    ? 'Conditional repair loop · max 2 retries'
    : spec.custom
      ? 'Plugin-defined execution'
      : 'Text output · no code sandbox';
  $('workflow-source').textContent = workflow.preview
    ? 'Preview · workflow source'
    : 'Live events · workflow source';
  renderWorkflowInspector();
  if (focused)
    $('workflow-canvas')
      .querySelector<HTMLButtonElement>(`[data-workflow-node="${focused}"]`)
      ?.focus({ preventScroll: true });
}
export function renderWorkflowInspector() {
  const node = workflowShape(workflow.agent).nodes.find((n) => n.key === workflow.selected),
    el = $('workflow-inspector');
  el.hidden = !node;
  if (!node) return;
  const s = workflowSpec(workflow.agent),
    p = workflow.progress[workflow.agent] || {},
    status = workflowStatus(node.key),
    entry = state.board.find((e) => e.author === workflow.agent),
    isCode = ['sandbox', 'heal'].includes(node.key),
    event =
      p.sandboxEvent ||
      (workflow.preview && state.sample && workflow.agent === 'coding-agent'
        ? state.sandbox[0]
        : undefined);
  let value, heading;
  if (node.key === 'publish') {
    heading = 'Shared output';
    value = entry ? pretty(entry.value) : 'No output observed for this agent.';
  } else if (node.key === 'model') {
    heading = 'Agent result';
    value = entry ? pretty(entry.value) : 'Awaiting an observed agent output.';
  } else if (node.key === 'prompt') {
    heading = 'Task prompt';
    value = s.custom ? 'Plugin-defined' : s.prompt + (workflow.task || 'Your next task');
  } else if (node.key === 'system') {
    heading = 'System role';
    value = s.system;
  } else if (isCode) {
    heading = node.key === 'heal' ? 'Repair evidence' : 'Sandbox evidence';
    value = event
      ? pretty({
          ...(event.code ? { code: event.code } : {}),
          ...(event.stderr ? { stderr: event.stderr } : {}),
          ...(event.healed_code ? { healed_code: event.healed_code } : {}),
          status: event.status || event.message,
        })
      : 'No sandbox evidence observed for this agent.';
  } else if (node.key === 'receipt') {
    heading = 'Task-level receipt';
    value =
      p.receipt === 'completed'
        ? pretty(state.receipts[0] || 'Receipt observed.')
        : 'No task receipt observed for this workflow.';
  } else {
    heading = 'Routing';
    value = workflow.task || 'Describe a task to see its routing.';
  }
  const unreported = !workflow.preview && ['system', 'prompt'].includes(node.key);
  el.innerHTML = `<div><div class="workflow-detail-top"><span class="workflow-status" data-status="${status}">${esc(status)}${unreported ? ' · unreported' : ''}</span><button class="text-link" id="workflow-inspector-close">Close ${icon('close')}</button></div><h3>${esc(node.title)}</h3><p class="secondary">${esc(node.description)}</p><dl class="definition"><dt>Worker</dt><dd>${esc(workflow.agent)}</dd><dt>Evidence</dt><dd>${workflow.preview ? 'Preview simulation' : unreported ? 'No step-level server event' : status === 'pending' ? 'No matching event received' : 'Observed server event'}</dd><dt>Source</dt><dd>${esc(['sandbox', 'heal', 'receipt'].includes(node.key) ? 'server/app.py' : s.source)}</dd></dl></div><div><p class="eyebrow">${esc(heading)}</p><pre class="code">${esc(value)}</pre></div>`;
}
export function observeWorkflow(data: ServerMessage) {
  if (state.mode !== 'live') return;
  if (data.type === 'log') {
    const msg = String(data.message || '');
    if (/Decomposing/.test(msg)) {
      resetWorkflow(false);
      workflow.preview = false;
      workflow.task = msg.replace(/^.*Decomposing task:\s*'?/, '').replace(/'$/, '');
      renderWorkflow();
    }
    const routed = msg.match(/Routed subtask.*? to ([\w-]+)/);
    if (routed) {
      workflowUpdate(routed[1], { route: 'routed' });
    }
    if (/Sandbox execution and self-healing passed/.test(msg) && state.activeAgent) {
      workflowUpdate(state.activeAgent, { sandbox: 'completed' });
    }
  }
  if (data.type === 'blackboard_update')
    workflowUpdate(data.author, { route: 'completed', model: 'completed', publish: 'completed' });
  if (data.type === 'sandbox_event') {
    const id = state.activeAgent;
    if (id) {
      const values: WorkflowProgress = {
        sandbox:
          data.status === 'error' ? 'error' : data.status === 'repaired' ? 'completed' : 'sandbox',
        sandboxEvent: data,
      };
      if (data.status === 'repaired') values.heal = 'healed';
      workflowUpdate(id, values);
    }
  }
  if (data.type === 'receipt') {
    for (const id of Object.keys(workflow.progress)) workflow.progress[id].receipt = 'completed';
    renderWorkflow();
  }
}
