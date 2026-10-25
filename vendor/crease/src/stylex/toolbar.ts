/* Ported from Meta Astryx Toolbar (packages/core/src/Toolbar/Toolbar.tsx) — examples and visual spec adapted to Crease UI tokens. */

import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  focusToolbarItemsMount,
  Message,
  TOOLBAR_EDGE_COMP_ATTR,
} from '@/lib/toolbar'
import type { ComponentLayoutStyle } from './contracts'
import { tokens } from './tokens.stylex'
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
  layoutStyle?: ComponentLayoutStyle
}>

const styles = stylex.create({
  chrome: {
    borderColor: tokens.border,
    borderStyle: 'none',
    borderWidth: 0,
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
  },
  variantTransparent: { backgroundColor: 'transparent' },
  variantSurface: {
    backgroundColor: tokens.card,
    color: tokens.cardForeground,
  },
  variantMuted: {
    backgroundColor: tokens.muted,
    color: tokens.foreground,
  },
  dividerTop: {
    borderBlockStartColor: tokens.border,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: '1px',
  },
  dividerBottom: {
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: '1px',
  },
  dividerStart: {
    borderInlineStartColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
  },
  dividerEnd: {
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
  },
  baseFlex: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    minHeight: '1.75rem',
  },
  baseGrid: {
    alignItems: 'center',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    minHeight: '1.75rem',
  },
  vertical: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  slot: {
    alignItems: 'center',
    display: 'flex',
    minWidth: 0,
  },
  slotEdgeComp: {
    marginInlineEnd: {
      default: null,
      ':has(> [data-crease-edge-comp]:last-child)': 'calc(-1 * 0.5rem)',
    },
    marginInlineStart: {
      default: null,
      ':has(> [data-crease-edge-comp]:first-child)': 'calc(-1 * 0.5rem)',
    },
  },
  centerSlot: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  endSlot: { justifyContent: 'flex-end' },
  startOnly: { flexBasis: '0%', flexGrow: '1', flexShrink: '1' },
  endOnly: { marginInlineStart: 'auto' },
})

const VARIANT_STYLE: Readonly<Record<ToolbarVariant, StaticStyles>> = {
  transparent: styles.variantTransparent,
  surface: styles.variantSurface,
  muted: styles.variantMuted,
}

const DIVIDER_STYLE: Readonly<Record<ToolbarDivider, StaticStyles>> = {
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
    extra: ReadonlyArray<StaticStyles>,
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
