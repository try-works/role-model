import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/lib/icon'
import { avatar, avatarFallback } from '@/ui/avatar'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbList,
  breadcrumbPage,
} from '@/ui/breadcrumb'
import * as Calendar from '@/ui/calendar'
import * as Collapsible from '@/ui/collapsible'
import * as DropdownMenu from '@/ui/dropdown-menu'
import { separator } from '@/ui/separator'
import {
  sidebar,
  sidebarContent,
  sidebarFooter,
  sidebarGroup,
  sidebarGroupContent,
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
  sidebarSeparator,
  sidebarTrigger,
} from '@/ui/sidebar'

const leftData = {
  teams: [
    { name: 'Acme Inc', logo: 'command', plan: 'Enterprise' },
    { name: 'Acme Corp.', logo: 'audio-waveform', plan: 'Startup' },
    { name: 'Evil Corp.', logo: 'command', plan: 'Free' },
  ],
  navMain: [
    { title: 'Search', url: '#', icon: 'search' },
    { title: 'Ask AI', url: '#', icon: 'sparkles' },
    { title: 'Home', url: '#', icon: 'house', isActive: true },
    { title: 'Inbox', url: '#', icon: 'inbox', badge: '10' },
  ],
  navSecondary: [
    { title: 'Calendar', url: '#', icon: 'calendar' },
    { title: 'Settings', url: '#', icon: 'settings-2' },
    { title: 'Templates', url: '#', icon: 'blocks' },
    { title: 'Trash', url: '#', icon: 'trash-2' },
    { title: 'Help', url: '#', icon: 'message-circle-question-mark' },
  ],
  favorites: [
    { name: 'Project Management & Task Tracking', url: '#', emoji: '📊' },
    {
      name: 'Family Recipe Collection & Meal Planning',
      url: '#',
      emoji: '🍳',
    },
    { name: 'Fitness Tracker & Workout Routines', url: '#', emoji: '💪' },
    { name: 'Book Notes & Reading List', url: '#', emoji: '📚' },
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
    { name: 'Daily Habit Tracker & Goal Setting', url: '#', emoji: '✅' },
  ],
  workspaces: [
    {
      name: 'Personal Life Management',
      emoji: '🏠',
      pages: [
        { name: 'Daily Journal & Reflection', url: '#', emoji: '📔' },
        { name: 'Health & Wellness Tracker', url: '#', emoji: '🍏' },
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
        { name: 'Career Objectives & Milestones', url: '#', emoji: '🎯' },
        {
          name: 'Skill Acquisition & Training Log',
          url: '#',
          emoji: '🧠',
        },
        { name: 'Networking Contacts & Events', url: '#', emoji: '🤝' },
      ],
    },
    {
      name: 'Creative Projects',
      emoji: '🎨',
      pages: [
        { name: 'Writing Ideas & Story Outlines', url: '#', emoji: '✍️' },
        { name: 'Art & Design Portfolio', url: '#', emoji: '🖼️' },
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
        { name: 'Trip Planning & Itineraries', url: '#', emoji: '🗺️' },
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
  ],
}

const rightData = {
  user: {
    name: 'CreaseUI',
    email: 'm@example.com',
    avatar: '/logo-mark.svg',
  },
  calendars: [
    { name: 'My Calendars', items: ['Personal', 'Work', 'Family'] },
    { name: 'Favorites', items: ['Holidays', 'Birthdays'] },
    { name: 'Other', items: ['Travel', 'Reminders', 'Deadlines'] },
  ],
}

type TeamItem = 'team-0' | 'team-1' | 'team-2' | 'add-team'
type UserItem = 'upgrade' | 'account' | 'billing' | 'notifications' | 'log-out'
const TEAM_ITEMS: ReadonlyArray<TeamItem> = [
  'team-0',
  'team-1',
  'team-2',
  'add-team',
]
const USER_ITEMS: ReadonlyArray<UserItem> = [
  'upgrade',
  'account',
  'billing',
  'notifications',
  'log-out',
]
const TeamMenu = DropdownMenu.create<TeamItem>()
const UserMenu = DropdownMenu.create<UserItem>()

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isLeftSidebarOpen: S.Boolean,
  isRightSidebarOpen: S.Boolean,
  activeTeamIndex: S.Number,
  teamMenu: DropdownMenu.Model,
  userMenu: DropdownMenu.Model,
  workspaceOpen: S.Array(S.Boolean),
  calendar: Calendar.Model,
  selectedDate: S.Option(FoldkitCalendar.CalendarDate),
  calendarGroupsOpen: S.Array(S.Boolean),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
  GotTeamMenuMessage: {
    message: DropdownMenu.Message,
  },
  GotUserMenuMessage: {
    message: DropdownMenu.Message,
  },
  ToggledWorkspace: {
    index: S.Number,
    isOpen: S.Boolean,
  },
  GotCalendarMessage: {
    message: Calendar.Message,
  },
  ToggledCalendarGroup: {
    index: S.Number,
    isOpen: S.Boolean,
  },
})
export type Message = typeof Message.Type

