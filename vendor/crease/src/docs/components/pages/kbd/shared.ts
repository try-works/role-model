import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type KbdKind =
  | 'demo'
  | 'group'
  | 'button'
  | 'tooltip'
  | 'inputGroup'
  | 'rtl'

export interface KbdFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: KbdKind
}

export const kbdFixtures: Readonly<[KbdFixture, ...Array<KbdFixture>]> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Group',
    description: 'Use the KbdGroup component to group keyboard keys together.',
    kind: 'group',
  },
  {
    title: 'Button',
    description:
      'Use the Kbd component inside a Button component to display a keyboard key inside a button.',
    kind: 'button',
  },
  {
    title: 'Tooltip',
    description: 'You can use the Kbd component inside a Tooltip component.',
    kind: 'tooltip',
  },
  {
    title: 'Input Group',
    description:
      'You can use the Kbd component inside an InputGroupAddon component.',
    kind: 'inputGroup',
  },
  { title: 'RTL', kind: 'rtl' },
]

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesButton = (kind: KbdKind): boolean =>
  kind === 'button' || kind === 'tooltip'
const kindUsesButtonGroup = (kind: KbdKind): boolean => kind === 'tooltip'
const kindUsesIcon = (kind: KbdKind): boolean => kind === 'inputGroup'
const kindUsesInputGroup = (kind: KbdKind): boolean => kind === 'inputGroup'
const kindUsesTooltip = (kind: KbdKind): boolean => kind === 'tooltip'
const kindUsesInput = (kind: KbdKind): boolean => kind === 'inputGroup'

const emitImports = (fixture: KbdFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts: Array<string> = [
    "import { Command, Runtime, Subscription, Update } from 'foldkit'",
    "import { type Document, type HtmlBuilder } from 'foldkit/html'",
    "import { defineMessageUnion } from 'foldkit/message'",
  ]
  if (isStyleX) {
    parts.push('', "import * as stylex from '@stylexjs/stylex'")
  }
  if (kindUsesButton(fixture.kind)) {
    parts.push(`import * as Button from '@/${base}/button'`)
  }
  if (kindUsesButtonGroup(fixture.kind)) {
    parts.push(`import * as ButtonGroup from '@/${base}/button-group'`)
  }
  if (kindUsesIcon(fixture.kind)) {
    parts.push(`import * as Icon from '@/lib/icon'`)
  }
  if (kindUsesInputGroup(fixture.kind)) {
    parts.push(`import * as InputGroup from '@/${base}/input-group'`)
  }
  parts.push(`import * as Kbd from '@/${base}/kbd'`)
  if (isStyleX) {
    parts.push(`import { tokens } from '@/stylex/tokens.stylex'`)
  }
  if (kindUsesTooltip(fixture.kind)) {
    parts.push(`import * as Tooltip from '@/${base}/tooltip'`)
  }
  return parts.join('\n')
}

const emitStyles = (fixture: KbdFixture): string => {
  const extras: Array<string> = []
  if (
    fixture.kind === 'demo' ||
    fixture.kind === 'group' ||
    fixture.kind === 'button'
  ) {
    extras.push(
      "  stack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },",
    )
  }
  if (fixture.kind === 'group') {
    extras.push('  muted: { color: tokens.mutedForeground },')
  }
  if (fixture.kind === 'tooltip') {
    extras.push("  row: { display: 'flex', flexWrap: 'wrap', gap: '1rem' },")
    extras.push(
      "  tooltipContent: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem' },",
    )
  }
  if (fixture.kind === 'inputGroup') {
    extras.push(
      "  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '20rem' },",
    )
  }
  if (fixture.kind === 'rtl') {
    extras.push(
      "  rtlStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },",
    )
  }
  return extras.join('\n')
}

const emitModel = (fixture: KbdFixture): string => {
  const fields: Array<string> = []
  if (kindUsesInput(fixture.kind)) {
    fields.push('  search: S.String,')
  }
  if (kindUsesTooltip(fixture.kind)) {
    fields.push('  tooltipA: Tooltip.Model,')
    fields.push('  tooltipB: Tooltip.Model,')
  }
  const struct =
    fields.length === 0
      ? 'export const Model = S.Struct({})'
      : `export const Model = S.Struct({\n${fields.join('\n')}\n})`
  return `${struct}\nexport type Model = typeof Model.Type`
}

