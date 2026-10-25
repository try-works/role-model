import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

/* Ported from Meta Astryx Grid/grid.stylex.ts + GridSpan.tsx — CSS Grid
   layout primitive. astryx spacing vars become literal rem values on the
   identical 4px scale; column templates, auto-rows, and spans are runtime
   values emitted as inline styles (same convention as the Tailwind
   renderer). */

const alignStyles = stylex.create({
  start: { alignItems: 'start' },
  center: { alignItems: 'center' },
  end: { alignItems: 'end' },
  stretch: { alignItems: 'stretch' },
})

const justifyStyles = stylex.create({
  start: { justifyItems: 'start' },
  center: { justifyItems: 'center' },
  end: { justifyItems: 'end' },
  stretch: { justifyItems: 'stretch' },
})

const gapStyles = stylex.create({
  0: { columnGap: '0px', rowGap: '0px' },
  0.5: { columnGap: '0.125rem', rowGap: '0.125rem' },
  1: { columnGap: '0.25rem', rowGap: '0.25rem' },
  1.5: { columnGap: '0.375rem', rowGap: '0.375rem' },
  2: { columnGap: '0.5rem', rowGap: '0.5rem' },
  3: { columnGap: '0.75rem', rowGap: '0.75rem' },
  4: { columnGap: '1rem', rowGap: '1rem' },
  5: { columnGap: '1.25rem', rowGap: '1.25rem' },
  6: { columnGap: '1.5rem', rowGap: '1.5rem' },
  8: { columnGap: '2rem', rowGap: '2rem' },
  10: { columnGap: '2.5rem', rowGap: '2.5rem' },
})

const rowGapStyles = stylex.create({
  0: { rowGap: '0px' },
  0.5: { rowGap: '0.125rem' },
  1: { rowGap: '0.25rem' },
  1.5: { rowGap: '0.375rem' },
  2: { rowGap: '0.5rem' },
  3: { rowGap: '0.75rem' },
  4: { rowGap: '1rem' },
  5: { rowGap: '1.25rem' },
  6: { rowGap: '1.5rem' },
  8: { rowGap: '2rem' },
  10: { rowGap: '2.5rem' },
})

const columnGapStyles = stylex.create({
  0: { columnGap: '0px' },
  0.5: { columnGap: '0.125rem' },
  1: { columnGap: '0.25rem' },
  1.5: { columnGap: '0.375rem' },
  2: { columnGap: '0.5rem' },
  3: { columnGap: '0.75rem' },
  4: { columnGap: '1rem' },
  5: { columnGap: '1.25rem' },
  6: { columnGap: '1.5rem' },
  8: { columnGap: '2rem' },
  10: { columnGap: '2.5rem' },
})

const baseStyles = stylex.create({
  grid: { display: 'grid' },
  span: { display: 'grid', height: '100%', minWidth: 0 },
})

export type GridAlignment = keyof typeof alignStyles
export type GridSpacing = keyof typeof gapStyles
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
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
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
      className(
        baseStyles.grid,
        ...(props.gap === undefined ? [] : [gapStyles[props.gap]]),
        ...(props.rowGap === undefined ? [] : [rowGapStyles[props.rowGap]]),
        ...(props.columnGap === undefined
          ? []
          : [columnGapStyles[props.columnGap]]),
        ...(props.align === undefined ? [] : [alignStyles[props.align]]),
        ...(props.justify === undefined ? [] : [justifyStyles[props.justify]]),
        props.layoutStyle,
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
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
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
    h.Class(className(baseStyles.span, props.layoutStyle)),
    ...(Object.keys(style).length > 0 ? [h.Style(style)] : []),
  ]
  const children = [...(props.children ?? [])]
  const element = props.as ?? 'div'
  return h[element](attributes, children)
}
