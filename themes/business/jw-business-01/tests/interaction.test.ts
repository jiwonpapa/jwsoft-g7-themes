// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Form } from '../src/basic';
import { LanguageSwitcher } from '../src/language-switcher';

let root: Root | undefined;
beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    clear: () => entries.clear(),
  });
});
afterEach(() => {
  if (root) flushSync(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  window.localStorage.clear();
  delete window.G7Core;
  vi.unstubAllGlobals();
});

it('prevents native navigation while preserving the G7 submit action', () => {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const submit = vi.fn();
  flushSync(() => root?.render(createElement(Form, { onSubmit: submit })));
  const event = new Event('submit', { bubbles: true, cancelable: true });
  host.querySelector('form')!.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(submit).toHaveBeenCalledOnce();
});

it('blocks the G7 save click until native required fields are valid', () => {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const save = vi.fn();
  flushSync(() => root?.render(createElement(Form, {},
    createElement('input', { required: true, type: 'email' }),
    createElement('button', { type: 'button', 'data-jw-submit': true, onClick: save }, 'Save'))));
  const input = host.querySelector('input')!;
  const button = host.querySelector('button')!;
  button.click();
  input.value = 'invalid';
  button.click();
  expect(save).not.toHaveBeenCalled();
  input.value = 'preview@example.invalid';
  button.click();
  expect(save).toHaveBeenCalledOnce();
});

it.each([[null, 'ko'], ['en', 'en']] as const)('uses Korean by default and preserves explicit English (%s)', (stored, expected) => {
  if (stored) window.localStorage.setItem('jwsoft-business01.language', stored);
  window.localStorage.setItem('g7_locale', 'en');
  const change = vi.fn().mockResolvedValue(undefined);
  window.G7Core = { locale: { current: () => 'other', change } };
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root?.render(createElement(LanguageSwitcher)));
  expect(change).toHaveBeenCalledWith(expected);
});
