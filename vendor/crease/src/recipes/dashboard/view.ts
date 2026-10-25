import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import * as Sidebar from '@/ui/sidebar'
import * as Breadcrumb from '@/ui/breadcrumb'
import * as Card from '@/ui/card'
import * as Button from '@/ui/button'
import * as Badge from '@/ui/badge'
import * as Avatar from '@/ui/avatar'
import * as Chart from '@/ui/chart'
import * as Field from '@/ui/field'
import * as Input from '@/ui/input'
import * as Textarea from '@/ui/textarea'
import * as Select from '@/ui/native-select'
import * as Switch from '@/ui/switch'
import * as Dialog from '@/ui/dialog'
import * as DataTable from '@/ui/data-table'
import * as Tabs from '@/ui/tabs'
import * as ToggleGroup from '@/ui/toggle-group'
import * as Alert from '@/ui/alert'
import { separator } from '@/ui/separator'
import * as Icon from './icons'
import { cn } from '@/lib/utils'
import {
  Message,
  type Model,
  draftErrors,
  settingsErrors,
  filteredUsers,
} from './main'
import { ranges, money, number, initials, type User } from './data'

type H = HtmlBuilder<Message>
const pageNames = { overview: 'Overview', users: 'Users', settings: 'Settings' }
const text = (
  h: H,
  content: string,
  className = 'text-sm text-muted-foreground',
) => h.p([h.Class(className)], [content])
const avatar = (h: H, name: string, size: 'default' | 'lg' = 'default') =>
  Avatar.avatar(
    {
      size,
      children: [Avatar.avatarFallback({ children: [initials(name)] }, h)],
    },
    h,
  )
const button = (
  h: H,
  label: string,
  onClick: Message,
  variant: 'default' | 'outline' | 'ghost' = 'default',
  leadingIcon?: Html,
) =>
  Button.button(
    {
      children: [label],
      onClick,
      variant,
      size: 'lg',
      ...(leadingIcon ? { leadingIcon } : {}),
    },
    h,
  )
const heading = (h: H, title: string, description: string, action: Html) =>
  h.div(
    [h.Class('flex flex-wrap items-end justify-between gap-4')],
    [
      h.div(
        [h.Class('flex flex-col gap-2')],
        [
          h.h1([h.Class('text-3xl font-semibold tracking-tight')], [title]),
          text(h, description),
        ],
      ),
      action,
    ],
  )
const cardHeader = (h: H, title: string, description: string, action?: Html) =>
  Card.cardHeader(
    {
      children: [
        Card.cardTitle({ element: 'h2', children: [title] }, h),
        Card.cardDescription({ children: [description] }, h),
        ...(action ? [Card.cardAction({ children: [action] }, h)] : []),
      ],
    },
    h,
  )

