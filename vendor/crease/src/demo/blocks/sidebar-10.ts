import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/lib/icon'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbList,
  breadcrumbPage,
} from '@/ui/breadcrumb'
import { buttonVariants } from '@/ui/button'
import * as Collapsible from '@/ui/collapsible'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Popover from '@/ui/popover'
import { separator } from '@/ui/separator'
import {
  sidebar,
  sidebarContent,
  sidebarGroup,
  sidebarGroupContent,
  sidebarGroupLabel,
  sidebarHeader,
  sidebarInset,
  sidebarMenu,
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

type NavItem = Readonly<{
  title: string
  url: string
  icon: string
  isActive?: boolean
  badge?: string
}>

type Favorite = Readonly<{
  name: string
  url: string
  emoji: string
}>

type WorkspacePage = Readonly<{
  name: string
  url: string
  emoji: string
}>

type Workspace = Readonly<{
  name: string
  emoji: string
  pages: ReadonlyArray<WorkspacePage>
}>

export const data = {
  teams: [
    { name: 'Acme Inc', logo: 'command', plan: 'Enterprise' },
    { name: 'Acme Corp.', logo: 'audio-waveform', plan: 'Startup' },
    { name: 'Evil Corp.', logo: 'command', plan: 'Free' },
  ] satisfies ReadonlyArray<Team>,
  navMain: [
    { title: 'Search', url: '#', icon: 'search' },
    { title: 'Ask AI', url: '#', icon: 'sparkles' },
    {
      title: 'Home',
      url: '#',
      icon: 'house',
      isActive: true,
    },
    { title: 'Inbox', url: '#', icon: 'inbox', badge: '10' },
  ] satisfies ReadonlyArray<NavItem>,
  navSecondary: [
    { title: 'Calendar', url: '#', icon: 'calendar' },
    { title: 'Settings', url: '#', icon: 'settings-2' },
    { title: 'Templates', url: '#', icon: 'blocks' },
    { title: 'Trash', url: '#', icon: 'trash-2' },
    {
      title: 'Help',
      url: '#',
      icon: 'message-circle-question-mark',
    },
  ] satisfies ReadonlyArray<NavItem>,
  favorites: [
    {
      name: 'Project Management & Task Tracking',
      url: '#',
      emoji: '📊',
    },
    {
      name: 'Family Recipe Collection & Meal Planning',
      url: '#',
      emoji: '🍳',
    },
    {
      name: 'Fitness Tracker & Workout Routines',
      url: '#',
      emoji: '💪',
    },
    {
      name: 'Book Notes & Reading List',
      url: '#',
      emoji: '📚',
    },
    {
      name: 'Sustainable Gardening Tips & Plant Care',
      url: '#',
      emoji: '🌱',
    },
    {
      name: 'Language Learning Progress & Resources',
      url: '#',
      emoji: '🗣️',
    },
    {
      name: 'Home Renovation Ideas & Budget Tracker',
      url: '#',
      emoji: '🏠',
    },
    {
      name: 'Personal Finance & Investment Portfolio',
      url: '#',
      emoji: '💰',
    },
    {
      name: 'Movie & TV Show Watchlist with Reviews',
      url: '#',
      emoji: '🎬',
    },
    {
      name: 'Daily Habit Tracker & Goal Setting',
      url: '#',
      emoji: '✅',
    },
  ] satisfies ReadonlyArray<Favorite>,
  workspaces: [
    {
      name: 'Personal Life Management',
      emoji: '🏠',
      pages: [
        {
          name: 'Daily Journal & Reflection',
          url: '#',
          emoji: '📔',
        },
        {
          name: 'Health & Wellness Tracker',
          url: '#',
          emoji: '🍏',
        },
        {
          name: 'Personal Growth & Learning Goals',
          url: '#',
          emoji: '🌟',
        },
      ],
    },
    {
      name: 'Professional Development',
      emoji: '💼',
      pages: [
        {
          name: 'Career Objectives & Milestones',
          url: '#',
          emoji: '🎯',
        },
        {
          name: 'Skill Acquisition & Training Log',
          url: '#',
          emoji: '🧠',
        },
        {
          name: 'Networking Contacts & Events',
          url: '#',
          emoji: '🤝',
        },
      ],
    },
    {
      name: 'Creative Projects',
      emoji: '🎨',
      pages: [
        {
          name: 'Writing Ideas & Story Outlines',
          url: '#',
          emoji: '✍️',
        },
        {
          name: 'Art & Design Portfolio',
          url: '#',
          emoji: '🖼️',
        },
        {
          name: 'Music Composition & Practice Log',
          url: '#',
          emoji: '🎵',
        },
      ],
    },
    {
      name: 'Home Management',
      emoji: '🏡',
      pages: [
        {
          name: 'Household Budget & Expense Tracking',
          url: '#',
          emoji: '💰',
        },
        {
          name: 'Home Maintenance Schedule & Tasks',
          url: '#',
          emoji: '🔧',
        },
        {
          name: 'Family Calendar & Event Planning',
          url: '#',
          emoji: '📅',
        },
      ],
    },
    {
      name: 'Travel & Adventure',
      emoji: '🧳',
      pages: [
        {
          name: 'Trip Planning & Itineraries',
          url: '#',
          emoji: '🗺️',
        },
        {
          name: 'Travel Bucket List & Inspiration',
          url: '#',
          emoji: '🌎',
        },
        {
          name: 'Travel Journal & Photo Gallery',
          url: '#',
          emoji: '📸',
        },
      ],
    },
  ] satisfies ReadonlyArray<Workspace>,
}

const actionGroups = [
  [
    { label: 'Customize Page', icon: 'settings-2' },
    { label: 'Turn into wiki', icon: 'file-text' },
  ],
  [
    { label: 'Copy Link', icon: 'link' },
    { label: 'Duplicate', icon: 'copy' },
    { label: 'Move to', icon: 'corner-up-right' },
    { label: 'Move to Trash', icon: 'trash-2' },
  ],
  [
    { label: 'Undo', icon: 'corner-up-left' },
    { label: 'View analytics', icon: 'chart-no-axes-combined' },
    { label: 'Version History', icon: 'gallery-vertical-end' },
    { label: 'Show delete pages', icon: 'trash' },
    { label: 'Notifications', icon: 'bell' },
  ],
  [
    { label: 'Import', icon: 'arrow-up' },
    { label: 'Export', icon: 'arrow-down' },
  ],
] as const

type TeamAction = 'team-0' | 'team-1' | 'team-2' | 'add-team'
type FavoriteAction = 'remove' | 'copy-link' | 'open-tab' | 'delete'

const TEAM_ACTIONS: ReadonlyArray<TeamAction> = [
  'team-0',
  'team-1',
  'team-2',
  'add-team',
]
const FAVORITE_ACTIONS: ReadonlyArray<FavoriteAction> = [
  'remove',
  'copy-link',
  'open-tab',
  'delete',
]

const TeamMenu = DropdownMenu.create<TeamAction>()
const FavoriteMenu = DropdownMenu.create<FavoriteAction>()

// MODEL

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
  activeTeamIndex: S.Number,
  teamMenu: DropdownMenu.Model,
  favoriteMenus: S.Array(DropdownMenu.Model),
  workspaceOpen: S.Array(S.Boolean),
  actionsPopover: Popover.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
  GotTeamMenuMessage: {
    message: DropdownMenu.Message,
  },
  GotFavoriteMenuMessage: {
    index: S.Number,
    message: DropdownMenu.Message,
  },
  ToggledWorkspace: {
    index: S.Number,
    isOpen: S.Boolean,
  },
  GotActionsPopoverMessage: {
    message: Popover.Message,
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  isMobileOpen: false,
  isSidebarOpen: true,
  activeTeamIndex: 0,
  teamMenu: DropdownMenu.init({
    id: 'sidebar-10-team-menu',
    isAnimated: true,
  }),
  favoriteMenus: data.favorites.map((_, index) =>
    DropdownMenu.init({
      id: `sidebar-10-favorite-menu-${index}`,
      isAnimated: true,
    }),
  ),
  workspaceOpen: data.workspaces.map(() => false),
  actionsPopover: Popover.init({
    id: 'sidebar-10-actions-popover',
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
      GotTeamMenuMessage: ({ message: childMessage }) => {
        const {
          model: teamMenu,
          commands: teamMenuCommands__,
          outMessage: teamMenuOut__,
        } = TeamMenu.update(model.teamMenu, childMessage)
        const commands = teamMenuCommands__ ?? []
        const selection = Option.fromNullishOr(teamMenuOut__)
        const activeTeamIndex = Option.match(selection, {
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
      GotFavoriteMenuMessage: ({ index, message: childMessage }) => {
        const current = model.favoriteMenus[index]

        if (current === undefined) {
          return { model: model }
        }

        const { model: next, commands: nextCommands__ } = FavoriteMenu.update(
          current,
          childMessage,
        )
        const commands = nextCommands__ ?? []

        return {
          model: modifyFields(model, {
            favoriteMenus: menus =>
              menus.map((menu, menuIndex) =>
                menuIndex === index ? next : menu,
              ),
          }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotFavoriteMenuMessage({ index, message: nextMessage }),
          ),
        }
      },
      ToggledWorkspace: ({ index, isOpen }) => {
        if (model.workspaceOpen[index] === undefined) {
          return { model: model }
        }
        return {
          model: modifyFields(model, {
            workspaceOpen: items =>
              items.map((open, itemIndex) =>
                itemIndex === index ? isOpen : open,
              ),
          }),
        }
      },
      GotActionsPopoverMessage: ({ message: childMessage }) => {
        const { model: actionsPopover, commands: actionsPopoverCommands__ } =
          Popover.update(model.actionsPopover, childMessage)
        const commands = actionsPopoverCommands__ ?? []

        return {
          model: modifyFields(model, { actionsPopover: () => actionsPopover }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotActionsPopoverMessage({ message: nextMessage }),
          ),
        }
      },
    }),
  )

// VIEW

const teamSwitcher = (model: Model, h: HtmlBuilder<Message>): Html => {
  const activeTeam = data.teams[model.activeTeamIndex] ?? data.teams[0]

  if (activeTeam === undefined) {
    return h.div([], [])
  }

  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<TeamAction, Message>(
                {
                  model: model.teamMenu,
                  toParentMessage: message =>
                    Message.GotTeamMenuMessage({ message }),
                  trigger: h.span(
                    [h.Class('contents')],
                    [
                      h.div(
                        [
                          h.Class(
                            'flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground',
                          ),
                        ],
                        [
                          Icon.icon(
                            activeTeam.logo,
                            {
                              class: 'size-3',
                            },
                            h,
                          ),
                        ],
                      ),
                      h.span(
                        [h.Class('truncate font-medium')],
                        [activeTeam.name],
                      ),
                      Icon.chevronDown(
                        {
                          class: 'size-4 shrink-0 opacity-50',
                        },
                        h,
                      ),
                    ],
                  ),
                  triggerClass: sidebarMenuButtonVariants({
                    class: 'w-fit px-1.5',
                  }),
                  items: TEAM_ACTIONS,
                  itemToConfig: action => {
                    if (action === 'add-team') {
                      return {
                        label: 'Add team',
                        icon: h.div(
                          [
                            h.Class(
                              'flex size-6 items-center justify-center rounded-md border bg-background',
                            ),
                          ],
                          [Icon.plus({ class: 'size-4' }, h)],
                        ),
                        group: '',
                      }
                    }

                    const index =
                      action === 'team-0' ? 0 : action === 'team-1' ? 1 : 2
                    const team = data.teams[index]

                    return {
                      label: team?.name ?? '',
                      icon: h.div(
                        [
                          h.Class(
                            'flex size-6 items-center justify-center rounded-xs border',
                          ),
                        ],
                        [
                          Icon.icon(
                            team?.logo ?? 'command',
                            {
                              class: 'size-4 shrink-0',
                            },
                            h,
                          ),
                        ],
                      ),
                      shortcut: `⌘${index + 1}`,
                      group: 'Teams',
                    }
                  },
                  side: 'bottom',
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

const navMain = (h: HtmlBuilder<Message>): Html => {
  return sidebarMenu(
    {
      children: data.navMain.map(item =>
        sidebarMenuItem(
          {
            children: [
              sidebarMenuButton(
                {
                  href: item.url,
                  ...(item.isActive === undefined
                    ? {}
                    : { isActive: item.isActive }),
                  children: [
                    Icon.icon(item.icon, {}, h),
                    h.span([], [item.title]),
                  ],
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
}

const favoriteActionConfig = (
  action: FavoriteAction,
  h: HtmlBuilder<Message>,
): DropdownMenu.DropdownMenuItemConfig<FavoriteAction> =>
  M.value(action).pipe(
    M.withReturnType<DropdownMenu.DropdownMenuItemConfig<FavoriteAction>>(),
    M.when('remove', () => ({
      label: 'Remove from Favorites',
      icon: Icon.icon(
        'star-off',
        {
          class: 'text-muted-foreground',
        },
        h,
      ),
      group: 'Favorite',
    })),
    M.when('copy-link', () => ({
      label: 'Copy Link',
      icon: Icon.icon('link', { class: 'text-muted-foreground' }, h),
      group: 'Page',
    })),
    M.when('open-tab', () => ({
      label: 'Open in New Tab',
      icon: Icon.icon(
        'arrow-up-right',
        {
          class: 'text-muted-foreground',
        },
        h,
      ),
      group: 'Page',
    })),
    M.when('delete', () => ({
      label: 'Delete',
      icon: Icon.icon(
        'trash-2',
        {
          class: 'text-muted-foreground',
        },
        h,
      ),
      group: '',
    })),
    M.exhaustive,
  )

const ROW_ACTION_CLASS =
  'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 after:absolute after:-inset-2 group-data-[collapsible=icon]:hidden group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[open]:opacity-100 md:opacity-0'

const navFavorites = (
  models: ReadonlyArray<DropdownMenu.Model>,
  h: HtmlBuilder<Message>,
): Html => {
  return sidebarGroup(
    {
      class: 'group-data-[collapsible=icon]:hidden',
      children: [
        sidebarGroupLabel({ children: ['Favorites'] }, h),
        sidebarMenu(
          {
            children: [
              ...data.favorites.flatMap((item, index) => {
                const model = models[index]

                if (model === undefined) {
                  return []
                }

                return [
                  sidebarMenuItem(
                    {
                      children: [
                        sidebarMenuButton(
                          {
                            href: item.url,
                            children: [
                              h.span([], [item.emoji]),
                              h.span([], [item.name]),
                            ],
                          },
                          h,
                        ),
                        DropdownMenu.dropdownMenu<FavoriteAction, Message>(
                          {
                            model,
                            toParentMessage: message =>
                              Message.GotFavoriteMenuMessage({
                                index,
                                message,
                              }),
                            trigger: h.span(
                              [h.Class('contents')],
                              [
                                Icon.moreHorizontal({ class: 'size-4' }, h),
                                h.span([h.Class('sr-only')], ['More']),
                              ],
                            ),
                            placement: 'sidebarAction',
                            triggerClass: ROW_ACTION_CLASS,
                            items: FAVORITE_ACTIONS,
                            itemToConfig: action =>
                              favoriteActionConfig(action, h),
                            side: 'right',
                            align: 'start',
                            ariaLabel: `${item.name} actions`,
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ]
              }),
              sidebarMenuItem(
                {
                  children: [
                    sidebarMenuButton(
                      {
                        class: 'text-sidebar-foreground/70',
                        children: [
                          Icon.moreHorizontal({}, h),
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

const navWorkspaces = (
  openStates: ReadonlyArray<boolean>,
  h: HtmlBuilder<Message>,
): Html => {
  return sidebarGroup(
    {
      children: [
        sidebarGroupLabel({ children: ['Workspaces'] }, h),
        sidebarGroupContent(
          {
            children: [
              sidebarMenu(
                {
                  children: [
                    ...data.workspaces.flatMap((workspace, index) => {
                      const isOpen = openStates[index]

                      if (isOpen === undefined) {
                        return []
                      }

                      return [
                        sidebarMenuItem(
                          {
                            children: [
                              Collapsible.collapsible(
                                {
                                  id: `sidebar-10-workspace-${index}`,
                                  isOpen,
                                  onToggle: nextIsOpen =>
                                    Message.ToggledWorkspace({
                                      index,
                                      isOpen: nextIsOpen,
                                    }),
                                  class: 'group/collapsible',
                                  triggerClass: sidebarMenuButtonVariants(),
                                  trigger: h.span(
                                    [h.Class('contents')],
                                    [
                                      h.span([], [workspace.emoji]),
                                      h.span([], [workspace.name]),
                                      Icon.chevronRight(
                                        {
                                          class: `ml-auto size-4 shrink-0 transition-transform${
                                            isOpen ? ' rotate-90' : ''
                                          }`,
                                        },
                                        h,
                                      ),
                                    ],
                                  ),
                                  content: sidebarMenuSub(
                                    {
                                      children: workspace.pages.map(page =>
                                        sidebarMenuSubItem(
                                          {
                                            children: [
                                              sidebarMenuSubButton(
                                                {
                                                  href: page.url,
                                                  children: [
                                                    h.span([], [page.emoji]),
                                                    h.span([], [page.name]),
                                                  ],
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
                                  ),
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                      ]
                    }),
                    sidebarMenuItem(
                      {
                        children: [
                          sidebarMenuButton(
                            {
                              class: 'text-sidebar-foreground/70',
                              children: [
                                Icon.moreHorizontal({}, h),
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
        ),
      ],
    },
    h,
  )
}

const navSecondary = (h: HtmlBuilder<Message>): Html => {
  return sidebarGroup(
    {
      class: 'mt-auto',
      children: [
        sidebarGroupContent(
          {
            children: [
              sidebarMenu(
                {
                  children: data.navSecondary.map(item =>
                    sidebarMenuItem(
                      {
                        children: [
                          sidebarMenuButton(
                            {
                              href: item.url,
                              children: [
                                Icon.icon(item.icon, {}, h),
                                h.span([], [item.title]),
                              ],
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

const actionPopoverContent = (h: HtmlBuilder<Message>): Html =>
  sidebar<Message>(
    {
      collapsible: 'none',
      class: 'bg-transparent',
      children: [
        sidebarContent(
          {
            children: actionGroups.map(group =>
              sidebarGroup(
                {
                  class: 'border-b last:border-none',
                  children: [
                    sidebarGroupContent(
                      {
                        class: 'gap-0',
                        children: [
                          sidebarMenu(
                            {
                              children: group.map(item =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          children: [
                                            Icon.icon(item.icon, {}, h),
                                            h.span([], [item.label]),
                                          ],
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
                          ),
                        ],
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
        ),
      ],
    },
    h,
  )

const navActions = (model: Popover.Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Class('flex items-center gap-2 text-sm')],
    [
      h.div(
        [h.Class('hidden font-medium text-muted-foreground md:inline-block')],
        ['Edit Oct 08'],
      ),
      h.button(
        [
          h.Type('button'),
          h.Class(
            buttonVariants({
              variant: 'ghost',
              size: 'icon',
              class: 'h-7 w-7',
            }),
          ),
        ],
        [Icon.icon('star', {}, h)],
      ),
      Popover.popover(
        {
          model,
          toParentMessage: message =>
            Message.GotActionsPopoverMessage({ message }),
          trigger: Icon.moreHorizontal({ class: 'size-4' }, h),
          triggerClass: buttonVariants({
            variant: 'ghost',
            size: 'icon',
            class: 'h-7 w-7 data-[open]:bg-accent',
          }),
          content: actionPopoverContent(h),
          align: 'end',
          class: 'w-56 overflow-hidden rounded-lg p-0',
        },
        h,
      ),
    ],
  )
}

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      class: 'border-r-0',
      children: [
        sidebarHeader(
          {
            children: [teamSwitcher(model, h), navMain(h)],
          },
          h,
        ),
        sidebarContent(
          {
            children: [
              navFavorites(model.favoriteMenus, h),
              navWorkspaces(model.workspaceOpen, h),
              navSecondary(h),
            ],
          },
          h,
        ),
        sidebarRail({ onClick: Message.ToggledSidebar() }, h),
      ],
    },
    h,
  )
}

const pageContent = (model: Popover.Model, h: HtmlBuilder<Message>): Html => {
  return sidebarInset(
    {
      children: [
        h.header(
          [h.Class('flex h-14 shrink-0 items-center gap-2')],
          [
            h.div(
              [h.Class('flex flex-1 items-center gap-2 px-3')],
              [
                sidebarTrigger(
                  {
                    onMobileClick: Message.ToggledMobileSidebar(),
                    onClick: Message.ToggledSidebar(),
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
                                children: [
                                  breadcrumbPage(
                                    {
                                      class: 'line-clamp-1',
                                      children: [
                                        'Project Management & Task Tracking',
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
                ),
              ],
            ),
            h.div([h.Class('ml-auto px-3')], [navActions(model, h)]),
          ],
        ),
        h.div(
          [h.Class('flex flex-1 flex-col gap-4 px-4 py-10')],
          [
            h.div(
              [h.Class('mx-auto h-24 w-full max-w-3xl rounded-xl bg-muted/50')],
              [],
            ),
            h.div(
              [
                h.Class(
                  'mx-auto h-full w-full max-w-3xl rounded-xl bg-muted/50',
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
      children: [appSidebar(model, h), pageContent(model.actionsPopover, h)],
    },
    h,
  )
}

// PORT NOTE: The source opens the actions popover from a React mount effect.
// This port starts it closed so the modal foldkit backdrop does not block the
// page's sidebar trigger; click/focus behavior is preserved once opened.

/* Minimal interactive wiring:
   const model = init()
   const next = update(model, ToggledSidebar())
   view(next.model)
*/
