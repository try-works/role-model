import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { DataTableConfig } from '@/lib/data-table-state'

export type Payment = Readonly<{
  id: string
  status: string
  email: string
  amount: number
}>
export const facetedPayments: ReadonlyArray<Payment> = [
  { id: '728ed52f', status: 'success', email: 'm@example.com', amount: 100 },
  { id: '489e1d42', status: 'pending', email: 'a@example.com', amount: 125 },
  { id: 'f7a4b3c2', status: 'processing', email: 's@example.com', amount: 250 },
  { id: 'aa91df03', status: 'success', email: 'j@example.com', amount: 75 },
  { id: '6dc9a830', status: 'failed', email: 'r@example.com', amount: 340 },
  { id: '4cb3d780', status: 'pending', email: 't@example.com', amount: 88 },
  { id: '91be24c7', status: 'success', email: 'k@example.com', amount: 410 },
  { id: 'c37fa912', status: 'processing', email: 'd@example.com', amount: 64 },
  { id: '5e08d1b4', status: 'failed', email: 'n@example.com', amount: 190 },
  { id: '8b2f6e51', status: 'pending', email: 'p@example.com', amount: 230 },
  { id: '0d94ab68', status: 'success', email: 'g@example.com', amount: 155 },
  { id: 'f61c3d29', status: 'processing', email: 'w@example.com', amount: 99 },
  { id: '3a7e90b5', status: 'pending', email: 'v@example.com', amount: 275 },
  { id: 'be5417c8', status: 'success', email: 'l@example.com', amount: 320 },
  { id: '72d8f4a1', status: 'failed', email: 'o@example.com', amount: 48 },
  { id: 'a9c35b76', status: 'pending', email: 'u@example.com', amount: 132 },
]

export const payments: ReadonlyArray<Payment> = facetedPayments.slice(0, 6)

export const dataTableFixtures = [
  {
    title: 'Sortable payments',
    description:
      'Typed columns provide renderers and comparable values while update owns sort direction and page reset.',
    filter: false,
    server: false,
    rtl: false,
  },
  {
    title: 'Filter and paginate',
    description:
      'Filtering derives from parent-owned rows, resets the current page, and paginates the resulting collection.',
    filter: true,
    server: false,
    rtl: false,
  },
  {
    title: 'Server-owned query',
    description:
      'Server mode keeps query state controlled while rowCount describes pagination beyond the currently loaded rows.',
    filter: false,
    server: true,
    rtl: false,
  },
  {
    title: 'RTL',
    description:
      'Localized headers under a dir="rtl" wrapper mirror the full table chrome.',
    filter: true,
    server: false,
    rtl: true,
  },
] as const

