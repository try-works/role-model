import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type InputKind =
  | 'basic'
  | 'field'
  | 'fieldGroup'
  | 'disabled'
  | 'invalid'
  | 'file'
  | 'inline'
  | 'grid'
  | 'required'
  | 'badge'
  | 'inputGroup'
  | 'buttonGroup'
  | 'form'
  | 'rtl'

export interface InputFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: InputKind
}

export const inputFixtures: Readonly<[InputFixture, ...Array<InputFixture>]> = [
  { title: 'Basic', heroOnly: true, kind: 'basic' },
  { title: 'Field', kind: 'field' },
  { title: 'Field Group', kind: 'fieldGroup' },
  { title: 'Disabled', kind: 'disabled' },
  { title: 'Invalid', kind: 'invalid' },
  { title: 'File', kind: 'file' },
  { title: 'Inline', kind: 'inline' },
  { title: 'Grid', kind: 'grid' },
  { title: 'Required', kind: 'required' },
  { title: 'Badge', kind: 'badge' },
  { title: 'Input Group', kind: 'inputGroup' },
  { title: 'Button Group', kind: 'buttonGroup' },
  { title: 'Form', kind: 'form' },
  { title: 'RTL', kind: 'rtl' },
]

export const inputCountries: ReadonlyArray<
  Readonly<{ value: string; label: string }>
> = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
]

export const inputRtlCopy = {
  label: 'مفتاح API',
  placeholder: 'sk-...',
  description: 'مفتاح API الخاص بك مشفر ومخزن بأمان.',
} as const

/* Text-field keys owned by each kind in the preview model. */
export const inputFieldKeys: Readonly<
  Record<InputKind, ReadonlyArray<string>>
> = {
  basic: ['basic'],
  field: ['username'],
  fieldGroup: ['name', 'email'],
  disabled: ['disabled'],
  invalid: ['invalid'],
  file: [],
  inline: ['search'],
  grid: ['firstName', 'lastName'],
  required: ['required'],
  badge: ['webhookUrl'],
  inputGroup: ['websiteUrl'],
  buttonGroup: ['searchButton'],
  form: ['formName', 'formEmail', 'formPhone', 'formAddress'],
  rtl: ['apiKey'],
}

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesField = (kind: InputKind): boolean => kind !== 'basic'
const kindUsesButton = (kind: InputKind): boolean =>
  kind === 'fieldGroup' ||
  kind === 'inline' ||
  kind === 'buttonGroup' ||
  kind === 'form'
const kindUsesSelect = (kind: InputKind): boolean => kind === 'form'

const emitImports = (fixture: InputFixture, isStyleX: boolean): string => {
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
  if (fixture.kind === 'badge') {
    parts.push(`import * as Badge from '@/${base}/badge'`)
  }
  if (fixture.kind === 'buttonGroup') {
    parts.push(`import * as ButtonGroup from '@/${base}/button-group'`)
  }
  if (kindUsesField(fixture.kind)) {
    parts.push(`import * as Field from '@/${base}/field'`)
  }
  if (fixture.kind === 'inputGroup') {
    parts.push(`import * as InputGroup from '@/${base}/input-group'`)
  }
  if (fixture.kind === 'file') {
    parts.push(`import * as FileInput from '@/${base}/file-input'`)
  }
  parts.push(`import * as Input from '@/${base}/input'`)
  if (kindUsesSelect(fixture.kind)) {
    parts.push(`import * as Select from '@/${base}/select'`)
  }
  if (fixture.kind === 'inputGroup') {
    parts.push("import * as Icon from '@/lib/icon'")
  }
  return parts.join('\n')
}

const emitStyles = (fixture: InputFixture): string => {
  const extras: Array<string> = [
    "  frame: { width: '100%', maxWidth: '24rem' },",
  ]
  if (fixture.kind === 'form') {
    extras.push("  form: { width: '100%', maxWidth: '24rem' },")
  }
  if (fixture.kind === 'grid') {
    extras.push(
      "  gridTwo: { display: 'grid', maxWidth: '24rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' },",
    )
  }
  if (fixture.kind === 'form') {
    extras.push(
      "  gridTwo: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' },",
    )
  }
  if (fixture.kind === 'badge') {
    extras.push("  push: { marginInlineStart: 'auto' },")
  }
  if (fixture.kind === 'required') {
    extras.push("  destructive: { color: 'var(--destructive)' },")
  }
  return `

const styles = stylex.create({
${extras.join('\n')}
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
})`
}

