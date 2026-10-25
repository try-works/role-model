import { Effect, Option, Schema as S } from 'effect'
import { Command, Subscription, type Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'
import * as Mount from 'foldkit/mount'
import { HoverIntent } from '@foldkit/ui'
import { ObserveDocumentationHover } from './hover'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  sidebarFixtures,
  type SidebarFixtureKind,
} from '@/docs/components/pages/sidebar/shared'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Sidebar from '@/ui/sidebar'

const Message = defineMessageUnion({
  GotSidebarPreviewMessage: { message: Sidebar.Message },
  ChangedSidebarPreviewQuery: { value: S.String },
  GotSidebarPreviewActionMenuMessage: { message: DropdownMenu.Message },
  GotSidebarPreviewAccountMenuMessage: { message: DropdownMenu.Message },
  GotSidebarPreviewLearnMenuMessage: { message: DropdownMenu.Message },
  GotSidebarPreviewLearnHoverMessage: { message: HoverIntent.Message },
  CompletedSidebarPreviewLearnFocus: {},
  EnteredSidebarPreviewLearn: {},
  LeftSidebarPreviewLearn: {},
  SuppressedSidebarPreviewLearnHover: {},
  CreatedSidebarPreviewProject: {},
  ToggledSidebarPreviewLearn: {},
})
type Message = typeof Message.Type
const Model = S.Struct({
  _docsPage: S.Literal('sidebar'),
  sidebar: Sidebar.Model,
  actionMenu: DropdownMenu.Model,
  accountMenu: DropdownMenu.Model,
  learnMenu: DropdownMenu.Model,
  feedback: S.String,
  query: S.String,
  learnOpen: S.Boolean,
  learnHover: HoverIntent.Model,
})
type Model = typeof Model.Type

const ActionMenu = DropdownMenu.create<string>()
const actionItems = ['open', 'rename', 'delete'] as const
const accountItems = ['profile', 'settings', 'sign out'] as const
const documentationItems = ['Introduction', 'Components', 'Changelog'] as const
const FocusDocumentation = Command.define('FocusSidebarDocumentation', {
  args: { id: S.String, isOpen: S.Boolean },
  messages: [Message.CompletedSidebarPreviewLearnFocus],
  execute: ({ id, isOpen }) =>
    Effect.gen(function* () {
      yield* Render.afterPaint
      yield* Dom.focus(
        `[data-sidebar-documentation="${id}"] ${isOpen ? '[role="menu"]' : '[data-slot="dropdown-menu-trigger"]'}`,
        { preventScroll: true },
      ).pipe(Effect.catch(() => Effect.void))
      return Message.CompletedSidebarPreviewLearnFocus()
    }),
})
const updateLearnHover = (
  model: Model,
  message: HoverIntent.Message,
): Update.Return<Model, Message> => {
  const result = HoverIntent.update(model.learnHover, message)
  const opened = result.outMessage?._tag === 'Opened'
  const closed = result.outMessage?._tag === 'Closed'
  return {
    model: {
      ...model,
      learnHover: result.model,
      learnMenu: opened
        ? ActionMenu.open(model.learnMenu).model
        : closed
          ? ActionMenu.close(model.learnMenu).model
          : model.learnMenu,
    },
    commands: [
      ...Command.mapMessages(result.commands ?? [], next =>
        Message.GotSidebarPreviewLearnHoverMessage({ message: next }),
      ),
      ...(opened && !model.learnMenu.isOpen
        ? [FocusDocumentation({ id: model.learnMenu.id, isOpen: true })]
        : []),
    ],
  }
}
const actionLabel = (action: string): string =>
  action[0]?.toUpperCase() + action.slice(1)

const subscriptions =
  typeof document === 'undefined'
    ? undefined
    : Subscription.make<Model, Message>()(() => ({
        sidebarShortcut: Subscription.persistent(
          Sidebar.shortcut(message =>
            Message['GotSidebarPreviewMessage']({ message }),
          ),
        ),
      }))

