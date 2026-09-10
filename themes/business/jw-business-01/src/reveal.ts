import { createElement, useEffect, useRef, type ReactNode } from 'react';
import { inView } from 'motion';
import { animate } from 'motion/mini';

type RevealProps = {
  children?: ReactNode;
  className?: string;
  id?: string;
  direction?: 'up' | 'left' | 'right' | 'none';
  delay?: number;
  editorAttrs?: Record<string, string>;
};

const offsets = {
  up: { x: 0, y: 36 },
  left: { x: -42, y: 0 },
  right: { x: 42, y: 0 },
  none: { x: 0, y: 0 },
} as const;

export function Reveal({ children, className, id, direction = 'up', delay = 0, editorAttrs }: RevealProps) {
  const target = useRef<HTMLDivElement>(null);
  const offset = offsets[direction];

  useEffect(() => {
    const element = target.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = `translate3d(${offset.x}px, ${offset.y}px, 0)`;
    element.style.opacity = '0';
    element.style.transform = start;
    return inView(element, () => {
      animate(element, {
        opacity: [0, 1],
        transform: [start, 'translate3d(0, 0, 0)'],
      }, {
        duration: 0.7,
        delay: Math.max(0, delay),
        ease: [0.22, 1, 0.36, 1],
      });
    }, { amount: 0.16 });
  }, [delay, offset.x, offset.y]);

  return createElement('div', {
    ...editorAttrs,
    ref: target,
    id,
    className: ['jw-reveal', className].filter(Boolean).join(' '),
  }, children);
}
