import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import * as components from '../src/index';
it('exports every component consumed by the native manifest loader', () => {
  const manifest: unknown = JSON.parse(readFileSync('components.json', 'utf8'));
  if (typeof manifest !== 'object' || manifest === null || !('components' in manifest) || typeof manifest.components !== 'object' || manifest.components === null) throw new Error('Invalid manifest');
  for (const group of Object.values(manifest.components)) {
    if (!Array.isArray(group)) throw new Error('Invalid group');
    for (const item of group) {
      if (typeof item !== 'object' || item === null || !('name' in item) || typeof item.name !== 'string') throw new Error('Invalid component');
      const implementation = Object.entries(components).find(([name]) => name === item.name)?.[1];
      expect(implementation).toBeTruthy();
      expect(['function', 'object']).toContain(typeof implementation);
    }
  }
});
