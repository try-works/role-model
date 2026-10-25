import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type DropdownMenuItemSpec = Readonly<{
  value: string
  label: string
  icon?: string
  shortcut?: string
  kind?: 'checkbox' | 'radio'
  variant?: 'destructive'
  isDisabled?: boolean
  group?: string
  submenu?: ReadonlyArray<DropdownMenuItemSpec>
}>

export type DropdownMenuTriggerSpec = Readonly<
  { kind: 'button'; label: string } | { kind: 'avatar'; initials: string }
>

export type DropdownMenuFixture = Readonly<{
  title: string
  description: string
  trigger: DropdownMenuTriggerSpec
  items: ReadonlyArray<DropdownMenuItemSpec>
  checkedValues?: ReadonlyArray<string>
  radioValue?: string
  direction?: 'ltr' | 'rtl'
  keepOpenOnCheckableSelect?: boolean
}>

export const dropdownMenuFixtures: Readonly<
  [DropdownMenuFixture, ...Array<DropdownMenuFixture>]
> = [
  {
    title: 'Basic',
    description:
      'A basic dropdown menu: a labeled group and a separator between sections.',
    trigger: { kind: 'button', label: 'Open' },
    items: [
      { value: 'profile', label: 'Profile', group: 'My Account' },
      { value: 'billing', label: 'Billing', group: 'My Account' },
      { value: 'team', label: 'Team' },
      { value: 'subscription', label: 'Subscription' },
    ],
  },
  {
    title: 'Submenu',
    description:
      'An item can open a nested submenu; submenu children use their own itemToConfig.',
    trigger: { kind: 'button', label: 'Open' },
    items: [
      { value: 'profile', label: 'Profile', group: 'My Account' },
      { value: 'billing', label: 'Billing', group: 'My Account' },
      {
        value: 'invite',
        label: 'Invite users',
        group: 'My Account',
        submenu: [
          { value: 'invite-email', label: 'Invite by email' },
          { value: 'invite-message', label: 'Invite via message' },
          { value: 'invite-more', label: 'More options…' },
        ],
      },
    ],
  },
  {
    title: 'Shortcuts',
    description:
      'The shortcut field renders a right-aligned keyboard hint span.',
    trigger: { kind: 'button', label: 'Open' },
    items: [
      { value: 'back', label: 'Back', shortcut: '⌘[', group: 'Browser' },
      { value: 'forward', label: 'Forward', shortcut: '⌘]' },
      { value: 'reload', label: 'Reload', shortcut: '⌘R' },
      {
        value: 'more-tools',
        label: 'More tools',
        submenu: [
          { value: 'save-page', label: 'Save page', shortcut: '⌘S' },
          { value: 'create-shortcut', label: 'Create shortcut' },
          { value: 'name-window', label: 'Name window', isDisabled: true },
          {
            value: 'developer-tools',
            label: 'Developer tools',
            shortcut: '⌘I',
          },
        ],
      },
      {
        value: 'show-bookmarks',
        label: 'Show bookmarks',
        shortcut: '⌘⇧B',
        group: 'View',
      },
      { value: 'show-full-urls', label: 'Show full URLs' },
    ],
  },
  {
    title: 'Icons',
    description: 'Items render a leading Lucide icon before the label.',
    trigger: { kind: 'button', label: 'Open' },
    items: [
      { value: 'profile', label: 'Profile', icon: 'user', group: 'My Account' },
      { value: 'billing', label: 'Billing', icon: 'credit-card' },
      { value: 'settings', label: 'Settings', icon: 'settings' },
      {
        value: 'shortcuts',
        label: 'Keyboard shortcuts',
        icon: 'keyboard',
      },
      { value: 'logout', label: 'Log out', icon: 'log-out', group: 'Session' },
    ],
  },
  {
    title: 'Checkboxes',
    description:
      "kind: 'checkbox' items carry checked state; isInset leaves room for the check indicator. keepOpenOnCheckableSelect keeps the menu open between picks.",
    keepOpenOnCheckableSelect: true,
    trigger: { kind: 'button', label: 'View options' },
    checkedValues: ['status-bar', 'activity-bar'],
    items: [
      {
        value: 'status-bar',
        label: 'Status Bar',
        kind: 'checkbox',
        group: 'Panels',
      },
      { value: 'activity-bar', label: 'Activity Bar', kind: 'checkbox' },
      { value: 'panel', label: 'Panel', kind: 'checkbox' },
      { value: 'minimap', label: 'Minimap', kind: 'checkbox' },
    ],
  },
  {
    title: 'Checkboxes Icons',
    description:
      'Checkbox items with leading icons, like notification filters. keepOpenOnCheckableSelect keeps the menu open between picks.',
    keepOpenOnCheckableSelect: true,
    trigger: { kind: 'button', label: 'Notifications' },
    checkedValues: ['comments'],
    items: [
      {
        value: 'comments',
        label: 'Comments and mentions',
        kind: 'checkbox',
        icon: 'message-square',
      },
      {
        value: 'activity',
        label: 'All activity',
        kind: 'checkbox',
        icon: 'activity',
      },
      {
        value: 'mentions',
        label: 'Mentions only',
        kind: 'checkbox',
        icon: 'bell',
      },
    ],
  },
  {
    title: 'Radio Group',
    description:
      "kind: 'radio' items implement a single selection within the menu. keepOpenOnCheckableSelect keeps the menu open between picks.",
    keepOpenOnCheckableSelect: true,
    trigger: { kind: 'button', label: 'Open' },
    radioValue: 'top',
    items: [
      {
        value: 'top',
        label: 'Top',
        kind: 'radio',
        group: 'Panel Position',
      },
      { value: 'bottom', label: 'Bottom', kind: 'radio' },
      { value: 'right', label: 'Right', kind: 'radio' },
    ],
  },
  {
    title: 'Radio Icons',
    description:
      'Radio items with icons for a single-choice picker, like payment methods. keepOpenOnCheckableSelect keeps the menu open between picks.',
    keepOpenOnCheckableSelect: true,
    trigger: { kind: 'button', label: 'Payment Method' },
    radioValue: 'card',
    items: [
      { value: 'card', label: 'Card', kind: 'radio', icon: 'credit-card' },
      { value: 'paypal', label: 'PayPal', kind: 'radio', icon: 'wallet' },
      { value: 'apple', label: 'Apple Pay', kind: 'radio', icon: 'wallet' },
    ],
  },
  {
    title: 'Destructive',
    description:
      "variant: 'destructive' styles the item in the danger color; selection still emits the typed action.",
    trigger: { kind: 'button', label: 'Actions' },
    items: [
      { value: 'edit', label: 'Edit', icon: 'pencil' },
      { value: 'share', label: 'Share', icon: 'share' },
      {
        value: 'delete',
        label: 'Delete',
        icon: 'trash-2',
        variant: 'destructive',
      },
    ],
  },
  {
    title: 'Avatar',
    description:
      'Any Html works as the trigger — here an avatar, like an account switcher.',
    trigger: { kind: 'avatar', initials: 'LP' },
    items: [
      {
        value: 'profile',
        label: 'Profile',
        icon: 'user',
        group: 'Lukas Pottner',
      },
      { value: 'billing', label: 'Billing', icon: 'credit-card' },
      { value: 'switch-account', label: 'Switch account', icon: 'refresh-cw' },
      { value: 'logout', label: 'Log out', icon: 'log-out' },
    ],
  },
  {
    title: 'Complex',
    description:
      'Group labels, icons, shortcuts, a submenu and a destructive item in one menu.',
    trigger: { kind: 'button', label: 'Complex Menu' },
    items: [
      {
        value: 'profile',
        label: 'Profile',
        icon: 'user',
        shortcut: '⌘⇧P',
        group: 'My Account',
      },
      {
        value: 'billing',
        label: 'Billing',
        icon: 'credit-card',
        shortcut: '⌘B',
      },
      {
        value: 'settings',
        label: 'Settings',
        icon: 'settings',
        shortcut: '⌘S',
      },
      {
        value: 'shortcuts',
        label: 'Keyboard shortcuts',
        icon: 'keyboard',
        shortcut: '⌘K',
      },
      { value: 'team', label: 'Team', icon: 'users', group: 'Team' },
      {
        value: 'invite',
        label: 'Invite users',
        icon: 'user-plus',
        submenu: [
          { value: 'invite-email', label: 'Email' },
          { value: 'invite-message', label: 'Message' },
          { value: 'invite-more', label: 'More…' },
        ],
      },
      { value: 'new-team', label: 'New Team', icon: 'plus', shortcut: '⌘T' },
      {
        value: 'logout',
        label: 'Log out',
        icon: 'log-out',
        shortcut: '⌘⇧Q',
        variant: 'destructive',
      },
    ],
  },
  {
    title: 'RTL',
    description:
      "direction: 'rtl' mirrors items, icons and the submenu for right-to-left layouts.",
    trigger: { kind: 'button', label: 'افتح القائمة' },
    direction: 'rtl',
    items: [
      {
        value: 'profile',
        label: 'الملف الشخصي',
        icon: 'user',
        group: 'حسابي',
      },
      { value: 'billing', label: 'الفواتير', icon: 'credit-card' },
      {
        value: 'invite',
        label: 'دعوة مستخدمين',
        icon: 'user-plus',
        submenu: [
          { value: 'invite-email', label: 'البريد الإلكتروني' },
          { value: 'invite-message', label: 'رسالة' },
          { value: 'invite-more', label: 'المزيد…' },
        ],
      },
      { value: 'logout', label: 'تسجيل الخروج', icon: 'log-out' },
    ],
  },
]

