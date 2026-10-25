import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  labelFixtures,
  labelMonths,
  labelRtlCopy,
  labelYears,
  type LabelKind,
} from '@/docs/components/pages/label/shared'
import * as Button from '@/ui/button'
import * as Checkbox from '@/ui/checkbox'
import * as Field from '@/ui/field'
import * as Input from '@/ui/input'
import * as Label from '@/ui/label'
import * as Select from '@/ui/select'
import * as Textarea from '@/ui/textarea'

const LabelPreviewModel = S.Struct({
  _docsPage: S.Literal('label'),
  acceptedTerms: S.Boolean,
  name: S.String,
  cardNumber: S.String,
  cvv: S.String,
  comments: S.String,
  sameAsShipping: S.Boolean,
  month: Select.Model,
  maybeMonth: S.Option(S.String),
  year: Select.Model,
  maybeYear: S.Option(S.String),
})
type LabelPreviewModel = typeof LabelPreviewModel.Type

const LabelPreviewMessage = defineMessageUnion({
  ToggledTerms: { isChecked: S.Boolean },
  ChangedName: { value: S.String },
  ChangedCardNumber: { value: S.String },
  ChangedCvv: { value: S.String },
  ChangedComments: { value: S.String },
  ToggledSameAsShipping: { isChecked: S.Boolean },
  GotMonthMessage: { message: Select.Message },
  GotYearMessage: { message: Select.Message },
})
type LabelPreviewMessage = typeof LabelPreviewMessage.Type

