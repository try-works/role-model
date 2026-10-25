import { Option } from 'effect'
import * as Mount from 'foldkit/mount'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as SheetBehavior from '@/lib/sheet'
import { cn } from '@/lib/utils'
import type { SheetHeight, SheetSnapPoint } from '@/lib/sheet'

/* One sheet component: the shadcn/ui sheet.tsx edge-panel port for `top`,
   `right`, `bottom`, and `left`, with Meta Astryx's BottomSheet gesture engine
   (detent offsets, magnetic drags, flick/overshoot dismissal, scrim opacity
   coupling, grab handle) engaged when `side` is 'bottom'. The fullscreen
   native <dialog> is the flex positioning context, so each side aligns the
   panel to an edge without fixed panel positioning. Radix slide keyframes are
   foldkit data-closed CSS transitions. */

export const Model = SheetBehavior.Model
export type Model = typeof Model.Type
export const Message = SheetBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = SheetBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type
export const SwitcherModel = SheetBehavior.SwitcherModel
export type SwitcherModel = typeof SwitcherModel.Type
export const SwitcherMessage = SheetBehavior.SwitcherMessage
export type SwitcherMessage = typeof SwitcherMessage.Type
export const SwitcherOutMessage = SheetBehavior.SwitcherOutMessage
export type SwitcherOutMessage = typeof SwitcherOutMessage.Type
export const SheetState = SheetBehavior.SheetState
export type SheetState = typeof SheetState.Type
export type { SheetHeight, SheetPurpose, SheetSnapPoint } from '@/lib/sheet'

export const init = SheetBehavior.init
export const update = SheetBehavior.update
export const open = SheetBehavior.open
export const close = SheetBehavior.close
export const initSwitcher = SheetBehavior.initSwitcher
export const updateSwitcher = SheetBehavior.updateSwitcher
export const openSheet = SheetBehavior.openSheet
export const closeSwitcher = SheetBehavior.closeSwitcher

export const OVERSCROLL_PADDING = SheetBehavior.OVERSCROLL_PADDING
export const HEIGHT_BUDGETS = SheetBehavior.HEIGHT_BUDGETS

export type SheetSide = 'top' | 'right' | 'bottom' | 'left'

// ——— Edge panels (shadcn sheet.tsx port)

const EDGE_DIALOG_CLASS: Readonly<Record<SheetSide, string>> = {
  top: 'bg-transparent p-0 open:flex flex-col items-stretch justify-start',
  right: 'bg-transparent p-0 open:flex flex-row items-stretch justify-end',
  bottom: 'bg-transparent p-0 open:flex flex-col items-stretch justify-end',
  left: 'bg-transparent p-0 open:flex flex-row items-stretch justify-start',
}

const OVERLAY_CLASS =
  'fixed inset-0 z-50 bg-black/50 transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-[closed]:opacity-0 motion-reduce:transition-none'

const CONTENT_CLASS =
  'relative z-50 flex min-h-0 shrink-0 flex-col gap-4 overflow-hidden bg-background shadow-lg transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none'

const SIDE_CLASS: Readonly<Record<SheetSide, string>> = {
  right: 'h-full w-3/4 border-l data-[closed]:translate-x-full sm:max-w-sm',
  left: 'h-full w-3/4 border-r data-[closed]:-translate-x-full sm:max-w-sm',
  top: 'h-auto max-h-[85dvh] w-full border-b data-[closed]:-translate-y-full',
  bottom: 'h-auto w-full border-t data-[closed]:translate-y-full',
}

// ——— Bottom sheet (astryx BottomSheet port)

// Keep focus/scroll anchoring from scrolling against the panel's slide.
const BOTTOM_DIALOG_CLASS =
  'bg-transparent p-0 overflow-clip overscroll-contain open:block'
const SCRIM_CLASS =
  'absolute inset-0 bg-black/50 opacity-[var(--sheet-scrim-opacity)] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-[closed]:opacity-0 data-[swiping]:duration-0 motion-reduce:transition-none'
const POSITIONER_CLASS =
  'pointer-events-none absolute inset-x-0 bottom-0 flex justify-center'
