import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export type TableKind =
  | 'demo'
  | 'footer'
  | 'actions'
  | 'rtl'
  | 'inventory'
  | 'dense'
  | 'empty'

export interface TableFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: TableKind
}

export const tableFixtures: Readonly<[TableFixture, ...Array<TableFixture>]> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Footer',
    description:
      'Use a semantic footer for totals that summarize the body columns.',
    kind: 'footer',
  },
  {
    title: 'Actions',
    description: 'Each row hosts a DropdownMenu for record-level actions.',
    kind: 'actions',
  },
  {
    title: 'RTL',
    description: 'Column order and alignment mirror in right-to-left contexts.',
    kind: 'rtl',
  },
  {
    title: 'Component Inventory',
    description: 'Render one header row and map domain records into body rows.',
    kind: 'inventory',
  },
  {
    title: 'Dense overflow',
    description:
      'Dense native cells remain inside a horizontally scrollable container on narrow screens.',
    kind: 'dense',
  },
  {
    title: 'Empty body',
    description:
      'An empty collection stays a real table with one explanatory spanning cell.',
    kind: 'empty',
  },
]

export const invoices: ReadonlyArray<
  readonly [string, string, string, string]
> = [
  ['INV001', 'Paid', '$250.00', 'Credit Card'],
  ['INV002', 'Pending', '$150.00', 'PayPal'],
  ['INV003', 'Unpaid', '$350.00', 'Bank Transfer'],
  ['INV004', 'Paid', '$450.00', 'Credit Card'],
  ['INV005', 'Paid', '$550.00', 'PayPal'],
  ['INV006', 'Pending', '$200.00', 'Bank Transfer'],
  ['INV007', 'Unpaid', '$300.00', 'Credit Card'],
]

export const rtlInvoices: ReadonlyArray<
  readonly [string, string, string, string]
> = [
  ['INV001', 'مدفوع', '$250.00', 'بطاقة ائتمانية'],
  ['INV002', 'قيد الانتظار', '$150.00', 'PayPal'],
  ['INV003', 'غير مدفوع', '$350.00', 'تحويل بنكي'],
  ['INV004', 'مدفوع', '$450.00', 'بطاقة ائتمانية'],
  ['INV005', 'مدفوع', '$550.00', 'PayPal'],
  ['INV006', 'قيد الانتظار', '$200.00', 'تحويل بنكي'],
  ['INV007', 'غير مدفوع', '$300.00', 'بطاقة ائتمانية'],
]

export const actionRows: ReadonlyArray<readonly [string, string]> = [
  ['Wireless Mouse', '$29.99'],
  ['Mechanical Keyboard', '$129.99'],
  ['USB-C Hub', '$49.99'],
]

export const tableRows = [
  ['Accordion', 'Stateful'],
  ['Button', 'Stateless'],
  ['Dialog', 'Stateful'],
] as const

const rightCell = (isStyleX: boolean, content: string): string =>
  isStyleX
    ? `h.span([h.Class(stylex.props(styles.right).className ?? '')], [${content}])`
    : content

