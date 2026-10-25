import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type TokenizerFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind:
    | 'showcase'
    | 'clear'
    | 'creatable'
    | 'endContent'
    | 'icon'
    | 'maxEntries'
    | 'overflow'
    | 'states'
  /** Astrryx block id, kept for tracing against the source templates. */
  example: string
}>

export const tokenizerFixtures: ReadonlyArray<TokenizerFixture> = [
  {
    title: 'Tokenizer',
    heroOnly: true,
    kind: 'showcase',
    example: 'TokenizerShowcase',
    description: 'A tokenizer with preset tags and search source.',
  },
  {
    title: 'Clear',
    kind: 'clear',
    example: 'TokenizerClear',
    description:
      'Tokenizer with a built-in clear-all button for bulk removal of all selected tokens.',
  },
  {
    title: 'Creatable',
    kind: 'creatable',
    example: 'TokenizerCreatable',
    description:
      'Free-text tokenizer for creating custom tags and a combined create-or-search pattern. Use when users need to enter values that may not exist in a predefined list.',
  },
  {
    title: 'End Content',
    kind: 'endContent',
    example: 'TokenizerEndContent',
    description:
      'Tokenizer with an action button in the end slot. Use for inline actions like applying selections alongside the input.',
  },
  {
    title: 'Icon',
    kind: 'icon',
    example: 'TokenizerIcon',
    description:
      'Tokenizer with a leading search icon to visually reinforce the search behavior.',
  },
  {
    title: 'Max Entries',
    kind: 'maxEntries',
    example: 'TokenizerMaxEntries',
    description:
      'Tokenizer with a maximum selection limit. The input hides automatically when the limit is reached, preventing further additions.',
  },
  {
    title: 'Overflow',
    kind: 'overflow',
    example: 'TokenizerOverflow',
    description:
      'Tokenizer with overflow truncation when unfocused. Inline mode pushes content down on expand; layer mode overlays without shifting layout.',
  },
  {
    title: 'States',
    kind: 'states',
    example: 'TokenizerStates',
    description:
      'Tokenizer in disabled, error, warning, and success states. Use to communicate validation feedback or lock a selection from editing.',
  },
]

export const USERS = [
  { id: '1', label: 'Alice Johnson' },
  { id: '2', label: 'Bob Smith' },
  { id: '3', label: 'Charlie Brown' },
  { id: '4', label: 'Diana Prince' },
  { id: '5', label: 'Eve Williams' },
  { id: '6', label: 'Frank Miller' },
] as const

export const SKILLS = [
  { id: '1', label: 'Foldkit' },
  { id: '2', label: 'TypeScript' },
  { id: '3', label: 'GraphQL' },
  { id: '4', label: 'Node.js' },
  { id: '5', label: 'Python' },
  { id: '6', label: 'Rust' },
  { id: '7', label: 'Go' },
  { id: '8', label: 'Swift' },
] as const

export const TAGS = [
  { id: '1', label: 'Design' },
  { id: '2', label: 'Engineering' },
] as const

const imports = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  extra: string,
): string =>
  `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Tokenizer from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/tokenizer'${extra}`

const stylexPreamble = `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
import * as Button from '@/stylex/button'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  stack: {
    display: 'grid',
    gap: '1rem',
    maxWidth: '25rem',
    minWidth: '15rem',
    width: '100%',
  },
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },
})`

const stackClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.stack))`
    : `h.Class('grid w-full max-w-[400px] min-w-[240px] gap-4')`

const supportingClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.supporting))`
    : `h.Class('text-muted-foreground text-sm')`

const buttonClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(...Button.buttonVisualStyles({ variant: 'default', size: 'sm' })))`
    : `h.Class('rounded-md bg-primary px-2 py-1 text-sm font-medium text-primary-foreground')`

const messages = `import { taggedStruct } from 'foldkit/schema'
export const GotTokenizerMessage = taggedStruct('GotTokenizerMessage', { slot: S.Number, message: Tokenizer.Message });
export const Message = S.Union([GotTokenizerMessage])
export type Message = typeof Message.Type`

const update = `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTokenizerMessage': {
      const target = model.tokenizers[message.slot]
      if (target === undefined) return { model }
      const next = Tokenizer.update(target, message.message)
      const tokenizers = model.tokenizers.map((entry, i) =>
        i === message.slot ? next.model : entry,
      )
      return {
        model: { ...model, tokenizers },
        commands: Command.mapMessages(next.commands ?? [], m => GotTokenizerMessage({ slot: message.slot, message: m })),
      }
    }
  }
}`

const ITEMS_SNIPPET = `const USERS = [
  { id: '1', label: 'Alice Johnson' },
  { id: '2', label: 'Bob Smith' },
  { id: '3', label: 'Charlie Brown' },
  { id: '4', label: 'Diana Prince' },
  { id: '5', label: 'Eve Williams' },
  { id: '6', label: 'Frank Miller' },
] as const

