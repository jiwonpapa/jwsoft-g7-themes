import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';

function read(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')); }
function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function nodes(value: unknown, id: string): unknown[] {
  if (Array.isArray(value)) return value.flatMap(item => nodes(item, id));
  if (!object(value)) return [];
  return [...(value['id'] === id ? [value] : []), ...Object.values(value).flatMap(item => nodes(item, id))];
}
function objects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(objects);
  if (!object(value)) return [];
  return [value, ...Object.values(value).flatMap(objects)];
}
function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(path);
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : [];
  });
}
function expectSemanticClassName(value: string): void {
  if (!value.startsWith('{{')) {
    expect(value).toMatch(/^jw-/);
    return;
  }
  const variants = [...value.matchAll(/'([^']+)'/g)]
    .map(match => match[1]!)
    .filter(candidate => candidate.startsWith('jw-') || candidate.includes(' '));
  expect(variants.length).toBeGreaterThan(0);
  for (const variant of variants) {
    for (const className of variant.split(/\s+/)) expect(className).toMatch(/^jw-/);
  }
}

describe('layout data binding contract', () => {
  it('declares each runtime component once in the matching manifest group', () => {
    const manifest = read('components.json');
    if (!object(manifest) || !object(manifest['components'])) throw new Error('Invalid component manifest');
    const names = new Set<string>();
    for (const group of ['basic', 'composite', 'layout']) {
      const entries = manifest['components'][group];
      if (!Array.isArray(entries)) throw new Error(`Invalid component group: ${group}`);
      for (const entry of entries) {
        if (!object(entry) || typeof entry['name'] !== 'string') throw new Error(`Invalid component: ${group}`);
        expect(entry['type']).toBe(group);
        expect(names.has(entry['name']), entry['name']).toBe(false);
        names.add(entry['name']);
      }
    }
  });
  it('resolves every declared slot to one editable raw node with a visible baseline', () => {
    const manifest = read('layout-data.json');
    if (!object(manifest) || !Array.isArray(manifest['slots'])) throw new Error('Invalid contract');
    for (const slot of manifest['slots']) {
      if (!object(slot) || typeof slot['layout_name'] !== 'string' || !object(slot['selector']) || typeof slot['selector']['node_id'] !== 'string') throw new Error('Invalid slot');
      const matched = nodes(read('layouts/' + slot['layout_name'] + '.json'), slot['selector']['node_id']);
      expect(matched).toHaveLength(1);
      const selected = matched[0];
      if (!object(selected)) throw new Error('Invalid node');
      expect(selected['children']).toBeInstanceOf(Array);
      expect((selected['children'] as unknown[]).length).toBeGreaterThan(0);
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
    const image = { id: 'jwld-service-image', type: 'basic', name: 'Img', props: { className: 'jw-media jw-service__image', src: '/storage/layout-data/service.webp', alt: '서비스 소개 이미지', loading: 'lazy', width: 1200, height: 900 } };
    expect(validate([link])).toBe(true);
    expect(validate([image])).toBe(true);
    expect(validate([{ ...link, name: 'Script' }])).toBe(false);
    expect(validate([{ ...link, text: '{{window.location}}' }])).toBe(false);
    expect(validate([{ ...link, props: { href: '//external.test' } }])).toBe(false);
    expect(validate([{ ...link, props: { href: '/page/company', onClick: 'run' } }])).toBe(false);
  });
  it('uses native props for semantic classes and provides every referenced template image', () => {
    const layouts = jsonFiles('layouts').map(read);
    const componentKinds = new Set(['basic', 'composite', 'layout', 'extension_point']);
    for (const node of layouts.flatMap(objects).filter(item => componentKinds.has(String(item['type'])) && typeof item['name'] === 'string')) {
      expect(node).not.toHaveProperty('className');
      const props = node['props'];
      if (!object(props)) continue;
      if (typeof props['className'] === 'string') expectSemanticClassName(props['className']);
      if (typeof props['src'] !== 'string' || !props['src'].startsWith('/api/templates/assets/jwsoft-business01?')) continue;
      const file = new URL(props['src'], 'https://local.test').searchParams.get('file');
      expect(file).not.toBeNull();
      expect(existsSync('assets/public/' + file)).toBe(true);
    }
  });
  it('styles classless flat and nested menu nodes emitted by the layout-data contract', () => {
    const css = readFileSync('assets/base.css', 'utf8');
    expect(css).toContain('.jw-primary-navigation a,');
    expect(css).toContain('.jw-primary-navigation > div > div {');
    expect(css).toContain('.jw-primary-navigation > div:focus-within > div');
    expect(css).toContain('.jw-footer-navigation a {');
  });
  it('resolves every shipped layout translation token in both locales', () => {
    const source = JSON.stringify(jsonFiles('layouts').map(read));
    const keys = [...source.matchAll(/\$t:([a-zA-Z0-9_.-]+)/g)].map(match => match[1]!);
    for (const locale of ['ko', 'en']) {
      const language = read(`lang/${locale}.json`);
      for (const key of keys) {
        const value = key.split('.').reduce<unknown>((current, segment) => object(current) ? current[segment] : undefined, language);
        expect(value, `${locale}:${key}`).toBeTypeOf('string');
      }
    }
  });
  it('enables semantic SEO output for the public home', () => {
    const home = read('layouts/home.json');
    if (!object(home) || !object(home['meta']) || !object(home['meta']['seo'])) throw new Error('Invalid home SEO contract');
    expect(home['meta']['seo']['enabled']).toBe(true);
    expect(home['meta']['seo']['structured_data']).toMatchObject({'@type': 'Organization', name: 'NOVA WORKS'});
  });
  it('localizes every editor label and uses the native image picker', () => {
    const spec = read('editor-spec.json');
    if (!object(spec) || !object(spec['controls'])) throw new Error('Invalid editor spec');
    for (const node of objects(spec)) {
      if (typeof node['label'] === 'string') expect(node['label']).toMatch(/^\$t:user\.editor\./);
    }
    const keys = [...JSON.stringify(spec).matchAll(/\$t:([a-zA-Z0-9_.-]+)/g)].map(match => match[1]!);
    for (const locale of ['ko', 'en']) {
      const language = read(`lang/${locale}.json`);
      for (const key of keys) {
        const value = key.split('.').reduce<unknown>((current, segment) => object(current) ? current[segment] : undefined, language);
        expect(value, `${locale}:${key}`).toBeTypeOf('string');
      }
    }
    expect((spec['controls']['imgSrc'] as Record<string, unknown>)['widget']).toBe('image');
  });
  it('ships no ecommerce route or draft ecommerce layout', () => {
    const routes = read('routes.json');
    if (!object(routes) || !Array.isArray(routes['routes'])) throw new Error('Invalid routes');
    expect(JSON.stringify(routes)).not.toMatch(/product|category|cart|checkout/);
    expect(existsSync('layouts/product/show.json')).toBe(false);
    expect(existsSync('layouts/category/show.json')).toBe(false);
  });
  it('ships a native board write and edit flow through the public sirsoft-board contract', () => {
    const routes = read('routes.json');
    const form = read('layouts/board/form.json');
    if (!object(routes) || !Array.isArray(routes['routes']) || !object(form)) throw new Error('Invalid board form contract');
    const routePaths = routes['routes'].filter(object).map(route => route['path']);
    expect(routePaths).toContain('/board/:slug/write');
    expect(routePaths).toContain('/board/:slug/:id/edit');
    expect(routePaths.indexOf('/board/:slug/write')).toBeLessThan(routePaths.indexOf('/board/:slug/:id'));

    const sources = Array.isArray(form['data_sources']) ? form['data_sources'].filter(object) : [];
    expect(sources.find(source => source['id'] === 'form_data')?.['endpoint']).toBe('/api/modules/sirsoft-board/boards/{{route.slug}}/posts/form-data');
    expect(sources.find(source => source['id'] === 'form_meta')?.['endpoint']).toBe('/api/modules/sirsoft-board/boards/{{route.slug}}/posts/form-meta');

    const formNodes = objects(form);
    expect(formNodes.find(node => node['name'] === 'Form')?.['dataKey']).toBe('form');
    for (const name of ['author_name', 'password', 'category', 'title', 'content']) {
      expect(formNodes.some(node => object(node['props']) && node['props']['name'] === name), name).toBe(true);
    }
    expect(JSON.stringify(form)).toContain('/api/modules/sirsoft-board/boards/');
    expect(JSON.stringify(form)).not.toContain('/api/admin/');
  });
  it('ships the guest secret-post read contract and forwards its scoped view token', () => {
    const base = read('layouts/_user_base.json');
    const show = read('layouts/board/show.json');
    if (!object(base) || !object(show)) throw new Error('Invalid secret post contract');

    const showSource = JSON.stringify(show);
    expect(showSource).toContain('/api/modules/sirsoft-board/boards/{{route.slug}}/posts/{{route.id}}/verify-password');
    expect(showSource).toContain('post?.data?.content === null && post?.data?.is_guest_post');
    expect(showSource).toContain('updateDataSource');
    expect(showSource).toContain('secret_view_token');

    const headers = Array.isArray(base['globalHeaders']) ? base['globalHeaders'].filter(object) : [];
    expect(headers).toContainEqual({
      pattern: '/api/modules/sirsoft-board/*',
      headers: {'X-Board-Secret-View-Token': '{{_global.secretViewToken}}'},
    });
  });
  it('uses crawler-safe internal href expressions', () => {
    const source = JSON.stringify(jsonFiles('layouts').map(read));
    expect(source).not.toContain(`"href":"/"`);
    expect(source).not.toContain(`"href":"{{'/'}}"`);
    expect(source).not.toMatch(/"href":"\{\{[^"}]*\+[^"}]*\}\}"/);
    expect(source).toContain(`"href":"/board/{{route.slug}}"`);
  });
  it('ships three selectable semantic variants for header, hero and mobile navigation', () => {
    const spec = read('editor-spec.json');
    if (!object(spec) || !object(spec['controls'])) throw new Error('Invalid editor spec');
    const css = readFileSync('assets/base.css', 'utf8');
    const layoutSource = JSON.stringify(jsonFiles('layouts').map(read));

    for (const key of ['headerPreset', 'heroPreset', 'mobileMenuPreset']) {
      const control = spec['controls'][key];
      if (!object(control) || !Array.isArray(control['options']) || !Array.isArray(control['groupTokens'])) throw new Error(`Invalid preset control: ${key}`);
      expect(control['options']).toHaveLength(3);
      expect(control['groupTokens']).toHaveLength(3);
      expect(control['groupTokens'].filter(token => typeof token === 'string' && layoutSource.includes(token))).toHaveLength(1);
      for (const token of control['groupTokens']) {
        expect(token).toBeTypeOf('string');
        expect(token).toMatch(/^jw-/);
        expect(css).toContain(`.${token}`);
      }
    }
  });
});
