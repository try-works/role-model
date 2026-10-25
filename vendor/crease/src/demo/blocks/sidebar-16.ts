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
  sidebarInput,
  sidebarMenu,
  sidebarMenuAction,
  sidebarMenuButton,
  sidebarMenuButtonVariants,
  sidebarMenuItem,
  sidebarMenuSub,
  sidebarMenuSubButton,
  sidebarMenuSubItem,
  sidebarProvider,
  sidebarTrigger,
} from '@/ui/sidebar'

const data = {
  user: {
    name: 'CreaseUI',
    email: 'm@example.com',
    avatar: '/logo-mark.svg',
  },
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
  ],
  navSecondary: [
    { title: 'Support', url: '#', icon: 'life-buoy' },
    { title: 'Feedback', url: '#', icon: 'send' },
  ],
  projects: [
    { name: 'Design Engineering', url: '#', icon: 'frame' },
    { name: 'Sales & Marketing', url: '#', icon: 'chart-pie' },
    { name: 'Travel', url: '#', icon: 'map' },
  ],
}

type UserItem = 'upgrade' | 'account' | 'billing' | 'notifications' | 'log-out'
const USER_ITEMS: ReadonlyArray<UserItem> = [
  'upgrade',
  'account',
  'billing',
  'notifications',
  'log-out',
]
const UserMenu = DropdownMenu.create<UserItem>()

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
  search: S.String,
  navMainOpen: S.Array(S.Boolean),
  userMenu: DropdownMenu.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
  ChangedSearch: { value: S.String },
  ToggledNavMain: {
    index: S.Number,
    isOpen: S.Boolean,
  },
  GotUserMenuMessage: {
    message: DropdownMenu.Message,
  },
})
export type Message = typeof Message.Type

export const init = (): Model => ({
  isMobileOpen: false,
  isSidebarOpen: true,
  search: '',
  navMainOpen: data.navMain.map(item => item.isActive ?? false),
  userMenu: DropdownMenu.init({
    id: 'sidebar-16-user-menu',
    isAnimated: true,
  }),
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
        model: modifyFields(model, { isSidebarOpen: current => !current }),
      }),
      ChangedSearch: ({ value }) => ({
        model: modifyFields(model, { search: () => value }),
      }),
      ToggledNavMain: ({ index, isOpen }) => {
        if (model.navMainOpen[index] === undefined) return { model: model }
        return {
          model: modifyFields(model, {
            navMainOpen: items =>
              items.map((open, itemIndex) =>
                itemIndex === index ? isOpen : open,
              ),
          }),
        }
      },
      GotUserMenuMessage: ({ message: childMessage }) => {
        const userMenuOp__ = UserMenu.update(model.userMenu, childMessage)
        const userMenu = userMenuOp__.model
        const commands = userMenuOp__.commands ?? []
        return {
          model: modifyFields(model, { userMenu: () => userMenu }),
          commands: Command.mapMessages(commands, next =>
            Message.GotUserMenuMessage({ message: next }),
          ),
        }
      },
    }),
  )

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
              if (isOpen === undefined) return []
              return [
                sidebarMenuItem(
                  {
                    children: [
                      Collapsible.collapsible(
                        {
                          id: `sidebar-16-nav-main-${index}`,
                          isOpen,
                          onToggle: nextIsOpen =>
                            Message.ToggledNavMain({
                              index,
                              isOpen: nextIsOpen,
                            }),
                          trigger: h.span(
                            [h.Class('contents')],
                            [
                              Icon.icon(
                                item.icon,
                                { class: 'size-4 shrink-0' },
                                h,
                              ),
                              h.span([], [item.title]),
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
                            project.name,
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
                  children: data.navSecondary.map(item =>
                    sidebarMenuItem(
                      {
                        children: [
                          sidebarMenuButton(
                            {
                              href: item.url,
                              size: 'sm',
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
          h.span([h.Class('truncate font-medium')], [data.user.name]),
          h.span([h.Class('truncate text-xs')], [data.user.email]),
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
      class: 'top-(--header-height) h-[calc(100svh-var(--header-height))]!',
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
              navMain(model.navMainOpen, h),
              navProjects(h),
              navSecondary(h),
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

const searchForm = (value: string, h: HtmlBuilder<Message>): Html => {
  return h.form(
    [h.Class('w-full sm:ml-auto sm:w-auto')],
    [
      h.div(
        [h.Class('relative')],
        [
          h.label([h.For('sidebar-16-search'), h.Class('sr-only')], ['Search']),
          sidebarInput(
            {
              id: 'sidebar-16-search',
              value,
              onInput: next => Message.ChangedSearch({ value: next }),
              placeholder: 'Type to search...',
              class: 'h-8 pl-7',
            },
            h,
          ),
          Icon.search(
            {
              class:
                'pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none',
            },
            h,
          ),
        ],
      ),
    ],
  )
}

const siteHeader = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.header(
    [
      h.Class(
        'sticky top-0 z-50 flex w-full items-center border-b bg-background',
      ),
    ],
    [
      h.div(
        [h.Class('flex h-(--header-height) w-full items-center gap-2 px-4')],
        [
          sidebarTrigger(
            {
              onMobileClick: Message.ToggledMobileSidebar(),
              onClick: Message.ToggledSidebar(),
              class: 'size-8',
            },
            h,
          ),
          separator(
            {
              orientation: 'vertical',
              class: 'mr-2 h-4',
            },
            h,
          ),
          breadcrumb(
            {
              class: 'hidden sm:block',
              children: [
                breadcrumbList(
                  {
                    children: [
                      breadcrumbItem(
                        {
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
                      breadcrumbSeparator({}, h),
                      breadcrumbItem(
                        {
                          children: [
                            breadcrumbPage({ children: ['Data Fetching'] }, h),
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
          searchForm(model.search, h),
        ],
      ),
    ],
  )
}

const pageContent = (h: HtmlBuilder<Message>): Html => {
  return sidebarInset(
    {
      children: [
        h.div(
          [h.Class('flex flex-1 flex-col gap-4 p-4')],
          [
            h.div(
              [h.Class('grid auto-rows-min gap-4 md:grid-cols-3')],
              Array.from({ length: 3 }, () =>
                h.div([h.Class('aspect-video rounded-xl bg-muted/50')], []),
              ),
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
  return h.div(
    [h.Class('[--header-height:calc(--spacing(14))]')],
    [
      sidebarProvider(
        {
          state,
          class: 'flex flex-col',
          children: [
            siteHeader(model, h),
            h.div(
              [h.Class('flex flex-1')],
              [appSidebar(model, h), pageContent(h)],
            ),
          ],
        },
        h,
      ),
    ],
  )
}

// PORT NOTE: Avatar images are not bundled, so the source image uses its CU
// fallback. Per-project action menus use the accepted static ellipsis action.
