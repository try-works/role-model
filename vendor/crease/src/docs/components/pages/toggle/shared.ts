import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export interface ToggleItem {
  readonly key: string
  readonly label: string
  readonly ariaLabel: string
  readonly icon?: string
  readonly variant?: 'default' | 'outline'
  readonly size?: 'sm' | 'default' | 'lg'
  readonly isDisabled?: boolean
  readonly direction?: 'ltr' | 'rtl'
}

export type ToggleKind = 'single' | 'row'

export interface ToggleFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: ToggleKind
  readonly items: ReadonlyArray<ToggleItem>
}

export const toggleFixtures: Readonly<
  [ToggleFixture, ...Array<ToggleFixture>]
> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'single',
    items: [
      {
        key: 'bookmark',
        label: 'Bookmark',
        ariaLabel: 'Toggle bookmark',
        icon: 'bookmark',
        variant: 'outline',
        size: 'sm',
      },
    ],
  },
  {
    title: 'Outline',
    description:
      'Outline treatment works well when the toggle sits beside ordinary buttons.',
    kind: 'row',
    items: [
      {
        key: 'italic',
        label: 'Italic',
        ariaLabel: 'Toggle italic',
        icon: 'italic',
        variant: 'outline',
      },
      {
        key: 'bold',
        label: 'Bold',
        ariaLabel: 'Toggle bold',
        icon: 'bold',
        variant: 'outline',
      },
    ],
  },
  {
    title: 'With Text',
    description: 'Pair the icon with a visible label.',
    kind: 'single',
    items: [
      {
        key: 'italic',
        label: 'Italic',
        ariaLabel: 'Toggle italic',
        icon: 'italic',
      },
    ],
  },
  {
    title: 'Size',
    description: 'Three heights cover compact toolbars through roomy controls.',
    kind: 'row',
    items: [
      {
        key: 'small',
        label: 'Small',
        ariaLabel: 'Toggle small',
        variant: 'outline',
        size: 'sm',
      },
      {
        key: 'default',
        label: 'Default',
        ariaLabel: 'Toggle default',
        variant: 'outline',
        size: 'default',
      },
      {
        key: 'large',
        label: 'Large',
        ariaLabel: 'Toggle large',
        variant: 'outline',
        size: 'lg',
      },
    ],
  },
  {
    title: 'Disabled',
    description:
      'Native disabled state prevents activation while retaining the pressed value.',
    kind: 'row',
    items: [
      {
        key: 'disabled',
        label: 'Disabled',
        ariaLabel: 'Toggle disabled',
        isDisabled: true,
      },
      {
        key: 'disabled-outline',
        label: 'Disabled',
        ariaLabel: 'Toggle disabled outline',
        variant: 'outline',
        isDisabled: true,
      },
    ],
  },
  {
    title: 'RTL',
    description: 'Label and fill direction mirror in right-to-left contexts.',
    kind: 'single',
    items: [
      {
        key: 'bookmark',
        label: 'إشارة مرجعية',
        ariaLabel: 'Toggle bookmark',
        icon: 'bookmark',
        variant: 'outline',
        size: 'sm',
        direction: 'rtl',
      },
    ],
  },
]

const sq = (value: string): string => value.replaceAll("'", "\\'")

const emitToggle = (
  item: ToggleItem,
  stateExpr: string,
  onToggleExpr: string,
  isStyleX: boolean,
): string => {
  const props = [
    `isPressed: ${stateExpr}`,
    `onToggle: ${onToggleExpr}`,
    ...(item.variant === undefined ? [] : [`variant: '${item.variant}'`]),
    ...(item.size === undefined ? [] : [`size: '${item.size}'`]),
    `ariaLabel: '${sq(item.ariaLabel)}'`,
    ...(item.isDisabled === true ? ['isDisabled: true'] : []),
    ...(item.direction === undefined ? [] : [`direction: '${item.direction}'`]),
  ]
  const children =
    item.icon === undefined
      ? `['${sq(item.label)}']`
      : `[Icon.icon('${item.icon}', {}, h), '${sq(item.label)}']`
  return `Toggle.toggle({ ${props.join(', ')}, children: ${children} }, h)`
}

