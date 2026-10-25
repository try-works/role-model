import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbList,
  breadcrumbPage,
  breadcrumbSeparator,
} from '@/ui/breadcrumb'
import {
  sidebar,
  sidebarContent,
  sidebarGroup,
  sidebarGroupContent,
  sidebarGroupLabel,
  sidebarInset,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuItem,
  sidebarMenuSub,
  sidebarMenuSubButton,
  sidebarMenuSubItem,
  sidebarProvider,
  sidebarRail,
  sidebarTrigger,
} from '@/ui/sidebar'

const data = {
  navMain: [
    {
      title: 'Getting Started',
      url: '#',
      items: [
        { title: 'Installation', url: '#' },
        { title: 'Project Structure', url: '#' },
      ],
    },
    {
      title: 'Build Your Application',
      url: '#',
      items: [
        { title: 'Routing', url: '#' },
        { title: 'Data Fetching', url: '#', isActive: true },
        { title: 'Rendering', url: '#' },
        { title: 'Caching', url: '#' },
        { title: 'Styling', url: '#' },
        { title: 'Optimizing', url: '#' },
        { title: 'Configuring', url: '#' },
        { title: 'Testing', url: '#' },
        { title: 'Authentication', url: '#' },
        { title: 'Deploying', url: '#' },
        { title: 'Upgrading', url: '#' },
        { title: 'Examples', url: '#' },
      ],
    },
    {
      title: 'API Reference',
      url: '#',
      items: [
        { title: 'Components', url: '#' },
        { title: 'File Conventions', url: '#' },
        { title: 'Functions', url: '#' },
        { title: 'next.config.js Options', url: '#' },
        { title: 'CLI', url: '#' },
        { title: 'Edge Runtime', url: '#' },
      ],
    },
    {
      title: 'Architecture',
      url: '#',
      items: [
        { title: 'Accessibility', url: '#' },
        { title: 'Fast Refresh', url: '#' },
        { title: 'Next.js Compiler', url: '#' },
        { title: 'Supported Browsers', url: '#' },
        { title: 'Turbopack', url: '#' },
      ],
    },
    {
      title: 'Community',
      url: '#',
      items: [{ title: 'Contribution Guide', url: '#' }],
    },
  ],
}

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
})
export type Message = typeof Message.Type

export const init = (): Model => ({ isMobileOpen: false, isSidebarOpen: true })

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
    }),
  )

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'
  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      side: 'right',
      children: [
        sidebarContent(
          {
            children: [
              sidebarGroup(
                {
                  children: [
                    sidebarGroupLabel({ children: ['Table of Contents'] }, h),
                    sidebarGroupContent(
                      {
                        children: [
                          sidebarMenu(
                            {
                              children: data.navMain.map(item =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          href: item.url,
                                          class: 'font-medium',
                                          children: [item.title],
                                        },
                                        h,
                                      ),
                                      sidebarMenuSub(
                                        {
                                          children: item.items.map(subItem =>
                                            sidebarMenuSubItem(
                                              {
                                                children: [
                                                  sidebarMenuSubButton(
                                                    {
                                                      href: subItem.url,
                                                      isActive:
                                                        'isActive' in subItem &&
                                                        subItem.isActive ===
                                                          true,
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
          [h.Class('flex h-16 shrink-0 items-center gap-2 border-b px-4')],
          [
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
                        breadcrumbSeparator({ class: 'hidden md:block' }, h),
                        breadcrumbItem(
                          {
                            children: [
                              breadcrumbPage(
                                { children: ['Data Fetching'] },
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
            sidebarTrigger(
              {
                onMobileClick: Message.ToggledMobileSidebar(),
                onClick: Message.ToggledSidebar(),
                class: '-mr-1 ml-auto rotate-180',
              },
              h,
            ),
          ],
        ),
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
  return sidebarProvider<Message>(
    {
      state,
      children: [pageContent(h), appSidebar(model, h)],
    },
    h,
  )
}
