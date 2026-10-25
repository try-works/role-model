import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  controlledBooleanApplication,
  foldkitApplication,
} from '@/docs/components/pages/authored-page'

export const checkboxGroupItems = [
  { id: 'disks', label: 'Hard disks', initial: true },
  { id: 'external', label: 'External disks', initial: true },
  { id: 'drives', label: 'CDs/DVDs/iPods', initial: false },
  { id: 'servers', label: 'Connected servers', initial: false },
] as const
export type CheckboxGroupItemId = (typeof checkboxGroupItems)[number]['id']

export const checkboxTableRows = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'Admin',
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    email: 'marcus.rodriguez@example.com',
    role: 'User',
  },
  {
    id: '3',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    role: 'User',
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@example.com',
    role: 'Editor',
  },
] as const

export type CheckboxFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'single' | 'group' | 'table'
  label: string
  checked?: boolean
  config?: string
  rtl?: boolean
}>

export const checkboxFixtures: ReadonlyArray<CheckboxFixture> = [
  {
    title: 'Demo',
    heroOnly: true,
    kind: 'single',
    label: 'Accept terms and conditions',
  },
  {
    title: 'Invalid State',
    kind: 'single',
    label: 'Accept terms and conditions',
    config: 'isInvalid: true,',
    description: 'aria-invalid styling marks the box without blocking toggles.',
  },
  {
    title: 'Basic',
    kind: 'single',
    label: 'Accept terms and conditions',
    description:
      'Model the checked value explicitly and update it from the toggle fact.',
  },
  {
    title: 'Description',
    kind: 'single',
    label: 'Accept terms and conditions',
    checked: true,
    config: `description: 'By clicking this checkbox, you agree to the terms and conditions.',`,
    description:
      'The description prop links the explanation through aria-describedby.',
  },
  {
    title: 'Disabled',
    kind: 'single',
    label: 'Enable notifications',
    config: 'isDisabled: true,',
    description:
      'Disabled state remains visible and labeled but cannot dispatch a toggle Message.',
  },
  {
    title: 'Group',
    kind: 'group',
    label: '',
    description:
      'A fieldSet groups related toggles under one legend and description.',
  },
  {
    title: 'Table',
    kind: 'table',
    label: '',
    description:
      'A select-all header checkbox toggles every row; row state is a serializable id array.',
  },
  {
    title: 'RTL',
    kind: 'single',
    label: 'Accept terms and conditions',
    rtl: true,
    description:
      'Right-to-left direction renders inside a dir="rtl" container.',
  },
  {
    title: 'Indeterminate',
    kind: 'single',
    label: 'Select all components',
    config: 'isIndeterminate: true,',
    description:
      'Use indeterminate for a parent choice whose children contain mixed values.',
  },
  {
    title: 'Read only',
    kind: 'single',
    label: 'Account verified',
    checked: true,
    config: `isReadOnly: true,\n  description: 'This status is supplied by your identity provider.',`,
    description:
      'Use read-only when the state remains relevant information but cannot be changed here.',
  },
]

