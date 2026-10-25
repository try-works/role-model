import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import {
  actionRows,
  invoices,
  rtlInvoices,
  tableFixtures,
  tableRows,
  type TableFixture,
} from '@/docs/components/pages/table/shared'
import * as DropdownMenu from '@/stylex/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Table from '@/stylex/table'

const styles = stylex.create({
  table: { maxWidth: '36rem' },
  invoiceHead: { width: '6.25rem' },
  medium: { fontWeight: 500 },
  right: { textAlign: 'right' },
  dense: { fontSize: '0.75rem', lineHeight: '1rem', minWidth: '44rem' },
  denseHead: {
    paddingBlock: '0.25rem',
    paddingInline: '0.25rem',
    height: '2rem',
  },
  denseCell: { padding: '0.25rem' },
  emptyCell: {
    color: 'var(--muted-foreground)',
    textAlign: 'center',
    height: '6rem',
  },
  menuCell: { display: 'flex', justifyContent: 'flex-end' },
  triggerContent: {
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  denseRowHead: { paddingBlock: '0.25rem', paddingInline: '0.25rem' },
})

interface TablePreviewShape {
  readonly menus: Readonly<Record<string, DropdownMenu.Model>>
}

const invoiceTable = <Msg>(
  fixture: TableFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  const rtl = fixture.kind === 'rtl'
  const rows = rtl ? rtlInvoices : invoices
  const sliced = fixture.kind === 'footer' ? rows.slice(0, 3) : rows
  const heads = rtl
    ? ['الفاتورة', 'الحالة', 'الطريقة', 'المبلغ']
    : ['Invoice', 'Status', 'Method', 'Amount']
  const caption = rtl
    ? 'قائمة بفواتيرك الأخيرة.'
    : 'A list of your recent invoices.'
  const table = Table.table(
    {
      children: [
        Table.tableCaption({ children: [caption] }, h),
        Table.tableHeader(
          {
            children: [
              Table.tableRow(
                {
                  children: [
                    Table.tableHead(
                      {
                        layoutStyle: styles.invoiceHead,
                        children: [heads[0] ?? 'Invoice'],
                      },
                      h,
                    ),
                    Table.tableHead({ children: [heads[1] ?? 'Status'] }, h),
                    Table.tableHead({ children: [heads[2] ?? 'Method'] }, h),
                    Table.tableHead(
                      {
                        layoutStyle: styles.right as ComponentLayoutStyle,
                        children: [heads[3] ?? 'Amount'],
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
        ),
        Table.tableBody(
          {
            children: sliced.map(([invoice, status, amount, method]) =>
              Table.tableRow(
                {
                  children: [
                    Table.tableCell(
                      {
                        layoutStyle: styles.medium as ComponentLayoutStyle,
                        children: [invoice],
                      },
                      h,
                    ),
                    Table.tableCell({ children: [status] }, h),
                    Table.tableCell({ children: [method] }, h),
                    Table.tableCell(
                      {
                        layoutStyle: styles.right as ComponentLayoutStyle,
                        children: [amount],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ),
          },
          h,
        ),
        Table.tableFooter(
          {
            children: [
              Table.tableRow(
                {
                  children: [
                    Table.tableCell(
                      { colspan: 3, children: [rtl ? 'المجموع' : 'Total'] },
                      h,
                    ),
                    Table.tableCell(
                      {
                        layoutStyle: styles.right as ComponentLayoutStyle,
                        children: ['$2,500.00'],
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
        ),
      ],
    },
    h,
  )
  return rtl ? h.div([h.Dir('rtl')], [table]) : table
}

const actionsTable = <Msg>(
  shape: TablePreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Table.table(
    {
      children: [
        Table.tableHeader(
          {
            children: [
              Table.tableRow(
                {
                  children: [
                    Table.tableHead({ children: ['Product'] }, h),
                    Table.tableHead({ children: ['Price'] }, h),
                    Table.tableHead(
                      {
                        layoutStyle: styles.right as ComponentLayoutStyle,
                        children: ['Actions'],
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
        ),
        Table.tableBody(
          {
            children: actionRows.map(([product, price], index) =>
              Table.tableRow(
                {
                  children: [
                    Table.tableCell(
                      {
                        layoutStyle: styles.medium as ComponentLayoutStyle,
                        children: [product],
                      },
                      h,
                    ),
                    Table.tableCell({ children: [price] }, h),
                    Table.tableCell(
                      {
                        children: [
                          h.div(
                            [
                              h.Class(
                                stylex.props(styles.menuCell).className ?? '',
                              ),
                            ],
                            [
                              DropdownMenu.dropdownMenu(
                                {
                                  model:
                                    shape.menus[`menu-${String(index)}`] ??
                                    DropdownMenu.init({
                                      id: `menu-${String(index)}`,
                                    }),
                                  toParentMessage: message =>
                                    onMessageJson(
                                      JSON.stringify({
                                        _tag: 'GotDocsTableMenuMessage',
                                        id: `menu-${String(index)}`,
                                        message,
                                      }),
                                    ),
                                  trigger: h.span(
                                    [
                                      h.Class(
                                        stylex.props(styles.triggerContent)
                                          .className ?? '',
                                      ),
                                    ],
                                    [
                                      Icon.icon('ellipsis', {}, h),
                                      h.span(
                                        [
                                          h.Class(
                                            stylex.props(styles.srOnly)
                                              .className ?? '',
                                          ),
                                        ],
                                        ['Open menu'],
                                      ),
                                    ],
                                  ),
                                  triggerButtonVariant: 'ghost',
                                  triggerButtonSize: 'icon-sm',
                                  ariaLabel: `${product} menu`,
                                  align: 'end',
                                  items: ['Edit', 'Duplicate', 'Delete'],
                                  itemToConfig: item =>
                                    item === 'Delete'
                                      ? {
                                          label: item,
                                          variant: 'destructive',
                                          separatorBefore: true,
                                        }
                                      : { label: item },
                                },
                                h,
                              ),
                            ],
                          ),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ),
          },
          h,
        ),
      ],
    },
    h,
  )

export const tableStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const shape = model as TablePreviewShape
  const fixture = tableFixtures[exampleIndex] ?? tableFixtures[0]
  switch (fixture.kind) {
    case 'demo':
    case 'footer':
    case 'rtl':
      return invoiceTable(fixture, h)
    case 'actions':
      return actionsTable(shape, onMessageJson, h)
    case 'inventory':
      return Table.table(
        {
          layoutStyle: styles.table,
          children: [
            Table.tableCaption(
              { children: ['Foldkit ownership by component.'] },
              h,
            ),
            Table.tableHeader(
              {
                children: [
                  Table.tableRow(
                    {
                      children: [
                        Table.tableHead({ children: ['Component'] }, h),
                        Table.tableHead({ children: ['State'] }, h),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Table.tableBody(
              {
                children: tableRows.map(([name, state]) =>
                  Table.tableRow(
                    {
                      children: [
                        Table.tableHead(
                          {
                            scope: 'row',
                            layoutStyle: styles.medium as ComponentLayoutStyle,
                            children: [name],
                          },
                          h,
                        ),
                        Table.tableCell({ children: [state] }, h),
                      ],
                    },
                    h,
                  ),
                ),
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'dense':
      return Table.table(
        {
          layoutStyle: styles.dense as ComponentLayoutStyle,
          children: [
            Table.tableCaption(
              {
                children: [
                  'Deployment inventory with intentionally wide columns.',
                ],
              },
              h,
            ),
            Table.tableHeader(
              {
                children: [
                  Table.tableRow(
                    {
                      children: [
                        'Service',
                        'Owner',
                        'Region',
                        'Status',
                        'Last deployment',
                      ].map(label =>
                        Table.tableHead(
                          {
                            layoutStyle:
                              styles.denseHead as ComponentLayoutStyle,
                            children: [label],
                          },
                          h,
                        ),
                      ),
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Table.tableBody(
              {
                children: [
                  Table.tableRow(
                    {
                      children: [
                        Table.tableHead(
                          {
                            scope: 'row',
                            layoutStyle:
                              styles.denseRowHead as ComponentLayoutStyle,
                            children: ['Documentation'],
                          },
                          h,
                        ),
                        ...[
                          'Platform',
                          'Europe',
                          'Healthy',
                          'Today at 10:42',
                        ].map(value =>
                          Table.tableCell(
                            {
                              layoutStyle:
                                styles.denseCell as ComponentLayoutStyle,
                              children: [value],
                            },
                            h,
                          ),
                        ),
                      ],
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
    case 'empty':
      return Table.table(
        {
          layoutStyle: styles.table,
          children: [
            Table.tableCaption(
              { children: ['Filtered component inventory.'] },
              h,
            ),
            Table.tableHeader(
              {
                children: [
                  Table.tableRow(
                    {
                      children: [
                        Table.tableHead({ children: ['Component'] }, h),
                        Table.tableHead({ children: ['State'] }, h),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Table.tableBody(
              {
                children: [
                  Table.tableRow(
                    {
                      children: [
                        Table.tableCell(
                          {
                            colspan: 2,
                            layoutStyle:
                              styles.emptyCell as ComponentLayoutStyle,
                            children: ['No components match this filter.'],
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
            ),
          ],
        },
        h,
      )
  }
}
