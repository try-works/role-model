import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type InputOtpKind =
  | 'demo'
  | 'pattern'
  | 'separator'
  | 'disabled'
  | 'controlled'
  | 'invalid'
  | 'fourDigits'
  | 'alphanumeric'
  | 'form'
  | 'rtl'

export interface InputOtpFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: InputOtpKind
}

export const inputOtpFixtures: Readonly<
  [InputOtpFixture, ...Array<InputOtpFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Pattern',
    description: 'Restrict the code to digits only by passing a pattern.',
    kind: 'pattern',
  },
  {
    title: 'Separator',
    description:
      'Split the slots into visual groups without changing the value.',
    kind: 'separator',
  },
  { title: 'Disabled', kind: 'disabled' },
  {
    title: 'Controlled',
    description:
      'Keep the code in your own model to react as the value changes.',
    kind: 'controlled',
  },
  { title: 'Invalid', kind: 'invalid' },
  { title: 'Four Digits', kind: 'fourDigits' },
  { title: 'Alphanumeric', kind: 'alphanumeric' },
  { title: 'Form', kind: 'form' },
  { title: 'RTL', kind: 'rtl' },
]

/* Arabic copy, verbatim from upstream input-otp-rtl.tsx. */
export const inputOtpRtlCopy = {
  verificationCode: 'رمز التحقق',
} as const

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesField = (kind: InputOtpKind): boolean =>
  kind === 'pattern' || kind === 'form' || kind === 'rtl'
const kindUsesCard = (kind: InputOtpKind): boolean => kind === 'form'
const kindUsesButton = (kind: InputOtpKind): boolean => kind === 'form'
const kindUsesIcon = (kind: InputOtpKind): boolean => kind === 'form'

const emitImports = (fixture: InputOtpFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts: Array<string> = [
    "import { Command, Runtime, Subscription, Update } from 'foldkit'",
    "import { type Document, type HtmlBuilder } from 'foldkit/html'",
    "import { defineMessageUnion } from 'foldkit/message'",
  ]
  if (isStyleX) {
    parts.push(
      '',
      "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'",
    )
  }
  if (kindUsesButton(fixture.kind)) {
    parts.push(`import * as Button from '@/${base}/button'`)
  }
  if (kindUsesCard(fixture.kind)) {
    parts.push(`import * as Card from '@/${base}/card'`)
  }
  if (kindUsesField(fixture.kind)) {
    parts.push(`import * as Field from '@/${base}/field'`)
  }
  parts.push(`import * as InputOtp from '@/${base}/input-otp'`)
  if (kindUsesIcon(fixture.kind)) {
    parts.push("import * as Icon from '@/lib/icon'")
  }
  return parts.join('\n')
}

const emitStyles = (fixture: InputOtpFixture): string => {
  const extras: Array<string> = []
  if (fixture.kind === 'controlled') {
    extras.push("  stack: { display: 'grid', gap: '0.5rem' },")
    extras.push(
      "  status: { fontSize: '0.875rem', lineHeight: '1.25rem', textAlign: 'center' },",
    )
  }
  if (fixture.kind === 'form') {
    extras.push(
      "  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },",
    )
    extras.push("  submit: { width: '100%' },")
    extras.push(
      "  support: { fontSize: '0.875rem', lineHeight: '1.25rem', color: 'var(--muted-foreground)' },",
    )
    extras.push(
      "  link: { textDecorationLine: 'underline', textUnderlineOffset: '4px' },",
    )
    extras.push("  card: { marginInline: 'auto', maxWidth: '28rem' },")
    extras.push('  medium: { fontWeight: 500 },')
  }
  if (fixture.kind === 'pattern') {
    extras.push("  field: { width: 'fit-content' },")
  }
  if (fixture.kind === 'rtl') {
    extras.push("  field: { marginInline: 'auto', maxWidth: '20rem' },")
  }
  return extras.join('\n')
}

const emitModel = (): string => `export const Model = S.Struct({
  _docsPage: S.Literal('input-otp'),
  values: S.Record(S.String, S.String),
})
export type Model = typeof Model.Type`

