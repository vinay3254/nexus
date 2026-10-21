import { isRecord } from './types';

export const categories = ['Development', 'Research', 'Data', 'Operations', 'Writing', 'Productivity'] as const;
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  publisher: string;
  version: string;
  category: string;
  capabilities: string[];
  system_prompt: string;
  sample_task: string;
  timeout_secs: number;
}
export interface StoreAgent extends AgentDefinition {
  source: 'builtin' | 'local' | 'plugin';
  permissions: string[];
  available: boolean;
  installed: boolean;
  enabled: boolean;
  installed_version: string | null;
  installed_definition: AgentDefinition | null;
  update_available: boolean;
}
export function parseDefinition(value: unknown): AgentDefinition {
  if (!isRecord(value)) throw new Error('Agent definition must be a JSON object.');
  const keys = ['id', 'name', 'description', 'publisher', 'version', 'category', 'system_prompt', 'sample_task'] as const;
  for (const key of keys) if (typeof value[key] !== 'string') throw new Error(`Agent definition requires ${key}.`);
  if (!Array.isArray(value.capabilities) || !value.capabilities.every((item: unknown) => typeof item === 'string') ||
      typeof value.timeout_secs !== 'number' || !Number.isFinite(value.timeout_secs)) throw new Error('Invalid capabilities or timeout.');
  return {
    id: String(value.id), name: String(value.name), description: String(value.description), publisher: String(value.publisher),
    version: String(value.version), category: String(value.category), system_prompt: String(value.system_prompt),
    sample_task: String(value.sample_task), capabilities: value.capabilities as string[], timeout_secs: value.timeout_secs,
  };
}
export function parseStore(value: unknown): StoreAgent[] {
  if (!Array.isArray(value)) throw new Error('Invalid catalog response.');
  return value.map((item: unknown) => {
    const definition = parseDefinition(item);
    if (!isRecord(item) || !['builtin', 'local', 'plugin'].includes(String(item.source)) ||
      !Array.isArray(item.permissions) || !item.permissions.every((permission: unknown) => typeof permission === 'string') ||
      ['available', 'installed', 'enabled', 'update_available'].some((key) => typeof item[key] !== 'boolean') ||
      !(item.installed_version === null || typeof item.installed_version === 'string')) throw new Error('Invalid catalog lifecycle state.');
    return { ...definition, source: item.source as StoreAgent['source'], permissions: item.permissions as string[],
      available: item.available as boolean, installed: item.installed as boolean, enabled: item.enabled as boolean,
      update_available: item.update_available as boolean, installed_version: item.installed_version as string | null,
      installed_definition: item.installed_definition === null ? null : parseDefinition(item.installed_definition) };
  });
}
