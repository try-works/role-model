import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Behavior from '@/lib/overflow-list'
import { cn } from '@/lib/utils'

export {
  Model,
  Message,
  OutMessage,
  init,
  update,
  computeOverflow,
  spacingToPx,
  collapsedIndices,
} from '@/lib/overflow-list'
export type {
  CollapseFrom,
  OverflowBehavior,
  OverflowListItem,
  SpacingStep,
} from '@/lib/overflow-list'

/* Ported from Meta Astryx OverflowList.tsx — the render side. Two sibling
   containers under a display:contents wrapper (foldkit's fragment stand-in):
   a hidden measurement row holding every item plus a max-width indicator
   copy, and the visible row showing the measured-visible items plus the
   live indicator. */

export type OverflowListProps<Msg> = Readonly<{
  model: Behavior.Model
  toParentMessage: (message: Behavior.Message) => Msg
  /** @default 2 — spacing-step gap between items. */
  gap?: Behavior.SpacingStep
  /** @default 0 — floor: always show at least this many items. */
  minVisibleItems?: number
  /** Ceiling partner to minVisibleItems; extras collapse into the overflow. */
  maxVisibleItems?: number
  /** Wrap items across up to this many rows before collapsing the rest. */
  maxRows?: number
  /** @default 'end' — which end items collapse from. */
  collapseFrom?: Behavior.CollapseFrom
  /** @default 'observeSelf' — 'observeParent' watches the parent width. */
  behavior?: Behavior.OverflowBehavior
  /** Renders the overflow indicator over the collapsed items. Measured
      automatically in the hidden container. */
  overflowRenderer?: (
    overflowItems: ReadonlyArray<Behavior.OverflowListItem>,
  ) => Html
  children?: ReadonlyArray<Html | string>
  class?: string
}>

const GAP_CLASS: Readonly<Record<Behavior.SpacingStep, string>> = {
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

export const overflowList = <Msg>(
  props: OverflowListProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const {
    model,
    toParentMessage,
    gap = 2,
    minVisibleItems = 0,
    maxVisibleItems,
    maxRows,
    collapseFrom = 'end',
    behavior = 'observeSelf',
    overflowRenderer,
    children,
  } = props
  const items = children ?? []
  const itemCount = items.length
  const gapPx = Behavior.spacingToPx[gap]
  const isMultiRow = maxRows !== undefined && maxRows > 1
  const hasOverflow = model.visibleCount < itemCount
  const observeParent = behavior === 'observeParent'

  const allItems: ReadonlyArray<Behavior.OverflowListItem> = items.map(
    (item, index) => ({ item, index }),
  )
  const visibleItems =
    collapseFrom === 'end'
      ? allItems.slice(0, model.visibleCount)
      : allItems.slice(itemCount - model.visibleCount)
  const overflowItems =
    collapseFrom === 'end'
      ? allItems.slice(model.visibleCount)
      : allItems.slice(0, itemCount - model.visibleCount)

  return h.div(
    [
      h.Class('contents'),
      ...Behavior.observeOverflowAttributes(
        h,
        {
          itemCount,
          gapPx,
          minVisibleItems,
          ...(maxVisibleItems === undefined ? {} : { maxVisibleItems }),
          ...(maxRows === undefined ? {} : { maxRows }),
          collapseFrom,
          behavior,
        },
        message => toParentMessage(message),
      ),
    ],
    [
      /* Hidden measurement row — all items + the indicator at its maximum
         width (astryx measures it against the full overflow set). */
      h.div(
        [
          h.DataAttribute('overflow-measure', ''),
          h.AriaHidden(true),
          h.Inert(true),
          h.Class(
            cn(
              'pointer-events-none absolute invisible flex h-0 items-center overflow-hidden whitespace-nowrap',
              GAP_CLASS[gap],
            ),
          ),
        ],
        [
          ...items,
          ...(overflowRenderer === undefined
            ? []
            : [h.div([h.Class('inline-flex')], [overflowRenderer(allItems)])]),
        ],
      ),
      /* Visible row */
      h.div(
        [
          h.DataAttribute('overflow-visible', ''),
          h.DataAttribute('slot', 'overflow-list'),
          h.Class(
            cn(
              isMultiRow
                ? 'flex min-w-0 flex-wrap content-start overflow-hidden whitespace-normal'
                : 'flex min-w-0 items-center overflow-hidden whitespace-nowrap',
              GAP_CLASS[gap],
              observeParent && hasOverflow && 'w-full',
              props.class,
            ),
          ),
          ...(isMultiRow && model.rowHeight > 0 && maxRows !== undefined
            ? [
                h.Style({
                  maxHeight: `calc(${String(model.rowHeight)}px * ${String(maxRows)} + ${String(gapPx)}px * ${String(maxRows - 1)})`,
                }),
              ]
            : []),
        ],
        [
          ...(collapseFrom === 'start' &&
          hasOverflow &&
          overflowRenderer !== undefined
            ? [overflowRenderer(overflowItems)]
            : []),
          ...visibleItems.map(({ item }) => item),
          ...(collapseFrom === 'end' &&
          hasOverflow &&
          overflowRenderer !== undefined
            ? [overflowRenderer(overflowItems)]
            : []),
        ],
      ),
    ],
  )
}