export const init = (): Model => ({
  isMobileOpen: false,
  isLeftSidebarOpen: true,
  isRightSidebarOpen: true,
  activeTeamIndex: 0,
  teamMenu: DropdownMenu.init({
    id: 'sidebar-15-left-team-menu',
    isAnimated: true,
  }),
  userMenu: DropdownMenu.init({
    id: 'sidebar-15-right-user-menu',
    isAnimated: true,
  }),
  workspaceOpen: leftData.workspaces.map(() => false),
  calendar: Calendar.init({
    id: 'sidebar-15-right-calendar',
    today: { year: 2024, month: 10, day: 15 },
  }),
  selectedDate: Option.none(),
  calendarGroupsOpen: rightData.calendars.map((_, index) => index === 0),
})

type UpdateReturn = Update.Return<Model, Message>
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ToggledMobileSidebar: () => ({
        model: modifyFields(model, { isMobileOpen: current => !current }),
      }),
      ToggledSidebar: () => ({
        model: modifyFields(model, { isLeftSidebarOpen: current => !current }),
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
          commands: Command.mapMessages(commands, next =>
            Message.GotTeamMenuMessage({ message: next }),
          ),
        }
      },
      GotUserMenuMessage: ({ message: childMessage }) => {
        const { model: userMenu, commands: userMenuCommands__ } =
          UserMenu.update(model.userMenu, childMessage)
        const commands = userMenuCommands__ ?? []
        return {
          model: modifyFields(model, { userMenu: () => userMenu }),
          commands: Command.mapMessages(commands, next =>
            Message.GotUserMenuMessage({ message: next }),
          ),
        }
      },
      ToggledWorkspace: ({ index, isOpen }) => {
        if (model.workspaceOpen[index] === undefined) return { model: model }
        return {
          model: modifyFields(model, {
            workspaceOpen: items =>
              items.map((open, itemIndex) =>
                itemIndex === index ? isOpen : open,
              ),
          }),
        }
      },
      GotCalendarMessage: ({ message: childMessage }) => {
        const {
          model: calendar,
          commands: calendarCommands__,
          outMessage: calendarOut__,
        } = Calendar.update(model.calendar, childMessage)
        const commands = calendarCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(calendarOut__)
        return {
          model: modifyFields(model, {
            calendar: () => calendar,
            selectedDate: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection =>
                  selection._tag === 'SelectedDate'
                    ? Option.some(selection.date)
                    : current,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotCalendarMessage({ message: next }),
          ),
        }
      },
      ToggledCalendarGroup: ({ index, isOpen }) => {
        if (model.calendarGroupsOpen[index] === undefined)
          return { model: model }
        return {
          model: modifyFields(model, {
            calendarGroupsOpen: groups =>
              groups.map((open, groupIndex) =>
                groupIndex === index ? isOpen : open,
              ),
          }),
        }
      },
    }),
  )