const BOTTOM_SHEET_CLASS =
  'pointer-events-auto relative box-border flex w-full min-h-0 shrink-0 flex-col overflow-hidden border-x border-t border-border bg-background shadow-lg outline-none will-change-transform rounded-t-2xl transition-[transform,translate,scale,rotate,opacity,height] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-[closed]:translate-y-full starting:translate-y-full motion-reduce:transition-none'
const HANDLE_BAR_CLASS =
  'absolute inset-x-0 top-0 z-[1] flex h-6 touch-none cursor-grab items-center justify-center bg-gradient-to-b from-background from-60% to-transparent select-none'
const HANDLE_PILL_CLASS = 'h-1 w-8 rounded-full bg-border'
const BODY_CLASS =
  'min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-background'
const BODY_CONTENT_CLASS =
  'box-border flex h-full min-h-min flex-col gap-4 pt-6'
const SR_ONLY_CLASS =
  'absolute m-[-1px] h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]'

const NON_MODAL_ROOT_CLASS: Readonly<Record<SheetSide, string>> = {
  bottom:
    'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center',
  top: 'pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center',
  left: 'pointer-events-none fixed inset-y-0 left-0 z-50 flex items-center justify-start',
  right:
    'pointer-events-none fixed inset-y-0 right-0 z-50 flex items-center justify-end',
}

const EXIT_TRANSFORM: Readonly<Record<SheetSide, string>> = {
  bottom: 'translateY(100%)',
  top: 'translateY(-100%)',
  left: 'translateX(-100%)',
  right: 'translateX(100%)',
}

const ENTER_CLASS: Readonly<Record<SheetSide, string>> = {
  bottom: 'starting:translate-y-full',
  top: 'starting:-translate-y-full',
  left: 'starting:-translate-x-full',
  right: 'starting:translate-x-full',
}

const HEADER_CLASS =
  'flex w-full max-w-2xl shrink-0 flex-col gap-1.5 self-center p-4'
const FOOTER_CLASS =
  'mt-auto flex w-full max-w-2xl shrink-0 flex-col gap-2 self-center p-4'
const TITLE_CLASS = 'font-semibold text-foreground'
const DESCRIPTION_CLASS = 'text-sm text-muted-foreground'

const CLOSE_CLASS =
  'absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[open]:bg-secondary'

const budgetCss = (height: SheetHeight): string =>
  height === 'hug'
    ? `${String(SheetBehavior.HEIGHT_BUDGETS.hug * 100)}dvh`
    : height === 'capped'
      ? `${String(SheetBehavior.HEIGHT_BUDGETS.capped * 100)}dvh`
      : height === 'tall'
        ? `${String(SheetBehavior.HEIGHT_BUDGETS.tall * 100)}dvh`
        : typeof height === 'number'
          ? `${String(height)}px`
          : height.endsWith('%')
            ? `${String(height.slice(0, -1))}dvh`
            : height

const viewportHeight = (): number =>
  typeof window === 'undefined' ? 0 : window.innerHeight

const detentsFor = (
  sheetHeight: number,
  snapPoints: ReadonlyArray<SheetSnapPoint>,
): ReadonlyArray<number> =>
  SheetBehavior.computeDetentOffsets(
    sheetHeight,
    SheetBehavior.resolveSnapPoints(snapPoints, viewportHeight()),
  )

const gestureLayoutOffset = (g: SheetBehavior.GestureState): number =>
  g.dragPhase === 'Dragging'
    ? g.dragOffset < g.settledOffset
      ? 0
      : g.settledLayoutOffset
    : g.settledLayoutOffset

/** translateY for a bottom panel: undefined when the element should rest at
    its natural position (entry/exit transforms come from the data-state
    classes); a px value while dragging or settled at a detent. */
const sheetTransform = (
  g: SheetBehavior.GestureState,
  isLeaving: boolean,
  isExiting: boolean,
): string | undefined => {
  if (isLeaving) return undefined
  if (isExiting) return 'translateY(100%)'
  const dragging = g.dragPhase === 'Dragging'
  const activeOffset = dragging ? g.dragOffset : g.settledOffset
  const lift = dragging ? g.dragLift : 0
  const translate = activeOffset - gestureLayoutOffset(g) - lift
  return translate !== 0 || g.dragPhase !== 'Idle'
    ? `translateY(${String(translate)}px)`
    : undefined
}

