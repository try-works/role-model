import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type TGItem = Readonly<{
  value: string
  label?: string
  icon?: string
  ariaLabel: string
  isDisabled?: boolean
  weight?: 'light' | 'normal' | 'medium' | 'bold'
}>

export type TGGroupSpec = Readonly<{
  id: string
  ariaLabel: string
  items: ReadonlyArray<TGItem>
  multiple: boolean
  selected: ReadonlyArray<string>
  variant?: 'outline'
  size?: 'sm' | 'lg'
  arrangement?: 'wrapped'
  orientation?: 'vertical'
  rtl?: boolean
}>

export type TGFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'default' | 'stack' | 'custom'
  groups: ReadonlyArray<TGGroupSpec>
}>

const iconItem = (
  value: string,
  icon: string,
  label: string,
  isDisabled?: boolean,
): TGItem => ({
  value,
  icon,
  ariaLabel: `Toggle ${label}`,
  ...(isDisabled === true ? { isDisabled: true } : {}),
})

const formatItems: ReadonlyArray<TGItem> = [
  iconItem('bold', 'bold', 'bold'),
  iconItem('italic', 'italic', 'italic'),
  iconItem('underline', 'underline', 'strikethrough'),
]

const directionItems = (isDisabled?: boolean): ReadonlyArray<TGItem> =>
  (['top', 'bottom', 'left', 'right'] as const).map(value => ({
    value,
    label: value[0]!.toUpperCase() + value.slice(1),
    ariaLabel: `Toggle ${value}`,
    ...(isDisabled === true ? { isDisabled: true } : {}),
  }))

const weightItem = (
  value: TGItem['weight'] & string,
  label: string,
): TGItem => ({
  value,
  label,
  ariaLabel: label,
  weight: value,
})

export const toggleGroupFixtures: Readonly<[TGFixture, ...Array<TGFixture>]> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'default',
    groups: [
      {
        id: 'demo',
        ariaLabel: 'Text formatting',
        items: formatItems,
        multiple: true,
        selected: [],
        variant: 'outline',
      },
    ],
  },
  {
    title: 'Outline',
    description: 'The outline variant reads as a segmented control.',
    kind: 'default',
    groups: [
      {
        id: 'outline',
        ariaLabel: 'Filter calls',
        items: [
          { value: 'all', label: 'All', ariaLabel: 'Toggle all' },
          { value: 'missed', label: 'Missed', ariaLabel: 'Toggle missed' },
        ],
        multiple: false,
        selected: ['all'],
        variant: 'outline',
      },
    ],
  },
  {
    title: 'Size',
    description: 'Small and default sizes scale trigger height and padding.',
    kind: 'stack',
    groups: [
      {
        id: 'size-sm',
        ariaLabel: 'Direction',
        items: directionItems(),
        multiple: false,
        selected: ['top'],
        variant: 'outline',
        size: 'sm',
      },
      {
        id: 'size-default',
        ariaLabel: 'Direction',
        items: directionItems(),
        multiple: false,
        selected: ['top'],
        variant: 'outline',
      },
    ],
  },
  {
    title: 'Spacing',
    description: 'The wrapped arrangement detaches items with a gap.',
    kind: 'default',
    groups: [
      {
        id: 'spacing',
        ariaLabel: 'Direction',
        items: directionItems(),
        multiple: false,
        selected: ['top'],
        variant: 'outline',
        size: 'sm',
        arrangement: 'wrapped',
      },
    ],
  },
  {
    title: 'Vertical',
    description: 'Stack items vertically for column-aligned toolbars.',
    kind: 'default',
    groups: [
      {
        id: 'vertical',
        ariaLabel: 'Text formatting',
        items: formatItems,
        multiple: true,
        selected: ['bold', 'italic'],
        orientation: 'vertical',
        arrangement: 'wrapped',
      },
    ],
  },
  {
    title: 'Disabled',
    description: 'Disable the whole group or individual items.',
    kind: 'default',
    groups: [
      {
        id: 'disabled',
        ariaLabel: 'Text formatting',
        items: formatItems.map(item => ({ ...item, isDisabled: true })),
        multiple: true,
        selected: [],
      },
    ],
  },
  {
    title: 'Custom',
    description: 'Items can render arbitrary content and feed live state.',
    kind: 'custom',
    groups: [
      {
        id: 'font-weight',
        ariaLabel: 'Font weight',
        items: [
          weightItem('light', 'Light'),
          weightItem('normal', 'Normal'),
          weightItem('medium', 'Medium'),
          weightItem('bold', 'Bold'),
        ],
        multiple: false,
        selected: ['normal'],
        variant: 'outline',
        arrangement: 'wrapped',
        size: 'lg',
      },
    ],
  },
  {
    title: 'RTL',
    description: 'Item order and arrow navigation mirror in RTL layouts.',
    kind: 'default',
    groups: [
      {
        id: 'rtl',
        ariaLabel: 'View mode',
        items: [
          { value: 'list', label: 'قائمة', ariaLabel: 'قائمة' },
          { value: 'grid', label: 'شبكة', ariaLabel: 'شبكة' },
          { value: 'cards', label: 'بطاقات', ariaLabel: 'بطاقات' },
        ],
        multiple: false,
        selected: ['list'],
        variant: 'outline',
        rtl: true,
      },
    ],
  },
]

