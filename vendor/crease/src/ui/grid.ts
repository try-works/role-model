import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Grid/Grid.tsx + GridSpan.tsx — CSS Grid layout
   primitive. The astryx spacing scale (1 step = 4px) maps 1:1 onto Tailwind's
   spacing scale; column templates and spans are runtime values, so they emit
   inline styles rather than classes. */

export type GridAlignment = 'start' | 'center' | 'end' | 'stretch'
export type GridSpacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10
export type GridSizeValue = number | string
export type GridElement =
  | 'article'
  | 'aside'
  | 'div'
  | 'fieldset'
  | 'footer'
  | 'form'
  | 'header'
  | 'li'
  | 'main'
  | 'nav'
  | 'ol'
  | 'section'
  | 'ul'

/**
 * Column configuration.
 * - `number` — fixed equal-width columns (`repeat(N, 1fr)`)
 * - `{ minWidth, max?, repeat? }` — responsive columns based on a minimum
 *   child width. `repeat: 'fill'` (default) preserves empty tracks for
 *   consistent widths; `repeat: 'fit'` collapses empty tracks so present
 *   columns stretch. `max` caps the column count while keeping present
 *   columns filling the row.
 */
export type GridColumns =
  | number
  | Readonly<{
      minWidth: number
      max?: number
      repeat?: 'fill' | 'fit'
    }>

const alignClasses: Record<GridAlignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

const justifyClasses: Record<GridAlignment, string> = {
  start: 'justify-items-start',
  center: 'justify-items-center',
  end: 'justify-items-end',
  stretch: 'justify-items-stretch',
}

