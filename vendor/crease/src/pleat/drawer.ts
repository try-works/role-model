import { Style, When } from '@pleat/core'
const styles = {
  overlay: Style.make({
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    minHeight: '100dvh',
    backgroundColor: tokens.drawerBackdrop,
    backdropFilter: 'blur(2px)',
    userSelect: 'none',
    pointerEvents: 'auto',
    opacity:
      'max(var(--drawer-overlay-min-opacity, 0), calc(1 - var(--drawer-swipe-progress)))',
    transitionProperty: 'opacity',
    transitionDuration: interactionTokens.motionDrawer,
    transitionTimingFunction: interactionTokens.easingDrawerOverlay,
  }).pipe(
    Style.when(When.supports('(-webkit-touch-callout: none)'), {
      position: 'absolute',
    }),
    Style.when(When.data('leave'), {
      pointerEvents: 'none',
      opacity: 0,
      transitionDuration: interactionTokens.motionDrawerRelease,
    }),
    Style.when(When.data('closed'), { opacity: 0 }),
    Style.when(When.reducedMotion, {
      transitionProperty: 'none',
      transitionDuration: interactionTokens.motionNone,
    }),
    Style.when(When.data('swiping'), {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  viewport: Style.make({
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    userSelect: 'none',
    pointerEvents: 'none',
  }),
  popup: Style.make({
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
    interpolateSize: 'allow-keywords',
    transform:
      'translate3d(var(--translate-x, 0px), var(--translate-y, 0px), 0) scale(var(--stack-scale))',
    opacity: 1,
    overflowX: 'clip',
    overflowY: 'visible',
    filter: 'none',
    transitionProperty: 'transform, height, opacity, filter',
    transitionDuration: interactionTokens.motionDrawer,
    transitionTimingFunction: interactionTokens.easingDrawerPopup,
  }).pipe(
    Style.when(When.data('closed'), { transform: 'var(--closed-transform)' }),
    Style.when(When.data('leave'), {
      transform: 'var(--closed-transform)',
      opacity: 0.9999,
      transitionDuration: interactionTokens.motionDrawerRelease,
    }),
    Style.when(When.data('nested-drawer-open'), {
      overflowY: 'hidden',
      filter: 'brightness(0.95)',
    }),
    Style.when(When.reducedMotion, {
      transitionProperty: 'none',
      transitionDuration: interactionTokens.motionNone,
    }),
    Style.when(When.data('swiping'), {
      transitionDuration: interactionTokens.motionNone,
    }),
    Style.when(When.data('nested-drawer-swiping'), {
      transitionDuration: interactionTokens.motionNone,
    }),
    Style.when(When.pseudo(':is([data-leave][data-swiping])'), {
      transitionDuration: interactionTokens.motionDrawerRelease,
    }),
    Style.when(When.pseudo(':is([data-leave][data-nested-drawer-swiping])'), {
      transitionDuration: interactionTokens.motionDrawerRelease,
    }),
  ),
  popupRow: Style.make({ flexDirection: 'row' }),
  popupSizingX: Style.make({ width: '75%' }).pipe(
    Style.when(When.minWidth('40rem'), { width: '24rem' }),
  ),
  popupNestedHeight: Style.make({
    height: 'var(--drawer-content-height)',
  }).pipe(
    Style.when(When.data('nested-drawer-open'), {
      height: 'var(--stack-height)',
    }),
  ),
  popupDown: Style.make({
    bottom: 0,
    left: 0,
    right: 0,
    transformOrigin: 'bottom',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: tokens.border,
    borderTopLeftRadius: foundationTokens.radiusXl,
    borderTopRightRadius: foundationTokens.radiusXl,
  }),
  popupUp: Style.make({
    top: 0,
    left: 0,
    right: 0,
    transformOrigin: 'top',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
    borderBottomLeftRadius: foundationTokens.radiusXl,
    borderBottomRightRadius: foundationTokens.radiusXl,
  }),
  popupLeft: Style.make({
    left: 0,
    top: 0,
    bottom: 0,
    transformOrigin: 'left',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: tokens.border,
    borderTopRightRadius: foundationTokens.radiusXl,
    borderBottomRightRadius: foundationTokens.radiusXl,
  }),
  popupRight: Style.make({
    right: 0,
    top: 0,
    bottom: 0,
    transformOrigin: 'right',
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.border,
    borderTopLeftRadius: foundationTokens.radiusXl,
    borderBottomLeftRadius: foundationTokens.radiusXl,
  }),
  bleedDown: Style.empty.pipe(
    Style.when(When.after, {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: drawerTokens.bleedBackground,
      insetInlineStart: 0,
      insetInlineEnd: 0,
      height: 'var(--bleed)',
      top: '100%',
    }),
  ),
  bleedUp: Style.empty.pipe(
    Style.when(When.after, {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: drawerTokens.bleedBackground,
      insetInlineStart: 0,
      insetInlineEnd: 0,
      height: 'var(--bleed)',
      bottom: '100%',
    }),
  ),
  bleedLeft: Style.empty.pipe(
    Style.when(When.after, {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: drawerTokens.bleedBackground,
      insetBlockStart: 0,
      insetBlockEnd: 0,
      width: 'var(--bleed)',
      right: '100%',
    }),
  ),
  bleedRight: Style.empty.pipe(
    Style.when(When.after, {
      content: '""',
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: drawerTokens.bleedBackground,
      insetBlockStart: 0,
      insetBlockEnd: 0,
      width: 'var(--bleed)',
      left: '100%',
    }),
  ),
  handle: Style.make({
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexShrink: 0,
    touchAction: 'none',
    cursor: interactionTokens.cursorGrab,
    opacity: 1,
    transitionProperty: 'opacity',
    transitionDuration: interactionTokens.motionModerate,
  }).pipe(
    Style.when(When.active, { cursor: interactionTokens.cursorGrabbing }),
    Style.when(When.reducedMotion, { transitionProperty: 'none' }),
    Style.when(When.after, {
      content: '""',
      display: 'block',
      flexShrink: 0,
      borderRadius: foundationTokens.radiusFull,
      backgroundColor: foundationTokens.mutedForeground50,
    }),
  ),
  handleDimmed: Style.make({ opacity: 0 }),
  handleAxisY: Style.make({
    height: '1.5rem',
    width: '100%',
    justifyContent: 'center',
  }).pipe(Style.when(When.after, { height: '0.25rem', width: '3rem' })),
  handleAxisX: Style.make({
    height: '100%',
    width: '1.5rem',
    alignItems: 'center',
  }).pipe(Style.when(When.after, { height: '3rem', width: '0.25rem' })),
  handleDown: Style.make({ alignItems: 'flex-end' }),
  handleUp: Style.make({ alignItems: 'flex-start' }),
  handleLeft: Style.make({ justifyContent: 'flex-start' }),
  handleRight: Style.make({ justifyContent: 'flex-end' }),
  handleOrderLast: Style.make({ order: 9999 }),
  content: Style.make({
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
    transitionProperty: 'opacity',
    transitionDuration: interactionTokens.motionSlow,
    transitionTimingFunction: interactionTokens.easingDrawerContent,
  }).pipe(
    Style.when(When.reducedMotion, {
      transitionProperty: 'none',
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  contentDimmed: Style.make({ opacity: 0 }),
  contentSwiping: Style.make({ userSelect: 'none' }),
  header: Style.make({
    display: 'flex',
    flexShrink: 0,
    flexDirection: 'column',
    gap: '0.125rem',
    padding: '1rem',
    paddingBottom: 0,
  }),
  headerCentered: Style.make({ textAlign: 'center' }).pipe(
    Style.when(When.minWidth('48rem'), { textAlign: 'left' }),
  ),
  footer: Style.make({
    marginTop: 'auto',
    display: 'flex',
    flexShrink: 0,
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem',
    paddingTop: 0,
  }),
  title: Style.make({
    margin: 0,
    fontSize: '1rem',
    fontWeight: 500,
    color: tokens.foreground,
  }),
  description: Style.make({
    margin: 0,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
    textWrap: 'balance',
  }),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as DrawerBehavior from '@/lib/drawer'
import { foundationTokens } from './foundations-tokens'
import { overlayStyles } from './overlay-tokens'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { drawerTokens, tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'

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
  layoutStyle?: ComponentLayoutStyle | undefined
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
