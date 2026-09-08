// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HtmlContent } from '../src/html-content';

describe('published native content rendering', () => {
  it('keeps Korean text and attachment links while stripping executable HTML', () => {
    const rendered = renderToStaticMarkup(createElement(HtmlContent, { content: '<p>설비 안내</p><a href="/files/manual.pdf">설명서</a><img src="/image.webp" onerror="alert(1)"><script>alert(2)</script><form action="/steal"><input></form>' }));
    expect(rendered).toContain('설비 안내');
    expect(rendered).toContain('href="/files/manual.pdf"');
    expect(rendered).not.toMatch(/onerror|<script|<form|<input/);
  });
  it('renders text mode literally and forwards native editor attributes', () => {
    const rendered = renderToStaticMarkup(createElement(HtmlContent, { content: '<b>한글</b>', isHtml: false, id: 'content', editorAttrs: { 'data-editor-node': 'native-node' } }));
    expect(rendered).toContain('&lt;b&gt;한글&lt;/b&gt;');
    expect(rendered).toContain('data-editor-node="native-node"');
    expect(rendered).toContain('id="content"');
  });
});
