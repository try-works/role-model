import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MenubarKind =
  | 'demo'
  | 'checkbox'
  | 'radio'
  | 'submenu'
  | 'icons'
  | 'rtl'

export interface MarkerSpecItem {
  readonly id: string
  readonly label: string
  readonly shortcut?: string
  readonly disabled?: boolean
  readonly inset?: boolean
  readonly kind?: 'checkbox' | 'radio'
  readonly icon?: string
  readonly destructive?: boolean
  readonly separatorBefore?: boolean
  readonly submenu?: ReadonlyArray<MarkerSpecItem>
}

export interface MenubarSpecMenu {
  readonly target:
    | 'file'
    | 'edit'
    | 'view'
    | 'profiles'
    | 'format'
    | 'theme'
    | 'more'
  readonly label: string
  readonly contentWidth?: '11rem' | '16rem'
  readonly items: ReadonlyArray<MarkerSpecItem>
}

export const menubarTargets = [
  'file',
  'edit',
  'view',
  'profiles',
  'format',
  'theme',
  'more',
] as const
export type MenubarTarget = (typeof menubarTargets)[number]

export interface MenubarFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: MenubarKind
  readonly direction?: 'ltr' | 'rtl'
}

const ar = {
  file: 'ملف',
  newTab: 'علامة تبويب جديدة',
  newWindow: 'نافذة جديدة',
  newIncognitoWindow: 'نافذة التصفح المتخفي الجديدة',
  share: 'مشاركة',
  emailLink: 'رابط البريد الإلكتروني',
  messages: 'الرسائل',
  notes: 'الملاحظات',
  print: 'طباعة...',
  edit: 'تعديل',
  undo: 'تراجع',
  redo: 'إعادة',
  find: 'بحث',
  searchTheWeb: 'البحث على الويب',
  findItem: 'بحث...',
  findNext: 'البحث التالي',
  findPrevious: 'البحث السابق',
  cut: 'قص',
  copy: 'نسخ',
  paste: 'لصق',
  view: 'عرض',
  bookmarksBar: 'شريط الإشارات المرجعية',
  fullUrls: 'عناوين URL الكاملة',
  reload: 'إعادة تحميل',
  forceReload: 'إعادة تحميل قسري',
  toggleFullscreen: 'تبديل وضع ملء الشاشة',
  hideSidebar: 'إخفاء الشريط الجانبي',
  profiles: 'الملفات الشخصية',
  andy: 'Andy',
  benoit: 'Benoit',
  luis: 'Luis',
  editProfile: 'تعديل...',
  addProfile: 'إضافة ملف شخصي...',
} as const

const demoSpec = (
  labels: Readonly<Record<keyof typeof en, string>>,
): ReadonlyArray<MenubarSpecMenu> => [
  {
    target: 'file',
    label: labels.file,
    items: [
      { id: 'new-tab', label: labels.newTab, shortcut: '⌘T' },
      { id: 'new-window', label: labels.newWindow, shortcut: '⌘N' },
      { id: 'new-incognito', label: labels.newIncognitoWindow, disabled: true },
      {
        id: 'share',
        label: labels.share,
        separatorBefore: true,
        submenu: [
          { id: 'email-link', label: labels.emailLink },
          { id: 'messages', label: labels.messages },
          { id: 'notes', label: labels.notes },
        ],
      },
      {
        id: 'print',
        label: labels.print,
        shortcut: '⌘P',
        separatorBefore: true,
      },
    ],
  },
  {
    target: 'edit',
    label: labels.edit,
    items: [
      { id: 'undo', label: labels.undo, shortcut: '⌘Z' },
      { id: 'redo', label: labels.redo, shortcut: '⇧⌘Z' },
      {
        id: 'find',
        label: labels.find,
        separatorBefore: true,
        submenu: [
          { id: 'search-the-web', label: labels.searchTheWeb },
          { id: 'find-item', label: labels.findItem, separatorBefore: true },
          { id: 'find-next', label: labels.findNext },
          { id: 'find-previous', label: labels.findPrevious },
        ],
      },
      { id: 'cut', label: labels.cut, separatorBefore: true },
      { id: 'copy', label: labels.copy },
      { id: 'paste', label: labels.paste },
    ],
  },
  {
    target: 'view',
    label: labels.view,
    contentWidth: '11rem',
    items: [
      { id: 'bookmarks-bar', label: labels.bookmarksBar, kind: 'checkbox' },
      { id: 'full-urls', label: labels.fullUrls, kind: 'checkbox' },
      {
        id: 'reload',
        label: labels.reload,
        shortcut: '⌘R',
        inset: true,
        separatorBefore: true,
      },
      {
        id: 'force-reload',
        label: labels.forceReload,
        shortcut: '⇧⌘R',
        inset: true,
        disabled: true,
      },
      {
        id: 'toggle-fullscreen',
        label: labels.toggleFullscreen,
        inset: true,
        separatorBefore: true,
      },
      {
        id: 'hide-sidebar',
        label: labels.hideSidebar,
        inset: true,
        separatorBefore: true,
      },
    ],
  },
  {
    target: 'profiles',
    label: labels.profiles,
    items: [
      { id: 'andy', label: labels.andy, kind: 'radio' },
      { id: 'benoit', label: labels.benoit, kind: 'radio' },
      { id: 'luis', label: labels.luis, kind: 'radio' },
      {
        id: 'edit-profile',
        label: labels.editProfile,
        inset: true,
        separatorBefore: true,
      },
      {
        id: 'add-profile',
        label: labels.addProfile,
        inset: true,
        separatorBefore: true,
      },
    ],
  },
]