const sheetHeightStyle = (
  g: SheetBehavior.GestureState,
  height: SheetHeight,
): Record<string, string> => {
  const layoutOffset = gestureLayoutOffset(g)
  if (layoutOffset > 0 && g.sheetHeight > 0) {
    return { height: `${String(g.sheetHeight - layoutOffset)}px` }
  }
  return height === 'hug'
    ? {
        height: 'fit-content',
        maxHeight: `calc(${budgetCss(height)} + ${String(OVERSCROLL_PADDING)}px)`,
      }
    : {
        height: `calc(${budgetCss(height)} + ${String(OVERSCROLL_PADDING)}px)`,
      }
}

const panelStyle = (
  g: SheetBehavior.GestureState,
  height: SheetHeight,
  isLeaving: boolean,
  isExiting: boolean,
): Record<string, string> => ({
  ...sheetHeightStyle(g, height),
  '--sheet-layout-offset': String(gestureLayoutOffset(g)),
  '--sheet-expanded-height': String(g.sheetHeight),
  paddingBlockEnd: `calc(env(safe-area-inset-bottom, 0px) + ${String(OVERSCROLL_PADDING)}px)`,
  marginBlockEnd: `${String(-OVERSCROLL_PADDING)}px`,
  ...(sheetTransform(g, isLeaving, isExiting) === undefined
    ? {}
    : { transform: sheetTransform(g, isLeaving, isExiting) as string }),
  ...(g.dragPhase === 'Dragging' ? { transitionProperty: 'none' } : {}),
})

/** The tap-to-drag promotion guard: a pointerdown on the handle drags
    immediately; one on the body arms a drag only when the body is scrolled to
    the top (astryx bodyProps promotion slop). */
export const isSheetDragCandidate = SheetBehavior.isSheetDragCandidate

export type SheetDragDispatch<Msg> = Readonly<{
  started: (frame: { y: number; timeStamp: number; armOnly: boolean }) => Msg
  dragged: (frame: { y: number; timeStamp: number; detents: number[] }) => Msg
  ended: (frame: { y: number; timeStamp: number; detents: number[] }) => Msg
  cancelled: (detents: number[]) => Msg
}>

const bottomPanelBody = <Msg>(
  content: ReadonlyArray<Html>,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html> => [
  h.div(
    [
      h.DataAttribute('slot', 'sheet-handle'),
      h.AriaHidden(true),
      h.Class(HANDLE_BAR_CLASS),
    ],
    [
      h.div(
        [h.DataAttribute('slot', 'sheet-pill'), h.Class(HANDLE_PILL_CLASS)],
        [],
      ),
    ],
  ),
  h.div(
    [h.DataAttribute('slot', 'sheet-body'), h.Class(BODY_CLASS)],
    [
      h.div(
        [
          h.DataAttribute('slot', 'sheet-body-content'),
          h.Class(BODY_CONTENT_CLASS),
        ],
        [...content],
      ),
    ],
  ),
]

// ——— Shared parts

export type SheetSlots = Readonly<{
  closeButton: ReadonlyArray<ChildAttribute>
  initialFocusAttributes: () => ReadonlyArray<ChildAttribute>
}>
export type SheetPartProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>
export type SheetTextPartProps = SheetPartProps &
  Readonly<{ attributes: ReadonlyArray<ChildAttribute> }>
export type SheetCloseProps = Readonly<{
  children?: ReadonlyArray<Html | string>
  class?: string
  ariaLabel?: string
}>

export const sheetHeader = <Msg>(
  props: SheetPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'sheet-header'),
      h.Class(cn(HEADER_CLASS, props.class)),
    ],
    [...props.children],
  )
