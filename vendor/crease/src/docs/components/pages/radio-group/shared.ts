import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export interface RadioGroupOptionSpec {
  readonly value: string
  readonly label: string
  readonly description?: string
  readonly isDisabled?: boolean
  readonly isInvalid?: boolean
}

export type RadioGroupKind = 'group' | 'fieldset'

export interface RadioGroupFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: RadioGroupKind
  readonly selected: string
  readonly ariaLabel: string
  readonly width: 'fit' | 'sm' | 'xs'
  readonly isReadOnly?: boolean
  readonly direction?: 'rtl'
  readonly fieldLegend?: string
  readonly fieldDescription?: string
  readonly options: ReadonlyArray<RadioGroupOptionSpec>
}

const densityOptions: ReadonlyArray<RadioGroupOptionSpec> = [
  {
    value: 'default',
    label: 'Default',
    description: 'Standard spacing for most use cases.',
  },
  {
    value: 'comfortable',
    label: 'Comfortable',
    description: 'More space between elements.',
  },
  {
    value: 'compact',
    label: 'Compact',
    description: 'Minimal spacing for dense layouts.',
  },
]

export const radioGroupFixtures: Readonly<
  [RadioGroupFixture, ...Array<RadioGroupFixture>]
> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'group',
    selected: 'comfortable',
    ariaLabel: 'Density',
    width: 'fit',
    options: densityOptions.map(({ value, label }) => ({ value, label })),
  },
  {
    title: 'Description',
    description:
      'Per-option descriptions explain the consequence of each choice.',
    kind: 'group',
    selected: 'comfortable',
    ariaLabel: 'Density',
    width: 'fit',
    options: densityOptions,
  },
  {
    title: 'Choice Card',
    description:
      'Carded rows with title and description for plan-style decisions.',
    kind: 'group',
    selected: 'plus',
    ariaLabel: 'Plan',
    width: 'sm',
    options: [
      {
        value: 'plus',
        label: 'Plus',
        description: 'For individuals and small teams.',
      },
      { value: 'pro', label: 'Pro', description: 'For growing businesses.' },
      {
        value: 'enterprise',
        label: 'Enterprise',
        description: 'For large teams and enterprises.',
      },
    ],
  },
  {
    title: 'Fieldset',
    description:
      'FieldSet legend and description give the group shared context.',
    kind: 'fieldset',
    selected: 'monthly',
    ariaLabel: 'Subscription Plan',
    width: 'xs',
    fieldLegend: 'Subscription Plan',
    fieldDescription: 'Yearly and lifetime plans offer significant savings.',
    options: [
      { value: 'monthly', label: 'Monthly ($9.99/month)' },
      { value: 'yearly', label: 'Yearly ($99.99/year)' },
      { value: 'lifetime', label: 'Lifetime ($299.99)' },
    ],
  },
  {
    title: 'Disabled',
    description: 'Disable only the options that are unavailable.',
    kind: 'group',
    selected: 'option2',
    ariaLabel: 'Options',
    width: 'fit',
    options: [
      { value: 'option1', label: 'Disabled', isDisabled: true },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  },
  {
    title: 'Invalid',
    description:
      'FieldSet validation state marks every option as needing correction.',
    kind: 'fieldset',
    selected: 'email',
    ariaLabel: 'Notification Preferences',
    width: 'xs',
    fieldLegend: 'Notification Preferences',
    fieldDescription: 'Choose how you want to receive notifications.',
    options: [
      { value: 'email', label: 'Email only', isInvalid: true },
      { value: 'sms', label: 'SMS only', isInvalid: true },
      { value: 'both', label: 'Both Email & SMS', isInvalid: true },
    ],
  },
  {
    title: 'Read Only',
    description:
      'Keep focus navigation while preventing the managed selection from changing.',
    kind: 'group',
    selected: 'comfortable',
    ariaLabel: 'Density',
    width: 'fit',
    isReadOnly: true,
    options: densityOptions.map(({ value, label }) => ({ value, label })),
  },
  {
    title: 'RTL',
    description: 'Direction mirrors label alignment in right-to-left contexts.',
    kind: 'group',
    selected: 'comfortable',
    ariaLabel: 'Density',
    width: 'fit',
    direction: 'rtl',
    options: [
      {
        value: 'default',
        label: 'افتراضي',
        description: 'تباعد قياسي لمعظم حالات الاستخدام.',
      },
      {
        value: 'comfortable',
        label: 'مريح',
        description: 'مساحة أكبر بين العناصر.',
      },
      {
        value: 'compact',
        label: 'مضغوط',
        description: 'تباعد أدنى للتخطيطات الكثيفة.',
      },
    ],
  },
]

