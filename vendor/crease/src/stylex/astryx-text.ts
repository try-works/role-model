import * as stylex from '@stylexjs/stylex'

import type { StaticStyles } from '@stylexjs/stylex'

import { tokens } from './tokens.stylex'

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

const typeStyles = stylex.create({
  body: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.25rem' },
  large: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: '1.5rem' },
  label: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  supporting: { fontSize: '0.75rem', fontWeight: 400, lineHeight: '1.25rem' },
  code: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  },
  'display-1': { fontSize: '2.625rem', fontWeight: 400, lineHeight: '3.25rem' },
  'display-2': {
    fontSize: '2.1875rem',
    fontWeight: 400,
    lineHeight: '2.75rem',
  },
  'display-3': {
    fontSize: '1.8125rem',
    fontWeight: 400,
    lineHeight: '2.25rem',
  },
  inherit: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontStyle: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
  },
})

const sizeStyles = stylex.create({
  '4xs': { fontSize: '0.375rem' },
  '3xs': { fontSize: '0.4375rem' },
  '2xs': { fontSize: '0.5rem' },
  xsm: { fontSize: '0.625rem' },
  sm: { fontSize: '0.75rem', lineHeight: '1rem' },
  base: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  lg: { fontSize: '1.0625rem' },
  xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
  '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
  '3xl': { fontSize: '1.8125rem' },
  '4xl': { fontSize: '2.1875rem' },
})

const colorStyles = stylex.create({
  primary: { color: tokens.foreground },
  secondary: { color: tokens.mutedForeground },
  /* astryx --color-text-disabled sits ~60% as dark as secondary. */
  disabled: { color: tokens.mutedForeground, opacity: 0.6 },
  placeholder: { color: tokens.mutedForeground, opacity: 0.7 },
  accent: { color: tokens.primary },
  inherit: { color: 'inherit' },
})

const weightStyles = stylex.create({
  normal: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
  bold: { fontWeight: 700 },
})

export const astryxTextStylex = (config: {
  type?: AstryxTextType
  size?: AstryxTextSize
  color?: AstryxTextColor
  weight?: AstryxTextWeight
}): ReadonlyArray<StaticStyles> => {
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
