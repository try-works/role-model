import * as S from 'effect/Schema'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  inputOtpFixtures,
  inputOtpRtlCopy,
  type InputOtpFixture,
} from '@/docs/components/pages/input-otp/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as Card from '@/ui/card'
import * as Field from '@/ui/field'
import * as InputOtp from '@/ui/input-otp'
import { defineMessageUnion } from 'foldkit/message'

const InputOtpPreviewModel = S.Struct({
  _docsPage: S.Literal('input-otp'),
  values: S.Record(S.String, S.String),
})
type InputOtpPreviewModel = typeof InputOtpPreviewModel.Type

const InputOtpPreviewMessage = defineMessageUnion({
  ChangedOtpValue: { field: S.String, value: S.String },
})
type InputOtpPreviewMessage = typeof InputOtpPreviewMessage.Type

const sep2 =
  <Msg>(h: HtmlBuilder<Msg>) =>
  (index: number) =>
    index === 2 ? InputOtp.inputOtpSeparator(h) : h.span([], [])
const sep13 =
  <Msg>(h: HtmlBuilder<Msg>) =>
  (index: number) =>
    index === 1 || index === 3 ? InputOtp.inputOtpSeparator(h) : h.span([], [])

const inputOtpView = (
  fixture: InputOtpFixture,
  model: InputOtpPreviewModel,
  h: HtmlBuilder<InputOtpPreviewMessage>,
): Html => {
  const otp = (
    key: string,
    id: string,
    extras: Partial<
      Parameters<typeof InputOtp.inputOtp<InputOtpPreviewMessage>>[0]
    > = {},
  ): Html =>
    InputOtp.inputOtp(
      {
        id,
        value: model.values[key] ?? '',
        onInput: value =>
          InputOtpPreviewMessage.ChangedOtpValue({ field: key, value }),
        ...extras,
      },
      h,
    )

  const lbl = (forId: string, text: string): Html =>
    Field.fieldLabel({ for: forId, children: [text] }, h)

  switch (fixture.kind) {
    case 'demo':
      return otp('basic', 'otp-basic', { ariaLabel: 'Verification code' })
    case 'pattern':
      return Field.field(
        {
          class: 'w-fit',
          children: [
            lbl('digits-only', 'Digits Only'),
            otp('pattern', 'digits-only', {
              pattern: /[0-9]/,
              ariaLabel: 'Digits only code',
            }),
          ],
        },
        h,
      )
    case 'separator':
      return otp('separator', 'otp-separator', {
        ariaLabel: 'Grouped code',
        separator: sep13(h),
      })
    case 'disabled':
      return otp('disabled', 'otp-disabled', {
        isDisabled: true,
        ariaLabel: 'Verification code',
        separator: sep2(h),
      })
    case 'controlled':
      return h.div(
        [h.Class('space-y-2')],
        [
          otp('controlled', 'otp-controlled', {
            ariaLabel: 'One-time password',
          }),
          h.p(
            [h.Class('text-center text-sm')],
            [
              model.values['controlled'] === undefined ||
              model.values['controlled'] === ''
                ? 'Enter your one-time password.'
                : `You entered: ${model.values['controlled'] ?? ''}`,
            ],
          ),
        ],
      )
    case 'invalid':
      return otp('invalid', 'otp-invalid', {
        isInvalid: true,
        ariaLabel: 'Verification code',
        separator: sep13(h),
      })
    case 'fourDigits':
      return otp('fourDigits', 'otp-four-digits', {
        length: 4,
        pattern: /[0-9]/,
        ariaLabel: 'Four digit code',
      })
    case 'alphanumeric':
      return otp('alphanumeric', 'otp-alphanumeric', {
        pattern: /[A-Z0-9]/,
        inputMode: 'text',
        ariaLabel: 'Invite code',
        separator: sep2(h),
      })
    case 'form':
      return Card.card(
        {
          class: 'mx-auto max-w-md',
          children: [
            Card.cardHeader(
              {
                children: [
                  Card.cardTitle({ children: ['Verify your login'] }, h),
                  Card.cardDescription(
                    {
                      children: [
                        'Enter the verification code we sent to your email address: ',
                        h.span([h.Class('font-medium')], ['m@example.com']),
                        '.',
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Card.cardContent(
              {
                children: [
                  Field.field(
                    {
                      children: [
                        h.div(
                          [h.Class('flex items-center justify-between')],
                          [
                            lbl('otp-verification', 'Verification code'),
                            Button.button(
                              {
                                variant: 'outline',
                                size: 'xs',
                                children: [
                                  Icon.icon('refresh-cw', {}, h),
                                  'Resend Code',
                                ],
                              },
                              h,
                            ),
                          ],
                        ),
                        otp('form', 'otp-verification', {
                          ariaLabel: 'Verification code',
                          isRequired: true,
                          slotClass: 'h-12 w-11 text-xl',
                          separator: sep2(h),
                        }),
                        Field.fieldDescription(
                          {
                            children: [
                              h.a(
                                [h.Href('#')],
                                [
                                  'I no longer have access to this email address.',
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
                ],
              },
              h,
            ),
            Card.cardFooter(
              {
                children: [
                  Field.field(
                    {
                      children: [
                        Button.button(
                          {
                            type: 'submit',
                            class: 'w-full',
                            children: ['Verify'],
                          },
                          h,
                        ),
                        h.div(
                          [h.Class('text-sm text-muted-foreground')],
                          [
                            'Having trouble signing in? ',
                            h.a(
                              [
                                h.Href('#'),
                                h.Class(
                                  'underline underline-offset-4 transition-colors hover:text-primary',
                                ),
                              ],
                              ['Contact support'],
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
          ],
        },
        h,
      )
    case 'rtl': {
      const t = inputOtpRtlCopy
      return h.div(
        [h.Dir('rtl'), h.Class('contents')],
        [
          Field.field(
            {
              class: 'mx-auto max-w-xs',
              children: [
                lbl('input-otp-rtl', t.verificationCode),
                otp('rtl', 'input-otp-rtl', { ariaLabel: t.verificationCode }),
              ],
            },
            h,
          ),
        ],
      )
    }
  }
}

export const inputOtpTailwindPreviewProgram = definePreviewProgram<
  InputOtpPreviewModel,
  InputOtpPreviewMessage
>({
  Model: InputOtpPreviewModel,
  Message: InputOtpPreviewMessage,
  init: index => ({
    _docsPage: 'input-otp',
    values: (() => {
      switch ((inputOtpFixtures[index] ?? inputOtpFixtures[0]).kind) {
        case 'demo':
          return { basic: '123456' }
        case 'disabled':
          return { disabled: '123456' }
        case 'invalid':
          return { invalid: '000000' }
        case 'rtl':
          return { rtl: '123456' }
        default:
          return {}
      }
    })(),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedOtpValue':
        return {
          model: {
            ...model,
            values: { ...model.values, [message.field]: message.value },
          },
        }
    }
  },
  view: (index, model, h) =>
    inputOtpView(inputOtpFixtures[index] ?? inputOtpFixtures[0], model, h),
})
