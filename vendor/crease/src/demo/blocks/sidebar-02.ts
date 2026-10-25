import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
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
import * as DropdownMenu from '@/ui/dropdown-menu'
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
  sidebarProvider,
  sidebarRail,
  sidebarTrigger,
} from '@/ui/sidebar'

type Version = '1.0.1' | '1.1.0-alpha' | '2.0.0-beta1'

type NavItem = Readonly<{
  title: string
  url: string
  isActive?: boolean
}>

type NavGroup = Readonly<{
  title: string
  url: string
  items: ReadonlyArray<NavItem>
}>

// This is sample data copied from the source block.
const data = {
  versions: [
    '1.0.1',
    '1.1.0-alpha',
    '2.0.0-beta1',
  ] satisfies ReadonlyArray<Version>,
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

const VersionMenu = DropdownMenu.create<Version>()

// MODEL

export const Model = S.Struct({
  isMobileOpen: S.Boolean,
  isSidebarOpen: S.Boolean,
  selectedVersion: S.String,
  versionMenu: DropdownMenu.Model,
  navMainOpen: S.Array(S.Boolean),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ToggledMobileSidebar: {},
  ToggledSidebar: {},
  GotVersionMenuMessage: {
    message: DropdownMenu.Message,
  },
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
  selectedVersion: data.versions[0] ?? '1.0.1',
  versionMenu: DropdownMenu.init({
    id: 'sidebar-02-version-switcher',
    isAnimated: true,
  }),
  navMainOpen: data.navMain.map(() => true),
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
      GotVersionMenuMessage: ({ message: childMessage }) => {
        const versionMenuOp__ = VersionMenu.update(
          model.versionMenu,
          childMessage,
        )
        const versionMenu = versionMenuOp__.model
        const commands = versionMenuOp__.commands ?? []
        const maybeSelection = Option.fromNullishOr(versionMenuOp__.outMessage)

        return {
          model: modifyFields(model, {
            versionMenu: () => versionMenu,
            selectedVersion: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: ({ value }) => value,
              }),
          }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotVersionMenuMessage({ message: nextMessage }),
          ),
        }
      },
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

const versionSwitcher = (model: Model, h: HtmlBuilder<Message>): Html => {
  const trigger = h.span(
    [h.Class('contents')],
    [
      h.div(
        [
          h.Class(
            'flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground',
          ),
        ],
        [Icon.icon('gallery-vertical-end', { class: 'size-4' }, h)],
      ),
      h.div(
        [h.Class('flex flex-col gap-0.5 leading-none')],
        [
          h.span([h.Class('font-medium')], ['Documentation']),
          h.span([], [`v${model.selectedVersion}`]),
        ],
      ),
      Icon.chevronsUpDown({ class: 'ml-auto size-4' }, h),
    ],
  )

  return sidebarMenu(
    {
      children: [
        sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<Version, Message>(
                {
                  model: model.versionMenu,
                  toParentMessage: message =>
                    Message.GotVersionMenuMessage({ message }),
                  trigger,
                  triggerClass: sidebarMenuButtonVariants({
                    size: 'lg',
                    class:
                      'data-[open]:bg-sidebar-accent data-[open]:text-sidebar-accent-foreground',
                  }),
                  items: data.versions,
                  itemToConfig: version => ({
                    label: h.span(
                      [h.Class('contents')],
                      [
                        `v${version}`,
                        ...(version === model.selectedVersion
                          ? [Icon.check({ class: 'ml-auto size-4' }, h)]
                          : []),
                      ],
                    ),
                  }),
                  align: 'start',
                  ariaLabel: 'Select documentation version',
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
                    [h.For('sidebar-02-search'), h.Class('sr-only')],
                    ['Search'],
                  ),
                  sidebarInput(
                    {
                      id: 'sidebar-02-search',
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

const GROUP_LABEL_CLASS =
  'flex h-8 shrink-0 items-center rounded-md px-2 font-medium ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

const navMain = (
  openStates: ReadonlyArray<boolean>,
  h: HtmlBuilder<Message>,
): Html =>
  sidebarContent<Message>(
    {
      class: 'gap-0',
      children: data.navMain.flatMap((group, index) => {
        const isOpen = openStates[index]

        if (isOpen === undefined) {
          return []
        }
        const trigger = h.span(
          [h.Class('contents')],
          [
            group.title,
            Icon.chevronRight(
              {
                class: `ml-auto size-4 transition-transform${
                  isOpen ? ' rotate-90' : ''
                }`,
              },
              h,
            ),
          ],
        )
        const content = sidebarGroupContent<Message>(
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
        )

        return [
          sidebarGroup(
            {
              children: [
                Collapsible.collapsible(
                  {
                    id: `sidebar-02-nav-main-${index}`,
                    isOpen,
                    onToggle: nextIsOpen =>
                      Message.ToggledNavMain({ index, isOpen: nextIsOpen }),
                    class: 'group/collapsible',
                    trigger,
                    triggerClass: GROUP_LABEL_CLASS,
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
  )

const appSidebar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const state = model.isSidebarOpen ? 'expanded' : 'collapsed'

  return sidebar<Message>(
    {
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message.ToggledMobileSidebar(),
      state,
      children: [
        sidebarHeader(
          {
            children: [versionSwitcher(model, h), searchForm(h)],
          },
          h,
        ),
        navMain(model.navMainOpen, h),
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
          [
            h.Class(
              'sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4',
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
            separator({ orientation: 'vertical', class: 'mr-2 h-4' }, h),
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

// PORT NOTE: foldkit Menu owns panel width through anchor positioning, so the
// source's Radix-only trigger-width CSS variable is not available.
