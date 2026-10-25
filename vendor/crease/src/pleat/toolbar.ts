import { Style, When } from '@pleat/core'
/* Ported from Meta Astryx Toolbar (packages/core/src/Toolbar/Toolbar.tsx) — examples and visual spec adapted to Crease UI tokens. */

import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  focusToolbarItemsMount,
  Message,
  TOOLBAR_EDGE_COMP_ATTR,
} from '@/lib/toolbar'
import type { ComponentLayoutStyle } from './contracts'
import { tokens } from './tokens'
import { className } from './style'

/* PORT-NOTE: needs token 'containerPaddingInline' = 16px — the inline padding
   astryx's Section reads from --container-padding-inline-start. Also
   'data-crease-edge-comp' marks children eligible for astryx's
   edge compensation (components do not stamp it automatically). */

export { Message }
export { TOOLBAR_EDGE_COMP_ATTR }

export type ToolbarSize = 'sm' | 'md' | 'lg'
export type ToolbarOrientation = 'horizontal' | 'vertical'
export type ToolbarVariant = 'transparent' | 'surface' | 'muted'
export type ToolbarDivider = 'top' | 'bottom' | 'start' | 'end'
export type ToolbarGap = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10

export type ToolbarProps<Msg> = Readonly<{
  /** Accessible label for the toolbar (aria-label). */
  label: string
  /** Content aligned to the start (left in LTR). */
  startContent?: Html | ReadonlyArray<Html | string>
  /** Centered content. When present, switches the layout to CSS grid
      (1fr auto 1fr). */
  centerContent?: Html | ReadonlyArray<Html | string>
  /** Content aligned to the end (right in LTR). */
  endContent?: Html | ReadonlyArray<Html | string>
  /** Element size the toolbar is built for. Drives the data-size state so
      callers can keep child button/input sizes in sync; astryx cascades
      it via SizeContext. */
  size?: ToolbarSize
  /** Gap between items within each slot, in spacing steps (default 1). */
  gap?: ToolbarGap
  /** Orientation for keyboard navigation; controls arrow-key direction. */
  orientation?: ToolbarOrientation
  /** Background variant of the toolbar chrome (astryx's Section variant). */
  variant?: ToolbarVariant
  /** Divider borders rendered around the toolbar. */
  dividers?: ReadonlyArray<ToolbarDivider>
  /** Roving-tabindex arrow-key navigation between focusable items
      (default true, matching astryx). Requires toParentMessage. */
  hasKeyboardNavigation?: boolean
  /** Lifts toolbar-internal mount messages (roving-focus install). */
  toParentMessage?: (message: Message) => Msg
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const styles = {
  chrome: Style.make({
    borderColor: tokens.border,
    borderStyle: 'none',
    borderWidth: 0,
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
  }),
  variantTransparent: Style.make({ backgroundColor: 'transparent' }),
  variantSurface: Style.make({
    backgroundColor: tokens.card,
    color: tokens.cardForeground,
  }),
  variantMuted: Style.make({
    backgroundColor: tokens.muted,
    color: tokens.foreground,
  }),
  dividerTop: Style.make({
    borderBlockStartColor: tokens.border,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: '1px',
  }),
  dividerBottom: Style.make({
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: '1px',
  }),
  dividerStart: Style.make({
    borderInlineStartColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
  }),
  dividerEnd: Style.make({
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
  }),
  baseFlex: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    minHeight: '1.75rem',
  }),
  baseGrid: Style.make({
    alignItems: 'center',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    minHeight: '1.75rem',
  }),
  vertical: Style.make({ alignItems: 'stretch', flexDirection: 'column' }),
  slot: Style.make({ alignItems: 'center', display: 'flex', minWidth: 0 }),
  slotEdgeComp: Style.empty.pipe(
    Style.when(When.pseudo(':has(> [data-crease-edge-comp]:last-child)'), {
      marginInlineEnd: 'calc(-1 * 0.5rem)',
    }),
    Style.when(When.pseudo(':has(> [data-crease-edge-comp]:first-child)'), {
      marginInlineStart: 'calc(-1 * 0.5rem)',
    }),
  ),
  centerSlot: Style.make({ overflow: 'hidden', justifyContent: 'center' }),
  endSlot: Style.make({ justifyContent: 'flex-end' }),
  startOnly: Style.make({ flexBasis: '0%', flexGrow: '1', flexShrink: '1' }),
  endOnly: Style.make({ marginInlineStart: 'auto' }),
}

const VARIANT_STYLE: Readonly<Record<ToolbarVariant, Style.Style>> = {
  transparent: styles.variantTransparent,
  surface: styles.variantSurface,
  muted: styles.variantMuted,
}

const DIVIDER_STYLE: Readonly<Record<ToolbarDivider, Style.Style>> = {
  top: styles.dividerTop,
  bottom: styles.dividerBottom,
  start: styles.dividerStart,
  end: styles.dividerEnd,
}

const GAP_REM: Readonly<Record<ToolbarGap, string>> = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
}

export const toolbar = <Msg>(
  props: ToolbarProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'horizontal'
  const variant = props.variant ?? 'transparent'
  const gap = props.gap ?? 1
  const size = props.size ?? 'md'
  const hasKeyboardNavigation = props.hasKeyboardNavigation ?? true
  const hasCenterContent = props.centerContent !== undefined
  const hasStartContent = props.startContent !== undefined
  const hasEndContent = props.endContent !== undefined
  const gapAttr = h.Style({ gap: GAP_REM[gap] })

  const dividerStyles = (props.dividers ?? []).map(d => DIVIDER_STYLE[d])

  const slot = (
    content: Html | ReadonlyArray<Html | string>,
    extra: ReadonlyArray<Style.Style | false>,
    edgeComp: boolean,
  ): Html =>
    h.div(
      [
        h.Class(
          className(styles.slot, edgeComp && styles.slotEdgeComp, ...extra),
        ),
        gapAttr,
      ],
      Array.isArray(content) ? [...content] : [content],
    )

  const inner = hasCenterContent
    ? [
        slot(props.startContent ?? [], [], true),
        slot(props.centerContent, [styles.centerSlot], false),
        slot(props.endContent ?? [], [styles.endSlot], true),
      ]
    : [
        ...(hasStartContent
          ? [
              slot(
                props.startContent,
                [!hasEndContent && styles.startOnly],
                true,
              ),
            ]
          : []),
        ...(hasEndContent
          ? [
              slot(
                props.endContent,
                [styles.endSlot, !hasStartContent && styles.endOnly],
                true,
              ),
            ]
          : []),
      ]

  const mountAttrs =
    hasKeyboardNavigation && props.toParentMessage !== undefined
      ? [h.OnMount(focusToolbarItemsMount(props.toParentMessage, orientation))]
      : []

  return h.div(
    [
      h.DataAttribute('slot', 'toolbar-section'),
      h.DataAttribute('size', size),
      h.Class(
        className(
          styles.chrome,
          VARIANT_STYLE[variant],
          ...dividerStyles,
          props.layoutStyle,
        ),
      ),
    ],
    [
      h.div(
        [
          h.Role('toolbar'),
          h.AriaLabel(props.label),
          h.DataAttribute('slot', 'toolbar'),
          h.AriaOrientation(orientation),
          h.Class(
            className(
              hasCenterContent ? styles.baseGrid : styles.baseFlex,
              orientation === 'vertical' && styles.vertical,
            ),
          ),
          gapAttr,
          ...mountAttrs,
        ],
        inner,
      ),
    ],
  )
}
