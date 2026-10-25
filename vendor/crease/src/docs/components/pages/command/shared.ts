import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type CommandFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'basic' | 'shortcuts' | 'groups' | 'scrollable' | 'rtl'
}>

export const commandFixtures: ReadonlyArray<CommandFixture> = [
  { title: 'Demo', heroOnly: true, kind: 'basic' },
  {
    title: 'Basic',
    kind: 'basic',
    description:
      'A dialog wraps the always-visible command palette; the parent owns the open state.',
  },
  {
    title: 'Shortcuts',
    kind: 'shortcuts',
    description:
      'Item configs carry icon content and a trailing shortcut hint.',
  },
  {
    title: 'Groups',
    kind: 'groups',
    description:
      'itemGroupKey plus groupToHeading render labeled, separated groups.',
  },
  {
    title: 'Scrollable',
    kind: 'scrollable',
    description:
      'Long item sets scroll inside the dialog while the input stays pinned.',
  },
  {
    title: 'RTL',
    kind: 'rtl',
    description:
      'A dir="rtl" wrapper mirrors the palette for localized commands.',
  },
]

export type CommandItem = Readonly<{
  value: string
  icon?: string
  shortcut?: string
  group: string
}>

export const commandBasicItems: ReadonlyArray<CommandItem> = [
  { value: 'Calendar', icon: 'calendar', group: 'Suggestions' },
  { value: 'Search Emoji', icon: 'smile', group: 'Suggestions' },
  { value: 'Calculator', icon: 'calculator', group: 'Suggestions' },
]

export const commandShortcutItems: ReadonlyArray<CommandItem> = [
  { value: 'Profile', icon: 'user', shortcut: '⌘P', group: 'Settings' },
  { value: 'Billing', icon: 'credit-card', shortcut: '⌘B', group: 'Settings' },
  { value: 'Settings', icon: 'settings', shortcut: '⌘S', group: 'Settings' },
]

export const commandGroupItems: ReadonlyArray<CommandItem> = [
  ...commandBasicItems,
  ...commandShortcutItems,
]

export const commandScrollableItems: ReadonlyArray<CommandItem> = [
  { value: 'Home', icon: 'house', shortcut: '⌘H', group: 'Navigation' },
  { value: 'Inbox', icon: 'inbox', group: 'Navigation' },
  { value: 'Search', icon: 'search', shortcut: '⌘F', group: 'Navigation' },
  { value: 'Files', icon: 'folder', group: 'Navigation' },
  { value: 'Images', icon: 'image', group: 'Navigation' },
  { value: 'Music', icon: 'music', group: 'Navigation' },
  { value: 'Videos', icon: 'video', group: 'Navigation' },
  { value: 'Documents', icon: 'file-text', group: 'Navigation' },
  { value: 'Downloads', icon: 'download', group: 'Navigation' },
  { value: 'Trash', icon: 'trash-2', group: 'Navigation' },
  {
    value: 'New Folder',
    icon: 'folder-plus',
    shortcut: '⌘⇧N',
    group: 'Actions',
  },
  { value: 'Copy Path', icon: 'clipboard', shortcut: '⌘⇧C', group: 'Actions' },
  { value: 'Paste', icon: 'clipboard-paste', shortcut: '⌘V', group: 'Actions' },
]

export const commandRtlItems: ReadonlyArray<CommandItem> = [
  { value: 'التقويم', icon: 'calendar', group: 'اقتراحات' },
  { value: 'بحث عن إيموجي', icon: 'smile', group: 'اقتراحات' },
  { value: 'الآلة الحاسبة', icon: 'calculator', group: 'اقتراحات' },
]

export const itemsForFixture = (
  fixture: CommandFixture,
): ReadonlyArray<CommandItem> =>
  fixture.kind === 'shortcuts'
    ? commandShortcutItems
    : fixture.kind === 'groups'
      ? commandGroupItems
      : fixture.kind === 'scrollable'
        ? commandScrollableItems
        : fixture.kind === 'rtl'
          ? commandRtlItems
          : commandBasicItems

const itemsLiteral = (items: ReadonlyArray<CommandItem>): string => {
  const lines = items.map(
    item =>
      `  { value: '${item.value}'${item.icon === undefined ? '' : `, icon: '${item.icon}'`}${item.shortcut === undefined ? '' : `, shortcut: '${item.shortcut}'`}, group: '${item.group}' },`,
  )
  return `type CommandItem = Readonly<{ value: string; icon?: string; shortcut?: string; group: string }>
const commandItems: ReadonlyArray<CommandItem> = [\n${lines.join('\n')}\n]`
}

