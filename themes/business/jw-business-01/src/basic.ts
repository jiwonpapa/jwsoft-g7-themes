import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export type BasicProps = HTMLAttributes<HTMLElement> & { children?: ReactNode; editorAttrs?: Record<string, string> };
function basic(tag: string) {
  return ({ children, editorAttrs, ...props }: BasicProps) => createElement(tag, { ...props, ...editorAttrs }, children);
}
export const Div = basic('div');
export const A = basic('a');
export const H1 = basic('h1');
export const H2 = basic('h2');
export const H3 = basic('h3');
export const P = basic('p');
export const Span = basic('span');
export const Img = basic('img');
export const Nav = basic('nav');
export const Main = basic('main');
export const Footer = basic('footer');
export const Header = basic('header');
export const Section = basic('section');
export const Article = basic('article');
export const Button = basic('button');
export function Form({ children, editorAttrs, ...props }: BasicProps) {
  return createElement('form', {
    ...props, ...editorAttrs,
    onSubmit: (event) => {
      event.preventDefault();
      props.onSubmit?.(event);
    },
    onClickCapture: (event) => {
      if (event.target instanceof Element && event.target.closest('[data-jw-submit]')
        && !(event.currentTarget as HTMLFormElement).reportValidity()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      props.onClickCapture?.(event);
    },
  }, children);
}
export const Label = basic('label');
export const Li = basic('li');
export const Ul = basic('ul');
export const SiteHeader = basic('header');
export const HeroSection = basic('section');
export const PrimaryNavigation = basic('nav');

type EngineInternalProps = {
  loadingactions?: unknown;
  formdata?: unknown;
};

export type InputProps = InputHTMLAttributes<HTMLInputElement> & EngineInternalProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  onChange,
  onKeyPress,
  value,
  defaultValue,
  type = 'text',
  checked,
  defaultChecked,
  loadingactions: _loadingActions,
  formdata: _formData,
  ...props
}, ref) => {
  const checkable = type === 'checkbox' || type === 'radio';
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(String(value ?? defaultValue ?? ''));

  useImperativeHandle(ref, () => input.current as HTMLInputElement);
  useEffect(() => {
    if (!checkable && !composing.current && value !== undefined) setLocalValue(String(value));
  }, [checkable, value]);

  const change = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
    if (!composing.current) onChange?.(event);
  }, [onChange]);

  const compositionEnd = useCallback((event: CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    const currentTarget = event.currentTarget;
    setLocalValue(currentTarget.value);
    onChange?.({ target: currentTarget, currentTarget } as ChangeEvent<HTMLInputElement>);
  }, [onChange]);

  if (checkable) {
    return createElement('input', {
      ref: input,
      ...props,
      type,
      className,
      value,
      checked,
      defaultChecked,
      onChange,
    });
  }

  return createElement('input', {
    ref: input,
    ...props,
    type,
    className,
    onChange: change,
    onKeyPress: (event: KeyboardEvent<HTMLInputElement>) => {
      if (!composing.current) onKeyPress?.(event);
    },
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: compositionEnd,
    ...(value !== undefined ? { value: localValue } : { defaultValue }),
  });
});
Input.displayName = 'Input';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & EngineInternalProps;

export const Textarea = ({
  className = '',
  onChange,
  value,
  defaultValue,
  loadingactions: _loadingActions,
  formdata: _formData,
  ...props
}: TextareaProps) => {
  const composing = useRef(false);
  const [localValue, setLocalValue] = useState(String(value ?? defaultValue ?? ''));

  useEffect(() => {
    if (!composing.current && value !== undefined) setLocalValue(String(value));
  }, [value]);

  const change = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(event.target.value);
    if (!composing.current) onChange?.(event);
  }, [onChange]);

  const compositionEnd = useCallback((event: CompositionEvent<HTMLTextAreaElement>) => {
    composing.current = false;
    const currentTarget = event.currentTarget;
    setLocalValue(currentTarget.value);
    onChange?.({ target: currentTarget, currentTarget } as ChangeEvent<HTMLTextAreaElement>);
  }, [onChange]);

  return createElement('textarea', {
    ...props,
    className,
    onChange: change,
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: compositionEnd,
    ...(value !== undefined ? { value: localValue } : { defaultValue }),
  });
};

export type SelectOption = { value: string | number; label: string; disabled?: boolean };
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { options?: SelectOption[] } & EngineInternalProps;

export const Select = ({
  children,
  options,
  loadingactions: _loadingActions,
  formdata: _formData,
  ...props
}: SelectProps) => createElement(
  'select',
  props,
  children ?? options?.map(option => createElement(
    'option',
    { key: String(option.value), value: option.value, disabled: option.disabled },
    option.label,
  )),
);
