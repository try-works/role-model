import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import { sidebarScope } from './sidebar.markers.stylex'
import { complexTokens } from './complex-tokens.stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'

export * from '@/lib/sidebar-state'

export type SidebarState = 'expanded' | 'collapsed'
export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'
type Slot = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>

const pulse = stylex.keyframes({ '50%': { opacity: 0.5 } })
const styles = stylex.create({
  action: {
    padding: 0,
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    aspectRatio: '1 / 1',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    display: {
      default: 'flex',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 'none',
    },
    justifyContent: 'center',
    outlineStyle: 'none',
    position: 'absolute',
    right: '0.75rem',
    top: '0.875rem',
    width: '1.25rem',
  },
  backdrop: {
    backgroundColor: complexTokens.overlaySurface,
    display: { default: 'block', '@media (min-width: 768px)': 'none' },
    opacity: 0.5,
    position: 'fixed',
    zIndex: 40,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  badge: {
    borderRadius: tokens.controlRadius,
    paddingInline: '0.25rem',
    alignItems: 'center',
    color: complexTokens.sidebarForeground,
    display: {
      default: 'flex',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 'none',
    },
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    pointerEvents: 'none',
    position: 'absolute',
    userSelect: 'none',
    height: '1.25rem',
    minWidth: '1.25rem',
    right: '0.25rem',
    top: '0.375rem',
  },
  actionHalo: {
    inset: '-0.5rem',
    display: { default: 'block', '@media (min-width: 768px)': 'none' },
    position: 'absolute',
  },
  collapsedIcon: { overflow: 'hidden', width: 'var(--sidebar-width-icon)' },
  collapsedOffcanvas: { transform: 'translateX(-100%)' },
  collapsedOffcanvasRight: { transform: 'translateX(100%)' },
  content: {
    gap: '0.5rem',
    overflow: 'auto',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    minHeight: 0,
  },
  footer: {
    padding: '0.5rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  group: {
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  },
  groupFirst: { paddingBottom: '0.25rem' },
  groupLater: { paddingTop: '0.5rem' },
  groupContent: { fontSize: '0.875rem', lineHeight: '1.25rem', width: '100%' },
  groupLabel: {
    borderRadius: tokens.controlRadius,
    paddingInline: '0.5rem',
    alignItems: 'center',
    color: `color-mix(in oklab, ${complexTokens.sidebarForeground} 70%, transparent)`,
    display: 'flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    opacity: {
      default: 1,
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    outlineStyle: 'none',
    transitionDuration: {
      default: interactionTokens.motionDrawer,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'margin, opacity',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    height: '2rem',
    marginTop: {
      default: 0,
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]:
        '-2rem',
    },
  },
  header: {
    padding: '0.5rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  inset: {
    backgroundColor: tokens.background,
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    position: 'relative',
    width: '100%',
  },
  insetVariant: {
    margin: { default: 0, '@media (min-width: 768px)': '0.5rem' },
    borderRadius: {
      default: null,
      '@media (min-width: 768px)': foundationTokens.radiusXl,
    },
    boxShadow: {
      default: tokens.shadowNone,
      '@media (min-width: 768px)': foundationTokens.shadowSm,
    },
    marginLeft: { default: 0, '@media (min-width: 768px)': 0 },
  },
  insetVariantCollapsed: {
    marginLeft: { default: 0, '@media (min-width: 768px)': '0.5rem' },
  },
  inner: {
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  innerFloating: {
    borderColor: complexTokens.sidebarBorder,
    borderRadius: tokens.radius,
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: foundationTokens.shadowSm,
  },
  input: {
    borderColor: { default: tokens.input, ':focus-visible': tokens.ring },
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: '0.25rem',
    paddingInline: '0.625rem',
    backgroundColor: tokens.background,
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    display: 'flex',
    fontSize: { default: '1rem', '@media (min-width: 768px)': '0.875rem' },
    lineHeight: { default: '1.5rem', '@media (min-width: 768px)': '1.25rem' },
    outlineStyle: 'none',
    height: '2rem',
    minWidth: 0,
    width: '100%',
  },
  menu: {
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    width: '100%',
  },
  /* TW sidebar-04 'gap-2' menu override. */
  menuLoose: { gap: '0.5rem' },
  menuAction: {
    padding: 0,
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: complexTokens.sidebarForeground,
    display: {
      default: 'flex',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 'none',
    },
    justifyContent: 'center',
    outlineStyle: 'none',
    position: 'absolute',
    height: '1.25rem',
    right: '0.25rem',
    top: '0.375rem',
    width: '1.25rem',
  },
  menuActionHover: {
    opacity: { default: 0, ':focus-visible': 1, ':hover': 1 },
  },
  menuButton: {
    padding: {
      default: '0.5rem',
      /* TW 'group-data-[collapsible=icon]:p-0!' — icon-collapsed buttons
         go flush so their size-8 box is centered content. */
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    borderRadius: tokens.controlRadius,
    gap: {
      default: '0.5rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
      ':active': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    display: 'flex',
    justifyContent: {
      default: null,
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]:
        'center',
    },
    outlineStyle: 'none',
    /* TW 'group-has-data-[sidebar=menu-action]/menu-item:pr-8' — buttons
       leave room for a trailing menu-action button. */
    paddingInlineEnd: {
      default: null,
      // eslint-disable-next-line @stylexjs/no-lookahead-selectors -- reason: TW's group-has rule is itself :has() sugar; there is no ancestor alternative to selecting the button that precedes the action.
      [stylex.when.siblingAfter('[data-sidebar="menu-action"]', sidebarScope)]:
        '2rem',
    },
    textAlign: 'left',
    transitionDuration: {
      default: interactionTokens.motionDrawer,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'width, height, padding',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    whiteSpace: 'nowrap',
    width: {
      default: '100%',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
  },
  menuButtonActive: {
    backgroundColor: complexTokens.sidebarAccent,
    color: complexTokens.sidebarAccentForeground,
    fontWeight: 500,
  },
  menuButtonMedium: { fontWeight: 500 },
  menuButtonDefault: {
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '2rem',
  },
  menuButtonLg: {
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: {
      default: '3rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
  },
  menuButtonOutline: {
    backgroundColor: {
      default: tokens.background,
      ':hover': complexTokens.sidebarAccent,
    },
    boxShadow: {
      default: complexTokens.sidebarEdgeRing,
      ':hover': complexTokens.sidebarAccentRing,
    },
  },
  /* Mirrors the blocks demos' `bg-primary text-primary-foreground
     hover:bg-primary/90 hover:text-primary-foreground` menu-button classes:
     primary colors on the default (normal-weight) button, not Tailwind's
     font-semibold `primary` variant which no demo uses. */
  menuButtonPrimary: {
    backgroundColor: {
      default: tokens.primary,
      ':hover': tokens.primaryHover,
    },
    color: {
      default: tokens.primaryForeground,
      ':hover': tokens.primaryForeground,
    },
  },
  menuButtonSm: {
    fontSize: '0.75rem',
    lineHeight: '1rem',
    height: {
      default: '1.75rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
  },
  menuLabel: {
    overflow: 'hidden',
    opacity: {
      default: 1,
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    textOverflow: 'ellipsis',
    transitionDuration: {
      default: interactionTokens.motionModerate,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'opacity',
    whiteSpace: 'nowrap',
  },
  menuItem: { position: 'relative' },
  mobile: {
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: { default: 'flex', '@media (min-width: 768px)': 'none' },
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 50,
    bottom: 0,
    maxWidth: 'calc(100vw - 2rem)',
    top: 0,
    width: 'var(--sidebar-width-mobile)',
  },
  mobileClose: {
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    display: { default: 'inline-flex', '@media (min-width: 768px)': 'none' },
    justifyContent: 'center',
    position: 'absolute',
    height: '2rem',
    right: '0.5rem',
    top: '0.5rem',
    width: '2rem',
  },
  panel: {
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: 'var(--sidebar-width)',
  },
  panelTransparent: { backgroundColor: tokens.transparent },
  rail: {
    backgroundPosition: 'center',
    backgroundImage: {
      default: 'none',
      ':hover': `linear-gradient(${complexTokens.sidebarBorder}, ${complexTokens.sidebarBorder})`,
    },
    backgroundRepeat: 'no-repeat',
    backgroundSize: '2px 100%',
    cursor: interactionTokens.cursorResizeHorizontal,
    display: { default: 'none', '@media (min-width: 640px)': 'flex' },
    position: 'absolute',
    transform: 'translateX(-50%)',
    zIndex: 20,
    bottom: 0,
    right: '-1rem',
    top: 0,
    width: '1rem',
    '::after': {
      backgroundColor: 'transparent',
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: '50%',
      top: 0,
      width: '2px',
    },
  },
  right: { left: 'auto', right: 0 },
  root: { color: complexTokens.sidebarForeground },
  sidebarGap: {
    backgroundColor: tokens.transparent,
    display: { default: 'none', '@media (min-width: 768px)': 'block' },
    position: 'relative',
    transitionDuration: {
      default: interactionTokens.motionDrawer,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'width',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    width: 'var(--sidebar-width)',
  },
  sidebarGapCollapsedIcon: { width: 'var(--sidebar-width-icon)' },
  sidebarGapCollapsedFloating: {
    width: 'calc(var(--sidebar-width-icon) + 1rem)',
  },
  sidebarGapCollapsedOffcanvas: { width: 0 },
  separator: {
    marginInline: '0.5rem',
    backgroundColor: complexTokens.sidebarBorder,
    flexShrink: 0,
    height: 1,
  },
  sidebarContainer: {
    display: { default: 'none', '@media (min-width: 768px)': 'flex' },
    position: 'fixed',
    transitionDuration: {
      default: interactionTokens.motionDrawer,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'left, right, width, transform',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    zIndex: 10,
    bottom: 0,
    height: '100svh',
    left: 0,
    top: 0,
    width: 'var(--sidebar-width)',
  },
  /* TW-16 site header is 'h-(--header-height)' = 3.5rem. */
  sidebarBelowHeader: { height: 'calc(100svh - 3.5rem)', top: '3.5rem' },
  wrapperBelowHeader: { minHeight: 'calc(100svh - 3.5rem)' },
  sidebarContainerContained: { position: 'absolute', height: '100%' },
  sidebarContainerFloating: { padding: '0.5rem' },
  sidebarContainerFloatingCollapsed: {
    width: 'calc(var(--sidebar-width-icon) + 1rem)',
  },
  skeleton: {
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    height: '2rem',
  },
  skeletonIcon: {
    borderRadius: tokens.controlRadius,
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: pulse,
    animationTimingFunction: interactionTokens.easingPulse,
    backgroundColor: complexTokens.sidebarAccent,
    height: '1rem',
    width: '1rem',
  },
  skeletonText: {
    borderRadius: tokens.controlRadius,
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: pulse,
    animationTimingFunction: interactionTokens.easingPulse,
    backgroundColor: complexTokens.sidebarAccent,
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    height: '1rem',
    maxWidth: 'var(--skeleton-width)',
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
  sub: {
    gap: '0.25rem',
    marginInline: '0.875rem',
    paddingBlock: '0.125rem',
    paddingInline: '0.625rem',
    display: {
      default: 'flex',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 'none',
    },
    flexDirection: 'column',
    transform: 'translateX(1px)',
    borderLeftColor: complexTokens.sidebarBorder,
    borderLeftStyle: 'solid',
    borderLeftWidth: 1,
    minWidth: 0,
  },
  subButton: {
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    overflow: 'hidden',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    display: 'flex',
    outlineStyle: 'none',
    textDecorationLine: 'none',
    transform: 'translateX(-1px)',
    height: '1.75rem',
    minWidth: 0,
  },
  subButtonActive: {
    backgroundColor: complexTokens.sidebarAccent,
    color: complexTokens.sidebarAccentForeground,
  },
  containerBorderLeft: {
    borderLeftColor: complexTokens.sidebarBorder,
    borderLeftStyle: 'solid',
    borderLeftWidth: 1,
  },
  containerBorderRight: {
    borderRightColor: complexTokens.sidebarBorder,
    borderRightStyle: 'solid',
    borderRightWidth: 1,
  },
  /* TW sidebar-04 'ml-0 border-l-0 px-1.5' — flattens the default sub
     indent but keeps the base translate-x-px nudge. */
  subFlat: {
    paddingInline: '0.375rem',
    marginInlineStart: 0,
    borderLeftWidth: 0,
  },
  subMd: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  subSm: { fontSize: '0.75rem', lineHeight: '1rem' },
  trigger: {
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundClip: 'padding-box',
    backgroundColor: { default: tokens.transparent, ':hover': tokens.muted },
    color: { default: 'inherit', ':hover': tokens.foreground },
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    height: '1.75rem',
    minHeight: 0,
    minWidth: 0,
    width: '1.75rem',
  },
  triggerIcon: { flexShrink: 0, height: '1rem', width: '1rem' },
  railRight: { left: 0, right: 'auto' },
  tooltip: {
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    display: 'none',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    opacity: 0,
    pointerEvents: 'none',
    position: 'fixed',
    whiteSpace: 'nowrap',
    zIndex: 50,
    left: 'calc(var(--sidebar-width-icon) + 0.5rem)',
  },
  triggerDesktop: {
    display: { default: 'none', '@media (min-width: 768px)': 'inline-flex' },
  },
  triggerMobile: {
    display: { default: 'inline-flex', '@media (min-width: 768px)': 'none' },
  },
  triggerWrapper: { display: 'block' },
  wrapper: {
    backgroundColor: tokens.transparent,
    display: 'flex',
    minHeight: '100svh',
    width: '100%',
  },
})

const slotDiv =
  (slot: string, sidebarPart: string, base: StaticStyles) =>
  <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
    h.div(
      [
        h.DataAttribute('slot', slot),
        h.DataAttribute('sidebar', sidebarPart),
        h.Class(className(base, props.layoutStyle)),
      ],
      [...props.children],
    )

export type SidebarProviderProps = Slot &
  Readonly<{
    state?: SidebarState
    belowHeader?: boolean
    width?: string
    mobileWidth?: string
    iconWidth?: string
  }>
export const sidebarProvider = <Msg>(
  props: SidebarProviderProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('renderer', 'stylex'),
      h.DataAttribute('slot', 'sidebar-wrapper'),
      h.DataAttribute('state', props.state ?? 'expanded'),
      h.Style({
        '--sidebar-width': props.width ?? '16rem',
        '--sidebar-width-mobile': props.mobileWidth ?? '18rem',
        '--sidebar-width-icon': props.iconWidth ?? '3rem',
      }),
      h.Class(
        className(
          styles.wrapper,
          props.belowHeader === true && styles.wrapperBelowHeader,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )

export type SidebarProps<Msg> = Slot &
  Readonly<{
    state?: SidebarState
    side?: SidebarSide
    variant?: SidebarVariant
    collapsible?: SidebarCollapsible
    surface?: 'default' | 'transparent'
    presentation?: 'application' | 'contained'
    belowHeader?: boolean
    isMobileOpen?: boolean
    onMobileDismiss?: Msg
  }>
export const sidebar = <Msg>(
  props: SidebarProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const state = props.state ?? 'expanded'
  const side = props.side ?? 'left'
  const variant = props.variant ?? 'sidebar'
  const collapsible = props.collapsible ?? 'offcanvas'
  if (collapsible === 'none')
    return h.div(
      [
        h.DataAttribute('slot', 'sidebar'),
        h.Class(
          className(
            styles.panel,
            props.surface === 'transparent' && styles.panelTransparent,
            props.layoutStyle,
          ),
        ),
      ],
      [...props.children],
    )
  const collapsed = state === 'collapsed'
  return h.div(
    [
      h.DataAttribute('state', state),
      h.DataAttribute(
        'collapsible',
        collapsed && !props.isMobileOpen ? collapsible : '',
      ),
      h.DataAttribute('variant', variant),
      h.DataAttribute('side', side),
      h.DataAttribute('slot', 'sidebar'),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      ...((props.isMobileOpen ?? false)
        ? [
            h.button(
              [
                h.Type('button'),
                h.AriaLabel('Close sidebar backdrop'),
                ...(props.onMobileDismiss === undefined
                  ? []
                  : [
                      h.OnClick(props.onMobileDismiss),
                      h.OnKeyDownPreventDefault(key =>
                        key === 'Escape'
                          ? Option.some(props.onMobileDismiss!)
                          : Option.none(),
                      ),
                    ]),
                h.Class(className(reset.button, styles.backdrop)),
              ],
              [],
            ),
            h.aside(
              [
                h.DataAttribute('slot', 'sidebar-mobile'),
                h.Role('dialog'),
                h.AriaModal(true),
                h.AriaLabel('Sidebar'),
                ...(props.onMobileDismiss === undefined
                  ? []
                  : [
                      h.OnKeyDownPreventDefault(key =>
                        key === 'Escape'
                          ? Option.some(props.onMobileDismiss!)
                          : Option.none(),
                      ),
                    ]),
                h.Class(
                  className(styles.mobile, side === 'right' && styles.right),
                ),
              ],
              [
                ...props.children,
                ...(props.onMobileDismiss === undefined
                  ? []
                  : [
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaLabel('Close sidebar'),
                          h.OnClick(props.onMobileDismiss),
                          h.Class(className(reset.button, styles.mobileClose)),
                        ],
                        [Icon.x({}, h)],
                      ),
                    ]),
              ],
            ),
          ]
        : []),
      h.div(
        [
          h.DataAttribute('slot', 'sidebar-gap'),
          h.Class(
            className(
              styles.sidebarGap,
              collapsed &&
                collapsible === 'offcanvas' &&
                styles.sidebarGapCollapsedOffcanvas,
              collapsed &&
                collapsible === 'icon' &&
                (variant === 'floating' || variant === 'inset'
                  ? styles.sidebarGapCollapsedFloating
                  : styles.sidebarGapCollapsedIcon),
            ),
          ),
        ],
        [],
      ),
      h.div(
        [
          h.DataAttribute('slot', 'sidebar-container'),
          h.DataAttribute('collapsible', collapsed ? collapsible : ''),
          h.Class(
            className(
              styles.sidebarContainer,
              sidebarScope,
              props.belowHeader === true && styles.sidebarBelowHeader,
              props.presentation === 'contained' &&
                styles.sidebarContainerContained,
              side === 'right' && styles.right,
              variant === 'sidebar' &&
                (side === 'right'
                  ? styles.containerBorderLeft
                  : styles.containerBorderRight),
              (variant === 'floating' || variant === 'inset') &&
                styles.sidebarContainerFloating,
              collapsed &&
                collapsible === 'offcanvas' &&
                (side === 'right'
                  ? styles.collapsedOffcanvasRight
                  : styles.collapsedOffcanvas),
              collapsed &&
                collapsible === 'icon' &&
                (variant === 'floating' || variant === 'inset'
                  ? styles.sidebarContainerFloatingCollapsed
                  : styles.collapsedIcon),
            ),
          ),
        ],
        [
          h.div(
            [
              h.DataAttribute('sidebar', 'sidebar'),
              h.DataAttribute('slot', 'sidebar-inner'),
              h.Class(
                className(
                  styles.inner,
                  variant === 'floating' && styles.innerFloating,
                ),
              ),
            ],
            [...props.children],
          ),
        ],
      ),
    ],
  )
}

export type SidebarTriggerProps<Msg> = Readonly<{
  onClick: Msg
  onMobileClick?: Msg
  layoutStyle?: ComponentLayoutStyle
  iconStyle?: StaticStyles
}>
export const sidebarTrigger = <Msg>(
  props: SidebarTriggerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const trigger = (onClick: Msg, visibility?: StaticStyles): Html =>
    h.button(
      [
        h.DataAttribute('sidebar', 'trigger'),
        h.DataAttribute('slot', 'sidebar-trigger'),
        h.OnClick(onClick),
        h.Type('button'),
        h.Class(
          className(
            reset.button,
            styles.trigger,
            visibility,
            props.layoutStyle,
          ),
        ),
      ],
      [
        Icon.panelLeft<Msg>(
          { class: className(styles.triggerIcon, props.iconStyle) },
          h,
        ),
        h.span([h.Class(className(styles.srOnly))], ['Toggle Sidebar']),
      ],
    )
  return props.onMobileClick === undefined
    ? trigger(props.onClick)
    : h.span(
        [
          h.DataAttribute('slot', 'sidebar-responsive-trigger'),
          h.Class(className(styles.triggerWrapper)),
        ],
        [
          trigger(props.onMobileClick, styles.triggerMobile),
          trigger(props.onClick, styles.triggerDesktop),
        ],
      )
}
export type SidebarRailProps<Msg> = Readonly<{
  onClick: Msg
  side?: SidebarSide
}>
export const sidebarRail = <Msg>(
  props: SidebarRailProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.DataAttribute('sidebar', 'rail'),
      h.DataAttribute('slot', 'sidebar-rail'),
      h.AriaLabel('Toggle Sidebar'),
      h.Attribute('tabindex', '-1'),
      h.OnClick(props.onClick),
      h.Title('Toggle Sidebar'),
      h.Type('button'),
      h.Class(
        className(
          reset.button,
          styles.rail,
          props.side === 'right' && styles.railRight,
        ),
      ),
    ],
    [],
  )

export type SidebarInsetProps = Slot &
  Readonly<{ variant?: SidebarVariant; state?: SidebarState }>
export const sidebarInset = <Msg>(
  props: SidebarInsetProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.main(
    [
      h.DataAttribute('slot', 'sidebar-inset'),
      h.Class(
        className(
          styles.inset,
          props.variant === 'inset' && styles.insetVariant,
          props.variant === 'inset' &&
            props.state === 'collapsed' &&
            styles.insetVariantCollapsed,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
export type SidebarInputProps<Msg> = Readonly<{
  id?: string
  value?: string
  onInput?: (value: string) => Msg
  placeholder?: string
  ariaLabel?: string
  type?: string
  name?: string
  isDisabled?: boolean
  isInvalid?: boolean
  layoutStyle?: ComponentLayoutStyle
  inputStyle?: StaticStyles
}>
export const sidebarInput = <Msg>(
  props: SidebarInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.input([
    h.DataAttribute('slot', 'sidebar-input'),
    h.DataAttribute('sidebar', 'input'),
    ...(props.id === undefined ? [] : [h.Id(props.id)]),
    ...(props.value === undefined ? [] : [h.Value(props.value)]),
    ...(props.onInput === undefined ? [] : [h.OnInput(props.onInput)]),
    ...(props.placeholder === undefined
      ? []
      : [h.Placeholder(props.placeholder)]),
    ...(props.name === undefined ? [] : [h.Name(props.name)]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    h.Type(props.type ?? 'text'),
    h.Disabled(props.isDisabled ?? false),
    h.AriaInvalid(props.isInvalid ?? false),
    h.Class(
      className(reset.input, styles.input, props.inputStyle, props.layoutStyle),
    ),
  ])

export const sidebarHeader = slotDiv('sidebar-header', 'header', styles.header)
export const sidebarFooter = slotDiv('sidebar-footer', 'footer', styles.footer)
export const sidebarSeparator = <Msg>(
  props: Readonly<{ layoutStyle?: ComponentLayoutStyle }> = {},
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'sidebar-separator'),
      h.DataAttribute('sidebar', 'separator'),
      h.DataAttribute('orientation', 'horizontal'),
      h.Role('none'),
      h.Class(className(styles.separator, props.layoutStyle)),
    ],
    [],
  )
export const sidebarContent = slotDiv(
  'sidebar-content',
  'content',
  styles.content,
)
export type SidebarGroupProps = Slot &
  Readonly<{ spacing?: 'default' | 'first' | 'later' }>
export const sidebarGroup = <Msg>(
  props: SidebarGroupProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'sidebar-group'),
      h.DataAttribute('sidebar', 'group'),
      h.Class(
        className(
          styles.group,
          props.spacing === 'first' && styles.groupFirst,
          props.spacing === 'later' && styles.groupLater,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
export const sidebarGroupLabel = slotDiv(
  'sidebar-group-label',
  'group-label',
  styles.groupLabel,
)
export type SidebarActionProps<Msg> = Slot & Readonly<{ onClick?: Msg }>
export const sidebarGroupAction = <Msg>(
  props: SidebarActionProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.DataAttribute('slot', 'sidebar-group-action'),
      h.DataAttribute('sidebar', 'group-action'),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
      h.Type('button'),
      h.Class(className(reset.button, styles.action, props.layoutStyle)),
    ],
    [
      h.span([h.AriaHidden(true), h.Class(className(styles.actionHalo))], []),
      ...props.children,
    ],
  )
export const sidebarGroupContent = slotDiv(
  'sidebar-group-content',
  'group-content',
  styles.groupContent,
)
export type SidebarMenuProps = Slot & Readonly<{ variant?: 'loose' }>
export const sidebarMenu = <Msg>(
  props: SidebarMenuProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.ul(
    [
      h.DataAttribute('slot', 'sidebar-menu'),
      h.DataAttribute('sidebar', 'menu'),
      h.Class(
        className(
          reset.list,
          styles.menu,
          props.variant === 'loose' && styles.menuLoose,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
export const sidebarMenuItem = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.li(
    [
      h.DataAttribute('slot', 'sidebar-menu-item'),
      h.DataAttribute('sidebar', 'menu-item'),
      h.Class(className(styles.menuItem, props.layoutStyle)),
    ],
    [...props.children],
  )

export type SidebarMenuButtonVariants = Readonly<{
  variant?: 'default' | 'outline' | 'primary' | null
  size?: 'default' | 'sm' | 'lg' | null
}>
const menuSizes = {
  default: styles.menuButtonDefault,
  sm: styles.menuButtonSm,
  lg: styles.menuButtonLg,
} as const
export const sidebarMenuButtonVariants = (
  options: SidebarMenuButtonVariants = {},
): string =>
  className(
    reset.button,
    styles.menuButton,
    options.variant === 'outline' && styles.menuButtonOutline,
    options.variant === 'primary' && styles.menuButtonPrimary,
    menuSizes[options.size ?? 'default'],
  )
export type SidebarMenuButtonProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  onClick?: Msg
  ariaExpanded?: boolean
  href?: string
  isActive?: boolean
  variant?: SidebarMenuButtonVariants['variant']
  size?: SidebarMenuButtonVariants['size']
  /* TW 'font-medium' class override (sidebar-03/04 group titles). */
  weight?: 'medium'
  tooltip?: string
  layoutStyle?: ComponentLayoutStyle
}>
export const sidebarMenuButton = <Msg>(
  props: SidebarMenuButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'default'
  const attributes = [
    h.DataAttribute('slot', 'sidebar-menu-button'),
    h.DataAttribute('sidebar', 'menu-button'),
    h.DataAttribute('size', size),
    ...(props.isActive === true
      ? [
          h.DataAttribute('active', ''),
          ...(props.href === undefined ? [] : [h.AriaCurrent('page')]),
        ]
      : []),
    ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
    ...(props.ariaExpanded === undefined
      ? []
      : [h.AriaExpanded(props.ariaExpanded)]),
    h.Class(
      className(
        reset.button,
        styles.menuButton,
        props.variant === 'outline' && styles.menuButtonOutline,
        props.variant === 'primary' && styles.menuButtonPrimary,
        menuSizes[size],
        props.isActive === true && styles.menuButtonActive,
        props.weight === 'medium' && styles.menuButtonMedium,
        props.layoutStyle,
      ),
    ),
  ]
  const children = [
    ...props.children,
    ...(props.tooltip === undefined
      ? []
      : [
          h.span(
            [h.Role('tooltip'), h.Class(className(styles.tooltip))],
            [props.tooltip],
          ),
        ]),
  ]
  return props.href === undefined
    ? h.button(
        [
          h.Class(className(reset.button)),
          ...attributes,
          h.Type('button'),
          ...(props.tooltip === undefined
            ? []
            : [h.Title(props.tooltip), h.AriaLabel(props.tooltip)]),
        ],
        children,
      )
    : h.a(
        [
          h.Class(className(reset.link)),
          h.Href(props.href),
          ...attributes,
          ...(props.tooltip === undefined
            ? []
            : [h.Title(props.tooltip), h.AriaLabel(props.tooltip)]),
        ],
        children,
      )
}

/** Keep label text in the DOM (and accessible name) during icon collapse. */
export const sidebarMenuLabel = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'sidebar-menu-label'),
      h.Class(className(styles.menuLabel, props.layoutStyle)),
    ],
    [...props.children],
  )

export type SidebarMenuActionProps<Msg> = SidebarActionProps<Msg> &
  Readonly<{ showOnHover?: boolean }>
export const sidebarMenuAction = <Msg>(
  props: SidebarMenuActionProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.DataAttribute('slot', 'sidebar-menu-action'),
      h.DataAttribute('sidebar', 'menu-action'),
      ...((props.showOnHover ?? false)
        ? [h.DataAttribute('show-on-hover', '')]
        : []),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
      h.Type('button'),
      h.Class(
        className(
          reset.button,
          styles.menuAction,
          props.showOnHover === true && styles.menuActionHover,
          /* marker so menuButton's siblingAfter pr-8 rule can see us */
          sidebarScope,
          props.layoutStyle,
        ),
      ),
    ],
    [
      h.span([h.AriaHidden(true), h.Class(className(styles.actionHalo))], []),
      ...props.children,
    ],
  )
export const sidebarMenuBadge = slotDiv(
  'sidebar-menu-badge',
  'menu-badge',
  styles.badge,
)
export type SidebarMenuSkeletonProps = Readonly<{
  showIcon?: boolean
  widthPercent?: number
  layoutStyle?: ComponentLayoutStyle
}>
export const sidebarMenuSkeleton = <Msg>(
  props: SidebarMenuSkeletonProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const widthPercent = Math.min(90, Math.max(50, props.widthPercent ?? 70))
  return h.div(
    [
      h.DataAttribute('slot', 'sidebar-menu-skeleton'),
      h.DataAttribute('sidebar', 'menu-skeleton'),
      h.Class(className(styles.skeleton, props.layoutStyle)),
    ],
    [
      ...((props.showIcon ?? false)
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'skeleton'),
                h.DataAttribute('sidebar', 'menu-skeleton-icon'),
                h.Class(className(styles.skeletonIcon)),
              ],
              [],
            ),
          ]
        : []),
      h.div(
        [
          h.DataAttribute('slot', 'skeleton'),
          h.DataAttribute('sidebar', 'menu-skeleton-text'),
          h.Style({ '--skeleton-width': `${widthPercent}%` }),
          h.Class(className(styles.skeletonText)),
        ],
        [],
      ),
    ],
  )
}
export type SidebarMenuSubProps = Slot & Readonly<{ variant?: 'flat' }>
export const sidebarMenuSub = <Msg>(
  props: SidebarMenuSubProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.ul(
    [
      h.DataAttribute('slot', 'sidebar-menu-sub'),
      h.DataAttribute('sidebar', 'menu-sub'),
      h.Class(
        className(
          reset.list,
          styles.sub,
          props.variant === 'flat' && styles.subFlat,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
export const sidebarMenuSubItem = <Msg>(
  props: Slot,
  h: HtmlBuilder<Msg>,
): Html =>
  h.li(
    [
      h.DataAttribute('slot', 'sidebar-menu-sub-item'),
      h.DataAttribute('sidebar', 'menu-sub-item'),
      h.Class(className(styles.menuItem, props.layoutStyle)),
    ],
    [...props.children],
  )
export type SidebarMenuSubButtonProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  href?: string
  onClick?: Msg
  size?: 'sm' | 'md'
  isActive?: boolean
  layoutStyle?: ComponentLayoutStyle
}>
export const sidebarMenuSubButton = <Msg>(
  props: SidebarMenuSubButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'
  return h.a(
    [
      h.DataAttribute('slot', 'sidebar-menu-sub-button'),
      h.DataAttribute('sidebar', 'menu-sub-button'),
      h.DataAttribute('size', size),
      ...(props.isActive === true
        ? [
            h.DataAttribute('active', ''),
            ...(props.href === undefined ? [] : [h.AriaCurrent('page')]),
          ]
        : []),
      ...(props.href === undefined ? [] : [h.Href(props.href)]),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
      h.Class(
        className(
          reset.link,
          styles.subButton,
          size === 'sm' ? styles.subSm : styles.subMd,
          props.isActive === true && styles.subButtonActive,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
}
