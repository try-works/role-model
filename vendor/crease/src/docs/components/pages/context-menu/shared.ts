import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { DropdownMenuItemSpec } from '@/docs/components/pages/dropdown-menu/shared'

export type ContextMenuFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  items: ReadonlyArray<DropdownMenuItemSpec>
  checkedValues?: ReadonlyArray<string>
  peopleValue?: string
  themeValue?: string
  direction?: 'ltr' | 'rtl'
  keepOpenOnCheckableSelect?: boolean
}>

export const contextMenuFixtures: ReadonlyArray<ContextMenuFixture> = [
  {
    title: 'Demo',
    heroOnly: true,
    items: [
      { value: 'back', label: 'Back' },
      { value: 'forward', label: 'Forward', isDisabled: true },
      { value: 'reload', label: 'Reload' },
    ],
  },
  {
    title: 'Basic',
    description: 'Right-clicking the target opens a grouped action menu.',
    items: [
      { value: 'back', label: 'Back', group: 'Actions' },
      { value: 'forward', label: 'Forward', isDisabled: true },
      { value: 'reload', label: 'Reload' },
    ],
  },
  {
    title: 'Submenu',
    description:
      'Items can open nested submenus with their own groups and separators.',
    items: [
      { value: 'copy', label: 'Copy', shortcut: '⌘C' },
      { value: 'cut', label: 'Cut', shortcut: '⌘X' },
      {
        value: 'more-tools',
        label: 'More Tools',
        submenu: [
          { value: 'save-page', label: 'Save Page...', group: 'Page' },
          { value: 'create-shortcut', label: 'Create Shortcut...' },
          { value: 'name-window', label: 'Name Window...' },
          {
            value: 'developer-tools',
            label: 'Developer Tools',
            group: 'Developer',
          },
          {
            value: 'delete',
            label: 'Delete',
            variant: 'destructive',
            group: 'Danger',
          },
        ],
      },
    ],
  },
  {
    title: 'Shortcuts',
    description: 'The shortcut field renders a right-aligned keyboard hint.',
    items: [
      { value: 'back', label: 'Back', shortcut: '⌘[', group: 'Navigate' },
      { value: 'forward', label: 'Forward', shortcut: '⌘]', isDisabled: true },
      { value: 'reload', label: 'Reload', shortcut: '⌘R' },
      { value: 'save', label: 'Save', shortcut: '⌘S', group: 'File' },
      { value: 'save-as', label: 'Save As...', shortcut: '⇧⌘S' },
    ],
  },
  {
    title: 'Groups',
    description: 'Labeled groups and separators organize related actions.',
    items: [
      { value: 'new-file', label: 'New File', shortcut: '⌘N', group: 'File' },
      { value: 'open-file', label: 'Open File', shortcut: '⌘O' },
      { value: 'save', label: 'Save', shortcut: '⌘S' },
      { value: 'undo', label: 'Undo', shortcut: '⌘Z', group: 'Edit' },
      { value: 'redo', label: 'Redo', shortcut: '⇧⌘Z' },
      { value: 'cut', label: 'Cut', shortcut: '⌘X', group: 'Clipboard' },
      { value: 'copy', label: 'Copy', shortcut: '⌘C' },
      { value: 'paste', label: 'Paste', shortcut: '⌘V' },
      {
        value: 'delete',
        label: 'Delete',
        variant: 'destructive',
        group: 'Danger',
      },
    ],
  },
  {
    title: 'Icons',
    description: 'Items render a leading Lucide icon before the label.',
    items: [
      { value: 'copy', label: 'Copy', icon: 'copy' },
      { value: 'cut', label: 'Cut', icon: 'scissors' },
      { value: 'paste', label: 'Paste', icon: 'clipboard-paste' },
      {
        value: 'delete',
        label: 'Delete',
        icon: 'trash-2',
        variant: 'destructive',
        group: 'Danger',
      },
    ],
  },
  {
    title: 'Checkboxes',
    description:
      "kind: 'checkbox' items carry checked state; the parent owns the toggle. keepOpenOnCheckableSelect keeps the menu open between picks.",
    keepOpenOnCheckableSelect: true,
    checkedValues: ['bookmarks-bar', 'developer-tools'],
    items: [
      {
        value: 'bookmarks-bar',
        label: 'Show Bookmarks Bar',
        kind: 'checkbox',
        group: 'View',
      },
      { value: 'full-urls', label: 'Show Full URLs', kind: 'checkbox' },
      {
        value: 'developer-tools',
        label: 'Show Developer Tools',
        kind: 'checkbox',
      },
    ],
  },
  {
    title: 'Radio',
    description:
      'Independent radio groups keep one selection each, scoped by group. keepOpenOnCheckableSelect keeps the menu open between picks.',
    keepOpenOnCheckableSelect: true,
    peopleValue: 'pedro',
    themeValue: 'system',
    items: [
      { value: 'pedro', label: 'Pedro Duarte', kind: 'radio', group: 'People' },
      { value: 'colm', label: 'Colm Tuite', kind: 'radio', group: 'People' },
      { value: 'light', label: 'Light', kind: 'radio', group: 'Theme' },
      { value: 'dark', label: 'Dark', kind: 'radio', group: 'Theme' },
      { value: 'system', label: 'System', kind: 'radio', group: 'Theme' },
    ],
  },
  {
    title: 'Destructive',
    description: "variant: 'destructive' styles the item in the danger color.",
    items: [
      { value: 'edit', label: 'Edit', icon: 'pencil' },
      { value: 'share', label: 'Share', icon: 'share' },
      {
        value: 'delete',
        label: 'Delete',
        icon: 'trash-2',
        variant: 'destructive',
        group: 'Danger',
      },
    ],
  },
  {
    title: 'RTL',
    description:
      "direction: 'rtl' mirrors items, icons and submenus for right-to-left layouts.",
    direction: 'rtl',
    items: [
      {
        value: 'navigation',
        label: 'التنقل',
        submenu: [
          {
            value: 'back',
            label: 'رجوع',
            icon: 'arrow-left',
            shortcut: '⌘[',
            group: 'التنقل',
          },
          {
            value: 'forward',
            label: 'للأمام',
            icon: 'arrow-right',
            shortcut: '⌘]',
            isDisabled: true,
          },
          {
            value: 'reload',
            label: 'إعادة تحميل',
            icon: 'rotate-cw',
            shortcut: '⌘R',
          },
        ],
      },
      {
        value: 'more-tools',
        label: 'المزيد من الأدوات',
        submenu: [
          { value: 'save-page', label: 'حفظ الصفحة', group: 'الصفحة' },
          { value: 'create-shortcut', label: 'إنشاء اختصار' },
          { value: 'name-window', label: 'تسمية النافذة' },
          { value: 'developer-tools', label: 'أدوات المطور', group: 'المطور' },
          {
            value: 'delete',
            label: 'حذف',
            variant: 'destructive',
            group: 'خطر',
          },
        ],
      },
    ],
  },
]

