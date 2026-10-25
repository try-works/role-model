/* Ported from Meta Astryx Toolbar (packages/core/src/Toolbar/Toolbar.tsx) — examples and visual spec adapted to Crease UI tokens. */

import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  focusToolbarItemsMount,
  Message,
  TOOLBAR_EDGE_COMP_ATTR,
} from '@/lib/toolbar'
import { cn } from '@/lib/utils'

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
  class?: string
}>

const VARIANT_CLASS: Readonly<Record<ToolbarVariant, string>> = {
  transparent: 'bg-transparent',
  surface: 'bg-card text-card-foreground',
  muted: 'bg-muted text-foreground',
}

const GAP_CLASS: Readonly<Record<ToolbarGap, string>> = {
  0: 'gap-0',
  0.5: 'gap-0.5',
  1: 'gap-1',
  1.5: 'gap-1.5',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
}

const DIVIDER_CLASS: Readonly<Record<ToolbarDivider, string>> = {
  top: 'border-t',
  bottom: 'border-b',
  start: 'border-s',
  end: 'border-e',
}

const SLOT_BASE = 'flex items-center'
const EDGE_COMP =
  'has-[>[data-crease-edge-comp]:first-child]:-ms-2 has-[>[data-crease-edge-comp]:last-child]:-me-2'

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
  const gapClass = GAP_CLASS[gap]

  const dividerClasses = (props.dividers ?? []).map(d => DIVIDER_CLASS[d])

  const slot = (
    content: Html | ReadonlyArray<Html | string>,
    extra: string,
    edgeComp: boolean,
  ): Html =>
    h.div(
      [h.Class(cn(SLOT_BASE, gapClass, edgeComp && EDGE_COMP, extra))],
      Array.isArray(content) ? [...content] : [content],
    )

  const inner = hasCenterContent
    ? [
        slot(props.startContent ?? [], 'min-w-0', true),
        slot(
          props.centerContent,
          'min-w-0 justify-center overflow-hidden',
          false,
        ),
        slot(props.endContent ?? [], 'min-w-0 justify-end', true),
      ]
    : [
        ...(hasStartContent
          ? [
              slot(
                props.startContent,
                cn('min-w-0', !hasEndContent && 'flex-1'),
                true,
              ),
            ]
          : []),
        ...(hasEndContent
          ? [
              slot(
                props.endContent,
                cn('min-w-0 justify-end', !hasStartContent && 'ms-auto'),
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
        cn(
          'border-border py-2 px-4',
          VARIANT_CLASS[variant],
          ...dividerClasses,
          props.class,
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
            cn(
              hasCenterContent
                ? 'grid grid-cols-[1fr_auto_1fr] items-center'
                : 'flex items-center justify-between',
              orientation === 'vertical' && 'flex-col items-stretch',
              'min-h-7',
              gapClass,
            ),
          ),
          ...mountAttrs,
        ],
        inner,
      ),
    ],
  )
}
