export const pages = [
  'store',
  'workspace',
  'agents',
  'blackboard',
  'executions',
  'trust',
  'runtime',
] as const;
export type Page = (typeof pages)[number];
export type EventKind = 'activity' | 'sandbox' | 'output' | 'receipt' | 'error';
export type EventFilter = EventKind | 'all';
export interface AgentManifest {
  id: string;
  name: string;
  capabilities: string[];
  version: string;
  timeout_secs: number;
  symbol?: string;
  desc?: string;
}
export interface BoardEntry {
  key: string;
  value: unknown;
  author: string;
  version: number;
  timestamp?: string;
}
export interface ActivityEvent {
  kind: EventKind;
  message: string;
  time: string;
  timestamp?: string;
}
export type PlanStep = [agentId: string, description: string];
export interface TaskRun {
  task: string;
  status: string;
  time: string;
  preview: boolean;
  plan?: PlanStep[];
}
export interface Receipt {
  task_id: string;
  payload_digest: string;
  signature?: string;
  public_key?: string;
  timestamp: string;
  preview?: boolean;
  verified?: boolean;
}
export interface SandboxEvent {
  type?: 'sandbox_event';
  message: string;
  status?: string;
  code?: string;
  stderr?: string;
  healed_code?: string;
}
export type ServerMessage =
  | { type: 'catalog_changed' }
  | { type: 'log'; message: string }
  | ({ type: 'blackboard_update' } & Omit<BoardEntry, 'timestamp'>)
  | ({ type: 'sandbox_event' } & SandboxEvent)
  | ({ type: 'receipt' } & Receipt);
export interface AppState {
  mode: 'preview' | 'live';
  agents: AgentManifest[];
  board: BoardEntry[];
  events: ActivityEvent[];
  receipts: Receipt[];
  runs: TaskRun[];
  sandbox: SandboxEvent[];
  busy: boolean;
  socket: WebSocket | null;
  epoch: number;
  retry: number;
  timer: ReturnType<typeof setTimeout> | null;
  filter: EventFilter;
  overviewFilter: EventFilter;
  page: Page;
  max: number;
  connected: boolean;
  base: string;
  sample: boolean;
  boardSequence: number;
  activeAgent: string | null;
}
export type NodeKey =
  'route' | 'system' | 'prompt' | 'model' | 'publish' | 'receipt' | 'sandbox' | 'heal';
export type NodeStatus = 'pending' | 'routed' | 'sandbox' | 'healed' | 'completed' | 'error';
export type WorkflowProgress = Partial<Record<NodeKey, NodeStatus>> & {
  note?: string;
  sandboxEvent?: SandboxEvent;
};
export interface WorkflowState {
  agent: string;
  selected: NodeKey | null;
  progress: Record<string, WorkflowProgress>;
  task: string;
  preview: boolean;
}
export interface WorkflowSpec {
  prefix: string;
  model: string;
  system: string;
  prompt: string;
  field: string;
  code: boolean;
  source: string;
  custom?: boolean;
}
export interface WorkflowNode {
  key: NodeKey;
  title: string;
  x: number;
  y: number;
  description: string;
}
export type WorkflowEdge = [from: NodeKey, to: NodeKey, label?: string];
export interface WorkflowShape {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  width: number;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function isPage(value: string): value is Page {
  return pages.some((page) => page === value);
}
export function isNodeKey(value: string | undefined): value is NodeKey {
  return ['route', 'system', 'prompt', 'model', 'publish', 'receipt', 'sandbox', 'heal'].includes(
    value ?? '',
  );
}
export function eventFilter(value: string): EventFilter {
  return ['activity', 'sandbox', 'output', 'receipt', 'error'].includes(value)
    ? (value as EventKind)
    : 'all';
}