const en = {
  file: 'File',
  newTab: 'New Tab',
  newWindow: 'New Window',
  newIncognitoWindow: 'New Incognito Window',
  share: 'Share',
  emailLink: 'Email link',
  messages: 'Messages',
  notes: 'Notes',
  print: 'Print...',
  edit: 'Edit',
  undo: 'Undo',
  redo: 'Redo',
  find: 'Find',
  searchTheWeb: 'Search the web',
  findItem: 'Find...',
  findNext: 'Find Next',
  findPrevious: 'Find Previous',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  view: 'View',
  bookmarksBar: 'Bookmarks Bar',
  fullUrls: 'Full URLs',
  reload: 'Reload',
  forceReload: 'Force Reload',
  toggleFullscreen: 'Toggle Fullscreen',
  hideSidebar: 'Hide Sidebar',
  profiles: 'Profiles',
  andy: 'Andy',
  benoit: 'Benoit',
  luis: 'Luis',
  editProfile: 'Edit...',
  addProfile: 'Add Profile...',
}

export const menubarSpecs: Record<
  MenubarKind,
  ReadonlyArray<MenubarSpecMenu>
> = {
  demo: demoSpec(en),
  rtl: demoSpec(ar),
  checkbox: [
    {
      target: 'view',
      label: 'View',
      contentWidth: '16rem',
      items: [
        {
          id: 'bookmarks-bar',
          label: 'Always Show Bookmarks Bar',
          kind: 'checkbox',
        },
        { id: 'full-urls', label: 'Always Show Full URLs', kind: 'checkbox' },
        {
          id: 'reload',
          label: 'Reload',
          shortcut: '⌘R',
          inset: true,
          separatorBefore: true,
        },
        {
          id: 'force-reload',
          label: 'Force Reload',
          shortcut: '⇧⌘R',
          inset: true,
          disabled: true,
        },
      ],
    },
    {
      target: 'format',
      label: 'Format',
      items: [
        { id: 'strikethrough', label: 'Strikethrough', kind: 'checkbox' },
        { id: 'code', label: 'Code', kind: 'checkbox' },
        { id: 'superscript', label: 'Superscript', kind: 'checkbox' },
      ],
    },
  ],
  radio: [
    {
      target: 'profiles',
      label: 'Profiles',
      items: [
        { id: 'andy', label: 'Andy', kind: 'radio' },
        { id: 'benoit', label: 'Benoit', kind: 'radio' },
        { id: 'luis', label: 'Luis', kind: 'radio' },
        {
          id: 'edit-profile',
          label: 'Edit...',
          inset: true,
          separatorBefore: true,
        },
        {
          id: 'add-profile',
          label: 'Add Profile...',
          inset: true,
          separatorBefore: true,
        },
      ],
    },
    {
      target: 'theme',
      label: 'Theme',
      items: [
        { id: 'light', label: 'Light', kind: 'radio' },
        { id: 'dark', label: 'Dark', kind: 'radio' },
        { id: 'system', label: 'System', kind: 'radio' },
      ],
    },
  ],
  submenu: [
    {
      target: 'file',
      label: 'File',
      items: [
        {
          id: 'share',
          label: 'Share',
          submenu: [
            { id: 'email-link', label: 'Email link' },
            { id: 'messages', label: 'Messages' },
            { id: 'notes', label: 'Notes' },
          ],
        },
        {
          id: 'print',
          label: 'Print...',
          shortcut: '⌘P',
          separatorBefore: true,
        },
      ],
    },
    {
      target: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: '⌘Z' },
        { id: 'redo', label: 'Redo', shortcut: '⇧⌘Z' },
        {
          id: 'find',
          label: 'Find',
          separatorBefore: true,
          submenu: [
            { id: 'find-item', label: 'Find...' },
            { id: 'find-next', label: 'Find Next' },
            { id: 'find-previous', label: 'Find Previous' },
          ],
        },
        { id: 'cut', label: 'Cut', separatorBefore: true },
        { id: 'copy', label: 'Copy' },
        { id: 'paste', label: 'Paste' },
      ],
    },
  ],
  icons: [
    {
      target: 'file',
      label: 'File',
      items: [
        { id: 'new-file', label: 'New File', icon: 'file', shortcut: '⌘N' },
        { id: 'open-folder', label: 'Open Folder', icon: 'folder' },
        {
          id: 'save',
          label: 'Save',
          icon: 'save',
          shortcut: '⌘S',
          separatorBefore: true,
        },
      ],
    },
    {
      target: 'more',
      label: 'More',
      items: [
        { id: 'settings', label: 'Settings', icon: 'settings' },
        { id: 'help', label: 'Help', icon: 'circle-question-mark' },
        {
          id: 'delete',
          label: 'Delete',
          icon: 'trash',
          destructive: true,
          separatorBefore: true,
        },
      ],
    },
  ],
}

