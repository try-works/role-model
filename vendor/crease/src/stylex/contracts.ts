import type {
  CSSProperties,
  InlineStyles,
  StaticStyles,
  StyleXClassNameFor,
} from '@stylexjs/stylex'

/**
 * The only StyleX properties accepted at a component call site.
 *
 * These properties position a component in its parent without changing the
 * component's color, typography, internal spacing, shape, or interaction
 * states. Visual changes belong in a named component variant instead.
 */
export type ComponentLayoutProperties = Pick<
  CSSProperties,
  | 'aspectRatio'
  | 'alignSelf'
  | 'flexBasis'
  | 'flexGrow'
  | 'flexShrink'
  | 'gridArea'
  | 'gridColumn'
  | 'gridColumnEnd'
  | 'gridColumnStart'
  | 'gridRow'
  | 'gridRowEnd'
  | 'gridRowStart'
  | 'height'
  | 'justifySelf'
  | 'margin'
  | 'marginBlock'
  | 'marginBlockEnd'
  | 'marginBlockStart'
  | 'marginBottom'
  | 'marginInline'
  | 'marginInlineEnd'
  | 'marginInlineStart'
  | 'marginLeft'
  | 'marginRight'
  | 'marginTop'
  | 'maxHeight'
  | 'maxWidth'
  | 'minHeight'
  | 'minWidth'
  | 'order'
  | 'width'
>

export type ComponentLayoutStyle = StaticStyles<ComponentLayoutProperties>

export const BUTTON_VARIANTS = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]

export const BUTTON_SIZES = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const

export type ButtonSize = (typeof BUTTON_SIZES)[number]

export const BADGE_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'ghost',
  'link',
] as const

export type BadgeVariant = (typeof BADGE_VARIANTS)[number]

/** Fails typechecking when a style map and its public union drift apart. */
export type HasExactlyKeys<Actual, Expected extends PropertyKey> =
  Exclude<keyof Actual, Expected> extends never
    ? Exclude<Expected, keyof Actual> extends never
      ? true
      : false
    : false

export type Assert<T extends true> = T

type _AcceptedLayoutStyle = Readonly<{
  marginTop: StyleXClassNameFor<'marginTop', '1rem'>
}>

type _RejectedVisualStyle = Readonly<{
  backgroundColor: StyleXClassNameFor<'backgroundColor', 'red'>
}>

type _RejectedInlineLayoutStyle = Readonly<[_AcceptedLayoutStyle, InlineStyles]>

// Compile-time contract tests. A StyleX upgrade cannot silently widen this API.
type _LayoutPropertyIsAccepted = Assert<
  _AcceptedLayoutStyle extends ComponentLayoutStyle ? true : false
>
type _VisualPropertyIsRejected = Assert<
  _RejectedVisualStyle extends ComponentLayoutStyle ? false : true
>
type _InlineLayoutStyleIsRejected = Assert<
  _RejectedInlineLayoutStyle extends ComponentLayoutStyle ? false : true
>
