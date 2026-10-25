import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export const sidebarFixtures = [
  {
    kind: 'shell',
    title: 'Application shell',
    description:
      'A complete icon-collapsible shell with search, grouped navigation, badges, nested links, an account footer, persistence, and responsive triggers.',
  },
  {
    kind: 'floating',
    title: 'Floating sidebar',
    description:
      'The floating variant adds an inset gutter, rounded panel, border, and compact shadow while retaining the same state model.',
  },
  {
    kind: 'inset',
    title: 'Inset sidebar',
    description:
      'Pair the inset variant with SidebarInset so the application surface becomes a distinct rounded layer on desktop.',
  },
  {
    kind: 'offcanvas',
    title: 'Off-canvas collapse',
    description:
      'Off-canvas mode removes the desktop sidebar and its layout gap completely when collapsed.',
  },
  {
    kind: 'menu',
    title: 'Menu primitives',
    description:
      'Compose active links, button variants, row actions, numeric badges, and sizes without replacing semantic buttons or anchors.',
  },
  {
    kind: 'nested',
    title: 'Nested navigation',
    description:
      'SidebarMenuSub, SidebarMenuSubItem, and SidebarMenuSubButton express a clear secondary navigation level.',
  },
  {
    kind: 'loading',
    title: 'Loading navigation',
    description:
      'SidebarMenuSkeleton preserves the navigation rhythm while labels are loading and accepts a deterministic width for stable rendering.',
  },
  {
    kind: 'right',
    title: 'Right side and custom width',
    description:
      'Move the panel to the right and configure desktop, mobile, and icon widths at the provider boundary.',
  },
] as const

export type SidebarFixtureKind = (typeof sidebarFixtures)[number]['kind']

const viewFor = (
  kind: SidebarFixtureKind,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const variant = kind === 'floating' || kind === 'inset' ? kind : 'sidebar'
  const collapsible = kind === 'offcanvas' ? 'offcanvas' : 'icon'
  const side = kind === 'right' ? 'right' : 'left'
  const providerWidths =
    kind === 'right'
      ? ", width: '19rem', mobileWidth: '20rem', iconWidth: '3.25rem'"
      : ''

  if (kind === 'menu')
    return `const menu = Sidebar.sidebarMenu({ children: [
  Sidebar.sidebarMenuItem({ children: [
    Sidebar.sidebarMenuButton({ href: '#', isActive: true, children: [Icon.icon('gauge', {}, h), h.span([], ['Overview'])] }, h),
    Sidebar.sidebarMenuBadge({ children: ['12'] }, h),
  ] }, h),
  Sidebar.sidebarMenuItem({ children: [
    Sidebar.sidebarMenuButton({ variant: 'outline', children: [Icon.icon('inbox', {}, h), h.span([], ['Inbox'])] }, h),
    actionMenu(model, h),
  ] }, h),
] }, h)

return { title: 'Sidebar menu primitives', body: Sidebar.sidebar({ collapsible: 'none', children: [Sidebar.sidebarContent({ children: [Sidebar.sidebarGroup({ children: [Sidebar.sidebarGroupLabel({ children: ['Workspace'] }, h), Sidebar.sidebarGroupContent({ children: [menu] }, h)] }, h)] }, h)] }, h) }`

  if (kind === 'nested')
    return `const menu = Sidebar.sidebarMenu({ children: [
  Sidebar.sidebarMenuItem({ children: [
    Sidebar.sidebarMenuButton({ children: [Icon.icon('book-open', {}, h), h.span([], ['Documentation'])] }, h),
    Sidebar.sidebarMenuSub({ children: ['Introduction', 'Components', 'Changelog'].map((label, index) =>
      Sidebar.sidebarMenuSubItem({ children: [Sidebar.sidebarMenuSubButton({ href: '#', isActive: index === 1, children: [label] }, h)] }, h),
    ) }, h),
  ] }, h),
] }, h)

return { title: 'Nested sidebar navigation', body: Sidebar.sidebar({ collapsible: 'none', children: [Sidebar.sidebarContent({ children: [Sidebar.sidebarGroup({ children: [Sidebar.sidebarGroupContent({ children: [menu] }, h)] }, h)] }, h)] }, h) }`

  if (kind === 'loading')
    return `const rows = [82, 68, 76, 58].map((widthPercent) =>
  Sidebar.sidebarMenuItem({ children: [Sidebar.sidebarMenuSkeleton({ showIcon: true, widthPercent }, h)] }, h),
)

return { title: 'Loading sidebar navigation', body: Sidebar.sidebar({ collapsible: 'none', children: [Sidebar.sidebarContent({ children: [Sidebar.sidebarGroup({ children: [Sidebar.sidebarGroupLabel({ children: ['Projects'] }, h), Sidebar.sidebarGroupContent({ children: [Sidebar.sidebarMenu({ children: rows }, h)] }, h)] }, h)] }, h)] }, h) }`

  return `const state: Sidebar.SidebarState = model.sidebar.isOpen ? 'expanded' : 'collapsed'
const desktopToggle = Message.GotSidebarMessage({ message: Sidebar.Message.Toggled() })
const mobileToggle = Message.GotSidebarMessage({ message: Sidebar.Message.ToggledMobile() })

return {
  title: 'Sidebar application shell',
  body: Sidebar.sidebarProvider({ state${providerWidths}, children: [
    Sidebar.sidebar({ state, side: '${side}', variant: '${variant}', collapsible: '${collapsible}', isMobileOpen: model.sidebar.isMobileOpen, onMobileDismiss: Message.GotSidebarMessage({ message: Sidebar.Message.SetMobileOpen({ isOpen: false }) }), children: [
      Sidebar.sidebarHeader({ children: [Sidebar.sidebarInput({ value: model.query, onInput: value => Message.ChangedQuery({ value }), placeholder: 'Search navigation' }, h)] }, h),
      Sidebar.sidebarContent({ children: [Sidebar.sidebarGroup({ children: [Sidebar.sidebarGroupLabel({ children: ['Platform'] }, h), Sidebar.sidebarGroupContent({ children: [navigation(model, h)] }, h)] }, h)] }, h),
      Sidebar.sidebarFooter({ children: [Sidebar.sidebarMenuButton({ size: 'lg', children: [Icon.icon('circle-user-round', {}, h), h.span([], ['Ada Lovelace'])] }, h)] }, h),
      Sidebar.sidebarRail({ onClick: desktopToggle }, h),
    ] }, h),
    Sidebar.sidebarInset({ variant: '${variant}', state, children: [
      h.header([h.Class(${renderer !== 'tailwind' ? "stylex.props(styles.header).className ?? ''" : "'flex h-12 items-center gap-2 border-b px-4'"})], [Sidebar.sidebarTrigger({ onClick: desktopToggle, onMobileClick: mobileToggle }, h), h.strong([], ['Workspace'])]),
      h.main([h.Class(${renderer !== 'tailwind' ? "stylex.props(styles.main).className ?? ''" : "'p-6'"})], ['Application content']),
    ] }, h),
  ] }, h),
}`
}

