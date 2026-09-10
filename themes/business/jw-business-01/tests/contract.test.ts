import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import { THEME_ICON_NAMES } from '../src/theme-icon';

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
  it('publishes the complete site structure consumed by the layout-data installer', () => {
    const manifest = read('layout-data.json');
    if (!object(manifest) || typeof manifest['site_structure_contract'] !== 'string') throw new Error('Missing site structure contract');
    expect(manifest['site_structure_contract']).toBe('contracts/site-structure.json');

    const schema = read('contracts/site-structure.schema.json');
    const structure = read(manifest['site_structure_contract']);
    if (!object(schema) || !object(structure)) throw new Error('Invalid site structure contract');
    expect(new Ajv2020().compile(schema)(structure)).toBe(true);
    expect(structure['templateIdentifier']).toBe('jwsoft-business01');
    expect(structure['features']).toEqual({shopping: false, reservation: false});
    expect(structure['dataPolicy']).toEqual({mode: 'reviewed-static-pack', randomGenerationAllowed: false});

    const pages = Array.isArray(structure['pages']) ? structure['pages'].filter(object) : [];
    const boards = Array.isArray(structure['boards']) ? structure['boards'].filter(object) : [];
    expect(pages).toHaveLength(10);
    expect(boards).toHaveLength(4);
    expect(boards.map(board => board['role'])).toEqual(['project', 'insight', 'notice', 'inquiry']);

    const pageArchetypes = read('contracts/page-content.json');
    if (!object(pageArchetypes) || !object(pageArchetypes['archetypes'])) throw new Error('Invalid page archetypes');
    for (const page of pages) expect(pageArchetypes['archetypes']).toHaveProperty(String(page['archetype']));

    const pageByKey = new Map(pages.map(page => [page['key'], page]));
    const boardByKey = new Map(boards.map(board => [board['key'], board]));
    const flattenNavigation = (value: unknown): Record<string, unknown>[] => {
      if (!Array.isArray(value)) return [];
      return value.filter(object).flatMap(node => [node, ...flattenNavigation(node['children'])]);
    };
    const navigation = Array.isArray(structure['navigation']) ? structure['navigation'].filter(object) : [];
    const footer = Array.isArray(structure['footerNavigation']) ? structure['footerNavigation'].filter(object) : [];
    expect(navigation).toHaveLength(5);
    for (const node of navigation) {
      const children = Array.isArray(node['children']) ? node['children'].filter(object) : [];
      expect(children.every(child => !Array.isArray(child['children']) || child['children'].length === 0)).toBe(true);
    }
    expect(new Set(flattenNavigation([...navigation, ...footer]).map(node => node['key'])).size)
      .toBe(flattenNavigation([...navigation, ...footer]).length);

    const destinationPath = (destination: unknown): string => {
      if (!object(destination) || typeof destination['kind'] !== 'string') throw new Error('Invalid destination');
      const collection = destination['kind'] === 'page' ? pageByKey : boardByKey;
      const target = collection.get(destination['ref']);
      if (!target || typeof target['slug'] !== 'string') throw new Error(`Unresolved destination: ${String(destination['ref'])}`);
      if (destination['kind'] === 'page') return `/page/${target['slug']}`;
      if (destination['kind'] === 'board_write') return `/board/${target['slug']}/write`;
      return `/board/${target['slug']}`;
    };
    for (const node of flattenNavigation([...navigation, ...footer])) expect(destinationPath(node['destination'])).toMatch(/^\/(page|board)\//);

    const base = read('layouts/_user_base.json');
    const primary = nodes(base, 'jw-primary-navigation')[0];
    const footerNode = nodes(base, 'jw-footer-navigation')[0];
    if (!object(primary) || !object(footerNode) || !Array.isArray(primary['children']) || !Array.isArray(footerNode['children'])) throw new Error('Invalid baseline navigation');
    const baselinePaths = (items: unknown[]): unknown[] => items.filter(object).map(item => object(item['props']) ? item['props']['href'] : undefined);
    expect(baselinePaths(primary['children'])).toEqual(navigation.map(node => destinationPath(node['destination'])));
    expect(baselinePaths(footerNode['children'])).toEqual(footer.map(node => destinationPath(node['destination'])));
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
    const menuBranch = {
      id: 'jwld-company-menu',
      type: 'basic',
      name: 'Div',
      children: [
        link,
        {
          id: 'jwld-company-submenu',
          type: 'basic',
          name: 'Div',
          children: [
            { id: 'jwld-company-history', type: 'basic', name: 'A', text: '연혁', props: { href: '/page/history' } },
            { id: 'jwld-company-team', type: 'basic', name: 'A', text: '팀', props: { href: '/page/team' } },
          ],
        },
      ],
    };
    expect(validate([link])).toBe(true);
    expect(validate([image])).toBe(true);
    expect(validate([menuBranch])).toBe(true);
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
  it('styles every public native-page content class declared by the theme', () => {
    const contract = read('contracts/page-content.json');
    if (!object(contract) || !object(contract['archetypes'])) throw new Error('Invalid page content contract');
    const css = readFileSync('assets/base.css', 'utf8');
    const classNames = Object.values(contract['archetypes']).flatMap(value => Array.isArray(value) ? value : []);
    expect(new Set(classNames).size).toBe(classNames.length);
    for (const className of classNames) {
      expect(className).toBeTypeOf('string');
      expect(className).toMatch(/^jw-content-/);
      expect(css, String(className)).toContain(`.${className}`);
    }
  });
  it('uses only the bundled line-icon registry and ships motion as progressive enhancement', () => {
    const layouts = jsonFiles('layouts').map(read);
    const layoutNodes = layouts.flatMap(objects);
    const icons = layoutNodes.filter(node => node['name'] === 'ThemeIcon');
    const reveals = layoutNodes.filter(node => node['name'] === 'Reveal');
    const parallaxMedia = layoutNodes.filter(node => node['name'] === 'ParallaxMedia');
    expect(icons.length).toBeGreaterThanOrEqual(12);
    expect(reveals.length).toBeGreaterThanOrEqual(5);
    expect(parallaxMedia.length).toBeGreaterThanOrEqual(2);
    for (const icon of icons) {
      expect(object(icon['props']) && THEME_ICON_NAMES.includes(String(icon['props']['name']))).toBe(true);
    }

    const runtimeUI = JSON.stringify(layouts) + readFileSync('assets/base.css', 'utf8');
    expect(runtimeUI).not.toMatch(/[→←↗↘↓↑›‹★✓✔]/);
    const harness = read('theme.harness.json');
    if (!object(harness) || !Array.isArray(harness['features'])) throw new Error('Invalid theme harness');
    expect(harness['features']).toEqual(expect.arrayContaining(['icons', 'motion']));
  });
  it('keeps internal page motion and action icons consistent with the home theme', () => {
    const internalLayouts = [
      read('layouts/page/show.json'),
      read('layouts/board/index.json'),
      read('layouts/board/show.json'),
      read('layouts/board/form.json'),
    ];
    const internalNodes = internalLayouts.flatMap(objects);
    expect(internalNodes.filter(node => node['name'] === 'Reveal')).toHaveLength(8);

    const controls = internalNodes.filter(node =>
      (node['name'] === 'A' || node['name'] === 'Button') && Array.isArray(node['children'])
    );
    for (const token of [
      '$t:user.board.write',
      '$t:user.board.previous',
      '$t:user.board.next',
      '$t:user.board.back_to_list',
      '$t:user.board.secret.action',
      '$t:user.board.edit',
      '$t:user.board.previous_post',
      '$t:user.board.next_post',
      '$t:user.board.form.cancel',
      '$t:user.board.form.password_action',
      '$t:user.page.back_home',
    ]) {
      expect(controls.some(control => {
        const children = control['children'] as unknown[];
        return children.some(child => object(child) && child['text'] === token)
          && children.some(child => object(child) && child['name'] === 'ThemeIcon');
      }), token).toBe(true);
    }
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
