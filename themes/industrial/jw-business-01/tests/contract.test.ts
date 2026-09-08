import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';

function read(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')); }
function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function nodes(value: unknown, id: string): unknown[] {
  if (Array.isArray(value)) return value.flatMap(item => nodes(item, id));
  if (!object(value)) return [];
  return [...(value['id'] === id ? [value] : []), ...Object.values(value).flatMap(item => nodes(item, id))];
}

describe('layout data binding contract', () => {
  it('resolves every declared slot to one editable raw node', () => {
    const manifest = read('layout-data.json');
    if (!object(manifest) || !Array.isArray(manifest['slots'])) throw new Error('Invalid contract');
    for (const slot of manifest['slots']) {
      if (!object(slot) || typeof slot['layout_name'] !== 'string' || !object(slot['selector']) || typeof slot['selector']['node_id'] !== 'string') throw new Error('Invalid slot');
      const matched = nodes(read('layouts/' + slot['layout_name'] + '.json'), slot['selector']['node_id']);
      expect(matched).toHaveLength(1);
      const selected = matched[0];
      if (!object(selected)) throw new Error('Invalid node');
      expect(selected['children']).toEqual([]);
      expect(slot['allowed_fields']).toEqual(['children']);
    }
  });
  it('declares only public routes actually shipped in the native route table', () => {
    const manifest = read('layout-data.json');
    const routes = read('routes.json');
    if (!object(manifest) || !object(manifest['public_routes']) || !object(routes) || !Array.isArray(routes['routes'])) throw new Error('Invalid routes');
    for (const route of Object.values(manifest['public_routes'])) {
      if (!object(route) || typeof route['layout_name'] !== 'string') throw new Error('Invalid route');
      expect(routes['routes']).toContainEqual({ path: route['path'], layout: route['layout_name'], auth_required: false });
      expect(object(read('layouts/' + route['layout_name'] + '.json'))).toBe(true);
    }
  });
  it('accepts owned link nodes and rejects arbitrary components, props and expressions', () => {
    const schema = read('contracts/slot-nodes.schema.json');
    if (!object(schema)) throw new Error('Invalid schema');
    const validate = new Ajv2020().compile(schema);
    const link = { id: 'jwld-company', type: 'basic', name: 'A', text: '회사소개', props: { href: '/page/company' } };
    expect(validate([link])).toBe(true);
    expect(validate([{ ...link, name: 'Script' }])).toBe(false);
    expect(validate([{ ...link, text: '{{window.location}}' }])).toBe(false);
    expect(validate([{ ...link, props: { href: '//external.test' } }])).toBe(false);
    expect(validate([{ ...link, props: { href: '/page/company', onClick: 'run' } }])).toBe(false);
  });
});
