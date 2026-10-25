import { Match as M, Option, Schema as S } from 'effect'
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
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import {
  field,
  fieldGroup,
  fieldLabel,
  fieldLegend,
  fieldSet,
} from '@/ui/field'
import { input } from '@/ui/input'
import * as RadioGroup from '@/ui/radio-group'

export const Model = S.Struct({
  accountHolder: S.String,
  receivingMethod: S.String,
  iban: S.String,
  radioGroup: RadioGroup.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedAccountHolder: {
    value: S.String,
  },
  SelectedReceivingMethod: {
    value: S.String,
  },
  UpdatedIban: { value: S.String },
  GotReceivingMethodRadioGroupMessage: { message: RadioGroup.Message },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedAccountHolder: ({ value }) => ({
        model: modifyFields(model, { accountHolder: () => value }),
      }),
      SelectedReceivingMethod: ({ value }) => ({
        model: { ...model, receivingMethod: value },
      }),
      UpdatedIban: ({ value }) => ({
        model: modifyFields(model, { iban: () => value }),
      }),
      GotReceivingMethodRadioGroupMessage: ({ message }) => {
        const {
          model: radioGroup,
          commands: radioGroupCommands__,
          outMessage: radioGroupOut__,
        } = RadioGroup.update(model.radioGroup, message)
        const commands = radioGroupCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(radioGroupOut__)
        return {
          model: {
            ...model,
            radioGroup,
            receivingMethod: Option.match(maybeSelection, {
              onNone: () => model.receivingMethod,
              onSome: selection => selection.value,
            }),
          },
          commands: Command.mapMessages(commands, childMessage =>
            Message['GotReceivingMethodRadioGroupMessage']({
              message: childMessage,
            }),
          ),
        }
      },
    }),
  )

export const init = (): Model => ({
  accountHolder: 'Synthetic Horizons Music LLC',
  receivingMethod: 'bank',
  iban: '',
  radioGroup: RadioGroup.init({ id: 'receiving-method-choice' }),
})

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardDescription({ children: ['Payout Preferences'] }, h),
              cardTitle({ children: ['Receiving Method'] }, h),
              cardAction(
                {
                  children: [
                    button(
                      {
                        variant: 'ghost',
                        size: 'icon',
                        class: 'size-8 bg-muted',
                        children: [
                          Icon.icon('x', {}, h),
                          h.span(
                            [h.Class('sr-only')],
                            ['Close Receiving Method'],
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
                              for: 'receiving-method-account-holder',
                              children: ['Account Holder Name'],
                            },
                            h,
                          ),
                          input(
                            {
                              id: 'receiving-method-account-holder',
                              value: model.accountHolder,
                              onInput: value =>
                                Message.UpdatedAccountHolder({ value }),
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    fieldSet(
                      {
                        children: [
                          fieldLegend(
                            {
                              variant: 'label',
                              children: ['Receiving Method'],
                            },
                            h,
                          ),
                          RadioGroup.radioGroup(
                            {
                              model: model.radioGroup,
                              selectedValue: Option.some(model.receivingMethod),
                              toParentMessage: message =>
                                Message['GotReceivingMethodRadioGroupMessage']({
                                  message,
                                }),
                              ariaLabel: 'Receiving Method',
                              options: [
                                {
                                  value: 'bank',
                                  label: 'Bank Transfer',
                                  description: 'SWIFT / IBAN',
                                },
                                {
                                  value: 'paypal',
                                  label: 'PayPal',
                                  description: 'Instant Payout',
                                },
                              ],
                              class:
                                'grid grid-cols-1 items-start gap-3 md:grid-cols-2',
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
                              for: 'receiving-method-iban',
                              children: ['IBAN / Account Number'],
                            },
                            h,
                          ),
                          input(
                            {
                              id: 'receiving-method-iban',
                              value: model.iban,
                              onInput: value => Message.UpdatedIban({ value }),
                              placeholder: 'DE89 3704 0044 ....',
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
              button(
                {
                  class: 'w-full',
                  isDisabled: true,
                  children: ['Save Payout Settings'],
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

/*
Stateful? yes.
Submodels wired: RadioGroup (receiving method).
The CreaseUI RadioGroup example uses a two-column layout with labeled options.
*/
