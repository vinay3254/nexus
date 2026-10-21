import { state } from './models';
import { isRecord } from './types';

export async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(state.base + path, { ...options, signal: AbortSignal.timeout(10000) });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isRecord(data) ? data.detail : null;
    const message = typeof detail === 'string' ? detail
      : Array.isArray(detail) ? detail.map((item: unknown) => isRecord(item) ? `${Array.isArray(item.loc) ? item.loc.slice(1).join('.') : 'Field'}: ${String(item.msg)}` : 'Invalid field').join('; ')
      : `Server returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  return data;
}
