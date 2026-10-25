import { Style } from '@pleat/core'
import { tokens } from './tokens'

/* astryx Text typography surface shared by the Timer and Timestamp StyleX
   ports — same prop vocabulary and px values as lib/astryx-text.ts. */

export type AstryxTextType =
  | 'body'
  | 'large'
  | 'label'
  | 'supporting'
  | 'code'
  | 'display-1'
  | 'display-2'
  | 'display-3'
  | 'inherit'

export type AstryxTextSize =
  | '4xs'
  | '3xs'
  | '2xs'
  | 'xsm'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'

export type AstryxTextColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'placeholder'
  | 'accent'
  | 'inherit'

export type AstryxTextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

const typeStyles = {
  body: Style.make({
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  }),
  large: Style.make({
    fontSize: '1.0625rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  }),
  label: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  supporting: Style.make({
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  }),
  code: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  }),
  'display-1': Style.make({
    fontSize: '2.625rem',
    fontWeight: 400,
    lineHeight: '3.25rem',
  }),
  'display-2': Style.make({
    fontSize: '2.1875rem',
    fontWeight: 400,
    lineHeight: '2.75rem',
  }),
  'display-3': Style.make({
    fontSize: '1.8125rem',
    fontWeight: 400,
    lineHeight: '2.25rem',
  }),
  inherit: Style.make({
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontStyle: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
  }),
}

const sizeStyles = {
  '4xs': Style.make({ fontSize: '0.375rem' }),
  '3xs': Style.make({ fontSize: '0.4375rem' }),
  '2xs': Style.make({ fontSize: '0.5rem' }),
  xsm: Style.make({ fontSize: '0.625rem' }),
  sm: Style.make({ fontSize: '0.75rem', lineHeight: '1rem' }),
  base: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  lg: Style.make({ fontSize: '1.0625rem' }),
  xl: Style.make({ fontSize: '1.25rem', lineHeight: '1.75rem' }),
  '2xl': Style.make({ fontSize: '1.5rem', lineHeight: '2rem' }),
  '3xl': Style.make({ fontSize: '1.8125rem' }),
  '4xl': Style.make({ fontSize: '2.1875rem' }),
}

const colorStyles = {
  primary: Style.make({ color: tokens.foreground }),
  secondary: Style.make({ color: tokens.mutedForeground }),
  disabled: Style.make({ color: tokens.mutedForeground, opacity: 0.6 }),
  placeholder: Style.make({ color: tokens.mutedForeground, opacity: 0.7 }),
  accent: Style.make({ color: tokens.primary }),
  inherit: Style.make({ color: 'inherit' }),
}

const weightStyles = {
  normal: Style.make({ fontWeight: 400 }),
  medium: Style.make({ fontWeight: 500 }),
  semibold: Style.make({ fontWeight: 600 }),
  bold: Style.make({ fontWeight: 700 }),
}

export const astryxTextStylex = (config: {
  type?: AstryxTextType
  size?: AstryxTextSize
  color?: AstryxTextColor
  weight?: AstryxTextWeight
}): ReadonlyArray<Style.Style> => {
  const type = config.type ?? 'body'
  const color = config.color ?? 'primary'
  if (type === 'inherit') {
    return [
      typeStyles.inherit,
      ...(config.color === undefined ? [] : [colorStyles[color]]),
      ...(config.weight === undefined ? [] : [weightStyles[config.weight]]),
    ]
  }
  return [
    typeStyles[type],
    ...(config.size === undefined ? [] : [sizeStyles[config.size]]),
    colorStyles[color],
    ...(config.weight === undefined ? [] : [weightStyles[config.weight]]),
  ]
}