const SKILLS = [
  { id: '1', label: 'Foldkit' },
  { id: '2', label: 'TypeScript' },
  { id: '3', label: 'GraphQL' },
  { id: '4', label: 'Node.js' },
  { id: '5', label: 'Python' },
  { id: '6', label: 'Rust' },
  { id: '7', label: 'Go' },
  { id: '8', label: 'Swift' },
] as const

const TAGS = [
  { id: '1', label: 'Design' },
  { id: '2', label: 'Engineering' },
] as const`

const modelDecl = `export const Model = S.Struct({
  tokenizers: S.Array(Tokenizer.Model),
})
export type Model = typeof Model.Type

${ITEMS_SNIPPET}`

const singleSource = (
  fixture: TokenizerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const initLines = (() => {
    switch (fixture.kind) {
      case 'showcase':
        return `Tokenizer.init({ id: 'docs-tokenizer-0', tokens: [...TAGS] })`
      case 'clear':
        return `Tokenizer.init({ id: 'docs-tokenizer-0', tokens: [USERS[0]!, USERS[1]!], items: [...USERS] })`
      case 'icon':
        return `Tokenizer.init({ id: 'docs-tokenizer-0', tokens: [USERS[0]!, USERS[2]!], items: [...USERS] })`
      case 'endContent':
        return `Tokenizer.init({ id: 'docs-tokenizer-0', tokens: [USERS[0]!, USERS[2]!], items: [...USERS] })`
      case 'maxEntries':
        return `Tokenizer.init({ id: 'docs-tokenizer-0', tokens: [SKILLS[0]!, SKILLS[1]!], items: [...SKILLS], maxEntries: 3 })`
      case 'overflow':
        return `Tokenizer.init({ id: 'docs-tokenizer-0', tokens: [...USERS], items: [...USERS] }), Tokenizer.init({ id: 'docs-tokenizer-1', tokens: [...USERS], items: [...USERS] })`
      default:
        return `Tokenizer.init({ id: 'docs-tokenizer-0', items: [...USERS] })`
    }
  })()

  const callFor = (kind: TokenizerFixture['kind']): string => {
    switch (kind) {
      case 'showcase':
        return `Tokenizer.tokenizer({
          model: model.tokenizers[0]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
          label: 'Tags',
          placeholder: 'Search...',
          items: [],
          width: 400,
        }, h)`
      case 'clear':
        return `Tokenizer.tokenizer({
          model: model.tokenizers[0]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
          label: 'Team Members',
          placeholder: 'Search people...',
          items: [...USERS],
          hasClear: true,
          width: 400,
        }, h)`
      case 'icon':
        return `Tokenizer.tokenizer({
          model: model.tokenizers[0]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
          label: 'Team Members',
          placeholder: 'Search people...',
          items: [...USERS],
          hasStartIcon: true,
          width: 400,
        }, h)`
      case 'endContent':
        return `Tokenizer.tokenizer({
          model: model.tokenizers[0]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
          label: 'Team Members',
          placeholder: 'Search people...',
          items: [...USERS],
          endContent: h.button([${buttonClass(isStyleX)}, h.Type('button')], ['Apply']),
          width: 400,
        }, h)`
      case 'maxEntries':
        return `Tokenizer.tokenizer({
          model: model.tokenizers[0]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
          label: 'Top Skills',
          description: 'Choose up to 3 skills',
          placeholder: 'Search skills...',
          items: [...SKILLS],
          maxEntries: 3,
          width: 400,
        }, h)`
      case 'overflow':
        return `Tokenizer.tokenizer({
          model: model.tokenizers[0]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
          label: 'Inline Overflow',
          placeholder: 'Add more...',
          items: [...USERS],
          tokenOverflowBehavior: 'unfocusedInline',
          width: 400,
        }, h),
        Tokenizer.tokenizer({
          model: model.tokenizers[1]!,
          toParentMessage: message => GotTokenizerMessage({ slot: 1, message }),
          label: 'Layer Overflow',
          placeholder: 'Add more...',
          items: [...USERS],
          tokenOverflowBehavior: 'unfocusedLayer',
          width: 400,
        }, h)`
      default:
        return ''
    }
  }

  const supporting = (kind: TokenizerFixture['kind']): string => {
    switch (kind) {
      case 'clear':
        return `'Clear-all button appears when tokens are selected'`
      case 'icon':
        return `'Leading icon reinforces the search affordance'`
      case 'endContent':
        return `'Action button in the end slot'`
      case 'maxEntries':
        return `\`Limited to 3 selections — \${String(3 - model.tokenizers[0]!.tokens.length)} remaining\``
      case 'overflow':
        return `'Inline overflow — content shifts down on expand'`
      default:
        return ''
    }
  }

  const note = supporting(fixture.kind)
  return foldkitApplication({
    title: `Tokenizer — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: modelDecl,
    messages,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    tokenizers: [${initLines}],
  },
})`,
    update,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Tokenizer — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [${
      note === ''
        ? ''
        : `
      h.p([${supportingClass(isStyleX)}], [${note}]),`
    }
      ${callFor(fixture.kind)},
    ]),
  ]),
})`,
  })
}

const creatableSource = (
  fixture: TokenizerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `Tokenizer — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: modelDecl,
    messages,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    tokenizers: [
      Tokenizer.init({ id: 'docs-tokenizer-0' }),
      Tokenizer.init({ id: 'docs-tokenizer-1', items: [...USERS] }),
    ],
  },
})`,
    update,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Tokenizer — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      h.p([${supportingClass(isStyleX)}], ['Free-text only']),
      Tokenizer.tokenizer({
        model: model.tokenizers[0]!,
        toParentMessage: message => GotTokenizerMessage({ slot: 0, message }),
        label: 'Tags',
        placeholder: 'Type a tag and press Enter...',
        items: [],
        hasCreate: true,
        width: 400,
      }, h),
      h.p([${supportingClass(isStyleX)}], ['Create or search']),
      Tokenizer.tokenizer({
        model: model.tokenizers[1]!,
        toParentMessage: message => GotTokenizerMessage({ slot: 1, message }),
        label: 'Team Members',
        placeholder: 'Search or type a new name...',
        items: [...USERS],
        hasCreate: true,
        hasEntriesOnFocus: true,
        width: 400,
      }, h),
    ]),
  ]),
})`,
  })
}