const emitMessages = (): string => `export const Message = defineMessageUnion({
  ChangedOtpValue: { field: S.String, value: S.String },
})
export type Message = typeof Message.Type`

const emitInit = (fixture: InputOtpFixture): string => {
  const seeded: Array<string> = []
  if (fixture.kind === 'demo') seeded.push("basic: '123456'")
  if (fixture.kind === 'disabled') seeded.push("disabled: '123456'")
  if (fixture.kind === 'invalid') seeded.push("invalid: '000000'")
  if (fixture.kind === 'rtl') seeded.push("rtl: '123456'")
  const values = seeded.length === 0 ? '{}' : `{ ${seeded.join(', ')} }`
  return `export const init = (): Update.Return<Model, Message> => ({
  model: { _docsPage: 'input-otp', values: ${values} },
})`
}

const emitUpdate =
  (): string => `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedOtpValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
  }
}`

const emitOtp = (
  key: string,
  id: string,
  extras: string = '',
): string => `InputOtp.inputOtp({
        id: '${id}',
        value: model.values['${key}'] ?? '',
        onInput: value => Message.ChangedOtpValue({ field: '${key}', value }),${extras}
      }, h)`

const lbl = (id: string, text: string): string =>
  `Field.fieldLabel({ for: '${id}', children: ['${sq(text)}'] }, h)`
const dsc = (text: string): string =>
  `Field.fieldDescription({ children: ['${sq(text)}'] }, h)`

const separatorAfter = (indexes: ReadonlyArray<number>): string =>
  `separator: index => [${indexes.join(', ')}].includes(index)\n          ? InputOtp.inputOtpSeparator(h)\n          : h.span([], []),`