const source = (
  fixture: (typeof dataTableFixtures)[number],
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const stylex = renderer !== 'tailwind'
  const filterPlaceholder = fixture.rtl
    ? 'بحث في المدفوعات...'
    : 'Filter payments…'
  return foldkitApplication({
    title: `Data Table — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import * as DataTable from '@/${stylex ? 'stylex' : 'ui'}/data-table'`,
    model: `type Payment = Readonly<{ id: string; status: string; email: string; amount: number }>

const payments: ReadonlyArray<Payment> = ${JSON.stringify(payments, null, 2)}

export const Model = S.Struct({ table: DataTable.Model })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotDataTableMessage = taggedStruct('GotDataTableMessage${tag}', { message: DataTable.Message });
export const Message = S.Union([GotDataTableMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { table: DataTable.init(5) } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDataTableMessage${tag}': return { model: { ...model, table: DataTable.update(model.table, message.message).model } }
  }
}`,
    view: `const columns: ReadonlyArray<DataTable.DataTableColumn<Payment>> = [
  { key: 'status', header: '${fixture.rtl ? 'الحالة' : 'Status'}', cell: row => row.status, sortValue: row => row.status },
  { key: 'email', header: '${fixture.rtl ? 'البريد الإلكتروني' : 'Email'}', cell: row => row.email, sortValue: row => row.email },
  { key: 'amount', header: '${fixture.rtl ? 'المبلغ' : 'Amount'}', align: 'right', cell: row => \`$\${row.amount.toFixed(2)}\`, sortValue: row => row.amount },
]

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Data Table — ${fixture.title}',
  body: h.main([], [h.div(${fixture.rtl ? "[h.Dir('rtl')], " : '[], '}[
    DataTable.dataTable({ model: model.table, toParentMessage: message => GotDataTableMessage({ message }), rows: payments, columns, rowKey: row => row.id,${fixture.filter ? ` filterText: row => \`\${row.status} \${row.email}\`, filterPlaceholder: '${filterPlaceholder}',` : ''}${fixture.server ? " mode: 'server', rowCount: 42," : ''} enableRowSelection: true, enableColumnVisibility: true, pageSizeOptions: [5, 10, 20], ariaLabel: '${fixture.rtl ? 'المدفوعات' : 'Payments'}' }, h),
  ])]),
})`,
  })
}

/* ---------- faceted docs examples ---------- */

export const docStatusOptions = [
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
]

/**
 * Shared faceted config used by the docs preview programs: the status column
 * carries a `set` accessor so row-menu and bulk mutations can write back.
 */
export const docTableConfig: DataTableConfig<Payment> = {
  columns: [
    {
      id: 'status',
      header: 'Status',
      get: row => row.status,
      set: (row, value) => ({ ...row, status: value }),
      filterVariant: 'options',
      options: docStatusOptions,
    },
    { id: 'email', header: 'Email', get: row => row.email },
    {
      id: 'amount',
      header: 'Amount',
      get: row => String(row.amount),
      set: (row, value) => ({ ...row, amount: Number(value) || 0 }),
      filterVariant: 'range',
      getNumber: row => row.amount,
    },
  ],
  rowKey: row => row.id,
  searchColumnId: 'email',
}

export const facetedDocs = [
  {
    id: 'filters',
    title: 'Faceted filters',
    description:
      'The faceted variant adds tablecn-style chrome: a faceted filter toolbar (option lists, numeric ranges, dates), a multi-column sort menu, view options, and sortable column header menus.',
  },
  {
    id: 'menu',
    title: 'Row action menu',
    description:
      'Each row gets a three-dots menu with Edit, a value submenu, and Delete. AppliedColumnValue and ConfirmedDelete stay page-owned: the page applies them to its rows with the exported helpers.',
  },
  {
    id: 'action-bar',
    title: 'Bulk actions',
    description:
      'The actionBar slot renders any Html while rows are selected — here the Action Bar component with a bulk status update, CSV export (downloadRowsCsv), and delete. AppliedBulkValue / RequestedExport stay page-owned.',
  },
  {
    id: 'pagination',
    title: 'Pagination',
    description:
      'pageSizeOptions drives the rows-per-page select in the sticky footer; the footer reports selected count and page position and never leaves the bottom of the table.',
  },
  {
    id: 'badges',
    title: 'Cell styling',
    description:
      'Column cell renderers return any Html — badges, links, formatted numbers — while get and sortValue keep filtering and sorting working on the raw values.',
  },
] as const
export type FacetedDocId = (typeof facetedDocs)[number]['id']

const dataTableExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> => [
  ...dataTableFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: source(fixture, renderer),
    previewClass: 'justify-stretch',
  })),
  ...facetedDocs.map(doc => ({
    title: doc.title,
    description: doc.description,
    code: facetedSource(doc.id, renderer),
    previewClass: 'justify-stretch',
  })),
]

const facetedSource = (
  id: FacetedDocId,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string => {
  const stylex = renderer !== 'tailwind'
  const mod = `@/${stylex ? 'stylex' : 'ui'}`
  const needsRows = id === 'menu' || id === 'action-bar'
  const needsBar = id === 'action-bar'
  const tag = `Faceted${id.replace(/(^|-)([a-z])/g, (_m, _d, c: string) => c.toUpperCase())}`
  const doc = facetedDocs.find(d => d.id === id)!

  const statusCell =
    id === 'badges'
      ? stylex
        ? `cell: row => h.span([h.Class(className(styles.badge))], [row.status]),`
        : `cell: row => h.span([h.Class('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium')], [row.status]),`
      : 'cell: row => row.status,'
  const stylexDecl = stylex
    ? `const styles = stylex.create({
  amount: { textAlign: 'right' },${
    id === 'badges'
      ? `
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: '9999px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e4e4e7', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.125rem', paddingBottom: '0.125rem', fontSize: '0.75rem', fontWeight: 500 },`
      : ''
  }${
    needsBar
      ? `
  gap: { gap: '0.375rem' },`
      : ''
  }
})

