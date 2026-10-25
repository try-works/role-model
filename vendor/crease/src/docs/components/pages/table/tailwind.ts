import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  actionRows,
  invoices,
  rtlInvoices,
  tableFixtures,
  tableRows,
  type TableFixture,
} from '@/docs/components/pages/table/shared'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Table from '@/ui/table'

const GotTableMenuMessage = taggedStruct('GotDocsTableMenuMessage', {
  id: S.String,
  message: DropdownMenu.Message,
})
const PreviewMessage = S.Union([GotTableMenuMessage])
type PreviewMessage = typeof PreviewMessage.Type

const TablePreviewModel = S.Struct({
  _docsPage: S.Literal('table'),
  menus: S.Record(S.String, DropdownMenu.Model),
})
type TablePreviewModel = typeof TablePreviewModel.Type

const menuCell = (
  index: number,
  product: string,
  model: TablePreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const id = `menu-${String(index)}`
  return h.div(
    [h.Class('flex justify-end')],
    [
      DropdownMenu.dropdownMenu(
        {
          model: model.menus[id] ?? DropdownMenu.init({ id }),
          toParentMessage: message => GotTableMenuMessage({ id, message }),
          trigger: h.span(
            [h.Class('inline-flex items-center')],
            [
              Icon.icon('ellipsis', { class: 'size-4' }, h),
              h.span([h.Class('sr-only')], ['Open menu']),
            ],
          ),
          triggerClass:
            'inline-flex size-8 items-center justify-center rounded-md hover:bg-accent',
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
  )
}

const invoiceTable = (
  fixture: TableFixture,
  _model: TablePreviewModel,
  h: HtmlBuilder<PreviewMessage>,
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
                      { class: 'w-[100px]', children: [heads[0] ?? 'Invoice'] },
                      h,
                    ),
                    Table.tableHead({ children: [heads[1] ?? 'Status'] }, h),
                    Table.tableHead({ children: [heads[2] ?? 'Method'] }, h),
                    Table.tableHead(
                      { class: 'text-right', children: [heads[3] ?? 'Amount'] },
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
                      { class: 'font-medium', children: [invoice] },
                      h,
                    ),
                    Table.tableCell({ children: [status] }, h),
                    Table.tableCell({ children: [method] }, h),
                    Table.tableCell(
                      { class: 'text-right', children: [amount] },
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
                      { class: 'text-right', children: ['$2,500.00'] },
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

const actionsTable = (
  model: TablePreviewModel,
  h: HtmlBuilder<PreviewMessage>,
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
                      { class: 'text-right', children: ['Actions'] },
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
                      { class: 'font-medium', children: [product] },
                      h,
                    ),
                    Table.tableCell({ children: [price] }, h),
                    Table.tableCell(
                      { children: [menuCell(index, product, model, h)] },
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

export const tableTailwindPreviewProgram = definePreviewProgram<
  TablePreviewModel,
  PreviewMessage
>({
  Model: TablePreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = tableFixtures[index] ?? tableFixtures[0]
    return {
      _docsPage: 'table',
      menus:
        fixture.kind === 'actions'
          ? Object.fromEntries(
              actionRows.map((_row, rowIndex) => [
                `menu-${String(rowIndex)}`,
                DropdownMenu.init({ id: `menu-${String(rowIndex)}` }),
              ]),
            )
          : {},
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDocsTableMenuMessage': {
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
            GotTableMenuMessage({ id: message.id, message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = tableFixtures[index] ?? tableFixtures[0]
    switch (fixture.kind) {
      case 'demo':
      case 'footer':
      case 'rtl':
        return invoiceTable(fixture, model, h)
      case 'actions':
        return actionsTable(model, h)
      case 'inventory':
        return Table.table(
          {
            class: 'max-w-xl',
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
                              class: 'font-medium',
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
            class: 'min-w-[44rem] text-xs',
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
                            { class: 'h-8 p-1', children: [label] },
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
                              class: 'p-1',
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
                              { class: 'p-1', children: [value] },
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
            class: 'max-w-xl',
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
                              class: 'h-24 text-center text-muted-foreground',
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
  },
})
