import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/lib/icon'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbList,
  breadcrumbPage,
  breadcrumbSeparator,
} from '@/ui/breadcrumb'
import { separator } from '@/ui/separator'
import {
  sidebar,
  sidebarContent,
  sidebarGroup,
  sidebarHeader,
  sidebarInset,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuItem,
  sidebarMenuSub,
  sidebarMenuSubButton,
  sidebarMenuSubItem,
  sidebarProvider,
  sidebarTrigger,
} from '@/ui/sidebar'

type NavGroup = Readonly<{
  title: string
  url: string
  items: ReadonlyArray<
    Readonly<{
      title: string
      url: string
      isActive?: boolean
    }>
  >
}>

// This is sample data copied from the source block.
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
  ] satisfies ReadonlyArray<NavGroup>,
}

// MODEL

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({ isMobileOpen: false, isSidebarOpen: true })

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
    }),
  )

// VIEW

const brand = (h: HtmlBuilder<Message>): Html => {
  return sidebarMenu(
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
                          'gallery-vertical-end',
                          { class: 'size-4' },
                          h,
                        ),
                      ],
                    ),
                    h.div(
                      [h.Class('flex flex-col gap-0.5 leading-none')],
                      [
                        h.span([h.Class('font-medium')], ['Documentation']),
                        h.span([], ['v1.0.0']),
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
}

const navMain = (h: HtmlBuilder<Message>): Html =>
  sidebarGroup<Message>(
    {
      children: [
        sidebarMenu(
          {
            class: 'gap-2',
            children: data.navMain.map(group =>
              sidebarMenuItem(
                {
                  children: [
                    sidebarMenuButton(
                      {
                        href: group.url,
                        class: 'font-medium',
                        children: [group.title],
                      },
                      h,
                    ),
                    sidebarMenuSub(
                      {
                        class: 'ml-0 border-l-0 px-1.5',
                        children: group.items.map(item =>
                          sidebarMenuSubItem(
                            {
                              children: [
                                sidebarMenuSubButton(
                                  {
                                    href: item.url,
                                    isActive: item.isActive ?? false,
                                    children: [item.title],
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
  )

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      variant: 'floating',
      children: [
        sidebarHeader({ children: [brand(h)] }, h),
        sidebarContent({ children: [navMain(h)] }, h),
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
          [h.Class('flex h-16 shrink-0 items-center gap-2 px-4')],
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
      class: '[--sidebar-width:19rem]!',
      children: [appSidebar(model, h), pageContent(h)],
    },
    h,
  )
}

// PORT NOTE: sidebarProvider has no style prop, so the source's 19rem custom
// property is applied as an important arbitrary-property class.