export const fixtureItems = (
  fixture: DropdownMenuFixture,
): ReadonlyArray<string> => fixture.items.map(item => item.value)

export const fixtureLabel = (
  fixture: DropdownMenuFixture,
  value: string,
): string => {
  const flat = fixture.items.flatMap(item => [item, ...(item.submenu ?? [])])
  return flat.find(item => item.value === value)?.label ?? value
}

export const checkboxValues = (
  fixture: DropdownMenuFixture,
): ReadonlyArray<string> =>
  fixture.items.filter(item => item.kind === 'checkbox').map(item => item.value)

export const radioValues = (
  fixture: DropdownMenuFixture,
): ReadonlyArray<string> =>
  fixture.items.filter(item => item.kind === 'radio').map(item => item.value)

/** Transient per-preview state for checkable items (seeds + toggles). */
export type CheckableState = Readonly<{
  checkedValues: ReadonlyArray<string>
  radioValue: string | undefined
}>

export type ResolvedItemConfig<IconHtml> = Readonly<{
  label: string
  icon?: IconHtml
  shortcut?: string
  kind?: 'checkbox' | 'radio'
  isChecked?: boolean
  isInset?: boolean
  variant?: 'destructive'
  isDisabled?: boolean
  group?: string
  submenu?: {
    items: ReadonlyArray<string>
    itemToConfig: (item: string) => ResolvedItemConfig<IconHtml>
  }
}>

