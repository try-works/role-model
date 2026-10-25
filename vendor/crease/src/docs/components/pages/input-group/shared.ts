import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type InputGroupKind =
  | 'demo'
  | 'align'
  | 'icon'
  | 'text'
  | 'button'
  | 'kbd'
  | 'dropdown'
  | 'spinner'
  | 'textarea'
  | 'custom'
  | 'rtl'

export interface InputGroupFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: InputGroupKind
}

export const inputGroupFixtures: Readonly<
  [InputGroupFixture, ...Array<InputGroupFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Align',
    description:
      'Use the align prop on InputGroupAddon to position the addon relative to the input.',
    kind: 'align',
  },
  { title: 'Icon', kind: 'icon' },
  { title: 'Text', kind: 'text' },
  { title: 'Button', kind: 'button' },
  { title: 'Kbd', kind: 'kbd' },
  { title: 'Dropdown', kind: 'dropdown' },
  { title: 'Spinner', kind: 'spinner' },
  { title: 'Textarea', kind: 'textarea' },
  {
    title: 'Custom Input',
    description:
      'Add the data-slot="input-group-control" attribute to your custom input for automatic focus state handling.',
    kind: 'custom',
  },
  { title: 'RTL', kind: 'rtl' },
]

/* Arabic copy, verbatim from upstream input-group-rtl.tsx. */
export const inputGroupRtlCopy = {
  placeholder: 'بحث...',
  results: '١٢ نتيجة',
  searching: 'جاري البحث...',
  saving: 'جاري الحفظ...',
  savingChanges: 'جاري حفظ التغييرات...',
  textareaLabel: 'منطقة النص',
  textareaPlaceholder: 'اكتب تعليقًا...',
  characterCount: '٠/٢٨٠',
  post: 'نشر',
  textareaDescription: 'تذييل موضع أسفل منطقة النص.',
} as const

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesField = (kind: InputGroupKind): boolean =>
  kind === 'align' || kind === 'rtl'
const kindUsesPopover = (kind: InputGroupKind): boolean => kind === 'button'
const kindUsesDropdown = (kind: InputGroupKind): boolean => kind === 'dropdown'
const kindUsesSpinner = (kind: InputGroupKind): boolean =>
  kind === 'spinner' || kind === 'rtl'
const kindUsesKbd = (kind: InputGroupKind): boolean => kind === 'kbd'
const kindUsesTextarea = (kind: InputGroupKind): boolean =>
  kind === 'align' ||
  kind === 'text' ||
  kind === 'textarea' ||
  kind === 'custom' ||
  kind === 'rtl'
const kindUsesIcon = (kind: InputGroupKind): boolean =>
  kind === 'demo' ||
  kind === 'align' ||
  kind === 'icon' ||
  kind === 'button' ||
  kind === 'kbd' ||
  kind === 'dropdown' ||
  kind === 'textarea' ||
  kind === 'rtl'

const emitImports = (fixture: InputGroupFixture, isStyleX: boolean): string => {
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
  if (kindUsesDropdown(fixture.kind)) {
    parts.push(`import * as DropdownMenu from '@/${base}/dropdown-menu'`)
  }
  if (kindUsesField(fixture.kind)) {
    parts.push(`import * as Field from '@/${base}/field'`)
  }
  parts.push(`import * as InputGroup from '@/${base}/input-group'`)
  if (kindUsesKbd(fixture.kind)) {
    parts.push(`import * as Kbd from '@/${base}/kbd'`)
  }
  if (kindUsesPopover(fixture.kind)) {
    parts.push(`import * as Popover from '@/${base}/popover'`)
  }
  if (kindUsesSpinner(fixture.kind)) {
    parts.push(`import * as Spinner from '@/${base}/spinner'`)
  }
  if (kindUsesIcon(fixture.kind)) {
    parts.push("import * as Icon from '@/lib/icon'")
  }
  return parts.join('\n')
}

