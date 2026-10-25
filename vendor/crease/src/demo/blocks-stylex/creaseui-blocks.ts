import type { Html, HtmlBuilder } from 'foldkit/html'
import { Option } from 'effect'

import { badge } from '@/stylex/badge'
import { bubble, bubbleContent, bubbleGroup } from '@/stylex/bubble'
import { button } from '@/stylex/button'
import { card, cardContent, cardFooter } from '@/stylex/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/stylex/empty'
import { fieldSeparator } from '@/stylex/field'
import { input } from '@/stylex/input'
import type { ChartMessage } from '@/stylex/integrations/echarts'
import {
  item,
  itemContent,
  itemDescription,
  itemGroup,
  itemMedia,
  itemTitle,
} from '@/stylex/item'
import { nativeSelect } from '@/stylex/native-select'
import * as RadioGroup from '@/stylex/radio-group'
import { separator } from '@/stylex/separator'
import { textarea } from '@/stylex/textarea'
import {
  box,
  commercePage,
  dashboardShell,
  grid,
  inline,
  masterDetailPage,
  metricGrid,
  section,
  stack,
  tableRegion,
  text,
  toolbar,
} from '@/stylex/composition'
import { icon } from '@/stylex/composition/icon'
import {
  sidebar,
  sidebarContent,
  sidebarFooter,
  sidebarGroup,
  sidebarGroupContent,
  sidebarGroupLabel,
  sidebarHeader,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuItem,
} from '@/stylex/sidebar'
import {
  table,
  tableBody,
  tableCell,
  tableHead,
  tableHeader,
  tableRow,
} from '@/stylex/table'
import {
  activationSparkChart,
  conversionSparkChart,
  revenueSparkChart,
  sessionSparkChart,
} from './dashboard-echarts'