const emitModel = (fixture: InputFixture): string =>
  fixture.kind === 'file'
    ? `export const Model = S.Struct({
  picture: FileInput.Model,
  files: S.Array(S.Unknown),
})
export type Model = typeof Model.Type`
    : kindUsesSelect(fixture.kind)
      ? `export const Model = S.Struct({
  values: S.Record(S.String, S.String),
  country: Select.Model,
  maybeCountry: S.Option(S.String),
})
export type Model = typeof Model.Type`
      : `export const Model = S.Struct({ values: S.Record(S.String, S.String) })
export type Model = typeof Model.Type`

const emitMessages = (fixture: InputFixture): string =>
  fixture.kind === 'file'
    ? `export const Message = defineMessageUnion({
  GotFileInputMessage: { message: FileInput.Message },
})
export type Message = typeof Message.Type`
    : kindUsesSelect(fixture.kind)
      ? `export const Message = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
  GotSelectMessage: { message: Select.Message },
})
export type Message = typeof Message.Type`
      : `export const Message = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
})
export type Message = typeof Message.Type`

const emitInit = (fixture: InputFixture): string =>
  fixture.kind === 'file'
    ? `export const init = (): Update.Return<Model, Message> => ({
  model: { picture: FileInput.init({ id: 'picture' }), files: [] },
})`
    : kindUsesSelect(fixture.kind)
      ? `export const init = (): Update.Return<Model, Message> => ({
  model: {
    values: {},
    country: Select.init({ id: 'form-country' }),
    maybeCountry: Option.some('us'),
  },
})`
      : `export const init = (): Update.Return<Model, Message> => ({ model: { values: {} } })`

const emitUpdate = (fixture: InputFixture): string =>
  fixture.kind === 'file'
    ? `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotFileInputMessage': {
      const next = FileInput.update(model.picture, message.message)
      const files = next.outMessage === undefined
        ? model.files
        : next.outMessage._tag === 'ChangedValue'
          ? [...next.outMessage.files]
          : []
      return {
        model: { ...model, picture: next.model, files },
        commands: Command.mapMessages(next.commands ?? [], message =>
          Message.GotFileInputMessage({ message }),
        ),
      }
    }
  }
}`
    : kindUsesSelect(fixture.kind)
      ? `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedInputValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
    case 'GotSelectMessage': {
      const { model: country, commands: countryCommands__, outMessage } = Select.update(model.country, message.message)
      const commands = countryCommands__ ?? []
      const maybeCountry = Option.match(Option.fromNullishOr(outMessage), {
        onNone: () => model.maybeCountry,
        onSome: selection => (selection._tag === 'Selected' ? Option.some(selection.value) : Option.none<string>()),
      })
      return {
        model: { ...model, country, maybeCountry },
        commands: Command.mapMessages(commands, next => Message.GotSelectMessage({ message: next })),
      }
    }
  }
}`
      : `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedInputValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
  }
}`

const emitInput = (key: string, id: string, extras: string = ''): string =>
  `Input.input({
          id: '${id}',
          value: model.values['${key}'] ?? '',
          onInput: value => Message.ChangedInputValue({ field: '${key}', value }),${extras}
        }, h)`

const emitFieldRow = (lines: ReadonlyArray<string>): string =>
  `Field.field({
        children: [
${lines.map(line => `          ${line}`).join(',\n')}
        ],
      }, h)`