const emitStyles = (fixture: InputGroupFixture): string => {
  const extras: Array<string> = []
  if (
    fixture.kind === 'icon' ||
    fixture.kind === 'text' ||
    fixture.kind === 'button' ||
    fixture.kind === 'custom' ||
    fixture.kind === 'rtl'
  ) {
    extras.push(
      "  stack: { display: 'grid', width: '100%', maxWidth: '24rem', gap: '1.5rem' },",
    )
  }
  if (fixture.kind === 'dropdown' || fixture.kind === 'spinner') {
    extras.push(
      "  stack: { display: 'grid', width: '100%', maxWidth: '24rem', gap: '1rem' },",
    )
  }
  if (fixture.kind === 'textarea') {
    extras.push(
      "  stack: { display: 'grid', width: '100%', maxWidth: '28rem', gap: '1rem' },",
    )
  }
  if (fixture.kind === 'demo' || fixture.kind === 'kbd') {
    extras.push("  group: { maxWidth: '20rem' },")
  }
  if (fixture.kind === 'align') {
    extras.push(
      "  stack: { display: 'grid', width: '100%', maxWidth: '24rem', gap: '2.5rem' },",
      '  monoText: { fontFamily: \'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)\' },',
    )
  }
  if (fixture.kind === 'textarea') {
    extras.push("  codeArea: { minHeight: '200px' },")
  }
  if (fixture.kind === 'text') {
    extras.push("  textXs: { fontSize: '0.75rem', lineHeight: '1rem' },")
  }
  if (fixture.kind === 'button' || fixture.kind === 'custom') {
    extras.push("  push: { marginInlineStart: 'auto' },")
  }
  if (fixture.kind === 'align' || fixture.kind === 'textarea') {
    extras.push("  push: { marginInlineStart: 'auto' },")
  }
  if (fixture.kind === 'rtl') {
    extras.push("  push: { marginInlineStart: 'auto' },")
  }
  if (fixture.kind === 'button') {
    extras.push(
      "  iconButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: 'calc(var(--radius) - 5px)', color: 'var(--muted-foreground)' },",
      "  popoverContent: { display: 'flex', flexDirection: 'column', gap: '0.25rem', borderRadius: '0.75rem', fontSize: '0.875rem', lineHeight: '1.25rem' },",
      '  popoverTitle: { fontWeight: 500 },',
      "  favorite: { fill: 'var(--primary)', stroke: 'var(--primary)' },",
    )
  }

  if (fixture.kind === 'custom') {
    extras.push(
      "  customArea: { display: 'flex', fieldSizing: 'content', minHeight: '4rem', width: '100%', resize: 'none', borderRadius: '0.375rem', backgroundColor: 'transparent', paddingInline: '0.75rem', paddingBlock: '0.625rem', fontSize: '1rem', lineHeight: '1.5rem', outlineStyle: 'none' },",
    )
  }
  return `

const styles = stylex.create({
${extras.join('\n')}
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
})`
}

const emitModel = (fixture: InputGroupFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const Model = S.Struct({
  values: S.Record(S.String, S.String),
  dropdowns: S.Array(DropdownMenu.Model),
})
export type Model = typeof Model.Type`
  }
  if (kindUsesPopover(fixture.kind)) {
    return `export const Model = S.Struct({
  values: S.Record(S.String, S.String),
  popover: Popover.Model,
  isFavorite: S.Boolean,
  isCopied: S.Boolean,
})
export type Model = typeof Model.Type`
  }
  if (fixture.kind === 'align') {
    return `export const Model = S.Struct({
  values: S.Record(S.String, S.String),
  isPasswordShown: S.Boolean,
  isCopied: S.Boolean,
})
export type Model = typeof Model.Type`
  }
  return `export const Model = S.Struct({ values: S.Record(S.String, S.String) })
export type Model = typeof Model.Type`
}

const emitMessages = (fixture: InputGroupFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const Message = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
  GotDropdownMessage: { index: S.Number, message: DropdownMenu.Message },
})
export type Message = typeof Message.Type`
  }
  if (kindUsesPopover(fixture.kind)) {
    return `export const Message = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
  GotPopoverMessage: { message: Popover.Message },
  ClickedFavorite: {},
  ClickedCopy: {},
  CompletedCopy: {},
  CompletedWaitBeforeClearingCopy: {},
})
export type Message = typeof Message.Type`
  }
  if (fixture.kind === 'align') {
    return `export const Message = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
  ClickedShowPassword: {},
  ClickedCopy: { text: S.String },
  CompletedCopy: {},
  CompletedWaitBeforeClearingCopy: {},
})
export type Message = typeof Message.Type`
  }
  return `export const Message = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
})
export type Message = typeof Message.Type`
}

