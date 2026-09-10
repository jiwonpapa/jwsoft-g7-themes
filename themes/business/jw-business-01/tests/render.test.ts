// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { HtmlContent } from '../src/html-content';
import { MobileMenuButton } from '../src/mobile-menu-button';
import { ParallaxMedia } from '../src/parallax-media';
import { Reveal } from '../src/reveal';
import { ThemeIcon } from '../src/theme-icon';

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
  it('preserves the declared page archetypes and native FAQ disclosure', () => {
    const rendered = renderToStaticMarkup(createElement(HtmlContent, {
      content: '<section class="jw-content-intro"><details class="jw-content-faq__item" open><summary>도입 기간은 얼마나 걸리나요?</summary><div class="jw-content-faq__answer"><p>범위 확인 후 일정을 안내합니다.</p></div></details><time class="jw-content-timeline__item" datetime="2026-09">2026</time></section>',
    }));

    expect(rendered).toContain('class="jw-content-intro"');
    expect(rendered).toContain('class="jw-content-timeline__item"');
    expect(rendered).toContain('<details class="jw-content-faq__item" open="">');
    expect(rendered).toContain('<summary>도입 기간은 얼마나 걸리나요?</summary>');
    expect(rendered).toContain('datetime="2026-09"');
  });
});

describe('theme motion and icon primitives', () => {
  it('renders a monochrome decorative SVG without Unicode icon text', () => {
    const rendered = renderToStaticMarkup(createElement(ThemeIcon, { name: 'workflow', className: 'jw-icon jw-service__icon' }));
    expect(rendered).toContain('<svg');
    expect(rendered).toContain('aria-hidden="true"');
    expect(rendered).toContain('stroke="currentColor"');
    expect(rendered).toContain('jw-service__icon');
    expect(rendered).not.toMatch(/[→←↗↘↓↑›‹★✓✔]/);
  });
  it('keeps reveal content visible in server HTML before progressive enhancement', () => {
    const rendered = renderToStaticMarkup(createElement(Reveal, { className: 'jw-section__header', direction: 'left' }, '검증 가능한 본문'));
    expect(rendered).toContain('class="jw-reveal jw-section__header"');
    expect(rendered).toContain('검증 가능한 본문');
    expect(rendered).not.toContain('opacity:0');
  });
  it('renders parallax media as ordinary semantic image markup', () => {
    const rendered = renderToStaticMarkup(createElement(ParallaxMedia, {
      src: '/image.webp',
      alt: '프로젝트 현장',
      className: 'jw-media',
      wrapperClassName: 'jw-parallax-media',
    }));
    expect(rendered).toContain('data-jw-motion="parallax"');
    expect(rendered).toContain('src="/image.webp"');
    expect(rendered).toContain('alt="프로젝트 현장"');
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
