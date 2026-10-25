import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import * as Popover from './popover'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { complexTokens } from './complex-tokens'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'

import { layoutStyle } from './contracts'
type Slot = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
  children: ReadonlyArray<Html | string>
}>
export type NavigationMenuLayout = 'inline' | 'scroll' | 'responsive'

const styles = {
  content: layoutStyle({
    minWidth: 'min(16rem, calc(100vw - 2rem))',
    width: 'max-content',
  }),
  disclosureIcon: Style.make({
    position: 'relative',
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'transform',
    height: '0.75rem',
    top: 1,
    width: '0.75rem',
  }).pipe(
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  disclosureIconOpen: Style.make({ transform: 'rotate(180deg)' }),
  item: Style.empty,
  link: Style.make({
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowNone,
    color: tokens.foreground,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textDecorationLine: 'none',
    transitionProperty: 'color, background-color, box-shadow',
    height: '2.25rem',
    width: 'max-content',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow }),
  ),
  linkActive: Style.make({ backgroundColor: complexTokens.accentSurface }),
  list: Style.make({
    gap: '0.25rem',
    listStyle: 'none',
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'center',
  }),
  listScroll: Style.make({
    justifyContent: 'flex-start',
    minWidth: 'max-content',
  }),
  listResponsive: Style.make({
    alignItems: 'center',
    flexDirection: 'row',
  }).pipe(
    Style.when(When.maxWidth('47.999rem'), {
      alignItems: 'stretch',
      flexDirection: 'column',
    }),
  ),
  nav: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
    maxWidth: 'max-content',
  }).pipe(
    Style.when(When.has(When.data('slot', 'popover-content')), { zIndex: 50 }),
  ),
  navBounded: Style.make({ maxWidth: '100%' }),
  navScroll: Style.make({ overflowX: 'auto' }),
  trigger: Style.make({
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  }),
}

export const navigationMenu = <Msg>(
  props: Slot &
    Readonly<{
      ariaLabel?: string
      direction?: 'ltr' | 'rtl'
      layout?: NavigationMenuLayout
    }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.nav(
    [
      h.DataAttribute('slot', 'navigation-menu'),
      h.DataAttribute('layout', props.layout ?? 'inline'),
      h.AriaLabel(props.ariaLabel ?? 'Main'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.Class(
        className(
          styles.nav,
          props.layout !== undefined &&
            props.layout !== 'inline' &&
            styles.navBounded,
          props.layout === 'scroll' && styles.navScroll,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )

export const navigationMenuList = <Msg>(
  props: Slot & Readonly<{ layout?: NavigationMenuLayout }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.ul(
    [
      h.DataAttribute('slot', 'navigation-menu-list'),
      h.DataAttribute('layout', props.layout ?? 'inline'),
      h.Class(
        className(
          reset.list,
          styles.list,
          props.layout === 'scroll' && styles.listScroll,
          props.layout === 'responsive' && styles.listResponsive,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
export const navigationMenuItem = <Msg>(
  props: Slot,
  h: HtmlBuilder<Msg>,
): Html =>
  h.li(
    [
      h.DataAttribute('slot', 'navigation-menu-item'),
      h.Class(className(styles.item, props.layoutStyle)),
    ],
    [...props.children],
  )
export const navigationMenuLink = <Msg>(
  props: Slot & Readonly<{ href: string; isActive?: boolean }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.Href(props.href),
      h.DataAttribute('slot', 'navigation-menu-link'),
      ...(props.isActive === true
        ? [h.AriaCurrent('page'), h.DataAttribute('active', '')]
        : []),
      h.Class(
        className(
          reset.link,
          styles.link,
          props.isActive === true && styles.linkActive,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )

export type NavigationMenuDisclosureProps<Msg> = Readonly<{
  model: Popover.Model
  toParentMessage: (message: Popover.Message) => Msg
  label: string
  content: Html | string
  layoutStyle?: ComponentLayoutStyle | undefined
  ariaLabel?: string
  pointerIntent?: 'press' | 'hover-and-press'
}>

export const navigationMenuDisclosure = <Msg>(
  props: NavigationMenuDisclosureProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  Popover.popover(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      trigger: h.span(
        [
          h.Class(className(styles.trigger, props.layoutStyle)),
          h.AriaLabel(props.ariaLabel ?? props.label),
          ...(props.pointerIntent === 'hover-and-press' && !props.model.isOpen
            ? [h.OnMouseMove(props.toParentMessage(Popover.RequestedOpen()))]
            : []),
        ],
        [
          props.label,
          Icon.chevronDown<Msg>(
            {
              class: className(
                styles.disclosureIcon,
                props.model.isOpen && styles.disclosureIconOpen,
              ),
            },
            h,
          ),
        ],
      ),
      triggerLayoutStyle: styles.link as ComponentLayoutStyle,
      content: props.content,
      layoutStyle: styles.content,
      align: 'start',
      focusSelector: '[data-slot="popover-content"] a',
    },
    h,
  )