const source = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  kind: SidebarFixtureKind,
): string => {
  const sx = renderer !== 'tailwind'
  return foldkitApplication({
    title: `Sidebar - ${kind}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${sx ? "import * as stylex from '@stylexjs/stylex'\n\nconst styles = stylex.create({ header: { alignItems: 'center', borderBottomColor: 'var(--border)', borderBottomStyle: 'solid', borderBottomWidth: 1, display: 'flex', gap: '0.5rem', height: '3rem', paddingInline: '1rem' }, main: { padding: '1.5rem' } })\n" : ''}
import * as Icon from '@/lib/icon'
import * as DropdownMenu from '@/${sx ? 'stylex' : 'ui'}/dropdown-menu'
import * as Sidebar from '@/${sx ? 'stylex' : 'ui'}/sidebar'`,
    model: `export const Model = S.Struct({ sidebar: Sidebar.Model, actions: DropdownMenu.Model, query: S.String })
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'



export const Message = defineMessageUnion({
  GotSidebarMessage: { message: Sidebar.Message },
  GotActionsMessage: { message: DropdownMenu.Message },
  ChangedQuery: { value: S.String },
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { sidebar: Sidebar.init({ defaultOpen: true, storageKey: 'workspace_sidebar' }), actions: DropdownMenu.init({ id: 'sidebar-actions' }), query: '' } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotSidebarMessage': {
      const sidebarOp__ = Sidebar.update(model.sidebar, message.message);
    const sidebar = sidebarOp__.model;
    const commands = sidebarOp__.commands ?? [];
      return { model: { ...model, sidebar }, commands: Command.mapMessages(commands, next => Message.GotSidebarMessage({ message: next })) }
    }
    case 'GotActionsMessage': {
      const actionsOp__ = DropdownMenu.update(model.actions, message.message);
    const actions = actionsOp__.model;
    const commands = actionsOp__.commands ?? [];
      return { model: { ...model, actions }, commands: Command.mapMessages(commands, next => Message.GotActionsMessage({ message: next })) }
    }
    case 'ChangedQuery': return { model: { ...model, query: message.value } }
  }
}`,
    subscriptions: `export const subscriptions = Subscription.make<Model, Message>()(() => ({
  sidebarShortcut: Subscription.persistent(Sidebar.shortcut(next => Message.GotSidebarMessage({ message: next }))),
}))`,
    view: `const actionItems = ['open', 'rename', 'delete'] as const
const actionMenu = (model: Model, h: HtmlBuilder<Message>) => DropdownMenu.dropdownMenu({
  model: model.actions,
  toParentMessage: message => Message.GotActionsMessage({ message }),
  trigger: Icon.moreHorizontal({}, h),
  ariaLabel: 'Item actions',
  align: 'end',
  items: actionItems,
  itemToConfig: action => ({ label: action[0]?.toUpperCase() + action.slice(1), ...(action === 'delete' ? { variant: 'destructive' as const } : {}) }),
}, h)

const navigation = (model: Model, h: HtmlBuilder<Message>) => Sidebar.sidebarMenu({ children: [
  ['Overview', 'gauge'], ['Inbox', 'inbox'], ['Projects', 'book-open']
].map(([label, iconName], index) => Sidebar.sidebarMenuItem({ children: [
  Sidebar.sidebarMenuButton({ href: '#', isActive: index === 0, tooltip: label ?? '', children: [Icon.icon(iconName ?? 'circle', {}, h), h.span([], [label ?? ''])] }, h),
  ...(index === 1 ? [Sidebar.sidebarMenuBadge({ children: ['12'] }, h)] : []),
  ...(index === 2 ? [actionMenu(model, h)] : []),
] }, h)) }, h)

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  ${viewFor(kind, renderer)}
}`,
  })
}

const sidebarExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  sidebarFixtures.map(fixture => ({
    ...fixture,
    previewClass: 'justify-stretch',
    code: source(renderer, fixture.kind),
  }))

export const sidebarExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, sidebarExamplesFor(renderer))
