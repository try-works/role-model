const styles = stylex.create({
  overlay: {
    position: {
      default: 'fixed',
      /* iOS Safari: 'supports-[-webkit-touch-callout:none]:absolute' —
         fixed overlays misbehave inside the visual viewport there. */
      '@supports (-webkit-touch-callout: none)': 'absolute',
    },
    inset: 0,
    zIndex: 50,
    minHeight: '100dvh',
    backgroundColor: tokens.drawerBackdrop,
    backdropFilter: 'blur(2px)',
    userSelect: 'none',
    pointerEvents: { default: 'auto', ':is([data-leave])': 'none' },
    opacity: {
      default:
        'max(var(--drawer-overlay-min-opacity, 0), calc(1 - var(--drawer-swipe-progress)))',
      ':is([data-closed])': 0,
      ':is([data-leave])': 0,
    },
    transitionProperty: {
      default: 'opacity',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionDuration: {
      default: interactionTokens.motionDrawer,
      ':is([data-swiping])': interactionTokens.motionNone,
      ':is([data-leave])': interactionTokens.motionDrawerRelease,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionTimingFunction: interactionTokens.easingDrawerOverlay,
  },
  viewport: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  popup: {
    pointerEvents: 'auto',
    position: 'fixed',
    zIndex: 50,
    margin: 'var(--drawer-inset, 0px)',
    display: 'flex',
    flexDirection: 'column',
    height: 'var(--drawer-content-height)',
    maxHeight: 'var(--drawer-content-max-height, none)',
    minHeight: 0,
    minWidth: 0,
    width: 'var(--drawer-content-width, auto)',
    backgroundColor: foundationTokens.popover,
    color: foundationTokens.popoverForeground,
    fontSize: '0.875rem',
    outlineStyle: 'none',
    userSelect: 'none',
    willChange: 'transform',
    // Animates height changes between snap points (Tailwind's
    // [interpolate-size:allow-keywords] arbitrary class).
    interpolateSize: 'allow-keywords',
    transform: {
      default:
        'translate3d(var(--translate-x, 0px), var(--translate-y, 0px), 0) scale(var(--stack-scale))',
      ':is([data-closed])': 'var(--closed-transform)',
      ':is([data-leave])': 'var(--closed-transform)',
    },
    opacity: { default: 1, ':is([data-leave])': 0.9999 },
    overflowX: 'clip',
    overflowY: {
      default: 'visible',
      ':is([data-nested-drawer-open])': 'hidden',
    },
    filter: {
      default: 'none',
      ':is([data-nested-drawer-open])': 'brightness(0.95)',
    },
    transitionProperty: {
      default: 'transform, height, opacity, filter',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionDuration: {
      default: interactionTokens.motionDrawer,
      ':is([data-swiping])': interactionTokens.motionNone,
      ':is([data-nested-drawer-swiping])': interactionTokens.motionNone,
      ':is([data-leave])': interactionTokens.motionDrawerRelease,
      ':is([data-leave][data-swiping])': interactionTokens.motionDrawerRelease,
      ':is([data-leave][data-nested-drawer-swiping])':
        interactionTokens.motionDrawerRelease,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
  },
  popupRow: { flexDirection: 'row' },
  popupSizingX: {
    width: { default: '75%', '@media (min-width: 40rem)': '24rem' },
  },
  popupNestedHeight: {
    height: {
      default: 'var(--drawer-content-height)',
      ':is([data-nested-drawer-open])': 'var(--stack-height)',
    },
  },
  popupDown: {
    bottom: 0,
    left: 0,
    right: 0,
    transformOrigin: 'bottom',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: tokens.border,
    borderTopLeftRadius: foundationTokens.radiusXl,
    borderTopRightRadius: foundationTokens.radiusXl,
  },
  popupUp: {
    top: 0,
    left: 0,
    right: 0,
    transformOrigin: 'top',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
    borderBottomLeftRadius: foundationTokens.radiusXl,
    borderBottomRightRadius: foundationTokens.radiusXl,
  },
  popupLeft: {
    left: 0,
    top: 0,
    bottom: 0,
    transformOrigin: 'left',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: tokens.border,
    borderTopRightRadius: foundationTokens.radiusXl,
    borderBottomRightRadius: foundationTokens.radiusXl,
  },
  popupRight: {
    right: 0,
    top: 0,
    bottom: 0,
    transformOrigin: 'right',
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.border,
    borderTopLeftRadius: foundationTokens.radiusXl,
    borderBottomLeftRadius: foundationTokens.radiusXl,
  },
  bleedDown: {
    '::after': {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: 'var(--drawer-bleed-background, var(--popover))',
      insetInlineStart: 0,
      insetInlineEnd: 0,
      height: 'var(--bleed)',
      top: '100%',
    },
  },
  bleedUp: {
    '::after': {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: 'var(--drawer-bleed-background, var(--popover))',
      insetInlineStart: 0,
      insetInlineEnd: 0,
      height: 'var(--bleed)',
      bottom: '100%',
    },
  },
  bleedLeft: {
    '::after': {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: 'var(--drawer-bleed-background, var(--popover))',
      insetBlockStart: 0,
      insetBlockEnd: 0,
      width: 'var(--bleed)',
      right: '100%',
    },
  },
  bleedRight: {
    '::after': {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: 'var(--drawer-bleed-background, var(--popover))',
      insetBlockStart: 0,
      insetBlockEnd: 0,
      width: 'var(--bleed)',
      left: '100%',
    },
  },
  handle: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexShrink: 0,
    touchAction: 'none',
    cursor: {
      default: interactionTokens.cursorGrab,
      ':active': interactionTokens.cursorGrabbing,
    },
    opacity: 1,
    transitionProperty: {
      default: 'opacity',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionDuration: interactionTokens.motionModerate,
    '::after': {
      content: '""',
      display: 'block',
      flexShrink: 0,
      borderRadius: foundationTokens.radiusFull,
      backgroundColor: foundationTokens.mutedForeground50,
    },
  },
  handleDimmed: { opacity: 0 },
  handleAxisY: {
    height: '1.5rem',
    width: '100%',
    justifyContent: 'center',
    '::after': { height: '0.25rem', width: '3rem' },
  },
  handleAxisX: {
    height: '100%',
    width: '1.5rem',
    alignItems: 'center',
    '::after': { height: '3rem', width: '0.25rem' },
  },
  handleDown: { alignItems: 'flex-end' },
  handleUp: { alignItems: 'flex-start' },
  handleLeft: { justifyContent: 'flex-start' },
  handleRight: { justifyContent: 'flex-end' },
  handleOrderLast: { order: 9999 },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowX: 'hidden',
    overflowY: 'hidden',
    overscrollBehavior: 'contain',
    borderRadius: 'inherit',
    userSelect: 'text',
    opacity: 1,
    transitionProperty: {
      default: 'opacity',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionDuration: {
      default: interactionTokens.motionSlow,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionTimingFunction: interactionTokens.easingDrawerContent,
  },
  contentDimmed: { opacity: 0 },
  contentSwiping: { userSelect: 'none' },
  header: {
    display: 'flex',
    flexShrink: 0,
    flexDirection: 'column',
    gap: '0.125rem',
    padding: '1rem',
    paddingBottom: 0,
  },
  headerCentered: {
    textAlign: {
      default: 'center',
      '@media (min-width: 48rem)': 'left',
    },
  },
  footer: {
    marginTop: 'auto',
    display: 'flex',
    flexShrink: 0,
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem',
    paddingTop: 0,
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 500,
    color: tokens.foreground,
  },
  description: {
    margin: 0,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
    textWrap: 'balance',
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as DrawerBehavior from '@/lib/drawer'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import { overlayStyles } from './overlay-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'

export const Model = DrawerBehavior.Model
export type Model = typeof Model.Type
export const GotDialogMessage = DrawerBehavior.Message.GotDrawerDialogMessage
export const StartedSwipe = DrawerBehavior.Message.StartedSwipe
export const DraggedSwipe = DrawerBehavior.Message.DraggedSwipe
export const EndedSwipe = DrawerBehavior.Message.EndedSwipe
export const CancelledSwipe = DrawerBehavior.Message.CancelledSwipe
export const Message = DrawerBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = DrawerBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = DrawerBehavior.init
export const update = DrawerBehavior.update
export const open = DrawerBehavior.open
export const close = DrawerBehavior.close
export const snapTo = DrawerBehavior.snapTo

/** Base UI's swipe-ignore surface: interactive controls + explicit ignores
    (`BASE_UI_SWIPE_IGNORE_SELECTOR` + `DEFAULT_IGNORE_SELECTOR`). */
const SWIPE_IGNORE_SELECTOR =
  '[data-base-ui-swipe-ignore], button, a, input, select, textarea, label, [role="button"]'
const DRAWER_CONTENT_SELECTOR = '[data-drawer-content]'

export type DrawerSlots = Readonly<{
  closeButton: ReadonlyArray<ChildAttribute>
  /** Attributes making an element the initial focus target. When not
      claimed, the popup itself receives initial focus (Base UI). */
  initialFocusAttributes: () => ReadonlyArray<ChildAttribute>
}>

export type DrawerProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  title: string
  description?: string
  content?: (slots: DrawerSlots) => ReadonlyArray<Html>
  footer?: (slots: DrawerSlots) => ReadonlyArray<Html>
  /** Shows the swipe handle by default; set false to hide it. */
  showSwipeHandle?: boolean
  layoutStyle?: ComponentLayoutStyle
}>

/** foldkit animation data attributes for elements that skip the dialog's
    `backdrop`/`panel` attr groups (e.g. a non-dismissible overlay). */
const animationAttributes = <Msg>(
  hd: HtmlBuilder<Msg>,
  transitionState: string,
): ReadonlyArray<Attribute<Msg>> => {
  switch (transitionState) {
    case 'EnterStart':
      return [
        hd.DataAttribute('closed', ''),
        hd.DataAttribute('enter', ''),
        hd.DataAttribute('transition', ''),
      ]
    case 'EnterAnimating':
      return [hd.DataAttribute('enter', ''), hd.DataAttribute('transition', '')]
    case 'LeaveStart':
      return [hd.DataAttribute('leave', ''), hd.DataAttribute('transition', '')]
    case 'LeaveAnimating':
      return [
        hd.DataAttribute('closed', ''),
        hd.DataAttribute('leave', ''),
        hd.DataAttribute('transition', ''),
      ]
    default:
      return []
  }
}

const swipeAxis = (direction: DrawerBehavior.SwipeDirection): 'x' | 'y' =>
  direction === 'down' || direction === 'up' ? 'y' : 'x'

/** Popup inline style: the CSS custom properties Base UI writes imperatively
    — rendered declaratively from the model here. Static plumbing vars
    (translate/stack/bleed/sizing) also live here because they only depend on
    the fixed swipe direction. */
const popupStyle = (model: Model): Record<string, string> => {
  const movement = DrawerBehavior.swipeMovement(model)
  const snapOffset = DrawerBehavior.snapPointOffsetFor(model)
  const nestedCount = Object.keys(model.nestedDrawerHeights).length
  const leaving =
    model.dialog.animation.transitionState === 'LeaveStart' ||
    model.dialog.animation.transitionState === 'LeaveAnimating'
  const direction = model.swipeDirection
  const hasSnapPoints = model.snapPoints.length > 0
  const closedTransform = {
    down: 'translate3d(0, calc(100% + var(--drawer-inset, 0px) + 2px), 0)',
    up: 'translate3d(0, calc(-100% - var(--drawer-inset, 0px) - 2px), 0)',
    left: 'translate3d(calc(-100% - var(--drawer-inset, 0px) - 2px), 0, 0)',
    right: 'translate3d(calc(100% + var(--drawer-inset, 0px) + 2px), 0, 0)',
  }[direction]
  const translate = {
    down: {
      '--translate-y':
        'calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y) - var(--stack-peek-offset) - (var(--stack-shrink) * var(--stack-height)))',
    },
    up: {
      '--translate-y':
        'calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y) + var(--stack-peek-offset) + (var(--stack-shrink) * var(--stack-height)))',
    },
    left: {
      '--translate-x':
        'calc(var(--drawer-swipe-movement-x) + var(--stack-peek-offset) + (var(--stack-shrink) * 100%))',
    },
    right: {
      '--translate-x':
        'calc(var(--drawer-swipe-movement-x) - var(--stack-peek-offset) - (var(--stack-shrink) * 100%))',
    },
  }[direction]
  return {
    '--bleed': '3rem',
    '--peek': '1rem',
    '--stack-step': '0.05',
    '--stack-height':
      'var(--drawer-frontmost-height, var(--drawer-height, 0px))',
    '--stack-progress': 'clamp(0, var(--drawer-swipe-progress), 1)',
    '--stack-peek-offset':
      'max(0px, calc((var(--nested-drawers) - var(--stack-progress)) * var(--peek)))',
    '--stack-scale-base':
      'max(0, calc(1 - (var(--nested-drawers) * var(--stack-step))))',
    '--stack-scale':
      'clamp(0, calc(var(--stack-scale-base) + (var(--stack-step) * var(--stack-progress))), 1)',
    '--stack-shrink': 'calc(1 - var(--stack-scale))',
    '--drawer-content-height':
      swipeAxis(direction) === 'y' && hasSnapPoints
        ? '100dvh'
        : 'var(--drawer-height, auto)',
    '--drawer-content-max-height':
      swipeAxis(direction) === 'y' ? 'calc(100dvh - 6rem)' : 'none',
    '--closed-transform': closedTransform,
    ...translate,
    '--drawer-swipe-movement-x': `${String(movement.x)}px`,
    '--drawer-swipe-movement-y': `${String(movement.y)}px`,
    '--drawer-snap-point-offset': `${String(snapOffset ?? 0)}px`,
    '--drawer-swipe-progress': String(
      nestedCount > 0 ? model.nestedSwipeProgress : model.swipeProgress,
    ),
    '--drawer-swipe-strength': Option.getOrElse(
      model.swipeStrength,
      () => 1,
    ).toString(),
    '--nested-drawers': String(nestedCount),
    ...(model.popupHeight > 0 && (nestedCount > 0 || leaving)
      ? { '--drawer-height': `${String(model.popupHeight)}px` }
      : {}),
    ...(model.nestedSwipeProgress > 0 || nestedCount > 0
      ? {
          '--drawer-frontmost-height': `${String(
            DrawerBehavior.frontmostNestedHeight(model),
          )}px`,
        }
      : {}),
  }
}

const overlayStyle = (model: Model): Record<string, string> => {
  const nestedCount = Object.keys(model.nestedDrawerHeights).length
  const progress =
    nestedCount > 0 ? model.nestedSwipeProgress : model.swipeProgress
  return {
    '--drawer-swipe-progress': String(progress),
    ...(model.snapPoints.length > 0
      ? { '--drawer-overlay-min-opacity': '0.5' }
      : {}),
    ...(progress > 0 && DrawerBehavior.frontmostNestedHeight(model) > 0
      ? {
          '--drawer-height': `${String(
            DrawerBehavior.frontmostNestedHeight(model),
          )}px`,
        }
      : {}),
  }
}

export const drawer = <Msg>(
  props: DrawerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const send = props.toParentMessage
  const direction = model.swipeDirection
  const axis = swipeAxis(direction)
  const hasSnapPoints = model.snapPoints.length > 0
  const swiping = model.swipe.phase === 'Swiping'
  const nestedOpen = DrawerBehavior.nestedDrawerOpen(model)
  const expanded = DrawerBehavior.isExpanded(model)
  const modal = model.modal

  const startSwipe = (
    pointerType: string,
    button: number,
    screenX: number,
    screenY: number,
    timeStamp: number,
    _clientX: number,
    _clientY: number,
    _pointerId: number,
    target: EventTarget | null,
  ): Option.Option<Msg> => {
    if (button !== 0) return Option.none()
    if (target instanceof Element) {
      // Swipes only start inside the popup (Base UI's canStart requires the
      // pointer target to be contained in the popup element).
      if (target.closest('[data-slot="drawer-popup"]') === null) {
        return Option.none()
      }
      if (target.closest(SWIPE_IGNORE_SELECTOR) !== null) return Option.none()
      // Mouse drags never start inside the scrollable content region; touch
      // swipes may (Base UI arbitrates against scroll at runtime).
      if (
        pointerType !== 'touch' &&
        target.closest(DRAWER_CONTENT_SELECTOR) !== null
      ) {
        return Option.none()
      }
    }
    return Option.some(
      send(StartedSwipe({ x: screenX, y: screenY, timeStamp })),
    )
  }

  const viewportGestureAttributes = (
    hd: HtmlBuilder<Msg>,
  ): ReadonlyArray<Attribute<Msg>> => [
    hd.OnPointerDown(startSwipe),
    ...(swiping
      ? [
          hd.OnPointerMove((screenX, screenY, _pointerType) =>
            Option.some(
              send(
                DraggedSwipe({
                  x: screenX,
                  y: screenY,
                  timeStamp: performance.now(),
                }),
              ),
            ),
          ),
          hd.OnPointerUp((screenX, screenY, _pointerType, timeStamp) =>
            Option.some(
              send(EndedSwipe({ x: screenX, y: screenY, timeStamp })),
            ),
          ),
          hd.OnPointerLeave(() => Option.some(send(CancelledSwipe()))),
        ]
      : []),
  ]

  const directionStyle = {
    down: styles.popupDown,
    up: styles.popupUp,
    left: styles.popupLeft,
    right: styles.popupRight,
  }[direction]
  const bleedStyle = {
    down: styles.bleedDown,
    up: styles.bleedUp,
    left: styles.bleedLeft,
    right: styles.bleedRight,
  }[direction]
  const handleDirectionStyle = {
    down: styles.handleDown,
    up: styles.handleUp,
    left: styles.handleLeft,
    right: styles.handleRight,
  }[direction]
  const handleOrderedLast = direction === 'left' || direction === 'up'

  return h.div(
    [h.DataAttribute('slot', 'drawer-root')],
    [
      h.submodel({
        slotId: model.dialog.id,
        model: model.dialog,
        view: DialogPrimitive.view,
        viewInputs: {
          hasDescription: props.description !== undefined,
          toView: ({
            dialog: dialogAttributes,
            backdrop,
            panel,
            title,
            description,
            initialFocus,
            closeButton,
            isVisible,
          }: DialogPrimitive.RenderInfo) => {
            const hd = h
            const focusRef = { claimed: false }
            const slots: DrawerSlots = {
              closeButton,
              initialFocusAttributes: () => {
                focusRef.claimed = true
                return initialFocus
              },
            }
            // Evaluate the consumer's body first so an initial-focus claim
            // inside it lands before the popup fallback is built below.
            const contentChildren = props.content?.(slots) ?? []
            const footerChildren = props.footer?.(slots)
            const popupFocusAttributes: ReadonlyArray<
              Attribute<Msg> | ChildAttribute
            > = focusRef.claimed
              ? []
              : [...initialFocus, hd.Attribute('tabindex', '-1')]
            return hd.dialog(
              [
                ...dialogAttributes,
                hd.DataAttribute('slot', 'drawer'),
                hd.Class(className(overlayStyles.dialog)),
                ...(modal === false
                  ? [
                      hd.Style({ pointerEvents: 'none' }),
                      // Replaces the primitive's AcquireResources mount (one
                      // OnMount per vnode — last wins), so a non-modal
                      // drawer never installs modal top-layer resources,
                      // inert or scroll-lock. Present from the first render:
                      // OnMount only fires when the element inserts, and this
                      // <dialog> persists across open/close, so a mount added
                      // at open time would never attach. Escape while closed
                      // is a RequestedClose no-op.
                      hd.OnMount(
                        Mount.mapMessage(
                          DrawerBehavior.ObserveNonModalEscape(),
                          message => send(message),
                        ),
                      ),
                    ]
                  : []),
              ],
              isVisible
                ? [
                    ...(modal !== false
                      ? [
                          hd.div(
                            [
                              // Overlay renders for both modal modes; the
                              // dismiss-on-press wiring only applies for the
                              // default dismissible drawer.
                              ...(model.disablePointerDismissal ||
                              modal === 'trap-focus'
                                ? animationAttributes(
                                    hd,
                                    model.dialog.animation.transitionState,
                                  )
                                : backdrop),
                              hd.DataAttribute('slot', 'drawer-overlay'),
                              ...(hasSnapPoints
                                ? [hd.DataAttribute('snap-points', '')]
                                : []),
                              ...(swiping
                                ? [hd.DataAttribute('swiping', '')]
                                : []),
                              hd.Class(className(styles.overlay)),
                              hd.Style(overlayStyle(model)),
                            ],
                            [],
                          ),
                        ]
                      : []),
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'drawer-viewport'),
                        hd.DataAttribute('modal', String(modal)),
                        hd.Class(className(styles.viewport)),
                        hd.OnMount(
                          Mount.mapMessage(
                            DrawerBehavior.ObserveViewport(),
                            message => send(message),
                          ),
                        ),
                        ...viewportGestureAttributes(hd),
                      ],
                      [
                        hd.div(
                          [
                            ...panel,
                            ...popupFocusAttributes,
                            hd.DataAttribute('slot', 'drawer-popup'),
                            hd.DataAttribute('swipe-direction', direction),
                            hd.DataAttribute('swipe-axis', axis),
                            ...(hasSnapPoints
                              ? [hd.DataAttribute('snap-points', '')]
                              : []),
                            ...(swiping
                              ? [hd.DataAttribute('swiping', '')]
                              : []),
                            ...(expanded
                              ? [hd.DataAttribute('expanded', '')]
                              : []),
                            ...(nestedOpen
                              ? [hd.DataAttribute('nested-drawer-open', '')]
                              : []),
                            ...(model.nestedSwiping
                              ? [hd.DataAttribute('nested-drawer-swiping', '')]
                              : []),
                            ...(model.swipeDismissed
                              ? [hd.DataAttribute('swipe-dismiss', '')]
                              : []),
                            hd.Class(
                              className(
                                styles.popup,
                                directionStyle,
                                bleedStyle,
                                ...(axis === 'x'
                                  ? [styles.popupRow, styles.popupSizingX]
                                  : [styles.popupNestedHeight]),
                                props.layoutStyle,
                              ),
                            ),
                            hd.Style(popupStyle(model)),
                            hd.OnMount(
                              Mount.mapMessage(
                                DrawerBehavior.ObservePopup(),
                                message => send(message),
                              ),
                            ),
                          ],
                          [
                            ...(props.showSwipeHandle !== false
                              ? [
                                  hd.div(
                                    [
                                      hd.DataAttribute(
                                        'slot',
                                        'drawer-swipe-handle',
                                      ),
                                      hd.AriaHidden(true),
                                      hd.Class(
                                        className(
                                          styles.handle,
                                          axis === 'y'
                                            ? styles.handleAxisY
                                            : styles.handleAxisX,
                                          handleDirectionStyle,
                                          ...(handleOrderedLast
                                            ? [styles.handleOrderLast]
                                            : []),
                                          ...(nestedOpen && !model.nestedSwiping
                                            ? [styles.handleDimmed]
                                            : []),
                                        ),
                                      ),
                                    ],
                                    [],
                                  ),
                                ]
                              : []),
                            hd.div(
                              [
                                hd.DataAttribute('slot', 'drawer-content'),
                                hd.DataAttribute('drawer-content', ''),
                                hd.Class(
                                  className(
                                    styles.content,
                                    ...(nestedOpen && !model.nestedSwiping
                                      ? [styles.contentDimmed]
                                      : []),
                                    ...(swiping ? [styles.contentSwiping] : []),
                                  ),
                                ),
                                // One OnMount per element — the nested-drawer
                                // watcher lives here so it does not clobber
                                // ObservePopup's marker; its subtree still
                                // covers nested popups inside the content.
                                hd.OnMount(
                                  Mount.mapMessage(
                                    DrawerBehavior.ObserveNestedDrawers(),
                                    message => send(message),
                                  ),
                                ),
                              ],
                              [
                                hd.div(
                                  [
                                    hd.DataAttribute('slot', 'drawer-header'),
                                    hd.Class(
                                      className(
                                        styles.header,
                                        ...(axis === 'y'
                                          ? [styles.headerCentered]
                                          : []),
                                      ),
                                    ),
                                  ],
                                  [
                                    hd.h2(
                                      [
                                        ...title,
                                        hd.DataAttribute(
                                          'slot',
                                          'drawer-title',
                                        ),
                                        hd.Class(className(styles.title)),
                                      ],
                                      [props.title],
                                    ),
                                    ...(props.description === undefined
                                      ? []
                                      : [
                                          hd.p(
                                            [
                                              ...description,
                                              hd.DataAttribute(
                                                'slot',
                                                'drawer-description',
                                              ),
                                              hd.Class(
                                                className(styles.description),
                                              ),
                                            ],
                                            [props.description],
                                          ),
                                        ]),
                                  ],
                                ),
                                ...contentChildren,
                                ...(footerChildren === undefined
                                  ? []
                                  : [
                                      hd.div(
                                        [
                                          hd.DataAttribute(
                                            'slot',
                                            'drawer-footer',
                                          ),
                                          hd.Class(className(styles.footer)),
                                        ],
                                        [...footerChildren],
                                      ),
                                    ]),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ]
                : [],
            )
          },
        },
        toParentMessage: message => send(GotDialogMessage({ message })),
      }),
    ],
  )
}
