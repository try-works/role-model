import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type TextareaKind =
  | 'demo'
  | 'field'
  | 'disabled'
  | 'invalid'
  | 'button'
  | 'rtl'
  | 'formResize'

export interface TextareaFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: TextareaKind
  readonly textareaIds: ReadonlyArray<string>
}

export const textareaFixtures: Readonly<
  [TextareaFixture, ...Array<TextareaFixture>]
> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'demo',
    textareaIds: ['textarea-demo'],
  },
  {
    title: 'Field',
    description: 'Compose the control with Field label and description.',
    kind: 'field',
    textareaIds: ['textarea-message'],
  },
  {
    title: 'Disabled',
    description:
      'Disabled state prevents editing without discarding controlled text.',
    kind: 'disabled',
    textareaIds: ['textarea-disabled'],
  },
  {
    title: 'Invalid',
    description: 'Pair invalid state with specific correction guidance.',
    kind: 'invalid',
    textareaIds: ['textarea-invalid'],
  },
  {
    title: 'Button',
    description: 'Submit the message with a Button below the control.',
    kind: 'button',
    textareaIds: ['textarea-button'],
  },
  {
    title: 'RTL',
    description:
      'Label, placeholder and description mirror in right-to-left contexts.',
    kind: 'rtl',
    textareaIds: ['feedback'],
  },
  {
    title: 'Form And Resize',
    description:
      'Associate multiline content with a native form and fix the resize policy.',
    kind: 'formResize',
    textareaIds: ['profile-notes'],
  },
]

const ta = (id: string, extra: string): string =>
  `Textarea.textarea({
      id: '${id}',
      value: model.values['${id}'] ?? '',
      onInput: value => Changed({ id: '${id}', value }),${extra}
    }, h)`

const emitBody = (fixture: TextareaFixture, isStyleX: boolean): string => {
  const wide = isStyleX
    ? 'layoutStyle: layoutStyle({ width: "100%", maxWidth: "20rem" })'
    : "class: 'w-full max-w-xs'"
  const stack = isStyleX ? 'className(styles.stack)' : "'grid w-full gap-2'"
  switch (fixture.kind) {
    case 'demo':
      return `  ${ta('textarea-demo', "\n      placeholder: 'Type your message here.',")}`
    case 'field':
      return `  Field.field({
    children: [
      Field.fieldLabel({
        for: 'textarea-message',
        children: ['Message'],
      }, h),
      Field.fieldDescription({
        children: ['Enter your message below.'],
      }, h),
      ${ta('textarea-message', "\n      placeholder: 'Type your message here.',")},
    ],
  }, h)`
    case 'disabled':
      return `  Field.field({
    isDisabled: true,
    children: [
      Field.fieldLabel({
        for: 'textarea-disabled',
        children: ['Message'],
      }, h),
      ${ta('textarea-disabled', "\n      placeholder: 'Type your message here.',\n      isDisabled: true,")},
    ],
  }, h)`
    case 'invalid':
      return `  Field.field({
    isInvalid: true,
    children: [
      Field.fieldLabel({
        for: 'textarea-invalid',
        children: ['Message'],
      }, h),
      ${ta('textarea-invalid', "\n      placeholder: 'Type your message here.',\n      isInvalid: true,")},
      Field.fieldDescription({
        children: ['Please enter a valid message.'],
      }, h),
    ],
  }, h)`
    case 'button':
      return `  h.div([h.Class(${stack})], [
    ${ta('textarea-button', "\n      placeholder: 'Type your message here.',")},
    Button.button({ children: ['Send message'] }, h),
  ])`
    case 'rtl':
      return `  Field.field({
    direction: 'rtl',
    ${wide},
    children: [
      Field.fieldLabel({
        for: 'feedback',
        children: ['التعليقات'],
      }, h),
      ${ta('feedback', "\n      placeholder: 'تعليقاتك تساعدنا على التحسين...',\n      direction: 'rtl',\n      rows: 4,")},
      Field.fieldDescription({
        children: ['شاركنا أفكارك حول خدمتنا.'],
      }, h),
    ],
  }, h)`
    case 'formResize':
      return `  h.div([h.Class(${isStyleX ? 'className(styles.stack)' : "'grid w-full max-w-md gap-2'"})], [
    h.form([h.Id('textarea-profile')], []),
    ${ta('profile-notes', "\n      label: 'Deployment notes',\n      name: 'notes',\n      form: 'textarea-profile',\n      rows: 5,\n      wrap: 'hard',\n      resize: 'none',\n      isReadOnly: true,")},
  ])`
  }
}

const emitImports = (fixture: TextareaFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts = [
    `import { Schema as S } from 'effect'`,
    `import { Command, Runtime, Subscription, Update } from 'foldkit'`,
    `import { type Document, type HtmlBuilder } from 'foldkit/html'`,
    `import { taggedStruct } from 'foldkit/schema'`,
  ]
  if (isStyleX) {
    parts.push(`import * as stylex from '@stylexjs/stylex'`)
  }
  if (fixture.kind === 'button') {
    parts.push(`import * as Button from '@/${base}/button'`)
  }
  if (
    fixture.kind === 'field' ||
    fixture.kind === 'disabled' ||
    fixture.kind === 'invalid' ||
    fixture.kind === 'rtl'
  ) {
    parts.push(`import * as Field from '@/${base}/field'`)
  }
  parts.push(`import * as Textarea from '@/${base}/textarea'`)
  if (isStyleX) {
    parts.push(
      `import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'`,
    )
  }
  return parts.join('\n')
}

const emitStyles = (fixture: TextareaFixture): string => {
  const lines: string[] = []
  if (fixture.kind === 'rtl') {
    lines.push(`  wide: { width: '100%', maxWidth: '20rem' },`)
  }
  if (fixture.kind === 'button') {
    lines.push(`  stack: { display: 'grid', width: '100%', gap: '0.5rem' },`)
  }
  if (fixture.kind === 'formResize') {
    lines.push(
      `  stack: { display: 'grid', width: '100%', maxWidth: '28rem', gap: '0.5rem' },`,
    )
  }
  return lines.join('\n')
}

const emitInit = (fixture: TextareaFixture): string => {
  const entries = fixture.textareaIds
    .map(
      id =>
        `'${id}': ${fixture.kind === 'formResize' ? "'First line\\nSecond line'" : "''"}`,
    )
    .join(', ')
  return `export const init = (): Update.Return<Model, Message> => ({ model: { values: { ${entries} } } })`
}

const emitApplication = (
  fixture: TextareaFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({\n${emitStyles(fixture)}\n})`
    : ''
  return foldkitApplication({
    title: `Textarea — ${fixture.title}`,
    imports: `${emitImports(fixture, isStyleX)}${stylesBlock}`,
    model: `export const Model = S.Struct({ values: S.Record(S.String, S.String) })
export type Model = typeof Model.Type`,
    messages: `export const Changed = taggedStruct('Changed', { id: S.String, value: S.String })
export const Message = S.Union([Changed])
export type Message = typeof Message.Type`,
    init: emitInit(fixture),
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'Changed':
      return {
        model: {
          values: { ...model.values, [message.id]: message.value },
        },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Textarea — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const textareaExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  textareaFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const textareaExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, textareaExamplesFor(renderer))
