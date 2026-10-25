import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/ui/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import * as DropdownMenu from '@/ui/dropdown-menu'
import { table, tableBody, tableCell, tableRow } from '@/ui/table'

type Transaction = Readonly<{
  merchant: string
  category: string
  date: string
  amount: string
  icon: string
  isIncome?: boolean
}>

const TRANSACTIONS: ReadonlyArray<Transaction> = [
  {
    merchant: 'Blue Bottle Coffee',
    category: 'Food & Drink',
    date: 'Today, 10:24 AM',
    amount: '-$6.50',
    icon: 'coffee',
  },
  {
    merchant: 'Whole Foods Market',
    category: 'Groceries',
    date: 'Yesterday',
    amount: '-$142.30',
    icon: 'shopping-cart',
  },
  {
    merchant: 'Stripe Payout',
    category: 'Income',
    date: 'Oct 12',
    amount: '+$4,200.00',
    icon: 'wallet',
    isIncome: true,
  },
  {
    merchant: 'Uber Technologies',
    category: 'Transport',
    date: 'Oct 11',
    amount: '-$24.10',
    icon: 'car',
  },
  {
    merchant: 'Netflix Subscription',
    category: 'Entertainment',
    date: 'Oct 10',
    amount: '-$19.99',
    icon: 'tv',
  },
]

type Action = 'view-details' | 'add-note' | 'categorize' | 'dispute'

const ACTIONS: ReadonlyArray<Action> = [
  'view-details',
  'add-note',
  'categorize',
  'dispute',
]

const ACTION_LABELS: Readonly<Record<Action, string>> = {
  'view-details': 'View details',
  'add-note': 'Add note',
  categorize: 'Categorize',
  dispute: 'Dispute',
}

const TransactionMenu = DropdownMenu.create<Action>()

export const Model = S.Struct({
  menus: S.Array(DropdownMenu.Model),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotMenuMessage: {
    index: S.Number,
    message: DropdownMenu.Message,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  const currentMenu = model.menus[message.index]

  if (currentMenu === undefined) {
    return { model: model }
  }

  const nextMenuOp__ = TransactionMenu.update(currentMenu, message.message)
  const nextMenu = nextMenuOp__.model
  const commands = nextMenuOp__.commands ?? []

  return {
    model: modifyFields(model, {
      menus: menus =>
        menus.map((menu, index) => (index === message.index ? nextMenu : menu)),
    }),
    commands: Command.mapMessages(commands, nextMessage =>
      Message.GotMenuMessage({ index: message.index, message: nextMessage }),
    ),
  }
}

export const init = (): Model => ({
  menus: TRANSACTIONS.map((_transaction, index) =>
    DropdownMenu.init({
      id: `recent-transactions-menu-${index}`,
      isAnimated: true,
    }),
  ),
})

const MENU_TRIGGER_CLASS =
  "inline-flex size-8 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

const transactionRow = (
  transaction: Transaction,
  menu: DropdownMenu.Model,
  index: number,
  h: HtmlBuilder<Message>,
): Html => {
  return tableRow(
    {
      children: [
        tableCell(
          {
            class: 'w-10',
            children: [
              h.div(
                [
                  h.Class(
                    'flex size-10 items-center justify-center rounded-lg bg-muted',
                  ),
                ],
                [Icon.icon(transaction.icon, { class: 'size-4 shrink-0' }, h)],
              ),
            ],
          },
          h,
        ),
        tableCell(
          {
            children: [
              h.div(
                [h.Class('flex flex-col')],
                [
                  h.span([h.Class('font-medium')], [transaction.merchant]),
                  h.span(
                    [h.Class('text-sm text-muted-foreground')],
                    [transaction.category],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        tableCell(
          {
            class: 'text-sm text-muted-foreground',
            children: [transaction.date],
          },
          h,
        ),
        tableCell(
          {
            class: 'text-right',
            children: [
              h.span(
                [
                  h.Class(
                    `text-sm font-semibold${transaction.isIncome === true ? ' text-emerald-500' : ''} tabular-nums`,
                  ),
                ],
                [transaction.amount],
              ),
            ],
          },
          h,
        ),
        tableCell(
          {
            class: 'w-8',
            children: [
              DropdownMenu.dropdownMenu<Action, Message>(
                {
                  model: menu,
                  toParentMessage: message =>
                    Message.GotMenuMessage({ index, message }),
                  trigger: h.span(
                    [],
                    [
                      Icon.moreHorizontal({}, h),
                      h.span(
                        [h.Class('sr-only')],
                        [`Actions for ${transaction.merchant}`],
                      ),
                    ],
                  ),
                  triggerClass: MENU_TRIGGER_CLASS,
                  items: ACTIONS,
                  itemToConfig: action => ({
                    label: ACTION_LABELS[action],
                  }),
                  align: 'end',
                  ariaLabel: `Actions for ${transaction.merchant}`,
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Recent Transactions'] }, h),
              cardDescription(
                {
                  children: ['Your latest account activity.'],
                },
                h,
              ),
              cardAction(
                {
                  children: [
                    button(
                      {
                        variant: 'outline',
                        size: 'sm',
                        children: ['View All'],
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
        cardContent(
          {
            children: [
              table(
                {
                  children: [
                    tableBody(
                      {
                        children: TRANSACTIONS.flatMap((transaction, index) => {
                          const menu = model.menus[index]

                          return menu === undefined
                            ? []
                            : [transactionRow(transaction, menu, index, h)]
                        }),
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

// PORT NOTE: DropdownMenu cannot express the source's unlabeled separator before Dispute.
// PORT NOTE: Button has no icon-sm size, so the menu trigger uses an inline size-8 class equivalent.
// Card summary: stateful? yes. Submodels wired: five Dropdown Menus. PORT NOTEs: unlabeled separator and icon-sm trigger substitute.
