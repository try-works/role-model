import { Style } from '@pleat/core'
import type { Declarations, Properties, When } from '@pleat/core'

import { COMPONENT_LAYOUT_PROPERTY_NAMES } from '@/lib/layout-properties'

/**
 * The only Pleat properties accepted at a component call site.
 *
 * These properties position a component in its parent without changing the
 * component's color, typography, internal spacing, shape, or interaction
 * states. Visual changes belong in a named component variant instead.
 */
export type ComponentLayoutProperties = Pick<
  Properties,
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

declare const componentLayoutBrand: unique symbol

/**
 * A {@link Style.Style} proven to contain only {@link ComponentLayoutProperties}.
 * Only {@link layoutStyle} produces this type, so a raw `Style.make` result —
 * which may restyle the component — is rejected at the call site.
 */
export type ComponentLayoutStyle = Style.Style & {
  readonly [componentLayoutBrand]: 'ComponentLayoutStyle'
}

const LAYOUT_PROPERTY_NAMES = COMPONENT_LAYOUT_PROPERTY_NAMES

/**
 * The only way to construct a {@link ComponentLayoutStyle}: the property
 * allowlist is enforced at the type level by {@link ComponentLayoutProperties}
 * and at runtime for untyped callers.
 */
export const layoutStyle = (
  declarations: ComponentLayoutProperties,
): ComponentLayoutStyle => {
  for (const property of Object.keys(declarations)) {
    if (!LAYOUT_PROPERTY_NAMES.has(property)) {
      throw new Error(
        `layoutStyle only accepts parent-layout properties, got "${property}"`,
      )
    }
  }
  return Style.make(declarations as Declarations) as ComponentLayoutStyle
}

/**
 * Adds a conditional (media, container, state) branch to a
 * {@link ComponentLayoutStyle} while keeping the closed layout contract:
 * the branch declarations are validated exactly like {@link layoutStyle}.
 */
export const layoutWhen =
  (condition: When.Condition, declarations: ComponentLayoutProperties) =>
  (self: ComponentLayoutStyle): ComponentLayoutStyle =>
    Style.when(
      self,
      condition,
      layoutStyle(declarations),
    ) as ComponentLayoutStyle

type _RawStyleIsNotLayout = Assert<
  Style.Style extends ComponentLayoutStyle ? false : true
>

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