/** Maps a fixture spec onto the component's itemToConfig shape, injecting
    checked state from the preview model. IconHtml is renderer-owned. */
export const resolveItemConfig = <IconHtml>(
  spec: DropdownMenuItemSpec,
  state: CheckableState,
  makeIcon: (name: string) => IconHtml,
): ResolvedItemConfig<IconHtml> => ({
  label: spec.label,
  ...(spec.icon === undefined ? {} : { icon: makeIcon(spec.icon) }),
  ...(spec.shortcut === undefined ? {} : { shortcut: spec.shortcut }),
  ...(spec.kind === undefined
    ? {}
    : {
        kind: spec.kind,
        isInset: true,
        isChecked:
          spec.kind === 'checkbox'
            ? state.checkedValues.includes(spec.value)
            : state.radioValue === spec.value,
      }),
  ...(spec.variant === 'destructive'
    ? { variant: 'destructive' as const }
    : {}),
  ...(spec.isDisabled === true ? { isDisabled: true } : {}),
  ...(spec.group === undefined ? {} : { group: spec.group }),
  ...(spec.submenu === undefined
    ? {}
    : {
        submenu: {
          items: spec.submenu.map(item => item.value),
          itemToConfig: (item: string) => {
            const child = spec.submenu?.find(
              candidate => candidate.value === item,
            )
            return child === undefined
              ? { label: item }
              : resolveItemConfig(child, state, makeIcon)
          },
        },
      }),
})

// ---------- generated example source ----------

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
  fixture: DropdownMenuFixture,
): ReadonlyArray<DropdownMenuItemSpec> =>
  fixture.items.flatMap(item => [item, ...(item.submenu ?? [])])

