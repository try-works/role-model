// Ported from astryx packages/core/src/TopNav (TopNav, TopNavHeading,
// TopNavItem, TopNavMenu, TopNavMegaMenu, TopNavMegaMenuItem,
// TopNavMegaMenuFeaturedCard) — slot layout, item styles, hover/click menu
// behavior. Mobile-bar/drawer render modes are out of scope (AppShell-level).
import { Option } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import * as Icon from '@/lib/icon'
import * as NavMenu from '@/lib/nav-menu'
import * as TopNavLib from '@/lib/top-nav'
import { cn } from '@/lib/utils'

export {
  dropdownMenuKey,
  HEADING_MENU_KEY,
  init,
  isMenuOpen,
  menuFor,
  Model,
  update,
} from '@/lib/top-nav'
export type { InitConfig, TopNavMenuKind } from '@/lib/top-nav'
export { Message, OutMessage } from '@/lib/top-nav'

// ---------------------------------------------------------------------------
// View data types
// ---------------------------------------------------------------------------

export type TopNavItemData = Readonly<{
  kind?: 'item'
  label: string
  href?: string
  icon?: string
  isSelected?: boolean
  isDisabled?: boolean
  isIconOnly?: boolean
  onSelect?: boolean
}>

export type TopNavMenuItemData = Readonly<{
  title: string
  description?: string
  icon?: Html
  href?: string
  onSelect?: boolean
}>

export type TopNavMenuData = Readonly<{
  kind: 'menu'
  label: string
  items: ReadonlyArray<TopNavMenuItemData>
}>

export type TopNavMegaMenuItemData = Readonly<{
  title: string
  description?: string
  icon?: Html
  href?: string
  onSelect?: boolean
}>

export type TopNavMegaMenuFeaturedCardData = Readonly<{
  title: string
  description?: string
  image?: string
  imageAlt?: string
  linkLabel?: string
  linkHref?: string
  children?: Html
}>

export type TopNavMegaMenuData = Readonly<{
  kind: 'megaMenu'
  label: string
  items: ReadonlyArray<TopNavMegaMenuItemData>
  featured?: TopNavMegaMenuFeaturedCardData
}>

/** A startContent/centerContent entry: a link item, a dropdown menu, or a
    mega menu trigger. */
export type TopNavEntry = TopNavItemData | TopNavMenuData | TopNavMegaMenuData

export type TopNavHeadingMenuItemData = Readonly<{
  label: string
  href?: string
  onSelect?: boolean
}>

export type TopNavHeadingData = Readonly<{
  heading?: string
  logo?: Html
  logoLabel?: string
  headingHref?: string
  superheading?: string
  superheadingHref?: string
  subheading?: string
  subheadingHref?: string
  headerEndContent?: Html
  menu?: ReadonlyArray<TopNavHeadingMenuItemData>
}>

export type ViewInputs = Readonly<{
  label?: string
  heading?: TopNavHeadingData
  startItems?: ReadonlyArray<TopNavEntry>
  centerItems?: ReadonlyArray<TopNavEntry>
  /** Escape hatch for arbitrary start slot content. */
  startContent?: Html
  centerContent?: Html
  endContent?: Html
  class?: string
}>

// ---------------------------------------------------------------------------
// Classes (astryx nav item: py-1.5 px-3 radius-element label/medium secondary)
// ---------------------------------------------------------------------------

const NAV_CLASS =
  'relative box-border flex w-full items-center p-2 text-foreground outline-none'
const NAV_GRID_CLASS =
  'relative box-border grid w-full grid-cols-[1fr_auto_1fr] items-center p-2 text-foreground outline-none'

const LEFT_SECTION_CLASS = 'flex min-w-0 flex-1 items-center gap-4'
const HEADING_SLOT_CLASS = 'flex shrink-0 items-center'
const START_CONTENT_CLASS = 'flex items-center gap-1'
const CENTER_CONTENT_CLASS = 'flex items-center justify-center gap-1'
const RIGHT_SECTION_CLASS = 'flex items-center justify-end gap-1'
const END_CONTENT_CLASS = 'ms-auto flex shrink-0 items-center gap-1'

const ITEM_CLASS =
  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm leading-5 font-medium text-muted-foreground no-underline transition-colors duration-150 select-none'
const ITEM_HOVER =
  'cursor-pointer hover:bg-accent focus-visible:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
const ITEM_SELECTED = 'bg-accent font-semibold text-foreground'
const ITEM_DISABLED =
  'pointer-events-none cursor-default text-muted-foreground/50'