const iconLabel = (
  name: string,
  label: string,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> => [Icon.icon(name, {}, h), h.span([], [label])]

const actionMenu = (
  model: DropdownMenu.Model,
  label: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.DataAttribute('sidebar', 'menu-action'),
      h.Class(
        'absolute right-1 top-1.5 z-30 md:group-data-[collapsible=icon]:hidden',
      ),
    ],
    [
      DropdownMenu.dropdownMenu(
        {
          model,
          toParentMessage: message =>
            Message['GotSidebarPreviewActionMenuMessage']({ message }),
          trigger: h.span(
            [h.Class('flex items-center')],
            [Icon.moreHorizontal({}, h), h.span([h.Class('sr-only')], [label])],
          ),
          triggerClass:
            'flex size-5 items-center justify-center rounded-md text-sidebar-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-4',
          ariaLabel: label,
          align: 'end',
          items: actionItems,
          itemToConfig: action => ({
            label: actionLabel(action),
            ...(action === 'delete' ? { variant: 'destructive' as const } : {}),
          }),
        },
        h,
      ),
    ],
  )

const primaryNavigation = (model: Model, h: HtmlBuilder<Message>): Html => {
  const query = model.query.trim().toLowerCase()
  const allEntries: ReadonlyArray<readonly [string, string]> = [
    ['Dashboard', 'gauge'],
    ['Inbox', 'inbox'],
    ['Projects', 'book-open'],
    ['Calendar', 'calendar-days'],
  ]
  const entries = allEntries.filter(
    ([label]) => query === '' || label.toLowerCase().includes(query),
  )
  return Sidebar.sidebarMenu(
    {
      children:
        entries.length === 0
          ? [
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    h.span(
                      [h.Class('px-2 py-1.5 text-sm text-muted-foreground')],
                      ['No matching navigation'],
                    ),
                  ],
                },
                h,
              ),
            ]
          : entries.map(([label, iconName], index) =>
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        href: '#',
                        isActive: index === 0,
                        tooltip: label ?? '',
                        children: iconLabel(
                          iconName ?? 'circle',
                          label ?? '',
                          h,
                        ),
                      },
                      h,
                    ),
                    ...(index === 1 && query === ''
                      ? [Sidebar.sidebarMenuBadge({ children: ['12'] }, h)]
                      : []),
                    ...(index === 2 && query === ''
                      ? [actionMenu(model.actionMenu, 'Project actions', h)]
                      : []),
                  ],
                },
                h,
              ),
            ),
    },
    h,
  )
}

