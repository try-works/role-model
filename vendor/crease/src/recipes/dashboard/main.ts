import { Effect, Schema as S } from 'effect'
import { Command, Subscription, type Runtime, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, pushUrl, load } from 'foldkit/navigation'
import { Url, toString } from 'foldkit/url'
import * as Sidebar from '@/ui/sidebar'
import * as Dialog from '@/ui/dialog'
import * as DataTable from '@/ui/data-table'
import * as Chart from '@/ui/chart'
import * as Tabs from '@/ui/tabs'
import * as ToggleGroup from '@/ui/toggle-group'
import {
  User,
  Settings,
  defaultSettings,
  seedUsers,
  ranges,
  type Range,
} from './data'
import { chartIds } from './charts'
import { dashboardView } from './view'

const Page = S.Literals(['overview', 'users', 'settings'])
export type Page = typeof Page.Type
export const Flags = S.Struct({
  users: S.Array(User),
  settings: Settings,
  isDark: S.Boolean,
  sidebarOpen: S.Boolean,
})
export const Draft = S.Struct({
  name: S.String,
  email: S.String,
  role: S.String,
  status: S.String,
})
export const Model = S.Struct({
  page: Page,
  sidebar: Sidebar.Model,
  dialog: Dialog.Model,
  table: DataTable.Model,
  settingsTabs: Tabs.Model,
  rangeToggle: ToggleGroup.Model,
  settingsTab: S.String,
  range: S.Literals(['7d', '30d', '90d']),
  users: S.Array(User),
  settings: Settings,
  savedSettings: Settings,
  draft: Draft,
  editingId: S.String,
  submitted: S.Boolean,
  settingsSubmitted: S.Boolean,
  statusFilter: S.String,
  notice: S.String,
  isDark: S.Boolean,
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  GotSidebar: { message: Sidebar.Message },
  GotDialog: { message: Dialog.Message },
  GotTable: { message: DataTable.Message },
  GotChart: { message: Chart.ChartMessage },
  GotSettingsTabs: { message: Tabs.Message },
  GotRangeToggle: { message: ToggleGroup.Message },
  OpenedUser: { id: S.String },
  ChangedDraft: { field: S.String, value: S.String },
  SubmittedUser: {},
  ChangedStatusFilter: { value: S.String },
  ChangedSetting: { field: S.String, value: S.String },
  ToggledSetting: { field: S.String, value: S.Boolean },
  SavedSettings: {},
  ResetSettings: {},
  ExportedUsers: {},
  ExportedReport: {},
  ToggledTheme: {},
  AppliedTheme: {},
  CompletedEffect: {},
  DismissedNotice: {},
})
export type Message = typeof Message.Type

const pageFromPath = (path: string): Page =>
  path === '/users' ? 'users' : path === '/settings' ? 'settings' : 'overview'
const emptyDraft = { name: '', email: '', role: 'Member', status: 'Active' }
export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  typeof Flags.Type
> = (flags, url) => ({
  model: {
    page: pageFromPath(url.pathname),
    sidebar: Sidebar.init({
      defaultOpen: flags.sidebarOpen,
      storageKey: 'forma_sidebar',
    }),
    dialog: Dialog.init({ id: 'user-dialog', isAnimated: true }),
    table: DataTable.init(8),
    settingsTabs: Tabs.init({ id: 'settings-tabs' }),
    rangeToggle: ToggleGroup.init({ id: 'range-toggle' }),
    settingsTab: 'workspace',
    range: '30d',
    users: flags.users,
    settings: flags.settings,
    savedSettings: flags.settings,
    draft: emptyDraft,
    editingId: '',
    submitted: false,
    settingsSubmitted: false,
    statusFilter: 'All',
    notice: '',
    isDark: flags.isDark,
  },
})