const ITEM_ICON_ONLY = 'px-2'

const TRIGGER_CLASS = cn(
  ITEM_CLASS,
  ITEM_HOVER,
  'appearance-none border-none bg-transparent font-[inherit]',
)
const TRIGGER_OPEN_CLASS = 'bg-accent text-foreground'

const CHEVRON_CLASS =
  'inline-flex size-[1em] items-center transition-transform duration-150'

const MENU_PANEL_CLASS =
  'z-50 box-border flex max-h-[min(70vh,480px)] min-w-70 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none'

const MENU_ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-3 rounded-md border-none bg-transparent p-3 text-left font-[inherit] text-inherit no-underline outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent'
const MENU_ITEM_ICON_CLASS =
  'flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground'
const MENU_ITEM_TITLE_CLASS = 'text-sm leading-5 font-semibold text-foreground'
const MENU_ITEM_DESC_CLASS = 'text-xs leading-4 text-muted-foreground'

const MEGA_CONTAINER_CLASS =
  'z-50 box-border flex max-h-[min(70vh,480px)] flex-col overflow-hidden rounded-lg border-t border-border bg-popover text-popover-foreground shadow-md outline-none'
const MEGA_CONTENT_CLASS =
  'box-border flex max-w-[min(960px,calc(100dvw-2rem))] flex-wrap gap-6 overflow-y-auto overscroll-contain px-3 py-3'
const MEGA_ITEMS_CLASS =
  'grid min-w-0 shrink grow-2 basis-[300px] grid-cols-2 gap-2'
const MEGA_FEATURED_CLASS =
  'flex shrink grow basis-[200px] flex-col overflow-hidden rounded-lg bg-muted'

const FEATURED_IMAGE_CLASS = 'block h-[140px] w-full object-cover'
const FEATURED_BODY_CLASS = 'flex flex-col gap-2 p-4'
const FEATURED_TITLE_CLASS = 'text-sm leading-5 font-semibold text-foreground'
const FEATURED_DESC_CLASS = 'text-xs leading-4 text-muted-foreground'
const FEATURED_LINK_CLASS =
  'text-xs leading-4 font-semibold text-primary no-underline'

const HEADING_ROOT_CLASS =
  'box-border flex min-h-8 items-center gap-2 px-2 py-0 text-foreground no-underline select-none'
const HEADING_INTERACTIVE_CLASS =
  'cursor-pointer rounded-md border-none bg-transparent font-[inherit] text-start transition-colors duration-150 hover:bg-accent'
const HEADING_TEXT_CLASS = 'flex min-w-0 flex-col'
const HEADING_TITLE_CLASS =
  'truncate text-[17px] leading-6 font-semibold text-foreground no-underline'
const HEADING_SUB_CLASS = 'truncate text-xs leading-4 text-muted-foreground'
const HEADING_ROW_CLASS = 'flex items-center gap-1'
const HEADING_LOGO_CLASS = 'flex shrink-0 items-center justify-center'
const HEADING_CHEVRON_CLASS =
  'flex size-7 shrink-0 items-center justify-center text-muted-foreground'
const HEADING_POPOVER_HEADING_CLASS =
  'mx-1 mt-1 mb-2 flex min-h-8 w-auto cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-2 font-[inherit] text-start text-inherit outline-none transition-colors duration-150 hover:bg-accent'
const HEADING_MENU_PANEL_CLASS =
  'z-50 box-border flex max-h-[min(70vh,480px)] min-w-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none'
const HEADING_MENU_ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent'

// ---------------------------------------------------------------------------
// Anchor positioning (same CSS anchor contract as side-nav flyouts)
// ---------------------------------------------------------------------------

type AnchorSide = 'top' | 'bottom' | 'start' | 'end'

const anchorPositionStyle = (
  anchorId: string,
  side: AnchorSide,
  options: Readonly<{ coverTrigger?: boolean; gap?: string }> = {},
): Record<string, string> => {
  const gap = options.gap ?? '0.25rem'
  const cover = options.coverTrigger === true
  const horizontal = side === 'start' || side === 'end'
  const sideInset =
    side === 'end'
      ? { left: cover ? 'anchor(left)' : `calc(anchor(right) + ${gap})` }
      : side === 'start'
        ? { right: cover ? 'anchor(right)' : `calc(anchor(left) + ${gap})` }
        : side === 'bottom'
          ? { top: cover ? 'anchor(top)' : `calc(anchor(bottom) + ${gap})` }
          : { bottom: cover ? 'anchor(bottom)' : `calc(anchor(top) + ${gap})` }
  const alignInset = horizontal
    ? { top: cover ? 'anchor(top)' : `calc(anchor(top) - ${gap})` }
    : { left: cover ? 'anchor(left)' : 'anchor(left)' }
  return {
    // Match the mega menu: escape ancestor scroll/clipping containers while
    // keeping the panel in its original theme scope and anchored on scroll.
    position: 'fixed',
    positionAnchor: anchorId,
    positionTryFallbacks: 'flip-inline',
    ...sideInset,
    ...alignInset,
  }
}

