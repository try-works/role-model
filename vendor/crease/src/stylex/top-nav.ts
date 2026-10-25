import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx TopNav (packages/core/src/TopNav/) — StyleX
   renderer; visual spec adapted to Crease UI tokens. */

import { Option } from 'effect'
import * as stylex from '@stylexjs/stylex'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import * as Icon from '@/lib/icon'
import * as NavMenu from '@/lib/nav-menu'
import * as TopNavLib from '@/lib/top-nav'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

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

const styles = stylex.create({
  nav: {
    padding: '0.5rem',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: tokens.foreground,
    display: 'flex',
    outlineStyle: 'none',
    position: 'relative',
    width: '100%',
  },
  navGrid: {
    padding: '0.5rem',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: tokens.foreground,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    outlineStyle: 'none',
    position: 'relative',
    width: '100%',
  },
  leftSection: {
    flex: '1',
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    minWidth: 0,
  },
  headingSlot: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
  },
  startContent: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  },
  centerContent: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  rightSection: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  endContent: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    marginInlineStart: 'auto',
  },
  item: {
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.75rem',
    textDecoration: 'none',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    userSelect: 'none',
  },
  itemHover: {
    backgroundColor: {
      default: 'transparent',
      ':focus-visible': tokens.accent,
      ':hover': tokens.accent,
    },
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    cursor: interactionTokens.cursorAction,
  },
  itemSelected: {
    backgroundColor: tokens.accent,
    color: tokens.foreground,
    fontWeight: 600,
  },
  itemDisabled: {
    color: `color-mix(in oklab, ${tokens.mutedForeground} 50%, transparent)`,
    cursor: interactionTokens.cursorDefault,
    pointerEvents: 'none',
  },
  itemIconOnly: {
    paddingInline: '0.5rem',
  },
  trigger: {
    borderRadius: foundationTokens.radiusMd,
    borderWidth: 0,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.75rem',
    textDecoration: 'none',
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 'inherit',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    userSelect: 'none',
  },
  triggerOpen: {
    backgroundColor: tokens.accent,
    color: tokens.foreground,
  },
  chevron: {
    alignItems: 'center',
    display: 'inline-flex',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1em',
    width: '1em',
  },
  chevronOpen: {
    transform: 'rotate(180deg)',
  },
  menuPanel: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    backgroundColor: foundationTokens.popover,
    boxShadow: tokens.shadowCard,
    boxSizing: 'border-box',
    color: foundationTokens.popoverForeground,
    display: 'flex',
    flexDirection: 'column',
    outlineStyle: 'none',
    zIndex: 50,
    maxHeight: 'min(70vh, 480px)',
    minWidth: '17.5rem',
    overflowY: 'auto',
  },
  menuItem: {
    padding: '0.75rem',
    borderRadius: foundationTokens.radiusMd,
    borderWidth: 0,
    gap: '0.75rem',
    textDecoration: 'none',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':focus-visible': tokens.accent,
      ':hover': tokens.accent,
    },
    color: 'inherit',
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontFamily: 'inherit',
    outlineStyle: 'none',
    textAlign: 'start',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    width: '100%',
  },
  menuItemIcon: {
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: tokens.accent,
    color: tokens.mutedForeground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '2.5rem',
    width: '2.5rem',
  },
  menuItemText: {
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  menuItemTitle: {
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  menuItemDesc: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  megaContainer: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    overflow: 'hidden',
    backgroundColor: foundationTokens.popover,
    boxShadow: tokens.shadowCard,
    boxSizing: 'border-box',
    color: foundationTokens.popoverForeground,
    display: 'flex',
    flexDirection: 'column',
    outlineStyle: 'none',
    zIndex: 50,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 1,
    maxHeight: 'min(70vh, 480px)',
  },
  megaContent: {
    gap: '1.5rem',
    overscrollBehavior: 'contain',
    paddingBlock: '0.75rem',
    paddingInline: '0.75rem',
    boxSizing: 'border-box',
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: 'min(960px, calc(100dvw - 2rem))',
    overflowY: 'auto',
  },
  megaItems: {
    gap: '0.5rem',
    display: 'grid',
    flexBasis: '300px',
    flexGrow: '2',
    flexShrink: '1',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    minWidth: 0,
  },
  megaFeatured: {
    borderRadius: foundationTokens.radiusLg,
    overflow: 'hidden',
    backgroundColor: tokens.muted,
    display: 'flex',
    flexBasis: '200px',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
  },
  featuredCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  featuredImage: {
    display: 'block',
    objectFit: 'cover',
    height: '140px',
    width: '100%',
  },
  featuredBody: {
    padding: '1rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  featuredTitle: {
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  featuredDesc: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  featuredLink: {
    textDecoration: 'none',
    color: tokens.primary,
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '1rem',
  },
  headingRoot: {
    gap: '0.5rem',
    paddingBlock: 0,
    paddingInline: '0.5rem',
    textDecoration: 'none',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: tokens.foreground,
    display: 'flex',
    userSelect: 'none',
    minHeight: '2rem',
  },
  headingInteractive: {
    borderRadius: foundationTokens.radiusMd,
    borderWidth: 0,
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
    },
    cursor: interactionTokens.cursorAction,
    fontFamily: 'inherit',
    textAlign: 'start',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  headingText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  headingTitle: {
    overflow: 'hidden',
    textDecoration: 'none',
    color: tokens.foreground,
    fontSize: '17px',
    fontWeight: 600,
    lineHeight: '1.5rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headingSub: {
    overflow: 'hidden',
    textDecoration: 'none',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headingRow: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  },
  headingLogo: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
  },
  headingChevron: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1.75rem',
    width: '1.75rem',
  },
  headingPopoverHeading: {
    borderRadius: foundationTokens.radiusMd,
    borderWidth: 0,
    gap: '0.5rem',
    marginInline: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
    },
    color: 'inherit',
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontFamily: 'inherit',
    marginBlockEnd: '0.5rem',
    marginBlockStart: '0.25rem',
    outlineStyle: 'none',
    textAlign: 'start',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    minHeight: '2rem',
    width: 'auto',
  },
  headingMenuPanel: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.125rem',
    backgroundColor: foundationTokens.popover,
    boxShadow: tokens.shadowCard,
    boxSizing: 'border-box',
    color: foundationTokens.popoverForeground,
    display: 'flex',
    flexDirection: 'column',
    outlineStyle: 'none',
    zIndex: 50,
    maxHeight: 'min(70vh, 480px)',
    minWidth: '14rem',
    overflowY: 'auto',
  },
  headingMenuItem: {
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':focus-visible': tokens.accent,
      ':hover': tokens.accent,
    },
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'start',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    width: '100%',
  },
  menuItemItemsStart: {
    alignItems: 'flex-start',
  },
  relativeInline: {
    display: 'inline-flex',
    position: 'relative',
  },
})

