import { createElement, type HTMLAttributes, type ReactNode } from 'react';

export type BasicProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  editorAttrs?: Record<string, string>;
};

function basic(tag: string) {
  return ({ children, editorAttrs, ...props }: BasicProps) =>
    createElement(tag, { ...props, ...editorAttrs }, children);
}

export const Div = basic('div');
export const H1 = basic('h1');
