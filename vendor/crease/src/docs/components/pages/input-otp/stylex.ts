import { previewLayout } from '@/docs/components/preview-layout.stylex'
import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  inputOtpFixtures,
  inputOtpRtlCopy,
} from '@/docs/components/pages/input-otp/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/stylex/button'
import * as Card from '@/stylex/card'
import * as Field from '@/stylex/field'
import * as InputOtp from '@/stylex/input-otp'
import { className } from '@/stylex/style'

const styles = stylex.create({
  controlledOtp: { marginBottom: '0.5rem', minHeight: 0, minWidth: 0 },
  status: {
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textAlign: 'center',
    minHeight: 0,
    minWidth: 0,
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  submit: { width: '100%' },
  support: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  link: { textDecorationLine: 'underline', textUnderlineOffset: '4px' },
  card: { marginInline: 'auto', maxWidth: '28rem', width: 'fit-content' },
  medium: { fontWeight: 500 },
  fieldFit: { width: 'fit-content' },
  fieldRtl: { marginInline: 'auto', maxWidth: '20rem' },
})

interface InputOtpPreviewShape {
  readonly values: { readonly [key: string]: string }
}

export const inputOtpStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = inputOtpFixtures[index] ?? inputOtpFixtures[0]
  const m = model as InputOtpPreviewShape

  const changed = (field: string, value: string): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'ChangedOtpValue', field, value }))

  const otp = (
    key: string,
    id: string,
    extras: Partial<Parameters<typeof InputOtp.inputOtp<Msg>>[0]> = {},
  ): Html =>
    InputOtp.inputOtp(
      {
        id,
        value: m.values[key] ?? '',
        onInput: value => changed(key, value),
        ...extras,
      },
      h,
    )

  const lbl = (forId: string, text: string): Html =>
    Field.fieldLabel({ for: forId, children: [text] }, h)

  const sep2 = (index: number): Html =>
    index === 2 ? InputOtp.inputOtpSeparator(h) : h.span([], [])
  const sep13 = (index: number): Html =>
    index === 1 || index === 3 ? InputOtp.inputOtpSeparator(h) : h.span([], [])

  switch (fixture.kind) {
    case 'demo':
      return otp('basic', 'otp-basic', { ariaLabel: 'Verification code' })
    case 'pattern':
      return Field.field(
        {
          layoutStyle: styles.fieldFit,
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
        separator: sep13,
      })
    case 'disabled':
      return otp('disabled', 'otp-disabled', {
        isDisabled: true,
        ariaLabel: 'Verification code',
        separator: sep2,
      })
    case 'controlled':
      return h.div(
        [],
        [
          otp('controlled', 'otp-controlled', {
            ariaLabel: 'One-time password',
            layoutStyle: styles.controlledOtp,
          }),
          h.p(
            [h.Class(className(reset.text, styles.status))],
            [
              m.values['controlled'] === undefined ||
              m.values['controlled'] === ''
                ? 'Enter your one-time password.'
                : `You entered: ${m.values['controlled'] ?? ''}`,
            ],
          ),
        ],
      )
    case 'invalid':
      return otp('invalid', 'otp-invalid', {
        isInvalid: true,
        ariaLabel: 'Verification code',
        separator: sep13,
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
        separator: sep2,
      })
    case 'form':
      return Card.card(
        {
          layoutStyle: styles.card,
          children: [
            Card.cardHeader(
              {
                children: [
                  Card.cardTitle({ children: ['Verify your login'] }, h),
                  Card.cardDescription(
                    {
                      children: [
                        'Enter the verification code we sent to your email address: ',
                        h.span(
                          [h.Class(className(styles.medium))],
                          ['m@example.com'],
                        ),
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
                          [h.Class(className(styles.row))],
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
                          slotSize: 'lg',
                          separator: sep2,
                        }),
                        Field.fieldDescription(
                          {
                            children: [
                              h.a(
                                [
                                  h.Href('#'),
                                  h.Class(className(reset.link, styles.link)),
                                ],
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
                            layoutStyle: styles.submit,
                            children: ['Verify'],
                          },
                          h,
                        ),
                        h.div(
                          [h.Class(className(styles.support))],
                          [
                            'Having trouble signing in? ',
                            h.a(
                              [
                                h.Href('#'),
                                h.Class(className(reset.link, styles.link)),
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
        [h.Dir('rtl'), h.Class(className(previewLayout.contents))],
        [
          Field.field(
            {
              layoutStyle: styles.fieldRtl,
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
