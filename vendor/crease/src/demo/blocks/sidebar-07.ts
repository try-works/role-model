import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/lib/icon'
import { avatar, avatarFallback } from '@/ui/avatar'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbList,
  breadcrumbPage,
  breadcrumbSeparator,
} from '@/ui/breadcrumb'
import * as Collapsible from '@/ui/collapsible'
import * as DropdownMenu from '@/ui/dropdown-menu'
import { separator } from '@/ui/separator'
import {
  sidebar,
  sidebarContent,
  sidebarFooter,
  sidebarGroup,
  sidebarGroupLabel,
  sidebarHeader,
  sidebarInset,
  sidebarMenu,
  sidebarMenuAction,
  sidebarMenuButton,
  sidebarMenuButtonVariants,
  sidebarMenuItem,
  sidebarMenuSub,
  sidebarMenuSubButton,
  sidebarMenuSubItem,
  sidebarProvider,
  sidebarRail,
  sidebarTrigger,
} from '@/ui/sidebar'

type Team = Readonly<{
  name: string
  logo: string
  plan: string
}>

type NavMainItem = Readonly<{
  title: string
  url: string
  icon: string
  isActive?: boolean
  items: ReadonlyArray<
    Readonly<{
      title: string
      url: string
    }>
  >
}>

type Project = Readonly<{
  name: string
  url: string
  icon: string
}>

// Sample data copied from the source block; icon components become their
// equivalent lucide-static names for foldkit's icon renderer.
export const data = {
  user: {
    name: 'CreaseUI',
    email: 'm@example.com',
    avatar: '/logo-mark.svg',
  },
  teams: [
    {
      name: 'Acme Inc',
      logo: 'gallery-vertical-end',
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: 'audio-waveform',
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: 'command',
      plan: 'Free',
    },
  ] satisfies ReadonlyArray<Team>,
  navMain: [
    {
      title: 'Playground',
      url: '#',
      icon: 'square-terminal',
      isActive: true,
      items: [
        { title: 'History', url: '#' },
        { title: 'Starred', url: '#' },
        { title: 'Settings', url: '#' },
      ],
    },
    {
      title: 'Models',
      url: '#',
      icon: 'bot',
      items: [
        { title: 'Genesis', url: '#' },
        { title: 'Explorer', url: '#' },
        { title: 'Quantum', url: '#' },
      ],
    },
    {
      title: 'Documentation',
      url: '#',
      icon: 'book-open',
      items: [
        { title: 'Introduction', url: '#' },
        { title: 'Get Started', url: '#' },
        { title: 'Tutorials', url: '#' },
        { title: 'Changelog', url: '#' },
      ],
    },
    {
      title: 'Settings',
      url: '#',
      icon: 'settings-2',
      items: [
        { title: 'General', url: '#' },
        { title: 'Team', url: '#' },
        { title: 'Billing', url: '#' },
        { title: 'Limits', url: '#' },
      ],
    },
  ] satisfies ReadonlyArray<NavMainItem>,
  projects: [
    { name: 'Design Engineering', url: '#', icon: 'frame' },
    { name: 'Sales & Marketing', url: '#', icon: 'chart-pie' },
    { name: 'Travel', url: '#', icon: 'map' },
  ] satisfies ReadonlyArray<Project>,
}

type TeamMenuItem = 'team-0' | 'team-1' | 'team-2' | 'add-team'
type UserMenuItem =
  | 'upgrade'
  | 'account'
  | 'billing'
  | 'notifications'
  | 'log-out'

const TEAM_MENU_ITEMS: ReadonlyArray<TeamMenuItem> = [
  'team-0',
  'team-1',
  'team-2',
  'add-team',
]

const USER_MENU_ITEMS: ReadonlyArray<UserMenuItem> = [
  'upgrade',
  'account',
  'billing',
  'notifications',
  'log-out',
]

const TeamMenu = DropdownMenu.create<TeamMenuItem>()
const UserMenu = DropdownMenu.create<UserMenuItem>()

