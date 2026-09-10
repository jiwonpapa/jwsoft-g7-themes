import { createElement, useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { scroll } from 'motion';
import { animate } from 'motion/mini';

type ParallaxMediaProps = Pick<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'loading' | 'className'> & {
  wrapperClassName?: string;
  strength?: number;
  editorAttrs?: Record<string, string>;
};

export function ParallaxMedia({
  src,
  alt = '',
  width,
  height,
  loading,
  className,
  wrapperClassName,
  strength = 32,
  editorAttrs,
}: ParallaxMediaProps) {
  const target = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const container = target.current;
    const media = image.current;
    if (!container || !media || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const distance = Math.max(0, Math.min(64, strength));
    const animation = animate(media, {
      transform: [
        `translate3d(0, ${-distance}px, 0) scale(1.08)`,
        `translate3d(0, ${distance}px, 0) scale(1.08)`,
      ],
    }, { duration: 1, ease: 'linear' });
    const stopScroll = scroll(animation, { target: container, offset: ['start end', 'end start'] });
    return () => {
      stopScroll();
      animation.stop();
    };
  }, [strength]);

  return createElement('div', {
    ...editorAttrs,
    ref: target,
    className: wrapperClassName,
    'data-jw-motion': 'parallax',
  }, createElement('img', {
    ref: image,
    src,
    alt,
    width,
    height,
    loading,
    decoding: 'async',
    draggable: false,
    className,
  }));
}