const esc = (value: string): string => value.replace(/'/g, "\\'")

const optionLiteral = (option: RadioGroupOptionSpec): string =>
  `{ value: '${option.value}', label: '${esc(option.label)}'${
    option.description === undefined
      ? ''
      : `, description: '${esc(option.description)}'`
  }${option.isDisabled === true ? ', isDisabled: true' : ''}${
    option.isInvalid === true ? ', isInvalid: true' : ''
  } }`

const emitGroup = (
  fixture: RadioGroupFixture,
  isStyleX: boolean,
  indent: string,
): string => {
  const layout =
    fixture.width === 'fit'
      ? isStyleX
        ? '    layoutStyle: layoutStyle({ width: "fit-content" }),'
        : "    class: 'w-fit',"
      : isStyleX
        ? `    layoutStyle: layoutStyle({ width: '100%', maxWidth: '${fixture.width === 'xs' ? '20rem' : '24rem'}' }),`
        : "    class: 'w-full max-w-sm',"
  return `${indent}RadioGroup.radioGroup({
    model: model.radioGroup,
    selectedValue: Option.some(model.value),
    toParentMessage: message => Message['GotRadioGroupMessage']({ message }),
    ariaLabel: '${esc(fixture.ariaLabel)}',
${fixture.direction === 'rtl' ? "    direction: 'rtl',\n" : ''}${fixture.isReadOnly === true ? '    isReadOnly: true,\n' : ''}${layout}
    options: [
${fixture.options.map(option => `      ${optionLiteral(option)},`).join('\n')}
    ],
  }, h)`
}

const emitBody = (fixture: RadioGroupFixture, isStyleX: boolean): string => {
  if (fixture.kind === 'fieldset') {
    const fieldsetLayout = isStyleX
      ? `    layoutStyle: layoutStyle({ width: '100%', maxWidth: '${fixture.width === 'xs' ? '20rem' : '24rem'}' }),`
      : "    class: 'w-full max-w-xs',"
    return `  Field.fieldSet({
${fieldsetLayout}
    children: [
      Field.fieldLegend({
        children: ['${esc(fixture.fieldLegend ?? '')}'],
      }, h),
      Field.fieldDescription({
        children: ['${esc(fixture.fieldDescription ?? '')}'],
      }, h),
${emitGroup(fixture, isStyleX, '      ')},
    ],
  }, h)`
  }
  return emitGroup(fixture, isStyleX, '  ')
}

const emitApplication = (
  fixture: RadioGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const needsField = fixture.kind === 'fieldset'
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  fit: { width: 'fit-content' },
  wide: { width: '100%', maxWidth: '${fixture.width === 'xs' ? '20rem' : '24rem'}' },
})`
    : ''
  return foldkitApplication({
    title: `Radio Group — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${isStyleX ? "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'\n" : ''}${needsField ? `import * as Field from '@/${base}/field'\n` : ''}import * as RadioGroup from '@/${base}/radio-group'${stylesBlock}`,
    model: `export const Model = S.Struct({
  value: S.String,
  radioGroup: RadioGroup.Model,
})
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  GotRadioGroupMessage: { message: RadioGroup.Message },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    value: '${fixture.selected}',
    radioGroup: RadioGroup.init({ id: 'group' }),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  const radioGroupOp__ = RadioGroup.update(
    model.radioGroup,
    message.message,
  )
  const radioGroup = radioGroupOp__.model
  const commands = radioGroupOp__.commands ?? []
  const maybeSelection = Option.fromNullishOr(radioGroupOp__.outMessage)
  return {
    model: {
      ...model,
      radioGroup,
      value: Option.match(maybeSelection, {
        onNone: () => model.value,
        onSome: selection => selection.value,
      }),
    },
    commands: Command.mapMessages(commands, child =>
      Message['GotRadioGroupMessage']({ message: child })),
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Radio Group — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const radioGroupExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  radioGroupFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const radioGroupExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, radioGroupExamplesFor(renderer))