const cap = (value: string): string => value[0]!.toUpperCase() + value.slice(1)

const itemEmit = (item: TGItem, isStyleX: boolean): string => {
  const children =
    item.icon !== undefined
      ? `children: [Icon.icon('${item.icon}', ${isStyleX ? '{}' : "{ class: 'size-4' }"}, h)]`
      : item.weight !== undefined
        ? isStyleX
          ? `children: [
      h.div([h.Class(className(styles.weightItem))], [
        h.span([h.Class(className(styles.weight${cap(item.weight)}))], ['Aa']),
        h.span([h.Class(className(styles.weightLabel))], ['${item.label ?? ''}']),
      ]),
    ]`
          : `children: [
      h.div([h.Class('flex size-16 flex-col items-center justify-center rounded-xl')], [
        h.span([h.Class('text-2xl leading-none font-${item.weight}')], ['Aa']),
        h.span([h.Class('text-xs text-muted-foreground')], ['${item.label ?? ''}']),
      ]),
    ]`
        : `children: ['${item.label ?? ''}']`
  return `      {
        value: '${item.value}',
        ariaLabel: '${item.ariaLabel}',${
          item.isDisabled === true
            ? `
        isDisabled: true,`
            : ''
        }${
          item.weight !== undefined && !isStyleX
            ? `
        class: 'flex size-16 flex-col items-center justify-center rounded-xl',`
            : ''
        }
        ${children},
      }`
}

const groupCallEmit = (
  group: TGGroupSpec,
  isStyleX: boolean,
): string => `ExampleGroup.toggleGroup({
      model: model.groups['${group.id}'] ?? ToggleGroup.init({ id: '${group.id}' }),
      toParentMessage: message =>
        GotToggleGroupMessage({ id: '${group.id}', message }),
      ariaLabel: '${group.ariaLabel}',
      ${group.multiple ? 'values' : 'value'}: ${group.multiple ? `model.selections['${group.id}'] ?? []` : `model.selections['${group.id}']?.[0] ?? '${group.selected[0] ?? ''}'`},
      items: [
${group.items.map(item => itemEmit(item, isStyleX)).join(',\n')},
      ],${
        group.variant === 'outline'
          ? `
      variant: 'outline',`
          : ''
      }${
        group.size !== undefined
          ? `
      size: '${group.size}',`
          : ''
      }${
        group.arrangement === 'wrapped'
          ? `
      arrangement: 'wrapped',`
          : ''
      }${
        group.orientation === 'vertical'
          ? `
      orientation: 'vertical',`
          : ''
      }${
        group.rtl === true
          ? `
      direction: 'rtl',`
          : ''
      }
    }, h)`