const pageHeader = <Message>(
  title: string,
  description: string,
  actions: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  inline(
    {
      align: 'center',
      children: [
        stack(
          {
            children: [
              text({ as: 'h1', children: [title], variant: 'headingMd' }, h),
              text(
                {
                  as: 'p',
                  children: [description],
                  tone: 'secondary',
                  variant: 'caption',
                },
                h,
              ),
            ],
            gap: 'xs',
          },
          h,
        ),
        inline(
          { align: 'center', children: actions, gap: 'sm', wrap: true },
          h,
        ),
      ],
      justify: 'between',
      width: 'full',
      wrap: true,
    },
    h,
  )

const dataTable = <Message>(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<Html | string>>,
  h: HtmlBuilder<Message>,
): Html =>
  table(
    {
      children: [
        tableHeader(
          {
            children: [
              tableRow(
                {
                  children: headers.map(header =>
                    tableHead({ children: [header] }, h),
                  ),
                },
                h,
              ),
            ],
          },
          h,
        ),
        tableBody(
          {
            children: rows.map(row =>
              tableRow(
                {
                  children: row.map(cell => tableCell({ children: [cell] }, h)),
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

const narrative = <Message>(
  title: string,
  body: string,
  iconName: string,
  h: HtmlBuilder<Message>,
): Html =>
  item(
    {
      children: [
        itemMedia(
          { children: [icon({ name: iconName }, h)], variant: 'icon' },
          h,
        ),
        itemContent(
          {
            children: [
              itemTitle({ children: [title] }, h),
              itemDescription({ children: [body] }, h),
            ],
          },
          h,
        ),
      ],
      size: 'sm',
    },
    h,
  )

const initials = <Message>(name: string, h: HtmlBuilder<Message>): Html =>
  badge({ children: [name], variant: 'secondary' }, h)

const workspaceNavigation = <Message>(
  active: string,
  h: HtmlBuilder<Message>,
): Html =>
  sidebar(
    {
      children: [
        sidebarHeader(
          {
            children: [
              inline(
                {
                  align: 'center',
                  children: [
                    badge({ children: ['NW'] }, h),
                    text({ children: ['Northwind'], variant: 'label' }, h),
                  ],
                  gap: 'sm',
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
                    sidebarGroupLabel({ children: ['Workspace'] }, h),
                    sidebarGroupContent(
                      {
                        children: [
                          sidebarMenu(
                            {
                              children: [
                                'Board',
                                'Inbox',
                                'Orders',
                                'Catalog',
                                'Checkout',
                                'Metrics',
                              ].map(label =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          children: [
                                            icon(
                                              {
                                                name:
                                                  label === 'Board'
                                                    ? 'layout-dashboard'
                                                    : label === 'Inbox'
                                                      ? 'inbox'
                                                      : label === 'Orders'
                                                        ? 'package'
                                                        : label === 'Catalog'
                                                          ? 'gallery-vertical-end'
                                                          : label === 'Checkout'
                                                            ? 'credit-card'
                                                            : 'chart-no-axes-combined',
                                              },
                                              h,
                                            ),
                                            label,
                                          ],
                                          isActive: label === active,
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
                              children: [initials('JL', h), 'Jules Lane'],
                              size: 'lg',
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
      collapsible: 'none',
    },
    h,
  )

const mailNavigation = <Message>(h: HtmlBuilder<Message>): Html =>
  sidebar(
    {
      children: [
        sidebarHeader(
          {
            children: [
              inline(
                {
                  align: 'center',
                  children: [
                    badge({ children: ['NW'] }, h),
                    text({ children: ['Northwind Mail'], variant: 'label' }, h),
                  ],
                  gap: 'sm',
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
                        children: [
                          sidebarMenu(
                            {
                              children: [
                                ['Inbox', 'inbox', '12'],
                                ['Starred', 'star', ''],
                                ['Sent', 'send', ''],
                                ['Drafts', 'file', '3'],
                                ['Archive', 'folder', ''],
                              ].map(([label, iconName, count]) =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          children: [
                                            icon(
                                              { name: iconName ?? 'inbox' },
                                              h,
                                            ),
                                            label ?? '',
                                            ...(count === ''
                                              ? []
                                              : [
                                                  badge(
                                                    {
                                                      children: [count ?? ''],
                                                      variant: 'secondary',
                                                    },
                                                    h,
                                                  ),
                                                ]),
                                          ],
                                          isActive: label === 'Inbox',
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
              sidebarGroup(
                {
                  children: [
                    sidebarGroupLabel({ children: ['Labels'] }, h),
                    sidebarGroupContent(
                      {
                        children: [
                          sidebarMenu(
                            {
                              children: ['Customers', 'Ops', 'Receipts'].map(
                                label =>
                                  sidebarMenuItem(
                                    {
                                      children: [
                                        sidebarMenuButton(
                                          {
                                            children: [
                                              icon({ name: 'tag' }, h),
                                              label,
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
                              children: [initials('JL', h), 'Jules Lane'],
                              size: 'lg',
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
      collapsible: 'none',
    },
    h,
  )

/* CreaseUI "Kanban Board": horizontal lanes where the column itself is the status. */
export const kanbanBoard = <Message>(h: HtmlBuilder<Message>): Html => {
  const laneCard = (
    cardTitle: string,
    tag: string,
    tagVariant: 'default' | 'secondary' | 'outline' | 'destructive',
    comments: number,
    owner: string,
  ): Html =>
    box(
      {
        children: [
          stack(
            {
              children: [
                inline(
                  {
                    children: [
                      badge({ children: [tag], variant: tagVariant }, h),
                      icon({ name: 'grip-vertical' }, h),
                    ],
                    justify: 'between',
                    width: 'full',
                  },
                  h,
                ),
                text({ children: [cardTitle], variant: 'label' }, h),
                inline(
                  {
                    children: [
                      initials(owner, h),
                      inline(
                        {
                          align: 'center',
                          children: [
                            icon({ name: 'message-circle' }, h),
                            text(
                              {
                                children: [String(comments)],
                                tone: 'secondary',
                                variant: 'caption',
                              },
                              h,
                            ),
                          ],
                          gap: 'xs',
                        },
                        h,
                      ),
                    ],
                    justify: 'between',
                    width: 'full',
                  },
                  h,
                ),
              ],
              gap: 'sm',
            },
            h,
          ),
        ],
        padding: 'sm',
        radius: 'md',
        surface: 'card',
      },
      h,
    )

  const lane = (
    name: string,
    count: number,
    cards: ReadonlyArray<Html>,
  ): Html =>
    box(
      {
        children: [
          stack(
            {
              children: [
                inline(
                  {
                    align: 'center',
                    children: [
                      text({ children: [name], variant: 'label' }, h),
                      badge(
                        { children: [String(count)], variant: 'secondary' },
                        h,
                      ),
                    ],
                    justify: 'between',
                    width: 'full',
                  },
                  h,
                ),
                stack({ children: [...cards], gap: 'sm' }, h),
              ],
              gap: 'sm',
            },
            h,
          ),
        ],
        padding: 'sm',
        radius: 'lg',
        surface: 'muted',
      },
      h,
    )

  return dashboardShell(
    {
      content: [
        grid(
          {
            children: [
              lane('Backlog', 3, [
                laneCard(
                  'Usage analytics for admin roles',
                  'Reporting',
                  'secondary',
                  4,
                  'MC',
                ),
                laneCard(
                  'Bulk import wizard for inventory',
                  'Feature',
                  'outline',
                  2,
                  'IN',
                ),
                laneCard(
                  'Empty state for archived projects',
                  'Design',
                  'outline',
                  1,
                  'JP',
                ),
              ]),
              lane('In progress', 3, [
                laneCard(
                  'Keyboard shortcuts for the board',
                  'Feature',
                  'secondary',
                  6,
                  'AS',
                ),
                laneCard(
                  'Migration retries on large accounts',
                  'Bug',
                  'destructive',
                  3,
                  'IN',
                ),
                laneCard(
                  'Granular notification preferences',
                  'Feature',
                  'secondary',
                  5,
                  'MC',
                ),
              ]),
              lane('Review', 2, [
                laneCard(
                  'Session timeline for audit log',
                  'Reporting',
                  'outline',
                  2,
                  'AS',
                ),
                laneCard(
                  'Regression test for invite flow',
                  'QA',
                  'secondary',
                  1,
                  'JP',
                ),
              ]),
              lane('Done', 3, [
                laneCard(
                  'Compact density for list views',
                  'Design',
                  'secondary',
                  8,
                  'MC',
                ),
                laneCard('Webhook replay tooling', 'Ops', 'outline', 2, 'IN'),
                laneCard(
                  'Staging environment refresh',
                  'Ops',
                  'secondary',
                  1,
                  'AS',
                ),
              ]),
            ],
            columns: 'four',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
      ],
      header: [
        pageHeader(
          'Sprint board',
          'Atlas release · sprint 14 · 11 open tasks',
          [
            button(
              { children: ['All assignees'], size: 'sm', variant: 'outline' },
              h,
            ),
            button(
              { children: ['This sprint'], size: 'sm', variant: 'secondary' },
              h,
            ),
            button(
              {
                leadingIcon: icon({ name: 'plus' }, h),
                children: ['New task'],
                size: 'sm',
              },
              h,
            ),
          ],
          h,
        ),
      ],
      navigation: workspaceNavigation('Board', h),
      theme: 'compact',
    },
    h,
  )
}

/* CreaseUI "Inbox Table": the table indexes a reading pane instead of being the destination. */
type MailThread = Readonly<{
  email: string
  id: string
  messages: ReadonlyArray<string>
  received: string
  receivedDetail: string
  sender: string
  starred: boolean
  subject: string
  tag: string
  tagVariant: 'outline' | 'secondary'
  unread: boolean
}>

const MAIL_THREADS: readonly [MailThread, ...MailThread[]] = [
  {
    email: 'nora@lumen.supply',
    id: 'nora',
    messages: [
      'Forecast file is attached — the supplier moved the fleece line up two weeks, so the October window is tighter than we planned.',
      'I can hold the current allocation if the ops team confirms the extra dock time by Thursday.',
    ],
    received: '9:41 AM',
    receivedDetail: 'Today · 9:41 AM · to me',
    sender: 'Nora Patel',
    starred: true,
    subject: 'Re: Q4 restock forecast',
    tag: 'Customers',
    tagVariant: 'secondary',
    unread: true,
  },
  {
    email: 'ops@atlas.dev',
    id: 'ops',
    messages: [
      'Storefront v2.31 deployed to production at 09:08 — all 42 checks passed.',
      'Canary traffic is holding at 10%. The rollback window stays open until noon.',
    ],
    received: '9:12 AM',
    receivedDetail: 'Today · 9:12 AM · to me',
    sender: 'Ops Bot',
    starred: false,
    subject: 'Deploy finished: storefront v2.31',
    tag: 'Ops',
    tagVariant: 'outline',
    unread: true,
  },
  {
    email: 'kofi@adlergoods.com',
    id: 'kofi',
    messages: [
      'Invoice #2184 for $2,184.00 was paid this afternoon — the receipt is attached.',
      'The order moved to fulfillment and the packing slip went to the warehouse.',
    ],
    received: 'Yesterday',
    receivedDetail: 'Yesterday · 4:22 PM · to me',
    sender: 'Kofi Mensah',
    starred: false,
    subject: 'Invoice #2184 paid',
    tag: 'Receipts',
    tagVariant: 'secondary',
    unread: false,
  },
  {
    email: 'priya@fieldnotes.co',
    id: 'priya',
    messages: [
      'Do we still get the Q4 tier pricing if we split the order across two warehouses?',
      'Happy to send the purchase order today if the terms hold.',
    ],
    received: 'Yesterday',
    receivedDetail: 'Yesterday · 11:03 AM · to me',
    sender: 'Priya Nair',
    starred: true,
    subject: 'Question about the trade program',
    tag: 'Customers',
    tagVariant: 'secondary',
    unread: true,
  },
  {
    email: 'liam@depotline.io',
    id: 'liam',
    messages: [
      'Dock 2 is reserved October 6–9 for the fleece delivery.',
      'Can you confirm the truck count? The depot needs it by Friday.',
    ],
    received: 'Monday',
    receivedDetail: 'Monday · 8:15 AM · to me',
    sender: 'Liam Ortiz',
    starred: false,
    subject: 'Dock schedule for October',
    tag: 'Ops',
    tagVariant: 'outline',
    unread: false,
  },
]

const INBOX_FILTERS: ReadonlyArray<Readonly<{ id: string; label: string }>> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'starred', label: 'Starred' },
]

const monogram = (name: string): string =>
  name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()

export const inboxTable = <Message>(
  props: Readonly<{
    filter: string
    onFilter: (value: string) => Message
    onSelect: (id: string) => Message
    selected: string
  }>,
  h: HtmlBuilder<Message>,
): Html => {
  const thread =
    MAIL_THREADS.find(candidate => candidate.id === props.selected) ??
    MAIL_THREADS[0]
  const rows = MAIL_THREADS.filter(candidate =>
    props.filter === 'unread'
      ? candidate.unread
      : props.filter === 'starred'
        ? candidate.starred
        : true,
  )
  return masterDetailPage(
    {
      detail: section(
        {
          children: [
            stack(
              {
                children: [
                  inline(
                    {
                      align: 'center',
                      children: [
                        inline(
                          {
                            align: 'center',
                            children: [
                              initials(monogram(thread.sender), h),
                              stack(
                                {
                                  children: [
                                    text(
                                      {
                                        children: [thread.sender],
                                        variant: 'label',
                                      },
                                      h,
                                    ),
                                    text(
                                      {
                                        children: [thread.email],
                                        tone: 'secondary',
                                        variant: 'caption',
                                      },
                                      h,
                                    ),
                                  ],
                                  gap: 'none',
                                },
                                h,
                              ),
                            ],
                            gap: 'sm',
                          },
                          h,
                        ),
                        inline(
                          {
                            children: [
                              button(
                                {
                                  ariaLabel: 'Reply',
                                  children: [
                                    icon({ name: 'corner-up-left' }, h),
                                  ],
                                  size: 'icon',
                                  variant: 'ghost',
                                },
                                h,
                              ),
                              button(
                                {
                                  ariaLabel: 'Star',
                                  children: [icon({ name: 'star' }, h)],
                                  size: 'icon',
                                  variant: 'ghost',
                                },
                                h,
                              ),
                              button(
                                {
                                  ariaLabel: 'Archive',
                                  children: [icon({ name: 'folder' }, h)],
                                  size: 'icon',
                                  variant: 'ghost',
                                },
                                h,
                              ),
                            ],
                            gap: 'xs',
                          },
                          h,
                        ),
                      ],
                      justify: 'between',
                      width: 'full',
                    },
                    h,
                  ),
                  stack(
                    {
                      children: [
                        text(
                          { children: [thread.subject], variant: 'headingSm' },
                          h,
                        ),
                        text(
                          {
                            children: [thread.receivedDetail],
                            tone: 'secondary',
                            variant: 'caption',
                          },
                          h,
                        ),
                      ],
                      gap: 'xs',
                    },
                    h,
                  ),
                  separator({}, h),
                  bubbleGroup(
                    {
                      children: thread.messages.map(body =>
                        bubble(
                          {
                            children: [bubbleContent({ children: [body] }, h)],
                          },
                          h,
                        ),
                      ),
                    },
                    h,
                  ),
                  separator({}, h),
                  stack(
                    {
                      children: [
                        textarea(
                          {
                            id: 'inbox-reply',
                            placeholder: `Reply to ${thread.sender.split(' ')[0] ?? thread.sender}…`,
                            rows: 3,
                            value: '',
                          },
                          h,
                        ),
                        inline(
                          {
                            children: [
                              button(
                                {
                                  ariaLabel: 'Attach file',
                                  children: [icon({ name: 'link' }, h)],
                                  size: 'icon',
                                  variant: 'ghost',
                                },
                                h,
                              ),
                              button(
                                {
                                  leadingIcon: icon({ name: 'send' }, h),
                                  children: ['Send'],
                                  size: 'sm',
                                },
                                h,
                              ),
                            ],
                            justify: 'between',
                            width: 'full',
                          },
                          h,
                        ),
                      ],
                      gap: 'sm',
                    },
                    h,
                  ),
                ],
                gap: 'md',
              },
              h,
            ),
          ],
          heading: 'Message',
          surface: 'plain',
        },
        h,
      ),
      detailBehavior: 'stack',
      header: [
        pageHeader(
          'Inbox',
          '12 unread · synced 1 minute ago',
          [
            button(
              {
                leadingIcon: icon({ name: 'search' }, h),
                children: ['Search mail'],
                size: 'sm',
                variant: 'outline',
              },
              h,
            ),
            button(
              {
                leadingIcon: icon({ name: 'file-pen-line' }, h),
                children: ['Compose'],
                size: 'sm',
              },
              h,
            ),
          ],
          h,
        ),
      ],
      master: [
        tableRegion(
          {
            children: [
              dataTable(
                ['Sender', 'Subject', 'Tags', 'Received'],
                rows.map(candidate => [
                  candidate.sender,
                  button(
                    {
                      children: [candidate.subject],
                      onClick: props.onSelect(candidate.id),
                      size: 'sm',
                      variant:
                        candidate.id === thread.id ? 'secondary' : 'ghost',
                    },
                    h,
                  ),
                  badge(
                    {
                      children: [candidate.tag],
                      variant: candidate.tagVariant,
                    },
                    h,
                  ),
                  candidate.received,
                ]),
                h,
              ),
            ],
            description: 'Select a row to read the thread',
            heading: 'Messages',
            toolbar: [
              toolbar(
                {
                  children: [
                    inline(
                      {
                        children: INBOX_FILTERS.map(option =>
                          button(
                            {
                              children: [option.label],
                              onClick: props.onFilter(option.id),
                              size: 'sm',
                              variant:
                                props.filter === option.id
                                  ? 'secondary'
                                  : 'ghost',
                            },
                            h,
                          ),
                        ),
                        gap: 'xs',
                      },
                      h,
                    ),
                    inline(
                      {
                        children: [
                          button(
                            {
                              children: ['Newest first'],
                              size: 'sm',
                              variant: 'outline',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  label: 'Inbox filters',
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
      navigation: mailNavigation(h),
      theme: 'compact',
    },
    h,
  )
}

/* CreaseUI "Order Detail": a record holding children plus a chronological activity rail. */
export const orderDetail = <Message>(h: HtmlBuilder<Message>): Html =>
  masterDetailPage(
    {
      detail: section(
        {
          children: [
            itemGroup(
              {
                children: [
                  narrative(
                    'Label created',
                    'UPS 1Z 999 AA1 0123 4567 84 · 4:12 PM',
                    'package',
                    h,
                  ),
                  narrative(
                    'Payment captured',
                    '$248.00 on Visa ·· 4242 · 2:44 PM',
                    'credit-card',
                    h,
                  ),
                  narrative(
                    'Order placed',
                    'Storefront checkout · 2:41 PM',
                    'shopping-cart',
                    h,
                  ),
                ],
                spacing: 'md',
              },
              h,
            ),
          ],
          description: 'Most recent first',
          heading: 'Activity',
          surface: 'plain',
        },
        h,
      ),
      detailBehavior: 'stack',
      header: [
        pageHeader(
          'Order #1043',
          'Placed Sep 18 · 2:41 PM · Storefront',
          [
            badge({ children: ['Paid'], variant: 'secondary' }, h),
            badge({ children: ['Fulfilling'], variant: 'outline' }, h),
            button({ children: ['Refund'], size: 'sm', variant: 'outline' }, h),
            button(
              {
                leadingIcon: icon({ name: 'printer' }, h),
                children: ['Print'],
                size: 'sm',
                variant: 'outline',
              },
              h,
            ),
            button({ children: ['Mark fulfilled'], size: 'sm' }, h),
          ],
          h,
        ),
      ],
      master: [
        grid(
          {
            children: [
              box(
                {
                  children: [
                    stack(
                      {
                        children: [
                          text(
                            {
                              children: ['Customer'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text(
                            { children: ['Robin Adler'], variant: 'label' },
                            h,
                          ),
                          text(
                            {
                              children: ['robin@adlergoods.com'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  padding: 'md',
                  radius: 'lg',
                  surface: 'card',
                },
                h,
              ),
              box(
                {
                  children: [
                    stack(
                      {
                        children: [
                          text(
                            {
                              children: ['Channel'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text(
                            { children: ['Storefront'], variant: 'label' },
                            h,
                          ),
                          text(
                            {
                              children: ['Web checkout'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  padding: 'md',
                  radius: 'lg',
                  surface: 'card',
                },
                h,
              ),
              box(
                {
                  children: [
                    stack(
                      {
                        children: [
                          text(
                            {
                              children: ['Delivery'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text({ children: ['Express'], variant: 'label' }, h),
                          text(
                            {
                              children: ['Arrives Sep 22'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  padding: 'md',
                  radius: 'lg',
                  surface: 'card',
                },
                h,
              ),
              box(
                {
                  children: [
                    stack(
                      {
                        children: [
                          text(
                            {
                              children: ['Total'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text(
                            {
                              children: ['$248.00'],
                              numeric: 'tabular',
                              variant: 'label',
                            },
                            h,
                          ),
                          text(
                            {
                              children: ['3 items'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  padding: 'md',
                  radius: 'lg',
                  surface: 'card',
                },
                h,
              ),
            ],
            columns: 'four',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
        tableRegion(
          {
            children: [
              dataTable(
                ['Item', 'SKU', 'Qty', 'Price', 'Total'],
                [
                  [
                    'Canvas Field Jacket',
                    'JK-102 · Olive / M',
                    '1',
                    '$168.00',
                    '$168.00',
                  ],
                  [
                    'Merino Crew Sock · 3 pack',
                    'SK-310 · Charcoal',
                    '2',
                    '$32.00',
                    '$64.00',
                  ],
                  [
                    'Enamel Camp Mug',
                    'MG-205 · Cream',
                    '1',
                    '$16.00',
                    '$16.00',
                  ],
                ],
                h,
              ),
            ],
            footer: [
              stack(
                {
                  children: [
                    inline(
                      {
                        children: [
                          text(
                            {
                              children: ['Subtotal'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text(
                            {
                              children: ['$248.00'],
                              numeric: 'tabular',
                              variant: 'label',
                            },
                            h,
                          ),
                        ],
                        justify: 'between',
                        width: 'full',
                      },
                      h,
                    ),
                    inline(
                      {
                        children: [
                          text(
                            {
                              children: ['Shipping'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text(
                            {
                              children: ['$12.00'],
                              numeric: 'tabular',
                              variant: 'label',
                            },
                            h,
                          ),
                        ],
                        justify: 'between',
                        width: 'full',
                      },
                      h,
                    ),
                    inline(
                      {
                        children: [
                          text(
                            {
                              children: ['Tax'],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                          text(
                            {
                              children: ['$0.00'],
                              numeric: 'tabular',
                              variant: 'label',
                            },
                            h,
                          ),
                        ],
                        justify: 'between',
                        width: 'full',
                      },
                      h,
                    ),
                    separator({}, h),
                    inline(
                      {
                        children: [
                          text({ children: ['Total'], variant: 'label' }, h),
                          text(
                            {
                              children: ['$272.00'],
                              numeric: 'tabular',
                              variant: 'headingSm',
                            },
                            h,
                          ),
                        ],
                        justify: 'between',
                        width: 'full',
                      },
                      h,
                    ),
                  ],
                  gap: 'sm',
                },
                h,
              ),
            ],
            heading: 'Line items',
          },
          h,
        ),
        section(
          {
            children: [
              itemGroup(
                {
                  children: [
                    narrative(
                      'Ship to',
                      'Robin Adler · 44 Beacon St, Boston MA 02108',
                      'pin',
                      h,
                    ),
                    narrative(
                      'Method',
                      'Express · delivered by carrier',
                      'car',
                      h,
                    ),
                  ],
                  spacing: 'md',
                },
                h,
              ),
            ],
            heading: 'Delivery',
            surface: 'card',
          },
          h,
        ),
      ],
      theme: 'comfortable',
    },
    h,
  )

/* CreaseUI "Data Dashboard": every tile carries a sparkline and period-over-period deltas. */
export const dataDashboard = <Message>(
  toMessage: (message: ChartMessage) => Message,
  h: HtmlBuilder<Message>,
): Html => {
  const sparkTile = (
    label: string,
    value: string,
    delta: string,
    comparisons: readonly [string, string, string],
    chart: Html,
  ): Html =>
    box(
      {
        children: [
          stack(
            {
              children: [
                inline(
                  {
                    children: [
                      text(
                        {
                          children: [label],
                          tone: 'secondary',
                          variant: 'caption',
                        },
                        h,
                      ),
                      badge({ children: [delta], variant: 'secondary' }, h),
                    ],
                    justify: 'between',
                    width: 'full',
                  },
                  h,
                ),
                text(
                  {
                    children: [value],
                    numeric: 'tabular',
                    variant: 'headingMd',
                  },
                  h,
                ),
                chart,
                inline(
                  {
                    children: comparisons.map(comparison =>
                      text(
                        {
                          children: [comparison],
                          numeric: 'tabular',
                          tone: 'secondary',
                          variant: 'caption',
                        },
                        h,
                      ),
                    ),
                    justify: 'between',
                    width: 'full',
                  },
                  h,
                ),
              ],
              gap: 'sm',
            },
            h,
          ),
        ],
        padding: 'md',
        radius: 'lg',
        surface: 'card',
      },
      h,
    )

  return dashboardShell(
    {
      content: [
        box(
          {
            children: [
              toolbar(
                {
                  children: [
                    inline(
                      {
                        children: [
                          button(
                            {
                              children: ['Last 30 days'],
                              size: 'sm',
                              variant: 'secondary',
                            },
                            h,
                          ),
                          button(
                            {
                              children: ['All channels'],
                              size: 'sm',
                              variant: 'ghost',
                            },
                            h,
                          ),
                          button(
                            {
                              children: ['All regions'],
                              size: 'sm',
                              variant: 'ghost',
                            },
                            h,
                          ),
                          button(
                            {
                              children: ['Compare: prior period'],
                              size: 'sm',
                              variant: 'outline',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                        wrap: true,
                      },
                      h,
                    ),
                    inline(
                      {
                        children: [
                          button(
                            {
                              leadingIcon: icon({ name: 'arrow-down' }, h),
                              children: ['Export'],
                              size: 'sm',
                              variant: 'outline',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  label: 'Global filters',
                },
                h,
              ),
            ],
            padding: 'sm',
            radius: 'lg',
            surface: 'card',
          },
          h,
        ),
        metricGrid(
          {
            children: [
              sparkTile(
                'Revenue',
                '$182.4K',
                '+12.1%',
                ['vs 7d +4.2%', 'vs 30d +9.8%', 'plan −1.2%'],
                revenueSparkChart(toMessage, h),
              ),
              sparkTile(
                'Active sessions',
                '48.2K',
                '+6.4%',
                ['vs 7d +1.9%', 'vs 30d +6.4%', 'plan +2.0%'],
                sessionSparkChart(toMessage, h),
              ),
              sparkTile(
                'Conversion',
                '3.42%',
                '−0.3%',
                ['vs 7d −0.3%', 'vs 30d +0.4%', 'plan −0.2%'],
                conversionSparkChart(toMessage, h),
              ),
              sparkTile(
                'Activation',
                '41.8%',
                '+3.7%',
                ['vs 7d +0.9%', 'vs 30d +3.7%', 'plan +1.4%'],
                activationSparkChart(toMessage, h),
              ),
            ],
          },
          h,
        ),
        grid(
          {
            children: [
              tableRegion(
                {
                  children: [
                    dataTable(
                      ['Channel', 'This period', 'Prior', 'Delta'],
                      [
                        [
                          'Organic search',
                          '$74.2K',
                          '$66.8K',
                          badge(
                            { children: ['+11.1%'], variant: 'secondary' },
                            h,
                          ),
                        ],
                        [
                          'Direct',
                          '$41.9K',
                          '$40.1K',
                          badge(
                            { children: ['+4.5%'], variant: 'secondary' },
                            h,
                          ),
                        ],
                        [
                          'Referral',
                          '$32.6K',
                          '$35.4K',
                          badge({ children: ['−7.9%'], variant: 'outline' }, h),
                        ],
                        [
                          'Paid social',
                          '$33.7K',
                          '$25.2K',
                          badge(
                            { children: ['+33.7%'], variant: 'secondary' },
                            h,
                          ),
                        ],
                      ],
                      h,
                    ),
                  ],
                  heading: 'Breakdown by channel',
                },
                h,
              ),
              tableRegion(
                {
                  children: [
                    dataTable(
                      ['Region', 'This period', 'Prior', 'Delta'],
                      [
                        [
                          'North America',
                          '$96.4K',
                          '$88.2K',
                          badge(
                            { children: ['+9.3%'], variant: 'secondary' },
                            h,
                          ),
                        ],
                        [
                          'Europe',
                          '$58.1K',
                          '$55.6K',
                          badge(
                            { children: ['+4.5%'], variant: 'secondary' },
                            h,
                          ),
                        ],
                        [
                          'Asia Pacific',
                          '$21.3K',
                          '$19.8K',
                          badge(
                            { children: ['+7.6%'], variant: 'secondary' },
                            h,
                          ),
                        ],
                        [
                          'Other',
                          '$6.6K',
                          '$7.9K',
                          badge(
                            { children: ['−16.5%'], variant: 'outline' },
                            h,
                          ),
                        ],
                      ],
                      h,
                    ),
                  ],
                  heading: 'Breakdown by region',
                },
                h,
              ),
            ],
            columns: 'two',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
      ],
      header: [
        pageHeader(
          'Data dashboard',
          'Comparison reporting · refreshed 8 minutes ago',
          [
            button(
              { children: ['Save view'], size: 'sm', variant: 'outline' },
              h,
            ),
            button({ children: ['Share'], size: 'sm' }, h),
          ],
          h,
        ),
      ],
      navigation: workspaceNavigation('Metrics', h),
      theme: 'comfortable',
    },
    h,
  )
}

/* CreaseUI "Card Grid": browsable tiles with filter tabs and a real empty state. */
type CatalogProduct = Readonly<{
  format: string
  name: string
  price: string
  saved: boolean
}>

const CATALOG_PRODUCTS: ReadonlyArray<CatalogProduct> = [
  { format: 'Template', name: 'Studio Portfolio', price: '$48', saved: true },
  { format: 'Template', name: 'Field Notes Blog', price: '$32', saved: false },
  {
    format: 'Icon set',
    name: 'Waypoint · 420 icons',
    price: '$24',
    saved: true,
  },
  {
    format: 'Icon set',
    name: 'Meridian · 260 icons',
    price: '$18',
    saved: false,
  },
  { format: 'Font', name: 'Copper Sans family', price: '$64', saved: false },
  { format: 'Font', name: 'Ledger Mono', price: '$40', saved: false },
  { format: 'Template', name: 'Atlas Docs theme', price: '$56', saved: false },
  { format: 'Preset', name: 'Ember chart presets', price: '$12', saved: false },
]

const productCard = <Message>(
  product: CatalogProduct,
  h: HtmlBuilder<Message>,
): Html =>
  card(
    {
      children: [
        cardContent(
          {
            children: [
              stack(
                {
                  children: [
                    box(
                      {
                        children: [icon({ name: 'image', size: 'md' }, h)],
                        contentAlignment: 'center',
                        padding: 'xl',
                        radius: 'md',
                        surface: 'muted',
                        width: 'full',
                      },
                      h,
                    ),
                    stack(
                      {
                        children: [
                          text(
                            { children: [product.name], variant: 'label' },
                            h,
                          ),
                          text(
                            {
                              children: [product.format],
                              tone: 'secondary',
                              variant: 'caption',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  gap: 'sm',
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            children: [
              inline(
                {
                  children: [
                    text(
                      {
                        children: [product.price],
                        numeric: 'tabular',
                        variant: 'label',
                      },
                      h,
                    ),
                    button(
                      {
                        children: [
                          icon({ name: 'save' }, h),
                          product.saved ? 'Saved' : 'Save',
                        ],
                        size: 'sm',
                        variant: product.saved ? 'secondary' : 'outline',
                      },
                      h,
                    ),
                  ],
                  justify: 'between',
                  width: 'full',
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

const CATALOG_KINDS: ReadonlyArray<Readonly<{ id: string; label: string }>> = [
  { id: 'all', label: 'All' },
  { id: 'Template', label: 'Templates' },
  { id: 'Icon set', label: 'Icon sets' },
  { id: 'Font', label: 'Fonts' },
  { id: 'Preset', label: 'Presets' },
]

export const cardGrid = <Message>(
  props: Readonly<{
    kind: string
    onClear: Message
    onKind: (value: string) => Message
    onQuery: (value: string) => Message
    query: string
  }>,
  h: HtmlBuilder<Message>,
): Html => {
  const query = props.query.trim().toLowerCase()
  const visible = CATALOG_PRODUCTS.filter(
    product =>
      (props.kind === 'all' || product.format === props.kind) &&
      (query === '' ||
        product.name.toLowerCase().includes(query) ||
        product.format.toLowerCase().includes(query)),
  )
  return commercePage(
    {
      cart: section(
        {
          children: [
            itemGroup(
              {
                children: CATALOG_PRODUCTS.filter(product => product.saved).map(
                  product =>
                    item(
                      {
                        children: [
                          itemMedia(
                            {
                              children: [icon({ name: 'image' }, h)],
                              variant: 'icon',
                            },
                            h,
                          ),
                          itemContent(
                            {
                              children: [
                                itemTitle({ children: [product.name] }, h),
                                itemDescription(
                                  { children: [product.format] },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          text(
                            {
                              children: [product.price],
                              numeric: 'tabular',
                              variant: 'label',
                            },
                            h,
                          ),
                        ],
                        size: 'sm',
                      },
                      h,
                    ),
                ),
                spacing: 'md',
              },
              h,
            ),
            button({ children: ['Move all to cart'], variant: 'secondary' }, h),
          ],
          description: 'Two products saved for later',
          heading: 'Saved for later',
          surface: 'plain',
        },
        h,
      ),
      header: [
        pageHeader(
          'Asset catalog',
          'Curated templates, icon sets and fonts',
          [
            button(
              { children: ['Newest first'], size: 'sm', variant: 'outline' },
              h,
            ),
            button(
              {
                leadingIcon: icon({ name: 'plus' }, h),
                children: ['Upload'],
                size: 'sm',
              },
              h,
            ),
          ],
          h,
        ),
      ],
      products: [
        box(
          {
            children: [
              stack(
                {
                  children: [
                    input(
                      {
                        id: 'catalog-search',
                        label: 'Search assets',
                        onInput: props.onQuery,
                        placeholder: 'Search assets…',
                        type: 'search',
                        value: props.query,
                      },
                      h,
                    ),
                    inline(
                      {
                        children: CATALOG_KINDS.map(kind =>
                          button(
                            {
                              children: [kind.label],
                              onClick: props.onKind(kind.id),
                              size: 'sm',
                              variant:
                                props.kind === kind.id ? 'secondary' : 'ghost',
                            },
                            h,
                          ),
                        ),
                        gap: 'xs',
                        wrap: true,
                      },
                      h,
                    ),
                  ],
                  gap: 'sm',
                },
                h,
              ),
            ],
            padding: 'sm',
            radius: 'lg',
            surface: 'card',
          },
          h,
        ),
        ...(visible.length === 0
          ? [
              empty(
                {
                  children: [
                    emptyMedia(
                      {
                        children: [icon({ name: 'search', size: 'md' }, h)],
                        variant: 'icon',
                      },
                      h,
                    ),
                    emptyHeader(
                      {
                        children: [
                          emptyTitle({ children: ['No assets match'] }, h),
                          emptyDescription(
                            {
                              children: [
                                `Nothing matches "${props.query}". Try a different search or clear the filter.`,
                              ],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    emptyContent(
                      {
                        children: [
                          button(
                            {
                              children: ['Clear search'],
                              onClick: props.onClear,
                              variant: 'outline',
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
          : [
              grid(
                {
                  children: visible.map(product => productCard(product, h)),
                  columns: 'gallery',
                  gap: 'md',
                  width: 'full',
                },
                h,
              ),
            ]),
      ],
      theme: 'expressive',
    },
    h,
  )
}

/* CreaseUI "Checkout Form": a long sectioned form beside a sticky order summary. */
export const checkoutForm = <Message>(
  props: Readonly<{
    delivery: string
    fields: Readonly<Record<string, string>>
    onField: (name: string, value: string) => Message
    radioGroup: RadioGroup.Model
    toRadioGroupMessage: (message: RadioGroup.Message) => Message
  }>,
  h: HtmlBuilder<Message>,
): Html => {
  const field = (name: string, label: string, placeholder: string): Html =>
    input(
      {
        id: `checkout-${name}`,
        label,
        onInput: value => props.onField(name, value),
        placeholder,
        value: props.fields[name] ?? '',
      },
      h,
    )

  const summaryLine = (label: string, value: string): Html =>
    inline(
      {
        children: [
          text({ children: [label], tone: 'secondary', variant: 'caption' }, h),
          text({ children: [value], numeric: 'tabular', variant: 'label' }, h),
        ],
        justify: 'between',
        width: 'full',
      },
      h,
    )

  return masterDetailPage(
    {
      detail: section(
        {
          children: [
            stack(
              {
                children: [
                  itemGroup(
                    {
                      children: [
                        ['Canvas Field Jacket', '1', '$168.00'],
                        ['Merino Crew Sock · 3 pack', '2', '$64.00'],
                        ['Enamel Camp Mug', '1', '$16.00'],
                      ].map(([name, qty, price]) =>
                        item(
                          {
                            children: [
                              itemMedia(
                                {
                                  children: [icon({ name: 'image' }, h)],
                                  variant: 'icon',
                                },
                                h,
                              ),
                              itemContent(
                                {
                                  children: [
                                    itemTitle({ children: [name ?? ''] }, h),
                                    itemDescription(
                                      { children: [`Qty ${qty ?? ''}`] },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                              text(
                                {
                                  children: [price ?? ''],
                                  numeric: 'tabular',
                                  variant: 'label',
                                },
                                h,
                              ),
                            ],
                            size: 'sm',
                          },
                          h,
                        ),
                      ),
                      spacing: 'md',
                    },
                    h,
                  ),
                  separator({}, h),
                  stack(
                    {
                      children: [
                        summaryLine('Subtotal', '$248.00'),
                        summaryLine(
                          'Shipping',
                          props.delivery === 'express'
                            ? '$12.00'
                            : props.delivery === 'pickup'
                              ? '$0.00'
                              : '$8.00',
                        ),
                        summaryLine('Tax', '$12.40'),
                      ],
                      gap: 'sm',
                    },
                    h,
                  ),
                  separator({}, h),
                  inline(
                    {
                      children: [
                        text({ children: ['Total'], variant: 'label' }, h),
                        text(
                          {
                            children: [
                              props.delivery === 'express'
                                ? '$272.40'
                                : props.delivery === 'pickup'
                                  ? '$260.40'
                                  : '$268.40',
                            ],
                            numeric: 'tabular',
                            variant: 'headingSm',
                          },
                          h,
                        ),
                      ],
                      justify: 'between',
                      width: 'full',
                    },
                    h,
                  ),
                  button(
                    {
                      children: [
                        `Pay ${props.delivery === 'express' ? '$272.40' : props.delivery === 'pickup' ? '$260.40' : '$268.40'}`,
                      ],
                    },
                    h,
                  ),
                  text(
                    {
                      align: 'center',
                      children: ['Secure checkout · 30-day returns'],
                      tone: 'secondary',
                      variant: 'caption',
                    },
                    h,
                  ),
                ],
                gap: 'md',
              },
              h,
            ),
          ],
          description: 'Updates as delivery changes',
          heading: 'Order summary',
          surface: 'card',
        },
        h,
      ),
      detailBehavior: 'stack',
      header: [
        pageHeader(
          'Checkout',
          'Order #1043 · 3 items',
          [badge({ children: ['Secure'], variant: 'secondary' }, h)],
          h,
        ),
      ],
      master: [
        section(
          {
            children: [
              grid(
                {
                  children: [
                    field('email', 'Email', 'you@example.com'),
                    field('phoneNumber', 'Phone', '+1 (555) 010-0100'),
                  ],
                  columns: 'two',
                  gap: 'md',
                  width: 'full',
                },
                h,
              ),
            ],
            description: 'Receipt and tracking go here',
            heading: 'Contact',
            surface: 'card',
          },
          h,
        ),
        section(
          {
            children: [
              grid(
                {
                  children: [
                    field('firstName', 'First name', 'Robin'),
                    field('lastName', 'Last name', 'Adler'),
                  ],
                  columns: 'two',
                  gap: 'md',
                  width: 'full',
                },
                h,
              ),
              field('address', 'Address', '44 Beacon St'),
              grid(
                {
                  children: [
                    field('city', 'City', 'Boston'),
                    field('postal', 'Postal code', '02108'),
                  ],
                  columns: 'two',
                  gap: 'md',
                  width: 'full',
                },
                h,
              ),
              nativeSelect(
                {
                  id: 'checkout-country',
                  label: 'Country',
                  onChange: value => props.onField('country', value),
                  options: [
                    { label: 'United States', value: 'us' },
                    { label: 'Canada', value: 'ca' },
                    { label: 'United Kingdom', value: 'uk' },
                    { label: 'Germany', value: 'de' },
                  ],
                  value: props.fields['country'] ?? 'us',
                },
                h,
              ),
            ],
            heading: 'Shipping',
            surface: 'card',
          },
          h,
        ),
        section(
          {
            children: [
              RadioGroup.radioGroup(
                {
                  ariaLabel: 'Delivery method',
                  model: props.radioGroup,
                  options: [
                    {
                      description: 'Free · arrives Sep 28',
                      label: 'Standard',
                      value: 'standard',
                    },
                    {
                      description: '$12.00 · arrives Sep 22',
                      label: 'Express',
                      value: 'express',
                    },
                    {
                      description: 'Free · South End depot',
                      label: 'Store pickup',
                      value: 'pickup',
                    },
                  ],
                  selectedValue: Option.some(props.delivery),
                  toParentMessage: props.toRadioGroupMessage,
                },
                h,
              ),
            ],
            description: 'Affects the order total',
            heading: 'Delivery method',
            surface: 'card',
          },
          h,
        ),
        section(
          {
            children: [
              field('card', 'Card number', '4242 4242 4242 4242'),
              grid(
                {
                  children: [
                    field('expiry', 'Expiry', 'MM / YY'),
                    field('cvc', 'CVC', '123'),
                  ],
                  columns: 'two',
                  gap: 'md',
                  width: 'full',
                },
                h,
              ),
              fieldSeparator({ children: ['Or pay with'] }, h),
              button(
                {
                  leadingIcon: icon({ name: 'wallet' }, h),
                  children: ['Wallet'],
                  variant: 'outline',
                },
                h,
              ),
            ],
            heading: 'Payment',
            surface: 'card',
          },
          h,
        ),
      ],
      theme: 'comfortable',
    },
    h,
  )
}
