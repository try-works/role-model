import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  dataTableFixtures,
  docStatusOptions,
  facetedDocs,
  type FacetedDocId,
  type Payment,
  payments,
} from '@/docs/components/pages/data-table/shared'
import { icon } from '@/lib/icon'
import {
  actionBar,
  actionBarClose,
  actionBarGroup,
  actionBarItem,
  actionBarSelection,
  actionBarSeparator,
} from '@/stylex/action-bar'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import * as DataTable from '@/stylex/data-table'
import { className } from '@/stylex/style'

const styles = stylex.create({
  amount: { textAlign: 'right' },
  badge: {
    borderColor: '#e4e4e7',
    borderRadius: '9999px',
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    paddingBottom: '0.125rem',
    paddingLeft: '0.5rem',
    paddingRight: '0.5rem',
    paddingTop: '0.125rem',
  },
  gap: { gap: '0.375rem' },
  count: { fontVariantNumeric: 'tabular-nums', fontWeight: 500 },
  muted: { color: '#71717a' },
})

type PreviewModel = {
  table: DataTable.Model
  classic: DataTable.Model
  rows: ReadonlyArray<Payment>
}

const columns = (
  rtl: boolean,
): ReadonlyArray<DataTable.DataTableColumn<Payment>> => [
  {
    key: 'status',
    header: rtl ? 'الحالة' : 'Status',
    cell: row => row.status,
    sortValue: row => row.status,
  },
  {
    key: 'email',
    header: rtl ? 'البريد الإلكتروني' : 'Email',
    cell: row => row.email,
    sortValue: row => row.email,
  },
  {
    key: 'amount',
    header: rtl ? 'المبلغ' : 'Amount',
    align: 'right',
    cell: row => `$${row.amount.toFixed(2)}`,
    sortValue: row => row.amount,
  },
]

const facetedColumns = <Msg>(
  badges: boolean,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<DataTable.DataTableColumn<Payment>> => [
  {
    key: 'status',
    header: 'Status',
    cell: badges
      ? row => h.span([h.Class(className(styles.badge))], [row.status])
      : row => row.status,
    get: row => row.status,
    sortValue: row => row.status,
    filterVariant: 'options',
    options: docStatusOptions,
  },
  {
    key: 'email',
    header: 'Email',
    cell: row => row.email,
    get: row => row.email,
    sortValue: row => row.email,
  },
  {
    key: 'amount',
    header: 'Amount',
    layoutStyle: styles.amount as ComponentLayoutStyle,
    cell: row => `$${row.amount.toFixed(2)}`,
    get: row => String(row.amount),
    sortValue: row => row.amount,
    filterVariant: 'range',
    getNumber: row => row.amount,
  },
]

const docsActionBar = <Msg>(
  model: PreviewModel,
  wrap: (message: DataTable.Message) => Msg,
  wrapMount: (message: unknown) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const selected = new Set(model.table.selectedRowKeys)
  const visible = model.rows.filter(row => selected.has(row.id))
  return actionBar(
    {
      open: visible.length > 0,
      toParentMessage: message => wrapMount(message),
      children: [
        actionBarSelection(
          {
            children: [
              h.span(
                [h.Class(className(styles.count))],
                [String(visible.length)],
              ),
              h.span([h.Class(className(styles.muted))], ['selected']),
              actionBarSeparator({}, h),
              actionBarClose(
                {
                  onClose: wrap(DataTable.Message.ClosedActionBar({})),
                  ariaLabel: 'Clear selection',
                  children: [icon('x', { class: 'size-4' }, h)],
                },
                h,
              ),
            ],
          },
          h,
        ),
        actionBarGroup(
          {
            children: [
              actionBarItem(
                {
                  onSelect: wrap(
                    DataTable.Message.AppliedBulkValue({
                      columnId: 'status',
                      value: 'success',
                    }),
                  ),
                  extraStyle: styles.gap,
                  children: [
                    icon('circle-check', { class: 'size-4' }, h),
                    'Mark success',
                  ],
                },
                h,
              ),
              actionBarItem(
                {
                  onSelect: wrap(DataTable.Message.RequestedExport({})),
                  extraStyle: styles.gap,
                  children: [
                    icon('download', { class: 'size-4' }, h),
                    'Export',
                  ],
                },
                h,
              ),
              actionBarItem(
                {
                  variant: 'destructive',
                  onSelect: wrap(
                    DataTable.Message.OpenedDeleteDialog({
                      ids: [...selected],
                    }),
                  ),
                  extraStyle: styles.gap,
                  children: [icon('trash-2', { class: 'size-4' }, h), 'Delete'],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

export const dataTableStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const preview = model as PreviewModel
  const wrap = (message: DataTable.Message): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'GotDataTablePreviewMessage', message }),
    )
  const wrapClassic = (message: DataTable.Message): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'GotClassicDataTableMessage', message }),
    )
  if (index < dataTableFixtures.length) {
    const fixture = dataTableFixtures[index]!
    return h.div(fixture.rtl ? [h.Dir('rtl')] : [], [
      DataTable.dataTable(
        {
          id: `docs-data-table-${String(index)}`,
          model: preview.classic,
          toParentMessage: wrapClassic,
          rows: payments,
          columns: columns(fixture.rtl),
          rowKey: row => row.id,
          ...(fixture.filter
            ? {
                filterText: (row: Payment) => `${row.status} ${row.email}`,
                filterPlaceholder: fixture.rtl
                  ? 'بحث في المدفوعات...'
                  : 'Filter payments…',
              }
            : {}),
          ...(fixture.server ? { mode: 'server' as const, rowCount: 42 } : {}),
          enableRowSelection: true,
          enableColumnVisibility: true,
          pageSizeOptions: [5, 10, 20],
          ariaLabel: fixture.rtl ? 'المدفوعات' : 'Payments',
        },
        h,
      ),
    ])
  }
  const doc = facetedDocs[index - dataTableFixtures.length]
  if (doc === undefined) return undefined
  const id: FacetedDocId = doc.id
  return DataTable.dataTable(
    {
      id: `docs-data-table-faceted-${id}`,
      model: preview.table,
      toParentMessage: wrap,
      rows: preview.rows,
      columns: facetedColumns(id === 'badges', h),
      rowKey: row => row.id,
      variant: 'faceted',
      searchColumnKey: 'email',
      ariaLabel: 'Payments',
      ...(id === 'filters'
        ? { searchPlaceholder: 'Filter emails…', rowMenu: false }
        : {}),
      ...(id === 'menu'
        ? {
            valueMenu: {
              key: 'status',
              header: 'Set status',
              options: docStatusOptions,
              get: (row: Payment) => row.status,
            },
            deleteItemLabel: 'payment',
          }
        : {}),
      ...(id === 'action-bar'
        ? {
            actionBar: [
              docsActionBar(
                preview,
                wrap,
                message =>
                  onMessageJson(
                    JSON.stringify({
                      _tag: 'GotActionBarMount',
                      message,
                    }),
                  ),
                h,
              ),
            ],
            deleteItemLabel: 'payment',
          }
        : {}),
      ...(id === 'pagination'
        ? { rowMenu: false, pageSizeOptions: [4, 8, 16] }
        : {}),
      ...(id === 'badges' ? { rowMenu: false } : {}),
    },
    h,
  )
}