// MODEL

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
  activeTeamIndex: S.Number,
  navMainOpen: S.Array(S.Boolean),
  teamMenu: DropdownMenu.Model,
  userMenu: DropdownMenu.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
  ToggledNavMain: {
    index: S.Number,
    isOpen: S.Boolean,
  },
  GotTeamMenuMessage: {
    message: DropdownMenu.Message,
  },
  GotUserMenuMessage: {
    message: DropdownMenu.Message,
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  isMobileOpen: false,
  isSidebarOpen: true,
  activeTeamIndex: 0,
  navMainOpen: data.navMain.map(item => item.isActive ?? false),
  teamMenu: DropdownMenu.init({
    id: 'sidebar-07-team-switcher',
    isAnimated: true,
  }),
  userMenu: DropdownMenu.init({
    id: 'sidebar-07-user-menu',
    isAnimated: true,
  }),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ToggledMobileSidebar: () => ({
        model: modifyFields(model, { isMobileOpen: current => !current }),
      }),
      ToggledSidebar: () => ({
        model: modifyFields(model, { isSidebarOpen: current => !current }),
      }),
      ToggledNavMain: ({ index, isOpen }) => {
        if (model.navMainOpen[index] === undefined) {
          return { model: model }
        }
        return {
          model: modifyFields(model, {
            navMainOpen: items =>
              items.map((open, itemIndex) =>
                itemIndex === index ? isOpen : open,
              ),
          }),
        }
      },
      GotTeamMenuMessage: ({ message: childMessage }) => {
        const teamMenuOp__ = TeamMenu.update(model.teamMenu, childMessage)
        const teamMenu = teamMenuOp__.model
        const commands = teamMenuOp__.commands ?? []
        const maybeSelection = Option.fromNullishOr(teamMenuOp__.outMessage)
        const activeTeamIndex = Option.match(maybeSelection, {
          onNone: () => model.activeTeamIndex,
          onSome: ({ value }) =>
            value === 'team-0'
              ? 0
              : value === 'team-1'
                ? 1
                : value === 'team-2'
                  ? 2
                  : model.activeTeamIndex,
        })

        return {
          model: modifyFields(model, {
            teamMenu: () => teamMenu,
            activeTeamIndex: () => activeTeamIndex,
          }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotTeamMenuMessage({ message: nextMessage }),
          ),
        }
      },
      GotUserMenuMessage: ({ message: childMessage }) => {
        const userMenuOp__ = UserMenu.update(model.userMenu, childMessage)
        const userMenu = userMenuOp__.model
        const commands = userMenuOp__.commands ?? []

        return {
          model: modifyFields(model, { userMenu: () => userMenu }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotUserMenuMessage({ message: nextMessage }),
          ),
        }
      },
    }),
  )

// VIEW

const teamLogo = (
  team: Team,
  className: string,
  h: HtmlBuilder<Message>,
): Html => Icon.icon<Message>(team.logo, { class: className }, h)