export const sheetTitle = <Msg>(
  props: SheetTextPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.h2(
    [
      ...props.attributes,
      h.DataAttribute('slot', 'sheet-title'),
      h.Class(cn(TITLE_CLASS, props.class)),
    ],
    [...props.children],
  )
export const sheetDescription = <Msg>(
  props: SheetTextPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.p(
    [
      ...props.attributes,
      h.DataAttribute('slot', 'sheet-description'),
      h.Class(cn(DESCRIPTION_CLASS, props.class)),
    ],
    [...props.children],
  )
export const sheetFooter = <Msg>(
  props: SheetPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'sheet-footer'),
      h.Class(cn(FOOTER_CLASS, props.class)),
    ],
    [...props.children],
  )

export type SheetParts<Msg> = Readonly<{
  header: (props: SheetPartProps) => Html
  title: (props: Omit<SheetTextPartProps, 'attributes'>) => Html
  description: (props: Omit<SheetTextPartProps, 'attributes'>) => Html
  footer: (props: SheetPartProps) => Html
  close: (props?: SheetCloseProps) => Html
  closeButtonAttributes: ReadonlyArray<ChildAttribute>
  initialFocusAttributes: () => ReadonlyArray<ChildAttribute>
}>

export type SheetProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Accessible title. Rendered as the visible header on edge sides and as a
      screen-reader label on bottom sheets whose layout composes its own
      headings — when `layout` never uses `parts.title`, an sr-only element
      carrying the Dialog title id is added automatically. */
  title: string
  description?: string
  content?: (slots: SheetSlots) => ReadonlyArray<Html>
  footer?: (slots: SheetSlots) => ReadonlyArray<Html>
  layout?: (parts: SheetParts<Msg>) => ReadonlyArray<Html>
  side?: SheetSide
  showCloseButton?: boolean
  direction?: 'ltr' | 'rtl'
  class?: string
}>

type ComposedSheetBody = Readonly<{
  children: ReadonlyArray<Html>
  titleClaimed: boolean
  descriptionClaimed: boolean
}>

/** Composes the sheet's visible body: the caller's `layout` wins outright;
    otherwise header (title + description), `content`, `footer`, and the close
    button stack in order. On edge sides the close button defaults on; on
    bottom sheets (drag/scrim/Escape dismissals) it defaults off. */
const composeSheetBody = <Msg>(
  props: SheetProps<Msg>,
  side: SheetSide,
  slots: SheetSlots,
  parts: SheetParts<Msg>,
): ComposedSheetBody => {
  let titleClaimed = false
  let descriptionClaimed = false
  const wrappedParts: SheetParts<Msg> = {
    ...parts,
    title: partProps => {
      titleClaimed = true
      return parts.title(partProps)
    },
    description: partProps => {
      descriptionClaimed = true
      return parts.description(partProps)
    },
  }
  const viaLayout = props.layout?.(wrappedParts)
  const children = viaLayout ?? [
    parts.header({
      children: [
        wrappedParts.title({ children: [props.title] }),
        ...(props.description === undefined
          ? []
          : [wrappedParts.description({ children: [props.description] })]),
      ],
    }),
    ...(props.content?.(slots) ?? []),
    ...(props.footer === undefined
      ? []
      : [parts.footer({ children: props.footer(slots) })]),
    ...((props.showCloseButton ?? side !== 'bottom') ? [parts.close()] : []),
  ]
  return { children, titleClaimed, descriptionClaimed }
}

/** Screen-reader fallbacks for the Dialog's title/description ids when the
    composed body never mounted the visible parts. */
