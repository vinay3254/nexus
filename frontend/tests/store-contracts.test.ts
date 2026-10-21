import { describe, expect, it } from 'vitest';
import { parseDefinition, parseStore } from '../src/store-types';

const definition = {
  id: 'writer-agent', name: 'Draft Editor', publisher: 'My team', version: '1.0.0',
  category: 'Writing', capabilities: ['writing'], description: 'Edits supplied drafts.',
  system_prompt: 'Edit supplied drafts, preserving meaning.', sample_task: 'Edit this sentence.', timeout_secs: 45,
};
const listing = { ...definition, source: 'local', permissions: ['Send task text to configured model'],
  available: true, installed: false, enabled: false, installed_version: null, installed_definition: null, update_available: false };

describe('store contracts', () => {
  it('exports only shareable definition fields', () => {
    expect(parseDefinition({ ...listing, verified: true })).toEqual(definition);
  });
  it('keeps installed version and latest version separate', () => {
    const updated = { ...listing, version: '2.0.0', installed: true, enabled: true,
      installed_version: '1.0.0', installed_definition: definition, update_available: true };
    const [parsed] = parseStore([updated]);
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.installed_definition?.version).toBe('1.0.0');
    expect(parsed.update_available).toBe(true);
  });
  it('rejects malformed lifecycle and permission values', () => {
    for (const mutation of [{ source: 'verified' }, { enabled: 'true' }, { permissions: [true] }, { installed_version: 1 }, { installed_definition: {} }])
      expect(() => parseStore([{ ...listing, ...mutation }])).toThrow();
    expect(() => parseDefinition({ ...definition, timeout_secs: Infinity })).toThrow();
  });
});