const emitMessages = (fixture: KbdFixture): string => {
  const fields: Array<string> = []
  if (kindUsesInput(fixture.kind)) {
    fields.push('  ChangedSearch: { value: S.String },')
  }
  if (kindUsesTooltip(fixture.kind)) {
    fields.push(
      '  GotTooltipAMessage: { message: Tooltip.Message },',
      '  GotTooltipBMessage: { message: Tooltip.Message },',
    )
  }
  if (fields.length === 0) {
    return `import { taggedStruct } from 'foldkit/schema'
// This example has no interaction. Runtime applications still expose a
// closed Message schema so the program boundary remains explicit.
export const NoOp = taggedStruct('NoOpKbd${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}');
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`
  }
  return `export const Message = defineMessageUnion({
${fields.join('\n')}
})
export type Message = typeof Message.Type`
}

const emitInit = (fixture: KbdFixture): string => {
  const fields: Array<string> = []
  if (kindUsesInput(fixture.kind)) {
    fields.push("search: ''")
  }
  if (kindUsesTooltip(fixture.kind)) {
    fields.push(
      "tooltipA: Tooltip.init({ id: 'kbd-tooltip-a', showDelay: 400, closeDelay: 100 })",
      "tooltipB: Tooltip.init({ id: 'kbd-tooltip-b', showDelay: 400, closeDelay: 100 })",
    )
  }
  return `export const init = (): Update.Return<Model, Message> => ({ model: { ${fields.join(', ')} } })`
}

