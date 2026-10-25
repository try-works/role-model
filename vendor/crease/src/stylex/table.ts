import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { complexTokens } from './complex-tokens.stylex'
import { tokens } from './tokens.stylex'

type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>

const styles = stylex.create({
  body: {},
  caption: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    marginTop: '1rem',
  },
  cell: {
    padding: {
      default: '0.5rem',
      ':has([role=checkbox])': '0.5rem 0 0.5rem 0.5rem',
    },
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  container: { position: 'relative', overflowX: 'auto', width: '100%' },
  footer: {
    backgroundColor: complexTokens.mutedSurface,
    fontWeight: 500,
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  },
  head: {
    padding: { default: '0 0.5rem', ':has([role=checkbox])': '0 0 0 0.5rem' },
    color: tokens.foreground,
    fontWeight: 500,
    textAlign: 'left',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    height: '2.5rem',
  },
  header: {
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  row: {
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.mutedSurface,
    },
    transitionProperty: 'color, background-color',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: { default: 1, ':last-child': 0 },
  },
  table: {
    borderCollapse: 'collapse',
    captionSide: 'bottom',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    width: '100%',
  },
})

export const table = <Msg>(
  props: SlotProps & Readonly<{ ariaLabel?: string | undefined }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'table-container'),
      h.Tabindex(0),
      h.Class(className(styles.container)),
    ],
    [
      h.table(
        [
          h.DataAttribute('slot', 'table'),
          ...(props.ariaLabel === undefined
            ? []
            : [h.AriaLabel(props.ariaLabel)]),
          h.Class(className(reset.table, styles.table, props.layoutStyle)),
        ],
        [...props.children],
      ),
    ],
  )

const tablePart =
  (
    element: 'thead' | 'tbody' | 'tfoot' | 'tr' | 'th' | 'td' | 'caption',
    slot: string,
    base: StaticStyles,
  ) =>
  <Msg>(props: SlotProps, h: HtmlBuilder<Msg>): Html => {
    const attributes = [
      h.DataAttribute('slot', slot),
      h.Class(className(base, props.layoutStyle)),
    ]
    switch (element) {
      case 'thead':
        return h.thead(attributes, [...props.children])
      case 'tbody':
        return h.tbody(attributes, [...props.children])
      case 'tfoot':
        return h.tfoot(attributes, [...props.children])
      case 'tr':
        return h.tr(attributes, [...props.children])
      case 'th':
        return h.th(attributes, [...props.children])
      case 'td':
        return h.td(attributes, [...props.children])
      case 'caption':
        return h.caption(attributes, [...props.children])
    }
  }

export const tableHeader = tablePart('thead', 'table-header', styles.header)
export const tableBody = tablePart('tbody', 'table-body', styles.body)
export const tableFooter = tablePart('tfoot', 'table-footer', styles.footer)
export const tableRow = tablePart('tr', 'table-row', styles.row)
export type TableHeadProps = SlotProps & Readonly<{ scope?: 'col' | 'row' }>
export const tableHead = <Msg>(
  props: TableHeadProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.th(
    [
      h.Scope(props.scope ?? 'col'),
      h.DataAttribute('slot', 'table-head'),
      h.Class(className(reset.tableHeading, styles.head, props.layoutStyle)),
    ],
    [...props.children],
  )
export type TableCellProps = SlotProps & Readonly<{ colspan?: number }>
export const tableCell = <Msg>(
  props: TableCellProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.td(
    [
      ...(props.colspan === undefined ? [] : [h.Colspan(props.colspan)]),
      h.DataAttribute('slot', 'table-cell'),
      h.Class(className(styles.cell, props.layoutStyle)),
    ],
    [...props.children],
  )
export const tableCaption = tablePart(
  'caption',
  'table-caption',
  styles.caption,
)