export const fixtureItems = (
  fixture: ContextMenuFixture,
): ReadonlyArray<string> => fixture.items.map(item => item.value)

export const fixtureLabel = (
  fixture: ContextMenuFixture,
  value: string,
): string => {
  const flat = fixture.items.flatMap(item => [item, ...(item.submenu ?? [])])
  return flat.find(item => item.value === value)?.label ?? value
}

export const checkboxValues = (
  fixture: ContextMenuFixture,
): ReadonlyArray<string> =>
  fixture.items
    .flatMap(item => [item, ...(item.submenu ?? [])])
    .filter(item => item.kind === 'checkbox')
    .map(item => item.value)

export const radioValuesFor = (
  fixture: ContextMenuFixture,
  group: string,
): ReadonlyArray<string> =>
  fixture.items
    .flatMap(item => [item, ...(item.submenu ?? [])])
    .filter(item => item.kind === 'radio' && item.group === group)
    .map(item => item.value)

const itemConfigSource = (spec: DropdownMenuItemSpec): string => {
  const fields: Array<string> = [
    `label: '${spec.label.replaceAll("'", "\\'")}'`,
  ]
  if (spec.icon !== undefined)
    fields.push(`icon: Icon.icon('${spec.icon}', { class: 'size-4' }, h)`)
  if (spec.shortcut !== undefined)
    fields.push(`shortcut: '${spec.shortcut.replaceAll("'", "\\'")}'`)
  if (spec.kind !== undefined) {
    fields.push(`kind: '${spec.kind}'`)
    fields.push('isInset: true')
  }
  if (spec.variant === 'destructive') fields.push(`variant: 'destructive'`)
  if (spec.isDisabled === true) fields.push('isDisabled: true')
  if (spec.group !== undefined)
    fields.push(`group: '${spec.group.replaceAll("'", "\\'")}'`)
  if (spec.submenu !== undefined) {
    const items = spec.submenu.map(item => `'${item.value}'`).join(', ')
    fields.push(
      `submenu: { items: [${items}], itemToConfig: item => configs[item] }`,
    )
  }
  return `${JSON.stringify(spec.value)}: { ${fields.join(', ')} }`
}