const menuDomBase = (model: TopNavLib.Model, key: string): string =>
  `${model.id}-${key}`

// ---------------------------------------------------------------------------
// Trigger wiring shared by dropdown + mega menu triggers
// ---------------------------------------------------------------------------

const triggerAttrs = <Msg>(
  model: TopNavLib.Model,
  key: string,
  menu: NavMenu.Model,
  emitMenu: (message: NavMenu.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Array<Attribute<Msg>> => {
  const domBase = menuDomBase(model, key)
  return [
    h.Id(NavMenu.triggerDomId(domBase)),
    h.Style({
      'anchor-name': `--${domBase}-anchor`,
    } as Record<string, string>),
    h.AriaHasPopup('menu'),
    h.AriaExpanded(NavMenu.isOpen(menu)),
    h.AriaControls(NavMenu.panelDomId(domBase)),
    h.OnMouseEnter(emitMenu(NavMenu.Message.EnteredNavMenuTrigger())),
    h.OnMouseLeave(emitMenu(NavMenu.Message.LeftNavMenuTrigger())),
    h.OnPointerDown((_type, button, _sx, _sy, timeStamp) =>
      button === 0
        ? Option.some(
            emitMenu(
              NavMenu.Message.PressedNavMenuTrigger({ atMs: timeStamp }),
            ),
          )
        : Option.none(),
    ),
    h.OnKeyDownPreventDefault(key =>
      key === 'Enter' || key === ' '
        ? Option.some(emitMenu(NavMenu.Message.ActivatedNavMenuTrigger()))
        : Option.none(),
    ),
  ]
}

const chevronIcon = <Msg>(open: boolean, h: HtmlBuilder<Msg>): Html =>
  h.span(
    [h.Class(cn(CHEVRON_CLASS, open && 'rotate-180'))],
    [Icon.icon('chevron-down', { class: 'size-[1em]' }, h)],
  )

// ---------------------------------------------------------------------------
// TopNavItem
// ---------------------------------------------------------------------------

export const topNavItem = <Msg>(
  item: TopNavItemData,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const disabled = item.isDisabled === true
  const classes = cn(
    ITEM_CLASS,
    !disabled && ITEM_HOVER,
    item.isSelected === true && ITEM_SELECTED,
    disabled && ITEM_DISABLED,
    item.isIconOnly === true && ITEM_ICON_ONLY,
  )
  const children: ReadonlyArray<Html | string> = [
    ...(item.icon === undefined
      ? []
      : [Icon.icon(item.icon, { class: 'size-4 shrink-0' }, h)]),
    ...(item.isIconOnly === true ? [] : [item.label]),
  ]
  if (disabled || item.href === undefined) {
    // Disabled anchors carry no href and leave the tab order (astryx renders
    // an href-less <a>); action items become real buttons.
    if (!disabled && item.onSelect === true) {
      return h.button(
        [
          h.Type('button'),
          h.Class(classes),
          h.OnClick(
            emit(TopNavLib.Message.PressedTopNavItem({ id: item.label })),
          ),
          ...(item.isIconOnly === true ? [h.AriaLabel(item.label)] : []),
        ],
        children,
      )
    }
    return h.a(
      [
        h.Class(classes),
        ...(disabled ? [h.AriaDisabled(true), h.Tabindex(-1)] : []),
        ...(item.isSelected === true ? [h.AriaCurrent('page')] : []),
        ...(item.isIconOnly === true ? [h.AriaLabel(item.label)] : []),
      ],
      children,
    )
  }
  return h.a(
    [
      h.Class(classes),
      h.Href(item.href),
      ...(item.isSelected === true ? [h.AriaCurrent('page')] : []),
      ...(item.isIconOnly === true ? [h.AriaLabel(item.label)] : []),
      ...(item.onSelect === true
        ? [
            h.OnClick(
              emit(TopNavLib.Message.PressedTopNavItem({ id: item.label })),
            ),
          ]
        : []),
    ],
    children,
  )
}

// ---------------------------------------------------------------------------
// TopNavMenu (dropdown)
// ---------------------------------------------------------------------------

const renderMenuItem = <Msg>(
  key: string,
  item: TopNavMenuItemData,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const activate = emit(
    TopNavLib.Message.PressedTopNavMenuItem({
      menuKey: key,
      itemTitle: item.title,
    }),
  )
  const inner: Html[] = [
    h.span([h.Class(MENU_ITEM_ICON_CLASS)], [item.icon ?? h.span([], [])]),
    h.span(
      [h.Class('flex min-w-0 flex-col gap-1')],
      [
        h.span([h.Class(MENU_ITEM_TITLE_CLASS)], [item.title]),
        ...(item.description === undefined
          ? []
          : [h.span([h.Class(MENU_ITEM_DESC_CLASS)], [item.description])]),
      ],
    ),
  ]
  const attrs = [
    h.Class(MENU_ITEM_CLASS),
    h.Role('menuitem'),
    h.Tabindex(-1),
    h.OnClick(activate),
  ]
  return item.href === undefined
    ? h.div(attrs, inner)
    : h.a([...attrs, h.Href(item.href)], inner)
}

const renderDropdown = <Msg>(
  model: TopNavLib.Model,
  key: string,
  menuData: TopNavMenuData,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const menu = TopNavLib.menuFor(model, key, 'dropdown')
  const domBase = menuDomBase(model, key)
  const anchorId = `--${domBase}-anchor`
  const emitMenu = (message: NavMenu.Message): Msg =>
    emit(TopNavLib.Message.GotTopNavMenuMessage({ key, message }))
  const open = NavMenu.isOpen(menu)
  return h.span(
    [h.Class('relative inline-flex')],
    [
      h.button(
        [
          h.Type('button'),
          h.Class(cn(TRIGGER_CLASS, open && TRIGGER_OPEN_CLASS)),
          ...triggerAttrs(model, key, menu, emitMenu, h),
        ],
        [menuData.label, chevronIcon(open, h)],
      ),
      ...(open
        ? [
            h.div(
              [
                h.Id(NavMenu.panelDomId(domBase)),
                h.Class(MENU_PANEL_CLASS),
                h.Role('menu'),
                h.AriaLabel(menuData.label),
                h.Style(
                  anchorPositionStyle(anchorId, 'bottom', { gap: '0.25rem' }),
                ),
                h.OnMouseEnter(emitMenu(NavMenu.Message.EnteredNavMenuPanel())),
                h.OnMouseLeave(emitMenu(NavMenu.Message.LeftNavMenuPanel())),
                h.OnKeyDownPreventDefault(key =>
                  key === 'Escape'
                    ? Option.some(
                        emitMenu(NavMenu.Message.PressedEscapeNavMenu()),
                      )
                    : Option.none(),
                ),
              ],
              menuData.items.map(item => renderMenuItem(key, item, emit, h)),
            ),
          ]
        : []),
    ],
  )
}

// ---------------------------------------------------------------------------
// TopNavMegaMenu + items + featured card
// ---------------------------------------------------------------------------

export const topNavMegaMenuItem = <Msg>(
  item: TopNavMegaMenuItemData,
  onActivate: Msg | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  const inner: Html[] = [
    ...(item.icon === undefined
      ? []
      : [h.span([h.Class(MENU_ITEM_ICON_CLASS)], [item.icon])]),
    h.span(
      [h.Class('flex min-w-0 flex-col gap-1')],
      [
        h.span([h.Class(MENU_ITEM_TITLE_CLASS)], [item.title]),
        ...(item.description === undefined
          ? []
          : [h.span([h.Class(MENU_ITEM_DESC_CLASS)], [item.description])]),
      ],
    ),
  ]
  const attrs = [
    h.Class(cn(MENU_ITEM_CLASS, 'items-start')),
    ...(onActivate === undefined ? [] : [h.OnClick(onActivate)]),
  ]
  return item.href === undefined
    ? h.div(
        [...attrs, ...(onActivate === undefined ? [] : [h.Tabindex(0)])],
        inner,
      )
    : h.a([...attrs, h.Href(item.href)], inner)
}

export const topNavMegaMenuFeaturedCard = <Msg>(
  card: TopNavMegaMenuFeaturedCardData,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class('flex flex-col')],
    [
      ...(card.image === undefined
        ? []
        : [
            h.img([
              h.Class(FEATURED_IMAGE_CLASS),
              h.Src(card.image),
              h.Alt(card.imageAlt ?? ''),
              ...(card.imageAlt === undefined
                ? [h.Role('presentation'), h.AriaHidden(true)]
                : []),
            ]),
          ]),
      h.div(
        [h.Class(FEATURED_BODY_CLASS)],
        [
          h.span([h.Class(FEATURED_TITLE_CLASS)], [card.title]),
          ...(card.description === undefined
            ? []
            : [h.span([h.Class(FEATURED_DESC_CLASS)], [card.description])]),
          ...(card.linkLabel === undefined || card.linkHref === undefined
            ? []
            : [
                h.a(
                  [h.Class(FEATURED_LINK_CLASS), h.Href(card.linkHref)],
                  [`${card.linkLabel} →`],
                ),
              ]),
          ...(card.children === undefined ? [] : [card.children]),
        ],
      ),
    ],
  )

const renderMegaMenu = <Msg>(
  model: TopNavLib.Model,
  key: string,
  menuData: TopNavMegaMenuData,
  navAnchorId: string,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const menu = TopNavLib.menuFor(model, key, 'mega')
  const domBase = menuDomBase(model, key)
  const emitMenu = (message: NavMenu.Message): Msg =>
    emit(TopNavLib.Message.GotTopNavMenuMessage({ key, message }))
  const open = NavMenu.isOpen(menu)
  return h.span(
    [h.Class('relative inline-flex')],
    [
      h.button(
        [
          h.Type('button'),
          h.Class(cn(TRIGGER_CLASS, open && TRIGGER_OPEN_CLASS)),
          ...triggerAttrs(model, key, menu, emitMenu, h),
        ],
        [menuData.label, chevronIcon(open, h)],
      ),
      ...(open
        ? [
            h.div(
              [
                h.Id(NavMenu.panelDomId(domBase)),
                h.Class(MEGA_CONTAINER_CLASS),
                h.Role('group'),
                h.AriaLabel(menuData.label),
                h.Style({
                  // Mega menus use the whole nav's anchor and width.
                  ...anchorPositionStyle(navAnchorId, 'bottom', {
                    gap: '0px',
                  }),
                  width: 'anchor-size(width)',
                }),
                h.OnMouseEnter(emitMenu(NavMenu.Message.EnteredNavMenuPanel())),
                h.OnMouseLeave(emitMenu(NavMenu.Message.LeftNavMenuPanel())),
                h.OnKeyDownPreventDefault(key =>
                  key === 'Escape'
                    ? Option.some(
                        emitMenu(NavMenu.Message.PressedEscapeNavMenu()),
                      )
                    : Option.none(),
                ),
              ],
              [
                h.div(
                  [h.Class(MEGA_CONTENT_CLASS)],
                  [
                    h.div(
                      [h.Class(MEGA_ITEMS_CLASS)],
                      menuData.items.map(item =>
                        topNavMegaMenuItem(
                          item,
                          emit(
                            TopNavLib.Message.PressedTopNavMenuItem({
                              menuKey: key,
                              itemTitle: item.title,
                            }),
                          ),
                          h,
                        ),
                      ),
                    ),
                    ...(menuData.featured === undefined
                      ? []
                      : [
                          h.div(
                            [h.Class(MEGA_FEATURED_CLASS)],
                            [topNavMegaMenuFeaturedCard(menuData.featured, h)],
                          ),
                        ]),
                  ],
                ),
              ],
            ),
          ]
        : []),
    ],
  )
}

// ---------------------------------------------------------------------------
// TopNavHeading (5 astryx render modes)
// ---------------------------------------------------------------------------

const renderHeadingText = <Msg>(
  heading: TopNavHeadingData,
  hasAnyHref: boolean,
  hasMenu: boolean,
  inlineChevron: Html | undefined,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(HEADING_TEXT_CLASS)],
    [
      ...(heading.superheading === undefined
        ? []
        : [
            hasAnyHref && heading.superheadingHref !== undefined && hasMenu
              ? h.a(
                  [
                    h.Class(HEADING_SUB_CLASS),
                    h.Href(heading.superheadingHref),
                  ],
                  [heading.superheading],
                )
              : h.span([h.Class(HEADING_SUB_CLASS)], [heading.superheading]),
          ]),
      h.span(
        [h.Class(HEADING_ROW_CLASS)],
        [
          hasAnyHref && heading.headingHref !== undefined && hasMenu
            ? h.a(
                [h.Class(HEADING_TITLE_CLASS), h.Href(heading.headingHref)],
                [heading.heading ?? ''],
              )
            : h.span([h.Class(HEADING_TITLE_CLASS)], [heading.heading ?? '']),
          ...(inlineChevron === undefined ? [] : [inlineChevron]),
        ],
      ),
      ...(heading.subheading === undefined
        ? []
        : [
            hasAnyHref && heading.subheadingHref !== undefined && hasMenu
              ? h.a(
                  [h.Class(HEADING_SUB_CLASS), h.Href(heading.subheadingHref)],
                  [heading.subheading],
                )
              : h.span([h.Class(HEADING_SUB_CLASS)], [heading.subheading]),
          ]),
    ],
  )