`
    : ''

  const propsById: Record<FacetedDocId, string> = {
    filters: `variant: 'faceted', searchPlaceholder: 'Filter emails…', searchColumnKey: 'email', rowMenu: false,`,
    menu: `variant: 'faceted', searchColumnKey: 'email', valueMenu: { key: 'status', header: 'Set status', options: config.columns[0]!.options!, get: row => row.status }, deleteItemLabel: 'payment',`,
    'action-bar': `variant: 'faceted', searchColumnKey: 'email', actionBar: [paymentsActionBar(model, h)], deleteItemLabel: 'payment',`,
    pagination: `variant: 'faceted', searchColumnKey: 'email', rowMenu: false, pageSizeOptions: [4, 8, 16],`,
    badges: `variant: 'faceted', searchColumnKey: 'email', rowMenu: false,`,
  }

  const actionBarHelper = needsBar
    ? `const paymentsActionBar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const selected = new Set(model.table.selectedRowKeys)
  const visible = model.rows.filter(row => selected.has(row.id))
  const wrap = (message: DataTable.Message): Message =>
    GotDataTableMessage({ message })
  return actionBar({
    open: visible.length > 0,
    toParentMessage: message => GotActionBarMount({ message }),
    children: [
      actionBarSelection({ children: [
        h.span([h.Class('font-medium tabular-nums')], [String(visible.length)]),
        h.span([h.Class('text-muted-foreground')], ['selected']),
        actionBarSeparator({}, h),
        actionBarClose({ onClose: wrap(DataTable.Message.ClosedActionBar({})), ariaLabel: 'Clear selection', children: [icon('x', { class: 'size-4' }, h)] }, h),
      ]}, h),
      actionBarGroup({ children: [
        actionBarItem({ onSelect: wrap(DataTable.Message.AppliedBulkValue({ columnId: 'status', value: 'success' })), ${stylex ? 'extraStyle: styles.gap' : "class: 'gap-1.5'"}, children: [icon('circle-check', { class: 'size-4' }, h), 'Mark success'] }, h),
        actionBarItem({ onSelect: wrap(DataTable.Message.RequestedExport({})), ${stylex ? 'extraStyle: styles.gap' : "class: 'gap-1.5'"}, children: [icon('download', { class: 'size-4' }, h), 'Export'] }, h),
        actionBarItem({ variant: 'destructive', onSelect: wrap(DataTable.Message.OpenedDeleteDialog({ ids: [...selected] })), ${stylex ? 'extraStyle: styles.gap' : "class: 'gap-1.5'"}, children: [icon('trash-2', { class: 'size-4' }, h), 'Delete'] }, h),
      ]}, h),
    ],
  }, h)
}

`
    : ''

  const updateBody = needsRows
    ? `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  ${
    needsBar
      ? `if (message._tag === 'GotActionBarMount${tag}') {
    /* Mount stream from the Action Bar: Escape asks to clear the selection. */
    return (message.message as { _tag: string })._tag === 'RequestedClose'
      ? { model: { ...model, table: DataTable.update(model.table, DataTable.Message.ClosedActionBar({})).model } }
      : { model }
  }
  `
      : ''
  }const inner = message.message
  const next = DataTable.update(model.table, inner)
  const table = next.model
  const commands = Command.mapMessages(next.commands ?? [], m =>
    GotDataTableMessage({ message: m }))
  switch (inner._tag) {
    case 'AppliedColumnValue':
      return { model: { ...model, table, rows: DataTable.applyColumnValue(model.rows, config, inner.rowKey, inner.columnId, inner.value) }, commands }
    case 'AppliedBulkValue':
      return { model: { ...model, table, rows: DataTable.applyBulkValue(model.rows, config, model.table.selectedRowKeys, inner.columnId, inner.value) }, commands }
    case 'ConfirmedDelete':
      return { model: { ...model, table, rows: DataTable.removeRowsByKeys(model.rows, config, model.table.deleteDialogKeys) }, commands }
    case 'RequestedExport':
      return { model: { ...model, table }, commands: [...Command.mapMessages([DataTable.downloadRowsCsv(model.rows, config, 'payments.csv')], m => GotDataTableMessage({ message: m })), ...commands] }
    default:
      return { model: { ...model, table }, commands }
  }
}`
    : `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDataTableMessage${tag}': {
      const next = DataTable.update(model.table, message.message)
      return {
        model: { ...model, table: next.model },
        commands: Command.mapMessages(next.commands ?? [], m => GotDataTableMessage({ message: m })),
      }
    }
  }
}`

  return foldkitApplication({
    title: `Data Table — ${doc.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder${needsBar ? ', type Html' : ''} } from 'foldkit/html'