const emitBody = (fixture: ToggleFixture, isStyleX: boolean): string => {
  const single = fixture.kind === 'single'
  const toggles = fixture.items.map(item =>
    emitToggle(
      item,
      single ? 'model.isPressed' : `model.states['${item.key}'] ?? false`,
      single
        ? 'ToggledPressed({ isPressed: !model.isPressed })'
        : `Toggled({ id: '${item.key}' })`,
      isStyleX,
    ),
  )
  if (single) {
    return `  ${toggles[0]}`
  }
  const rowClass = isStyleX
    ? 'h.Class(className(styles.row))'
    : "h.Class('flex flex-wrap items-center gap-2')"
  return `  h.div([${rowClass}], [
${toggles.map(t => `    ${t}`).join(',\n')}
  ])`
}

const emitImports = (fixture: ToggleFixture, isStyleX: boolean): string => {
  const parts = [
    `import { Schema as S } from 'effect'`,
    `import { Command, Runtime, Subscription, Update } from 'foldkit'`,
    `import { type Document, type HtmlBuilder } from 'foldkit/html'`,
    `import { taggedStruct } from 'foldkit/schema'`,
  ]
  if (isStyleX) {
    parts.push(`import * as stylex from '@stylexjs/stylex'`)
  }
  parts.push(`import * as Toggle from '@/${isStyleX ? 'stylex' : 'ui'}/toggle'`)
  if (fixture.items.some(item => item.icon !== undefined)) {
    parts.push(`import * as Icon from '@/lib/icon'`)
  }
  if (isStyleX && fixture.kind === 'row') {
    parts.push(`import { className } from '@/stylex/style'`)
  }
  return parts.join('\n')
}

const emitModel = (fixture: ToggleFixture): string =>
  fixture.kind === 'single'
    ? `export const Model = S.Struct({ isPressed: S.Boolean })
export type Model = typeof Model.Type`
    : `export const Model = S.Struct({ states: S.Record(S.String, S.Boolean) })
export type Model = typeof Model.Type`

const emitMessages = (fixture: ToggleFixture): string =>
  fixture.kind === 'single'
    ? `export const ToggledPressed = taggedStruct('ToggledPressed', { isPressed: S.Boolean })
export const Message = S.Union([ToggledPressed])
export type Message = typeof Message.Type`
    : `export const Toggled = taggedStruct('Toggled', { id: S.String })
export const Message = S.Union([Toggled])
export type Message = typeof Message.Type`

const emitInit = (fixture: ToggleFixture): string => {
  if (fixture.kind === 'single') {
    return `export const init = (): Update.Return<Model, Message> => ({ model: { isPressed: false } })`
  }
  const entries = fixture.items.map(item => `'${item.key}': false`).join(', ')
  return `export const init = (): Update.Return<Model, Message> => ({ model: { states: { ${entries} } } })`
}

const emitUpdate = (fixture: ToggleFixture): string =>
  fixture.kind === 'single'
    ? `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledPressed':
      return { model: { ...model, isPressed: message.isPressed } }
  }
}`
    : `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'Toggled':
      return {
        model: {
          states: {
            ...model.states,
            [message.id]: !(model.states[message.id] ?? false),
          },
        },
      }
  }
}`

const emitStyles = (fixture: ToggleFixture): string => {
  if (fixture.kind !== 'row') return ''
  return `  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' },`
}

const emitApplication = (
  fixture: ToggleFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({\n${emitStyles(fixture)}\n})`
    : ''
  return foldkitApplication({
    title: `Toggle — ${fixture.title}`,
    imports: `${emitImports(fixture, isStyleX)}${stylesBlock}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Toggle — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const toggleExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  toggleFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const toggleExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, toggleExamplesFor(renderer))