const viewBodyEmit = (fixture: TGFixture, isStyleX: boolean): string => {
  if (fixture.kind === 'stack') {
    return `    h.div([h.Class(${isStyleX ? 'className(styles.stack)' : "'flex flex-col gap-4'"})], [
${fixture.groups.map(group => `      ${groupCallEmit(group, isStyleX)}`).join(',\n')},
    ])`
  }
  if (fixture.kind === 'custom') {
    const group = fixture.groups[0]!
    return `    Field.field({
      children: [
        Field.fieldLabel({ children: ['Font Weight'] }, h),
        ${groupCallEmit(group, isStyleX)},
        Field.fieldDescription({
          children: [
            'Use ',
            h.code([h.Class(${isStyleX ? 'className(styles.inlineCode)' : "'rounded-md bg-muted px-1 py-0.5 font-mono'"})], [
              \`font-\${model.selections['${group.id}']?.[0] ?? 'normal'}\`,
            ]),
            ' to set the font weight.',
          ],
        }, h),
      ],
    }, h)`
  }
  return `    ${groupCallEmit(fixture.groups[0]!, isStyleX)}`
}

const emitSource = (fixture: TGFixture, isStyleX: boolean): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const lib = isStyleX ? 'stylex' : 'ui'
  const usesIcon = fixture.groups.some(group =>
    group.items.some(item => item.icon !== undefined),
  )
  const groupIds = fixture.groups.map(group => group.id)
  return foldkitApplication({
    title: `Toggle Group — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
`
    : ''
}${
      usesIcon
        ? `import * as Icon from '@/lib/icon'
`
        : ''
    }import * as ToggleGroup from '@/${lib}/toggle-group'${
      fixture.kind === 'custom'
        ? `
import * as Field from '@/${lib}/field'`
        : ''
    }
${
  isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  stack: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  weightItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '0.75rem' },
  weightLight: { fontSize: '1.5rem', lineHeight: 1, fontWeight: 300 },
  weightNormal: { fontSize: '1.5rem', lineHeight: 1, fontWeight: 400 },
  weightMedium: { fontSize: '1.5rem', lineHeight: 1, fontWeight: 500 },
  weightBold: { fontSize: '1.5rem', lineHeight: 1, fontWeight: 700 },
  weightLabel: { fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--muted-foreground)' },
  inlineCode: { borderRadius: '0.375rem', backgroundColor: 'var(--muted)', paddingInline: '0.25rem', paddingBlock: '0.125rem', fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)' },
})
`
    : ''
}`,
    model: `const ExampleGroup = ToggleGroup.create<string>()
export const Model = S.Struct({
  groups: S.Record(S.String, ToggleGroup.Model),
  selections: S.Record(S.String, S.Array(S.String)),
})
export type Model = typeof Model.Type`,
    messages: `export const GotToggleGroupMessage = taggedStruct('GotToggleGroupMessage${tag}', {
  id: S.String,
  message: ToggleGroup.Message,
})
export const Message = S.Union([GotToggleGroupMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    groups: {
${groupIds.map(id => `      '${id}': ToggleGroup.init({ id: '${id}' }),`).join('\n')}
    },
    selections: {
${fixture.groups.map(group => `      '${group.id}': [${group.selected.map(value => `'${value}'`).join(', ')}],`).join('\n')}
    },
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotToggleGroupMessage${tag}': {
      const current = model.groups[message.id]
      if (current === undefined) {
        return { model }
      }
      const next = ExampleGroup.update(current, message.message)
      const commands = next.commands ?? []
      const isMultiple = ${fixture.groups.map(group => `message.id === '${group.id}' ? ${group.multiple}`).join(' : ') + ' : false'}
      const selection = Option.getOrUndefined(Option.fromNullishOr(next.outMessage))?.value
      return {
        model: {
          ...model,
          groups: { ...model.groups, [message.id]: next.model },
          selections: selection === undefined
            ? model.selections
            : {
                ...model.selections,
                [message.id]: isMultiple
                  ? (model.selections[message.id] ?? []).includes(selection)
                    ? (model.selections[message.id] ?? []).filter(value => value !== selection)
                    : [...(model.selections[message.id] ?? []), selection]
                  : [selection],
              },
        },
        commands: Command.mapMessages(commands, next =>
          GotToggleGroupMessage({ id: message.id, message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Toggle Group — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${viewBodyEmit(fixture, isStyleX)},
  ]),
})`,
  })
}

const toggleGroupExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  toggleGroupFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitSource(fixture, renderer !== 'tailwind'),
  }))

export const toggleGroupExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, toggleGroupExamplesFor(renderer))