const source = (
  fixture: DropdownMenuFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const isStyleX = renderer !== 'tailwind'
  const uiDir = isStyleX ? 'stylex' : 'ui'
  const specs = allItemSpecs(fixture)
  const usesIcons = specs.some(spec => spec.icon !== undefined)
  const usesAvatar = fixture.trigger.kind === 'avatar'
  const usesCheckbox = specs.some(spec => spec.kind === 'checkbox')
  const usesRadio = specs.some(spec => spec.kind === 'radio')
  const literalValues = specs.map(spec => `'${spec.value}'`).join(', ')
  const topLevelValues = fixtureItems(fixture)
    .map(value => `'${value}'`)
    .join(', ')
  const imports = [
    `import { Option, Schema as S } from 'effect'`,
    `import { Command, Runtime, Subscription, Update } from 'foldkit'`,
    `import { type Document, type HtmlBuilder } from 'foldkit/html'`,
    ``,
    ...(usesAvatar ? [`import * as Avatar from '@/${uiDir}/avatar'`] : []),
    `import * as DropdownMenu from '@/${uiDir}/dropdown-menu'`,
    ...(usesIcons ? [`import * as Icon from '@/lib/icon'`] : []),
  ].join('\n')
  const modelExtra = [
    usesCheckbox ? `  checkedValues: S.Array(Item),` : '',
    usesRadio ? `  radioValue: S.Option(Item),` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const initExtra = [
    usesCheckbox
      ? `    checkedValues: [${(fixture.checkedValues ?? []).map(v => `'${v}'`).join(', ')}],`
      : '',
    usesRadio
      ? `    radioValue: ${fixture.radioValue === undefined ? 'Option.none()' : `Option.some('${fixture.radioValue}')`},`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  const updateExtra = [
    usesCheckbox
      ? `      const checkedValues = Option.match(maybeSelection, {
        onNone: () => model.checkedValues,
        onSome: selection =>
          model.checkedValues.includes(selection.value)
            ? model.checkedValues.filter(value => value !== selection.value)
            : [...model.checkedValues, selection.value],
      })`
      : '',
    usesRadio
      ? `      const radioValue = Option.match(maybeSelection, {
        onNone: () => model.radioValue,
        onSome: selection => Option.some(selection.value),
      })`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  const spreadExtra = [
    usesCheckbox ? ', checkedValues' : '',
    usesRadio ? ', radioValue' : '',
  ].join('')
  const triggerSource =
    fixture.trigger.kind === 'avatar'
      ? `Avatar.avatar({ children: [Avatar.avatarFallback({ children: ['${fixture.trigger.initials}'] }, h)] }, h)`
      : `'${fixture.trigger.label.replaceAll("'", "\\'")}'`
  const itemToConfigSource = usesCheckbox
    ? `itemToConfig: item => ({ ...configs[item], isChecked: model.checkedValues.includes(item) }),`
    : usesRadio
      ? `itemToConfig: item => ({ ...configs[item], isChecked: Option.contains(model.radioValue, item) }),`
      : 'itemToConfig: item => configs[item],'
  return foldkitApplication({
    title: `Dropdown Menu — ${fixture.title}`,
    imports,
    model: `export const Item = S.Literals([${literalValues}])
export type Item = typeof Item.Type
export const Model = S.Struct({
  menu: DropdownMenu.Model,
  maybeLastAction: S.Option(Item),
${modelExtra}
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotMenuMessage = taggedStruct('GotDropdownMenuMessage${tag}', { message: DropdownMenu.Message });
export const Message = S.Union([GotMenuMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    menu: DropdownMenu.init({ id: 'menu-${tag.toLowerCase()}', isAnimated: true }),
    maybeLastAction: Option.none(),
${initExtra}
  },
})`,
    update: `const Menu = DropdownMenu.create<Item>()

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDropdownMenuMessage${tag}': {
      const menuOp__ = Menu.update(model.menu, message.message);
      const menu = menuOp__.model;
      const commands = menuOp__.commands ?? [];
      const maybeSelection = Option.fromNullishOr(menuOp__.outMessage);
      const maybeLastAction = Option.match(maybeSelection, {
        onNone: () => model.maybeLastAction,
        onSome: selection => Option.some(selection.value),
      })
${updateExtra}
      return { model: { ...model, menu, maybeLastAction${spreadExtra} }, commands: Command.mapMessages(commands, next => GotMenuMessage({ message: next })) }
    }
  }
}`,
    view: `${isStyleX ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const configs: Record<Item, DropdownMenu.DropdownMenuItemConfig<Item>> = {
    ${specs.map(itemConfigSource).join(',\n    ')},
  }
  return {
    title: 'Dropdown Menu — ${fixture.title}',
    body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen flex-col items-center justify-center gap-4 p-8'"})], [
      DropdownMenu.dropdownMenu({
        model: model.menu,
        toParentMessage: message => GotMenuMessage({ message }),
        trigger: ${triggerSource},
        ${isStyleX ? (fixture.trigger.kind === 'avatar' ? "triggerButtonVariant: 'ghost',\n        triggerButtonSize: 'icon-sm',\n        triggerButtonRounded: true," : "triggerButtonVariant: 'outline',") : fixture.trigger.kind === 'avatar' ? "triggerClass: 'rounded-full'," : "triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',"}
        ariaLabel: '${fixture.title} menu',
        items: [${topLevelValues}]${specs.some(spec => spec.submenu !== undefined) ? ' as ReadonlyArray<Item>' : ''},
        ${itemToConfigSource}
        ${fixture.keepOpenOnCheckableSelect === true ? 'keepOpenOnCheckableSelect: true,' : ''}
        ${fixture.direction === 'rtl' ? "direction: 'rtl'," : ''}
      }, h),
      h.p([h.Role('status'), h.Class('text-sm')], [Option.match(model.maybeLastAction, { onNone: () => 'No action selected', onSome: value => \`Selected: \${configs[value].label}\` })]),
    ]),
  }
}`,
  })
}

const dropdownMenuExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  dropdownMenuFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: source(fixture, renderer),
  }))

export const dropdownMenuExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, dropdownMenuExamplesFor(renderer))
