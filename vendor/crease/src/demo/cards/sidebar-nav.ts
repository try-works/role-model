import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { card } from '@/ui/card'
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
} from '@/ui/sidebar'

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
      class: index === 0 ? 'pb-1' : 'pt-1',
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
      class: 'overflow-hidden py-0',
      children: [
        sidebarProvider(
          {
            class: 'min-h-0',
            children: [
              sidebar(
                {
                  collapsible: 'none',
                  class: 'w-full bg-transparent',
                  children: [
                    sidebarContent(
                      {
                        class: 'gap-0',
                        children: groups.flatMap((group, index) => [
                          ...(index === 0
                            ? []
                            : [sidebarSeparator({ class: 'w-auto!' }, h)]),
                          navGroup(group, index, h),
                        ]),
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

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return h.div(
    [h.Class('grid grid-cols-2 items-start gap-6')],
    [navCard(OVERVIEW, h), navCard(ACCOUNT, h)],
  )
}

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