const srOnlyFallbacks = <Msg>(
  props: SheetProps<Msg>,
  model: Model,
  composed: ComposedSheetBody,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html> => [
  ...(composed.titleClaimed
    ? []
    : [
        h.span(
          [h.Id(DialogPrimitive.titleId(model.dialog)), h.Class(SR_ONLY_CLASS)],
          [props.title],
        ),
      ]),
  ...(props.description === undefined || composed.descriptionClaimed
    ? []
    : [
        h.span(
          [
            h.Id(DialogPrimitive.descriptionId(model.dialog)),
            h.Class(SR_ONLY_CLASS),
          ],
          [props.description],
        ),
      ]),
]

const buildParts = <Msg>(
  hd: HtmlBuilder<Msg>,
  renderInfo: Pick<
    DialogPrimitive.RenderInfo,
    'title' | 'description' | 'initialFocus' | 'closeButton'
  >,
  initialFocusClaimedRef: { claimed: boolean },
): SheetParts<Msg> => {
  const { title, description, initialFocus, closeButton } = renderInfo
  const initialFocusAttributes = (): ReadonlyArray<ChildAttribute> => {
    initialFocusClaimedRef.claimed = true
    return initialFocus
  }
  return {
    header: partProps => sheetHeader(partProps, hd),
    title: partProps => sheetTitle({ ...partProps, attributes: title }, hd),
    description: partProps =>
      sheetDescription({ ...partProps, attributes: description }, hd),
    footer: partProps => sheetFooter(partProps, hd),
    close: (partProps = {}) =>
      hd.button(
        [
          ...closeButton,
          ...(initialFocusClaimedRef.claimed ? [] : initialFocusAttributes()),
          hd.Type('button'),
          hd.DataAttribute('slot', 'sheet-close'),
          hd.AriaLabel(partProps.ariaLabel ?? 'Close'),
          hd.Class(cn(CLOSE_CLASS, partProps.class)),
        ],
        [...(partProps.children ?? [Icon.x({ class: 'size-4' }, hd)])],
      ),
    closeButtonAttributes: closeButton,
    initialFocusAttributes,
  }
}

const nonModalParts = <Msg>(hd: HtmlBuilder<Msg>): SheetParts<Msg> => ({
  header: partProps => sheetHeader(partProps, hd),
  title: partProps => sheetTitle({ ...partProps, attributes: [] }, hd),
  description: partProps =>
    sheetDescription({ ...partProps, attributes: [] }, hd),
  footer: partProps => sheetFooter(partProps, hd),
  close: (partProps = {}) =>
    hd.button(
      [
        hd.Type('button'),
        hd.DataAttribute('slot', 'sheet-close'),
        hd.AriaLabel(partProps.ariaLabel ?? 'Close'),
        hd.Class(cn(CLOSE_CLASS, partProps.class)),
      ],
      [...(partProps.children ?? [Icon.x({ class: 'size-4' }, hd)])],
    ),
  closeButtonAttributes: [],
  initialFocusAttributes: () => [],
})

const EMPTY_SLOTS: SheetSlots = {
  closeButton: [],
  initialFocusAttributes: () => [],
}

export const sheet = <Msg>(
  props: SheetProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const side = props.side ?? 'right'
  const model = props.model
  const send = props.toParentMessage
  const g = model.gesture

  if (side === 'bottom') {
    const detents = detentsFor(g.sheetHeight, model.snapPoints)
    const peek = SheetBehavior.peekOffsetFor(detents, g.sheetHeight)
    const maxOffset = detents[detents.length - 1] ?? 0
    const dismissOffset =
      maxOffset +
      SheetBehavior.visibleHeightForOffset(g.sheetHeight, maxOffset) *
        SheetBehavior.DISMISS_OVERSHOOT_RATIO
    const activeOffset =
      g.dragPhase === 'Dragging' ? g.dragOffset : g.settledOffset
    const scrimOpacity = SheetBehavior.scrimOpacityForOffset(
      activeOffset,
      detents,
      dismissOffset,
      peek,
    )
    const swiping = g.dragPhase === 'Dragging'

    if (!model.hasScrim) {
      const composed = composeSheetBody(
        props,
        side,
        EMPTY_SLOTS,
        nonModalParts(h),
      )
      return h.div(
        [
          h.DataAttribute('slot', 'sheet-root'),
          h.Role('dialog'),
          h.AriaModal(false),
          h.AriaLabel(props.title),
          h.Class(cn(NON_MODAL_ROOT_CLASS[side], props.class)),
        ],
        model.dialog.isOpen || model.isExiting
          ? [
              h.div(
                [
                  h.DataAttribute('slot', 'sheet-panel'),
                  h.DataAttribute('sheet-purpose', model.purpose),
                  h.OnMount(
                    Mount.mapMessage(
                      SheetBehavior.ObserveSheet({
                        height: model.height,
                        snapPoints: model.snapPoints,
                      }),
                      message => send(message),
                    ),
                  ),
                  h.Style(panelStyle(g, model.height, false, model.isExiting)),
                  h.Class(cn(BOTTOM_SHEET_CLASS, props.class)),
                  ...(props.direction === 'rtl' ? [h.Dir('rtl')] : []),
                ],
                [
                  ...srOnlyFallbacks(props, model, composed, h),
                  ...bottomPanelBody(composed.children, h),
                ],
              ),
            ]
          : [],
      )
    }

    return h.submodel({
      slotId: model.dialog.id,
      model: model.dialog,
      view: DialogPrimitive.view,
      viewInputs: {
        toView: ({
          dialog: dialogAttributes,
          backdrop,
          panel: panelAttributes,
          title,
          description,
          initialFocus,
          closeButton,
          isVisible,
        }: DialogPrimitive.RenderInfo) => {
          const hd = h
          const leaving =
            model.dialog.animation.transitionState === 'LeaveStart' ||
            model.dialog.animation.transitionState === 'LeaveAnimating'
          const focusRef = { claimed: false }
          const parts = buildParts(
            hd,
            { title, description, initialFocus, closeButton },
            focusRef,
          )
          const slots: SheetSlots = {
            closeButton,
            initialFocusAttributes: parts.initialFocusAttributes,
          }
          const composed = composeSheetBody(props, side, slots, parts)
          return hd.dialog(
            [
              ...dialogAttributes,
              hd.DataAttribute('slot', 'sheet'),
              hd.Class(BOTTOM_DIALOG_CLASS),
              ...(model.purpose === 'required' ? [hd.Role('alertdialog')] : []),
            ],
            isVisible
              ? [
                  ...srOnlyFallbacks(props, model, composed, hd),
                  hd.div(
                    [
                      ...(model.purpose === 'info' ? backdrop : []),
                      hd.DataAttribute('slot', 'sheet-scrim'),
                      ...(swiping ? [hd.DataAttribute('swiping', '')] : []),
                      hd.Class(SCRIM_CLASS),
                      hd.Style({
                        '--sheet-scrim-opacity': String(scrimOpacity),
                      }),
                    ],
                    [],
                  ),
                  hd.div(
                    [
                      hd.DataAttribute('slot', 'sheet-positioner'),
                      hd.Class(POSITIONER_CLASS),
                    ],
                    [
                      hd.div(
                        [
                          ...panelAttributes,
                          ...(focusRef.claimed
                            ? []
                            : [
                                ...initialFocus,
                                hd.Attribute('tabindex', '-1'),
                              ]),
                          hd.DataAttribute('slot', 'sheet-panel'),
                          hd.DataAttribute('sheet-purpose', model.purpose),
                          hd.OnMount(
                            Mount.mapMessage(
                              SheetBehavior.ObserveSheet({
                                height: model.height,
                                snapPoints: model.snapPoints,
                              }),
                              message => send(message),
                            ),
                          ),
                          hd.Style(panelStyle(g, model.height, leaving, false)),
                          hd.Class(cn(BOTTOM_SHEET_CLASS, props.class)),
                          ...(props.direction === 'rtl' ? [hd.Dir('rtl')] : []),
                        ],
                        bottomPanelBody(composed.children, hd),
                      ),
                    ],
                  ),
                ]
              : [],
          )
        },
      },
      toParentMessage: message =>
        send(Message.GotSheetDialogMessage({ message })),
    })
  }

  if (!model.hasScrim) {
    return h.div(
      [
        h.DataAttribute('slot', 'sheet-root'),
        h.Role('dialog'),
        h.AriaModal(false),
        h.AriaLabel(props.title),
        h.Class(cn(NON_MODAL_ROOT_CLASS[side], props.class)),
      ],
      model.dialog.isOpen || model.isExiting
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'sheet-panel'),
                h.Class(cn(CONTENT_CLASS, SIDE_CLASS[side], ENTER_CLASS[side])),
                h.Style(
                  model.isExiting ? { transform: EXIT_TRANSFORM[side] } : {},
                ),
                ...(props.direction === 'rtl' ? [h.Dir('rtl')] : []),
              ],
              (() => {
                const composed = composeSheetBody(
                  props,
                  side,
                  EMPTY_SLOTS,
                  nonModalParts(h),
                )
                return [
                  ...srOnlyFallbacks(props, model, composed, h),
                  ...composed.children,
                ]
              })(),
            ),
          ]
        : [],
    )
  }

  return h.submodel({
    slotId: model.dialog.id,
    model: model.dialog,
    view: DialogPrimitive.view,
    viewInputs: {
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
        const parts = buildParts(
          hd,
          { title, description, initialFocus, closeButton },
          focusRef,
        )
        const slots: SheetSlots = {
          closeButton,
          initialFocusAttributes: parts.initialFocusAttributes,
        }
        const composed = composeSheetBody(props, side, slots, parts)
        const panelFocusAttributes = focusRef.claimed
          ? []
          : [...initialFocus, hd.Attribute('tabindex', '-1')]

        return hd.dialog(
          [
            ...dialogAttributes,
            hd.DataAttribute('slot', 'sheet'),
            hd.Class(EDGE_DIALOG_CLASS[side]),
            ...(model.purpose === 'required' ? [hd.Role('alertdialog')] : []),
          ],
          isVisible
            ? [
                ...srOnlyFallbacks(props, model, composed, hd),
                hd.div(
                  [
                    ...(model.purpose === 'info' ? backdrop : []),
                    hd.DataAttribute('slot', 'sheet-overlay'),
                    hd.Class(OVERLAY_CLASS),
                  ],
                  [],
                ),
                hd.div(
                  [
                    ...panel,
                    ...panelFocusAttributes,
                    hd.DataAttribute('slot', 'sheet-content'),
                    ...(props.direction === 'rtl' ? [hd.Dir('rtl')] : []),
                    hd.Class(cn(CONTENT_CLASS, SIDE_CLASS[side], props.class)),
                  ],
                  [...composed.children],
                ),
              ]
            : [],
        )
      },
    },
    toParentMessage: message =>
      send(Message.GotSheetDialogMessage({ message })),
  })
}