const renderHeading = <Msg>(
  model: TopNavLib.Model,
  heading: TopNavHeadingData,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const key = TopNavLib.HEADING_MENU_KEY
  const hasMenu = heading.menu !== undefined && heading.menu.length > 0
  const menu = TopNavLib.menuFor(model, key, 'heading')
  const domBase = menuDomBase(model, key)
  const anchorId = `--${domBase}-anchor`
  const emitMenu = (message: NavMenu.Message): Msg =>
    emit(TopNavLib.Message.GotTopNavMenuMessage({ key, message }))
  const open = NavMenu.isOpen(menu)
  const hasAnyHref =
    heading.headingHref !== undefined ||
    heading.superheadingHref !== undefined ||
    heading.subheadingHref !== undefined

  const logo = heading.logo
  const logoSpan =
    logo === undefined
      ? undefined
      : h.span([h.Class(HEADING_LOGO_CLASS)], [logo])
  const logoLink =
    logo === undefined || heading.headingHref === undefined
      ? logoSpan
      : h.a(
          [
            h.Class(HEADING_LOGO_CLASS),
            h.Href(heading.headingHref),
            h.AriaLabel(heading.logoLabel ?? heading.heading ?? 'Home'),
          ],
          [logo],
        )

  const chevronGlyph = h.span(
    [h.Class(HEADING_CHEVRON_CLASS)],
    [Icon.icon('chevron-down', { class: 'size-[1em]' }, h)],
  )

  // Mixed mode only: the separate chevron control is THE menu trigger
  // (the whole heading is not interactive when links exist).
  const chevronTrigger = h.button(
    [
      h.Type('button'),
      h.Class(cn(HEADING_CHEVRON_CLASS, HEADING_INTERACTIVE_CLASS)),
      h.Id(NavMenu.triggerDomId(domBase)),
      h.AriaLabel('Open menu'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(open),
      h.AriaControls(NavMenu.panelDomId(domBase)),
      h.OnPointerDown((_type, button, _sx, _sy, timeStamp) =>
        button === 0
          ? Option.some(
              emitMenu(
                NavMenu.Message.PressedNavMenuTrigger({ atMs: timeStamp }),
              ),
            )
          : Option.none(),
      ),
      h.OnKeyDownPreventDefault(k =>
        k === 'Enter' || k === ' '
          ? Option.some(emitMenu(NavMenu.Message.ActivatedNavMenuTrigger()))
          : Option.none(),
      ),
    ],
    [Icon.icon('chevron-down', { class: 'size-[1em]' }, h)],
  )

  const menuPanel = (
    items: ReadonlyArray<TopNavHeadingMenuItemData>,
  ): Html[] =>
    open
      ? [
          h.div(
            [
              h.Id(NavMenu.panelDomId(domBase)),
              h.Class(HEADING_MENU_PANEL_CLASS),
              h.Style(
                anchorPositionStyle(anchorId, 'bottom', {
                  coverTrigger: true,
                  gap: '0px',
                }),
              ),
              h.OnMouseEnter(emitMenu(NavMenu.Message.EnteredNavMenuPanel())),
              h.OnMouseLeave(emitMenu(NavMenu.Message.LeftNavMenuPanel())),
              h.OnKeyDownPreventDefault(k =>
                k === 'Escape'
                  ? Option.some(
                      emitMenu(NavMenu.Message.PressedEscapeNavMenu()),
                    )
                  : Option.none(),
              ),
            ],
            [
              // Flipped heading copy — the astryx close affordance.
              h.button(
                [
                  h.Type('button'),
                  h.Class(HEADING_POPOVER_HEADING_CLASS),
                  h.OnClick(emitMenu(NavMenu.Message.ClosedNavMenu())),
                ],
                [
                  ...(logoSpan === undefined ? [] : [logoSpan]),
                  renderHeadingText(
                    heading,
                    false,
                    false,
                    h.span(
                      [h.Class(cn(HEADING_CHEVRON_CLASS, 'rotate-180'))],
                      [Icon.icon('chevron-down', { class: 'size-[1em]' }, h)],
                    ),
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Role('menu'), h.AriaLabel(heading.heading ?? 'Menu')],
                items.map(item => {
                  const activate = emit(
                    TopNavLib.Message.PressedTopNavMenuItem({
                      menuKey: key,
                      itemTitle: item.label,
                    }),
                  )
                  const attrs = [
                    h.Class(HEADING_MENU_ITEM_CLASS),
                    h.Role('menuitem'),
                    h.OnClick(activate),
                  ]
                  return item.href === undefined
                    ? h.button([h.Type('button'), ...attrs], [item.label])
                    : h.a([...attrs, h.Href(item.href)], [item.label])
                }),
              ),
            ],
          ),
        ]
      : []

  // 1. Logo only (no heading text, no menu)
  if (heading.heading === undefined && !hasMenu) {
    return heading.headingHref === undefined
      ? h.div(
          [h.Class(HEADING_ROOT_CLASS)],
          [...(logoSpan === undefined ? [] : [logoSpan])],
        )
      : h.a(
          [
            h.Class(cn(HEADING_ROOT_CLASS, HEADING_INTERACTIVE_CLASS)),
            h.Href(heading.headingHref),
            h.AriaLabel(heading.logoLabel ?? 'Home'),
          ],
          [...(logoSpan === undefined ? [] : [logoSpan])],
        )
  }

  // 2. Whole heading is a link (headingHref, no menu, no other hrefs)
  const isWholeHeadingLink =
    heading.headingHref !== undefined &&
    !hasMenu &&
    heading.superheadingHref === undefined &&
    heading.subheadingHref === undefined
  if (isWholeHeadingLink) {
    return h.a(
      [
        h.Class(cn(HEADING_ROOT_CLASS, HEADING_INTERACTIVE_CLASS)),
        h.Href(heading.headingHref as string),
      ],
      [
        ...(logoSpan === undefined ? [] : [logoSpan]),
        renderHeadingText(heading, hasAnyHref, false, undefined, h),
        ...(heading.headerEndContent === undefined
          ? []
          : [heading.headerEndContent]),
      ],
    )
  }

  // 3. Whole heading is the menu trigger (menu, no hrefs)
  if (hasMenu && !hasAnyHref) {
    return h.span(
      [h.Class('relative inline-flex')],
      [
        h.div(
          [
            h.Class(cn(HEADING_ROOT_CLASS, HEADING_INTERACTIVE_CLASS)),
            h.Role('button'),
            h.Tabindex(0),
            h.Id(NavMenu.triggerDomId(domBase)),
            h.Style({
              'anchor-name': anchorId,
            } as Record<string, string>),
            h.AriaHasPopup('menu'),
            h.AriaExpanded(open),
            h.AriaControls(NavMenu.panelDomId(domBase)),
            h.OnMouseEnter(emitMenu(NavMenu.Message.EnteredNavMenuTrigger())),
            h.OnMouseLeave(emitMenu(NavMenu.Message.LeftNavMenuTrigger())),
            h.OnPointerDown((_type, button, _sx, _sy, timeStamp) =>
              button === 0
                ? Option.some(
                    emitMenu(
                      NavMenu.Message.PressedNavMenuTrigger({
                        atMs: timeStamp,
                      }),
                    ),
                  )
                : Option.none(),
            ),
            h.OnKeyDownPreventDefault(k =>
              k === 'Enter' || k === ' '
                ? Option.some(
                    emitMenu(NavMenu.Message.ActivatedNavMenuTrigger()),
                  )
                : Option.none(),
            ),
          ],
          [
            ...(logoSpan === undefined ? [] : [logoSpan]),
            renderHeadingText(heading, false, true, chevronGlyph, h),
            ...(heading.headerEndContent === undefined
              ? []
              : [heading.headerEndContent]),
          ],
        ),
        ...menuPanel(heading.menu ?? []),
      ],
    )
  }

  // 4. Mixed: links + separate chevron trigger (menu + hrefs)
  if (hasMenu) {
    return h.span(
      [h.Class('relative inline-flex')],
      [
        h.div(
          [
            h.Class(HEADING_ROOT_CLASS),
            h.Style({
              'anchor-name': anchorId,
            } as Record<string, string>),
            h.OnMouseEnter(emitMenu(NavMenu.Message.EnteredNavMenuTrigger())),
            h.OnMouseLeave(emitMenu(NavMenu.Message.LeftNavMenuTrigger())),
          ],
          [
            ...(logoLink === undefined ? [] : [logoLink]),
            renderHeadingText(heading, hasAnyHref, true, chevronTrigger, h),
            ...(heading.headerEndContent === undefined
              ? []
              : [heading.headerEndContent]),
          ],
        ),
        ...menuPanel(heading.menu ?? []),
      ],
    )
  }

  // 5. Static heading with independent links (hrefs, no menu)
  return h.div(
    [h.Class(HEADING_ROOT_CLASS)],
    [
      ...(logoLink === undefined ? [] : [logoLink]),
      renderHeadingText(heading, hasAnyHref, false, undefined, h),
      ...(heading.headerEndContent === undefined
        ? []
        : [heading.headerEndContent]),
    ],
  )
}

// ---------------------------------------------------------------------------
// TopNav root
// ---------------------------------------------------------------------------

const renderEntry = <Msg>(
  model: TopNavLib.Model,
  entry: TopNavEntry,
  index: number,
  navAnchorId: string,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const kind = entry.kind ?? 'item'
  if (kind === 'menu') {
    return renderDropdown(
      model,
      TopNavLib.dropdownMenuKey(index),
      entry as TopNavMenuData,
      emit,
      h,
    )
  }
  if (kind === 'megaMenu') {
    return renderMegaMenu(
      model,
      TopNavLib.dropdownMenuKey(index),
      entry as TopNavMegaMenuData,
      navAnchorId,
      emit,
      h,
    )
  }
  return topNavItem(entry as TopNavItemData, emit, h)
}

const render = <Msg>(
  model: TopNavLib.Model,
  viewInputs: ViewInputs,
  emit: (message: TopNavLib.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const navAnchorId = `--${model.id}-nav-anchor`
  const hasCenter =
    viewInputs.centerItems !== undefined ||
    viewInputs.centerContent !== undefined
  const startChildren: Html[] = [
    ...(viewInputs.startItems ?? []).map((entry, index) =>
      renderEntry(model, entry, index, navAnchorId, emit, h),
    ),
    ...(viewInputs.startContent === undefined ? [] : [viewInputs.startContent]),
  ]
  const centerChildren: Html[] = [
    ...(viewInputs.centerItems ?? []).map((entry, index) =>
      renderEntry(model, entry, 100 + index, navAnchorId, emit, h),
    ),
    ...(viewInputs.centerContent === undefined
      ? []
      : [viewInputs.centerContent]),
  ]

  return h.nav(
    [
      h.Class(cn(hasCenter ? NAV_GRID_CLASS : NAV_CLASS, viewInputs.class)),
      h.AriaLabel(viewInputs.label ?? 'Top navigation'),
      h.Style({ 'anchor-name': navAnchorId } as Record<string, string>),
    ],
    [
      h.div(
        [h.Class(LEFT_SECTION_CLASS)],
        [
          ...(viewInputs.heading === undefined
            ? []
            : [
                h.div(
                  [h.Class(HEADING_SLOT_CLASS)],
                  [renderHeading(model, viewInputs.heading, emit, h)],
                ),
              ]),
          ...(startChildren.length === 0
            ? []
            : [h.div([h.Class(START_CONTENT_CLASS)], startChildren)]),
        ],
      ),
      ...(hasCenter
        ? [h.div([h.Class(CENTER_CONTENT_CLASS)], centerChildren)]
        : []),
      ...(hasCenter
        ? [
            h.div(
              [h.Class(RIGHT_SECTION_CLASS)],
              viewInputs.endContent === undefined
                ? []
                : [viewInputs.endContent],
            ),
          ]
        : viewInputs.endContent === undefined
          ? []
          : [h.div([h.Class(END_CONTENT_CLASS)], [viewInputs.endContent])]),
    ],
  )
}

/** Canonical stateful view. Embed with `h.submodel`. */
export const view = defineView<TopNavLib.Model, TopNavLib.Message, ViewInputs>(
  (model, viewInputs, h) => render(model, viewInputs, message => message, h),
)

export type TopNavProps<Msg> = ViewInputs &
  Readonly<{
    model: TopNavLib.Model
    toParentMessage: (message: TopNavLib.Message) => Msg
  }>

export const topNav = <Msg>(
  props: TopNavProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => render(props.model, props, props.toParentMessage, h)
