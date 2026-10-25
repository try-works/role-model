import { Effect, Queue, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'

/* Ported from Meta Astryx OverflowList.tsx + hooks/useOverflow.ts +
   hooks/computeOverflow.ts — a horizontal list that measures its items in a
   hidden container (ResizeObserver on both containers) and collapses those
   that don't fit behind an overflow indicator. The pure fit/clamp/row-packing
   math below is verbatim computeOverflow. */

export const SPACING_STEPS = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const
export type SpacingStep = (typeof SPACING_STEPS)[number]

export const spacingToPx: Readonly<Record<SpacingStep, number>> = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
}

export type CollapseFrom = 'start' | 'end'
export type OverflowBehavior = 'observeSelf' | 'observeParent'

// =============================================================================
// computeOverflow — verbatim port of astryx's pure helper
// =============================================================================

export type ComputeOverflowInput = Readonly<{
  widths: ReadonlyArray<number>
  gap: number
  availableWidth: number
  indicatorWidth: number
  minVisibleItems: number
  maxVisibleItems?: number
  maxRows?: number
  collapseFrom: CollapseFrom
}>

export type ComputeOverflowResult = Readonly<{
  visibleCount: number
  rows: number
}>

const clamp = (value: number, min: number, max: number): number =>
  Math.max(Math.min(value, max), min)

const resolveBounds = (
  itemCount: number,
  minVisibleItems: number,
  maxVisibleItems: number | undefined,
): Readonly<{ floor: number; ceiling: number }> => ({
  floor: Math.max(0, Math.min(minVisibleItems, itemCount)),
  ceiling: Math.max(
    0,
    Math.min(
      maxVisibleItems === undefined ? itemCount : maxVisibleItems,
      itemCount,
    ),
  ),
})

/* Single-line greedy fit: admits items until the next wouldn't fit, reserving
   indicator space for every non-final admitted item. */
const computeSingleLineFit = (
  orderedWidths: ReadonlyArray<number>,
  gap: number,
  availableWidth: number,
  indicatorWidth: number,
  floor: number,
  ceiling: number,
): number => {
  let totalWidth = 0
  let count = 0
  for (let i = 0; i < orderedWidths.length; i++) {
    if (count >= ceiling) {
      break
    }
    const itemWidth = orderedWidths[i] ?? 0
    const gapWidth = i > 0 ? gap : 0
    const candidateWidth = totalWidth + itemWidth + gapWidth
    const isLastItem = i === orderedWidths.length - 1
    const reservedWidth = isLastItem
      ? 0
      : indicatorWidth + (count > 0 || indicatorWidth > 0 ? gap : 0)
    if (candidateWidth + reservedWidth > availableWidth && count >= floor) {
      break
    }
    totalWidth = candidateWidth
    count++
  }
  return count
}

/* Pack items into rows of `availableWidth`, reserving indicator space on the
   last allowed row. */
const packRows = (
  orderedWidths: ReadonlyArray<number>,
  gap: number,
  availableWidth: number,
  indicatorReserve: number,
  maxRows: number,
): Readonly<{ placed: number; rows: number }> => {
  let placed = 0
  let row = 1
  let rowWidth = 0
  for (let i = 0; i < orderedWidths.length; i++) {
    const w = orderedWidths[i] ?? 0
    const isFirstInRow = rowWidth === 0
    const candidate = isFirstInRow ? w : rowWidth + gap + w
    const onLastRow = row === maxRows
    const reserve =
      onLastRow && indicatorReserve > 0 ? indicatorReserve + gap : 0
    if (candidate + reserve <= availableWidth) {
      rowWidth = candidate
      placed++
      continue
    }
    if (isFirstInRow) {
      if (onLastRow && reserve > 0) {
        break
      }
      rowWidth = candidate
      placed++
      continue
    }
    if (row >= maxRows) {
      break
    }
    row++
    rowWidth = 0
    i--
  }
  return { placed, rows: row }
}

const countRows = (
  orderedWidths: ReadonlyArray<number>,
  gap: number,
  availableWidth: number,
): number => {
  if (orderedWidths.length === 0) {
    return 0
  }
  let rows = 1
  let rowWidth = 0
  for (let i = 0; i < orderedWidths.length; i++) {
    const w = orderedWidths[i] ?? 0
    const isFirstInRow = rowWidth === 0
    const candidate = isFirstInRow ? w : rowWidth + gap + w
    if (candidate <= availableWidth || isFirstInRow) {
      rowWidth = candidate
    } else {
      rows++
      rowWidth = w
    }
  }
  return rows
}

