import { createElement, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';

type MobileMenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  targetId: string;
  label?: string;
  closeLabel?: string;
  editorAttrs?: Record<string, unknown>;
};

export function MobileMenuButton({
  targetId,
  label = '메뉴',
  closeLabel = '메뉴 닫기',
  className = 'jw-menu-button',
  editorAttrs,
  ...props
}: MobileMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    target.dataset.open = String(open);
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    target.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const closeOnNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element && event.target.closest('a'))) return;
      setOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    target.addEventListener('click', closeOnNavigation);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      target.removeEventListener('click', closeOnNavigation);
    };
  }, [open, targetId]);

  return createElement(
    'button',
    {
      ...props,
      ref: buttonRef,
      type: 'button',
      className,
      'aria-controls': targetId,
      'aria-expanded': open,
      'aria-label': open ? closeLabel : label,
      onClick: () => setOpen(current => !current),
      ...editorAttrs,
    },
    createElement('span', { className: 'jw-menu-button__label' }, open ? closeLabel : label),
    createElement('span', { className: 'jw-menu-button__icon', 'aria-hidden': 'true' },
      createElement('span'),
      createElement('span'),
    ),
  );
}