const navView = (model: Model, h: H): Html => {
  const navigation = [
    {
      page: 'overview',
      path: '/',
      label: 'Overview',
      icon: Icon.layoutDashboard,
    },
    { page: 'users', path: '/users', label: 'Users', icon: Icon.users },
    {
      page: 'settings',
      path: '/settings',
      label: 'Settings',
      icon: Icon.settings,
    },
  ]
  return Sidebar.sidebar(
    {
      state: model.sidebar.isOpen ? 'expanded' : 'collapsed',
      collapsible: 'icon',
      isMobileOpen: model.sidebar.isMobileOpen,
      onMobileDismiss: Message.GotSidebar({
        message: Sidebar.Message.SetMobileOpen({ isOpen: false }),
      }),
      children: [
        Sidebar.sidebarHeader(
          {
            class: 'px-3 py-5',
            children: [
              Sidebar.sidebarMenu(
                {
                  children: [
                    Sidebar.sidebarMenuItem(
                      {
                        children: [
                          Sidebar.sidebarMenuButton(
                            {
                              href: '/',
                              size: 'lg',
                              tooltip: 'Forma workspace',
                              class: 'gap-3',
                              children: [
                                h.div(
                                  [
                                    h.Class(
                                      'flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground',
                                    ),
                                  ],
                                  [
                                    h.span(
                                      [h.Class('text-lg font-semibold')],
                                      ['f.'],
                                    ),
                                  ],
                                ),
                                h.div(
                                  [
                                    h.Class(
                                      'grid flex-1 gap-0.5 group-data-[collapsible=icon]:hidden',
                                    ),
                                  ],
                                  [
                                    h.span(
                                      [
                                        h.Class(
                                          'text-base font-semibold tracking-tight',
                                        ),
                                      ],
                                      [model.savedSettings.workspace],
                                    ),
                                    h.span(
                                      [
                                        h.Class(
                                          'text-xs text-muted-foreground',
                                        ),
                                      ],
                                      ['Team workspace'],
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
        Sidebar.sidebarContent(
          {
            children: [
              Sidebar.sidebarGroup(
                {
                  class: 'px-3',
                  children: [
                    Sidebar.sidebarGroupLabel({ children: ['Workspace'] }, h),
                    Sidebar.sidebarGroupContent(
                      {
                        children: [
                          Sidebar.sidebarMenu(
                            {
                              class: 'gap-1',
                              children: navigation.map(item =>
                                Sidebar.sidebarMenuItem(
                                  {
                                    children: [
                                      Sidebar.sidebarMenuButton(
                                        {
                                          href: item.path,
                                          isActive: model.page === item.page,
                                          tooltip: item.label,
                                          class: 'h-10 gap-3',
                                          children: [
                                            item.icon({}, h),
                                            h.span([], [item.label]),
                                          ],
                                        },
                                        h,
                                      ),
                                      ...(item.page === 'users'
                                        ? [
                                            Sidebar.sidebarMenuBadge(
                                              {
                                                children: [
                                                  String(model.users.length),
                                                ],
                                              },
                                              h,
                                            ),
                                          ]
                                        : []),
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
              h.div(
                [
                  h.Class(
                    'mt-auto px-4 pb-4 group-data-[collapsible=icon]:hidden',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        'flex flex-col gap-3 rounded-lg border border-sidebar-border bg-background p-4',
                      ),
                    ],
                    [
                      h.div(
                        [h.Class('flex items-center justify-between')],
                        [
                          h.span(
                            [h.Class('text-sm font-medium')],
                            ['A space to grow'],
                          ),
                          Badge.badge(
                            { variant: 'secondary', children: ['Pro'] },
                            h,
                          ),
                        ],
                      ),
                      text(
                        h,
                        `${model.users.length} of 50 team seats used`,
                        'text-xs text-muted-foreground',
                      ),
                      h.progress(
                        [
                          h.Attribute('value', String(model.users.length)),
                          h.Attribute('max', '50'),
                          h.AriaLabel('Team seats used'),
                          h.Class(
                            'seat-progress h-1.5 w-full overflow-hidden rounded-full',
                          ),
                        ],
                        [],
                      ),
                      Button.buttonLink(
                        {
                          href: '/users',
                          variant: 'outline',
                          size: 'sm',
                          class: 'w-full',
                          children: ['Manage your team'],
                          trailingIcon: Icon.arrowUpRight({}, h),
                        },
                        h,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        Sidebar.sidebarSeparator({}, h),
        Sidebar.sidebarFooter(
          {
            class: 'p-3',
            children: [
              Sidebar.sidebarMenu(
                {
                  children: [
                    Sidebar.sidebarMenuItem(
                      {
                        children: [
                          Sidebar.sidebarMenuButton(
                            {
                              href: '/settings',
                              size: 'lg',
                              tooltip: 'Alex Morgan · Settings',
                              class: 'gap-3',
                              children: [
                                avatar(h, 'Alex Morgan'),
                                h.div(
                                  [
                                    h.Class(
                                      'grid flex-1 gap-0.5 group-data-[collapsible=icon]:hidden',
                                    ),
                                  ],
                                  [
                                    h.span(
                                      [h.Class('text-sm font-medium')],
                                      ['Alex Morgan'],
                                    ),
                                    h.span(
                                      [
                                        h.Class(
                                          'text-xs text-muted-foreground',
                                        ),
                                      ],
                                      ['alex@forma.co'],
                                    ),
                                  ],
                                ),
                                Icon.chevronsUpDown(
                                  {
                                    class:
                                      'ml-auto group-data-[collapsible=icon]:hidden',
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
        ),
        Sidebar.sidebarRail(
          {
            onClick: Message.GotSidebar({ message: Sidebar.Message.Toggled() }),
          },
          h,
        ),
      ],
    },
    h,
  )
}

const headerView = (model: Model, h: H) =>
  h.header(
    [
      h.Class(
        'sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-8',
      ),
    ],
    [
      h.div(
        [h.Class('flex min-w-0 items-center gap-3')],
        [
          Sidebar.sidebarTrigger(
            {
              class: 'size-10',
              onClick: Message.GotSidebar({
                message: Sidebar.Message.Toggled(),
              }),
              onMobileClick: Message.GotSidebar({
                message: Sidebar.Message.ToggledMobile(),
              }),
            },
            h,
          ),
          separator(
            { orientation: 'vertical', decorative: true, class: 'h-4' },
            h,
          ),
          Breadcrumb.breadcrumb(
            {
              children: [
                Breadcrumb.breadcrumbList(
                  {
                    children: [
                      Breadcrumb.breadcrumbItem(
                        {
                          class: 'hidden sm:inline-flex',
                          children: [
                            Breadcrumb.breadcrumbLink(
                              { href: '/', children: ['Workspace'] },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      Breadcrumb.breadcrumbSeparator(
                        { class: 'hidden sm:inline-flex' },
                        h,
                      ),
                      Breadcrumb.breadcrumbItem(
                        {
                          children: [
                            Breadcrumb.breadcrumbPage(
                              { children: [pageNames[model.page]] },
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
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          Badge.badge(
            {
              variant: 'outline',
              class: 'hidden sm:inline-flex',
              children: [
                h.span([h.Class('size-1.5 rounded-full bg-chart-2')], []),
                'Demo workspace',
              ],
            },
            h,
          ),
          Button.button(
            {
              variant: 'ghost',
              size: 'icon-lg',
              ariaLabel: model.isDark
                ? 'Switch to light theme'
                : 'Switch to dark theme',
              onClick: Message.ToggledTheme(),
              children: [model.isDark ? Icon.sun({}, h) : Icon.moon({}, h)],
            },
            h,
          ),
        ],
      ),
    ],
  )

const statCard = (
  h: H,
  title: string,
  value: string,
  change: string,
  subtitle: string,
  icon: Html,
  trend = true,
): Html =>
  Card.card(
    {
      size: 'sm',
      children: [
        Card.cardHeader(
          {
            children: [
              Card.cardDescription({ children: [title] }, h),
              Card.cardAction(
                {
                  children: [h.div([h.Class('text-muted-foreground')], [icon])],
                },
                h,
              ),
            ],
          },
          h,
        ),
        Card.cardContent(
          {
            class: 'gap-2',
            children: [
              h.div(
                [h.Class('text-3xl font-semibold tracking-tight tabular-nums')],
                [value],
              ),
              h.div(
                [h.Class('flex flex-wrap items-center gap-2')],
                [
                  Badge.badge(
                    {
                      variant: 'outline',
                      children: [
                        ...(trend ? [Icon.trendingUp({}, h)] : []),
                        change,
                      ],
                    },
                    h,
                  ),
                  h.span(
                    [h.Class('text-xs text-muted-foreground')],
                    [subtitle],
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
  )

const chart = (
  h: H,
  id: string,
  range: string,
  label: string,
  alternative: Html,
  height = 'h-64',
) =>
  Chart.eChart(
    {
      hostId: id,
      variant: range,
      ariaLabel: label,
      accessibleAlternative: alternative,
      toMessage: message => Message.GotChart({ message }),
      class: cn(
        height,
        '[&_[data-slot=echart]]:h-full [&_[data-slot=echart]]:aspect-auto',
      ),
    },
    h,
  )

const overviewView = (model: Model, h: H): Html => {
  const data = ranges[model.range]
  const revenue = data.current.reduce<number>((a, b) => a + b, 0)
  const previous = data.previous.reduce<number>((a, b) => a + b, 0)
  const change = `${((revenue / previous - 1) * 100).toFixed(1)}%`
  const chartAlternative = h.table(
    [],
    [
      h.caption([], ['Revenue compared with the previous period']),
      h.thead(
        [],
        [
          h.tr(
            [],
            ['Date', 'This period', 'Previous period'].map(label =>
              h.th([h.Attribute('scope', 'col')], [label]),
            ),
          ),
        ],
      ),
      h.tbody(
        [],
        data.dates.map((date, i) =>
          h.tr(
            [],
            [
              h.th([h.Attribute('scope', 'row')], [date]),
              h.td([], [money(data.current[i] ?? 0)]),
              h.td([], [money(data.previous[i] ?? 0)]),
            ],
          ),
        ),
      ),
    ],
  )
  return h.div(
    [h.Class('flex flex-col gap-6')],
    [
      heading(
        h,
        'Workspace overview',
        'A little clarity on how your business is doing.',
        button(
          h,
          'Export report',
          Message.ExportedReport(),
          'outline',
          Icon.download({}, h),
        ),
      ),
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-3')],
        [
          h.div(
            [h.Class('flex items-center gap-2 text-sm text-muted-foreground')],
            [
              Icon.calendarDays({ class: 'size-4' }, h),
              h.span(
                [],
                [
                  model.range === '7d'
                    ? 'Oct 3 – Oct 9, 2026'
                    : model.range === '30d'
                      ? 'Sep 10 – Oct 9, 2026'
                      : 'Jul 12 – Oct 9, 2026',
                ],
              ),
            ],
          ),
          ToggleGroup.toggleGroup(
            {
              model: model.rangeToggle,
              toParentMessage: message => Message.GotRangeToggle({ message }),
              value: model.range,
              variant: 'outline',
              ariaLabel: 'Report time range',
              items: [
                { value: '7d', children: ['7 days'] },
                { value: '30d', children: ['30 days'] },
                { value: '90d', children: ['90 days'] },
              ],
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-4 sm:grid-cols-2 xl:grid-cols-4')],
        [
          statCard(
            h,
            'Total revenue',
            money(revenue),
            change,
            'vs. previous period',
            Icon.banknote({ class: 'size-4' }, h),
          ),
          statCard(
            h,
            'Active customers',
            number(data.customers),
            '12.8%',
            'vs. previous period',
            Icon.users({ class: 'size-4' }, h),
          ),
          statCard(
            h,
            'New subscriptions',
            number(data.subscriptions),
            '8.2%',
            'vs. previous period',
            Icon.creditCard({ class: 'size-4' }, h),
          ),
          statCard(
            h,
            'Conversion rate',
            data.rate,
            '0.6 pts',
            'vs. previous period',
            Icon.mousePointer2({ class: 'size-4' }, h),
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-6 lg:grid-cols-3')],
        [
          Card.card(
            {
              class: 'lg:col-span-2',
              children: [
                cardHeader(
                  h,
                  'Revenue over time',
                  'A steady rhythm. A promising direction.',
                ),
                Card.cardContent(
                  {
                    class: 'gap-4',
                    children: [
                      h.div(
                        [
                          h.Class(
                            'flex flex-wrap items-center gap-5 text-xs text-muted-foreground',
                          ),
                        ],
                        [
                          h.span(
                            [h.Class('flex items-center gap-2')],
                            [
                              h.span(
                                [h.Class('size-2 rounded-full bg-chart-2')],
                                [],
                              ),
                              'This period',
                            ],
                          ),
                          h.span(
                            [h.Class('flex items-center gap-2')],
                            [
                              h.span(
                                [
                                  h.Class(
                                    'w-4 border-t border-dashed border-muted-foreground',
                                  ),
                                ],
                                [],
                              ),
                              'Previous period',
                            ],
                          ),
                        ],
                      ),
                      chart(
                        h,
                        'revenue-chart',
                        model.range,
                        `Revenue for ${data.label.toLowerCase()}`,
                        chartAlternative,
                        'h-72',
                      ),
                    ],
                  },
                  h,
                ),
                Card.cardFooter(
                  {
                    class: 'gap-2 border-t text-xs text-muted-foreground',
                    children: [
                      Icon.trendingUp({ class: 'size-4 text-chart-2' }, h),
                      `Revenue is up ${change} compared with the previous period.`,
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          Card.card(
            {
              children: [
                cardHeader(
                  h,
                  'Customer acquisition',
                  'Where your customers find you.',
                ),
                Card.cardContent(
                  {
                    class: 'gap-5',
                    children: [
                      h.div(
                        [h.Class('relative mx-auto w-full max-w-52')],
                        [
                          chart(
                            h,
                            'acquisition-chart',
                            model.range,
                            'Acquisition: organic search 48%, direct 28%, referrals 16%, social 8%.',
                            h.p(
                              [],
                              [
                                'Organic search 48%; direct 28%; referrals 16%; social 8%.',
                              ],
                            ),
                            'h-48',
                          ),
                          h.div(
                            [
                              h.Class(
                                'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1',
                              ),
                            ],
                            [
                              h.span(
                                [
                                  h.Class(
                                    'text-2xl font-semibold tabular-nums',
                                  ),
                                ],
                                [number(data.customers)],
                              ),
                              h.span(
                                [h.Class('text-xs text-muted-foreground')],
                                ['Customers'],
                              ),
                            ],
                          ),
                        ],
                      ),
                      h.div(
                        [h.Class('flex flex-col gap-3')],
                        (
                          [
                            ['Organic search', '48%', 'bg-chart-2'],
                            ['Direct', '28%', 'bg-chart-3'],
                            ['Referrals', '16%', 'bg-chart-1'],
                            ['Social', '8%', 'bg-chart-4'],
                          ] as const
                        ).map(([name, value, color]) =>
                          h.div(
                            [h.Class('flex items-center gap-2.5 text-sm')],
                            [
                              h.span(
                                [h.Class(cn('size-2 rounded-full', color))],
                                [],
                              ),
                              h.span(
                                [h.Class('text-muted-foreground')],
                                [name],
                              ),
                              h.span(
                                [h.Class('ml-auto font-medium tabular-nums')],
                                [value],
                              ),
                            ],
                          ),
                        ),
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
        [h.Class('grid gap-6 lg:grid-cols-2')],
        [
          Card.card(
            {
              children: [
                cardHeader(
                  h,
                  'Revenue by plan',
                  'The plans powering your growth.',
                ),
                Card.cardContent(
                  {
                    children: [
                      chart(
                        h,
                        'plans-chart',
                        model.range,
                        'Revenue by plan',
                        h.ul(
                          [],
                          ['Starter', 'Growth', 'Business', 'Enterprise'].map(
                            (plan, i) =>
                              h.li(
                                [],
                                [
                                  `${plan}: ${money(revenue * ([0.12, 0.28, 0.38, 0.22][i] ?? 0))}`,
                                ],
                              ),
                          ),
                        ),
                        'h-48',
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          Card.card(
            {
              children: [
                cardHeader(
                  h,
                  'Around your workspace',
                  'Small updates. Good momentum.',
                  Button.buttonLink(
                    {
                      href: '/users',
                      variant: 'ghost',
                      size: 'sm',
                      children: ['View users'],
                      trailingIcon: Icon.arrowUpRight({}, h),
                    },
                    h,
                  ),
                ),
                Card.cardContent(
                  {
                    class: 'gap-5',
                    children: (
                      [
                        [
                          'Olivia Rhye',
                          'upgraded to the Business plan',
                          '12 min ago',
                        ],
                        [
                          'Phoenix Baker',
                          'joined your workspace',
                          '48 min ago',
                        ],
                        [
                          'Lana Steiner',
                          'renewed a Growth subscription',
                          '2 hours ago',
                        ],
                        [
                          'Demi Wilkinson',
                          'received a team invitation',
                          '3 hours ago',
                        ],
                      ] as const
                    ).map(([name, event, time]) =>
                      h.div(
                        [h.Class('flex items-center gap-3')],
                        [
                          avatar(h, name),
                          h.div(
                            [h.Class('min-w-0 flex-1')],
                            [
                              h.p(
                                [h.Class('text-sm')],
                                [
                                  h.span([h.Class('font-medium')], [name]),
                                  ' ',
                                  event,
                                ],
                              ),
                              text(
                                h,
                                time,
                                'mt-1 text-xs text-muted-foreground',
                              ),
                            ],
                          ),
                        ],
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
      ),
      text(
        h,
        'Sample analytics · Last updated October 9, 2026',
        'text-xs text-muted-foreground',
      ),
    ],
  )
}

const usersView = (model: Model, h: H): Html => {
  const active = model.users.filter(user => user.status === 'Active').length
  const invited = model.users.filter(user => user.status === 'Invited').length
  const admins = model.users.filter(user => user.role === 'Admin').length
  const columns: DataTable.DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'User',
      isHideable: false,
      sortValue: user => user.name,
      cell: user =>
        h.div(
          [h.Class('flex min-w-48 items-center gap-3 py-1')],
          [
            avatar(h, user.name),
            h.div(
              [h.Class('grid gap-0.5')],
              [
                h.span([h.Class('font-medium')], [user.name]),
                h.span(
                  [h.Class('text-xs text-muted-foreground')],
                  [user.email],
                ),
              ],
            ),
          ],
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: user => user.status,
      cell: user =>
        Badge.badge(
          {
            variant: 'outline',
            children: [
              h.span(
                [
                  h.Class(
                    cn(
                      'size-1.5 rounded-full',
                      user.status === 'Active'
                        ? 'bg-chart-2'
                        : user.status === 'Invited'
                          ? 'bg-chart-1'
                          : 'bg-muted-foreground',
                    ),
                  ),
                ],
                [],
              ),
              user.status,
            ],
          },
          h,
        ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: user => user.role,
      cell: user => user.role,
    },
    {
      key: 'joined',
      header: 'Date added',
      sortValue: user => user.joined,
      cell: user =>
        new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(user.joined)),
    },
    {
      key: 'actions',
      header: 'Actions',
      isHideable: false,
      cell: user =>
        Button.button(
          {
            ariaLabel: `Edit ${user.name}`,
            variant: 'ghost',
            size: 'icon-lg',
            onClick: Message.OpenedUser({ id: user.id }),
            children: [Icon.pencil({}, h)],
          },
          h,
        ),
      class: 'text-right',
    },
  ]
  return h.div(
    [h.Class('flex flex-col gap-6')],
    [
      heading(
        h,
        'Your people, in one place',
        'Manage your team, their roles, and access to your workspace.',
        button(
          h,
          'Add user',
          Message.OpenedUser({ id: '' }),
          'default',
          Icon.plus({}, h),
        ),
      ),
      h.div(
        [h.Class('grid gap-4 sm:grid-cols-2 xl:grid-cols-4')],
        [
          statCard(
            h,
            'Total users',
            String(model.users.length),
            'Team',
            'people in your workspace',
            Icon.users({ class: 'size-4' }, h),
            false,
          ),
          statCard(
            h,
            'Active users',
            String(active),
            `${Math.round((active / model.users.length) * 100)}%`,
            'of your team is active',
            Icon.userCheck({ class: 'size-4' }, h),
            false,
          ),
          statCard(
            h,
            'Pending invitations',
            String(invited),
            'Pending',
            'waiting to join the team',
            Icon.mail({ class: 'size-4' }, h),
            false,
          ),
          statCard(
            h,
            'Administrators',
            String(admins),
            'Full access',
            'workspace managers',
            Icon.shieldCheck({ class: 'size-4' }, h),
            false,
          ),
        ],
      ),
      Card.card(
        {
          children: [
            cardHeader(
              h,
              'Team directory',
              `${model.users.length} people working better, together.`,
              button(
                h,
                'Export CSV',
                Message.ExportedUsers(),
                'outline',
                Icon.download({}, h),
              ),
            ),
            Card.cardContent(
              {
                class: 'gap-4',
                children: [
                  DataTable.dataTable(
                    {
                      id: 'users',
                      ariaLabel: 'Team users',
                      model: model.table,
                      toParentMessage: message => Message.GotTable({ message }),
                      rows: filteredUsers(model),
                      columns,
                      rowKey: user => user.id,
                      filterText: user =>
                        `${user.name} ${user.email} ${user.role} ${user.status}`,
                      filterPlaceholder:
                        'Search users by name, email, or role…',
                      emptyText:
                        'No users match your filters. Try a different search or status.',
                      enableRowSelection: true,
                      enableColumnVisibility: true,
                      rowSelectionLabel: user => `Select ${user.name}`,
                      pageSizeOptions: [8, 16, 32],
                      toolbarContent: [
                        Select.nativeSelect(
                          {
                            id: 'status-filter',
                            value: model.statusFilter,
                            label: 'Filter by status',
                            onChange: value =>
                              Message.ChangedStatusFilter({ value }),
                            options: [
                              'All',
                              'Active',
                              'Invited',
                              'Inactive',
                            ].map(value => ({
                              value,
                              label: value === 'All' ? 'All statuses' : value,
                            })),
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
      text(
        h,
        'Changes are saved in this browser. This workspace uses demo data.',
        'text-xs text-muted-foreground',
      ),
    ],
  )
}

const settingInput = (
  model: Model,
  h: H,
  key: 'workspace' | 'email',
  label: string,
  description?: string,
) => {
  const error = model.settingsSubmitted ? settingsErrors(model)[key] : ''
  return Field.controlField(
    {
      id: `setting-${key}`,
      label,
      ...(description ? { description } : {}),
      ...(error ? { error } : {}),
      toControl: parts =>
        Input.input(
          {
            id: parts.controlId,
            value: model.settings[key],
            onInput: value => Message.ChangedSetting({ field: key, value }),
            type: key === 'email' ? 'email' : 'text',
            isInvalid: parts.isInvalid,
            ...(parts.describedBy ? { describedBy: parts.describedBy } : {}),
            class: 'h-10',
          },
          h,
        ),
    },
    h,
  )
}

const settingsView = (model: Model, h: H): Html => {
  const dirty =
    JSON.stringify(model.settings) !== JSON.stringify(model.savedSettings)
  const workspaceContent = h.div(
    [h.Class('grid gap-6 lg:grid-cols-[1fr_2fr]')],
    [
      h.div(
        [h.Class('flex flex-col gap-2 pt-2')],
        [
          h.h2([h.Class('text-base font-medium')], ['Workspace details']),
          text(
            h,
            'Make this space your own. These details are visible to everyone on your team.',
            'max-w-sm text-sm leading-6 text-muted-foreground',
          ),
        ],
      ),
      Card.card(
        {
          children: [
            Card.cardContent(
              {
                children: [
                  Field.fieldGroup(
                    {
                      children: [
                        h.div(
                          [h.Class('flex items-center gap-4')],
                          [
                            h.div(
                              [
                                h.Class(
                                  'flex size-14 items-center justify-center rounded-xl bg-primary text-2xl font-semibold text-primary-foreground',
                                ),
                              ],
                              ['f.'],
                            ),
                            h.div(
                              [h.Class('grid gap-1')],
                              [
                                h.span(
                                  [h.Class('text-sm font-medium')],
                                  [
                                    model.settings.workspace ||
                                      'Your workspace',
                                  ],
                                ),
                                text(
                                  h,
                                  'Your team workspace',
                                  'text-xs text-muted-foreground',
                                ),
                              ],
                            ),
                          ],
                        ),
                        settingInput(model, h, 'workspace', 'Workspace name'),
                        settingInput(
                          model,
                          h,
                          'email',
                          'Contact email',
                          'We’ll send workspace updates to this address.',
                        ),
                        Field.fieldGroup(
                          {
                            class: 'grid gap-5 sm:grid-cols-2',
                            children: [
                              Field.field(
                                {
                                  children: [
                                    Field.fieldLabel(
                                      {
                                        for: 'setting-timezone',
                                        children: ['Timezone'],
                                      },
                                      h,
                                    ),
                                    Select.nativeSelect(
                                      {
                                        id: 'setting-timezone',
                                        value: model.settings.timezone,
                                        onChange: value =>
                                          Message.ChangedSetting({
                                            field: 'timezone',
                                            value,
                                          }),
                                        options: [
                                          {
                                            value: 'Europe/Berlin',
                                            label: 'Berlin (Europe/Berlin)',
                                          },
                                          {
                                            value: 'Europe/London',
                                            label: 'London (Europe/London)',
                                          },
                                          {
                                            value: 'America/New_York',
                                            label:
                                              'New York (America/New_York)',
                                          },
                                          {
                                            value: 'Asia/Tokyo',
                                            label: 'Tokyo (Asia/Tokyo)',
                                          },
                                        ],
                                        class: 'h-10',
                                      },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                              Field.field(
                                {
                                  children: [
                                    Field.fieldLabel(
                                      {
                                        for: 'setting-currency',
                                        children: ['Preferred currency'],
                                      },
                                      h,
                                    ),
                                    Select.nativeSelect(
                                      {
                                        id: 'setting-currency',
                                        value: model.settings.currency,
                                        onChange: value =>
                                          Message.ChangedSetting({
                                            field: 'currency',
                                            value,
                                          }),
                                        options: [
                                          {
                                            value: 'USD',
                                            label: 'USD — US Dollar',
                                          },
                                          { value: 'EUR', label: 'EUR — Euro' },
                                          {
                                            value: 'GBP',
                                            label: 'GBP — British Pound',
                                          },
                                        ],
                                        class: 'h-10',
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
                        Field.field(
                          {
                            children: [
                              Field.fieldLabel(
                                {
                                  for: 'setting-description',
                                  children: ['About your workspace'],
                                },
                                h,
                              ),
                              Textarea.textarea(
                                {
                                  id: 'setting-description',
                                  value: model.settings.description,
                                  onInput: value =>
                                    Message.ChangedSetting({
                                      field: 'description',
                                      value,
                                    }),
                                  placeholder:
                                    'Tell us a little about your team…',
                                  class: 'min-h-24',
                                },
                                h,
                              ),
                              Field.fieldDescription(
                                {
                                  children: [
                                    'A short description to help your team feel at home.',
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
      ),
    ],
  )
  const notificationsContent = h.div(
    [h.Class('grid gap-6 lg:grid-cols-[1fr_2fr]')],
    [
      h.div(
        [h.Class('flex flex-col gap-2 pt-2')],
        [
          h.h2([h.Class('text-base font-medium')], ['Stay in the loop']),
          text(
            h,
            'Choose what reaches your inbox. A little less noise, a little more focus.',
            'max-w-sm text-sm leading-6 text-muted-foreground',
          ),
        ],
      ),
      Card.card(
        {
          children: [
            Card.cardContent(
              {
                children: [
                  Field.fieldSet(
                    {
                      id: 'notifications-fields',
                      children: [
                        Field.fieldLegend(
                          {
                            id: Field.fieldSetLegendId('notifications-fields'),
                            children: ['Email notifications'],
                          },
                          h,
                        ),
                        Field.fieldGroup(
                          {
                            children: (
                              [
                                [
                                  'weekly',
                                  'Weekly digest',
                                  'A weekly look at your revenue, customers, and team activity.',
                                ],
                                [
                                  'security',
                                  'Security alerts',
                                  'Get notified about new sign-ins and changes to workspace access.',
                                ],
                                [
                                  'product',
                                  'Product updates',
                                  'New features and thoughtful improvements, every now and then.',
                                ],
                              ] as const
                            ).map(([key, label, description]) =>
                              Field.field(
                                {
                                  orientation: 'horizontal',
                                  class: 'justify-between gap-5',
                                  children: [
                                    Field.fieldContent(
                                      {
                                        children: [
                                          Field.fieldLabel(
                                            {
                                              id: Switch.switchIds(
                                                `notify-${key}`,
                                              ).labelId,
                                              for: Switch.switchIds(
                                                `notify-${key}`,
                                              ).controlId,
                                              children: [label],
                                            },
                                            h,
                                          ),
                                          Field.fieldDescription(
                                            {
                                              id: `notify-${key}-help`,
                                              children: [description],
                                            },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                    Switch.switchControl(
                                      {
                                        id: `notify-${key}`,
                                        describedBy: `notify-${key}-help`,
                                        isChecked:
                                          model.settings[
                                            key as
                                              | 'weekly'
                                              | 'security'
                                              | 'product'
                                          ],
                                        onToggle: value =>
                                          Message.ToggledSetting({
                                            field: key,
                                            value,
                                          }),
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
    ],
  )
  return h.div(
    [h.Class('flex flex-col gap-6')],
    [
      heading(
        h,
        'A workspace that works for you',
        'Manage your workspace details and make yourself at home.',
        h.div(
          [h.Class('flex items-center gap-2')],
          [
            Button.button(
              {
                variant: 'outline',
                size: 'lg',
                onClick: Message.ResetSettings(),
                isDisabled: !dirty,
                children: ['Discard'],
              },
              h,
            ),
            Button.button(
              {
                size: 'lg',
                onClick: Message.SavedSettings(),
                isDisabled: !dirty,
                children: ['Save changes'],
              },
              h,
            ),
          ],
        ),
      ),
      Tabs.tabs(
        {
          model: model.settingsTabs,
          selectedValue: model.settingsTab,
          toParentMessage: message => Message.GotSettingsTabs({ message }),
          ariaLabel: 'Settings sections',
          variant: 'line',
          class: 'gap-8',
          listClass: 'border-b w-full justify-start pb-3',
          triggerClass: 'flex-none px-4',
          tabs: [
            {
              value: 'workspace',
              label: 'Workspace',
              content: workspaceContent,
            },
            {
              value: 'notifications',
              label: 'Notifications',
              content: notificationsContent,
            },
          ],
        },
        h,
      ),
      text(
        h,
        dirty
          ? 'You have unsaved changes.'
          : 'All changes saved. Settings are stored in this browser.',
        'text-xs text-muted-foreground',
      ),
    ],
  )
}

const userDialog = (model: Model, h: H): Html => {
  const errors = draftErrors(model)
  const input = (
    field: 'name' | 'email',
    label: string,
    placeholder: string,
  ) => {
    const error = model.submitted ? errors[field] : ''
    return Field.controlField(
      {
        id: `user-${field}`,
        label,
        ...(error ? { error } : {}),
        toControl: parts =>
          Input.input(
            {
              id: parts.controlId,
              value: model.draft[field],
              placeholder,
              type: field === 'email' ? 'email' : 'text',
              onInput: value => Message.ChangedDraft({ field, value }),
              isInvalid: parts.isInvalid,
              ...(parts.describedBy ? { describedBy: parts.describedBy } : {}),
              class: 'h-10',
            },
            h,
          ),
      },
      h,
    )
  }
  return Dialog.dialog(
    {
      model: model.dialog,
      toParentMessage: message => Message.GotDialog({ message }),
      title: model.editingId ? 'Edit team member' : 'Add someone to your team',
      description: 'Give them a place in your workspace.',
      content: () => [
        h.form(
          [
            h.Id('user-form'),
            h.OnSubmit(Message.SubmittedUser()),
            h.Attribute('novalidate', ''),
          ],
          [
            Field.fieldGroup(
              {
                class: 'gap-5 py-2',
                children: [
                  input('name', 'Full name', 'e.g. Jamie Taylor'),
                  input('email', 'Email address', 'jamie@company.com'),
                  Field.fieldGroup(
                    {
                      class: 'grid gap-4 sm:grid-cols-2',
                      children: [
                        Field.field(
                          {
                            children: [
                              Field.fieldLabel(
                                { for: 'user-role', children: ['Role'] },
                                h,
                              ),
                              Select.nativeSelect(
                                {
                                  id: 'user-role',
                                  value: model.draft.role,
                                  onChange: value =>
                                    Message.ChangedDraft({
                                      field: 'role',
                                      value,
                                    }),
                                  class: 'h-10',
                                  options: ['Admin', 'Member', 'Viewer'].map(
                                    value => ({
                                      value,
                                      label: value,
                                    }),
                                  ),
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        Field.field(
                          {
                            children: [
                              Field.fieldLabel(
                                { for: 'user-status', children: ['Status'] },
                                h,
                              ),
                              Select.nativeSelect(
                                {
                                  id: 'user-status',
                                  value: model.draft.status,
                                  onChange: value =>
                                    Message.ChangedDraft({
                                      field: 'status',
                                      value,
                                    }),
                                  class: 'h-10',
                                  options: [
                                    'Active',
                                    'Invited',
                                    'Inactive',
                                  ].map(value => ({
                                    value,
                                    label: value,
                                  })),
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
                  Field.fieldDescription(
                    {
                      children: [
                        'Admins manage the workspace. Members can collaborate. Viewers have read-only access.',
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
      footer: slots => [
        Button.button(
          {
            variant: 'outline',
            size: 'lg',
            buttonAttributes: slots.closeButton,
            children: ['Cancel'],
          },
          h,
        ),
        Button.button(
          {
            type: 'submit',
            form: 'user-form',
            size: 'lg',
            children: [model.editingId ? 'Save member' : 'Create user'],
            leadingIcon: model.editingId ? Icon.check({}, h) : Icon.plus({}, h),
          },
          h,
        ),
      ],
    },
    h,
  )
}

export const dashboardView = (model: Model, h: H): Document => ({
  title: `${pageNames[model.page]} · ${model.savedSettings.workspace}`,
  body: h.div(
    [],
    [
      h.a(
        [
          h.Href('#page-content'),
          h.Class(
            'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:p-3',
          ),
        ],
        ['Skip to content'],
      ),
      Sidebar.sidebarProvider(
        {
          state: model.sidebar.isOpen ? 'expanded' : 'collapsed',
          width: '15.5rem',
          children: [
            navView(model, h),
            Sidebar.sidebarInset(
              {
                class: 'min-w-0',
                children: [
                  headerView(model, h),
                  h.div(
                    [
                      h.Id('page-content'),
                      h.Attribute('tabindex', '-1'),
                      h.Class(
                        'mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-10 sm:p-8',
                      ),
                    ],
                    [
                      ...(model.notice
                        ? [
                            Alert.alert(
                              {
                                severity: 'success',
                                announcement: 'status',
                                children: [
                                  Alert.alertIcon(
                                    { children: [Icon.check({}, h)] },
                                    h,
                                  ),
                                  Alert.alertTitle(
                                    { children: [model.notice] },
                                    h,
                                  ),
                                  Alert.alertDescription(
                                    {
                                      children: [
                                        Button.button(
                                          {
                                            variant: 'link',
                                            size: 'xs',
                                            onClick: Message.DismissedNotice(),
                                            children: ['Dismiss'],
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
                          ]
                        : []),
                      model.page === 'overview'
                        ? overviewView(model, h)
                        : model.page === 'users'
                          ? usersView(model, h)
                          : settingsView(model, h),
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
      userDialog(model, h),
    ],
  ),
})
