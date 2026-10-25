import { Style, When, Global } from '@pleat/core'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import { sidebarScope } from './sidebar.markers'
import { complexTokens } from './complex-tokens'
import { foundationTokens } from './foundations-tokens'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'

export * from '@/lib/sidebar-state'

export type SidebarState = 'expanded' | 'collapsed'
export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'
type Slot = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const pulse = Global.keyframes('sidebar-pulse', { '50%': { opacity: 0.5 } })
const styles = {
  action: Style.make({
    padding: 0,
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    aspectRatio: '1 / 1',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    justifyContent: 'center',
    outlineStyle: 'none',
    position: 'absolute',
    right: '0.75rem',
    top: '0.875rem',
    width: '1.25rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      display: 'none',
    }),
  ),
  backdrop: Style.make({
    backgroundColor: complexTokens.overlaySurface,
    display: 'block',
    opacity: 0.5,
    position: 'fixed',
    zIndex: 40,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }).pipe(Style.when(When.minWidth('768px'), { display: 'none' })),
  badge: Style.make({
    borderRadius: tokens.controlRadius,
    paddingInline: '0.25rem',
    alignItems: 'center',
    color: complexTokens.sidebarForeground,
    display: 'flex',
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
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      display: 'none',
    }),
  ),
  actionHalo: Style.make({
    inset: '-0.5rem',
    display: 'block',
    position: 'absolute',
  }).pipe(Style.when(When.minWidth('768px'), { display: 'none' })),
  collapsedIcon: Style.make({
    overflow: 'hidden',
    width: 'var(--sidebar-width-icon)',
  }),
  collapsedOffcanvas: Style.make({ transform: 'translateX(-100%)' }),
  collapsedOffcanvasRight: Style.make({ transform: 'translateX(100%)' }),
  content: Style.make({
    gap: '0.5rem',
    overflow: 'auto',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    minHeight: 0,
  }),
  footer: Style.make({
    padding: '0.5rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  group: Style.make({
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  }),
  groupFirst: Style.make({ paddingBottom: '0.25rem' }),
  groupLater: Style.make({ paddingTop: '0.5rem' }),
  groupContent: Style.make({
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    width: '100%',
  }),
  groupLabel: Style.make({
    borderRadius: tokens.controlRadius,
    paddingInline: '0.5rem',
    alignItems: 'center',
    color: `color-mix(in oklab, ${complexTokens.sidebarForeground} 70%, transparent)`,
    display: 'flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    opacity: 1,
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionDrawer,
    transitionProperty: 'margin, opacity',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    height: '2rem',
    marginTop: 0,
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      opacity: 0,
      marginTop: '-2rem',
    }),
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  header: Style.make({
    padding: '0.5rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  inset: Style.make({
    backgroundColor: tokens.background,
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    position: 'relative',
    width: '100%',
  }),
  insetVariant: Style.make({
    margin: 0,
    boxShadow: tokens.shadowNone,
    marginLeft: 0,
  }).pipe(
    Style.when(When.minWidth('768px'), {
      margin: '0.5rem',
      borderRadius: foundationTokens.radiusXl,
      boxShadow: foundationTokens.shadowSm,
      marginLeft: 0,
    }),
  ),
  insetVariantCollapsed: Style.make({ marginLeft: 0 }).pipe(
    Style.when(When.minWidth('768px'), { marginLeft: '0.5rem' }),
  ),
  inner: Style.make({
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  }),
  innerFloating: Style.make({
    borderColor: complexTokens.sidebarBorder,
    borderRadius: tokens.radius,
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: foundationTokens.shadowSm,
  }),
  input: Style.make({
    borderColor: tokens.input,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: '0.25rem',
    paddingInline: '0.625rem',
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowNone,
    display: 'flex',
    fontSize: '1rem',
    lineHeight: '1.5rem',
    outlineStyle: 'none',
    height: '2rem',
    minWidth: 0,
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
    Style.when(When.minWidth('768px'), {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    }),
  ),
  menu: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    width: '100%',
  }),
  menuLoose: Style.make({ gap: '0.5rem' }),
  menuAction: Style.make({
    padding: 0,
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    justifyContent: 'center',
    outlineStyle: 'none',
    position: 'absolute',
    height: '1.25rem',
    right: '0.25rem',
    top: '0.375rem',
    width: '1.25rem',
  }).pipe(
    Style.when(When.hover, { backgroundColor: complexTokens.sidebarAccent }),
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      display: 'none',
    }),
  ),
  menuActionHover: Style.make({ opacity: 0 }).pipe(
    Style.when(When.focusVisible, { opacity: 1 }),
    Style.when(When.hover, { opacity: 1 }),
  ),
  menuButton: Style.make({
    padding: '0.5rem',
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    outlineStyle: 'none',
    textAlign: 'left',
    transitionDuration: interactionTokens.motionDrawer,
    transitionProperty: 'width, height, padding',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    whiteSpace: 'nowrap',
    width: '100%',
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      padding: 0,
      gap: 0,
      justifyContent: 'center',
      width: '2rem',
    }),
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
    Style.when(When.active, { backgroundColor: complexTokens.sidebarAccent }),
    Style.when(
      When.pseudo(
        `:has(~ .${sidebarScope.className}[data-sidebar="menu-action"])`,
      ),
      { paddingInlineEnd: '2rem' },
    ),
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  menuButtonActive: Style.make({
    backgroundColor: complexTokens.sidebarAccent,
    color: complexTokens.sidebarAccentForeground,
    fontWeight: 500,
  }),
  menuButtonMedium: Style.make({ fontWeight: 500 }),
  menuButtonDefault: Style.make({
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '2rem',
  }),
  menuButtonLg: Style.make({
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '3rem',
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      height: '2rem',
    }),
  ),
  menuButtonOutline: Style.make({
    backgroundColor: tokens.background,
    boxShadow: complexTokens.sidebarEdgeRing,
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      boxShadow: complexTokens.sidebarAccentRing,
    }),
  ),
  menuButtonPrimary: Style.make({
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.primaryHover,
      color: tokens.primaryForeground,
    }),
  ),
  menuButtonSm: Style.make({
    fontSize: '0.75rem',
    lineHeight: '1rem',
    height: '1.75rem',
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      height: '2rem',
    }),
  ),
  menuLabel: Style.make({
    overflow: 'hidden',
    opacity: 1,
    textOverflow: 'ellipsis',
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'opacity',
    whiteSpace: 'nowrap',
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      opacity: 0,
    }),
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  menuItem: Style.make({ position: 'relative' }),
  mobile: Style.make({
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 50,
    bottom: 0,
    maxWidth: 'calc(100vw - 2rem)',
    top: 0,
    width: 'var(--sidebar-width-mobile)',
  }).pipe(Style.when(When.minWidth('768px'), { display: 'none' })),
  mobileClose: Style.make({
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'inline-flex',
    justifyContent: 'center',
    position: 'absolute',
    height: '2rem',
    right: '0.5rem',
    top: '0.5rem',
    width: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
    Style.when(When.minWidth('768px'), { display: 'none' }),
  ),
  panel: Style.make({
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: 'var(--sidebar-width)',
  }),
  panelTransparent: Style.make({ backgroundColor: tokens.transparent }),
  rail: Style.make({
    backgroundPosition: 'center',
    backgroundImage: 'none',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '2px 100%',
    cursor: interactionTokens.cursorResizeHorizontal,
    display: 'none',
    position: 'absolute',
    transform: 'translateX(-50%)',
    zIndex: 20,
    bottom: 0,
    right: '-1rem',
    top: 0,
    width: '1rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundImage: `linear-gradient(${complexTokens.sidebarBorder}, ${complexTokens.sidebarBorder})`,
    }),
    Style.when(When.minWidth('640px'), { display: 'flex' }),
    Style.when(When.after, {
      backgroundColor: 'transparent',
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: '50%',
      top: 0,
      width: '2px',
    }),
  ),
  right: Style.make({ left: 'auto', right: 0 }),
  root: Style.make({ color: complexTokens.sidebarForeground }),
  sidebarGap: Style.make({
    backgroundColor: tokens.transparent,
    display: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionDrawer,
    transitionProperty: 'width',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    width: 'var(--sidebar-width)',
  }).pipe(
    Style.when(When.minWidth('768px'), { display: 'block' }),
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  sidebarGapCollapsedIcon: Style.make({ width: 'var(--sidebar-width-icon)' }),
  sidebarGapCollapsedFloating: Style.make({
    width: 'calc(var(--sidebar-width-icon) + 1rem)',
  }),
  sidebarGapCollapsedOffcanvas: Style.make({ width: 0 }),
  separator: Style.make({
    marginInline: '0.5rem',
    backgroundColor: complexTokens.sidebarBorder,
    flexShrink: 0,
    height: 1,
  }),
  sidebarContainer: Style.make({
    display: 'none',
    position: 'fixed',
    transitionDuration: interactionTokens.motionDrawer,
    transitionProperty: 'left, right, width, transform',
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
    zIndex: 10,
    bottom: 0,
    height: '100svh',
    left: 0,
    top: 0,
    width: 'var(--sidebar-width)',
  }).pipe(
    Style.when(When.minWidth('768px'), { display: 'flex' }),
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  sidebarBelowHeader: Style.make({
    height: 'calc(100svh - 3.5rem)',
    top: '3.5rem',
  }),
  wrapperBelowHeader: Style.make({ minHeight: 'calc(100svh - 3.5rem)' }),
  sidebarContainerContained: Style.make({
    position: 'absolute',
    height: '100%',
  }),
  sidebarContainerFloating: Style.make({ padding: '0.5rem' }),
  sidebarContainerFloatingCollapsed: Style.make({
    width: 'calc(var(--sidebar-width-icon) + 1rem)',
  }),
  skeleton: Style.make({
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    height: '2rem',
  }),
  skeletonIcon: Style.make({
    borderRadius: tokens.controlRadius,
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: pulse,
    animationTimingFunction: interactionTokens.easingPulse,
    backgroundColor: complexTokens.sidebarAccent,
    height: '1rem',
    width: '1rem',
  }),
  skeletonText: Style.make({
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
  }),
  srOnly: Style.make({
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  }),
  sub: Style.make({
    gap: '0.25rem',
    marginInline: '0.875rem',
    paddingBlock: '0.125rem',
    paddingInline: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateX(1px)',
    borderLeftColor: complexTokens.sidebarBorder,
    borderLeftStyle: 'solid',
    borderLeftWidth: 1,
    minWidth: 0,
  }).pipe(
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      display: 'none',
    }),
  ),
  subButton: Style.make({
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    overflow: 'hidden',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    outlineStyle: 'none',
    textDecorationLine: 'none',
    transform: 'translateX(-1px)',
    height: '1.75rem',
    minWidth: 0,
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
  ),
  subButtonActive: Style.make({
    backgroundColor: complexTokens.sidebarAccent,
    color: complexTokens.sidebarAccentForeground,
  }),
  containerBorderLeft: Style.make({
    borderLeftColor: complexTokens.sidebarBorder,
    borderLeftStyle: 'solid',
    borderLeftWidth: 1,
  }),
  containerBorderRight: Style.make({
    borderRightColor: complexTokens.sidebarBorder,
    borderRightStyle: 'solid',
    borderRightWidth: 1,
  }),
  subFlat: Style.make({
    paddingInline: '0.375rem',
    marginInlineStart: 0,
    borderLeftWidth: 0,
  }),
  subMd: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  subSm: Style.make({ fontSize: '0.75rem', lineHeight: '1rem' }),
  trigger: Style.make({
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundClip: 'padding-box',
    backgroundColor: tokens.transparent,
    color: 'inherit',
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
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
  ),
  triggerIcon: Style.make({ flexShrink: 0, height: '1rem', width: '1rem' }),
  railRight: Style.make({ left: 0, right: 'auto' }),
  tooltip: Style.make({
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
  }),
  triggerDesktop: Style.make({ display: 'none' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'inline-flex' }),
  ),
  triggerMobile: Style.make({ display: 'inline-flex' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'none' }),
  ),
  triggerWrapper: Style.make({ display: 'block' }),
  wrapper: Style.make({
    backgroundColor: tokens.transparent,
    display: 'flex',
    minHeight: '100svh',
    width: '100%',
  }),
}

const slotDiv =
  (slot: string, sidebarPart: string, base: Style.Style) =>
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
  layoutStyle?: ComponentLayoutStyle | undefined
  iconStyle?: Style.Style | undefined
}>
export const sidebarTrigger = <Msg>(
  props: SidebarTriggerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const trigger = (onClick: Msg, visibility?: Style.Style): Html =>
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
  layoutStyle?: ComponentLayoutStyle | undefined
  inputStyle?: Style.Style | undefined
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
  props: Readonly<{ layoutStyle?: ComponentLayoutStyle | undefined }> = {},
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