const computeMultiRowFit = (
  orderedWidths: ReadonlyArray<number>,
  gap: number,
  availableWidth: number,
  indicatorWidth: number,
  maxRows: number,
): Readonly<{ count: number; rows: number }> => {
  const n = orderedWidths.length
  if (n === 0) {
    return { count: 0, rows: 0 }
  }
  const packAll = packRows(orderedWidths, gap, availableWidth, 0, maxRows)
  if (packAll.placed === n) {
    return { count: n, rows: packAll.rows }
  }
  const packWithIndicator = packRows(
    orderedWidths,
    gap,
    availableWidth,
    indicatorWidth,
    maxRows,
  )
  const count = packWithIndicator.placed
  const rows = countRows(orderedWidths.slice(0, count), gap, availableWidth)
  return { count, rows: Math.max(count > 0 ? 1 : 0, rows) }
}

export const computeOverflow = (
  input: ComputeOverflowInput,
): ComputeOverflowResult => {
  const {
    widths,
    gap,
    availableWidth,
    indicatorWidth,
    minVisibleItems,
    maxVisibleItems,
    maxRows,
    collapseFrom,
  } = input
  const itemCount = widths.length
  if (itemCount === 0) {
    return { visibleCount: 0, rows: 0 }
  }
  const { floor, ceiling } = resolveBounds(
    itemCount,
    minVisibleItems,
    maxVisibleItems,
  )
  const orderedWidths =
    collapseFrom === 'end' ? [...widths] : [...widths].reverse()
  const multiRow = maxRows !== undefined && maxRows > 1
  if (!multiRow) {
    const fitCount = computeSingleLineFit(
      orderedWidths,
      gap,
      availableWidth,
      indicatorWidth,
      floor,
      ceiling,
    )
    const visibleCount = clamp(fitCount, floor, ceiling)
    return { visibleCount, rows: visibleCount > 0 ? 1 : 0 }
  }
  const { count, rows } = computeMultiRowFit(
    orderedWidths,
    gap,
    availableWidth,
    indicatorWidth,
    maxRows,
  )
  const visibleCount = clamp(count, floor, ceiling)
  const resolvedRows =
    visibleCount === count
      ? rows
      : countRows(orderedWidths.slice(0, visibleCount), gap, availableWidth)
  return {
    visibleCount,
    rows: visibleCount > 0 ? Math.max(1, resolvedRows) : 0,
  }
}

// =============================================================================
// Model / Update
// =============================================================================

export const Model = S.Struct({
  itemCount: S.Number,
  collapseFrom: S.Literals(['start', 'end'] as const),
  visibleCount: S.Number,
  rows: S.Number,
  rowHeight: S.Number,
  /** Indices of the items currently collapsed, in original order. Tracked so
      OverflowChanged only fires when the set actually changes (astryx's
      report-key contract). */
  hiddenIndices: S.Array(S.Number),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Measured: {
    visibleCount: S.Number,
    rows: S.Number,
    rowHeight: S.Number,
  },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  OverflowChanged: { hiddenIndices: S.Array(S.Number) },
})
export type OutMessage = typeof OutMessage.Type

/** Optimistic pre-measurement state: everything visible (astryx initializes
   visibleCount to itemCount; the first measurement corrects it). */
export const init = (
  config: Readonly<{
    itemCount: number
    collapseFrom?: CollapseFrom
  }>,
): Model => ({
  itemCount: config.itemCount,
  collapseFrom: config.collapseFrom ?? 'end',
  visibleCount: config.itemCount,
  rows: 1,
  rowHeight: 0,
  hiddenIndices: [],
})

export const collapsedIndices = (
  itemCount: number,
  visibleCount: number,
  collapseFrom: CollapseFrom,
): ReadonlyArray<number> => {
  const hidden = itemCount - visibleCount
  if (hidden <= 0) {
    return []
  }
  const indices: Array<number> = []
  for (let i = 0; i < hidden; i++) {
    indices.push(collapseFrom === 'end' ? itemCount - hidden + i : i)
  }
  return indices
}

const sameIndices = (
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): boolean => a.length === b.length && a.every((v, i) => v === b[i])

export const update = (
  model: Model,
  message: Message,
): Update.ReturnWithOutMessage<Model, Message, OutMessage> => {
  switch (message._tag) {
    case 'Measured': {
      const hiddenIndices = collapsedIndices(
        model.itemCount,
        message.visibleCount,
        model.collapseFrom,
      )
      const changed = !sameIndices(hiddenIndices, model.hiddenIndices)
      return {
        model: {
          ...model,
          visibleCount: message.visibleCount,
          rows: message.rows,
          rowHeight: message.rowHeight,
          hiddenIndices,
        },
        ...(changed
          ? { outMessage: OutMessage.OverflowChanged({ hiddenIndices }) }
          : {}),
      }
    }
  }
}

// =============================================================================
// Mount — ResizeObserver-driven measurement (port of useOverflow)
// =============================================================================

const MEASURE_SELECTOR = '[data-overflow-measure]'
const VISIBLE_SELECTOR = '[data-overflow-visible]'