// ---------------------------------------------------------------------------
// Anchor positioning (same CSS anchor contract as the tailwind renderer)
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
    : { left: 'anchor(left)' }
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
    h.Style({ anchorName: `--${domBase}-anchor` }),
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
    h.OnKeyDownPreventDefault(k =>
      k === 'Enter' || k === ' '
        ? Option.some(emitMenu(NavMenu.Message.ActivatedNavMenuTrigger()))
        : Option.none(),
    ),
  ]
}

const chevronIcon = <Msg>(open: boolean, h: HtmlBuilder<Msg>): Html =>
  h.span(
    [h.Class(className(styles.chevron, open && styles.chevronOpen))],
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
  const children: ReadonlyArray<Html | string> = [
    ...(item.icon === undefined
      ? []
      : [Icon.icon(item.icon, { class: 'size-4 shrink-0' }, h)]),
    ...(item.isIconOnly === true ? [] : [item.label]),
  ]
  if (disabled || item.href === undefined) {
    if (!disabled && item.onSelect === true) {
      return h.button(
        [
          h.Type('button'),
          h.Class(
            className(
              reset.button,
              styles.item,
              !disabled && styles.itemHover,
              item.isSelected === true && styles.itemSelected,
              disabled && styles.itemDisabled,
              item.isIconOnly === true && styles.itemIconOnly,
            ),
          ),
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
        h.Class(
          className(
            reset.link,
            styles.item,
            !disabled && styles.itemHover,
            item.isSelected === true && styles.itemSelected,
            disabled && styles.itemDisabled,
            item.isIconOnly === true && styles.itemIconOnly,
          ),
        ),
        ...(disabled ? [h.AriaDisabled(true), h.Tabindex(-1)] : []),
        ...(item.isSelected === true ? [h.AriaCurrent('page')] : []),
        ...(item.isIconOnly === true ? [h.AriaLabel(item.label)] : []),
      ],
      children,
    )
  }
  return h.a(
    [
      h.Class(
        className(
          reset.link,
          styles.item,
          !disabled && styles.itemHover,
          item.isSelected === true && styles.itemSelected,
          disabled && styles.itemDisabled,
          item.isIconOnly === true && styles.itemIconOnly,
        ),
      ),
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
    h.span(
      [h.Class(className(styles.menuItemIcon))],
      [item.icon ?? h.span([], [])],
    ),
    h.span(
      [h.Class(className(styles.menuItemText))],
      [
        h.span([h.Class(className(styles.menuItemTitle))], [item.title]),
        ...(item.description === undefined
          ? []
          : [
              h.span(
                [h.Class(className(styles.menuItemDesc))],
                [item.description],
              ),
            ]),
      ],
    ),
  ]
  const attrs = [
    h.Class(className(styles.menuItem)),
    h.Role('menuitem'),
    h.Tabindex(-1),
    h.OnClick(activate),
  ]
  return item.href === undefined
    ? h.div(attrs, inner)
    : h.a([h.Class(className(reset.link)), ...attrs, h.Href(item.href)], inner)
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
    [h.Class(className(styles.relativeInline))],
    [
      h.button(
        [
          h.Type('button'),
          h.Class(
            className(
              reset.button,
              styles.trigger,
              styles.itemHover,
              open && styles.triggerOpen,
            ),
          ),
          ...triggerAttrs(model, key, menu, emitMenu, h),
        ],
        [menuData.label, chevronIcon(open, h)],
      ),
      ...(open
        ? [
            h.div(
              [
                h.Id(NavMenu.panelDomId(domBase)),
                h.Class(className(styles.menuPanel)),
                h.Role('menu'),
                h.AriaLabel(menuData.label),
                h.Style(anchorPositionStyle(anchorId, 'bottom')),
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
      : [h.span([h.Class(className(styles.menuItemIcon))], [item.icon])]),
    h.span(
      [h.Class(className(styles.menuItemText))],
      [
        h.span([h.Class(className(styles.menuItemTitle))], [item.title]),
        ...(item.description === undefined
          ? []
          : [
              h.span(
                [h.Class(className(styles.menuItemDesc))],
                [item.description],
              ),
            ]),
      ],
    ),
  ]
  const attrs = [
    h.Class(className(styles.menuItem, styles.menuItemItemsStart)),
    ...(onActivate === undefined ? [] : [h.OnClick(onActivate)]),
  ]
  return item.href === undefined
    ? h.div(
        [...attrs, ...(onActivate === undefined ? [] : [h.Tabindex(0)])],
        inner,
      )
    : h.a([h.Class(className(reset.link)), ...attrs, h.Href(item.href)], inner)
}

export const topNavMegaMenuFeaturedCard = <Msg>(
  card: TopNavMegaMenuFeaturedCardData,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.featuredCard))],
    [
      ...(card.image === undefined
        ? []
        : [
            h.img([
              h.Class(className(reset.media, styles.featuredImage)),
              h.Src(card.image),
              h.Alt(card.imageAlt ?? ''),
              ...(card.imageAlt === undefined
                ? [h.Role('presentation'), h.AriaHidden(true)]
                : []),
            ]),
          ]),
      h.div(
        [h.Class(className(styles.featuredBody))],
        [
          h.span([h.Class(className(styles.featuredTitle))], [card.title]),
          ...(card.description === undefined
            ? []
            : [
                h.span(
                  [h.Class(className(styles.featuredDesc))],
                  [card.description],
                ),
              ]),
          ...(card.linkLabel === undefined || card.linkHref === undefined
            ? []
            : [
                h.a(
                  [
                    h.Class(className(reset.link, styles.featuredLink)),
                    h.Href(card.linkHref),
                  ],
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
    [h.Class(className(styles.relativeInline))],
    [
      h.button(
        [
          h.Type('button'),
          h.Class(
            className(
              reset.button,
              styles.trigger,
              styles.itemHover,
              open && styles.triggerOpen,
            ),
          ),
          ...triggerAttrs(model, key, menu, emitMenu, h),
        ],
        [menuData.label, chevronIcon(open, h)],
      ),
      ...(open
        ? [
            h.div(
              [
                h.Id(NavMenu.panelDomId(domBase)),
                h.Class(className(styles.megaContainer)),
                h.Role('group'),
                h.AriaLabel(menuData.label),
                h.Style({
                  // Mega menus use the whole nav's anchor and width.
                  ...anchorPositionStyle(navAnchorId, 'bottom', { gap: '0px' }),
                  width: 'anchor-size(width)',
                }),
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
                h.div(
                  [h.Class(className(styles.megaContent))],
                  [
                    h.div(
                      [h.Class(className(styles.megaItems))],
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
                            [h.Class(className(styles.megaFeatured))],
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
    [h.Class(className(styles.headingText))],
    [
      ...(heading.superheading === undefined
        ? []
        : [
            hasAnyHref && heading.superheadingHref !== undefined && hasMenu
              ? h.a(
                  [
                    h.Class(className(reset.link, styles.headingSub)),
                    h.Href(heading.superheadingHref),
                  ],
                  [heading.superheading],
                )
              : h.span(
                  [h.Class(className(styles.headingSub))],
                  [heading.superheading],
                ),
          ]),
      h.span(
        [h.Class(className(styles.headingRow))],
        [
          hasAnyHref && heading.headingHref !== undefined && hasMenu
            ? h.a(
                [
                  h.Class(className(reset.link, styles.headingTitle)),
                  h.Href(heading.headingHref),
                ],
                [heading.heading ?? ''],
              )
            : h.span(
                [h.Class(className(styles.headingTitle))],
                [heading.heading ?? ''],
              ),
          ...(inlineChevron === undefined ? [] : [inlineChevron]),
        ],
      ),
      ...(heading.subheading === undefined
        ? []
        : [
            hasAnyHref && heading.subheadingHref !== undefined && hasMenu
              ? h.a(
                  [
                    h.Class(className(reset.link, styles.headingSub)),
                    h.Href(heading.subheadingHref),
                  ],
                  [heading.subheading],
                )
              : h.span(
                  [h.Class(className(styles.headingSub))],
                  [heading.subheading],
                ),
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
      : h.span([h.Class(className(styles.headingLogo))], [logo])
  const logoLink =
    logo === undefined || heading.headingHref === undefined
      ? logoSpan
      : h.a(
          [
            h.Class(className(reset.link, styles.headingLogo)),
            h.Href(heading.headingHref),
            h.AriaLabel(heading.logoLabel ?? heading.heading ?? 'Home'),
          ],
          [logo],
        )

  const chevronGlyph = h.span(
    [h.Class(className(styles.headingChevron))],
    [Icon.icon('chevron-down', { class: 'size-[1em]' }, h)],
  )
  const chevronTrigger = h.button(
    [
      h.Type('button'),
      h.Class(className(reset.button, styles.headingChevron)),
      h.Id(NavMenu.triggerDomId(domBase)),
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
              h.Class(className(styles.headingMenuPanel)),
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
                  h.Class(
                    className(reset.button, styles.headingPopoverHeading),
                  ),
                  h.OnClick(emitMenu(NavMenu.Message.ClosedNavMenu())),
                ],
                [
                  ...(logoSpan === undefined ? [] : [logoSpan]),
                  renderHeadingText(
                    heading,
                    false,
                    false,
                    h.span(
                      [
                        h.Class(
                          className(styles.headingChevron, styles.chevronOpen),
                        ),
                      ],
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
                    h.Class(className(styles.headingMenuItem)),
                    h.Role('menuitem'),
                    h.Tabindex(-1),
                    h.OnClick(activate),
                  ]
                  return item.href === undefined
                    ? h.div(attrs, [item.label])
                    : h.a(
                        [
                          h.Class(className(reset.link)),
                          ...attrs,
                          h.Href(item.href),
                        ],
                        [item.label],
                      )
                }),
              ),
            ],
          ),
        ]
      : []

  // 1. Logo only (no heading text) — logo links when headingHref given.
  if (heading.heading === undefined && heading.menu === undefined) {
    return h.span(
      [h.Class(className(styles.headingRoot))],
      [
        ...(logoLink === undefined ? [] : [logoLink]),
        ...(heading.headerEndContent === undefined
          ? []
          : [heading.headerEndContent]),
      ],
    )
  }

  // 2. Whole heading as link (hrefs, no menu).
  if (hasAnyHref && !hasMenu && heading.menu === undefined) {
    return h.a(
      [
        h.Class(
          className(reset.link, styles.headingRoot, styles.headingInteractive),
        ),
        h.Href(heading.headingHref ?? ''),
      ],
      [
        ...(logoSpan === undefined ? [] : [logoSpan]),
        renderHeadingText(heading, false, false, undefined, h),
        ...(heading.headerEndContent === undefined
          ? []
          : [heading.headerEndContent]),
      ],
    )
  }

  // 3. Whole heading as menu trigger (menu, no hrefs).
  if (hasMenu && !hasAnyHref) {
    return h.span(
      [h.Class(className(styles.relativeInline))],
      [
        h.div(
          [
            h.Class(className(styles.headingRoot, styles.headingInteractive)),
            h.Id(NavMenu.triggerDomId(domBase)),
            h.Style({ anchorName: anchorId }),
            h.AriaHasPopup('menu'),
            h.AriaExpanded(open),
            h.AriaControls(NavMenu.panelDomId(domBase)),
            h.Tabindex(0),
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

  // 4. Mixed: links + separate chevron trigger (menu + hrefs).
  if (hasMenu) {
    return h.span(
      [h.Class(className(styles.relativeInline))],
      [
        h.div(
          [
            h.Class(className(styles.headingRoot)),
            h.Style({ anchorName: anchorId }),
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

  // 5. Static heading with independent links (hrefs, no menu).
  return h.div(
    [h.Class(className(styles.headingRoot))],
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

export type ViewInputs = Readonly<{
  label?: string
  heading?: TopNavHeadingData
  startItems?: ReadonlyArray<TopNavEntry>
  centerItems?: ReadonlyArray<TopNavEntry>
  startContent?: Html
  centerContent?: Html
  endContent?: Html
  layoutStyle?: ComponentLayoutStyle
}>

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
      h.Class(
        className(
          hasCenter ? styles.navGrid : styles.nav,
          viewInputs.layoutStyle,
        ),
      ),
      h.AriaLabel(viewInputs.label ?? 'Top navigation'),
      h.Style({ anchorName: navAnchorId }),
    ],
    [
      h.div(
        [h.Class(className(styles.leftSection))],
        [
          ...(viewInputs.heading === undefined
            ? []
            : [
                h.div(
                  [h.Class(className(styles.headingSlot))],
                  [renderHeading(model, viewInputs.heading, emit, h)],
                ),
              ]),
          ...(startChildren.length === 0
            ? []
            : [
                h.div([h.Class(className(styles.startContent))], startChildren),
              ]),
        ],
      ),
      ...(hasCenter
        ? [h.div([h.Class(className(styles.centerContent))], centerChildren)]
        : []),
      ...(hasCenter
        ? [
            h.div(
              [h.Class(className(styles.rightSection))],
              viewInputs.endContent === undefined
                ? []
                : [viewInputs.endContent],
            ),
          ]
        : viewInputs.endContent === undefined
          ? []
          : [
              h.div(
                [h.Class(className(styles.endContent))],
                [viewInputs.endContent],
              ),
            ]),
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
