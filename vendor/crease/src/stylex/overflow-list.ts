import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Behavior from '@/lib/overflow-list'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

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

/* Ported from Meta Astryx OverflowList.tsx — StyleX renderer.
   See src/ui/overflow-list.ts for the port contract. */

export type OverflowListProps<Msg> = Readonly<{
  model: Behavior.Model
  toParentMessage: (message: Behavior.Message) => Msg
  gap?: Behavior.SpacingStep
  minVisibleItems?: number
  maxVisibleItems?: number
  maxRows?: number
  collapseFrom?: Behavior.CollapseFrom
  behavior?: Behavior.OverflowBehavior
  overflowRenderer?: (
    overflowItems: ReadonlyArray<Behavior.OverflowListItem>,
  ) => Html
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>

const styles = stylex.create({
  fragment: {
    display: 'contents',
  },
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  containerMultiRow: {
    overflow: 'hidden',
    alignContent: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    whiteSpace: 'normal',
    minWidth: 0,
  },
  fillParent: {
    width: '100%',
  },
  measureContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    pointerEvents: 'none',
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'nowrap',
    height: 0,
  },
  measureIndicator: {
    display: 'inline-flex',
  },
})

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

  const gapStyle = { gap: `${String(gapPx)}px` }

  return h.div(
    [
      h.Class(className(styles.fragment)),
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
      h.div(
        [
          h.DataAttribute('overflow-measure', ''),
          h.AriaHidden(true),
          h.Inert(true),
          h.Class(className(styles.measureContainer)),
          h.Style(gapStyle),
        ],
        [
          ...items,
          ...(overflowRenderer === undefined
            ? []
            : [
                h.div(
                  [h.Class(className(styles.measureIndicator))],
                  [overflowRenderer(allItems)],
                ),
              ]),
        ],
      ),
      h.div(
        [
          h.DataAttribute('overflow-visible', ''),
          h.DataAttribute('slot', 'overflow-list'),
          h.Class(
            className(
              isMultiRow ? styles.containerMultiRow : styles.container,
              observeParent && hasOverflow && styles.fillParent,
              props.layoutStyle,
            ),
          ),
          h.Style({
            ...gapStyle,
            ...(isMultiRow && model.rowHeight > 0 && maxRows !== undefined
              ? {
                  maxHeight: `calc(${String(model.rowHeight)}px * ${String(maxRows)} + ${String(gapPx)}px * ${String(maxRows - 1)})`,
                }
              : {}),
          }),
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
