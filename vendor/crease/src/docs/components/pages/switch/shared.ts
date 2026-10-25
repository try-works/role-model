import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type SwitchKind =
  | 'demo'
  | 'description'
  | 'choiceCard'
  | 'disabled'
  | 'invalid'
  | 'size'
  | 'rtl'

export interface SwitchFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: SwitchKind
  readonly switchIds: ReadonlyArray<string>
  readonly checkedIds: ReadonlyArray<string>
}

export const switchFixtures: Readonly<
  [SwitchFixture, ...Array<SwitchFixture>]
> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'demo',
    switchIds: ['airplane-mode'],
    checkedIds: [],
  },
  {
    title: 'Description',
    description:
      'Pair the control with explanatory copy inside a horizontal Field.',
    kind: 'description',
    switchIds: ['switch-focus-mode'],
    checkedIds: [],
  },
  {
    title: 'Choice Card',
    description:
      'Wrap each Field in a FieldLabel to make the whole card clickable.',
    kind: 'choiceCard',
    switchIds: ['switch-share', 'switch-notifications'],
    checkedIds: ['switch-notifications'],
  },
  {
    title: 'Disabled',
    description:
      'Disabled state prevents activation while keeping the row readable.',
    kind: 'disabled',
    switchIds: ['switch-disabled-unchecked'],
    checkedIds: [],
  },
  {
    title: 'Invalid',
    description: 'Mark the control invalid when the terms must be accepted.',
    kind: 'invalid',
    switchIds: ['switch-terms'],
    checkedIds: [],
  },
  {
    title: 'Size',
    description: 'Small and default sizes cover compact and roomy rows.',
    kind: 'size',
    switchIds: ['switch-size-sm', 'switch-size-default'],
    checkedIds: [],
  },
  {
    title: 'RTL',
    description:
      'Label, description and thumb travel mirror in right-to-left contexts.',
    kind: 'rtl',
    switchIds: ['switch-focus-mode-rtl'],
    checkedIds: [],
  },
]

const sw = (id: string, extra: string): string =>
  `Switch.switchControl({
      id: '${id}',
      isChecked: model.states['${id}'] ?? false,
      onToggle: isChecked => Toggled({ id: '${id}', isChecked }),${extra}
    }, h)`

