import { createElement, type SVGProps } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  Mail,
  MapPin,
  MessageSquareText,
  PanelsTopLeft,
  PencilRuler,
  Phone,
  Rocket,
  Search,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

const icons = {
  'arrow-down': ArrowDownToLine,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  chart: ChartNoAxesCombined,
  'chevron-right': ChevronRight,
  mail: Mail,
  'map-pin': MapPin,
  message: MessageSquareText,
  panels: PanelsTopLeft,
  'pencil-ruler': PencilRuler,
  phone: Phone,
  rocket: Rocket,
  search: Search,
  workflow: Workflow,
} satisfies Record<string, LucideIcon>;

export const THEME_ICON_NAMES = Object.freeze(Object.keys(icons));
export type ThemeIconName = keyof typeof icons;
type ThemeIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name?: ThemeIconName;
  editorAttrs?: Record<string, string>;
};

export function ThemeIcon({ name = 'arrow-right', className = 'jw-icon', editorAttrs, ...props }: ThemeIconProps) {
  const Icon = icons[name] ?? ArrowRight;
  return createElement(Icon, {
    ...props,
    ...editorAttrs,
    className,
    'aria-hidden': true,
    focusable: 'false',
    strokeWidth: 1.75,
  });
}
