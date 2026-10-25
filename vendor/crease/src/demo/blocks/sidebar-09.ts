import { Match as M, Schema as S } from 'effect'
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
import * as DropdownMenu from '@/ui/dropdown-menu'
import { separator } from '@/ui/separator'
import {
  sidebar,
  sidebarContent,
  sidebarFooter,
  sidebarGroup,
  sidebarGroupContent,
  sidebarHeader,
  sidebarInset,
  sidebarProvider,
  sidebarInput,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuButtonVariants,
  sidebarMenuItem,
  sidebarTrigger,
} from '@/ui/sidebar'
import * as Switch from '@/ui/switch'

type NavItem = Readonly<{
  title: string
  url: string
  icon: string
  isActive: boolean
}>

type Mail = Readonly<{
  name: string
  email: string
  subject: string
  date: string
  teaser: string
}>

export const data = {
  user: {
    name: 'CreaseUI',
    email: 'm@example.com',
    avatar: '/logo-mark.svg',
  },
  navMain: [
    {
      title: 'Inbox',
      url: '#',
      icon: 'inbox',
      isActive: true,
    },
    {
      title: 'Drafts',
      url: '#',
      icon: 'file',
      isActive: false,
    },
    {
      title: 'Sent',
      url: '#',
      icon: 'send',
      isActive: false,
    },
    {
      title: 'Junk',
      url: '#',
      icon: 'archive-x',
      isActive: false,
    },
    {
      title: 'Trash',
      url: '#',
      icon: 'trash-2',
      isActive: false,
    },
  ] satisfies ReadonlyArray<NavItem>,
  mails: [
    {
      name: 'William Smith',
      email: 'williamsmith@example.com',
      subject: 'Meeting Tomorrow',
      date: '09:34 AM',
      teaser:
        'Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates.',
    },
    {
      name: 'Alice Smith',
      email: 'alicesmith@example.com',
      subject: 'Re: Project Update',
      date: 'Yesterday',
      teaser:
        "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps.",
    },
    {
      name: 'Bob Johnson',
      email: 'bobjohnson@example.com',
      subject: 'Weekend Plans',
      date: '2 days ago',
      teaser:
        "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?",
    },
    {
      name: 'Emily Davis',
      email: 'emilydavis@example.com',
      subject: 'Re: Question about Budget',
      date: '2 days ago',
      teaser:
        "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?",
    },
    {
      name: 'Michael Wilson',
      email: 'michaelwilson@example.com',
      subject: 'Important Announcement',
      date: '1 week ago',
      teaser:
        "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future.",
    },
    {
      name: 'Sarah Brown',
      email: 'sarahbrown@example.com',
      subject: 'Re: Feedback on Proposal',
      date: '1 week ago',
      teaser:
        "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?",
    },
    {
      name: 'David Lee',
      email: 'davidlee@example.com',
      subject: 'New Project Idea',
      date: '1 week ago',
      teaser:
        "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?",
    },
    {
      name: 'Olivia Wilson',
      email: 'oliviawilson@example.com',
      subject: 'Vacation Plans',
      date: '1 week ago',
      teaser:
        "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave.",
    },
    {
      name: 'James Martin',
      email: 'jamesmartin@example.com',
      subject: 'Re: Conference Registration',
      date: '1 week ago',
      teaser:
        "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end.",
    },
    {
      name: 'Sophia White',
      email: 'sophiawhite@example.com',
      subject: 'Team Dinner',
      date: '1 week ago',
      teaser:
        "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.",
    },
  ] satisfies ReadonlyArray<Mail>,
}

type UserAction =
  | 'upgrade'
  | 'account'
  | 'billing'
  | 'notifications'
  | 'log-out'

const USER_ACTIONS: ReadonlyArray<UserAction> = [
  'upgrade',
  'account',
  'billing',
  'notifications',
  'log-out',
]

const UserMenu = DropdownMenu.create<UserAction>()

