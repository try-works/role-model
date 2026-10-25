import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type NativeSelectKind =
  | 'demo'
  | 'groups'
  | 'disabled'
  | 'invalid'
  | 'rtl'

export interface NativeSelectFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: NativeSelectKind
}

export interface NativeSelectSpec {
  readonly placeholder: string
  readonly options: ReadonlyArray<{
    readonly value: string
    readonly label: string
  }>
  readonly groups?: ReadonlyArray<{
    readonly label: string
    readonly options: ReadonlyArray<{
      readonly value: string
      readonly label: string
    }>
  }>
  readonly isDisabled?: boolean
  readonly isInvalid?: boolean
  readonly direction?: 'ltr' | 'rtl'
}

const statusSpec: NativeSelectSpec = {
  placeholder: 'Select status',
  options: [
    { value: 'todo', label: 'Todo' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
}

export const nativeSelectSpecs: Record<NativeSelectKind, NativeSelectSpec> = {
  demo: statusSpec,
  groups: {
    placeholder: 'Select department',
    options: [],
    groups: [
      {
        label: 'Engineering',
        options: [
          { value: 'frontend', label: 'Frontend' },
          { value: 'backend', label: 'Backend' },
          { value: 'devops', label: 'DevOps' },
        ],
      },
      {
        label: 'Sales',
        options: [
          { value: 'sales-rep', label: 'Sales Rep' },
          { value: 'account-manager', label: 'Account Manager' },
          { value: 'sales-director', label: 'Sales Director' },
        ],
      },
      {
        label: 'Operations',
        options: [
          { value: 'support', label: 'Customer Support' },
          { value: 'product-manager', label: 'Product Manager' },
          { value: 'ops-manager', label: 'Operations Manager' },
        ],
      },
    ],
  },
  disabled: {
    placeholder: 'Disabled',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'blueberry', label: 'Blueberry' },
    ],
    isDisabled: true,
  },
  invalid: {
    placeholder: 'Error state',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'blueberry', label: 'Blueberry' },
    ],
    isInvalid: true,
  },
  rtl: {
    placeholder: 'اختر الحالة',
    options: [
      { value: 'todo', label: 'مهام' },
      { value: 'in-progress', label: 'قيد التنفيذ' },
      { value: 'done', label: 'منجز' },
      { value: 'cancelled', label: 'ملغي' },
    ],
    direction: 'rtl',
  },
}

export const nativeSelectFixtures: Readonly<
  [NativeSelectFixture, ...Array<NativeSelectFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Groups',
    description:
      'Use optgroups when category labels help users scan a longer menu.',
    kind: 'groups',
  },
  {
    title: 'Disabled',
    description:
      'Disable the control when the selection is not currently editable.',
    kind: 'disabled',
  },
  {
    title: 'Invalid',
    description:
      'Flag the control when the current selection fails validation.',
    kind: 'invalid',
  },
  {
    title: 'RTL',
    description: 'Render the control right-to-left with localized option text.',
    kind: 'rtl',
  },
]

const sq = (value: string): string => value.replaceAll("'", "\\'")

const emitBody = (fixture: NativeSelectFixture, isStyleX: boolean): string => {
  const spec = nativeSelectSpecs[fixture.kind]
  const options = spec.options
    .map(option => `{ value: '${option.value}', label: '${sq(option.label)}' }`)
    .join(', ')
  const groups = (spec.groups ?? [])
    .map(
      group =>
        `{ label: '${sq(group.label)}', options: [${group.options
          .map(
            option =>
              `{ value: '${option.value}', label: '${sq(option.label)}' }`,
          )
          .join(', ')}] }`,
    )
    .join(', ')
  const flags = `${spec.isDisabled === true ? '\n    isDisabled: true,' : ''}${spec.isInvalid === true ? '\n    isInvalid: true,' : ''}${spec.direction === undefined ? '' : `\n    direction: '${spec.direction}',`}`
  return `  NativeSelect.nativeSelect({
    id: 'native-select-example',
    value: model.value,
    onChange: value => Message.ChangedValue({ value }),
    options: [{ value: '', label: '${sq(spec.placeholder)}' }${options === '' ? '' : `, ${options}`}],${
      groups === ''
        ? ''
        : `
    groups: [${groups}],`
    }${flags}
  }, h)`
}

const emitApplication = (
  fixture: NativeSelectFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `Native Select — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as NativeSelect from '@/${isStyleX ? 'stylex' : 'ui'}/native-select'`,
    model: `export const Model = S.Struct({ value: S.String })
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  ChangedValue: { value: S.String },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { value: '' } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedValue':
      return { model: { ...model, value: message.value }, commands: [] }
  }
}`,
    view: `${isStyleX ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Native Select — ${sq(fixture.title)}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const nativeSelectExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  nativeSelectFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const nativeSelectExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, nativeSelectExamplesFor(renderer))