const labelView = (
  kind: LabelKind,
  model: LabelPreviewModel,
  h: HtmlBuilder<LabelPreviewMessage>,
): Html => {
  switch (kind) {
    case 'demo':
      return h.div(
        [h.Class('flex gap-2')],
        [
          Checkbox.checkbox(
            {
              id: 'terms',
              isChecked: model.acceptedTerms,
              onToggle: isChecked =>
                LabelPreviewMessage.ToggledTerms({ isChecked }),
            },
            h,
          ),
          Label.label(
            {
              id: 'terms-label',
              for: 'terms',
              children: ['Accept terms and conditions'],
            },
            h,
          ),
        ],
      )
    case 'rtl':
      return h.div(
        [h.Class('flex gap-2'), h.Attribute('dir', 'rtl')],
        [
          Checkbox.checkbox(
            {
              id: 'terms-rtl',
              isChecked: model.acceptedTerms,
              onToggle: isChecked =>
                LabelPreviewMessage.ToggledTerms({ isChecked }),
            },
            h,
          ),
          Label.label(
            {
              id: 'terms-rtl-label',
              for: 'terms-rtl',
              children: [labelRtlCopy.label],
            },
            h,
          ),
        ],
      )
    case 'field':
      return h.div(
        [h.Class('w-full max-w-md')],
        [
          h.form(
            [],
            [
              Field.fieldGroup(
                {
                  children: [
                    Field.fieldSet(
                      {
                        children: [
                          Field.fieldLegend(
                            { children: ['Payment Method'] },
                            h,
                          ),
                          Field.fieldDescription(
                            {
                              children: [
                                'All transactions are secure and encrypted',
                              ],
                            },
                            h,
                          ),
                          Field.fieldGroup(
                            {
                              children: [
                                Field.field(
                                  {
                                    children: [
                                      Field.fieldLabel(
                                        {
                                          for: 'checkout-card-name',
                                          children: ['Name on Card'],
                                        },
                                        h,
                                      ),
                                      Input.input(
                                        {
                                          id: 'checkout-card-name',
                                          value: model.name,
                                          onInput: value =>
                                            LabelPreviewMessage.ChangedName({
                                              value,
                                            }),
                                          placeholder: 'Evil Rabbit',
                                          isRequired: true,
                                        },
                                        h,
                                      ),
                                    ],
                                  },
                                  h,
                                ),
                                Field.field(
                                  {
                                    children: [
                                      Field.fieldLabel(
                                        {
                                          for: 'checkout-card-number',
                                          children: ['Card Number'],
                                        },
                                        h,
                                      ),
                                      Input.input(
                                        {
                                          id: 'checkout-card-number',
                                          value: model.cardNumber,
                                          onInput: value =>
                                            LabelPreviewMessage.ChangedCardNumber(
                                              {
                                                value,
                                              },
                                            ),
                                          placeholder: '1234 5678 9012 3456',
                                          isRequired: true,
                                        },
                                        h,
                                      ),
                                      Field.fieldDescription(
                                        {
                                          children: [
                                            'Enter your 16-digit card number',
                                          ],
                                        },
                                        h,
                                      ),
                                    ],
                                  },
                                  h,
                                ),
                                h.div(
                                  [h.Class('grid grid-cols-3 gap-4')],
                                  [
                                    Field.field(
                                      {
                                        children: [
                                          Field.fieldLabel(
                                            {
                                              for: `${model.month.id}-button`,
                                              children: ['Month'],
                                            },
                                            h,
                                          ),
                                          Select.select(
                                            {
                                              model: model.month,
                                              maybeSelectedValue:
                                                model.maybeMonth,
                                              toParentMessage: message =>
                                                LabelPreviewMessage.GotMonthMessage(
                                                  {
                                                    message,
                                                  },
                                                ),
                                              items: labelMonths,
                                              itemToValue: item => item,
                                              itemToLabel: item => item,
                                              placeholder: 'MM',
                                              ariaLabel: 'Month',
                                              name: 'exp-month',
                                            },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                    Field.field(
                                      {
                                        children: [
                                          Field.fieldLabel(
                                            {
                                              for: `${model.year.id}-button`,
                                              children: ['Year'],
                                            },
                                            h,
                                          ),
                                          Select.select(
                                            {
                                              model: model.year,
                                              maybeSelectedValue:
                                                model.maybeYear,
                                              toParentMessage: message =>
                                                LabelPreviewMessage.GotYearMessage(
                                                  {
                                                    message,
                                                  },
                                                ),
                                              items: labelYears,
                                              itemToValue: item => item,
                                              itemToLabel: item => item,
                                              placeholder: 'YYYY',
                                              ariaLabel: 'Year',
                                              name: 'exp-year',
                                            },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                    Field.field(
                                      {
                                        children: [
                                          Field.fieldLabel(
                                            {
                                              for: 'checkout-cvv',
                                              children: ['CVV'],
                                            },
                                            h,
                                          ),
                                          Input.input(
                                            {
                                              id: 'checkout-cvv',
                                              value: model.cvv,
                                              onInput: value =>
                                                LabelPreviewMessage.ChangedCvv({
                                                  value,
                                                }),
                                              placeholder: '123',
                                              isRequired: true,
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
                        ],
                      },
                      h,
                    ),
                    Field.fieldSeparator({}, h),
                    Field.fieldSet(
                      {
                        children: [
                          Field.fieldLegend(
                            { children: ['Billing Address'] },
                            h,
                          ),
                          Field.fieldDescription(
                            {
                              children: [
                                'The billing address associated with your payment method',
                              ],
                            },
                            h,
                          ),
                          Field.fieldGroup(
                            {
                              children: [
                                Field.field(
                                  {
                                    orientation: 'horizontal',
                                    children: [
                                      Checkbox.checkbox(
                                        {
                                          id: 'checkout-same-as-shipping',
                                          isChecked: model.sameAsShipping,
                                          onToggle: isChecked =>
                                            LabelPreviewMessage.ToggledSameAsShipping(
                                              {
                                                isChecked,
                                              },
                                            ),
                                        },
                                        h,
                                      ),
                                      Field.fieldLabel(
                                        {
                                          id: 'checkout-same-as-shipping-label',
                                          for: 'checkout-same-as-shipping',
                                          children: [
                                            'Same as shipping address',
                                          ],
                                          class: 'font-normal',
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
                    Field.fieldSet(
                      {
                        children: [
                          Field.fieldGroup(
                            {
                              children: [
                                Field.field(
                                  {
                                    children: [
                                      Field.fieldLabel(
                                        {
                                          for: 'checkout-comments',
                                          children: ['Comments'],
                                        },
                                        h,
                                      ),
                                      Textarea.textarea(
                                        {
                                          id: 'checkout-comments',
                                          value: model.comments,
                                          onInput: value =>
                                            LabelPreviewMessage.ChangedComments(
                                              {
                                                value,
                                              },
                                            ),
                                          placeholder:
                                            'Add any additional comments',
                                          resize: 'none',
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
                    Field.field(
                      {
                        orientation: 'horizontal',
                        children: [
                          Button.button(
                            { type: 'submit', children: ['Submit'] },
                            h,
                          ),
                          Button.button(
                            { variant: 'outline', children: ['Cancel'] },
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
      )
  }
}

export const labelTailwindPreviewProgram = definePreviewProgram<
  LabelPreviewModel,
  LabelPreviewMessage
>({
  Model: LabelPreviewModel,
  Message: LabelPreviewMessage,
  init: index => ({
    _docsPage: 'label',
    acceptedTerms: false,
    name: '',
    cardNumber: '',
    cvv: '',
    comments: '',
    sameAsShipping: true,
    month: Select.init({
      id: `docs-label-${String(index)}-month`,
      isAnimated: true,
    }),
    maybeMonth: Option.none(),
    year: Select.init({
      id: `docs-label-${String(index)}-year`,
      isAnimated: true,
    }),
    maybeYear: Option.none(),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ToggledTerms':
        return {
          model: { ...model, acceptedTerms: message.isChecked },
          commands: [],
        }
      case 'ChangedName':
        return { model: { ...model, name: message.value }, commands: [] }
      case 'ChangedCardNumber':
        return { model: { ...model, cardNumber: message.value }, commands: [] }
      case 'ChangedCvv':
        return { model: { ...model, cvv: message.value }, commands: [] }
      case 'ChangedComments':
        return { model: { ...model, comments: message.value }, commands: [] }
      case 'ToggledSameAsShipping':
        return {
          model: { ...model, sameAsShipping: message.isChecked },
          commands: [],
        }
      case 'GotMonthMessage': {
        const {
          model: month,
          commands: monthCommands__,
          outMessage: monthOut__,
        } = Select.update(model.month, message.message)
        const maybeSelection = Option.fromNullishOr(monthOut__)
        const maybeMonth = Option.match(maybeSelection, {
          onNone: () => model.maybeMonth,
          onSome: selection =>
            selection._tag === 'Selected'
              ? Option.some(selection.value)
              : Option.none(),
        })
        const commands = monthCommands__ ?? []
        return {
          model: { ...model, month, maybeMonth },
          commands: Command.mapMessages(commands, next =>
            LabelPreviewMessage.GotMonthMessage({ message: next }),
          ),
        }
      }
      case 'GotYearMessage': {
        const {
          model: year,
          commands: yearCommands__,
          outMessage: yearOut__,
        } = Select.update(model.year, message.message)
        const maybeSelection = Option.fromNullishOr(yearOut__)
        const maybeYear = Option.match(maybeSelection, {
          onNone: () => model.maybeYear,
          onSome: selection =>
            selection._tag === 'Selected'
              ? Option.some(selection.value)
              : Option.none(),
        })
        const commands = yearCommands__ ?? []
        return {
          model: { ...model, year, maybeYear },
          commands: Command.mapMessages(commands, next =>
            LabelPreviewMessage.GotYearMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    labelView((labelFixtures[index] ?? labelFixtures[0]).kind, model, h),
})