const emitBody = (fixture: InputOtpFixture, isStyleX: boolean): string => {
  const layout = (twClass: string, sxName: string): string =>
    isStyleX ? `layoutStyle: styles.${sxName}` : `class: '${twClass}'`
  const wrap = (twClass: string, sxName: string, inner: string): string =>
    isStyleX
      ? `h.div([h.Class(stylex.props(styles.${sxName}).className ?? '')], [\n        ${inner},\n      ])`
      : `h.div([h.Class('${twClass}')], [\n        ${inner},\n      ])`
  switch (fixture.kind) {
    case 'demo':
      return `    ${emitOtp('basic', 'otp-basic', `\n        ariaLabel: 'Verification code',`)}`
    case 'pattern':
      return `    Field.field({
      ${layout('w-fit', 'field')},
      children: [
        ${lbl('digits-only', 'Digits Only')},
        ${emitOtp('pattern', 'digits-only', `\n        pattern: /[0-9]/,\n        ariaLabel: 'Digits only code',`)},
      ],
    }, h)`
    case 'separator':
      return `    ${emitOtp('separator', 'otp-separator', `\n        ariaLabel: 'Grouped code',\n        ${separatorAfter([1, 3])}`)}`
    case 'disabled':
      return `    ${emitOtp('disabled', 'otp-disabled', `\n        isDisabled: true,\n        ariaLabel: 'Verification code',\n        ${separatorAfter([2])}`)}`
    case 'controlled':
      return `    ${wrap(
        'space-y-2',
        'stack',
        `${emitOtp('controlled', 'otp-controlled', `\n            ariaLabel: 'One-time password',`)},
      h.p([h.Class(${isStyleX ? "stylex.props(styles.status).className ?? ''" : "'text-center text-sm'"})], [
        model.values['controlled'] === undefined || model.values['controlled'] === ''
          ? 'Enter your one-time password.'
          : \`You entered: \${model.values['controlled'] ?? ''}\`,
      ])`,
      )}`
    case 'invalid':
      return `    ${emitOtp('invalid', 'otp-invalid', `\n        isInvalid: true,\n        ariaLabel: 'Verification code',\n        separator: index => [1, 3].includes(index)\n          ? ${isStyleX ? 'InputOtp.inputOtpSeparator(h)' : 'InputOtp.inputOtpSeparator(h)'}\n          : h.span([], []),`)}`
    case 'fourDigits':
      return `    ${emitOtp('fourDigits', 'otp-four-digits', `\n        length: 4,\n        pattern: /[0-9]/,\n        ariaLabel: 'Four digit code',`)}`
    case 'alphanumeric':
      return `    ${emitOtp('alphanumeric', 'otp-alphanumeric', `\n        pattern: /[A-Z0-9]/,\n        inputMode: 'text',\n        ariaLabel: 'Invite code',\n        ${separatorAfter([2])}`)}`
    case 'form': {
      const otpSlots = `InputOtp.inputOtp({
        id: 'otp-verification',
        value: model.values['form'] ?? '',
        onInput: value => Message.ChangedOtpValue({ field: 'form', value }),
        ariaLabel: 'Verification code',
        isRequired: true,
        ${isStyleX ? "slotSize: 'lg'" : "slotClass: 'h-12 w-11 text-xl'"},
        separator: index => index === 2
          ? ${isStyleX ? 'InputOtp.inputOtpSeparator(h)' : 'InputOtp.inputOtpSeparator(h)'}
          : h.span([], []),
      }, h)`
      const field = `Field.field({
          children: [
            h.div([h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex items-center justify-between'"})], [
              ${lbl('otp-verification', 'Verification code')},
              Button.button({
                variant: 'outline',
                size: 'xs',
                children: [Icon.icon('refresh-cw', {}, h), 'Resend Code'],
              }, h),
            ]),
            ${otpSlots},
            Field.fieldDescription({
              children: [
                h.a([h.Href('#')], ['I no longer have access to this email address.']),
              ],
            }, h),
          ],
        }, h)`
      const footerField = `Field.field({
          children: [
            Button.button({ type: 'submit', ${isStyleX ? 'layoutStyle: layoutStyle({ width: "100%" })' : "class: 'w-full'"}, children: ['Verify'] }, h),
            h.div([h.Class(${isStyleX ? "stylex.props(styles.support).className ?? ''" : "'text-sm text-muted-foreground'"})], [
              'Having trouble signing in? ',
              h.a([h.Href('#'), h.Class(${isStyleX ? "stylex.props(styles.link).className ?? ''" : "'underline underline-offset-4 transition-colors hover:text-primary'"})], ['Contact support']),
            ]),
          ],
        }, h)`
      return `    Card.card({
      ${layout('mx-auto max-w-md', 'card')},
      children: [
        Card.cardHeader({
          children: [
            Card.cardTitle({ children: ['Verify your login'] }, h),
            Card.cardDescription({
              children: [
                'Enter the verification code we sent to your email address: ',
                h.span([h.Class(${isStyleX ? "stylex.props(styles.medium).className ?? ''" : "'font-medium'"})], ['m@example.com']),
                '.',
              ],
            }, h),
          ],
        }, h),
        Card.cardContent({ children: [${field}] }, h),
        Card.cardFooter({ children: [${footerField}] }, h),
      ],
    }, h)`
    }
    case 'rtl': {
      const t = inputOtpRtlCopy
      const rtlField = `Field.field({
        ${layout('mx-auto max-w-xs', 'field')},
        children: [
          ${lbl('input-otp-rtl', t.verificationCode)},
          ${emitOtp('rtl', 'input-otp-rtl', `\n            ariaLabel: '${sq(t.verificationCode)}',`)},
        ],
      }, h)`
      return `    h.div([h.Dir('rtl'), h.Class('contents')], [
      ${rtlField},
    ])`
    }
  }
}

const emitApplication = (
  fixture: InputOtpFixture,
  isStyleX: boolean,
): string => {
  const stylesBlock = isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '1rem' },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
${emitStyles(fixture)}
})\n\n`
    : ''
  const bodyStart = isStyleX
    ? `h.main([h.Class(stylex.props(styles.page).className ?? '')], [`
    : `h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-4'"})], [`
  return foldkitApplication({
    title: `Input OTP — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'\n${emitImports(fixture, isStyleX)}\n\n${stylesBlock}`,
    model: emitModel(),
    messages: emitMessages(),
    init: emitInit(fixture),
    update: emitUpdate(),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Input OTP — ${sq(fixture.title)}',
  body: ${bodyStart}
    ${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const inputOtpExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  inputOtpFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer !== 'tailwind'),
  }))

export const inputOtpExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, inputOtpExamplesFor(renderer))