const emitBody = (fixture: SwitchFixture, isStyleX: boolean): string => {
  const row = isStyleX ? 'className(styles.row)' : "'flex items-center gap-2'"
  switch (fixture.kind) {
    case 'demo':
      return `  h.div([h.Class(${row})], [
    ${sw('airplane-mode', '')},
    Label.label({
      id: 'airplane-mode-label',
      for: 'airplane-mode-control',
      children: ['Airplane Mode'],
    }, h),
  ])`
    case 'description':
      return `  Field.field({
    orientation: 'horizontal',
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "100%", maxWidth: "24rem" })' : "class: 'w-full max-w-sm'"},
    children: [
      Field.fieldContent({ children: [
        Field.fieldLabel({
          id: 'switch-focus-mode-label',
          for: 'switch-focus-mode-control',
          children: ['Share across devices'],
        }, h),
        Field.fieldDescription({
          children: ['Focus is shared across devices, and turns off when you leave the app.'],
        }, h),
      ] }, h),
      ${sw('switch-focus-mode', '')},
    ],
  }, h)`
    case 'choiceCard': {
      const card = (
        id: string,
        titleText: string,
        descText: string,
      ) => `Field.fieldLabel({
      id: '${id}-label',
      for: '${id}-control',
      children: [
        Field.field({
          orientation: 'horizontal',
          children: [
            Field.fieldContent({ children: [
              Field.fieldTitle({ children: ['${titleText}'] }, h),
              Field.fieldDescription({
                children: ['${descText}'],
              }, h),
            ] }, h),
            ${sw(id, '')},
          ],
        }, h),
      ],
    }, h)`
      return `  Field.fieldGroup({
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "100%", maxWidth: "24rem" })' : "class: 'w-full max-w-sm'"},
    children: [
      ${card('switch-share', 'Share across devices', 'Focus is shared across devices, and turns off when you leave the app.')},
      ${card('switch-notifications', 'Enable notifications', 'Receive notifications when focus mode is enabled or disabled.')},
    ],
  }, h)`
    }
    case 'disabled':
      return `  Field.field({
    orientation: 'horizontal',
    isDisabled: true,
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "fit-content" })' : "class: 'w-fit'"},
    children: [
      ${sw('switch-disabled-unchecked', '\n      isDisabled: true,')},
      Field.fieldLabel({
        id: 'switch-disabled-unchecked-label',
        for: 'switch-disabled-unchecked-control',
        children: ['Disabled'],
      }, h),
    ],
  }, h)`
    case 'invalid':
      return `  Field.field({
    orientation: 'horizontal',
    isInvalid: true,
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "100%", maxWidth: "24rem" })' : "class: 'w-full max-w-sm'"},
    children: [
      Field.fieldContent({ children: [
        Field.fieldLabel({
          id: 'switch-terms-label',
          for: 'switch-terms-control',
          children: ['Accept terms and conditions'],
        }, h),
        Field.fieldDescription({
          children: ['You must accept the terms and conditions to continue.'],
        }, h),
      ] }, h),
      ${sw('switch-terms', '\n      isInvalid: true,')},
    ],
  }, h)`
    case 'size': {
      const sizeField = (
        id: string,
        size: string,
        labelText: string,
      ) => `Field.field({
      orientation: 'horizontal',
      children: [
        ${sw(id, `\n        size: '${size}',`)},
        Field.fieldLabel({
          id: '${id}-label',
          for: '${id}-control',
          children: ['${labelText}'],
        }, h),
      ],
    }, h)`
      return `  Field.fieldGroup({
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "10rem" })' : "class: 'w-40'"},
    children: [
      ${sizeField('switch-size-sm', 'sm', 'Small')},
      ${sizeField('switch-size-default', 'default', 'Default')},
    ],
  }, h)`
    }
    case 'rtl':
      return `  Field.field({
    orientation: 'horizontal',
    direction: 'rtl',
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "100%", maxWidth: "24rem" })' : "class: 'w-full max-w-sm'"},
    children: [
      Field.fieldContent({ children: [
        Field.fieldLabel({
          id: 'switch-focus-mode-rtl-label',
          for: 'switch-focus-mode-rtl-control',
          children: ['المشاركة عبر الأجهزة'],
        }, h),
        Field.fieldDescription({
          children: ['يتم مشاركة التركيز عبر الأجهزة، ويتم إيقاف تشغيله عند مغادرة التطبيق.'],
        }, h),
      ] }, h),
      ${sw('switch-focus-mode-rtl', "\n      direction: 'rtl',")},
    ],
  }, h)`
  }
}

const emitImports = (fixture: SwitchFixture, isStyleX: boolean): string => {
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
  if (fixture.kind !== 'demo') {
    parts.push(`import * as Field from '@/${base}/field'`)
  }
  parts.push(`import * as Switch from '@/${base}/switch'`)
  if (fixture.kind === 'demo') {
    parts.push(`import * as Label from '@/${base}/label'`)
  }
  if (isStyleX) {
    parts.push(
      `import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'`,
    )
  }
  return parts.join('\n')
}

const emitStyles = (fixture: SwitchFixture): string => {
  const lines: string[] = []
  if (fixture.kind === 'demo') {
    lines.push(
      `  row: { display: 'flex', alignItems: 'center', gap: '0.5rem' },`,
    )
  }
  if (
    fixture.kind === 'description' ||
    fixture.kind === 'choiceCard' ||
    fixture.kind === 'invalid' ||
    fixture.kind === 'rtl'
  ) {
    lines.push(`  wide: { width: '100%', maxWidth: '24rem' },`)
  }
  if (fixture.kind === 'disabled') {
    lines.push(`  fit: { width: 'fit-content' },`)
  }
  if (fixture.kind === 'size') {
    lines.push(`  narrow: { width: '10rem' },`)
  }
  return lines.join('\n')
}

const emitApplication = (
  fixture: SwitchFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({\n${emitStyles(fixture)}\n})`
    : ''
  const initEntries = fixture.switchIds
    .map(id => `'${id}': ${fixture.checkedIds.includes(id)}`)
    .join(', ')
  return foldkitApplication({
    title: `Switch — ${fixture.title}`,
    imports: `${emitImports(fixture, isStyleX)}${stylesBlock}`,
    model: `export const Model = S.Struct({ states: S.Record(S.String, S.Boolean) })
export type Model = typeof Model.Type`,
    messages: `export const Toggled = taggedStruct('Toggled', { id: S.String, isChecked: S.Boolean })
export const Message = S.Union([Toggled])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { states: { ${initEntries} } } })`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'Toggled':
      return {
        model: {
          states: { ...model.states, [message.id]: message.isChecked },
        },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Switch — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const switchExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  switchFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const switchExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, switchExamplesFor(renderer))