export const menubarFixtures: Readonly<
  [MenubarFixture, ...Array<MenubarFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Checkbox',
    description: 'Use checkbox items to toggle persistent menu state.',
    kind: 'checkbox',
  },
  {
    title: 'Radio',
    description: 'Use radio groups for mutually exclusive menu options.',
    kind: 'radio',
  },
  {
    title: 'Submenu',
    description: 'Nest related commands behind a submenu trigger.',
    kind: 'submenu',
  },
  {
    title: 'With Icons',
    description:
      'Prefix menu items with icons, including a destructive action.',
    kind: 'icons',
  },
  { title: 'RTL', kind: 'rtl', direction: 'rtl' },
]

const sq = (value: string): string => value.replaceAll("'", "\\'")

/** Checkbox item id -> the Model boolean field tracking it. */
export const checkboxField: Record<
  string,
  | 'checkedBookmarksBar'
  | 'checkedFullUrls'
  | 'checkedStrikethrough'
  | 'checkedCode'
  | 'checkedSuperscript'
> = {
  'bookmarks-bar': 'checkedBookmarksBar',
  'full-urls': 'checkedFullUrls',
  strikethrough: 'checkedStrikethrough',
  code: 'checkedCode',
  superscript: 'checkedSuperscript',
}
/** Radio item id -> the Model string field tracking it. */
export const radioField: Record<string, 'radioUser' | 'radioTheme'> = {
  andy: 'radioUser',
  benoit: 'radioUser',
  luis: 'radioUser',
  light: 'radioTheme',
  dark: 'radioTheme',
  system: 'radioTheme',
}

const checkedExpr = (item: MarkerSpecItem): string | undefined => {
  const field = checkboxField[item.id]
  if (item.kind === 'checkbox' && field !== undefined) return `model.${field}`
  const rfield = radioField[item.id]
  if (item.kind === 'radio' && rfield !== undefined)
    return `model.${rfield} === '${item.id}'`
  return undefined
}

const emitItemConfig = (item: MarkerSpecItem, indent: string): string => {
  const fields: Array<string> = [`label: '${sq(item.label)}'`]
  if (item.icon !== undefined)
    fields.push(`icon: Icon.icon('${item.icon}', {}, h)`)
  if (item.shortcut !== undefined) fields.push(`shortcut: '${item.shortcut}'`)
  if (item.kind !== undefined) fields.push(`kind: '${item.kind}'`)
  const checked = checkedExpr(item)
  if (checked !== undefined) fields.push(`isChecked: ${checked}`)
  if (item.inset === true) fields.push('isInset: true')
  if (item.disabled === true) fields.push('isDisabled: true')
  if (item.destructive === true) fields.push(`variant: 'destructive'`)
  if (item.separatorBefore === true) fields.push('separatorBefore: true')
  if (item.submenu !== undefined) {
    const children = item.submenu
      .map(
        child =>
          `case '${child.id}':\n${indent}        return ${emitItemConfig(child, indent + '        ')}`,
      )
      .join('\n' + indent + '        ')
    fields.push(`submenu: {
${indent}      items: [${item.submenu.map(child => `'${child.id}'`).join(', ')}],
${indent}      itemToConfig: (child: string) => {
${indent}        switch (child) {
${indent}        ${children}
${indent}        default:
${indent}          return { label: child }
${indent}        }
${indent}      },
${indent}    }`)
  }
  return `{ ${fields.join(', ')} }`
}

