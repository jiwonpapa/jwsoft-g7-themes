import { createElement } from 'react';
import DOMPurify from 'dompurify';
import { Div, type BasicProps } from './basic';

export function HtmlContent({ content = '', isHtml = true, editorAttrs, children: _children, ...props }: BasicProps & { content?: string; isHtml?: boolean }) {
  if (!isHtml) return createElement(Div, { ...props, ...editorAttrs }, content);
  const clean = DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style'],
  });
  return createElement(Div, { ...props, ...editorAttrs, dangerouslySetInnerHTML: { __html: clean } });
}
