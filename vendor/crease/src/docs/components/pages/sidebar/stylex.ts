import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Option } from 'effect'
import * as Mount from 'foldkit/mount'
import { ObserveDocumentationHover } from './hover'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  sidebarFixtures,
  type SidebarFixtureKind,
} from '@/docs/components/pages/sidebar/shared'
import * as DropdownMenu from '@/stylex/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Sidebar from '@/stylex/sidebar'
import { sidebarScope } from '../../../../stylex/sidebar.markers.stylex'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'

const styles = stylex.create({
  actionAnchor: {
    position: 'absolute',
    zIndex: 30,
    right: '0.25rem',
    top: '0.375rem',
  },
  actionTrigger: { alignItems: 'center', display: 'flex' },
  actionTriggerButton: {
    borderRadius: 'calc(var(--radius) - 2px)',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'var(--sidebar-accent)',
    },
    color: {
      default: 'var(--sidebar-foreground)',
      ':hover': 'var(--sidebar-accent-foreground)',
    },
    display: 'flex',
    justifyContent: 'center',
    outlineStyle: 'none',
    height: '1.25rem',
    width: '1.25rem',
  },
  actionIcon: { height: '1rem', width: '1rem' },
  itemIcon: { flexShrink: 0, height: '1rem', width: '1rem' },
  accountIcon: { height: '0.875rem', width: '0.875rem' },
  collapsedHidden: {
    display: {
      default: null,
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 'none',
    },
  },
  accountAvatar: {
    borderRadius: 'var(--radius)',
    placeItems: 'center',
    backgroundColor: 'var(--sidebar-primary)',
    color: 'var(--sidebar-primary-foreground)',
    display: 'grid',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '1rem',
    height: '2rem',
    width: '2rem',
  },
  accountCopy: {
    display: 'grid',
    flexBasis: '0%',
    flexGrow: 1,
    lineHeight: 1.25,
    textAlign: 'left',
    minWidth: 0,
  },
  accountName: {
    overflow: 'hidden',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  brand: {
    gap: '0.5rem',
    paddingBlock: '0.25rem',
    paddingInline: {
      default: '0.5rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]:
        '0.125rem',
    },
    alignItems: 'center',
    display: 'flex',
  },
  brandMark: {
    borderRadius: 'calc(var(--radius) - 2px)',
    placeItems: 'center',
    backgroundColor: 'var(--sidebar-primary)',
    color: 'var(--sidebar-primary-foreground)',
    display: 'grid',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '1rem',
    height: '1.75rem',
    width: '1.75rem',
  },
  brandName: {
    overflow: 'hidden',
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  frame: {
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius)',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'var(--background)',
    position: 'relative',
    height: '26rem',
    minHeight: 0,
    width: '100%',
  },
  frameInset: {
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius)',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'var(--sidebar)',
    position: 'relative',
    height: '26rem',
    minHeight: 0,
    width: '100%',
  },
  feedback: {
    paddingInline: '0.5rem',
    color: 'color-mix(in oklab, var(--sidebar-foreground) 70%, transparent)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    paddingTop: '0.5rem',
  },
  inset: { overflow: 'auto', minHeight: 0 },
  pageHeader: {
    gap: '0.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    borderBottomColor: 'var(--border)',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: '3rem',
  },
  pageTitle: { fontSize: '0.875rem', fontWeight: 700, lineHeight: '1.25rem' },
  staticProviderPanel: {
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius)',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'var(--background)',
    height: '100%',
    maxWidth: '18rem',
    minHeight: 0,
    width: '100%',
  },
  skeletonBlock: {
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--muted)',
    height: '6rem',
  },
  skeletonBlockWide: {
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--muted)',
    gridColumnEnd: { default: 'auto', '@media (min-width: 640px)': 'span 2' },
    gridColumnStart: { default: 'auto', '@media (min-width: 640px)': 'span 2' },
    height: '8rem',
  },
  pageMain: {
    padding: '1rem',
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 640px)': 'repeat(2, minmax(0, 1fr))',
    },
  },
  staticFrame: {
    padding: '1rem',
    alignItems: 'stretch',
    backgroundColor: 'color-mix(in oklab, var(--muted) 30%, transparent)',
    display: 'flex',
    justifyContent: 'center',
    height: '20rem',
    width: '100%',
  },

  staticTitle: {
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  accountTrigger: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    textAlign: 'left',
    width: '100%',
  },
  accountTriggerButton: {
    padding: {
      default: '0.5rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    borderRadius: 'calc(var(--radius) - 2px)',
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'var(--sidebar-accent)',
    },
    color: {
      default: 'var(--sidebar-foreground)',
      ':hover': 'var(--sidebar-accent-foreground)',
    },
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    width: {
      default: '100%',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
  },
  documentationButton: {
    borderRadius: 'var(--radius)',
    padding: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'var(--sidebar-accent)',
    },
    color: 'var(--sidebar-foreground)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  },
  badgeAccent: { color: 'var(--sidebar-accent-foreground)' },
  menuButtonActionPad: {
    paddingRight: {
      default: '2rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
  },
  learnChevron: {
    flexShrink: 0,
    transitionDuration: '150ms',
    transitionProperty: 'transform',
    height: '1rem',
    marginLeft: 'auto',
    width: '1rem',
  },
  learnChevronOpen: { transform: 'rotate(90deg)' },
  noMatches: {
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  srOnly: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cx = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))
const iconLabel = <Msg>(
  name: string,
  label: string,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> => [
  Icon.icon(name, { class: cx(styles.itemIcon) }, h),
  Sidebar.sidebarMenuLabel({ children: [label] }, h),
]

const actionItems = ['open', 'rename', 'delete'] as const
const accountItems = ['profile', 'settings', 'sign out'] as const
const documentationItems = ['Introduction', 'Components', 'Changelog'] as const
const actionLabel = (action: string): string =>
  action[0]?.toUpperCase() + action.slice(1)
const actionMenu = <Msg>(
  model: DropdownMenu.Model,
  label: string,
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('sidebar', 'menu-action'),
      h.Class(cx(styles.actionAnchor, styles.collapsedHidden)),
    ],
    [
      DropdownMenu.dropdownMenu(
        {
          model,
          toParentMessage: message =>
            send(
              JSON.stringify({
                _tag: 'GotSidebarPreviewActionMenuMessage',
                message,
              }),
            ),
          trigger: h.span(
            [h.Class(cx(styles.actionTrigger))],
            [
              Icon.moreHorizontal({ class: cx(styles.actionIcon) }, h),
              h.span([h.Class(cx(styles.srOnly))], [label]),
            ],
          ),
          triggerLayoutStyle:
            styles.actionTriggerButton as ComponentLayoutStyle,
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

const primaryNavigation = <Msg>(
  model: { actionMenu: DropdownMenu.Model; query: string },
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
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
                      [h.Class(cx(styles.noMatches))],
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
                        ...(index === 2 && query === ''
                          ? {
                              layoutStyle:
                                styles.menuButtonActionPad as ComponentLayoutStyle,
                            }
                          : {}),
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
                      ? [
                          actionMenu(
                            model.actionMenu,
                            'Project actions',
                            send,
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
  )
}

const nestedNavigation = <Msg>(
  model: {
    learnOpen: boolean
    learnMenu: DropdownMenu.Model
    sidebar?: Sidebar.Model
  },
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
  dropdownSide: DropdownMenu.DropdownMenuSide = 'right',
): Html => {
  if (model.sidebar && !model.sidebar.isOpen && !model.sidebar.isMobileOpen) {
    const menuMessage = (message: DropdownMenu.Message) =>
      send(
        JSON.stringify({ _tag: 'GotSidebarPreviewLearnMenuMessage', message }),
      )
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
                      Mount.mapMessage(ObserveDocumentationHover({}), message =>
                        send(
                          JSON.stringify({
                            _tag:
                              message._tag === 'Entered'
                                ? 'EnteredSidebarPreviewLearn'
                                : 'LeftSidebarPreviewLearn',
                          }),
                        ),
                      ),
                    ),
                    h.OnKeyDownPreventDefault(key =>
                      model.learnMenu.isOpen &&
                      (key === 'Escape' || key === 'Enter' || key === ' ')
                        ? Option.some(
                            send(
                              JSON.stringify({
                                _tag: 'SuppressedSidebarPreviewLearnHover',
                              }),
                            ),
                          )
                        : Option.none(),
                    ),
                  ],
                  [
                    DropdownMenu.dropdownMenu(
                      {
                        model: model.learnMenu,
                        toParentMessage: menuMessage,
                        trigger: Icon.icon(
                          'book-open',
                          { class: cx(styles.itemIcon) },
                          h,
                        ),
                        triggerStyle: styles.documentationButton,
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
                  onClick: send(
                    JSON.stringify({ _tag: 'ToggledSidebarPreviewLearn' }),
                  ),
                  ariaExpanded: model.learnOpen,
                  children: [
                    ...iconLabel('book-open', 'Documentation', h),
                    Icon.chevronRight(
                      {
                        class: cx(
                          styles.learnChevron,
                          model.learnOpen && styles.learnChevronOpen,
                        ),
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

const account = <Msg>(
  model: { accountMenu: DropdownMenu.Model },
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Sidebar.sidebarMenu(
    {
      children: [
        Sidebar.sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu(
                {
                  model: model.accountMenu,
                  toParentMessage: message =>
                    send(
                      JSON.stringify({
                        _tag: 'GotSidebarPreviewAccountMenuMessage',
                        message,
                      }),
                    ),
                  triggerStyle: styles.accountTriggerButton,
                  triggerAriaLabel: 'Account menu',
                  trigger: h.span(
                    [h.Class(cx(styles.accountTrigger))],
                    [
                      h.span([h.Class(cx(styles.accountAvatar))], ['AL']),
                      h.span(
                        [
                          h.Class(
                            cx(styles.accountCopy, styles.collapsedHidden),
                          ),
                        ],
                        [
                          h.span(
                            [h.Class(cx(styles.accountName))],
                            ['Ada Lovelace'],
                          ),
                        ],
                      ),
                      Icon.chevronsUpDown(
                        {
                          class: cx(styles.accountIcon, styles.collapsedHidden),
                        },
                        h,
                      ),
                    ],
                  ),
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

const sidebarBody = <Msg>(
  model: {
    sidebar: Sidebar.Model
    actionMenu: DropdownMenu.Model
    accountMenu: DropdownMenu.Model
    learnMenu: DropdownMenu.Model
    query: string
    learnOpen: boolean
  },
  send: (json: string) => Msg,
  onQuery: (value: string) => Msg,
  h: HtmlBuilder<Msg>,
  side: Sidebar.SidebarSide = 'left',
): ReadonlyArray<Html | string> => [
  Sidebar.sidebarHeader(
    {
      children: [
        h.div(
          [h.DataAttribute('sidebar', 'brand'), h.Class(cx(styles.brand))],
          [
            h.span([h.Class(cx(styles.brandMark))], ['C']),
            h.span(
              [h.Class(cx(styles.brandName, styles.collapsedHidden))],
              ['Crease Workspace'],
            ),
          ],
        ),
        Sidebar.sidebarInput(
          {
            value: model.query,
            onInput: onQuery,
            placeholder: 'Search navigation',
            ariaLabel: 'Search navigation',
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
            children: [
              Sidebar.sidebarGroupLabel({ children: ['Platform'] }, h),
              Sidebar.sidebarGroupContent(
                { children: [primaryNavigation(model, send, h)] },
                h,
              ),
            ],
          },
          h,
        ),
        Sidebar.sidebarGroup(
          {
            spacing: 'later',
            children: [
              Sidebar.sidebarGroupLabel({ children: ['Learn'] }, h),
              Sidebar.sidebarGroupContent(
                {
                  children: [
                    nestedNavigation(
                      model,
                      send,
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
      ],
    },
    h,
  ),
  Sidebar.sidebarFooter({ children: [account(model, send, h)] }, h),
]

const pageContent = <Msg>(
  title: string,
  trigger: Html,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> => [
  h.header(
    [h.Class(cx(styles.pageHeader))],
    [trigger, h.strong([h.Class(cx(styles.pageTitle))], [title])],
  ),
  h.main(
    [h.Class(cx(styles.pageMain))],
    [
      h.div([h.Class(cx(styles.skeletonBlock))], []),
      h.div([h.Class(cx(styles.skeletonBlock))], []),
      h.div([h.Class(cx(styles.skeletonBlockWide))], []),
    ],
  ),
]

const shell = <Msg>(
  kind: SidebarFixtureKind,
  model: {
    sidebar: Sidebar.Model
    actionMenu: DropdownMenu.Model
    accountMenu: DropdownMenu.Model
    learnMenu: DropdownMenu.Model
    query: string
    learnOpen: boolean
  },
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const state: Sidebar.SidebarState = model.sidebar.isOpen
    ? 'expanded'
    : 'collapsed'
  const variant: Sidebar.SidebarVariant =
    kind === 'floating' || kind === 'inset' ? kind : 'sidebar'
  const collapsible: Sidebar.SidebarCollapsible =
    kind === 'offcanvas' ? 'offcanvas' : 'icon'
  const side: Sidebar.SidebarSide = kind === 'right' ? 'right' : 'left'
  const sidebarMessage = (message: Sidebar.Message): Msg =>
    send(JSON.stringify({ _tag: 'GotSidebarPreviewMessage', message }))
  const queryMessage = (value: string): Msg =>
    send(JSON.stringify({ _tag: 'ChangedSidebarPreviewQuery', value }))
  const desktopToggle = sidebarMessage(Sidebar.Message.Toggled())
  const trigger = Sidebar.sidebarTrigger(
    {
      onClick: desktopToggle,
      onMobileClick: sidebarMessage(Sidebar.Message.ToggledMobile()),
    },
    h,
  )
  const panel = Sidebar.sidebar(
    {
      state,
      side,
      variant,
      collapsible,
      presentation: 'contained',
      isMobileOpen: model.sidebar.isMobileOpen,
      onMobileDismiss: sidebarMessage(
        Sidebar.Message.SetMobileOpen({ isOpen: false }),
      ),
      children: [
        ...sidebarBody(model, send, queryMessage, h, side),
        Sidebar.sidebarRail({ onClick: desktopToggle, side }, h),
      ],
    },
    h,
  )
  const inset = Sidebar.sidebarInset(
    {
      variant,
      state,
      layoutStyle: styles.inset as ComponentLayoutStyle,
      children: pageContent(
        kind === 'shell'
          ? 'Product overview'
          : (sidebarFixtures.find(fixture => fixture.kind === kind)?.title ??
              'Workspace'),
        trigger,
        h,
      ),
    },
    h,
  )

  return Sidebar.sidebarProvider(
    {
      state,
      ...(kind === 'right'
        ? { width: '18rem', mobileWidth: '20rem', iconWidth: '3.25rem' }
        : {}),
      layoutStyle: (kind === 'inset'
        ? styles.frameInset
        : styles.frame) as ComponentLayoutStyle,
      children: side === 'right' ? [inset, panel] : [panel, inset],
    },
    h,
  )
}

const staticPanel = <Msg>(
  kind: 'menu' | 'nested' | 'loading',
  model: {
    actionMenu: DropdownMenu.Model
    accountMenu: DropdownMenu.Model
    learnMenu: DropdownMenu.Model
    learnOpen: boolean
    feedback: string
  },
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
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
                    Sidebar.sidebarMenuBadge(
                      {
                        layoutStyle: styles.badgeAccent as ComponentLayoutStyle,
                        children: ['12'],
                      },
                      h,
                    ),
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
                        layoutStyle:
                          styles.menuButtonActionPad as ComponentLayoutStyle,
                        children: iconLabel('inbox', 'Inbox', h),
                      },
                      h,
                    ),
                    actionMenu(model.actionMenu, 'Inbox actions', send, h),
                  ],
                },
                h,
              ),
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        onClick: send(
                          JSON.stringify({
                            _tag: 'CreatedSidebarPreviewProject',
                          }),
                        ),
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
        ? nestedNavigation(model, send, h)
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
    [h.Class(cx(styles.staticFrame))],
    [
      Sidebar.sidebarProvider(
        {
          width: '18rem',
          layoutStyle: styles.staticProviderPanel as ComponentLayoutStyle,
          children: [
            Sidebar.sidebar(
              {
                collapsible: 'none',
                children: [
                  Sidebar.sidebarHeader(
                    {
                      children: [
                        h.div(
                          [h.Class(cx(styles.staticTitle))],
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
                                          cx(reset.text, styles.feedback),
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

export const sidebarStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const kind = sidebarFixtures[index]?.kind ?? 'shell'
  return kind === 'menu' || kind === 'nested' || kind === 'loading'
    ? staticPanel(
        kind,
        model as {
          actionMenu: DropdownMenu.Model
          accountMenu: DropdownMenu.Model
          learnMenu: DropdownMenu.Model
          learnOpen: boolean
          feedback: string
        },
        send,
        h,
      )
    : shell(
        kind,
        model as {
          sidebar: Sidebar.Model
          actionMenu: DropdownMenu.Model
          accountMenu: DropdownMenu.Model
          learnMenu: DropdownMenu.Model
          query: string
          learnOpen: boolean
        },
        send,
        h,
      )
}