// MODEL

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
  activeNavIndex: S.Number,
  unreadOnly: S.Boolean,
  userMenu: DropdownMenu.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
  SelectedNavItem: {
    index: S.Number,
  },
  ToggledUnread: { isChecked: S.Boolean },
  GotUserMenuMessage: {
    message: DropdownMenu.Message,
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  isMobileOpen: false,
  isSidebarOpen: true,
  activeNavIndex: 0,
  unreadOnly: false,
  userMenu: DropdownMenu.init({
    id: 'sidebar-09-user-menu',
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
      SelectedNavItem: ({ index }) => ({
        model: modifyFields(model, {
          activeNavIndex: () => index,
          isSidebarOpen: () => true,
        }),
      }),
      ToggledUnread: ({ isChecked }) => ({
        model: { ...model, unreadOnly: isChecked },
      }),
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

const userSummary = (h: HtmlBuilder<Message>): Html => {
  return h.span(
    [h.Class('contents')],
    [
      avatar(
        {
          class: 'h-8 w-8 rounded-lg',
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

const userActionConfig = (
  action: UserAction,
  h: HtmlBuilder<Message>,
): DropdownMenu.DropdownMenuItemConfig<UserAction> =>
  M.value(action).pipe(
    M.withReturnType<DropdownMenu.DropdownMenuItemConfig<UserAction>>(),
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
  )

const navUser = (model: DropdownMenu.Model, h: HtmlBuilder<Message>): Html => {
  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<UserAction, Message>(
                {
                  model,
                  toParentMessage: message =>
                    Message.GotUserMenuMessage({ message }),
                  trigger: h.span(
                    [h.Class('contents')],
                    [
                      userSummary(h),
                      Icon.chevronsUpDown(
                        {
                          class: 'ml-auto size-4 shrink-0',
                        },
                        h,
                      ),
                    ],
                  ),
                  triggerClass: sidebarMenuButtonVariants({
                    size: 'lg',
                    class:
                      'data-[open]:bg-sidebar-accent data-[open]:text-sidebar-accent-foreground md:h-8 md:p-0',
                  }),
                  items: USER_ACTIONS,
                  itemToConfig: action => userActionConfig(action, h),
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

const iconSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  return sidebar(
    {
      collapsible: 'none',
      class: 'w-full md:w-[calc(var(--sidebar-width-icon)+1px)]! border-r',
      children: [
        sidebarHeader(
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
                              size: 'lg',
                              href: '#',
                              class: 'md:h-8 md:p-0',
                              children: [
                                h.div(
                                  [
                                    h.Class(
                                      'flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground',
                                    ),
                                  ],
                                  [
                                    Icon.icon(
                                      'command',
                                      { class: 'size-4' },
                                      h,
                                    ),
                                  ],
                                ),
                                h.div(
                                  [
                                    h.Class(
                                      'grid flex-1 text-left text-sm leading-tight',
                                    ),
                                  ],
                                  [
                                    h.span(
                                      [h.Class('truncate font-medium')],
                                      ['Acme Inc'],
                                    ),
                                    h.span(
                                      [h.Class('truncate text-xs')],
                                      ['Enterprise'],
                                    ),
                                  ],
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
        ),
        sidebarContent(
          {
            children: [
              sidebarGroup(
                {
                  children: [
                    sidebarGroupContent(
                      {
                        class: 'px-1.5 md:px-0',
                        children: [
                          sidebarMenu(
                            {
                              children: data.navMain.map((item, index) =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          onClick: Message.SelectedNavItem({
                                            index,
                                          }),
                                          isActive:
                                            model.activeNavIndex === index,
                                          tooltip: item.title,
                                          class: 'px-2.5 md:px-2',
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
              ),
            ],
          },
          h,
        ),
        sidebarFooter({ children: [navUser(model.userMenu, h)] }, h),
      ],
    },
    h,
  )
}

const mailView = (mail: Mail, h: HtmlBuilder<Message>): Html => {
  return h.a(
    [
      h.Href('#'),
      h.Class(
        'flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      ),
    ],
    [
      h.div(
        [h.Class('flex w-full items-center gap-2')],
        [
          h.span([], [mail.name]),
          h.span([h.Class('ml-auto text-xs')], [mail.date]),
        ],
      ),
      h.span([h.Class('font-medium')], [mail.subject]),
      h.span(
        [h.Class('line-clamp-2 w-[260px] text-xs whitespace-break-spaces')],
        [mail.teaser],
      ),
    ],
  )
}

const mailSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const activeItem = data.navMain[model.activeNavIndex] ?? data.navMain[0]

  return sidebar(
    {
      collapsible: 'none',
      class: 'hidden flex-1 md:flex',
      children: [
        sidebarHeader(
          {
            class: 'gap-3.5 border-b p-4',
            children: [
              h.div(
                [h.Class('flex w-full items-center justify-between')],
                [
                  h.div(
                    [h.Class('text-base font-medium text-foreground')],
                    [activeItem?.title ?? 'Inbox'],
                  ),
                  h.div(
                    [
                      h.Class(
                        'flex items-center gap-2 text-sm [&_[data-slot=switch]+div]:sr-only',
                      ),
                    ],
                    [
                      h.span([], ['Unreads']),
                      Switch.switch(
                        {
                          id: 'sidebar-09-unread-switch',
                          isChecked: model.unreadOnly,
                          onToggle: isChecked =>
                            Message.ToggledUnread({ isChecked }),
                          label: 'Toggle unread mail',
                          class: 'shadow-none',
                        },
                        h,
                      ),
                    ],
                  ),
                ],
              ),
              sidebarInput(
                {
                  id: 'sidebar-09-mail-search',
                  placeholder: 'Type to search...',
                },
                h,
              ),
            ],
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
                        children: data.mails.map(mail => mailView(mail, h)),
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

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      collapsible: 'icon',
      class: 'overflow-hidden *:data-[sidebar=sidebar]:flex-row',
      children: [iconSidebar(model, h), mailSidebar(model, h)],
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
              'sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4',
            ),
          ],
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
                                  children: ['All Inboxes'],
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        breadcrumbSeparator({ class: 'hidden md:block' }, h),
                        breadcrumbItem(
                          {
                            children: [
                              breadcrumbPage({ children: ['Inbox'] }, h),
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
        h.div(
          [h.Class('flex flex-1 flex-col gap-4 p-4')],
          Array.from({ length: 24 }, () =>
            h.div(
              [h.Class('aspect-video h-12 w-full rounded-lg bg-muted/50')],
              [],
            ),
          ),
        ),
      ],
    },
    h,
  )
}

const blockSidebarProvider = (
  state: 'expanded' | 'collapsed',
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html => {
  return sidebarProvider({ state, width: '350px', children }, h)
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return blockSidebarProvider(state, [appSidebar(model, h), pageContent(h)], h)
}

// Preserve the source's 350px nested-sidebar width through the shared provider.
// Mail ordering stays deterministic when a mailbox is selected.
// PORT NOTE: Avatar files are not bundled, so the source image is represented
// by its CU fallback.

/* Minimal interactive wiring:
   const model = init()
   const nextModelOp__ = update(model, ToggledSidebar());
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
   view(nextModel)
*/
