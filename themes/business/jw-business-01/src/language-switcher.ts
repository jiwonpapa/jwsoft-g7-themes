import { createElement, useEffect, useState } from 'react';
import { Button, Div, Span, type BasicProps } from './basic';

type Locale = 'ko' | 'en';
type LocaleAPI = { current(): string; change(locale: string): Promise<void> };
declare global {
  interface Window { G7Core?: { locale?: LocaleAPI } }
}
const preferenceKey = 'jwsoft-business01.language';

function preference(): Locale {
  try { return window.localStorage.getItem(preferenceKey) === 'en' ? 'en' : 'ko'; }
  catch { return 'ko'; }
}

/** Uses the public G7 locale API; the theme preference distinguishes an explicit
 * language choice from the host's automatically inherited browser language. */
export function LanguageSwitcher({ locale = 'ko', editorAttrs }: { locale?: string; editorAttrs?: BasicProps['editorAttrs'] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const api = window.G7Core?.locale;
    const desired = preference();
    if (api && api.current() !== desired) {
      void api.change(desired).catch(() => setError(true));
    }
  }, []);

  const choose = async (next: Locale) => {
    const api = window.G7Core?.locale;
    if (!api || busy) return;
    setBusy(true);
    setError(false);
    try {
      window.localStorage.setItem(preferenceKey, next);
      await api.change(next);
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  return createElement(Div, { className: 'jw-language', role: 'group', 'aria-label': '언어 / Language', ...(editorAttrs ? { editorAttrs } : {}) },
    ...(['ko', 'en'] as const).map(code => {
      const props = {
        key: code, type: 'button', className: 'jw-language__button',
        lang: code, 'aria-pressed': locale === code, disabled: busy,
        onClick: () => { void choose(code); },
      };
      return createElement(Button, props, code === 'ko' ? '한국어' : 'EN');
    }),
    error ? createElement(Span, { role: 'alert', className: 'jw-language__error' }, '언어 변경 실패 / Please retry') : null,
  );
}