${stylex ? "import * as stylex from '@stylexjs/stylex'\nimport type { ComponentLayoutStyle } from '@/stylex/contracts'\nimport { className } from '@/stylex/style'\n" : ''}
import * as DataTable from '${mod}/data-table'${
      needsBar
        ? `
import { actionBar, actionBarSelection, actionBarGroup, actionBarItem, actionBarSeparator, actionBarClose } from '${mod}/action-bar'
import { icon } from '@/lib/icon'`
        : ''
    }`,
    model: `type Payment = Readonly<{ id: string; status: string; email: string; amount: number }>
${
  needsRows
    ? `
const PaymentSchema = S.Struct({ id: S.String, status: S.String, email: S.String, amount: S.Number })
`
    : ''
}
const payments: ReadonlyArray<Payment> = ${JSON.stringify(facetedPayments, null, 2)}

export const Model = S.Struct({ table: DataTable.Model${needsRows ? ', rows: S.Array(PaymentSchema)' : ''} })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotDataTableMessage = taggedStruct('GotDataTableMessage${tag}', { message: DataTable.Message });
${needsBar ? `export const GotActionBarMount = taggedStruct('GotActionBarMount${tag}', { message: S.Any });\n` : ''}export const Message = S.Union([GotDataTableMessage${needsBar ? ', GotActionBarMount' : ''}])
export type Message = typeof Message.Type`,
    init: `const config: DataTable.DataTableConfig<Payment> = {
  columns: [
    { id: 'status', header: 'Status', get: row => row.status, set: (row, value) => ({ ...row, status: value }), filterVariant: 'options', options: [
      { value: 'success', label: 'Success' },
      { value: 'pending', label: 'Pending' },
      { value: 'processing', label: 'Processing' },
      { value: 'failed', label: 'Failed' },
    ] },
    { id: 'email', header: 'Email', get: row => row.email },
    { id: 'amount', header: 'Amount', get: row => String(row.amount), set: (row, value) => ({ ...row, amount: Number(value) || 0 }), filterVariant: 'range', getNumber: row => row.amount },
  ],
  rowKey: row => row.id,
  searchColumnId: 'email',
}

export const init = (): Update.Return<Model, Message> => ({ model: { table: DataTable.init(config, payments)${needsRows ? ', rows: payments' : ''} } })`,
    update: updateBody,
    view: `${stylexDecl}${actionBarHelper}const columns = (h: HtmlBuilder<Message>): ReadonlyArray<DataTable.DataTableColumn<Payment>> => [
  { key: 'status', header: 'Status', ${statusCell} get: row => row.status, sortValue: row => row.status, filterVariant: 'options', options: [
    { value: 'success', label: 'Success' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'failed', label: 'Failed' },
  ] },
  { key: 'email', header: 'Email', cell: row => row.email, get: row => row.email, sortValue: row => row.email },
  { key: 'amount', header: 'Amount', cell: row => \`$\${row.amount.toFixed(2)}\`, get: row => String(row.amount), sortValue: row => row.amount, filterVariant: 'range', getNumber: row => row.amount, ${stylex ? 'layoutStyle: styles.amount as ComponentLayoutStyle' : "class: 'text-right'"} },
]

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Data Table — ${doc.title}',
  body: h.main([], [h.div([], [
    DataTable.dataTable({ model: model.table, toParentMessage: message => GotDataTableMessage({ message }), rows: ${needsRows ? 'model.rows' : 'payments'}, columns: columns(h), rowKey: row => row.id, ${propsById[id]} ariaLabel: 'Payments' }, h),
  ])]),
})`,
  })
}

export const dataTableExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, dataTableExamplesFor(renderer))