const invoiceTable = (kind: TableKind, isStyleX: boolean): string => {
  const rtl = kind === 'rtl'
  const sourceRows = rtl ? 'rtlInvoices' : 'invoices'
  const heads = rtl
    ? ['الفاتورة', 'الحالة', 'الطريقة', 'المبلغ']
    : ['Invoice', 'Status', 'Method', 'Amount']
  const caption = rtl
    ? 'قائمة بفواتيرك الأخيرة.'
    : 'A list of your recent invoices.'
  const total = rtl ? 'المجموع' : 'Total'
  const headCalls = [
    `Table.tableHead({ ${isStyleX ? 'layoutStyle: layoutStyle({ width: "6.25rem" }), ' : "class: 'w-[100px]', "}children: ['${heads[0] ?? ''}'] }, h)`,
    `Table.tableHead({ children: ['${heads[1] ?? ''}'] }, h)`,
    `Table.tableHead({ children: ['${heads[2] ?? ''}'] }, h)`,
    `Table.tableHead({ ${isStyleX ? '' : "class: 'text-right', "}children: [${rightCell(isStyleX, `'${heads[3] ?? 'Amount'}'`)}] }, h)`,
  ]
  const rowSlice = kind === 'footer' ? `${sourceRows}.slice(0, 3)` : sourceRows
  const invoiceCell = (content: string): string =>
    isStyleX
      ? `h.span([h.Class(stylex.props(styles.medium).className ?? '')], [${content}])`
      : content
  const bodyRows = `${rowSlice}.map(([invoice, status, amount, method]) =>
      Table.tableRow({ children: [
        Table.tableCell({ children: [${invoiceCell('invoice')}]${isStyleX ? '' : ", class: 'font-medium'"} }, h),
        Table.tableCell({ children: [status] }, h),
        Table.tableCell({ children: [method] }, h),
        Table.tableCell({ ${isStyleX ? '' : "class: 'text-right', "}children: [${rightCell(isStyleX, 'amount')}] }, h),
      ] }, h))`
  const footer = `Table.tableFooter({ children: [Table.tableRow({ children: [
    Table.tableCell({ colspan: 3, children: ['${total}'] }, h),
    Table.tableCell({ ${isStyleX ? '' : "class: 'text-right', "}children: [${rightCell(isStyleX, `'$2,500.00'`)}] }, h),
  ] }, h)] }, h)`
  const table = `Table.table({ ${isStyleX ? 'layoutStyle: layoutStyle({ maxWidth: "36rem" }), ' : ''}children: [
    Table.tableCaption({ children: ['${caption}'] }, h),
    Table.tableHeader({ children: [Table.tableRow({ children: [
      ${headCalls.join(',\n      ')},
    ] }, h)] }, h),
    Table.tableBody({ children: ${bodyRows} }, h),
    ${footer},
  ] }, h)`
  return rtl ? `h.div([h.Dir('rtl')], [\n    ${table},\n  ])` : table
}