// ——— Switcher (one shared dialog, multiple bottom sheets)

export type SwitcherSheetContent = Readonly<{
  id: string
  content: Html
}>

export type SheetSwitcherProps<Msg> = Readonly<{
  model: SwitcherModel
  toParentMessage: (message: SwitcherMessage) => Msg
  sheets: ReadonlyArray<SwitcherSheetContent>
  class?: string
}>

const switcherScrimOpacity = (sheet: SheetState): number => {
  const detents = detentsFor(sheet.gesture.sheetHeight, sheet.snapPoints)
  const peek = SheetBehavior.peekOffsetFor(detents, sheet.gesture.sheetHeight)
  const maxOffset = detents[detents.length - 1] ?? 0
  const dismissOffset =
    maxOffset +
    SheetBehavior.visibleHeightForOffset(sheet.gesture.sheetHeight, maxOffset) *
      SheetBehavior.DISMISS_OVERSHOOT_RATIO
  const activeOffset =
    sheet.gesture.dragPhase === 'Dragging'
      ? sheet.gesture.dragOffset
      : sheet.gesture.settledOffset
  return SheetBehavior.scrimOpacityForOffset(
    activeOffset,
    detents,
    dismissOffset,
    peek,
  )
}

/** One shared dialog hosting several bottom sheets; requesting a sheet slides
    it in over the currently mounted one, which is retained covered and then
    fades (astryx BottomSheetSwitcher). */