const emitItemToConfig = (menu: MenubarSpecMenu, indent: string): string => {
  const cases = menu.items
    .map(
      item =>
        `case '${item.id}':\n${indent}      return ${emitItemConfig(item, indent + '      ')}`,
    )
    .join('\n' + indent + '    ')
  return `(item: string) => {
${indent}    switch (item) {
${indent}    ${cases}
${indent}    default:
${indent}      return { label: item }
${indent}    }
${indent}  }`
}

const emitMenu = (menu: MenubarSpecMenu, isStyleX: boolean): string => {
  const indent = '      '
  const widthProp =
    menu.contentWidth === undefined
      ? ''
      : `\n${indent}  ${isStyleX ? `contentLayoutStyle: styles.content${menu.contentWidth.replace('.', '')}` : `contentClass: 'w-${menu.contentWidth === '11rem' ? '44' : '64'}'`},`
  return `{
${indent}  id: 'menu-${menu.target}',
${indent}  label: '${sq(menu.label)}',
${indent}  isSelected: Option.contains(model.selectedMenu, '${menu.target}'),
${indent}  onSelect: Message.SelectedMenubarMenu({ target: '${menu.target}' }),
${indent}  model: model.${menu.target},${widthProp}
${indent}  toParentMessage: message => Message.GotMenuMessage({ target: '${menu.target}', message }),
${indent}  items: [${menu.items.map(item => `'${item.id}'`).join(', ')}],
${indent}  itemToConfig: ${emitItemToConfig(menu, indent)},
${indent}}`
}

