import * as stylex from '@stylexjs/stylex'
import type { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import * as Button from '@/stylex/button'
import * as Checkbox from '@/stylex/checkbox'
import * as Field from '@/stylex/field'
import * as Input from '@/stylex/input'
import * as Label from '@/stylex/label'
import * as Select from '@/stylex/select'
import { className } from '@/stylex/style'
import * as Textarea from '@/stylex/textarea'
import {
  labelFixtures,
  labelMonths,
  labelRtlCopy,
  labelYears,
  type LabelKind,
} from './shared'

const styles = stylex.create({
  row: { gap: '0.5rem', display: 'flex' },
  wrapper: { maxWidth: '28rem', width: '100%' },
  formGrid: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
})

const sx = (style: stylex.StaticStyles): string => className(style)

interface LabelPreviewShape {
  readonly acceptedTerms: boolean
  readonly name: string
  readonly cardNumber: string
  readonly cvv: string
  readonly comments: string
  readonly sameAsShipping: boolean
  readonly month: Select.Model
  readonly maybeMonth: Option.Option<string>
  readonly year: Select.Model
  readonly maybeYear: Option.Option<string>
}

const labelSxView = <Msg>(
  kind: LabelKind,
  model: LabelPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const send = (tag: string, fields: Record<string, unknown>): Msg =>
    onMessageJson(JSON.stringify({ _tag: tag, ...fields }))
  switch (kind) {
    case 'demo':
      return h.div(
        [h.Class(sx(styles.row))],
        [
          Checkbox.checkbox(
            {
              id: 'terms',
              isChecked: model.acceptedTerms,
              onToggle: isChecked => send('ToggledTerms', { isChecked }),
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
        [h.Class(sx(styles.row)), h.Attribute('dir', 'rtl')],
        [
          Checkbox.checkbox(
            {
              id: 'terms-rtl',
              isChecked: model.acceptedTerms,
              onToggle: isChecked => send('ToggledTerms', { isChecked }),
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
        [h.Class(sx(styles.wrapper))],
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
                                            send('ChangedName', { value }),
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
                                            send('ChangedCardNumber', {
                                              value,
                                            }),
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
                                  [h.Class(sx(styles.formGrid))],
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
                                                onMessageJson(
                                                  JSON.stringify({
                                                    _tag: 'GotMonthMessage',
                                                    message,
                                                  }),
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
                                                onMessageJson(
                                                  JSON.stringify({
                                                    _tag: 'GotYearMessage',
                                                    message,
                                                  }),
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
                                                send('ChangedCvv', { value }),
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
                                            send('ToggledSameAsShipping', {
                                              isChecked,
                                            }),
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
                                          weight: 'normal',
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
                                            send('ChangedComments', { value }),
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

export const labelStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  labelSxView(
    (labelFixtures[exampleIndex] ?? labelFixtures[0]).kind,
    model as LabelPreviewShape,
    onMessageJson,
    h,
  )
