import {
  isRecord,
  type AgentManifest,
  type BoardEntry,
  type Receipt,
  type SandboxEvent,
  type ServerMessage,
} from './types';

export function parseAgents(value: unknown): AgentManifest[] {
  if (!Array.isArray(value)) throw new Error('Invalid agent registry response.');
  return value.map((agent: unknown) => {
    if (
      !isRecord(agent) ||
      typeof agent.id !== 'string' ||
      typeof agent.name !== 'string' ||
      !Array.isArray(agent.capabilities) ||
      !agent.capabilities.every((tag: unknown) => typeof tag === 'string') ||
      typeof agent.version !== 'string' ||
      typeof agent.timeout_secs !== 'number'
    )
      throw new Error('Invalid agent registry response.');
    return {
      id: agent.id,
      name: agent.name,
      capabilities: agent.capabilities as string[],
      version: agent.version,
      timeout_secs: agent.timeout_secs,
    };
  });
}
export function parseEntry(value: unknown): BoardEntry {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.author !== 'string' ||
    typeof value.version !== 'number' ||
    !Number.isFinite(value.version)
  )
    throw new Error('Invalid blackboard response.');
  return {
    key: value.key,
    author: value.author,
    version: value.version,
    value: value.value,
    ...(typeof value.timestamp === 'string' ? { timestamp: value.timestamp } : {}),
  };
}
export function parseBoard(value: unknown): BoardEntry[] {
  if (!Array.isArray(value)) throw new Error('Invalid blackboard response.');
  return value.map(parseEntry);
}
export function parseReceipt(value: unknown): Receipt {
  if (
    !isRecord(value) ||
    typeof value.task_id !== 'string' ||
    typeof value.payload_digest !== 'string' ||
    typeof value.signature !== 'string' ||
    typeof value.timestamp !== 'string'
  )
    throw new Error('Invalid receipt fields.');
  return {
    task_id: value.task_id,
    payload_digest: value.payload_digest,
    signature: value.signature,
    timestamp: value.timestamp,
    ...(typeof value.public_key === 'string' ? { public_key: value.public_key } : {}),
  };
}
export function parseServerMessage(value: unknown): ServerMessage {
  if (!isRecord(value)) throw new Error('Invalid server event.');
  switch (value.type) {
    case 'catalog_changed': return { type: 'catalog_changed' };
    case 'log':
      if (typeof value.message === 'string') return { type: 'log', message: value.message };
      break;
    case 'blackboard_update':
      return { type: 'blackboard_update', ...parseEntry(value) };
    case 'receipt':
      return { type: 'receipt', ...parseReceipt(value) };
    case 'sandbox_event': {
      if (typeof value.message !== 'string') break;
      const event: SandboxEvent = { message: value.message };
      for (const key of ['code', 'stderr', 'healed_code', 'status'] as const)
        if (typeof value[key] === 'string') event[key] = value[key];
      return { type: 'sandbox_event', ...event };
    }
  }
  throw new Error('Unsupported or malformed server event.');
}