const emitImports = (fixture: MenubarFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts: Array<string> = [
    "import { Option, Schema as S } from 'effect'",
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
  parts.push(`import * as DropdownMenu from '@/${base}/dropdown-menu'`)
  if (fixture.kind === 'icons') {
    parts.push(`import * as Icon from '@/lib/icon'`)
  }
  parts.push(`import * as Menubar from '@/${base}/menubar'`)
  return parts.join('\n')
}

const emitStyles = (fixture: MenubarFixture): string => {
  const spec = menubarSpecs[fixture.kind]
  const extras: Array<string> = ["  menubar: { width: '18rem' },"]
  for (const menu of spec) {
    if (menu.contentWidth !== undefined) {
      extras.push(
        `  content${menu.contentWidth.replace('.', '')}: { width: '${menu.contentWidth}' },`,
      )
    }
  }
  return extras.join('\n')
}

const emitModel =
  (): string => `export const MenuTarget = S.Literals(['file', 'edit', 'view', 'profiles', 'format', 'theme', 'more'])
export type MenuTarget = typeof MenuTarget.Type
export const Model = S.Struct({
  file: DropdownMenu.Model,
  edit: DropdownMenu.Model,
  view: DropdownMenu.Model,
  profiles: DropdownMenu.Model,
  format: DropdownMenu.Model,
  theme: DropdownMenu.Model,
  more: DropdownMenu.Model,
  menubar: Menubar.Model,
  selectedMenu: S.Option(MenuTarget),
  checkedBookmarksBar: S.Boolean,
  checkedFullUrls: S.Boolean,
  checkedStrikethrough: S.Boolean,
  checkedCode: S.Boolean,
  checkedSuperscript: S.Boolean,
  radioUser: S.String,
  radioTheme: S.String,
})
export type Model = typeof Model.Type`

const emitMessages = (): string => `export const Message = defineMessageUnion({
  SelectedMenubarMenu: { target: MenuTarget },
  GotMenuMessage: { target: MenuTarget, message: DropdownMenu.Message },
  GotMenubarMessage: { message: Menubar.Message },
})
export type Message = typeof Message.Type`

const emitInit =
  (): string => `export const init = (): Update.Return<Model, Message> => ({ model: {
  file: DropdownMenu.init({ id: 'menu-file' }),
  edit: DropdownMenu.init({ id: 'menu-edit' }),
  view: DropdownMenu.init({ id: 'menu-view' }),
  profiles: DropdownMenu.init({ id: 'menu-profiles' }),
  format: DropdownMenu.init({ id: 'menu-format' }),
  theme: DropdownMenu.init({ id: 'menu-theme' }),
  more: DropdownMenu.init({ id: 'menu-more' }),
  menubar: Menubar.init({ id: 'application-menubar' }),
  selectedMenu: Option.none(),
  checkedBookmarksBar: false,
  checkedFullUrls: true,
  checkedStrikethrough: true,
  checkedCode: false,
  checkedSuperscript: false,
  radioUser: 'benoit',
  radioTheme: 'system',
} })`

const emitUpdate = (
  fixture: MenubarFixture,
): string => `const ActionMenu = DropdownMenu.create<string>()
const targets: ReadonlyArray<MenuTarget> = [${menubarSpecs[fixture.kind].map(menu => `'${menu.target}'`).join(', ')}]

const applySelection = (model: Model, value: string): Model => {
  switch (value) {
    case 'bookmarks-bar':
      return { ...model, checkedBookmarksBar: !model.checkedBookmarksBar }
    case 'full-urls':
      return { ...model, checkedFullUrls: !model.checkedFullUrls }
    case 'strikethrough':
      return { ...model, checkedStrikethrough: !model.checkedStrikethrough }
    case 'code':
      return { ...model, checkedCode: !model.checkedCode }
    case 'superscript':
      return { ...model, checkedSuperscript: !model.checkedSuperscript }
    case 'andy':
    case 'benoit':
    case 'luis':
      return { ...model, radioUser: value }
    case 'light':
    case 'dark':
    case 'system':
      return { ...model, radioTheme: value }
    default:
      return model
  }
}

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'SelectedMenubarMenu':
      return { model: { ...model, selectedMenu: Option.some(message.target) } }
    case 'GotMenuMessage': {
      const menuOp__ = ActionMenu.update(model[message.target], message.message)
      const menu = menuOp__.model
      const commands = menuOp__.commands ?? []
      const maybeSelection = Option.fromNullishOr(menuOp__.outMessage)
      const toggled = Option.match(maybeSelection, {
        onNone: () => model,
        onSome: selection => applySelection(model, selection.value),
      })
      const next = targets.reduce(
        (acc, target) => ({
          ...acc,
          [target]: target === message.target ? menu : DropdownMenu.close(acc[target]).model,
        }),
        toggled,
      )
      return {
        model: next,
        commands: Command.mapMessages(commands, next2 => Message.GotMenuMessage({ target: message.target, message: next2 })),
      }
    }
    case 'GotMenubarMessage': {
      const menubarOp__ = Menubar.update(model.menubar, message.message)
      const menubar = menubarOp__.model
      const commands = menubarOp__.commands ?? []
      const maybeMove = Option.fromNullishOr(menubarOp__.outMessage)
      const index = Option.match(maybeMove, { onNone: () => menubar.activeIndex, onSome: move => move.index })
      const target = targets[index]
      if (target === undefined) return { model: model }
      const next = targets.reduce(
        (acc, t) => ({
          ...acc,
          [t]: (t === target ? DropdownMenu.open(acc[t]) : DropdownMenu.close(acc[t])).model,
        }),
        { ...model, menubar },
      )
      return {
        model: next,
        commands: Command.mapMessages(commands, next2 => Message.GotMenubarMessage({ message: next2 })),
      }
    }
  }
}`

const emitBody = (fixture: MenubarFixture, isStyleX: boolean): string => {
  const spec = menubarSpecs[fixture.kind]
  const direction = fixture.direction === 'rtl' ? `\n    direction: 'rtl',` : ''
  return `    Menubar.menubar<string, Message>({
    ariaLabel: 'Application menu',${direction}
    model: model.menubar,
    toParentMessage: message => Message.GotMenubarMessage({ message }),
    ${isStyleX ? 'layoutStyle: layoutStyle({ width: "18rem" }),' : "class: 'w-72',"}
    menus: [
${spec.map(menu => emitMenu(menu, isStyleX)).join(',\n')}
    ],
  }, h),`
}

const emitApplication = (
  fixture: MenubarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX ? emitStyles(fixture) : ''
  const bodyStart = isStyleX
    ? `h.main([h.Class(stylex.props(styles.page).className ?? '')], [`
    : `h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [`
  const pageStyle = isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem' },${
    stylesBlock === ''
      ? ''
      : `
${stylesBlock}`
  }
})

`
    : ''
  return foldkitApplication({
    title: `Menubar — ${fixture.title}`,
    imports: `${emitImports(fixture, isStyleX)}\n\n${pageStyle}`,
    model: emitModel(),
    messages: emitMessages(),
    init: emitInit(),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Menubar — ${sq(fixture.title)}',
  body: ${bodyStart}
    ${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const menubarExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  menubarFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const menubarExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, menubarExamplesFor(renderer))