const commandSource = (
  fixture: CommandFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const dir = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const items = itemsForFixture(fixture)
  const placeholder =
    fixture.kind === 'rtl'
      ? 'اكتب أمرًا أو ابحث...'
      : 'Type a command or search...'
  const aria = fixture.kind === 'rtl' ? 'قائمة الأوامر' : 'Command menu'
  return foldkitApplication({
    title: `Command — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command as FoldkitCommand, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Button from '@/${dir}/button'
import * as CommandMenu from '@/${dir}/command'
import * as Dialog from '@/${dir}/dialog'
import * as Icon from '@/lib/icon'`,
    model: `export const Model = S.Struct({
  dialog: Dialog.Model,
  command: CommandMenu.Model,
  maybeValue: S.Option(S.String),
})
export type Model = typeof Model.Type

${itemsLiteral(items)}`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const OpenedMenu = taggedStruct('OpenedMenu', {});
export const GotDialogMessage = taggedStruct('GotDialogMessage', { message: Dialog.Message });
export const GotCommandMessage = taggedStruct('GotCommandMessage', { message: CommandMenu.Message });
export const Message = S.Union([OpenedMenu, GotDialogMessage, GotCommandMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    dialog: Dialog.init({ id: 'command-dialog', isAnimated: true }),
    command: CommandMenu.init({ id: 'command-menu', isAnimated: true }),
    maybeValue: Option.none(),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'OpenedMenu': {
      const next = Dialog.open(model.dialog)
      return {
        model: { ...model, dialog: next.model },
        commands: FoldkitCommand.mapMessages(next.commands ?? [], child => GotDialogMessage({ message: child })),
      }
    }
    case 'GotDialogMessage': {
      const next = Dialog.update(model.dialog, message.message)
      return {
        model: { ...model, dialog: next.model },
        commands: FoldkitCommand.mapMessages(next.commands ?? [], child => GotDialogMessage({ message: child })),
      }
    }
    case 'GotCommandMessage': {
      const next = CommandMenu.update(model.command, message.message)
      const maybeOut = Option.fromNullishOr(next.outMessage)
      const maybeValue = Option.match(maybeOut, {
        onNone: () => model.maybeValue,
        onSome: out => out._tag === 'Selected' ? Option.some(out.value) : Option.none(),
      })
      return {
        model: { ...model, command: next.model, maybeValue },
        commands: FoldkitCommand.mapMessages(next.commands ?? [], child => GotCommandMessage({ message: child })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Command menu',
  body: h.main([], [
    ${fixture.kind === 'rtl' ? "h.div([h.Dir('rtl')], [" : "h.div([h.Class('flex flex-col gap-4')], ["}
      Button.button({ variant: 'outline', onClick: OpenedMenu(), children: ['Open Menu'] }, h),
      Dialog.dialog({
        model: model.dialog,
        toParentMessage: message => GotDialogMessage({ message }),
        title: '${aria}',
        content: () => [
          CommandMenu.command({
            model: model.command,
            maybeSelectedValue: model.maybeValue,
            restingInputValue: '',
            toParentMessage: message => GotCommandMessage({ message }),
            items: commandItems.map(item => item.value),
            itemToConfig: value => {
              const item = commandItems.find(entry => entry.value === value)
              return {
                content: h.span([h.Class('flex items-center gap-2')], [
                  ...(item?.icon === undefined ? [] : [Icon.icon(item.icon, { class: 'size-4' }, h)]),
                  h.span([], [value]),
                ]),
                ...(item?.shortcut === undefined ? {} : { shortcut: item.shortcut }),
              }
            },
            itemGroupKey: value => commandItems.find(entry => entry.value === value)?.group ?? 'Other',
            groupToHeading: group => group,
            placeholder: '${placeholder}',
            ariaLabel: '${aria}',
            emptyContent: 'No results found.',
          }, h),
        ],
      }, h),
    ]),
  ]),
})`,
  })
}

const commandExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  commandFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    keepIdsCanonical: true,
    code: commandSource(fixture, renderer),
  }))

export const commandExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, commandExamplesFor(renderer))