const emitBody = (fixture: InputFixture, isStyleX: boolean): string => {
  const label = (
    forId: string,
    text: string | null,
    children?: string,
  ): string =>
    `Field.fieldLabel({ for: '${forId}', children: [${children ?? `'${sq(text ?? '')}'`}] }, h)`
  const desc = (text: string): string =>
    `Field.fieldDescription({ children: ['${sq(text)}'] }, h)`
  const gridClass = isStyleX
    ? "stylex.props(styles.gridTwo).className ?? ''"
    : "'grid grid-cols-2 gap-4'"
  const pageClass = isStyleX
    ? "stylex.props(styles.page).className ?? ''"
    : "'flex min-h-screen items-center justify-center p-8'"

  switch (fixture.kind) {
    case 'basic':
      return `    ${emitInput('basic', 'input-basic', `\n          placeholder: 'Enter text',`)}`
    case 'field':
      return `    ${emitFieldRow([
        label('input-field-username', 'Username'),
        emitInput(
          'username',
          'input-field-username',
          `\n          type: 'text',\n          placeholder: 'Enter your username',`,
        ),
        desc('Choose a unique username for your account.'),
      ])}`
    case 'fieldGroup':
      return `    Field.fieldGroup({
        children: [
          Field.field({
            children: [
              ${label('fieldgroup-name', 'Name')},
              ${emitInput('name', 'fieldgroup-name', `\n          placeholder: 'Jordan Lee',`)},
            ],
          }, h),
          Field.field({
            children: [
              ${label('fieldgroup-email', 'Email')},
              ${emitInput('email', 'fieldgroup-email', `\n          type: 'email',\n          placeholder: 'name@example.com',`)},
              ${desc(`We'll send updates to this address.`)},
            ],
          }, h),
          Field.field({
            orientation: 'horizontal',
            children: [
              Button.button({ type: 'reset', variant: 'outline', children: ['Reset'] }, h),
              Button.button({ type: 'submit', children: ['Submit'] }, h),
            ],
          }, h),
        ],
      }, h)`
    case 'disabled':
      return `    ${emitFieldRow([
        label('input-demo-disabled', 'Email'),
        emitInput(
          'disabled',
          'input-demo-disabled',
          `\n          type: 'email',\n          placeholder: 'Email',\n          isDisabled: true,`,
        ),
        desc('This field is currently disabled.'),
      ])}`
    case 'invalid':
      return `    Field.field({
        isInvalid: true,
        children: [
          ${label('input-invalid', 'Invalid Input')},
          ${emitInput('invalid', 'input-invalid', `\n          placeholder: 'Error',\n          isInvalid: true,`)},
          ${desc('This field contains validation errors.')},
        ],
      }, h)`
    case 'file':
      return `    FileInput.fileInput({
      model: model.picture,
      toParentMessage: message => Message.GotFileInputMessage({ message }),
      id: model.picture.id,
      label: 'Picture',
      description: 'Select a picture to upload.',
      value: model.files as ReadonlyArray<File>,
    }, h)`
    case 'inline':
      return `    Field.field({
        orientation: 'horizontal',
        children: [
          ${emitInput('search', 'input-inline-search', `\n          type: 'search',\n          placeholder: 'Search...',`)},
          Button.button({ children: ['Search'] }, h),
        ],
      }, h)`
    case 'grid': {
      const gridFields = `Field.field({
            children: [
              ${label('first-name', 'First Name')},
              ${emitInput('firstName', 'first-name', `\n          placeholder: 'Jordan',`)},
            ],
          }, h),
          Field.field({
            children: [
              ${label('last-name', 'Last Name')},
              ${emitInput('lastName', 'last-name', `\n          placeholder: 'Lee',`)},
            ],
          }, h)`
      return isStyleX
        ? `    Field.fieldGroup({
        children: [
          h.div([h.Class(stylex.props(styles.gridTwo).className ?? '')], [
            ${gridFields},
          ]),
        ],
      }, h)`
        : `    Field.fieldGroup({
        class: 'grid max-w-sm grid-cols-2',
        children: [
          ${gridFields},
        ],
      }, h)`
    }
    case 'required':
      return `    ${emitFieldRow([
        label(
          'input-required',
          null,
          `'Required Field ', h.span([h.Class(${isStyleX ? "stylex.props(styles.destructive).className ?? ''" : "'text-destructive'"})], ['*'])`,
        ),
        emitInput(
          'required',
          'input-required',
          `\n          placeholder: 'This field is required',\n          isRequired: true,`,
        ),
        desc('This field must be filled out.'),
      ])}`
    case 'badge':
      return `    ${emitFieldRow([
        label(
          'input-badge',
          null,
          `'Webhook URL ', Badge.badge({ variant: 'secondary', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"}, children: ['Beta'] }, h)`,
        ),
        emitInput(
          'webhookUrl',
          'input-badge',
          `\n          type: 'url',\n          placeholder: 'https://api.example.com/webhook',`,
        ),
      ])}`
    case 'inputGroup':
      return `    ${emitFieldRow([
        label('input-group-url', 'Website URL'),
        `InputGroup.inputGroup({
          children: [
            InputGroup.inputGroupInput({
              id: 'input-group-url',
              value: model.values['websiteUrl'] ?? '',
              onInput: value => Message.ChangedInputValue({ field: 'websiteUrl', value }),
              placeholder: 'example.com',
            }, h),
            InputGroup.inputGroupAddon({ children: [InputGroup.inputGroupText({ children: ['https://'] }, h)] }, h),
            InputGroup.inputGroupAddon({ align: 'inline-end', children: [Icon.icon('info', {}, h)] }, h),
          ],
        }, h)`,
      ])}`
    case 'buttonGroup':
      return `    ${emitFieldRow([
        label('input-button-group', 'Search'),
        `ButtonGroup.buttonGroup({
          children: [
            ${emitInput('searchButton', 'input-button-group', `\n          placeholder: 'Type to search...',`)},
            Button.button({ variant: 'outline', children: ['Search'] }, h),
          ],
        }, h)`,
      ])}`
    case 'form':
      return `    h.form([h.Class(${isStyleX ? "stylex.props(styles.form).className ?? ''" : "'w-full max-w-sm'"})], [
      Field.fieldGroup({
        children: [
          Field.field({
            children: [
              ${label('form-name', 'Name')},
              ${emitInput('formName', 'form-name', `\n          type: 'text',\n          placeholder: 'Evil Rabbit',\n          isRequired: true,`)},
            ],
          }, h),
          Field.field({
            children: [
              ${label('form-email', 'Email')},
              ${emitInput('formEmail', 'form-email', `\n          type: 'email',\n          placeholder: 'john@example.com',`)},
              ${desc(`We'll never share your email with anyone.`)},
            ],
          }, h),
          h.div([h.Class(${gridClass})], [
            Field.field({
              children: [
                ${label('form-phone', 'Phone')},
                ${emitInput('formPhone', 'form-phone', `\n          type: 'tel',\n          placeholder: '+1 (555) 123-4567',`)},
              ],
            }, h),
            Field.field({
              children: [
                ${label('form-country', 'Country')},
                Select.select({
                  model: model.country,
                  maybeSelectedValue: model.maybeCountry,
                  toParentMessage: message => Message.GotSelectMessage({ message }),
                  items: COUNTRIES,
                  itemToValue: item => item.value,
                  itemToLabel: item => item.label,
                  ariaLabel: 'Country',
                }, h),
              ],
            }, h),
          ]),
          Field.field({
            children: [
              ${label('form-address', 'Address')},
              ${emitInput('formAddress', 'form-address', `\n          type: 'text',\n          placeholder: '123 Main St',`)},
            ],
          }, h),
          Field.field({
            orientation: 'horizontal',
            children: [
              Button.button({ type: 'button', variant: 'outline', children: ['Cancel'] }, h),
              Button.button({ type: 'submit', children: ['Submit'] }, h),
            ],
          }, h),
        ],
      }, h),
    ])`
    case 'rtl':
      return `    h.div([h.Dir('rtl')], [
      ${emitFieldRow([
        label('input-rtl-api-key', inputRtlCopy.label),
        emitInput(
          'apiKey',
          'input-rtl-api-key',
          `\n          type: 'password',\n          placeholder: '${inputRtlCopy.placeholder}',`,
        ),
        desc(inputRtlCopy.description),
      ])},
    ])`
  }
}

const emitApplication = (fixture: InputFixture, isStyleX: boolean): string => {
  const effectImports = kindUsesSelect(fixture.kind)
    ? "import { Option, Schema as S } from 'effect'"
    : "import { Schema as S } from 'effect'"
  const consts =
    fixture.kind === 'form'
      ? `

const COUNTRIES = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
]`
      : ''
  const pageClass =
    isStyleX && fixture.kind === 'form'
      ? "stylex.props(styles.page).className ?? ''"
      : isStyleX
        ? "stylex.props(styles.page).className ?? ''"
        : "'flex min-h-screen items-center justify-center p-8'"
  const frameClass = isStyleX
    ? "stylex.props(styles.frame).className ?? ''"
    : "'w-full max-w-sm'"
  return foldkitApplication({
    title: `Input — ${fixture.title}`,
    imports: `${effectImports}
${emitImports(fixture, isStyleX)}${isStyleX ? emitStyles(fixture) : ''}${consts}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Input — ${fixture.title}',
  body: h.main([h.Class(${pageClass})], [
    h.div([h.Class(${frameClass})], [
${emitBody(fixture, isStyleX)}
    ]),
  ]),
})`,
  })
}

const inputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  inputFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer !== 'tailwind'),
  }))

export const inputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, inputExamplesFor(renderer))
