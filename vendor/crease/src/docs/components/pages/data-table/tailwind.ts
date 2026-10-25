import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  dataTableFixtures,
  docStatusOptions,
  docTableConfig,
  facetedDocs,
  facetedPayments,
  payments,
  type FacetedDocId,
  type Payment,
} from '@/docs/components/pages/data-table/shared'
import { icon } from '@/lib/icon'
import {
  actionBar,
  actionBarClose,
  actionBarGroup,
  actionBarItem,
  actionBarSelection,
  actionBarSeparator,
} from '@/ui/action-bar'
import * as DataTable from '@/ui/data-table'

const Got = defineMessageUnion({
  GotDataTablePreviewMessage: { message: DataTable.Message },
  GotClassicDataTableMessage: { message: DataTable.Message },
  GotActionBarMount: { message: S.Any },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('data-table'),
  table: DataTable.Model,
  classic: DataTable.Model,
  rows: S.Array(S.Any),
})
type Model = typeof Model.Type

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

const facetedColumns = (
  badges: boolean,
  h: HtmlBuilder<Got>,
): ReadonlyArray<DataTable.DataTableColumn<Payment>> => [
  {
    key: 'status',
    header: 'Status',
    cell: badges
      ? row =>
          h.span(
            [
              h.Class(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              ),
            ],
            [row.status],
          )
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
    class: 'text-right',
    cell: row => `$${row.amount.toFixed(2)}`,
    get: row => String(row.amount),
    sortValue: row => row.amount,
    filterVariant: 'range',
    getNumber: row => row.amount,
  },
]

const wrapTable = (message: DataTable.Message): Got =>
  Got.GotDataTablePreviewMessage({ message })

const wrapClassic = (message: DataTable.Message): Got =>
  Got.GotClassicDataTableMessage({ message })

const docsActionBar = (model: Model, h: HtmlBuilder<Got>): Html => {
  const selected = new Set(model.table.selectedRowKeys)
  const visible = model.rows.filter(row => selected.has(row.id))
  return actionBar(
    {
      open: visible.length > 0,
      toParentMessage: message => Got.GotActionBarMount({ message }),
      children: [
        actionBarSelection(
          {
            children: [
              h.span(
                [h.Class('font-medium tabular-nums')],
                [String(visible.length)],
              ),
              h.span([h.Class('text-muted-foreground')], ['selected']),
              actionBarSeparator({}, h),
              actionBarClose(
                {
                  onClose: wrapTable(DataTable.Message.ClosedActionBar({})),
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
                  onSelect: wrapTable(
                    DataTable.Message.AppliedBulkValue({
                      columnId: 'status',
                      value: 'success',
                    }),
                  ),
                  class: 'gap-1.5',
                  children: [
                    icon('circle-check', { class: 'size-4' }, h),
                    'Mark success',
                  ],
                },
                h,
              ),
              actionBarItem(
                {
                  onSelect: wrapTable(DataTable.Message.RequestedExport({})),
                  class: 'gap-1.5',
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
                  onSelect: wrapTable(
                    DataTable.Message.OpenedDeleteDialog({
                      ids: [...selected],
                    }),
                  ),
                  class: 'gap-1.5',
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

const facetedPreview = (
  id: FacetedDocId,
  model: Model,
  h: HtmlBuilder<Got>,
): Html =>
  DataTable.dataTable(
    {
      id: `docs-data-table-faceted-${id}`,
      model: model.table,
      toParentMessage: wrapTable,
      rows: model.rows,
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
            actionBar: [docsActionBar(model, h)],
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

export const dataTableTailwindPreviewProgram = definePreviewProgram<Model, Got>(
  {
    Model,
    Message: Got,
    init: () => ({
      _docsPage: 'data-table',
      table: DataTable.init(docTableConfig, facetedPayments),
      classic: DataTable.init(5),
      rows: facetedPayments,
    }),
    update: (model, message) => {
      if (message._tag === 'GotClassicDataTableMessage') {
        const next = DataTable.update(model.classic, message.message)
        return {
          model: { ...model, classic: next.model },
          commands: Command.mapMessages(next.commands ?? [], wrapClassic),
        }
      }
      if (message._tag === 'GotActionBarMount') {
        const inner = message.message as { _tag: string }
        return inner._tag === 'RequestedClose'
          ? {
              model: {
                ...model,
                table: DataTable.update(
                  model.table,
                  DataTable.Message.ClosedActionBar({}),
                ).model,
              },
            }
          : { model }
      }
      const inner = message.message
      const next = DataTable.update(model.table, inner)
      const table = next.model
      const commands = Command.mapMessages(next.commands ?? [], m =>
        Got.GotDataTablePreviewMessage({ message: m }),
      )
      switch (inner._tag) {
        case 'AppliedColumnValue':
          return {
            model: {
              ...model,
              table,
              rows: DataTable.applyColumnValue(
                model.rows,
                docTableConfig,
                inner.rowKey,
                inner.columnId,
                inner.value,
              ),
            },
            commands,
          }
        case 'AppliedBulkValue':
          return {
            model: {
              ...model,
              table,
              rows: DataTable.applyBulkValue(
                model.rows,
                docTableConfig,
                model.table.selectedRowKeys,
                inner.columnId,
                inner.value,
              ),
            },
            commands,
          }
        case 'ConfirmedDelete':
          return {
            model: {
              ...model,
              table,
              rows: DataTable.removeRowsByKeys(
                model.rows,
                docTableConfig,
                model.table.deleteDialogKeys,
              ),
            },
            commands,
          }
        case 'RequestedExport':
          return {
            model: { ...model, table },
            commands: [
              ...Command.mapMessages(
                [
                  DataTable.downloadRowsCsv(
                    model.rows,
                    docTableConfig,
                    'payments.csv',
                  ),
                ],
                wrapTable,
              ),
              ...commands,
            ],
          }
        default:
          return { model: { ...model, table }, commands }
      }
    },
    view: (index, model, h) => {
      if (index < dataTableFixtures.length) {
        const fixture = dataTableFixtures[index]!
        return h.div(fixture.rtl ? [h.Dir('rtl')] : [], [
          DataTable.dataTable(
            {
              id: `docs-data-table-${String(index)}`,
              model: model.classic,
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
              ...(fixture.server
                ? { mode: 'server' as const, rowCount: 42 }
                : {}),
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
      if (doc === undefined) return h.div([], [])
      return facetedPreview(doc.id, model, h)
    },
  },
)
