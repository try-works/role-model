import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as DrawerBehavior from '@/lib/drawer'
import { cn } from '@/lib/utils'

/* Tailwind drawer — the shadcn "base" drawer
   (ui.shadcn.com/docs/components/base/drawer) markup ported onto foldkit:
   dialog → overlay (modal only) → viewport (fixed inset-0, pointer-events
   gated by data-modal) → popup (CSS-var translate/stack plumbing, bleed,
   data-swipe-* attributes) → optional swipe handle + content. Gesture state
   lives in `src/lib/drawer.ts` (Base UI model port); this file is DOM only. */

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

// ——— Class strings (shadcn bases/base/ui/drawer.tsx + cn-drawer-* CSS)

const OVERLAY_CLASS =
  'fixed inset-0 z-50 min-h-dvh bg-black/10 opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] select-none supports-backdrop-filter:backdrop-blur-xs data-[closed]:opacity-0 data-[leave]:pointer-events-none data-[leave]:opacity-0 data-[leave]:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-[snap-points]:[--drawer-overlay-min-opacity:0.5] data-[swiping]:duration-0 supports-[-webkit-touch-callout:none]:absolute motion-reduce:transition-none'

const VIEWPORT_CLASS = 'pointer-events-none fixed inset-0 z-50 select-none'

const POPUP_BASE_CLASS =
  'group/drawer-popup pointer-events-auto fixed z-50 m-(--drawer-inset,0px) flex h-(--drawer-content-height) max-h-(--drawer-content-max-height,none) min-h-0 min-w-0 w-(--drawer-content-width,auto) transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] flex-col overflow-x-clip bg-popover text-sm text-popover-foreground transition-[transform,height,opacity,filter] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform outline-none select-none [interpolate-size:allow-keywords] motion-reduce:transition-none'

const POPUP_NESTED_CLASS =
  'data-[nested-drawer-open]:overflow-hidden data-[nested-drawer-open]:brightness-95'

const POPUP_BLEED_CLASS =
  'after:pointer-events-none after:absolute after:bg-(--drawer-bleed-background,var(--color-popover)) data-[swipe-axis=x]:after:inset-y-0 data-[swipe-axis=x]:after:w-(--bleed) data-[swipe-axis=y]:after:inset-x-0 data-[swipe-axis=y]:after:h-(--bleed) data-[swipe-direction=down]:after:top-full data-[swipe-direction=left]:after:right-full data-[swipe-direction=right]:after:left-full data-[swipe-direction=up]:after:bottom-full'

const POPUP_SIZING_CLASS =
  '[--drawer-content-height:var(--drawer-height,auto)] data-[swipe-axis=x]:[--drawer-content-width:75%] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)] data-[swipe-axis=y]:data-[snap-points]:[--drawer-content-height:100dvh] data-[swipe-axis=x]:sm:[--drawer-content-width:24rem]'

const POPUP_STACK_CLASS =
  '[--bleed:3rem] [--peek:1rem] [--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] [--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--stack-shrink:calc(1-var(--stack-scale))] [--stack-step:0.05]'

const POPUP_TRANSITION_CLASS =
  'data-[closed]:transform-(--closed-transform) data-[leave]:transform-(--closed-transform) data-[leave]:opacity-[0.9999] data-[leave]:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-[nested-drawer-swiping]:duration-0 data-[leave]:data-[nested-drawer-swiping]:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-[swiping]:duration-0 data-[leave]:data-[swiping]:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]'

const POPUP_AXIS_CLASS =
  'data-[swipe-axis=y]:inset-x-0 data-[swipe-axis=y]:data-[nested-drawer-open]:h-(--stack-height) data-[swipe-axis=x]:inset-y-0 data-[swipe-axis=x]:flex-row'

const POPUP_DOWN_CLASS =
  'data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:origin-bottom data-[swipe-direction=down]:rounded-t-xl data-[swipe-direction=down]:border-t data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] data-[swipe-direction=down]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))]'

const POPUP_UP_CLASS =
  'data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:origin-top data-[swipe-direction=up]:rounded-b-xl data-[swipe-direction=up]:border-b data-[swipe-direction=up]:[--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] data-[swipe-direction=up]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))]'

const POPUP_LEFT_CLASS =
  'data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:origin-left data-[swipe-direction=left]:rounded-r-xl data-[swipe-direction=left]:border-r data-[swipe-direction=left]:[--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] data-[swipe-direction=left]:[--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))]'

const POPUP_RIGHT_CLASS =
  'data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:origin-right data-[swipe-direction=right]:rounded-l-xl data-[swipe-direction=right]:border-l data-[swipe-direction=right]:[--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] data-[swipe-direction=right]:[--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))]'

/* shadcn's group-*\/drawer-popup descendants can't be used for the rules
   below: a nested drawer's popup renders inside the parent's subtree, so a
   descendant-scoped group variant would leak the parent's flags
   (nested-drawer-open opacity, swipe-direction/axis geometry) into the
   child. The model already knows every flag per drawer, so each child
   applies its own values statically. */
const SWIPE_HANDLE_BASE_CLASS =
  'relative z-10 flex shrink-0 touch-none cursor-grab transition-opacity duration-200 active:cursor-grabbing after:block after:shrink-0 after:rounded-full after:bg-muted-foreground/50 motion-reduce:transition-none'