const calculate = (
  measure: HTMLElement,
  container: HTMLElement,
  config: Readonly<{
    itemCount: number
    gap: number
    minVisibleItems: number
    maxVisibleItems?: number
    maxRows?: number
    collapseFrom: CollapseFrom
    observeParent: boolean
    observed: HTMLElement
  }>,
): Readonly<{ visibleCount: number; rows: number; rowHeight: number }> => {
  let availableWidth: number
  if (config.observeParent) {
    const parentStyle = getComputedStyle(config.observed)
    availableWidth =
      config.observed.clientWidth -
      Number.parseFloat(parentStyle.paddingLeft) -
      Number.parseFloat(parentStyle.paddingRight)
  } else {
    availableWidth = container.offsetWidth
  }

  const allChildren = Array.from(measure.children) as Array<HTMLElement>
  const hasIndicator = allChildren.length > config.itemCount
  const children = hasIndicator
    ? allChildren.slice(0, config.itemCount)
    : allChildren
  const indicatorWidth = hasIndicator
    ? (allChildren[allChildren.length - 1]?.offsetWidth ?? 0)
    : 0
  if (children.length === 0) {
    return { visibleCount: 0, rows: 0, rowHeight: 0 }
  }
  const widths = children.map(child => child.offsetWidth)
  const rowHeight = children.reduce(
    (max, child) => Math.max(max, child.offsetHeight),
    0,
  )
  const { visibleCount, rows } = computeOverflow({
    widths,
    gap: config.gap,
    availableWidth,
    indicatorWidth,
    minVisibleItems: config.minVisibleItems,
    ...(config.maxVisibleItems === undefined
      ? {}
      : { maxVisibleItems: config.maxVisibleItems }),
    ...(config.maxRows === undefined ? {} : { maxRows: config.maxRows }),
    collapseFrom: config.collapseFrom,
  })
  return { visibleCount, rows, rowHeight }
}

export const ObserveOverflow = Mount.defineStream('ObserveOverflow', {
  args: {
    itemCount: S.Number,
    gap: S.Number,
    minVisibleItems: S.Number,
    maxVisibleItems: S.UndefinedOr(S.Number),
    maxRows: S.UndefinedOr(S.Number),
    collapseFrom: S.Literals(['start', 'end'] as const),
    behavior: S.Literals(['observeSelf', 'observeParent'] as const),
  },
  messages: [Message.Measured],
  execute: ({
    element,
    itemCount,
    gap,
    minVisibleItems,
    maxVisibleItems,
    maxRows,
    collapseFrom,
    behavior,
  }) =>
    Stream.callback<typeof Message.Measured.Type>(queue =>
      Effect.gen(function* () {
        /* The mount element wraps the measure + visible containers. */
        const measure = element.querySelector<HTMLElement>(MEASURE_SELECTOR)
        const container = element.querySelector<HTMLElement>(VISIBLE_SELECTOR)
        if (measure === null || container === null) {
          return yield* Effect.never
        }
        /* observeParent watches the element the list sits inside — the
           mount element's parent, not the visible row's own parent (the
           mount element is `display:contents`, i.e. boxless: RO never
           fires on it and its clientWidth is 0). */
        const observed =
          behavior === 'observeParent' && element.parentElement !== null
            ? element.parentElement
            : container
        const config = {
          itemCount,
          gap,
          minVisibleItems,
          collapseFrom,
          observeParent: behavior === 'observeParent',
          observed,
          ...(maxVisibleItems === undefined ? {} : { maxVisibleItems }),
          ...(maxRows === undefined ? {} : { maxRows }),
        }
        const run = (): void => {
          const { visibleCount, rows, rowHeight } = calculate(
            measure,
            container,
            config,
          )
          Queue.offerUnsafe(
            queue,
            Message.Measured({ visibleCount, rows, rowHeight }),
          )
        }
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const observer = new ResizeObserver(run)
            observer.observe(measure)
            observer.observe(observed)
            run()
            return observer
          }),
          observer => Effect.sync(() => observer.disconnect()),
        )
        return yield* Effect.never
      }),
    ),
})

export const observeOverflowAttributes = <Msg>(
  h: HtmlBuilder<Msg>,
  props: Readonly<{
    itemCount: number
    gapPx: number
    minVisibleItems: number
    maxVisibleItems?: number
    maxRows?: number
    collapseFrom: CollapseFrom
    behavior: OverflowBehavior
  }>,
  onMeasured: (message: typeof Message.Measured.Type) => Msg,
): ReadonlyArray<Attribute<Msg>> => [
  h.OnMount(
    Mount.mapMessage(
      ObserveOverflow({
        itemCount: props.itemCount,
        gap: props.gapPx,
        minVisibleItems: props.minVisibleItems,
        maxVisibleItems: props.maxVisibleItems,
        maxRows: props.maxRows,
        collapseFrom: props.collapseFrom,
        behavior: props.behavior,
      }),
      onMeasured,
    ),
  ),
]

/** One overflow item handed to `overflowRenderer`: the hidden child plus its
   original index (astryx's OverflowItem). */
export type OverflowListItem = Readonly<{ item: Html | string; index: number }>