const teamSwitcher = (model: Model, h: HtmlBuilder<Message>): Html => {
  const activeTeam = data.teams[model.activeTeamIndex] ?? data.teams[0]

  if (activeTeam === undefined) {
    return h.div([], [])
  }

  const trigger = h.span(
    [h.Class('contents')],
    [
      h.div(
        [
          h.Class(
            'flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground',
          ),
        ],
        [teamLogo(activeTeam, 'size-4', h)],
      ),
      h.div(
        [h.Class('grid flex-1 text-left text-sm leading-tight')],
        [
          h.span([h.Class('truncate font-medium')], [activeTeam.name]),
          h.span([h.Class('truncate text-xs')], [activeTeam.plan]),
        ],
      ),
      Icon.chevronsUpDown({ class: 'ml-auto size-4 shrink-0' }, h),
    ],
  )

  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<TeamMenuItem, Message>(
                {
                  model: model.teamMenu,
                  toParentMessage: message =>
                    Message.GotTeamMenuMessage({ message }),
                  trigger,
                  triggerClass: sidebarMenuButtonVariants({
                    size: 'lg',
                    class:
                      'data-[open]:bg-sidebar-accent data-[open]:text-sidebar-accent-foreground',
                  }),
                  items: TEAM_MENU_ITEMS,
                  itemToConfig: item => {
                    if (item === 'add-team') {
                      return {
                        label: h.span(
                          [h.Class('font-medium text-muted-foreground')],
                          ['Add team'],
                        ),
                        icon: h.div(
                          [
                            h.Class(
                              'flex size-6 items-center justify-center rounded-md border bg-transparent',
                            ),
                          ],
                          [Icon.plus({ class: 'size-4' }, h)],
                        ),
                        group: '',
                      }
                    }

                    const teamIndex =
                      item === 'team-0' ? 0 : item === 'team-1' ? 1 : 2
                    const team = data.teams[teamIndex]

                    return {
                      label: team?.name ?? '',
                      ...(team === undefined
                        ? {}
                        : {
                            icon: h.div(
                              [
                                h.Class(
                                  'flex size-6 items-center justify-center rounded-md border',
                                ),
                              ],
                              [teamLogo(team, 'size-3.5 shrink-0', h)],
                            ),
                          }),
                      shortcut: `⌘${teamIndex + 1}`,
                      group: 'Teams',
                    }
                  },
                  side: 'right',
                  align: 'start',
                  ariaLabel: 'Switch team',
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const navMain = (
  openStates: ReadonlyArray<boolean>,
  h: HtmlBuilder<Message>,
): Html =>
  sidebarGroup<Message>(
    {
      children: [
        sidebarGroupLabel({ children: ['Platform'] }, h),
        sidebarMenu(
          {
            children: data.navMain.flatMap((item, index) => {
              const isOpen = openStates[index]

              if (isOpen === undefined) {
                return []
              }

              const trigger = h.span(
                [h.Class('contents')],
                [
                  Icon.icon(item.icon, { class: 'size-4 shrink-0' }, h),
                  h.span([], [item.title]),
                  Icon.chevronRight(
                    {
                      class: `ml-auto size-4 shrink-0 transition-transform duration-200${
                        isOpen ? ' rotate-90' : ''
                      }`,
                    },
                    h,
                  ),
                ],
              )
              const content = sidebarMenuSub<Message>(
                {
                  children: item.items.map(subItem =>
                    sidebarMenuSubItem(
                      {
                        children: [
                          sidebarMenuSubButton(
                            {
                              href: subItem.url,
                              children: [subItem.title],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ),
                },
                h,
              )

              // The shared Collapsible owns the actual trigger button. Applying
              // SidebarMenuButton's exported variants avoids nested buttons while
              // retaining the source block's menu-button appearance.
              return [
                sidebarMenuItem(
                  {
                    children: [
                      Collapsible.collapsible<Message>(
                        {
                          id: `sidebar-07-nav-main-${index}`,
                          isOpen,
                          onToggle: nextIsOpen =>
                            Message.ToggledNavMain({
                              index,
                              isOpen: nextIsOpen,
                            }),
                          class: 'group/collapsible',
                          trigger,
                          triggerClass: sidebarMenuButtonVariants(),
                          content,
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ]
            }),
          },
          h,
        ),
      ],
    },
    h,
  )

const navProjects = (h: HtmlBuilder<Message>): Html => {
  return sidebarGroup(
    {
      class: 'group-data-[collapsible=icon]:hidden',
      children: [
        sidebarGroupLabel({ children: ['Projects'] }, h),
        sidebarMenu(
          {
            children: [
              ...data.projects.map(project =>
                sidebarMenuItem(
                  {
                    children: [
                      sidebarMenuButton(
                        {
                          href: project.url,
                          children: [
                            Icon.icon(project.icon, {}, h),
                            h.span([], [project.name]),
                          ],
                        },
                        h,
                      ),
                      sidebarMenuAction(
                        {
                          showOnHover: true,
                          children: [
                            Icon.moreHorizontal({}, h),
                            h.span([h.Class('sr-only')], ['More']),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ),
              sidebarMenuItem(
                {
                  children: [
                    sidebarMenuButton(
                      {
                        class: 'text-sidebar-foreground/70',
                        children: [
                          Icon.moreHorizontal(
                            {
                              class: 'text-sidebar-foreground/70',
                            },
                            h,
                          ),
                          h.span([], ['More']),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const userSummary = (h: HtmlBuilder<Message>): Html => {
  return h.span(
    [h.Class('contents')],
    [
      avatar(
        {
          class: 'size-8 rounded-lg',
          children: [
            avatarFallback(
              {
                class: 'rounded-lg',
                children: ['CU'],
              },
              h,
            ),
          ],
        },
        h,
      ),
      h.div(
        [h.Class('grid flex-1 text-left text-sm leading-tight')],
        [
          h.span([h.Class('truncate font-medium')], [data.user.name]),
          h.span([h.Class('truncate text-xs')], [data.user.email]),
        ],
      ),
    ],
  )
}

const navUser = (model: DropdownMenu.Model, h: HtmlBuilder<Message>): Html => {
  const trigger = h.span(
    [h.Class('contents')],
    [userSummary(h), Icon.chevronsUpDown({ class: 'ml-auto size-4' }, h)],
  )

  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<UserMenuItem, Message>(
                {
                  model,
                  toParentMessage: message =>
                    Message.GotUserMenuMessage({ message }),
                  trigger,
                  triggerClass: sidebarMenuButtonVariants({
                    size: 'lg',
                    class:
                      'data-[open]:bg-sidebar-accent data-[open]:text-sidebar-accent-foreground',
                  }),
                  items: USER_MENU_ITEMS,
                  itemToConfig: item =>
                    M.value(item).pipe(
                      M.withReturnType<DropdownMenu.DropdownMenuItemConfig>(),
                      M.when('upgrade', () => ({
                        label: 'Upgrade to Pro',
                        icon: Icon.icon('sparkles', {}, h),
                        group: 'CreaseUI · m@example.com',
                      })),
                      M.when('account', () => ({
                        label: 'Account',
                        icon: Icon.icon('badge-check', {}, h),
                        group: 'Account',
                      })),
                      M.when('billing', () => ({
                        label: 'Billing',
                        icon: Icon.icon('credit-card', {}, h),
                        group: 'Account',
                      })),
                      M.when('notifications', () => ({
                        label: 'Notifications',
                        icon: Icon.icon('bell', {}, h),
                        group: 'Account',
                      })),
                      M.when('log-out', () => ({
                        label: 'Log out',
                        icon: Icon.icon('log-out', {}, h),
                        group: '',
                      })),
                      M.exhaustive,
                    ),
                  side: 'right',
                  align: 'end',
                  ariaLabel: 'User menu',
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      collapsible: 'icon',
      children: [
        sidebarHeader({ children: [teamSwitcher(model, h)] }, h),
        sidebarContent(
          {
            children: [navMain(model.navMainOpen, h), navProjects(h)],
          },
          h,
        ),
        sidebarFooter({ children: [navUser(model.userMenu, h)] }, h),
        sidebarRail({ onClick: Message.ToggledSidebar() }, h),
      ],
    },
    h,
  )
}

const pageContent = (h: HtmlBuilder<Message>): Html => {
  return sidebarInset(
    {
      children: [
        h.header(
          [
            h.Class(
              'flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
            ),
          ],
          [
            h.div(
              [h.Class('flex items-center gap-2 px-4')],
              [
                sidebarTrigger(
                  {
                    onMobileClick: Message.ToggledMobileSidebar(),
                    onClick: Message.ToggledSidebar(),
                    class: '-ml-1',
                  },
                  h,
                ),
                separator(
                  {
                    orientation: 'vertical',
                    class: 'mr-2 data-[orientation=vertical]:h-4',
                  },
                  h,
                ),
                breadcrumb(
                  {
                    children: [
                      breadcrumbList(
                        {
                          children: [
                            breadcrumbItem(
                              {
                                class: 'hidden md:block',
                                children: [
                                  breadcrumbLink(
                                    {
                                      href: '#',
                                      children: ['Build Your Application'],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                            breadcrumbSeparator(
                              {
                                class: 'hidden md:block',
                              },
                              h,
                            ),
                            breadcrumbItem(
                              {
                                children: [
                                  breadcrumbPage(
                                    {
                                      children: ['Data Fetching'],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            ),
          ],
        ),
        h.div(
          [h.Class('flex flex-1 flex-col gap-4 p-4 pt-0')],
          [
            h.div(
              [h.Class('grid auto-rows-min gap-4 md:grid-cols-3')],
              [
                h.div([h.Class('aspect-video rounded-xl bg-muted/50')], []),
                h.div([h.Class('aspect-video rounded-xl bg-muted/50')], []),
                h.div([h.Class('aspect-video rounded-xl bg-muted/50')], []),
              ],
            ),
            h.div(
              [
                h.Class(
                  'min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min',
                ),
              ],
              [],
            ),
          ],
        ),
      ],
    },
    h,
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebarProvider<Message>(
    {
      state,
      children: [appSidebar(model, h), pageContent(h)],
    },
    h,
  )
}

// PORT NOTE: Avatar files are not bundled, so the source image is represented
// by its CU fallback. The dropdown wrapper cannot render the source's rich
// non-selectable user label, so the same identity is shown in the trigger and
// summarized as the first menu group heading.
// PORT NOTE: Per-project dropdowns are intentionally represented by static
// ellipsis actions, as allowed by the block task, to avoid three extra models.