const SWIPE_HANDLE_AXIS_Y_CLASS =
  'h-6 w-full justify-center after:h-1 after:w-12'
const SWIPE_HANDLE_AXIS_X_CLASS = 'h-full w-6 items-center after:h-12 after:w-1'
const SWIPE_HANDLE_DIRECTION_CLASS = {
  down: 'items-end',
  up: 'items-start',
  left: 'justify-start',
  right: 'justify-end',
} as const

const CONTENT_BASE_CLASS =
  'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] select-text motion-reduce:transition-none'

const HEADER_BASE_CLASS = 'flex shrink-0 flex-col gap-0.5 p-4 pb-0'
const HEADER_RESPONSIVE_CLASS = 'md:gap-0.5 md:text-left'
const FOOTER_CLASS = 'mt-auto flex shrink-0 flex-col gap-2 p-4 pt-0'
const TITLE_CLASS = 'text-base font-medium text-foreground'
const DESCRIPTION_CLASS = 'text-sm text-balance text-muted-foreground'

/** Base UI's swipe-ignore surface: interactive controls + explicit ignores
    + the content region (mouse pointer only — touch swipes start on content
    after scroll arbitration, which the model cannot see). */
const SWIPE_IGNORE_SELECTOR =
  '[data-base-ui-swipe-ignore], button, a, input, select, textarea, label, [role="button"]'
const DRAWER_CONTENT_SELECTOR = '[data-drawer-content]'

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

// ——— Component API

export type DrawerSlots = Readonly<{
  closeButton: ReadonlyArray<ChildAttribute>
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
  class?: string
}>

const swipeAxis = (direction: DrawerBehavior.SwipeDirection): 'x' | 'y' =>
  direction === 'down' || direction === 'up' ? 'y' : 'x'

/** Popup inline style: the CSS custom properties Base UI writes imperatively
    — rendered declaratively from the model here. */
const popupStyle = (model: Model): Record<string, string> => {
  const movement = DrawerBehavior.swipeMovement(model)
  const snapOffset = DrawerBehavior.snapPointOffsetFor(model)
  const nestedCount = Object.keys(model.nestedDrawerHeights).length
  const leaving =
    model.dialog.animation.transitionState === 'LeaveStart' ||
    model.dialog.animation.transitionState === 'LeaveAnimating'
  return {
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
          hd.OnPointerMove((_screenX, screenY, _pointerType) =>
            Option.some(
              send(
                DraggedSwipe({
                  x: _screenX,
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
                hd.Class('bg-transparent p-0'),
                ...(modal === false
                  ? [
                      hd.Style({ pointerEvents: 'none' }),
                      // The primitive's AcquireResources mount would register
                      // a modal dialog (inert siblings + scroll lock); one
                      // OnMount per vnode means this replaces it, leaving a
                      // plain non-modal <dialog open>. Present from the first
                      // render: OnMount only fires when the element inserts,
                      // and this <dialog> persists across open/close, so a
                      // mount added at open time would never attach. Escape
                      // while closed is a RequestedClose no-op.
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
                              hd.Class(OVERLAY_CLASS),
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
                        hd.Class(VIEWPORT_CLASS),
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
                              cn(
                                POPUP_BASE_CLASS,
                                POPUP_NESTED_CLASS,
                                POPUP_BLEED_CLASS,
                                POPUP_SIZING_CLASS,
                                POPUP_STACK_CLASS,
                                POPUP_TRANSITION_CLASS,
                                POPUP_AXIS_CLASS,
                                POPUP_DOWN_CLASS,
                                POPUP_UP_CLASS,
                                POPUP_LEFT_CLASS,
                                POPUP_RIGHT_CLASS,
                                props.class,
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
                                        cn(
                                          SWIPE_HANDLE_BASE_CLASS,
                                          axis === 'y'
                                            ? SWIPE_HANDLE_AXIS_Y_CLASS
                                            : SWIPE_HANDLE_AXIS_X_CLASS,
                                          SWIPE_HANDLE_DIRECTION_CLASS[
                                            direction
                                          ],
                                          direction === 'left' ||
                                            direction === 'up'
                                            ? 'order-last'
                                            : '',
                                          model.nestedSwiping
                                            ? 'opacity-100'
                                            : nestedOpen
                                              ? 'opacity-0'
                                              : '',
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
                                  cn(
                                    CONTENT_BASE_CLASS,
                                    model.nestedSwiping
                                      ? 'opacity-100'
                                      : nestedOpen
                                        ? 'opacity-0'
                                        : '',
                                    swiping ? 'select-none' : '',
                                  ),
                                ),
                                // One OnMount per element — foldkit stores a
                                // single mount marker per vnode, so the
                                // nested-drawer watcher lives here instead of
                                // on the popup; its subtree still covers
                                // nested popups rendered inside the content.
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
                                      cn(
                                        HEADER_BASE_CLASS,
                                        axis === 'y' ? 'text-center' : '',
                                        HEADER_RESPONSIVE_CLASS,
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
                                        hd.Class(TITLE_CLASS),
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
                                              hd.Class(DESCRIPTION_CLASS),
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
                                          hd.Class(FOOTER_CLASS),
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
