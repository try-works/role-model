import { authoredPage } from '@/docs/components/pages/authored-page'
import { sidebarExamples } from '@/docs/components/pages/sidebar/shared'
import { sidebarTailwindPreviewProgram } from '@/docs/components/pages/sidebar/tailwind'

export const sidebarPage = authoredPage({
  slug: 'sidebar',
  title: 'Sidebar',
  kind: 'submodel',
  previewProgram: sidebarTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A composable, theme-aware application shell with desktop collapse, mobile disclosure, persistent state, and primitives for navigation groups, nested menus, actions, badges, and loading states.',
    architecture:
      'The parent owns Sidebar.Model and delegates Sidebar.Message through its update function. Desktop and mobile visibility remain separate, persistence stays in a Command, and the keyboard shortcut is registered as a Subscription. Views receive the derived state explicitly instead of relying on hidden context.',
    usage: `import * as Sidebar from '@/ui/sidebar'

const state: Sidebar.SidebarState = model.sidebar.isOpen
  ? 'expanded'
  : 'collapsed'

Sidebar.sidebarProvider({ state, children: [
  Sidebar.sidebar({ state, collapsible: 'icon', children: [
    Sidebar.sidebarHeader({ children: [brand] }, h),
    Sidebar.sidebarContent({ children: [navigation] }, h),
    Sidebar.sidebarFooter({ children: [accountMenu] }, h),
    Sidebar.sidebarRail({ onClick: toggleDesktop }, h),
  ] }, h),
  Sidebar.sidebarInset({ children: [page] }, h),
] }, h)`,
    sections: [
      {
        id: 'sidebar-imports',
        title: 'Installation',
        description:
          'Sidebar exports the stateless view helpers and the state module from one entry point. Import the Tailwind or StyleX renderer; the Model and Message contract is shared by both.',
        code: `import * as Sidebar from '@/ui/sidebar'
// or
import * as Sidebar from '@/stylex/sidebar'`,
      },
      {
        id: 'provider',
        title: 'SidebarProvider',
        description:
          'SidebarProvider establishes the flex shell, exposes the derived state to descendant styles, and owns the desktop, mobile, and icon width variables. Keep one provider around the sidebar and its inset.',
        code: `Sidebar.sidebarProvider({
  state,
  width: '16rem',
  mobileWidth: '18rem',
  iconWidth: '3rem',
  children: [appSidebar, pageInset],
}, h)`,
      },
      {
        id: 'sidebar',
        title: 'Sidebar',
        description:
          'Choose a side, visual variant, and collapse strategy independently. sidebar is the flush default, floating adds a framed gutter, and inset pairs with SidebarInset. offcanvas removes the panel, icon reduces it to the icon rail, and none keeps it permanently expanded.',
        code: `Sidebar.sidebar({
  state,
  side: 'left', // left | right
  variant: 'floating', // sidebar | floating | inset
  collapsible: 'icon', // offcanvas | icon | none
  children,
}, h)`,
      },
      {
        id: 'state',
        title: 'Model and messages',
        description:
          'Sidebar.Model stores desktop visibility, mobile visibility, and the persistence key. Delegate every Sidebar.Message to Sidebar.update and map its persistence commands back into the parent message.',
        code: `case 'GotSidebarMessage': {
  const sidebarOp__ = Sidebar.update(
    model.sidebar,
    message.message,
  );
    const sidebar = sidebarOp__.model;
    const commands = sidebarOp__.commands ?? [];
  return { model: { ...model, sidebar }, commands: Command.mapMessages(commands, next =>
      GotSidebarMessage({ message: next }),
    ) }
}`,
      },
      {
        id: 'header-footer-content',
        title: 'Header, footer, and content',
        description:
          'Header and footer stay fixed within the panel while SidebarContent owns the scrollable region. Inputs, workspace switchers, and primary actions usually belong in the header; account and support controls belong in the footer.',
        code: `Sidebar.sidebarHeader({ children: [
  Sidebar.sidebarInput({
    value: model.query,
    onInput: value => ChangedQuery({ value }),
    placeholder: 'Search navigation',
  }, h),
] }, h)

Sidebar.sidebarContent({ children: groups }, h)
Sidebar.sidebarFooter({ children: [accountMenu] }, h)`,
      },
      {
        id: 'groups',
        title: 'Groups',
        description:
          'SidebarGroup provides a labeled navigation region. Compose SidebarGroupLabel, SidebarGroupAction, and SidebarGroupContent; wrap the group content with the existing Collapsible component when the section itself can close.',
        code: `Sidebar.sidebarGroup({ children: [
  Sidebar.sidebarGroupLabel({ children: ['Projects'] }, h),
  Sidebar.sidebarGroupAction({
    onClick: CreatedProject(),
    children: [Icon.plus({}, h)],
  }, h),
  Sidebar.sidebarGroupContent({ children: [projectMenu] }, h),
] }, h)`,
      },
      {
        id: 'menu',
        title: 'Menu and menu items',
        description:
          'SidebarMenu renders the list and SidebarMenuItem establishes the positioning context for a button, action, or badge. Use href for navigation and onClick for commands; active state is explicit and does not depend on the current URL.',
        code: `Sidebar.sidebarMenu({ children: [
  Sidebar.sidebarMenuItem({ children: [
    Sidebar.sidebarMenuButton({
      href: '/dashboard',
      isActive: true,
      tooltip: 'Dashboard',
      children: [Icon.icon('gauge', {}, h), h.span([], ['Dashboard'])],
    }, h),
    Sidebar.sidebarMenuBadge({ children: ['12'] }, h),
  ] }, h),
] }, h)`,
      },
      {
        id: 'menu-button',
        title: 'Menu button variants',
        description:
          'Menu buttons support default, outline, and primary emphasis plus small, default, and large sizes. The exported sidebarMenuButtonVariants helper lets Collapsible or DropdownMenu triggers share the exact same visual contract.',
        code: `Sidebar.sidebarMenuButton({
  variant: 'primary',
  size: 'lg',
  children: [Icon.plus({}, h), 'Quick create'],
}, h)

Collapsible.collapsible({
  triggerClass: Sidebar.sidebarMenuButtonVariants(),
  trigger,
  content,
}, h)`,
      },
      {
        id: 'menu-action',
        title: 'Menu actions and badges',
        description:
          'Place SidebarMenuAction after its menu button. showOnHover reduces visual noise while preserving keyboard focus visibility. SidebarMenuBadge is non-interactive and uses tabular numerals for stable counts.',
        code: `Sidebar.sidebarMenuAction({
  onClick: OpenedProjectActions({ projectId }),
  showOnHover: true,
  children: [Icon.moreHorizontal({}, h)],
}, h)

Sidebar.sidebarMenuBadge({ children: ['24'] }, h)`,
      },
      {
        id: 'submenu',
        title: 'Submenus',
        description:
          'Use SidebarMenuSub inside a menu item, then compose sub-items and sub-buttons. In the application shell, Documentation shows inline subitems when expanded and an icon-only dropdown on hover or keyboard activation when collapsed.',
        code: `Sidebar.sidebarMenuSub({ children: items.map(item =>
  Sidebar.sidebarMenuSubItem({ children: [
    Sidebar.sidebarMenuSubButton({
      href: item.href,
      isActive: item.isActive,
      children: [item.label],
    }, h),
  ] }, h),
) }, h)`,
      },
      {
        id: 'skeleton',
        title: 'Loading state',
        description:
          'SidebarMenuSkeleton mirrors a menu row and can reserve icon space. Pass a deterministic widthPercent between 50 and 90 so server and client output remain stable.',
        code: `Sidebar.sidebarMenuSkeleton({
  showIcon: true,
  widthPercent: 72,
}, h)`,
      },
      {
        id: 'trigger-and-rail',
        title: 'Trigger and rail',
        description:
          'SidebarTrigger can receive separate desktop and mobile messages and renders the correct control at the responsive breakpoint. SidebarRail provides the larger edge target used to collapse or restore the desktop panel.',
        code: `Sidebar.sidebarTrigger({
  onClick: GotSidebarMessage({ message: Sidebar.Toggled() }),
  onMobileClick: GotSidebarMessage({ message: Sidebar.ToggledMobile() }),
}, h)

Sidebar.sidebarRail({
  onClick: GotSidebarMessage({ message: Sidebar.Toggled() }),
}, h)`,
      },
      {
        id: 'mobile',
        title: 'Mobile sidebar',
        description:
          'Mobile disclosure is independent from desktop collapse. Pass isMobileOpen and an explicit dismiss message to Sidebar; the responsive trigger sends ToggledMobile on compact viewports and Toggled on desktop.',
        code: `Sidebar.sidebar({
  state,
  isMobileOpen: model.sidebar.isMobileOpen,
  onMobileDismiss: GotSidebarMessage({
    message: Sidebar.SetMobileOpen({ isOpen: false }),
  }),
  children,
}, h)`,
      },
      {
        id: 'keyboard',
        title: 'Keyboard shortcut',
        description:
          'Register Sidebar.shortcut once at the application boundary. It listens for Control+B or Command+B, prevents the browser default, and emits the ordinary desktop toggle message.',
        code: `export const subscriptions = Subscription.make<Model, Message>()(() => ({
  sidebarShortcut: Subscription.persistent(
    Sidebar.shortcut(next => GotSidebarMessage({ message: next })),
  ),
}))`,
      },
    ],
    apiHref: 'https://foldkit.dev/guide/subscriptions',
    apiDescription:
      'Read the Foldkit subscription guide for application-level keyboard and event streams.',
    composition: `SidebarProvider
|-- Sidebar
|   |-- SidebarHeader
|   |-- SidebarContent
|   |   \-- SidebarGroup
|   |       |-- SidebarGroupLabel + SidebarGroupAction
|   |       \-- SidebarGroupContent
|   |           \-- SidebarMenu
|   |               \-- SidebarMenuItem
|   |                   |-- SidebarMenuButton
|   |                   |-- SidebarMenuAction + SidebarMenuBadge
|   |                   \-- SidebarMenuSub
|   |-- SidebarFooter
|   \-- SidebarRail
\-- SidebarInset
    \-- SidebarTrigger + application content`,
    styling:
      'Sidebar uses the semantic sidebar color tokens and provider-owned width variables. Tailwind descendants respond through data selectors; StyleX receives layout state explicitly where selector inheritance is not available. Collapse and expansion use the same 450-millisecond easing as Sheet, with transitions disabled for reduced motion.',
    accessibility:
      'Use links for navigation and buttons for commands. Triggers and the rail have accessible names, actions remain focusable when visually deferred, and mobile disclosure includes a named aside and dismiss backdrop. Tooltips supplement icon labels but never replace an accessible name.',
    keyboard: [
      ['Ctrl/Command + B', 'Toggles the persistent desktop sidebar state.'],
      [
        'Tab',
        'Moves through the trigger, visible navigation, row actions, and footer controls.',
      ],
      [
        'Enter / Space',
        'Activates the focused button, link, trigger, or disclosure.',
      ],
      [
        'Escape',
        'Close nested overlays such as dropdown menus through their own submodel.',
      ],
    ],
    examples: sidebarExamples('tailwind'),
    stylexExamples: sidebarExamples('stylex'),
    pleatExamples: sidebarExamples('pleat'),
  },
})