const Navigate = Command.define('Navigate', {
  args: { href: S.String, external: S.Boolean },
  messages: [Message.CompletedEffect],
  execute: ({ href, external }) =>
    (external ? load(href) : pushUrl(href)).pipe(
      Effect.as(Message.CompletedEffect()),
    ),
})
const Persist = Command.define('Persist', {
  args: { users: S.Array(User), settings: Settings },
  messages: [Message.CompletedEffect],
  execute: ({ users, settings }) =>
    Effect.sync(() => {
      try {
        localStorage.setItem('forma-demo', JSON.stringify({ users, settings }))
      } catch {
        /* State remains available for this session. */
      }
      return Message.CompletedEffect()
    }),
})
const ApplyTheme = Command.define('ApplyTheme', {
  args: { isDark: S.Boolean },
  messages: [Message.AppliedTheme],
  execute: ({ isDark }) =>
    Effect.sync(() => {
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
      try {
        localStorage.setItem('forma-theme', isDark ? 'dark' : 'light')
      } catch {
        /* Optional persistence. */
      }
      return Message.AppliedTheme()
    }),
})
const Download = Command.define('Download', {
  args: { filename: S.String, csv: S.String },
  messages: [Message.CompletedEffect],
  execute: ({ filename, csv }) =>
    Effect.sync(() => {
      const url = URL.createObjectURL(
        new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }),
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return Message.CompletedEffect()
    }),
})
const csvCell = (value: string) =>
  `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
export const draftErrors = (model: Model) => ({
  name:
    model.draft.name.trim().length < 2
      ? 'Enter a name with at least two characters.'
      : '',
  email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.draft.email.trim())
    ? 'Enter a valid email address.'
    : model.users.some(
          user =>
            user.id !== model.editingId &&
            user.email.toLowerCase() === model.draft.email.trim().toLowerCase(),
        )
      ? 'This email is already in your workspace.'
      : '',
})
export const settingsErrors = (model: Model) => ({
  workspace:
    model.settings.workspace.trim().length < 2
      ? 'Enter a workspace name with at least two characters.'
      : '',
  email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.settings.email.trim())
    ? 'Enter a valid contact email.'
    : '',
})
const persist = (model: Model) =>
  Persist({ users: model.users, settings: model.savedSettings })
const chartCommands = (range: Range) =>
  chartIds.map(hostId =>
    Command.mapMessage(Chart.SyncChart({ hostId, variant: range }), message =>
      Message.GotChart({ message }),
    ),
  )
export const filteredUsers = (model: Model) =>
  model.users.filter(
    user => model.statusFilter === 'All' || user.status === model.statusFilter,
  )

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedLink':
      return {
        model,
        commands: [
          Navigate({
            href:
              message.request._tag === 'Internal'
                ? toString(message.request.url)
                : message.request.href,
            external: message.request._tag === 'External',
          }),
        ],
      }
    case 'ChangedUrl':
      return {
        model: {
          ...model,
          page: pageFromPath(message.url.pathname),
          sidebar: { ...model.sidebar, isMobileOpen: false },
          notice: '',
        },
      }
    case 'GotSidebar': {
      const result = Sidebar.update(model.sidebar, message.message)
      return {
        model: { ...model, sidebar: result.model },
        commands: Command.mapMessages(result.commands ?? [], message =>
          Message.GotSidebar({ message }),
        ),
      }
    }
    case 'GotDialog': {
      const result = Dialog.update(model.dialog, message.message)
      return {
        model: { ...model, dialog: result.model },
        commands: Command.mapMessages(result.commands ?? [], message =>
          Message.GotDialog({ message }),
        ),
      }
    }
    case 'GotTable':
      return {
        model: {
          ...model,
          table: DataTable.update(model.table, message.message).model,
        },
      }
    case 'GotChart':
      return {
        model:
          message.message._tag === 'ChartMountFailed'
            ? {
                ...model,
                notice: 'A chart could not be loaded. Please refresh the page.',
              }
            : model,
      }
    case 'GotSettingsTabs': {
      const result = Tabs.update(model.settingsTabs, message.message)
      return {
        model: {
          ...model,
          settingsTabs: result.model,
          settingsTab:
            result.outMessage?._tag === 'Selected'
              ? result.outMessage.value
              : model.settingsTab,
        },
        commands: Command.mapMessages(result.commands ?? [], message =>
          Message.GotSettingsTabs({ message }),
        ),
      }
    }
    case 'GotRangeToggle': {
      const result = ToggleGroup.create<Range>().update(
        model.rangeToggle,
        message.message,
      )
      const range =
        result.outMessage?._tag === 'Selected'
          ? result.outMessage.value
          : model.range
      return {
        model: { ...model, rangeToggle: result.model, range },
        commands: [
          ...Command.mapMessages(result.commands ?? [], message =>
            Message.GotRangeToggle({ message }),
          ),
          ...chartCommands(range),
        ],
      }
    }
    case 'OpenedUser': {
      const user = model.users.find(user => user.id === message.id)
      const result = Dialog.open(model.dialog)
      return {
        model: {
          ...model,
          dialog: result.model,
          editingId: user?.id ?? '',
          draft: user
            ? {
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
              }
            : emptyDraft,
          submitted: false,
          notice: '',
        },
        commands: Command.mapMessages(result.commands ?? [], message =>
          Message.GotDialog({ message }),
        ),
      }
    }
    case 'ChangedDraft':
      return {
        model: {
          ...model,
          draft: { ...model.draft, [message.field]: message.value },
        },
      }
    case 'SubmittedUser': {
      const errors = draftErrors(model)
      if (errors.name || errors.email)
        return { model: { ...model, submitted: true } }
      const existing = model.users.find(user => user.id === model.editingId)
      const user: User = {
        id:
          existing?.id ??
          `user-${Math.max(0, ...model.users.map(user => Number(user.id.slice(5)) || 0)) + 1}`,
        name: model.draft.name.trim(),
        email: model.draft.email.trim().toLowerCase(),
        role: model.draft.role as User['role'],
        status: model.draft.status as User['status'],
        joined: existing?.joined ?? '2026-10-09',
      }
      const result = Dialog.close(model.dialog)
      const next: Model = {
        ...model,
        dialog: result.model,
        users: existing
          ? model.users.map(item => (item.id === existing.id ? user : item))
          : [user, ...model.users],
        table: DataTable.init(model.table.pageSize),
        statusFilter: 'All',
        notice: `${user.name} ${existing ? 'was updated' : 'was added to your workspace'}.`,
      }
      return {
        model: next,
        commands: [
          ...Command.mapMessages(result.commands ?? [], message =>
            Message.GotDialog({ message }),
          ),
          persist(next),
        ],
      }
    }
    case 'ChangedStatusFilter':
      return {
        model: {
          ...model,
          statusFilter: message.value,
          table: { ...model.table, page: 0, selectedRowKeys: [] },
        },
      }
    case 'ChangedSetting':
      return {
        model: {
          ...model,
          settings: { ...model.settings, [message.field]: message.value },
          notice: '',
        },
      }
    case 'ToggledSetting':
      return {
        model: {
          ...model,
          settings: { ...model.settings, [message.field]: message.value },
          notice: '',
        },
      }
    case 'SavedSettings': {
      const errors = settingsErrors(model)
      if (errors.workspace || errors.email)
        return {
          model: {
            ...model,
            settingsSubmitted: true,
            settingsTab: 'workspace',
          },
        }
      const settings = {
        ...model.settings,
        workspace: model.settings.workspace.trim(),
        email: model.settings.email.trim().toLowerCase(),
      }
      const next = {
        ...model,
        settings,
        savedSettings: settings,
        settingsSubmitted: false,
        notice: 'Your workspace settings have been saved.',
      }
      return { model: next, commands: [persist(next)] }
    }
    case 'ResetSettings':
      return {
        model: {
          ...model,
          settings: model.savedSettings,
          settingsSubmitted: false,
          notice: '',
        },
      }
    case 'ExportedUsers': {
      const rows = filteredUsers(model).filter(user =>
        `${user.name} ${user.email} ${user.role} ${user.status}`
          .toLowerCase()
          .includes(model.table.filter.toLowerCase()),
      )
      const csv = [
        ['Name', 'Email', 'Role', 'Status', 'Joined'],
        ...rows.map(user => [
          user.name,
          user.email,
          user.role,
          user.status,
          user.joined,
        ]),
      ]
        .map(row => row.map(csvCell).join(','))
        .join('\r\n')
      return {
        model: { ...model, notice: `Exported ${rows.length} users to CSV.` },
        commands: [Download({ filename: 'forma-users.csv', csv })],
      }
    }
    case 'ExportedReport': {
      const data = ranges[model.range]
      const csv =
        'Date,Revenue (USD),Previous revenue (USD)\r\n' +
        data.dates
          .map(
            (date, i) =>
              `${csvCell(date)},${data.current[i]},${data.previous[i]}`,
          )
          .join('\r\n')
      return {
        model: { ...model, notice: 'Your revenue report has been downloaded.' },
        commands: [Download({ filename: 'forma-revenue.csv', csv })],
      }
    }
    case 'ToggledTheme':
      return {
        model: { ...model, isDark: !model.isDark },
        commands: [ApplyTheme({ isDark: !model.isDark })],
      }
    case 'AppliedTheme':
      return { model, commands: chartCommands(model.range) }
    case 'DismissedNotice':
      return { model: { ...model, notice: '' } }
    case 'CompletedEffect':
      return { model }
  }
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  sidebarShortcut: entry(
    {},
    {
      modelToDependencies: () => ({}),
      dependenciesToStream: () =>
        Sidebar.shortcut(message => Message.GotSidebar({ message })),
    },
  ),
}))
export const view = dashboardView
export { defaultSettings, seedUsers }
