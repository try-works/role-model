/* astryx Text typography surface shared by the Timer and Timestamp ports:
   astryx's type/size/color/weight props mapped onto Crease UI utilities.
   Size steps come from astryx's --font-size-* scale (14px anchor). */

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

/* --text-* presets: font size + line height + weight per semantic type. */
const TYPE_CLASSES: Record<AstryxTextType, string> = {
  body: 'text-sm leading-5 font-normal',
  large: 'text-[17px] leading-6 font-semibold',
  label: 'text-sm leading-5 font-medium',
  supporting: 'text-xs leading-5 font-normal',
  code: 'font-mono text-sm leading-5 font-normal',
  'display-1': 'text-[42px] leading-[52px] font-normal',
  'display-2': 'text-[35px] leading-[44px] font-normal',
  'display-3': 'text-[29px] leading-[36px] font-normal',
  inherit: 'text-[inherit] leading-[inherit] font-[inherit]',
}

/* astryx's size override changes only the font size — the type's line height
   stays — so each step uses an arbitrary px class rather than a named scale
   step (which would also rewrite line-height). */
const SIZE_CLASSES: Record<AstryxTextSize, string> = {
  '4xs': 'text-[6px]',
  '3xs': 'text-[7px]',
  '2xs': 'text-[8px]',
  xsm: 'text-[10px]',
  sm: 'text-[12px]',
  base: 'text-[14px]',
  lg: 'text-[17px]',
  xl: 'text-[20px]',
  '2xl': 'text-[24px]',
  '3xl': 'text-[29px]',
  '4xl': 'text-[35px]',
}

const COLOR_CLASSES: Record<AstryxTextColor, string> = {
  primary: 'text-foreground',
  secondary: 'text-muted-foreground',
  /* astryx --color-text-disabled sits ~60% as dark as secondary; there is no
     dedicated disabled-ink token in Crease UI. */
  disabled: 'text-muted-foreground/60',
  placeholder: 'text-muted-foreground/70',
  accent: 'text-primary',
  inherit: 'text-inherit',
}

const WEIGHT_CLASSES: Record<AstryxTextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

export const astryxTextClasses = (config: {
  type?: AstryxTextType
  size?: AstryxTextSize
  color?: AstryxTextColor
  weight?: AstryxTextWeight
}): string => {
  const type = config.type ?? 'body'
  const color = config.color ?? 'primary'
  if (type === 'inherit') {
    return [
      TYPE_CLASSES.inherit,
      ...(config.color === undefined ? [] : [COLOR_CLASSES[color]]),
      ...(config.weight === undefined ? [] : [WEIGHT_CLASSES[config.weight]]),
    ].join(' ')
  }
  return [
    TYPE_CLASSES[type],
    ...(config.size === undefined ? [] : [SIZE_CLASSES[config.size]]),
    COLOR_CLASSES[color],
    ...(config.weight === undefined ? [] : [WEIGHT_CLASSES[config.weight]]),
  ].join(' ')
}
