import * as stylex from '@stylexjs/stylex'
import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/stylex/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import * as DropdownMenu from '@/stylex/dropdown-menu'
import { table, tableBody, tableCell, tableRow } from '@/stylex/table'
import { className } from '@/stylex/style'
import { cardTokens } from './complex-card-tokens.stylex'
import { tokens } from '../../stylex/tokens.stylex'

const styles = stylex.create({
  amount: {
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  category: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  date: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  income: { color: cardTokens.positive },
  merchant: { fontWeight: 500 },
  stack: { display: 'flex', flexDirection: 'column' },
  textRight: { textAlign: 'right' },
  transactionIcon: { flexShrink: 0, height: '1rem', width: '1rem' },
  transactionMedia: {
    borderRadius: tokens.cardRadius,
    alignItems: 'center',
    backgroundColor: cardTokens.muted,
    display: 'flex',
    justifyContent: 'center',
    height: '2.5rem',
    width: '2.5rem',
  },
  visuallyHidden: {
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  width10: { width: '2.5rem' },
  width8: { width: '2rem' },
})

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
            layoutStyle: styles.width10,
            children: [
              h.div(
                [h.Class(className(styles.transactionMedia))],
                [
                  Icon.icon(
                    transaction.icon,
                    { class: className(styles.transactionIcon) },
                    h,
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        tableCell(
          {
            children: [
              h.div(
                [h.Class(className(styles.stack))],
                [
                  h.span(
                    [h.Class(className(styles.merchant))],
                    [transaction.merchant],
                  ),
                  h.span(
                    [h.Class(className(styles.category))],
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
            children: [
              h.span([h.Class(className(styles.date))], [transaction.date]),
            ],
          },
          h,
        ),
        tableCell(
          {
            children: [
              h.div(
                [h.Class(className(styles.textRight))],
                [
                  h.span(
                    [
                      h.Class(
                        className(
                          styles.amount,
                          transaction.isIncome === true && styles.income,
                        ),
                      ),
                    ],
                    [transaction.amount],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        tableCell(
          {
            children: [
              h.div(
                [h.Class(className(styles.width8))],
                [
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
                            [h.Class(className(styles.visuallyHidden))],
                            [`Actions for ${transaction.merchant}`],
                          ),
                        ],
                      ),
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
