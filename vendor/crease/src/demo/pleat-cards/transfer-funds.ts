import { Style } from '@pleat/core'
import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/pleat/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/pleat/card'
import { field, fieldGroup, fieldLabel } from '@/pleat/field'
import {
  inputGroup,
  inputGroupAddon,
  inputGroupInput,
  inputGroupText,
} from '@/pleat/input-group'
import { item, itemContent, itemGroup } from '@/pleat/item'
import * as Select from '@/pleat/select'
import { separator } from '@/pleat/separator'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  button: layoutStyle({ width: '100%' }),
  fields: Style.make({
    gap: '1.3125rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  mutedLabel: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  row: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  totalLabel: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  totalValue: Style.make({
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  value: Style.make({
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  visuallyHidden: Style.make({
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  }),
}

const fromAccounts = [
  {
    value: 'checking',
    label: 'Main Checking (··8402) — $12,450.00',
  },
  {
    value: 'business',
    label: 'Business (··7731) — $8,920.00',
  },
] as const

const toAccounts = [
  {
    value: 'savings',
    label: 'High Yield Savings (··1192) — $42,100.00',
  },
  {
    value: 'investment',
    label: 'Investment (··3349) — $18,200.00',
  },
] as const

export const Model = S.Struct({
  amount: S.String,
  fromAccount: Select.Model,
  selectedFromAccount: S.String,
  toAccount: Select.Model,
  selectedToAccount: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedAmount: { value: S.String },
  GotFromAccountMessage: {
    message: Select.Message,
  },
  GotToAccountMessage: {
    message: Select.Message,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedAmount: ({ value }) => ({
        model: modifyFields(model, { amount: () => value }),
      }),
      GotFromAccountMessage: ({ message: childMessage }) => {
        const {
          model: fromAccount,
          commands: fromAccountCommands__,
          outMessage: fromAccountOut__,
        } = Select.update(model.fromAccount, childMessage)
        const commands = fromAccountCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(fromAccountOut__)
        return {
          model: modifyFields(model, {
            fromAccount: () => fromAccount,
            selectedFromAccount: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection =>
                  selection._tag === 'Selected' ? selection.value : current,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotFromAccountMessage({ message: next }),
          ),
        }
      },
      GotToAccountMessage: ({ message: childMessage }) => {
        const {
          model: toAccount,
          commands: toAccountCommands__,
          outMessage: toAccountOut__,
        } = Select.update(model.toAccount, childMessage)
        const commands = toAccountCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(toAccountOut__)
        return {
          model: modifyFields(model, {
            toAccount: () => toAccount,
            selectedToAccount: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection =>
                  selection._tag === 'Selected' ? selection.value : current,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotToAccountMessage({ message: next }),
          ),
        }
      },
    }),
  )

export const init = (): Model => ({
  amount: '1,200.00',
  fromAccount: Select.init({
    id: 'transfer-funds-from-account',
    isAnimated: true,
  }),
  selectedFromAccount: 'checking',
  toAccount: Select.init({
    id: 'transfer-funds-to-account',
    isAnimated: true,
  }),
  selectedToAccount: 'savings',
})

const summaryRow = (
  label: string,
  value: string,
  isTotal: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  return h.div(
    [h.Class(className(styles.row))],
    [
      h.span(
        [h.Class(className(isTotal ? styles.totalLabel : styles.mutedLabel))],
        [label],
      ),
      h.span(
        [h.Class(className(isTotal ? styles.totalValue : styles.value))],
        [value],
      ),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Transfer Funds'] }, h),
              cardDescription(
                {
                  children: ['Move money between your connected accounts.'],
                },
                h,
              ),
              cardAction(
                {
                  children: [
                    button(
                      {
                        variant: 'ghost',
                        size: 'icon',
                        children: [
                          Icon.icon('x', {}, h),
                          h.span(
                            [h.Class(className(styles.visuallyHidden))],
                            ['Close transfer form'],
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
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.fields))],
                [
                  fieldGroup(
                    {
                      children: [
                        field(
                          {
                            children: [
                              fieldLabel(
                                {
                                  for: 'transfer-funds-amount',
                                  children: ['Amount to Transfer'],
                                },
                                h,
                              ),
                              inputGroup(
                                {
                                  children: [
                                    inputGroupAddon(
                                      {
                                        children: [
                                          inputGroupText(
                                            { children: ['$'] },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                    inputGroupInput(
                                      {
                                        id: 'transfer-funds-amount',
                                        value: model.amount,
                                        onInput: value =>
                                          Message.UpdatedAmount({ value }),
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
                        field(
                          {
                            children: [
                              fieldLabel(
                                {
                                  for: 'transfer-funds-from-account-button',
                                  children: ['From Account'],
                                },
                                h,
                              ),
                              Select.select(
                                {
                                  model: model.fromAccount,
                                  maybeSelectedValue: Option.some(
                                    model.selectedFromAccount,
                                  ),
                                  toParentMessage: message =>
                                    Message.GotFromAccountMessage({ message }),
                                  items: fromAccounts,
                                  itemToValue: account => account.value,
                                  itemToLabel: account => account.label,
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        field(
                          {
                            children: [
                              fieldLabel(
                                {
                                  for: 'transfer-funds-to-account-button',
                                  children: ['To Account'],
                                },
                                h,
                              ),
                              Select.select(
                                {
                                  model: model.toAccount,
                                  maybeSelectedValue: Option.some(
                                    model.selectedToAccount,
                                  ),
                                  toParentMessage: message =>
                                    Message.GotToAccountMessage({ message }),
                                  items: toAccounts,
                                  itemToValue: account => account.value,
                                  itemToLabel: account => account.label,
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        itemGroup(
                          {
                            children: [
                              item(
                                {
                                  variant: 'muted',
                                  orientation: 'vertical',
                                  children: [
                                    itemContent(
                                      {
                                        spacing: 'md',
                                        children: [
                                          summaryRow(
                                            'Estimated arrival',
                                            'Today, Apr 14',
                                            false,
                                            h,
                                          ),
                                          separator({}, h),
                                          summaryRow(
                                            'Transaction fee',
                                            '$0.00',
                                            false,
                                            h,
                                          ),
                                          separator({}, h),
                                          summaryRow(
                                            'Total amount',
                                            '$1,200.00',
                                            true,
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
                        ),
                      ],
                    },
                    h,
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            children: [
              button(
                { layoutStyle: styles.button, children: ['Confirm Transfer'] },
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

/*
Stateful? yes.
Submodels wired: Select (from account, to account).
PORT NOTEs: none.
*/