const emitUpdate = (fixture: KbdFixture): string => {
  const entries: Array<string> = []
  if (kindUsesInput(fixture.kind)) {
    entries.push(`    case 'ChangedSearch':
      return { model: { ...model, search: message.value }, commands: [] }`)
  }
  if (kindUsesTooltip(fixture.kind)) {
    entries.push(
      `    case 'GotTooltipAMessage': {
      const { model: tooltipA, commands: tooltipCommands__ } = Tooltip.update(model.tooltipA, message.message)
      const commands = tooltipCommands__ ?? []
      return {
        model: { ...model, tooltipA },
        commands: Command.mapMessages(commands, next => Message.GotTooltipAMessage({ message: next })),
      }
    }`,
      `    case 'GotTooltipBMessage': {
      const { model: tooltipB, commands: tooltipCommands__ } = Tooltip.update(model.tooltipB, message.message)
      const commands = tooltipCommands__ ?? []
      return {
        model: { ...model, tooltipB },
        commands: Command.mapMessages(commands, next => Message.GotTooltipBMessage({ message: next })),
      }
    }`,
    )
  }
  if (entries.length === 0) {
    return `export const update = (
  model: Model,
  _message: Message,
): Update.Return<Model, Message> => ({ model: model })`
  }
  return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
${entries.join('\n')}
  }
}`
}

const emitBody = (fixture: KbdFixture, isStyleX: boolean): string => {
  const cls = (twClass: string, sxName: string): string =>
    isStyleX ? `stylex.props(styles.${sxName}).className ?? ''` : `'${twClass}'`
  switch (fixture.kind) {
    case 'demo':
      return `    h.div([h.Class(${cls('flex flex-col items-center gap-4', 'stack')})], [
      Kbd.kbdGroup({
        children: [
          Kbd.kbd({ children: ['⌘'] }, h),
          Kbd.kbd({ children: ['⇧'] }, h),
          Kbd.kbd({ children: ['⌥'] }, h),
          Kbd.kbd({ children: ['⌃'] }, h),
        ],
      }, h),
      Kbd.kbdGroup({
        children: [
          Kbd.kbd({ children: ['Ctrl'] }, h),
          h.span([], ['+']),
          Kbd.kbd({ children: ['B'] }, h),
        ],
      }, h),
    ]),`
    case 'group':
      return `    h.div([h.Class(${cls('flex flex-col items-center gap-4', 'stack')})], [
      h.p([h.Class(${cls('text-sm text-muted-foreground', 'muted')})], [
        'Use ',
        Kbd.kbdGroup({
          children: [
            Kbd.kbd({ children: ['Ctrl + B'] }, h),
            Kbd.kbd({ children: ['Ctrl + K'] }, h),
          ],
        }, h),
        ' to open the command palette',
      ]),
    ]),`
    case 'button':
      return `    h.div([h.Class(${cls('flex flex-col items-center gap-4', 'stack')})], [
      Button.button({
        variant: 'outline',
        children: [
          'Accept ',
          Kbd.kbd({
            icon: 'inline-end',
            ${isStyleX ? '' : "class: 'translate-x-0.5',"}
            children: ['⏎'],
          }, h),
        ],
      }, h),
    ]),`
    case 'tooltip':
      return `    h.div([h.Class(${cls('flex flex-wrap gap-4', 'row')})], [
      ButtonGroup.buttonGroup({
        children: [
          Tooltip.tooltip({
            model: model.tooltipA,
            toParentMessage: message => Message.GotTooltipAMessage({ message }),
            renderTrigger: attributes =>
              Button.button({
                buttonAttributes: attributes,
                variant: 'outline',
                children: ['Save'],
              }, h),
            content: h.span(
              [h.Class(${cls('inline-flex items-center gap-1', 'tooltipContent')})],
              ['Save Changes ', Kbd.kbd({ children: ['S'] }, h)],
            ),
          }, h),
          Tooltip.tooltip({
            model: model.tooltipB,
            toParentMessage: message => Message.GotTooltipBMessage({ message }),
            renderTrigger: attributes =>
              Button.button({
                buttonAttributes: attributes,
                variant: 'outline',
                children: ['Print'],
              }, h),
            content: h.span(
              [h.Class(${cls('inline-flex items-center gap-1', 'tooltipContent')})],
              [
                'Print Document ',
                Kbd.kbdGroup({
                  children: [
                    Kbd.kbd({ children: ['Ctrl'] }, h),
                    Kbd.kbd({ children: ['P'] }, h),
                  ],
                }, h),
              ],
            ),
          }, h),
        ],
      }, h),
    ]),`
    case 'inputGroup':
      return `    h.div([h.Class(${cls('flex w-full max-w-xs flex-col gap-6', 'stack')})], [
      InputGroup.inputGroup({
        children: [
          InputGroup.inputGroupInput({
            id: 'kbd-search',
            value: model.search,
            onInput: value => Message.ChangedSearch({ value }),
            placeholder: 'Search...',
            ariaLabel: 'Search',
          }, h),
          InputGroup.inputGroupAddon({
            children: [Icon.icon('search', {}, h)],
          }, h),
          InputGroup.inputGroupAddon({
            align: 'inline-end',
            children: [
              Kbd.kbd({ children: ['⌘'] }, h),
              Kbd.kbd({ children: ['K'] }, h),
            ],
          }, h),
        ],
      }, h),
    ]),`
    case 'rtl':
      return `    h.div(
      [
        h.Class(${cls('flex flex-col items-center gap-4', 'rtlStack')}),
        h.Attribute('dir', 'rtl'),
      ],
      [
        Kbd.kbdGroup({
          children: [
            Kbd.kbd({ children: ['⌘'] }, h),
            Kbd.kbd({ children: ['⇧'] }, h),
            Kbd.kbd({ children: ['⌥'] }, h),
            Kbd.kbd({ children: ['⌃'] }, h),
          ],
        }, h),
        Kbd.kbdGroup({
          children: [
            Kbd.kbd({ children: ['Ctrl'] }, h),
            h.span([], ['+']),
            Kbd.kbd({ children: ['B'] }, h),
          ],
        }, h),
      ],
    ),`
  }
}

const emitApplication = (
  fixture: KbdFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX ? emitStyles(fixture) : ''
  const bodyStart = isStyleX
    ? `h.main([h.Class(stylex.props(styles.page).className ?? '')], [`
    : `h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-4'"})], [`
  const pageStyle = isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '1rem' },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' },${
    stylesBlock === ''
      ? ''
      : `
${stylesBlock}`
  }
})

`
    : ''
  return foldkitApplication({
    title: `Kbd — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'\n${emitImports(fixture, isStyleX)}\n\n${pageStyle}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Kbd — ${sq(fixture.title)}',
  body: ${bodyStart}
    ${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const kbdExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  kbdFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const kbdExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, kbdExamplesFor(renderer))