const account = (model: Model, h: HtmlBuilder<Message>): Html =>
  Sidebar.sidebarMenu(
    {
      children: [
        Sidebar.sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu(
                {
                  model: model.accountMenu,
                  triggerAriaLabel: 'Account menu',
                  toParentMessage: message =>
                    Message['GotSidebarPreviewAccountMenuMessage']({ message }),
                  trigger: h.span(
                    [h.Class('flex w-full items-center gap-2 text-left')],
                    [
                      h.span(
                        [
                          h.Class(
                            'grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground',
                          ),
                        ],
                        ['AL'],
                      ),
                      h.span(
                        [
                          h.Class(
                            'grid min-w-0 flex-1 text-left leading-tight md:group-data-[collapsible=icon]:hidden',
                          ),
                        ],
                        [
                          h.span(
                            [h.Class('truncate text-sm font-medium')],
                            ['Ada Lovelace'],
                          ),
                        ],
                      ),
                      Icon.chevronsUpDown(
                        { class: 'md:group-data-[collapsible=icon]:hidden' },
                        h,
                      ),
                    ],
                  ),
                  triggerClass:
                    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:group-data-[collapsible=icon]:size-8 md:group-data-[collapsible=icon]:p-0 [&>svg]:size-4 [&>svg]:shrink-0',
                  ariaLabel: 'Account menu',
                  side: 'top',
                  align: 'start',
                  items: accountItems,
                  itemToConfig: action => ({ label: actionLabel(action) }),
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

const nestedNavigation = (
  model: Model,
  h: HtmlBuilder<Message>,
  dropdownSide: DropdownMenu.DropdownMenuSide = 'right',
): Html => {
  if (!model.sidebar.isOpen && !model.sidebar.isMobileOpen) {
    const menuMessage = (message: DropdownMenu.Message) =>
      Message.GotSidebarPreviewLearnMenuMessage({ message })
    return Sidebar.sidebarMenu(
      {
        children: [
          Sidebar.sidebarMenuItem(
            {
              children: [
                h.div(
                  [
                    h.DataAttribute(
                      'sidebar-documentation',
                      model.learnMenu.id,
                    ),
                    h.OnMount(
                      Mount.mapMessage(
                        ObserveDocumentationHover({}),
                        message =>
                          message._tag === 'Entered'
                            ? Message.EnteredSidebarPreviewLearn()
                            : Message.LeftSidebarPreviewLearn(),
                      ),
                    ),
                    h.OnKeyDownPreventDefault(key =>
                      model.learnMenu.isOpen &&
                      (key === 'Escape' || key === 'Enter' || key === ' ')
                        ? Option.some(
                            Message.SuppressedSidebarPreviewLearnHover(),
                          )
                        : Option.none(),
                    ),
                  ],
                  [
                    DropdownMenu.dropdownMenu(
                      {
                        model: model.learnMenu,
                        toParentMessage: menuMessage,
                        trigger: Icon.icon('book-open', { class: 'size-4' }, h),
                        triggerClass: Sidebar.sidebarMenuButtonVariants(),
                        triggerAriaLabel: 'Documentation',
                        ariaLabel: 'Documentation sections',
                        side: dropdownSide,
                        align: 'start',
                        items: documentationItems,
                        itemToConfig: label => ({ label }),
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
    )
  }
  return Sidebar.sidebarMenu(
    {
      children: [
        Sidebar.sidebarMenuItem(
          {
            children: [
              Sidebar.sidebarMenuButton(
                {
                  onClick: Message['ToggledSidebarPreviewLearn'](),
                  ariaExpanded: model.learnOpen,
                  children: [
                    ...iconLabel('book-open', 'Documentation', h),
                    Icon.chevronRight(
                      {
                        class: model.learnOpen
                          ? 'ml-auto size-4 rotate-90 transition-transform'
                          : 'ml-auto size-4 transition-transform',
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              ...(model.learnOpen
                ? [
                    Sidebar.sidebarMenuSub(
                      {
                        children: [
                          'Introduction',
                          'Components',
                          'Changelog',
                        ].map((label, index) =>
                          Sidebar.sidebarMenuSubItem(
                            {
                              children: [
                                Sidebar.sidebarMenuSubButton(
                                  {
                                    href: '#',
                                    isActive: index === 1,
                                    children: [label],
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
                  ]
                : []),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const sidebarBody = (
  model: Model,
  h: HtmlBuilder<Message>,
  detailed = true,
  side: Sidebar.SidebarSide = 'left',
): ReadonlyArray<Html | string> => [
  Sidebar.sidebarHeader(
    {
      children: [
        h.div(
          [
            h.DataAttribute('sidebar', 'brand'),
            h.Class(
              'flex items-center gap-2 px-2 py-1 md:group-data-[collapsible=icon]:px-0.5',
            ),
          ],
          [
            h.span(
              [
                h.Class(
                  'grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground',
                ),
              ],
              ['C'],
            ),
            h.span(
              [
                h.Class(
                  'truncate text-sm font-semibold md:group-data-[collapsible=icon]:hidden',
                ),
              ],
              ['Crease Workspace'],
            ),
          ],
        ),
        ...(detailed
          ? [
              Sidebar.sidebarInput(
                {
                  value: model.query,
                  onInput: value =>
                    Message['ChangedSidebarPreviewQuery']({ value }),
                  placeholder: 'Search navigation',
                  ariaLabel: 'Search navigation',
                },
                h,
              ),
            ]
          : []),
      ],
    },
    h,
  ),
  Sidebar.sidebarContent(
    {
      children: [
        Sidebar.sidebarGroup(
          {
            children: [
              Sidebar.sidebarGroupLabel({ children: ['Platform'] }, h),
              Sidebar.sidebarGroupContent(
                { children: [primaryNavigation(model, h)] },
                h,
              ),
            ],
          },
          h,
        ),
        ...(detailed
          ? [
              Sidebar.sidebarGroup(
                {
                  children: [
                    Sidebar.sidebarGroupLabel({ children: ['Learn'] }, h),
                    Sidebar.sidebarGroupContent(
                      {
                        children: [
                          nestedNavigation(
                            model,
                            h,
                            side === 'right' ? 'left' : 'right',
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
      ],
    },
    h,
  ),
  Sidebar.sidebarFooter({ children: [account(model, h)] }, h),
]

const pageContent = (
  title: string,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> => [
  h.header(
    [h.Class('flex h-12 shrink-0 items-center gap-2 border-b px-4')],
    [h.strong([h.Class('text-sm')], [title])],
  ),
  h.main(
    [h.Class('grid gap-4 p-4 sm:grid-cols-2')],
    [
      h.div([h.Class('h-24 rounded-lg bg-muted')], []),
      h.div([h.Class('h-24 rounded-lg bg-muted')], []),
      h.div([h.Class('h-32 rounded-lg bg-muted sm:col-span-2')], []),
    ],
  ),
]

const shell = (
  kind: SidebarFixtureKind,
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const state: Sidebar.SidebarState = model.sidebar.isOpen
    ? 'expanded'
    : 'collapsed'
  const variant: Sidebar.SidebarVariant =
    kind === 'floating' || kind === 'inset' ? kind : 'sidebar'
  const collapsible: Sidebar.SidebarCollapsible =
    kind === 'offcanvas' ? 'offcanvas' : 'icon'
  const side: Sidebar.SidebarSide = kind === 'right' ? 'right' : 'left'
  const desktopToggle = Message['GotSidebarPreviewMessage']({
    message: Sidebar.Message.Toggled(),
  })
  const mobileToggle = Message['GotSidebarPreviewMessage']({
    message: Sidebar.Message.ToggledMobile(),
  })
  const panel = Sidebar.sidebar(
    {
      state,
      side,
      variant,
      collapsible,
      presentation: 'contained',
      isMobileOpen: model.sidebar.isMobileOpen,
      onMobileDismiss: Message['GotSidebarPreviewMessage']({
        message: Sidebar.Message.SetMobileOpen({ isOpen: false }),
      }),
      children: [
        ...sidebarBody(model, h, true, side),
        Sidebar.sidebarRail({ onClick: desktopToggle }, h),
      ],
    },
    h,
  )
  const inset = Sidebar.sidebarInset(
    {
      variant,
      state,
      class: 'min-h-0 overflow-auto',
      children: [
        h.header(
          [h.Class('flex h-12 shrink-0 items-center gap-2 border-b px-4')],
          [
            Sidebar.sidebarTrigger(
              { onClick: desktopToggle, onMobileClick: mobileToggle },
              h,
            ),
            h.strong(
              [h.Class('text-sm')],
              [
                kind === 'shell'
                  ? 'Product overview'
                  : (sidebarFixtures.find(fixture => fixture.kind === kind)
                      ?.title ?? 'Workspace'),
              ],
            ),
          ],
        ),
        ...pageContent('Recent activity', h).slice(1),
      ],
    },
    h,
  )

  return Sidebar.sidebarProvider(
    {
      state,
      ...(kind === 'right'
        ? { width: '18rem', mobileWidth: '20rem', iconWidth: '3.25rem' }
        : {}),
      class:
        'relative h-[26rem] min-h-0 overflow-hidden rounded-lg border bg-background',
      children: side === 'right' ? [inset, panel] : [panel, inset],
    },
    h,
  )
}

const staticPanel = (
  kind: 'menu' | 'nested' | 'loading',
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const content =
    kind === 'menu'
      ? Sidebar.sidebarMenu(
          {
            children: [
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        isActive: true,
                        children: iconLabel('gauge', 'Overview', h),
                      },
                      h,
                    ),
                    Sidebar.sidebarMenuBadge({ children: ['12'] }, h),
                  ],
                },
                h,
              ),
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        variant: 'outline',
                        children: iconLabel('inbox', 'Inbox', h),
                      },
                      h,
                    ),
                    actionMenu(model.actionMenu, 'Inbox actions', h),
                  ],
                },
                h,
              ),
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        onClick: Message['CreatedSidebarPreviewProject'](),
                        variant: 'primary',
                        children: iconLabel('plus', 'Create project', h),
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
      : kind === 'nested'
        ? nestedNavigation(model, h)
        : Sidebar.sidebarMenu(
            {
              children: [82, 68, 76, 58].map(widthPercent =>
                Sidebar.sidebarMenuItem(
                  {
                    children: [
                      Sidebar.sidebarMenuSkeleton(
                        { showIcon: true, widthPercent },
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

  return h.div(
    [h.Class('flex h-80 w-full items-stretch justify-center bg-muted/30 p-4')],
    [
      Sidebar.sidebarProvider(
        {
          width: '18rem',
          class:
            'h-full min-h-0 w-full max-w-[18rem] overflow-hidden rounded-lg border bg-background',
          children: [
            Sidebar.sidebar(
              {
                collapsible: 'none',
                children: [
                  Sidebar.sidebarHeader(
                    {
                      children: [
                        h.div(
                          [h.Class('px-2 py-1 text-sm font-semibold')],
                          [
                            kind === 'loading'
                              ? 'Loading projects'
                              : 'Crease Workspace',
                          ],
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
                            children: [
                              Sidebar.sidebarGroupLabel(
                                {
                                  children: [
                                    kind === 'nested'
                                      ? 'Resources'
                                      : 'Workspace',
                                  ],
                                },
                                h,
                              ),
                              Sidebar.sidebarGroupContent(
                                { children: [content] },
                                h,
                              ),
                              ...(kind === 'menu' && model.feedback !== ''
                                ? [
                                    h.p(
                                      [
                                        h.Role('status'),
                                        h.AriaLive('polite'),
                                        h.Class(
                                          'px-2 pt-2 text-xs text-sidebar-foreground/70',
                                        ),
                                      ],
                                      [model.feedback],
                                    ),
                                  ]
                                : []),
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
}

export const sidebarTailwindPreviewProgram = definePreviewProgram<
  Model,
  Message
>({
  Model,
  Message,
  init: index => ({
    _docsPage: 'sidebar',
    sidebar: Sidebar.init({
      defaultOpen: true,
      storageKey: `docs_sidebar_${String(index)}`,
    }),
    actionMenu: DropdownMenu.init({
      id: `docs-sidebar-actions-${String(index)}`,
      isAnimated: false,
    }),
    accountMenu: DropdownMenu.init({
      id: `docs-sidebar-account-${String(index)}`,
      isAnimated: false,
    }),
    learnMenu: DropdownMenu.init({
      id: `docs-sidebar-learn-${String(index)}`,
      isAnimated: false,
    }),
    feedback: '',
    query: '',
    learnOpen: true,
    learnHover: HoverIntent.init({ openDelay: 0, closeDelay: 300 }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotSidebarPreviewMessage': {
        const { model: sidebar, commands: sidebarCommands__ } = Sidebar.update(
          model.sidebar,
          message.message,
        )
        const commands = sidebarCommands__ ?? []
        return {
          model: {
            ...model,
            sidebar,
            learnHover:
              sidebar.isOpen || sidebar.isMobileOpen
                ? {
                    ...HoverIntent.close(model.learnHover).model,
                    isTriggerHovered: false,
                    isPanelHovered: false,
                    isDismissed: false,
                  }
                : model.learnHover,
            learnMenu:
              sidebar.isOpen || sidebar.isMobileOpen
                ? { ...model.learnMenu, isOpen: false }
                : model.learnMenu,
          },
          commands: Command.mapMessages(commands, next =>
            Message['GotSidebarPreviewMessage']({ message: next }),
          ),
        }
      }
      case 'ChangedSidebarPreviewQuery':
        return { model: { ...model, query: message.value } }
      case 'GotSidebarPreviewActionMenuMessage': {
        const {
          model: actionMenu,
          commands: actionMenuCommands__,
          outMessage: actionMenuOut__,
        } = ActionMenu.update(model.actionMenu, message.message)
        const commands = actionMenuCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(actionMenuOut__)
        const selection = Option.getOrUndefined(maybeSelection)
        return {
          model: {
            ...model,
            actionMenu,
            ...(selection === undefined
              ? {}
              : { feedback: `${actionLabel(selection.value)} selected` }),
          },
          commands: Command.mapMessages(commands, next =>
            Message['GotSidebarPreviewActionMenuMessage']({ message: next }),
          ),
        }
      }
      case 'GotSidebarPreviewAccountMenuMessage': {
        const {
          model: accountMenu,
          commands: accountMenuCommands__,
          outMessage: accountMenuOut__,
        } = ActionMenu.update(model.accountMenu, message.message)
        const commands = accountMenuCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(accountMenuOut__)
        const selection = Option.getOrUndefined(maybeSelection)
        return {
          model: {
            ...model,
            accountMenu,
            ...(selection === undefined
              ? {}
              : { feedback: `${actionLabel(selection.value)} selected` }),
          },
          commands: Command.mapMessages(commands, next =>
            Message['GotSidebarPreviewAccountMenuMessage']({ message: next }),
          ),
        }
      }
      case 'GotSidebarPreviewLearnMenuMessage': {
        const result = ActionMenu.update(model.learnMenu, message.message)
        return {
          model: {
            ...model,
            learnMenu: result.model,
            learnHover: result.model.isOpen
              ? model.learnHover
              : HoverIntent.close(model.learnHover).model,
            ...(result.outMessage === undefined
              ? {}
              : { feedback: `${result.outMessage.value} selected` }),
          },
          commands: [
            ...Command.mapMessages(result.commands ?? [], next =>
              Message.GotSidebarPreviewLearnMenuMessage({ message: next }),
            ),
            ...(result.model.isOpen !== model.learnMenu.isOpen
              ? [
                  FocusDocumentation({
                    id: model.learnMenu.id,
                    isOpen: result.model.isOpen,
                  }),
                ]
              : []),
          ],
        }
      }
      case 'EnteredSidebarPreviewLearn':
        return updateLearnHover(model, HoverIntent.Message.EnteredTrigger())
      case 'LeftSidebarPreviewLearn':
        return updateLearnHover(model, HoverIntent.Message.LeftTrigger())
      case 'GotSidebarPreviewLearnHoverMessage':
        return updateLearnHover(model, message.message)
      case 'SuppressedSidebarPreviewLearnHover':
        return {
          model: {
            ...model,
            learnHover: HoverIntent.close(model.learnHover).model,
          },
        }
      case 'CompletedSidebarPreviewLearnFocus':
        return { model }
      case 'CreatedSidebarPreviewProject':
        return { model: { ...model, feedback: 'Project created' } }
      case 'ToggledSidebarPreviewLearn':
        return { model: { ...model, learnOpen: !model.learnOpen } }
    }
  },
  ...(subscriptions === undefined ? {} : { subscriptions }),
  view: (index, model, h) => {
    const kind = sidebarFixtures[index]?.kind ?? 'shell'
    return kind === 'menu' || kind === 'nested' || kind === 'loading'
      ? staticPanel(kind, model, h)
      : shell(kind, model, h)
  },
})