const statesSource = (
  fixture: TokenizerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `Tokenizer — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `${modelDecl}

const FIELDS = [
  { label: 'Disabled field', isDisabled: true, values: [USERS[0]!, USERS[2]!] },
  { label: 'Error message', status: { type: 'error', message: 'At least one reviewer is required' } },
  { label: 'Warning message', status: { type: 'warning', message: 'Consider adding at least 2 approvers' } },
  { label: 'Success message', status: { type: 'success', message: 'All required reviewers added' } },
] as const`,
    messages,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    tokenizers: FIELDS.map((field, i) =>
      Tokenizer.init({
        id: \`docs-tokenizer-state-\${String(i)}\`,
        tokens: 'values' in field ? [...field.values] : i === 2 ? [USERS[0]!] : i === 3 ? [USERS[1]!, USERS[3]!] : [],
        items: [...USERS],
      }),
    ),
  },
})`,
    update,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Tokenizer — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      ...FIELDS.map((field, i) =>
        Tokenizer.tokenizer({
          model: model.tokenizers[i]!,
          toParentMessage: message => GotTokenizerMessage({ slot: i, message }),
          label: field.label,
          placeholder: 'Search people...',
          items: [...USERS],
          isDisabled: 'isDisabled' in field && field.isDisabled,
          isRequired: i === 1,
          ...('status' in field ? { status: field.status } : {}),
          width: 400,
        }, h),
      ),
    ]),
  ]),
})`,
  })
}

const tokenizerSource = (
  fixture: TokenizerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'creatable':
      return creatableSource(fixture, renderer)
    case 'states':
      return statesSource(fixture, renderer)
    default:
      return singleSource(fixture, renderer)
  }
}

const tokenizerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  tokenizerFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: tokenizerSource(fixture, renderer),
  }))

export const tokenizerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, tokenizerExamplesFor(renderer))