const gapClasses: Record<GridSpacing, string> = {
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

const rowGapClasses: Record<GridSpacing, string> = {
  0: 'gap-y-0',
  0.5: 'gap-y-0.5',
  1: 'gap-y-1',
  1.5: 'gap-y-1.5',
  2: 'gap-y-2',
  3: 'gap-y-3',
  4: 'gap-y-4',
  5: 'gap-y-5',
  6: 'gap-y-6',
  8: 'gap-y-8',
  10: 'gap-y-10',
}

const columnGapClasses: Record<GridSpacing, string> = {
  0: 'gap-x-0',
  0.5: 'gap-x-0.5',
  1: 'gap-x-1',
  1.5: 'gap-x-1.5',
  2: 'gap-x-2',
  3: 'gap-x-3',
  4: 'gap-x-4',
  5: 'gap-x-5',
  6: 'gap-x-6',
  8: 'gap-x-8',
  10: 'gap-x-10',
}

const sizeValue = (value: GridSizeValue): string =>
  typeof value === 'number' ? `${value}px` : value

const spacingRem: Record<GridSpacing, string> = {
  0: '0px',
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

/* Ported from astryx buildCappedTemplate: cap the column count on the track
   min — each track is at least perColumn = (100% - (max-1)*gap)/max, so more
   than `max` tracks can never fit; the track max stays 1fr so fewer columns
   still fill the row. The track min is max(minWidth, perColumn) wrapped in
   min(100%, …) so a lone column shrinks to the container instead of
   overflowing it. */
const buildCappedTemplate = (
  minWidth: number,
  maxCols: number,
  repeatMode: 'auto-fill' | 'auto-fit',
  gap: GridSpacing | undefined,
  columnGap: GridSpacing | undefined,
): string => {
  const gapValue =
    columnGap !== undefined
      ? spacingRem[columnGap]
      : gap !== undefined
        ? spacingRem[gap]
        : undefined
  const perColumn =
    gapValue === undefined
      ? `calc(100% / ${String(maxCols)})`
      : `calc((100% - ${String(maxCols - 1)} * ${gapValue}) / ${String(maxCols)})`
  const trackMin = `min(100%, max(${String(minWidth)}px, ${perColumn}))`
  return `repeat(${repeatMode}, minmax(${trackMin}, 1fr))`
}

const gridTemplateColumns = (
  columns: GridColumns | undefined,
  gap: GridSpacing | undefined,
  columnGap: GridSpacing | undefined,
): string => {
  if (typeof columns === 'number' && columns > 0) {
    return `repeat(${String(columns)}, 1fr)`
  }
  if (typeof columns === 'object') {
    const repeatMode = columns.repeat === 'fit' ? 'auto-fit' : 'auto-fill'
    if (columns.max !== undefined && columns.max > 0) {
      return buildCappedTemplate(
        columns.minWidth,
        columns.max,
        repeatMode,
        gap,
        columnGap,
      )
    }
    return `repeat(${repeatMode}, minmax(${String(columns.minWidth)}px, 1fr))`
  }
  return '1fr'
}

export type GridProps = Readonly<{
  /** Column configuration — a fixed count or a responsive min-width rule. */
  columns?: GridColumns
  /** Height of each implicit row track in pixels (grid-auto-rows). */
  rowHeight?: number
  /** Spacing between all grid items (astryx spacing steps; 1 step = 4px). */
  gap?: GridSpacing
  /** Spacing between rows; overrides `gap` on the row axis. */
  rowGap?: GridSpacing
  /** Spacing between columns; overrides `gap` on the column axis. */
  columnGap?: GridSpacing
  /** Vertical alignment of grid items (align-items). Default 'stretch'. */
  align?: GridAlignment
  /** Horizontal alignment of grid items (justify-items). Default 'stretch'. */
  justify?: GridAlignment
  /** Container width; numbers are pixels. */
  width?: GridSizeValue
  /** Container height; numbers are pixels. */
  height?: GridSizeValue
  /** Container max-width; numbers are pixels. */
  maxWidth?: GridSizeValue
  /** Container min-height; numbers are pixels. */
  minHeight?: GridSizeValue
  /** The element to render. */
  as?: GridElement
  children?: ReadonlyArray<Html | string>
  class?: string
}>

export const grid = <Msg>(props: GridProps, h: HtmlBuilder<Msg>): Html => {
  const style: Record<string, string> = {
    gridTemplateColumns: gridTemplateColumns(
      props.columns,
      props.gap,
      props.columnGap,
    ),
    ...(props.rowHeight === undefined
      ? {}
      : { gridAutoRows: `${String(props.rowHeight)}px` }),
    ...(props.width === undefined ? {} : { width: sizeValue(props.width) }),
    ...(props.height === undefined ? {} : { height: sizeValue(props.height) }),
    ...(props.maxWidth === undefined
      ? {}
      : { maxWidth: sizeValue(props.maxWidth) }),
    ...(props.minHeight === undefined
      ? {}
      : { minHeight: sizeValue(props.minHeight) }),
  }
  const attributes = [
    h.DataAttribute('slot', 'grid'),
    h.Class(
      cn(
        'grid',
        props.gap === undefined ? undefined : gapClasses[props.gap],
        props.rowGap === undefined ? undefined : rowGapClasses[props.rowGap],
        props.columnGap === undefined
          ? undefined
          : columnGapClasses[props.columnGap],
        props.align === undefined ? undefined : alignClasses[props.align],
        props.justify === undefined ? undefined : justifyClasses[props.justify],
        props.class,
      ),
    ),
    h.Style(style),
  ]
  const children = [...(props.children ?? [])]
  const element = props.as ?? 'div'
  return h[element](attributes, children)
}

export type GridSpanProps = Readonly<{
  /** Columns to span — a number (`grid-column: span N`) or 'full' (1 / -1). */
  columns?: number | 'full'
  /** Rows to span (`grid-row: span N`). */
  rows?: number
  /** The element to render. */
  as?: GridElement
  children?: ReadonlyArray<Html | string>
  class?: string
}>

export const gridSpan = <Msg>(
  props: GridSpanProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const style: Record<string, string> = {
    ...(props.columns === undefined
      ? {}
      : {
          gridColumn:
            props.columns === 'full'
              ? '1 / -1'
              : `span ${String(props.columns)}`,
        }),
    ...(props.rows === undefined
      ? {}
      : { gridRow: `span ${String(props.rows)}` }),
  }
  const attributes = [
    h.DataAttribute('slot', 'grid-span'),
    h.Class(
      cn(
        // astryx GridSpan base: prevents overflow and fills the grid cell.
        'grid h-full min-w-0',
        props.class,
      ),
    ),
    ...(Object.keys(style).length > 0 ? [h.Style(style)] : []),
  ]
  const children = [...(props.children ?? [])]
  const element = props.as ?? 'div'
  return h[element](attributes, children)
}
