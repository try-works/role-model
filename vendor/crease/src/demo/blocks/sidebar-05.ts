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
import * as Collapsible from '@/ui/collapsible'
import { separator } from '@/ui/separator'
import {
  sidebar,
  sidebarContent,
  sidebarGroup,
  sidebarGroupContent,
  sidebarHeader,
  sidebarInput,
  sidebarInset,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuButtonVariants,
  sidebarMenuItem,
  sidebarMenuSub,
  sidebarMenuSubButton,
  sidebarMenuSubItem,
  sidebarProvider,
  sidebarRail,
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
export const data = {
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
  navMainOpen: S.Array(S.Boolean),
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
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  isMobileOpen: false,
  isSidebarOpen: true,
  navMainOpen: data.navMain.map((_, index) => index === 1),
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
            navMainOpen: groups =>
              groups.map((open, groupIndex) =>
                groupIndex === index ? isOpen : open,
              ),
          }),
        }
      },
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

const searchForm = (h: HtmlBuilder<Message>): Html => {
  return h.form(
    [],
    [
      sidebarGroup(
        {
          class: 'py-0',
          children: [
            sidebarGroupContent(
              {
                class: 'relative',
                children: [
                  h.label(
                    [h.For('sidebar-05-search'), h.Class('sr-only')],
                    ['Search'],
                  ),
                  sidebarInput(
                    {
                      id: 'sidebar-05-search',
                      placeholder: 'Search the docs...',
                      class: 'pl-8',
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
              },
              h,
            ),
          ],
        },
        h,
      ),
    ],
  )
}

const navMain = (
  openStates: ReadonlyArray<boolean>,
  h: HtmlBuilder<Message>,
): Html =>
  sidebarGroup<Message>(
    {
      children: [
        sidebarMenu(
          {
            children: data.navMain.flatMap((group, index) => {
              const isOpen = openStates[index]

              if (isOpen === undefined) {
                return []
              }
              const trigger = h.span(
                [h.Class('contents')],
                [
                  group.title,
                  isOpen
                    ? Icon.minus({ class: 'ml-auto size-4' }, h)
                    : Icon.plus({ class: 'ml-auto size-4' }, h),
                ],
              )
              const content = sidebarMenuSub<Message>(
                {
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
              )

              return [
                sidebarMenuItem(
                  {
                    children: [
                      Collapsible.collapsible(
                        {
                          id: `sidebar-05-nav-main-${index}`,
                          isOpen,
                          onToggle: nextIsOpen =>
                            Message.ToggledNavMain({
                              index,
                              isOpen: nextIsOpen,
                            }),
                          class: 'group/collapsible',
                          trigger,
                          triggerClass: sidebarMenuButtonVariants(),
                          content,
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

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      children: [
        sidebarHeader({ children: [brand(h), searchForm(h)] }, h),
        sidebarContent({ children: [navMain(model.navMainOpen, h)] }, h),
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
          [h.Class('flex flex-1 flex-col gap-4 p-4')],
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