const singleSource = (
  fixture: CheckboxFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  controlledBooleanApplication({
    componentName: 'Checkbox',
    componentSlug: 'checkbox',
    renderer,
    exampleName: fixture.title,
    field: 'isAccepted',
    initialValue: fixture.checked ?? false,
    messageName: 'ToggledAcceptance',
    messageField: 'isChecked',
    viewBody: `${fixture.rtl === true ? "h.div([h.Dir('rtl')], [" : ''}Checkbox.checkbox({
  id: 'accept',
  isChecked: model.isAccepted,
  onToggle: isChecked => ToggledAcceptance({ isChecked }),
  label: '${fixture.label}',
  name: 'terms',
  value: 'accepted',
  ${fixture.config ?? ''}
}, h)${fixture.rtl === true ? '])' : ''},`,
  })

const groupSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Checkbox — group',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Checkbox from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/checkbox'
import * as Field from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/field'`,
    model: `export const Model = S.Struct({
  disks: S.Boolean,
  external: S.Boolean,
  drives: S.Boolean,
  servers: S.Boolean,
})
export type Model = typeof Model.Type

const items = [
  { id: 'disks', label: 'Hard disks' },
  { id: 'external', label: 'External disks' },
  { id: 'drives', label: 'CDs/DVDs/iPods' },
  { id: 'servers', label: 'Connected servers' },
] as const`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledItem = taggedStruct('ToggledItem', { item: S.Literals(['disks', 'external', 'drives', 'servers']), isChecked: S.Boolean });
export const Message = S.Union([ToggledItem])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { disks: true, external: true, drives: false, servers: false } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledItem': return { model: { ...model, [message.item]: message.isChecked } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Checkbox group',
  body: h.main([], [
    Field.fieldSet({ children: [
      Field.fieldLegend({ children: ['Show these items on the desktop:'] }, h),
      Field.fieldDescription({ children: ['Select the items you want to show on the desktop.'] }, h),
      Field.fieldGroup({ children: items.map(item => Checkbox.checkbox({
        id: \`desktop-\${item.id}\`,
        isChecked: model[item.id],
        onToggle: isChecked => ToggledItem({ item: item.id, isChecked }),
        label: item.label,
        name: 'desktop-items',
        value: item.id,
      }, h)) }, h),
    ] }, h),
  ]),
})`,
  })

const tableSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Checkbox — table selection',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Checkbox from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/checkbox'
import * as Table from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/table'`,
    model: `export const Model = S.Struct({ selected: S.Array(S.String) })
export type Model = typeof Model.Type

const rows = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@example.com', role: 'Admin' },
  { id: '2', name: 'Marcus Rodriguez', email: 'marcus.rodriguez@example.com', role: 'User' },
  { id: '3', name: 'Priya Patel', email: 'priya.patel@example.com', role: 'User' },
  { id: '4', name: 'David Kim', email: 'david.kim@example.com', role: 'Editor' },
]`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledRow = taggedStruct('ToggledRow', { id: S.String, isChecked: S.Boolean });
export const ToggledAll = taggedStruct('ToggledAll', { isChecked: S.Boolean });
export const Message = S.Union([ToggledRow, ToggledAll])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { selected: ['1'] } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledRow': return { model: { selected: message.isChecked ? [...model.selected, message.id] : model.selected.filter(id => id !== message.id) } }
    case 'ToggledAll': return { model: { selected: message.isChecked ? rows.map(row => row.id) : [] } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Selectable table',
  body: h.main([], [
    Table.table({ children: [
      Table.tableHeader({ children: [
        Table.tableRow({ children: [
          Table.tableHead({ children: [Checkbox.checkbox({
            id: 'select-all',
            isChecked: model.selected.length === rows.length,
            onToggle: isChecked => ToggledAll({ isChecked }),
            label: h.span([h.Class('sr-only')], ['Select all rows']),
          }, h)] }, h),
          Table.tableHead({ children: ['Name'] }, h),
          Table.tableHead({ children: ['Email'] }, h),
          Table.tableHead({ children: ['Role'] }, h),
        ] }, h),
      ] }, h),
      Table.tableBody({ children: rows.map(row => Table.tableRow({
        children: [
          Table.tableCell({ children: [Checkbox.checkbox({
            id: \`row-\${row.id}\`,
            isChecked: model.selected.includes(row.id),
            onToggle: isChecked => ToggledRow({ id: row.id, isChecked }),
            label: h.span([h.Class('sr-only')], [\`Select \${row.name}\`]),
          }, h)] }, h),
          Table.tableCell({ children: [row.name] }, h),
          Table.tableCell({ children: [row.email] }, h),
          Table.tableCell({ children: [row.role] }, h),
        ],
        ...(model.selected.includes(row.id) ? { 'data-state': 'selected' } : {}),
      }, h)) }, h),
    ] }, h),
  ]),
})`,
  })

const checkboxExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  checkboxFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code:
      fixture.kind === 'group'
        ? groupSource(renderer)
        : fixture.kind === 'table'
          ? tableSource(renderer)
          : singleSource(fixture, renderer),
  }))

export const checkboxExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, checkboxExamplesFor(renderer))
