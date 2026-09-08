import { createElement, type HTMLAttributes, type ReactNode } from 'react';

export type BasicProps = HTMLAttributes<HTMLElement> & { children?: ReactNode; editorAttrs?: Record<string, string> };
function basic(tag: string) {
  return ({ children, editorAttrs, ...props }: BasicProps) => createElement(tag, { ...props, ...editorAttrs }, children);
}
export const Div = basic('div');
export const A = basic('a');
export const H1 = basic('h1');
export const H2 = basic('h2');
export const P = basic('p');
export const Span = basic('span');
export const Img = basic('img');
export const Nav = basic('nav');
export const Main = basic('main');
export const Footer = basic('footer');
export const Header = basic('header');
