import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { card } from '@/stylex/card'
import {
  sidebar,
  sidebarContent,
  sidebarGroup,
  sidebarGroupContent,
  sidebarGroupLabel,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuItem,
  sidebarProvider,
  sidebarSeparator,
} from '@/stylex/sidebar'
import { className } from '@/stylex/style'

const styles = stylex.create({
  content: { gap: 0, display: 'flex', flexDirection: 'column' },
  grid: {
    gap: '1.5rem',
    alignItems: 'flex-start',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  provider: { minHeight: 0 },
  separator: { width: 'auto' },
  sidebar: { width: '100%' },
})

type NavItem = Readonly<{
  label: string
  icon: string
  isActive?: boolean
}>

type NavGroup = Readonly<{
  label: string
  items: ReadonlyArray<NavItem>
}>

const OVERVIEW: ReadonlyArray<NavGroup> = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'layout-dashboard', isActive: true },
      { label: 'Transactions', icon: 'arrow-left-right' },
      { label: 'Investments', icon: 'trending-up' },
      { label: 'Accounts', icon: 'building-2' },
      { label: 'Spending', icon: 'pie-chart' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { label: 'Goals', icon: 'target' },
      { label: 'Budget', icon: 'wallet' },
      { label: 'Reports', icon: 'file-bar-chart' },
      { label: 'Documents', icon: 'file-text' },
    ],
  },
]

const ACCOUNT: ReadonlyArray<NavGroup> = [
  {
    label: 'Account',
    items: [
      { label: 'Profile', icon: 'user' },
      { label: 'Billing', icon: 'credit-card', isActive: true },
      { label: 'Notifications', icon: 'bell' },
      { label: 'Security', icon: 'shield' },
      { label: 'Appearance', icon: 'paintbrush' },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Help Center', icon: 'circle-help' },
      { label: 'Contact Us', icon: 'message-square' },
      { label: 'Documentation', icon: 'book-open' },
      { label: 'Status', icon: 'activity' },
    ],
  },
]

const navGroup = <Msg>(
  group: NavGroup,
  index: number,
  h: HtmlBuilder<Msg>,
): Html =>
  sidebarGroup(
    {
      spacing: index === 0 ? 'first' : 'later',
      children: [
        sidebarGroupLabel({ children: [group.label] }, h),
        sidebarGroupContent(
          {
            children: [
              sidebarMenu(
                {
                  children: group.items.map(item =>
                    sidebarMenuItem(
                      {
                        children: [
                          sidebarMenuButton(
                            {
                              isActive: item.isActive ?? false,
                              children: [
                                Icon.icon(item.icon, {}, h),
                                item.label,
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

const navCard = <Msg>(
  groups: ReadonlyArray<NavGroup>,
  h: HtmlBuilder<Msg>,
): Html =>
  card(
    {
      density: 'flush',
      children: [
        sidebarProvider(
          {
            layoutStyle: styles.provider,
            children: [
              sidebar(
                {
                  collapsible: 'none',
                  surface: 'transparent',
                  layoutStyle: styles.sidebar,
                  children: [
                    h.div(
                      [h.Class(className(styles.content))],
                      [
                        sidebarContent(
                          {
                            children: groups.flatMap((group, index) => [
                              ...(index === 0
                                ? []
                                : [
                                    h.div(
                                      [h.Class(className(styles.separator))],
                                      [sidebarSeparator({}, h)],
                                    ),
                                  ]),
                              navGroup(group, index, h),
                            ]),
                          },
                          h,
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
  )

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return h.div(
    [h.Class(className(styles.grid))],
    [navCard(OVERVIEW, h), navCard(ACCOUNT, h)],
  )
}

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
