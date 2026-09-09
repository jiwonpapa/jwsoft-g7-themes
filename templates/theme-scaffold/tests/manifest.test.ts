import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import * as components from '../src/index';

it('exports every declared component', () => {
  const manifest = JSON.parse(readFileSync('components.json', 'utf8')) as {
    components: Record<string, Array<{ name: string }>>;
  };
  for (const group of Object.values(manifest.components)) {
    for (const item of group) {
      expect(components[item.name as keyof typeof components]).toBeTypeOf('function');
    }
  }
});