export const sheetSwitcher = <Msg>(
  props: SheetSwitcherProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const send = props.toParentMessage
  const activeId = Option.getOrUndefined(model.activeSheetId)
  const previousId = Option.getOrUndefined(model.previousSheetId)
  const activeSheet =
    activeId === undefined ? undefined : model.sheets[activeId]
  const swiping =
    activeSheet !== undefined && activeSheet.gesture.dragPhase === 'Dragging'

  return h.submodel({
    slotId: model.dialog.id,
    model: model.dialog,
    view: DialogPrimitive.view,
    viewInputs: {
      toView: ({
        dialog: dialogAttributes,
        backdrop,
        panel: panelAttributes,
        title,
        initialFocus,
        isVisible,
      }: DialogPrimitive.RenderInfo) => {
        const hd = h
        const leaving =
          model.dialog.animation.transitionState === 'LeaveStart' ||
          model.dialog.animation.transitionState === 'LeaveAnimating'

        const renderSheet = (
          spec: SwitcherSheetContent,
          hidden: boolean,
        ): Html | undefined => {
          const sheetState = model.sheets[spec.id]
          if (sheetState === undefined) return undefined
          return hd.keyed('div')(
            `sheet-${spec.id}-${hidden ? 'retained' : 'active'}`,
            [
              ...(hidden
                ? []
                : [...panelAttributes, ...initialFocus, hd.Tabindex(-1)]),
              hd.DataAttribute('slot', 'sheet-panel'),
              hd.DataAttribute('sheet-id', spec.id),
              hd.DataAttribute('sheet-purpose', sheetState.purpose),
              hd.OnMount(
                Mount.mapMessage(
                  SheetBehavior.ObserveSwitcherSheet({
                    sheetId: spec.id,
                    height: sheetState.height,
                    snapPoints: sheetState.snapPoints,
                  }),
                  message => send(message),
                ),
              ),
              hd.Style(
                panelStyle(
                  sheetState.gesture,
                  sheetState.height,
                  leaving,
                  false,
                ),
              ),
              hd.Class(
                cn(
                  BOTTOM_SHEET_CLASS,
                  hidden
                    ? 'pointer-events-none absolute inset-x-0 bottom-0 opacity-0 transition-opacity starting:opacity-100'
                    : '',
                ),
              ),
              ...(hidden ? [hd.Inert(true), hd.AriaHidden(true)] : []),
            ],
            bottomPanelBody([spec.content], hd),
          )
        }

        return hd.dialog(
          [
            ...dialogAttributes,
            hd.DataAttribute('slot', 'sheet-switcher'),
            hd.Class(cn(BOTTOM_DIALOG_CLASS, props.class)),
          ],
          isVisible && activeSheet !== undefined
            ? [
                hd.h2([...title, hd.Class(SR_ONLY_CLASS)], [activeSheet.label]),
                hd.div(
                  [
                    ...(activeSheet.purpose === 'info' ? backdrop : []),
                    hd.DataAttribute('slot', 'sheet-switcher-scrim'),
                    ...(swiping ? [hd.DataAttribute('swiping', '')] : []),
                    hd.Class(SCRIM_CLASS),
                    hd.Style({
                      '--sheet-scrim-opacity': String(
                        switcherScrimOpacity(activeSheet),
                      ),
                    }),
                  ],
                  [],
                ),
                hd.div(
                  [
                    hd.DataAttribute('slot', 'sheet-switcher-positioner'),
                    hd.Class(POSITIONER_CLASS),
                  ],
                  [
                    ...(previousId === undefined || previousId === activeId
                      ? []
                      : props.sheets
                          .filter(spec => spec.id === previousId)
                          .map(spec => renderSheet(spec, true))
                          .filter((el): el is Html => el !== undefined)),
                    ...(activeId === undefined
                      ? []
                      : props.sheets
                          .filter(spec => spec.id === activeId)
                          .map(spec => renderSheet(spec, false))
                          .filter((el): el is Html => el !== undefined)),
                  ],
                ),
              ]
            : [],
        )
      },
    },
    toParentMessage: message =>
      send(SwitcherMessage.GotSwitcherDialogMessage({ message })),
  })
}

/*
Minimal wiring:
const model = init({ id: 'settings-sheet', isAnimated: true })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
sheet({
  model,
  toParentMessage: message => GotSheetMessage({ message }),
  title: 'Settings',
  description: 'Update your preferences.',
  side: 'right',
})
// Bottom edge engages the drag engine, snap points, and the grab handle:
sheet({ model: init({ id: 'filters', snapPoints: ['96px', '50%'] }), title: 'Filters', side: 'bottom', content: () => [...] })
*/
