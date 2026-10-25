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
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuButtonVariants,
  sidebarMenuItem,
  sidebarMenuSub,
  sidebarMenuSubButton,
  sidebarMenuSubItem,
  sidebarProvider,
  sidebarTrigger,
} from '@/ui/sidebar'

type MainItem = Readonly<{
  title: string
  url: string
  icon: string
  isActive?: boolean
  items: ReadonlyArray<Readonly<{ title: string; url: string }>>
}>

type LinkItem = Readonly<{
  title: string
  url: string
  icon: string
}>

type Project = Readonly<{
  name: string
  url: string
  icon: string
}>

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
  ] satisfies ReadonlyArray<MainItem>,
  navSecondary: [
    { title: 'Support', url: '#', icon: 'life-buoy' },
    { title: 'Feedback', url: '#', icon: 'send' },
  ] satisfies ReadonlyArray<LinkItem>,
  projects: [
    { name: 'Design Engineering', url: '#', icon: 'frame' },
    { name: 'Sales & Marketing', url: '#', icon: 'chart-pie' },
    { name: 'Travel', url: '#', icon: 'map' },
  ] satisfies ReadonlyArray<Project>,
}

type ProjectAction = 'view' | 'share' | 'delete'
type UserAction =
  | 'upgrade'
  | 'account'
  | 'billing'
  | 'notifications'
  | 'log-out'

const PROJECT_ACTIONS: ReadonlyArray<ProjectAction> = [
  'view',
  'share',
  'delete',
]
const USER_ACTIONS: ReadonlyArray<UserAction> = [
  'upgrade',
  'account',
  'billing',
  'notifications',
  'log-out',
]

const ProjectMenu = DropdownMenu.create<ProjectAction>()
const UserMenu = DropdownMenu.create<UserAction>()

// MODEL

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
  navMainOpen: S.Array(S.Boolean),
  projectMenus: S.Array(DropdownMenu.Model),
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
  GotProjectMenuMessage: {
    index: S.Number,
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
  navMainOpen: data.navMain.map(item => item.isActive ?? false),
  projectMenus: data.projects.map((_, index) =>
    DropdownMenu.init({
      id: `sidebar-08-project-menu-${index}`,
      isAnimated: true,
    }),
  ),
  userMenu: DropdownMenu.init({
    id: 'sidebar-08-user-menu',
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
      GotProjectMenuMessage: ({ index, message: childMessage }) => {
        const current = model.projectMenus[index]

        if (current === undefined) {
          return { model: model }
        }

        const nextOp__ = ProjectMenu.update(current, childMessage)
        const next = nextOp__.model
        const commands = nextOp__.commands ?? []

        return {
          model: modifyFields(model, {
            projectMenus: menus =>
              menus.map((menu, menuIndex) =>
                menuIndex === index ? next : menu,
              ),
          }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotProjectMenuMessage({ index, message: nextMessage }),
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
              return [
                sidebarMenuItem(
                  {
                    children: [
                      Collapsible.collapsible(
                        {
                          id: `sidebar-08-nav-main-${index}`,
                          isOpen,
                          onToggle: nextIsOpen =>
                            Message.ToggledNavMain({
                              index,
                              isOpen: nextIsOpen,
                            }),
                          class: 'group/collapsible',
                          triggerClass: sidebarMenuButtonVariants(),
                          trigger: h.span(
                            [h.Class('contents')],
                            [
                              Icon.icon(
                                item.icon,
                                {
                                  class: 'size-4 shrink-0',
                                },
                                h,
                              ),
                              h.span([], [item.title]),
                              Icon.chevronRight(
                                {
                                  class: `ml-auto size-4 shrink-0 transition-transform${
                                    isOpen ? ' rotate-90' : ''
                                  }`,
                                },
                                h,
                              ),
                              h.span([h.Class('sr-only')], ['Toggle']),
                            ],
                          ),
                          content: sidebarMenuSub(
                            {
                              children: item.items.map(subItem =>
                                sidebarMenuSubItem(
                                  {
                                    children: [
                                      sidebarMenuSubButton(
                                        {
                                          href: subItem.url,
                                          children: [
                                            h.span([], [subItem.title]),
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
          },
          h,
        ),
      ],
    },
    h,
  )

const projectActionConfig = (
  action: ProjectAction,
  h: HtmlBuilder<Message>,
): DropdownMenu.DropdownMenuItemConfig<ProjectAction> =>
  M.value(action).pipe(
    M.withReturnType<DropdownMenu.DropdownMenuItemConfig<ProjectAction>>(),
    M.when('view', () => ({
      label: 'View Project',
      icon: Icon.icon('folder', { class: 'text-muted-foreground' }, h),
      group: 'Project',
    })),
    M.when('share', () => ({
      label: 'Share Project',
      icon: Icon.icon('share', { class: 'text-muted-foreground' }, h),
      group: 'Project',
    })),
    M.when('delete', () => ({
      label: 'Delete Project',
      icon: Icon.icon('trash-2', { class: 'text-muted-foreground' }, h),
      group: '',
    })),
    M.exhaustive,
  )

const PROJECT_ACTION_CLASS =
  'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 after:absolute after:-inset-2 group-data-[collapsible=icon]:hidden group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[open]:opacity-100 md:opacity-0'

const navProjects = (
  models: ReadonlyArray<DropdownMenu.Model>,
  h: HtmlBuilder<Message>,
): Html => {
  return sidebarGroup(
    {
      class: 'group-data-[collapsible=icon]:hidden',
      children: [
        sidebarGroupLabel({ children: ['Projects'] }, h),
        sidebarMenu(
          {
            children: [
              ...data.projects.flatMap((project, index) => {
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
                            href: project.url,
                            children: [
                              Icon.icon(project.icon, {}, h),
                              h.span([], [project.name]),
                            ],
                          },
                          h,
                        ),
                        DropdownMenu.dropdownMenu<ProjectAction, Message>(
                          {
                            model,
                            toParentMessage: message =>
                              Message.GotProjectMenuMessage({ index, message }),
                            trigger: h.span(
                              [h.Class('contents')],
                              [
                                Icon.moreHorizontal({ class: 'size-4' }, h),
                                h.span([h.Class('sr-only')], ['More']),
                              ],
                            ),
                            placement: 'sidebarAction',
                            triggerClass: PROJECT_ACTION_CLASS,
                            items: PROJECT_ACTIONS,
                            itemToConfig: action =>
                              projectActionConfig(action, h),
                            side: 'right',
                            align: 'start',
                            ariaLabel: `${project.name} actions`,
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
                              size: 'sm',
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
                      'data-[open]:bg-sidebar-accent data-[open]:text-sidebar-accent-foreground',
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

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      variant: 'inset',
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
              navProjects(model.projectMenus, h),
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

const pageContent = (h: HtmlBuilder<Message>): Html => {
  return sidebarInset(
    {
      children: [
        h.header(
          [h.Class('flex h-16 shrink-0 items-center gap-2')],
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
// by its CU fallback. The foldkit Disclosure exposes one trigger, so the main
// navigation title row owns expansion instead of a separate action button.

/* Minimal interactive wiring:
   const model = init()
   const nextModelOp__ = update(model, ToggledSidebar());
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
   view(nextModel)
*/