const teamSwitcher = (model: Model, h: HtmlBuilder<Message>): Html => {
  const active = leftData.teams[model.activeTeamIndex] ?? leftData.teams[0]
  if (active === undefined) return h.div([], [])
  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<TeamItem, Message>(
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
                        [Icon.icon(active.logo, { class: 'size-3' }, h)],
                      ),
                      h.span([h.Class('truncate font-medium')], [active.name]),
                      Icon.chevronDown({ class: 'size-4 opacity-50' }, h),
                    ],
                  ),
                  triggerClass: sidebarMenuButtonVariants({
                    class: 'w-fit px-1.5',
                  }),
                  items: TEAM_ITEMS,
                  itemToConfig: item => {
                    if (item === 'add-team') {
                      return {
                        label: 'Add team',
                        icon: Icon.plus({}, h),
                        group: '',
                      }
                    }
                    const index =
                      item === 'team-0' ? 0 : item === 'team-1' ? 1 : 2
                    const team = leftData.teams[index]
                    return {
                      label: team?.name ?? '',
                      ...(team === undefined
                        ? {}
                        : { icon: Icon.icon(team.logo, {}, h) }),
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

const navMain = (h: HtmlBuilder<Message>): Html =>
  sidebarMenu<Message>(
    {
      children: leftData.navMain.map(item =>
        sidebarMenuItem(
          {
            children: [
              sidebarMenuButton(
                {
                  href: item.url,
                  isActive: 'isActive' in item && item.isActive === true,
                  children: [Icon.icon(item.icon, {}, h), item.title],
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

const navFavorites = (h: HtmlBuilder<Message>): Html => {
  return sidebarGroup(
    {
      class: 'group-data-[collapsible=icon]:hidden',
      children: [
        sidebarGroupLabel({ children: ['Favorites'] }, h),
        sidebarMenu(
          {
            children: [
              ...leftData.favorites.map(item =>
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
                        children: [Icon.moreHorizontal({}, h), 'More'],
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
                    ...leftData.workspaces.flatMap((workspace, index) => {
                      const isOpen = openStates[index]
                      if (isOpen === undefined) return []
                      return [
                        sidebarMenuItem(
                          {
                            children: [
                              Collapsible.collapsible(
                                {
                                  id: `sidebar-15-left-workspace-${index}`,
                                  isOpen,
                                  onToggle: nextIsOpen =>
                                    Message.ToggledWorkspace({
                                      index,
                                      isOpen: nextIsOpen,
                                    }),
                                  trigger: h.span(
                                    [h.Class('contents')],
                                    [
                                      h.span([], [workspace.emoji]),
                                      h.span([], [workspace.name]),
                                      Icon.chevronRight(
                                        {
                                          class: isOpen
                                            ? 'ml-auto size-4 rotate-90 transition-transform'
                                            : 'ml-auto size-4 transition-transform',
                                        },
                                        h,
                                      ),
                                    ],
                                  ),
                                  triggerClass: sidebarMenuButtonVariants(),
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
                              children: [Icon.moreHorizontal({}, h), 'More'],
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

const navSecondary = (h: HtmlBuilder<Message>): Html =>
  sidebarGroup<Message>(
    {
      class: 'mt-auto',
      children: [
        sidebarGroupContent(
          {
            children: [
              sidebarMenu(
                {
                  children: leftData.navSecondary.map(item =>
                    sidebarMenuItem(
                      {
                        children: [
                          sidebarMenuButton(
                            {
                              href: item.url,
                              children: [
                                Icon.icon(item.icon, {}, h),
                                item.title,
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

const sidebarLeft = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isLeftSidebarOpen ? 'expanded' : 'collapsed'
  return sidebar<Message>(
    {
      state,
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
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
              navFavorites(h),
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

const userSummary = (h: HtmlBuilder<Message>): Html => {
  return h.span(
    [h.Class('contents')],
    [
      avatar(
        {
          class: 'size-8 rounded-lg',
          children: [
            avatarFallback({ class: 'rounded-lg', children: ['CU'] }, h),
          ],
        },
        h,
      ),
      h.div(
        [h.Class('grid flex-1 text-left text-sm leading-tight')],
        [
          h.span([h.Class('truncate font-medium')], [rightData.user.name]),
          h.span([h.Class('truncate text-xs')], [rightData.user.email]),
        ],
      ),
    ],
  )
}

const navUser = (model: DropdownMenu.Model, h: HtmlBuilder<Message>): Html => {
  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<UserItem, Message>(
                {
                  model,
                  toParentMessage: message =>
                    Message.GotUserMenuMessage({ message }),
                  trigger: h.span(
                    [h.Class('contents')],
                    [
                      userSummary(h),
                      Icon.chevronsUpDown({ class: 'ml-auto size-4' }, h),
                    ],
                  ),
                  triggerClass: sidebarMenuButtonVariants({
                    size: 'lg',
                    class:
                      'data-[open]:bg-sidebar-accent data-[open]:text-sidebar-accent-foreground',
                  }),
                  items: USER_ITEMS,
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
                  side: 'left',
                  align: 'start',
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

const rightCalendars = (
  openStates: ReadonlyArray<boolean>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  return rightData.calendars.flatMap((calendar, index) => {
    const isOpen = openStates[index]
    if (isOpen === undefined) return []
    return [
      sidebarGroup(
        {
          class: 'py-0',
          children: [
            Collapsible.collapsible(
              {
                id: `sidebar-15-right-calendar-group-${index}`,
                isOpen,
                onToggle: nextIsOpen =>
                  Message.ToggledCalendarGroup({ index, isOpen: nextIsOpen }),
                class: 'group/collapsible',
                trigger: h.span(
                  [h.Class('contents')],
                  [
                    calendar.name,
                    Icon.chevronRight(
                      {
                        class: isOpen
                          ? 'ml-auto size-4 shrink-0 rotate-90 transition-transform'
                          : 'ml-auto size-4 shrink-0 transition-transform',
                      },
                      h,
                    ),
                  ],
                ),
                triggerClass:
                  'group/label flex h-8 w-full shrink-0 items-center rounded-md px-2 text-sm font-medium text-sidebar-foreground outline-hidden ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2',
                content: sidebarGroupContent(
                  {
                    children: [
                      sidebarMenu(
                        {
                          children: calendar.items.map((item, itemIndex) =>
                            sidebarMenuItem(
                              {
                                children: [
                                  sidebarMenuButton(
                                    {
                                      children: [
                                        h.div(
                                          [
                                            ...(itemIndex < 2
                                              ? [h.DataAttribute('active', '')]
                                              : []),
                                            h.Class(
                                              'group/calendar-item flex aspect-square size-4 shrink-0 items-center justify-center rounded-xs border border-sidebar-border text-sidebar-primary-foreground data-[active]:border-sidebar-primary data-[active]:bg-sidebar-primary',
                                            ),
                                          ],
                                          [
                                            Icon.check(
                                              {
                                                class:
                                                  'hidden size-3 group-data-[active]/calendar-item:block',
                                              },
                                              h,
                                            ),
                                          ],
                                        ),
                                        item,
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
              },
              h,
            ),
          ],
        },
        h,
      ),
      sidebarSeparator({ class: 'mx-0' }, h),
    ]
  })
}

const sidebarRight = (model: Model, h: HtmlBuilder<Message>): Html =>
  sidebar<Message>(
    {
      state: model.isRightSidebarOpen ? 'expanded' : 'collapsed',
      side: 'right',
      collapsible: 'none',
      class: 'sticky top-0 hidden h-svh border-l lg:flex',
      children: [
        sidebarHeader(
          {
            class: 'h-16 border-b border-sidebar-border',
            children: [navUser(model.userMenu, h)],
          },
          h,
        ),
        sidebarContent(
          {
            children: [
              sidebarGroup(
                {
                  class: 'px-0',
                  children: [
                    sidebarGroupContent(
                      {
                        children: [
                          Calendar.calendar(
                            {
                              model: model.calendar,
                              maybeSelectedDate: model.selectedDate,
                              toParentMessage: message =>
                                Message.GotCalendarMessage({ message }),
                              class:
                                '[&_[role=gridcell]]:w-[33px] [&_[role=gridcell].bg-accent]:bg-sidebar-primary [&_[role=gridcell].bg-accent]:text-sidebar-primary-foreground',
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
              sidebarSeparator({ class: 'mx-0' }, h),
              ...rightCalendars(model.calendarGroupsOpen, h),
            ],
          },
          h,
        ),
        sidebarFooter(
          {
            children: [
              sidebarMenu(
                {
                  children: [
                    sidebarMenuItem(
                      {
                        children: [
                          sidebarMenuButton(
                            {
                              children: [Icon.plus({}, h), 'New Calendar'],
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

const pageContent = (h: HtmlBuilder<Message>): Html => {
  return sidebarInset(
    {
      children: [
        h.header(
          [
            h.Class(
              'sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background',
            ),
          ],
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
          ],
        ),
        h.div(
          [h.Class('flex flex-1 flex-col gap-4 p-4')],
          [
            h.div(
              [h.Class('mx-auto h-24 w-full max-w-3xl rounded-xl bg-muted/50')],
              [],
            ),
            h.div(
              [
                h.Class(
                  'mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/50',
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
  const leftState = model.isLeftSidebarOpen ? 'expanded' : 'collapsed'
  const rightState = model.isRightSidebarOpen ? 'expanded' : 'collapsed'
  return sidebarProvider<Message>(
    {
      state: leftState,
      children: [
        sidebarLeft(model, h),
        sidebarProvider<Message>(
          {
            state: rightState,
            class: 'min-h-0',
            children: [pageContent(h), sidebarRight(model, h)],
          },
          h,
        ),
      ],
    },
    h,
  )
}

// PORT NOTE: Avatar images are not bundled, so the source image uses its CU
// fallback. Per-favorite action menus are represented by their ellipsis
// actions; team/user menus and all disclosure/calendar interactions are live.
