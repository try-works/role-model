import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as stylex from '@stylexjs/stylex'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/stylex/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { field, fieldDescription, fieldGroup, fieldLabel } from '@/stylex/field'
import * as Select from '@/stylex/select'
import * as Slider from '@/stylex/slider'
import { textarea } from '@/stylex/textarea'
import { className } from '@/stylex/style'

const styles = stylex.create({
  action: { display: 'grid', width: '100%' },
  amount: {
    fontSize: '1.5rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '2rem',
  },
  between: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  /* TW: ghost + size-8 + bg-muted — --secondary === --muted in the site
     theme, so the secondary variant yields the same muted box. */
  closeButton: { height: '2rem', width: '2rem' },
  full: { width: '100%' },
  icon: {
    display: 'inline-flex',
    flexShrink: 0,
    height: '1rem',
    width: '1rem',
  },
  labelRow: {
    alignItems: 'baseline',
    display: 'flex',
    justifyContent: 'space-between',
  },
  notes: { minHeight: '6.25rem' },
  srOnly: {
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
})

const currencies = [
  { value: 'usd', label: 'USD — United States Dollar' },
  { value: 'eur', label: 'EUR — Euro' },
  { value: 'gbp', label: 'GBP — British Pound' },
  { value: 'jpy', label: 'JPY — Japanese Yen' },
] as const

export const Model = S.Struct({
  currency: Select.Model,
  selectedCurrency: S.String,
  amount: Slider.Model,
  amountValue: S.Number,
  notes: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotCurrencyMessage: {
    message: Select.Message,
  },
  GotAmountMessage: {
    message: Slider.Message,
  },
  UpdatedNotes: { value: S.String },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotCurrencyMessage: ({ message: childMessage }) => {
        const {
          model: currency,
          commands: currencyCommands__,
          outMessage: currencyOut__,
        } = Select.update(model.currency, childMessage)
        const commands = currencyCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(currencyOut__)
        return {
          model: modifyFields(model, {
            currency: () => currency,
            selectedCurrency: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection =>
                  selection._tag === 'Selected' ? selection.value : current,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotCurrencyMessage({ message: next }),
          ),
        }
      },
      GotAmountMessage: ({ message: childMessage }) => {
        const {
          model: amount,
          commands: amountCommands__,
          outMessage: amountOut__,
        } = Slider.update(model.amount, childMessage)
        const commands = amountCommands__ ?? []
        const maybeChange = Option.fromNullishOr(amountOut__)
        return {
          model: modifyFields(model, {
            amount: () => amount,
            amountValue: current =>
              Option.match(maybeChange, {
                onNone: () => current,
                onSome: change => change.value,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotAmountMessage({ message: next }),
          ),
        }
      },
      UpdatedNotes: ({ value }) => ({
        model: modifyFields(model, { notes: () => value }),
      }),
    }),
  )

export const init = (): Model => ({
  currency: Select.init({
    id: 'payout-threshold-currency',
    isAnimated: true,
  }),
  selectedCurrency: 'usd',
  amount: Slider.init({
    id: 'payout-threshold-amount',
    min: 50,
    max: 10000,
    step: 50,
  }),
  amountValue: 2500,
  notes: '',
})

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Payout Threshold'] }, h),
              cardDescription(
                {
                  children: [
                    'Set the minimum balance required before a payout is triggered.',
                  ],
                },
                h,
              ),
              cardAction(
                {
                  children: [
                    button(
                      {
                        variant: 'secondary',
                        size: 'icon',
                        layoutStyle: styles.closeButton,
                        children: [
                          Icon.icon('x', { class: className(styles.icon) }, h),
                          h.span(
                            [h.Class(className(styles.srOnly))],
                            ['Close Payout Threshold'],
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
              fieldGroup(
                {
                  children: [
                    field(
                      {
                        children: [
                          fieldLabel(
                            {
                              for: 'payout-threshold-currency-button',
                              children: ['Preferred Currency'],
                            },
                            h,
                          ),
                          Select.select(
                            {
                              model: model.currency,
                              maybeSelectedValue: Option.some(
                                model.selectedCurrency,
                              ),
                              toParentMessage: message =>
                                Message.GotCurrencyMessage({ message }),
                              items: currencies,
                              itemToValue: currency => currency.value,
                              itemToLabel: currency => currency.label,
                              triggerLayoutStyle: styles.full,
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
                          h.div(
                            [h.Class(className(styles.labelRow))],
                            [
                              fieldLabel(
                                {
                                  children: ['Minimum Payout Amount'],
                                },
                                h,
                              ),
                              h.span(
                                [h.Class(className(styles.amount))],
                                [`$${model.amountValue.toFixed(2)}`],
                              ),
                            ],
                          ),
                          Slider.slider(
                            {
                              model: model.amount,
                              value: model.amountValue,
                              toParentMessage: message =>
                                Message.GotAmountMessage({ message }),
                              ariaLabel: 'Minimum Payout Amount',
                            },
                            h,
                          ),
                          h.div(
                            [h.Class(className(styles.between))],
                            [
                              fieldDescription({ children: ['$50 (MIN)'] }, h),
                              fieldDescription(
                                { children: ['$10,000 (MAX)'] },
                                h,
                              ),
                            ],
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
                              for: 'payout-threshold-notes',
                              children: ['Notes'],
                            },
                            h,
                          ),
                          textarea(
                            {
                              id: 'payout-threshold-notes',
                              value: model.notes,
                              onInput: value => Message.UpdatedNotes({ value }),
                              placeholder:
                                'Add any notes for this payout configuration...',
                              layoutStyle: styles.notes,
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
        cardFooter(
          {
            children: [
              h.div(
                [h.Class(className(styles.action))],
                [button({ children: ['Save Threshold'] }, h)],
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

// SUBSCRIPTIONS — slider drag needs document-level pointer subscriptions.

export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift({
    payoutAmountPointer: Slider.subscriptions.dragPointer,
    payoutAmountEscape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.amount,
    toParentMessage: message => Message.GotAmountMessage({ message }),
  }),
)

/*
Stateful? yes.
Submodels wired: Select (preferred currency), Slider (minimum payout).
PORT NOTEs: none.
*/