const allItemSpecs = (
  fixture: ContextMenuFixture,
): ReadonlyArray<DropdownMenuItemSpec> =>
  fixture.items.flatMap(item => [item, ...(item.submenu ?? [])])

const source = (
  fixture: ContextMenuFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const uiDir = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const specs = allItemSpecs(fixture)
  const usesIcons = specs.some(spec => spec.icon !== undefined)
  const usesCheckbox = specs.some(spec => spec.kind === 'checkbox')
  const usesRadio = specs.some(spec => spec.kind === 'radio')
  const literalValues = specs.map(spec => `'${spec.value}'`).join(', ')
  const topLevelValues = fixtureItems(fixture)
    .map(value => `'${value}'`)
    .join(', ')
  const radioGroups = [
    ...new Set(specs.filter(s => s.kind === 'radio').map(s => s.group ?? '')),
  ]
  const radioField = (group: string): string =>
    `${group.charAt(0).toLowerCase()}${group.slice(1)}Value`
  const radioSeed = (group: string): string | undefined =>
    group === 'People' ? fixture.peopleValue : fixture.themeValue
  const radioFields = radioGroups.map(
    group => `  ${radioField(group)}: S.Option(Item),`,
  )
  const radioInit = radioGroups.map(group => {
    const seed = radioSeed(group)
    return `    ${radioField(group)}: ${seed === undefined ? 'Option.none()' : `Option.some('${seed}')`},`
  })
  const radioUpdate = radioGroups.map(group => {
    const field = radioField(group)
    const values = radioValuesFor(fixture, group)
      .map(v => `'${v}'`)
      .join(', ')
    return `      const ${field} = Option.match(maybeSelection, {
        onNone: () => model.${field},
        onSome: selection => [${values}].includes(selection.value) ? Option.some(selection.value) : model.${field},
      })`
  })
  const radioSpread = radioGroups
    .map(group => `, ${radioField(group)}`)
    .join('')
  const itemToConfigSource = usesCheckbox
    ? `itemToConfig: item => ({ ...configs[item], isChecked: model.checkedValues.includes(item) }),`
    : usesRadio
      ? `itemToConfig: item => ({ ...configs[item], isChecked: Option.contains(radioSelections[configs[item].group ?? ''] ?? Option.none(), item) }),`
      : 'itemToConfig: item => configs[item],'
  return foldkitApplication({
    title: `Context Menu — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as ContextMenu from '@/${uiDir}/context-menu'${usesIcons ? `\nimport * as Icon from '@/lib/icon'` : ''}${
      renderer !== 'tailwind'
        ? `
import * as stylex from '@stylexjs/stylex'

import { className } from '@/stylex/style'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  targetInner: {
    display: 'flex',
    width: '20rem',
    aspectRatio: '16 / 9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-xl)',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: 'var(--border)',
    fontSize: '0.875rem', lineHeight: '1.25rem',
  },
})`
        : ''
    }`,
    model: `export const Item = S.Literals([${literalValues}])
export type Item = typeof Item.Type
export const Model = S.Struct({
  menu: ContextMenu.Model,
  maybeLastAction: S.Option(Item),
${[usesCheckbox ? '  checkedValues: S.Array(Item),' : '', ...radioFields].filter(Boolean).join('\n')}
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotMenuMessage = taggedStruct('GotContextMenuMessage${tag}', { message: ContextMenu.Message });
export const Message = S.Union([GotMenuMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    menu: ContextMenu.init({ id: 'ctx-${tag.toLowerCase()}', isAnimated: true }),
    maybeLastAction: Option.none(),
${[usesCheckbox ? `    checkedValues: [${(fixture.checkedValues ?? []).map(v => `'${v}'`).join(', ')}],` : '', ...radioInit].filter(Boolean).join('\n')}
  },
})`,
    update: `const Menu = ContextMenu.create<Item>()

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotContextMenuMessage${tag}': {
      const menuOp__ = Menu.update(model.menu, message.message);
      const menu = menuOp__.model;
      const commands = menuOp__.commands ?? [];
      const maybeSelection = Option.fromNullishOr(menuOp__.outMessage);
      const maybeLastAction = Option.match(maybeSelection, {
        onNone: () => model.maybeLastAction,
        onSome: selection => Option.some(selection.value),
      })
${[
  usesCheckbox
    ? `      const checkedValues = Option.match(maybeSelection, {
        onNone: () => model.checkedValues,
        onSome: selection =>
          model.checkedValues.includes(selection.value)
            ? model.checkedValues.filter(value => value !== selection.value)
            : [...model.checkedValues, selection.value],
      })`
    : '',
  ...radioUpdate,
]
  .filter(Boolean)
  .join('\n')}
      return { model: { ...model, menu, maybeLastAction${usesCheckbox ? ', checkedValues' : ''}${radioSpread} }, commands: Command.mapMessages(commands, next => GotMenuMessage({ message: next })) }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const configs: Record<Item, ContextMenu.ContextMenuItemConfig<Item>> = {
    ${specs.map(itemConfigSource).join(',\n    ')},
  }${
    usesRadio
      ? `
  const radioSelections: Record<string, Option.Option<Item>> = { ${radioGroups.map(group => `'${group}': model.${radioField(group)}`).join(', ')} }`
      : ''
  }
  return {
    title: 'Context Menu — ${fixture.title}',
    body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen flex-col items-center justify-center gap-4 p-8'"})], [
      ContextMenu.contextMenu({
        model: model.menu,
        toParentMessage: message => GotMenuMessage({ message }),
        ${
          renderer !== 'tailwind'
            ? `trigger: h.div([h.Class(className(styles.targetInner))], ['Right click here']),`
            : `trigger: h.div([h.Class('flex aspect-video w-80 items-center justify-center rounded-xl border border-dashed text-sm')], ['Right click here']),`
        }
        ariaLabel: '${fixture.title} menu',
        items: [${topLevelValues}]${specs.some(spec => spec.submenu !== undefined) ? ' as ReadonlyArray<Item>' : ''},
        ${itemToConfigSource}
        ${fixture.keepOpenOnCheckableSelect === true ? 'keepOpenOnCheckableSelect: true,' : ''}
        ${fixture.direction === 'rtl' ? "direction: 'rtl'," : ''}
      }, h),
      h.p([h.Role('status'), h.Class('text-sm text-muted-foreground')], [
        Option.match(model.maybeLastAction, {
          onNone: () => 'No action selected',
          onSome: value => \`Selected: \${configs[value].label}\`,
        }),
      ]),
    ]),
  }
}`,
  })
}

const contextMenuExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  contextMenuFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const contextMenuExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, contextMenuExamplesFor(renderer))