const emitInit = (fixture: InputGroupFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const init = (): Update.Return<Model, Message> => ({
  model: {
    values: {},
    dropdowns: [
      DropdownMenu.init({ id: 'file-menu', isAnimated: false }),
      DropdownMenu.init({ id: 'search-menu', isAnimated: false }),
    ],
  },
})`
  }
  if (kindUsesPopover(fixture.kind)) {
    return `export const init = (): Update.Return<Model, Message> => ({
  model: {
    values: { copyUrl: 'https://creaseui.com' },
    popover: Popover.init({ id: 'secure-info', isAnimated: false }),
    isFavorite: false,
    isCopied: false,
  },
})`
  }
  if (fixture.kind === 'align') {
    return `export const init = (): Update.Return<Model, Message> => ({
  model: { values: {}, isPasswordShown: false, isCopied: false },
})`
  }
  return `export const init = (): Update.Return<Model, Message> => ({ model: { values: {} } })`
}

const emitUpdate = (fixture: InputGroupFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedInputValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
    case 'GotDropdownMessage': {
      const target = model.dropdowns[message.index]
      if (target === undefined) return { model }
      const { model: dropdown, commands: dropdownCommands__ } = DropdownMenu.update(target, message.message)
      const commands = dropdownCommands__ ?? []
      return {
        model: {
          ...model,
          dropdowns: model.dropdowns.map((entry, entryIndex) => (entryIndex === message.index ? dropdown : entry)),
        },
        commands: Command.mapMessages(commands, next => Message.GotDropdownMessage({ index: message.index, message: next })),
      }
    }
  }
}`
  }
  if (kindUsesPopover(fixture.kind)) {
    return `const CopyUrl = Command.define('CopyDocsUrl', {
  messages: [Message.CompletedCopy],
  execute: Effect.promise(() =>
    navigator.clipboard.writeText('https://creaseui.com').catch(() => {}),
  ).pipe(Effect.as(Message.CompletedCopy())),
})
const WaitBeforeClearingCopy = Command.define('WaitBeforeClearingCopyFeedback', {
  messages: [Message.CompletedWaitBeforeClearingCopy],
  execute: Effect.sleep('1800 millis').pipe(
    Effect.as(Message.CompletedWaitBeforeClearingCopy()),
  ),
})

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedInputValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
    case 'GotPopoverMessage': {
      const { model: popover, commands: popoverCommands__ } = Popover.update(model.popover, message.message)
      const commands = popoverCommands__ ?? []
      return {
        model: { ...model, popover },
        commands: Command.mapMessages(commands, next => Message.GotPopoverMessage({ message: next })),
      }
    }
    case 'ClickedFavorite':
      return { model: { ...model, isFavorite: !model.isFavorite } }
    case 'ClickedCopy':
      return { model, commands: [CopyUrl()] }
    case 'CompletedCopy':
      return { model: { ...model, isCopied: true }, commands: [WaitBeforeClearingCopy()] }
    case 'CompletedWaitBeforeClearingCopy':
      return { model: { ...model, isCopied: false } }
  }
}`
  }
  if (fixture.kind === 'align') {
    return `const CopyText = Command.define('CopyText', {
  args: { text: S.String },
  messages: [Message.CompletedCopy],
  execute: ({ text }) =>
    Effect.promise(() => navigator.clipboard.writeText(text).catch(() => {})).pipe(
      Effect.as(Message.CompletedCopy()),
    ),
})
const WaitBeforeClearingCopy = Command.define('WaitBeforeClearingCopy', {
  messages: [Message.CompletedWaitBeforeClearingCopy],
  execute: Effect.sleep('1800 millis').pipe(
    Effect.as(Message.CompletedWaitBeforeClearingCopy()),
  ),
})

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedInputValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
    case 'ClickedShowPassword':
      return { model: { ...model, isPasswordShown: !model.isPasswordShown } }
    case 'ClickedCopy':
      return { model, commands: [CopyText({ text: message.text })] }
    case 'CompletedCopy':
      return { model: { ...model, isCopied: true }, commands: [WaitBeforeClearingCopy()] }
    case 'CompletedWaitBeforeClearingCopy':
      return { model: { ...model, isCopied: false } }
  }
}`
  }
  return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedInputValue':
      return { model: { ...model, values: { ...model.values, [message.field]: message.value } } }
  }
}`
}

/* Emitted builders shared across kinds. */
const emitInput = (key: string, id: string, extras: string = ''): string =>
  `InputGroup.inputGroupInput({
        id: '${id}',
        value: model.values['${key}'] ?? '',
        onInput: value => Message.ChangedInputValue({ field: '${key}', value }),${extras}
      }, h)`

const emitTextarea = (key: string, id: string, extras: string = ''): string =>
  `InputGroup.inputGroupTextarea({
        id: '${id}',
        value: model.values['${key}'] ?? '',
        onInput: value => Message.ChangedInputValue({ field: '${key}', value }),${extras}
      }, h)`

const wrapStack = (
  isStyleX: boolean,
  gap: 'grid max-w' | string,
  children: ReadonlyArray<string>,
): string =>
  isStyleX
    ? `h.div([h.Class(stylex.props(styles.stack).className ?? '')], [
${children.map(child => `      ${child}`).join(',\n')},
    ])`
    : `h.div([h.Class('${gap}')], [
${children.map(child => `      ${child}`).join(',\n')},
    ])`

const emitBody = (fixture: InputGroupFixture, isStyleX: boolean): string => {
  const label = (forId: string, text: string): string =>
    `Field.fieldLabel({ for: '${forId}', children: ['${sq(text)}'] }, h)`
  const desc = (text: string): string =>
    `Field.fieldDescription({ children: ['${sq(text)}'] }, h)`
  const wrap = (cls: string, sxStyle: string): string =>
    isStyleX ? `stylex.props(${sxStyle}).className ?? ''` : `'${cls}'`

  switch (fixture.kind) {
    case 'demo':
      return `    InputGroup.inputGroup({
      ${isStyleX ? 'layoutStyle: layoutStyle({ maxWidth: "20rem" })' : "class: 'max-w-xs'"},
      children: [
        ${emitInput('demo', 'input-group-demo', "\n        placeholder: 'Search...',")},
        InputGroup.inputGroupAddon({
          children: [Icon.icon('search', {}, h)],
        }, h),
        InputGroup.inputGroupAddon({ align: 'inline-end', children: ['12 results'] }, h),
      ],
    }, h)`
    case 'align': {
      const inlineStart = `Field.field({
          children: [
            ${label('inline-start-input', 'Input')},
            InputGroup.inputGroup({
              children: [
                ${emitInput('alignStart', 'inline-start-input', "\n              placeholder: 'Search...',")},
                InputGroup.inputGroupAddon({
                  align: 'inline-start',
                  children: [Icon.icon('search', {}, h)],
                }, h),
              ],
            }, h),
            ${desc('Icon positioned at the start.')},
          ],
        }, h)`
      const inlineEnd = `Field.field({
          children: [
            ${label('inline-end-input', 'Input')},
            InputGroup.inputGroup({
              children: [
                InputGroup.inputGroupInput({
                  id: 'inline-end-input',
                  value: model.values['alignEnd'] ?? '',
                  onInput: value => Message.ChangedInputValue({ field: 'alignEnd', value }),
                  type: model.isPasswordShown ? 'text' : 'password',
                  placeholder: 'Enter password',
                }, h),
                InputGroup.inputGroupAddon({
                  align: 'inline-end',
                  children: [
                    InputGroup.inputGroupButton({
                      size: 'icon-xs',
                      ariaLabel: model.isPasswordShown ? 'Hide password' : 'Show password',
                      onClick: Message.ClickedShowPassword(),
                      children: [Icon.icon(model.isPasswordShown ? 'eye' : 'eye-off', {}, h)],
                    }, h),
                  ],
                }, h),
              ],
            }, h),
            ${desc('Icon positioned at the end.')},
          ],
        }, h)`
      const blockStart = `Field.fieldGroup({
          children: [
            Field.field({
              children: [
                ${label('block-start-input', 'Input')},
                InputGroup.inputGroup({
                  children: [
                    ${emitInput('alignBlockInput', 'block-start-input', "\n                  placeholder: 'Enter your name',")},
                    InputGroup.inputGroupAddon({
                      align: 'block-start',
                      children: [InputGroup.inputGroupText({ children: ['Full Name'] }, h)],
                    }, h),
                  ],
                }, h),
                ${desc('Header positioned above the input.')},
              ],
            }, h),
            Field.field({
              children: [
                ${label('block-start-textarea', 'Textarea')},
                InputGroup.inputGroup({
                  children: [
                    ${emitTextarea('alignBlockTextarea', 'block-start-textarea', `\n                  placeholder: "console.log('Hello, world!');",${isStyleX ? '\n                  mono: true,' : "\n                  class: 'font-mono text-sm',"}`)},
                    InputGroup.inputGroupAddon({
                      align: 'block-start',
                      children: [
                        Icon.icon('file-code', {}, h),
                        InputGroup.inputGroupText({ children: [${isStyleX ? "h.span([h.Class(stylex.props(styles.monoText).className ?? '')], ['script.js'])" : "h.span([h.Class('font-mono')], ['script.js'])"}] }, h),
                        InputGroup.inputGroupButton({
                          size: 'icon-xs',
                          ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"},
                          ariaLabel: 'Copy',
                          onClick: Message.ClickedCopy({ text: model.values['alignBlockTextarea'] ?? '' }),
                          children: [Icon.icon(model.isCopied ? 'check' : 'copy', {}, h)],
                        }, h),
                      ],
                    }, h),
                  ],
                }, h),
                ${desc('Header positioned above the textarea.')},
              ],
            }, h),
          ],
        }, h)`
      const blockEnd = `Field.fieldGroup({
          children: [
            Field.field({
              children: [
                ${label('block-end-input', 'Input')},
                InputGroup.inputGroup({
                  children: [
                    ${emitInput('alignBlockEndInput', 'block-end-input', "\n                  placeholder: 'Enter amount',")},
                    InputGroup.inputGroupAddon({
                      align: 'block-end',
                      children: [InputGroup.inputGroupText({ children: ['USD'] }, h)],
                    }, h),
                  ],
                }, h),
                ${desc('Footer positioned below the input.')},
              ],
            }, h),
            Field.field({
              children: [
                ${label('block-end-textarea', 'Textarea')},
                InputGroup.inputGroup({
                  children: [
                    ${emitTextarea('alignBlockEndTextarea', 'block-end-textarea', "\n                  placeholder: 'Write a comment...',")},
                    InputGroup.inputGroupAddon({
                      align: 'block-end',
                      children: [
                        InputGroup.inputGroupText({ children: ['0/280'] }, h),
                        InputGroup.inputGroupButton({ variant: 'default', size: 'sm', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"}, children: ['Post'] }, h),
                      ],
                    }, h),
                  ],
                }, h),
                ${desc('Footer positioned below the textarea.')},
              ],
            }, h),
          ],
        }, h)`
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-10', [inlineStart, inlineEnd, blockStart, blockEnd])}`
    }
    case 'icon': {
      const search = `InputGroup.inputGroup({
          children: [
            ${emitInput('iconSearch', 'icon-search', "\n            placeholder: 'Search...',")},
            InputGroup.inputGroupAddon({ children: [Icon.icon('search', {}, h)] }, h),
          ],
        }, h)`
      const mail = `InputGroup.inputGroup({
          children: [
            ${emitInput('iconEmail', 'icon-email', "\n            type: 'email',\n            placeholder: 'Enter your email',")},
            InputGroup.inputGroupAddon({ children: [Icon.icon('mail', {}, h)] }, h),
          ],
        }, h)`
      const card = `InputGroup.inputGroup({
          children: [
            ${emitInput('iconCard', 'icon-card', "\n            placeholder: 'Card number',")},
            InputGroup.inputGroupAddon({ children: [Icon.icon('credit-card', {}, h)] }, h),
            InputGroup.inputGroupAddon({ align: 'inline-end', children: [Icon.icon('check', {}, h)] }, h),
          ],
        }, h)`
      const cardEnd = `InputGroup.inputGroup({
          children: [
            ${emitInput('iconCardStar', 'icon-card-star', "\n            placeholder: 'Card number',")},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [Icon.icon('star', {}, h), Icon.icon('info', {}, h)],
            }, h),
          ],
        }, h)`
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-6', [search, mail, card, cardEnd])}`
    }
    case 'text': {
      const amount = `InputGroup.inputGroup({
          children: [
            InputGroup.inputGroupAddon({ children: [InputGroup.inputGroupText({ children: ['$'] }, h)] }, h),
            ${emitInput('textAmount', 'text-amount', "\n            placeholder: '0.00',")},
            InputGroup.inputGroupAddon({ align: 'inline-end', children: [InputGroup.inputGroupText({ children: ['USD'] }, h)] }, h),
          ],
        }, h)`
      const domain = `InputGroup.inputGroup({
          children: [
            InputGroup.inputGroupAddon({ children: [InputGroup.inputGroupText({ children: ['https://'] }, h)] }, h),
            ${emitInput('textDomain', 'text-domain', "\n            placeholder: 'example.com',")},
            InputGroup.inputGroupAddon({ align: 'inline-end', children: [InputGroup.inputGroupText({ children: ['.com'] }, h)] }, h),
          ],
        }, h)`
      const username = `InputGroup.inputGroup({
          children: [
            ${emitInput('textUsername', 'text-username', "\n            placeholder: 'Enter your username',")},
            InputGroup.inputGroupAddon({ align: 'inline-end', children: [InputGroup.inputGroupText({ children: ['@company.com'] }, h)] }, h),
          ],
        }, h)`
      const message = `InputGroup.inputGroup({
          children: [
            ${emitTextarea('textMessage', 'text-message', "\n            placeholder: 'Enter your message',")},
            InputGroup.inputGroupAddon({
              align: 'block-end',
              children: [InputGroup.inputGroupText({ children: [h.span([h.Class(${wrap('text-xs text-muted-foreground', 'styles.textXs')})], ['120 characters left'])] }, h)],
            }, h),
          ],
        }, h)`
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-6', [amount, domain, username, message])}`
    }
    case 'button': {
      const copyGroup = `InputGroup.inputGroup({
          children: [
            ${emitInput('buttonCopy', 'button-copy', "\n            placeholder: 'https://creaseui.com',")},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [
                InputGroup.inputGroupButton({
                  size: 'icon-xs',
                  ariaLabel: 'Copy',
                  onClick: Message.ClickedCopy(),
                  children: [model.isCopied ? Icon.icon('check', {}, h) : Icon.icon('copy', {}, h)],
                }, h),
              ],
            }, h),
          ],
        }, h)`
      const secureGroup = `InputGroup.inputGroup({
          ${isStyleX ? "radius: 'full'" : "radius: 'full'"},
          children: [
            Popover.popover({
              model: model.popover,
              toParentMessage: message => Message.GotPopoverMessage({ message }),
              ${
                isStyleX
                  ? "trigger: h.span([h.Class(stylex.props(styles.iconButton).className ?? '')], [Icon.icon('info', {}, h)]),"
                  : "trigger: Icon.icon('info', {}, h),\n              triggerClass: 'flex size-6 items-center justify-center rounded-[calc(var(--radius)-5px)] text-muted-foreground hover:bg-accent/50',"
              }
              align: 'start',
              content: h.div([h.Class(${isStyleX ? "stylex.props(styles.popoverContent).className ?? ''" : "'flex flex-col gap-1 text-sm'"})], [
                h.p([h.Class(${isStyleX ? "stylex.props(styles.popoverTitle).className ?? ''" : "'font-medium'"})], ['Your connection is not secure.']),
                h.p([], ['You should not enter any sensitive information on this site.']),
              ]),
            }, h),
            InputGroup.inputGroupAddon({ children: ['https://'] }, h),
            ${emitInput('buttonSecure', 'button-secure', '')},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [
                InputGroup.inputGroupButton({
                  size: 'icon-xs',
                  onClick: Message.ClickedFavorite(),
                  children: [Icon.icon('star', { ${isStyleX ? "class: model.isFavorite ? stylex.props(styles.favorite).className ?? '' : ''" : "class: model.isFavorite ? 'fill-primary stroke-primary' : ''"} }, h)],
                }, h),
              ],
            }, h),
          ],
        }, h)`
      const searchGroup = `InputGroup.inputGroup({
          children: [
            ${emitInput('buttonSearch', 'button-search', "\n            placeholder: 'Type to search...',")},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [InputGroup.inputGroupButton({ variant: 'secondary', children: ['Search'] }, h)],
            }, h),
          ],
        }, h)`
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-6', [copyGroup, secureGroup, searchGroup])}`
    }
    case 'kbd':
      return `    InputGroup.inputGroup({
      ${isStyleX ? 'layoutStyle: layoutStyle({ maxWidth: "20rem" })' : "class: 'max-w-sm'"},
      children: [
        ${emitInput('kbd', 'kbd-search', "\n        placeholder: 'Search...',")},
        InputGroup.inputGroupAddon({ children: [Icon.icon('search', {}, h)] }, h),
        InputGroup.inputGroupAddon({ align: 'inline-end', children: [Kbd.kbd({ children: ['⌘K'] }, h)] }, h),
      ],
    }, h)`
    case 'dropdown': {
      const iconTriggerProps = isStyleX
        ? "triggerButtonVariant: 'ghost',\n                  triggerButtonSize: 'icon-xs',"
        : "triggerClass: 'flex size-6 items-center justify-center rounded-[calc(var(--radius)-5px)] text-muted-foreground hover:bg-accent/50',"
      const textTriggerProps = isStyleX
        ? "triggerButtonVariant: 'ghost',\n                  triggerButtonSize: 'xs',"
        : "triggerClass: 'flex h-6 items-center gap-1 rounded-[calc(var(--radius)-5px)] px-1.5 text-xs text-muted-foreground hover:bg-accent/50',"
      const fileGroup = `InputGroup.inputGroup({
          children: [
            ${emitInput('dropdownFile', 'dropdown-file', "\n            placeholder: 'Enter file name',")},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [
                DropdownMenu.dropdownMenu({
                  model: model.dropdowns[0]!,
                  toParentMessage: message => Message.GotDropdownMessage({ index: 0, message }),
                  trigger: Icon.icon('ellipsis', { ariaLabel: 'More' }, h),
                  ${iconTriggerProps}
                  triggerAriaLabel: 'More',
                  align: 'end',
                  items: FILE_MENU_ITEMS,
                  itemToConfig: item => ({ label: item }),
                }, h),
              ],
            }, h),
          ],
        }, h)`
      const queryGroup = `InputGroup.inputGroup({
          ${isStyleX ? "radius: 'xl'" : "radius: 'xl'"},
          children: [
            ${emitInput('dropdownQuery', 'dropdown-query', "\n            placeholder: 'Enter search query',")},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [
                DropdownMenu.dropdownMenu({
                  model: model.dropdowns[1]!,
                  toParentMessage: message => Message.GotDropdownMessage({ index: 1, message }),
                  trigger: h.span([], ['Search In...', Icon.icon('chevron-down', {}, h)]),
                  ${textTriggerProps}
                  triggerAriaLabel: 'Search in',
                  align: 'end',
                  items: SEARCH_MENU_ITEMS,
                  itemToConfig: item => ({ label: item }),
                }, h),
              ],
            }, h),
          ],
        }, h)`
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-4', [fileGroup, queryGroup])}`
    }
    case 'spinner': {
      const searching = `InputGroup.inputGroup({
          children: [
            ${emitInput('spinnerSearch', 'spinner-search', "\n            placeholder: 'Searching...',")},
            InputGroup.inputGroupAddon({ align: 'inline-end', children: [Spinner.spinner({ isDecorative: true }, h)] }, h),
          ],
        }, h)`
      const processing = `InputGroup.inputGroup({
          children: [
            ${emitInput('spinnerProcessing', 'spinner-processing', "\n            placeholder: 'Processing...',")},
            InputGroup.inputGroupAddon({ children: [Spinner.spinner({ isDecorative: true }, h)] }, h),
          ],
        }, h)`
      const saving = `InputGroup.inputGroup({
          children: [
            ${emitInput('spinnerSaving', 'spinner-saving', "\n            placeholder: 'Saving changes...',")},
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [InputGroup.inputGroupText({ children: ['Saving...'] }, h), Spinner.spinner({ isDecorative: true }, h)],
            }, h),
          ],
        }, h)`
      const refreshing = `InputGroup.inputGroup({
          children: [
            ${emitInput('spinnerRefresh', 'spinner-refresh', "\n            placeholder: 'Refreshing data...',")},
            InputGroup.inputGroupAddon({ children: [Spinner.spinner({ isDecorative: true }, h)] }, h),
            InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [InputGroup.inputGroupText({ children: ['Please wait...'] }, h)],
            }, h),
          ],
        }, h)`
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-4', [searching, processing, saving, refreshing])}`
    }
    case 'textarea':
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-md gap-4', [
        `InputGroup.inputGroup({
          children: [
            ${emitTextarea('textareaCode', 'textarea-code', `\n            placeholder: "console.log('Hello, world!');",\n            ${isStyleX ? 'layoutStyle: layoutStyle({ minHeight: "200px" })' : "class: 'min-h-[200px]'"},`)},
            InputGroup.inputGroupAddon({
              align: 'block-end',
              children: [
                InputGroup.inputGroupText({ children: ['Line 1, Column 1'] }, h),
                InputGroup.inputGroupButton({ size: 'sm', variant: 'default', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"}, children: ['Run ', Icon.icon('corner-down-left', {}, h)] }, h),
              ],
            }, h),
            InputGroup.inputGroupAddon({
              align: 'block-start',
              children: [
                InputGroup.inputGroupText({ children: [Icon.icon('file-code', {}, h), 'script.js'] }, h),
                InputGroup.inputGroupButton({ size: 'icon-xs', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"}, children: [Icon.icon('refresh-cw', {}, h)] }, h),
                InputGroup.inputGroupButton({ size: 'icon-xs', children: [Icon.icon('copy', {}, h)] }, h),
              ],
            }, h),
          ],
        }, h)`,
      ])}`
    case 'custom':
      return `    ${wrapStack(isStyleX, 'grid w-full max-w-sm gap-6', [
        `InputGroup.inputGroup({
          children: [
            h.textarea([
              h.DataAttribute('slot', 'input-group-control'),
              h.Placeholder('Autoresize textarea...'),
              h.Value(model.values['customMessage'] ?? ''),
              h.OnInput(value => Message.ChangedInputValue({ field: 'customMessage', value })),
              h.Class(${wrap('flex field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base outline-none md:text-sm', 'styles.customArea')}),
            ]),
            InputGroup.inputGroupAddon({
              align: 'block-end',
              children: [InputGroup.inputGroupButton({ size: 'sm', variant: 'default', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"}, children: ['Submit'] }, h)],
            }, h),
          ],
        }, h)`,
      ])}`
    case 'rtl': {
      const t = inputGroupRtlCopy
      const search = `InputGroup.inputGroup({
            children: [
              ${emitInput('rtlSearch', 'rtl-search', `\n              placeholder: '${t.placeholder}',`)},
              InputGroup.inputGroupAddon({ children: [Icon.icon('search', {}, h)] }, h),
              InputGroup.inputGroupAddon({ align: 'inline-end', children: ['${t.results}'] }, h),
            ],
          }, h)`
      const searching = `InputGroup.inputGroup({
            children: [
              ${emitInput('rtlSearching', 'rtl-searching', `\n              placeholder: '${t.searching}',`)},
              InputGroup.inputGroupAddon({ align: 'inline-end', children: [Spinner.spinner({ isDecorative: true }, h)] }, h),
            ],
          }, h)`
      const saving = `InputGroup.inputGroup({
            children: [
              ${emitInput('rtlSaving', 'rtl-saving', `\n              placeholder: '${t.savingChanges}',`)},
              InputGroup.inputGroupAddon({
                align: 'inline-end',
                children: [InputGroup.inputGroupText({ children: ['${t.saving}'] }, h), Spinner.spinner({ isDecorative: true }, h)],
              }, h),
            ],
          }, h)`
      const comment = `Field.fieldGroup({
            children: [
              Field.field({
                children: [
                  ${label('rtl-textarea', t.textareaLabel)},
                  InputGroup.inputGroup({
                    children: [
                      ${emitTextarea('rtlComment', 'rtl-textarea', `\n                      placeholder: '${t.textareaPlaceholder}',`)},
                      InputGroup.inputGroupAddon({
                        align: 'block-end',
                        children: [
                          InputGroup.inputGroupText({ children: ['${t.characterCount}'] }, h),
                          InputGroup.inputGroupButton({ variant: 'default', size: 'sm', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })' : "class: 'ml-auto'"}, children: ['${t.post}'] }, h),
                        ],
                      }, h),
                    ],
                  }, h),
                  ${desc(t.textareaDescription)},
                ],
              }, h),
            ],
          }, h)`
      return `    h.div([h.Dir('rtl'), h.Class(${wrap('grid w-full max-w-sm gap-6', 'styles.stack')})], [
          ${[search, searching, saving, comment].join(',\n')},
        ])`
    }
  }
}

const emitApplication = (
  fixture: InputGroupFixture,
  isStyleX: boolean,
): string => {
  const effectImports = (() => {
    if (kindUsesPopover(fixture.kind) || fixture.kind === 'align')
      return "import { Effect, Schema as S } from 'effect'"
    return "import { Schema as S } from 'effect'"
  })()
  const consts = (() => {
    if (kindUsesDropdown(fixture.kind)) {
      return `

const FILE_MENU_ITEMS = ['Settings', 'Copy path', 'Open location'] as const
const SEARCH_MENU_ITEMS = ['Documentation', 'Blog Posts', 'Changelog'] as const`
    }
    return ''
  })()
  return foldkitApplication({
    title: `Input Group — ${fixture.title}`,
    imports: `${effectImports}
${emitImports(fixture, isStyleX)}${isStyleX ? emitStyles(fixture) : ''}${consts}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Input Group — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? "stylex.props(styles.page).className ?? ''" : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const inputGroupExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  inputGroupFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer !== 'tailwind'),
  }))

export const inputGroupExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, inputGroupExamplesFor(renderer))
