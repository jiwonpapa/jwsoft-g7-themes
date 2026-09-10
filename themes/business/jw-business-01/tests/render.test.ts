// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { HtmlContent } from '../src/html-content';
import { MobileMenuButton } from '../src/mobile-menu-button';

describe('published native content rendering', () => {
  it('keeps Korean text and attachment links while stripping executable HTML', () => {
    const rendered = renderToStaticMarkup(createElement(HtmlContent, { content: '<p>서비스 안내</p><a href="/files/guide.pdf">안내서</a><img src="/image.webp" onerror="alert(1)"><script>alert(2)</script><form action="/steal"><input></form>' }));
    expect(rendered).toContain('서비스 안내');
    expect(rendered).toContain('href="/files/guide.pdf"');
    expect(rendered).not.toMatch(/onerror|<script|<form|<input/);
  });
  it('renders text mode literally and forwards native editor attributes', () => {
    const rendered = renderToStaticMarkup(createElement(HtmlContent, { content: '<b>한글</b>', isHtml: false, id: 'content', editorAttrs: { 'data-editor-node': 'native-node' } }));
    expect(rendered).toContain('&lt;b&gt;한글&lt;/b&gt;');
    expect(rendered).toContain('data-editor-node="native-node"');
    expect(rendered).toContain('id="content"');
  });
});

describe('mobile navigation', () => {
  it('opens the declared navigation target and closes it with Escape', () => {
    const target = document.createElement('nav');
    target.id = 'test-navigation';
    const link = document.createElement('a');
    link.href = '/page/company';
    target.append(link);
    const host = document.createElement('div');
    document.body.append(target, host);
    const root = createRoot(host);

    flushSync(() => root.render(createElement(MobileMenuButton, { targetId: target.id })));
    const button = host.querySelector('button');
    if (!button) throw new Error('Menu button was not rendered');

    flushSync(() => button.click());
    expect(target.dataset.open).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(link);

    flushSync(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(target.dataset.open).toBe('false');
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(button);

    flushSync(() => root.unmount());
    target.remove();
    host.remove();
  });
});