const actionsTable = (isStyleX: boolean): string => {
  return `Table.table({ children: [
    Table.tableHeader({ children: [Table.tableRow({ children: [
      Table.tableHead({ children: ['Product'] }, h),
      Table.tableHead({ children: ['Price'] }, h),
      Table.tableHead({ ${isStyleX ? '' : "class: 'text-right', "}children: [${rightCell(isStyleX, `'Actions'`)}] }, h),
    ] }, h)] }, h),
    Table.tableBody({ children: actionRows.map(([product, price], index) =>
      Table.tableRow({ children: [
        Table.tableCell({ ${isStyleX ? '' : "class: 'font-medium', "}children: [${isStyleX ? `h.span([h.Class(stylex.props(styles.medium).className ?? '')], [product])` : 'product'}] }, h),
        Table.tableCell({ children: [price] }, h),
        Table.tableCell({ children: [
          ${isStyleX ? `h.div([h.Class(stylex.props(styles.menuCell).className ?? '')], [` : `h.div([h.Class('flex justify-end')], [`}
            DropdownMenu.dropdownMenu({
              model: model.menus[\`menu-\${index}\`] ?? DropdownMenu.init({ id: \`menu-\${index}\` }),
              toParentMessage: message => GotTableMenuMessage({ id: \`menu-\${index}\`, message }),
              trigger: h.span([h.Class(${isStyleX ? `stylex.props(styles.triggerContent).className ?? ''` : `'inline-flex items-center'`})], [
                Icon.icon('ellipsis', ${isStyleX ? '{}' : "{ class: 'size-4' }"}, h),
                h.span([h.Class(${isStyleX ? `stylex.props(styles.srOnly).className ?? ''` : `'sr-only'`})], ['Open menu']),
              ]),
              ${isStyleX ? "triggerButtonVariant: 'ghost',\n              triggerButtonSize: 'icon-sm'," : "triggerClass: 'inline-flex size-8 items-center justify-center rounded-md hover:bg-accent',"}
              ariaLabel: 'Row actions menu',
              align: 'end',
              items: ['Edit', 'Duplicate', 'Delete'],
              itemToConfig: item =>
                item === 'Delete'
                  ? { label: item, variant: 'destructive', separatorBefore: true }
                  : { label: item },
            }, h),
          ]),
        ] }, h),
      ] }, h)
    ) }, h),
  ] }, h)`
}

const staticBody = (kind: TableKind, isStyleX: boolean): string => {
  switch (kind) {
    case 'demo':
    case 'footer':
    case 'rtl':
      return invoiceTable(kind, isStyleX)
    case 'inventory':
      return `Table.table({ ${isStyleX ? 'layoutStyle: layoutStyle({ maxWidth: "36rem" }), ' : "class: 'max-w-xl', "}children: [
    Table.tableCaption({ children: ['Foldkit ownership by component.'] }, h),
    Table.tableHeader({ children: [Table.tableRow({ children: [
      Table.tableHead({ children: ['Component'] }, h),
      Table.tableHead({ children: ['State'] }, h),
    ] }, h)] }, h),
    Table.tableBody({ children: tableRows.map(([name, state]) =>
      Table.tableRow({ children: [
        Table.tableHead({ scope: 'row', ${isStyleX ? '' : "class: 'font-medium', "}children: [${isStyleX ? `h.span([h.Class(stylex.props(styles.medium).className ?? '')], [name])` : 'name'}] }, h),
        Table.tableCell({ children: [state] }, h),
      ] }, h)) }, h),
  ] }, h)`
    case 'dense':
      return `Table.table({ ${isStyleX ? 'layoutStyle: layoutStyle({ minWidth: "44rem" }), ' : "class: 'min-w-[44rem] text-xs', "}children: [
    Table.tableCaption({ children: ['Deployment inventory with intentionally wide columns.'] }, h),
    Table.tableHeader({ children: [Table.tableRow({ children: ['Service', 'Owner', 'Region', 'Status', 'Last deployment'].map(label =>
      Table.tableHead({ ${isStyleX ? '' : "class: 'h-8 p-1', "}children: [label] }, h)) }, h)] }, h),
    Table.tableBody({ children: [Table.tableRow({ children: [
      Table.tableHead({ scope: 'row', ${isStyleX ? '' : "class: 'p-1', "}children: ['Documentation'] }, h),
      ...['Platform', 'Europe', 'Healthy', 'Today at 10:42'].map(value =>
        Table.tableCell({ ${isStyleX ? '' : "class: 'p-1', "}children: [value] }, h)),
    ] }, h)] }, h),
  ] }, h)`
    case 'empty':
      return `Table.table({ ${isStyleX ? 'layoutStyle: layoutStyle({ maxWidth: "36rem" }), ' : "class: 'max-w-xl', "}children: [
    Table.tableCaption({ children: ['Filtered component inventory.'] }, h),
    Table.tableHeader({ children: [Table.tableRow({ children: [
      Table.tableHead({ children: ['Component'] }, h),
      Table.tableHead({ children: ['State'] }, h),
    ] }, h)] }, h),
    Table.tableBody({ children: [Table.tableRow({ children: [
      Table.tableCell({ colspan: 2, ${isStyleX ? '' : "class: 'h-24 text-center text-muted-foreground', "}children: [${isStyleX ? `h.span([h.Class(stylex.props(styles.empty).className ?? '')], ['No components match this filter.'])` : `'No components match this filter.'`}] }, h),
    ] }, h)] }, h),
  ] }, h)`
    default:
      return 'h.empty'
  }
}

const dataSource = (kind: TableKind): string => {
  switch (kind) {
    case 'demo':
    case 'footer':
      return `
const invoices: ReadonlyArray<readonly [string, string, string, string]> = [
${invoices.map(([i, s, a, m]) => `  ['${i}', '${s}', '${a}', '${m}'],`).join('\n')}
]`
    case 'rtl':
      return `
const rtlInvoices: ReadonlyArray<readonly [string, string, string, string]> = [
${rtlInvoices.map(([i, s, a, m]) => `  ['${i}', '${s}', '${a}', '${m}'],`).join('\n')}
]`
    case 'inventory':
      return `
const tableRows: ReadonlyArray<readonly [string, string]> = [
${tableRows.map(([n, s]) => `  ['${n}', '${s}'],`).join('\n')}
]`
    default:
      return ''
  }
}

const sxStyles = (fixture: TableFixture): string => {
  const parts: Array<string> = []
  if (fixture.kind !== 'dense' && fixture.kind !== 'actions') {
    parts.push("  table: { maxWidth: '36rem' },")
  }
  if (fixture.kind === 'dense') {
    parts.push("  dense: { minWidth: '44rem' },")
  }
  if (
    fixture.kind === 'demo' ||
    fixture.kind === 'footer' ||
    fixture.kind === 'rtl'
  ) {
    parts.push("  invoiceHead: { width: '6.25rem' },")
  }
  if (fixture.kind !== 'dense' && fixture.kind !== 'empty') {
    parts.push('  medium: { fontWeight: 500 },')
  }
  if (fixture.kind !== 'dense' && fixture.kind !== 'inventory') {
    parts.push("  right: { display: 'block', textAlign: 'right' },")
  }
  if (fixture.kind === 'actions') {
    parts.push("  menuCell: { display: 'flex', justifyContent: 'flex-end' },")
    parts.push("  iconTrigger: { width: '2rem', height: '2rem' },")
    parts.push(
      "  triggerContent: { display: 'inline-flex', alignItems: 'center' },",
    )
    parts.push(
      "  srOnly: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 },",
    )
  }
  if (fixture.kind === 'empty') {
    parts.push(
      "  empty: { display: 'block', paddingBlock: '2rem', color: 'var(--muted-foreground)', textAlign: 'center' },",
    )
  }
  return `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${parts.join('\n')}
})`
}

const emitStatic = (
  fixture: TableFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Table',
    componentSlug: 'table',
    renderer,
    exampleName: fixture.title,
    componentImports:
      (renderer !== 'tailwind' ? `${sxStyles(fixture)}` : '') +
      dataSource(fixture.kind),
    viewBody: staticBody(fixture.kind, renderer !== 'tailwind'),
  })

const emitActions = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  return foldkitApplication({
    title: 'Table — Actions',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
import * as DropdownMenu from '@/${base}/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Table from '@/${base}/table'
${isStyleX ? sxStyles({ title: 'Actions', kind: 'actions' }) : ''}
const actionRows: ReadonlyArray<readonly [string, string]> = [
${actionRows.map(([p, pr]) => `  ['${p}', '${pr}'],`).join('\n')}
]`,
    model: `export const Model = S.Struct({
  menus: S.Record(S.String, DropdownMenu.Model),
})
export type Model = typeof Model.Type`,
    messages: `export const GotTableMenuMessage = taggedStruct('GotTableMenuMessage', {
  id: S.String,
  message: DropdownMenu.Message,
})
export const Message = S.Union([GotTableMenuMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    menus: Object.fromEntries(
      actionRows.map((_, index) => [
        \`menu-\${index}\`,
        DropdownMenu.init({ id: \`menu-\${index}\` }),
      ]),
    ),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTableMenuMessage': {
      const current = model.menus[message.id]
      if (current === undefined) {
        return { model }
      }
      const menuOp__ = DropdownMenu.update(current, message.message)
      const commands = menuOp__.commands ?? []
      return {
        model: {
          ...model,
          menus: { ...model.menus, [message.id]: menuOp__.model },
        },
        commands: Command.mapMessages(commands, next =>
          GotTableMenuMessage({ id: message.id, message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Table — Actions',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${actionsTable(isStyleX)
  .split('\n')
  .map(line => `  ${line}`)
  .join('\n')},
  ]),
})`,
  })
}

const tableExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  tableFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code:
      fixture.kind === 'actions'
        ? emitActions(renderer)
        : emitStatic(fixture, renderer),
  }))

export const tableExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, tableExamplesFor(renderer))
