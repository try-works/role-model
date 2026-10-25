/* Ported from Meta Astryx MobileNav + MobileNavToggle (packages/core/src/MobileNav/) — examples and visual spec adapted to Crease UI tokens. */

import type { Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as MobileNavBehavior from '@/lib/mobile-nav'
import { cn } from '@/lib/utils'

export const Model = MobileNavBehavior.Model
export type Model = typeof Model.Type
export const Message = MobileNavBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = MobileNavBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type
export type { MobileNavSide, ResolvedSide } from '@/lib/mobile-nav'

export const init = MobileNavBehavior.init
export const update = MobileNavBehavior.update
export const open = MobileNavBehavior.open
export const close = MobileNavBehavior.close

/* The fullscreen native <dialog> is the positioning context. astryx clips
   overflow (rather than `hidden`, which would make it a scroll container and
   suppress the drawer's entry transition) and blocks touch gestures at the
   overlay so the body cannot pull-to-refresh behind it. */
const DIALOG_CLASS =
  'bg-transparent p-0 max-w-none max-h-none overflow-clip overscroll-contain touch-none'
const OVERLAY_CLASS =
  'absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out data-[closed]:opacity-0 motion-reduce:transition-none'
const DRAWER_CLASS =
  'absolute top-0 bottom-0 flex w-screen flex-col overflow-hidden bg-background outline-none transition-transform duration-300 ease-[cubic-bezier(0.24,1,0.4,1)] motion-reduce:transition-none'
const DRAWER_SIDE_CLASS: Readonly<
  Record<MobileNavBehavior.ResolvedSide, string>
> = {
  start:
    'start-0 border-e data-[closed]:-translate-x-full data-[closed]:rtl:translate-x-full',
  end: 'end-0 border-s data-[closed]:translate-x-full data-[closed]:rtl:-translate-x-full',
}
const HEADER_CLASS = 'flex h-12 shrink-0 items-center border-b px-2'
const HEADER_TITLE_CLASS = 'mx-1 font-semibold text-foreground'
const CLOSE_CLASS =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none'
const CONTENT_CLASS =
  'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y p-2'
const TOGGLE_CLASS =
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none'

export type MobileNavProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  content: Html
  title?: string
  label?: string
  width?: number
  class?: string
}>

/** The mobile navigation drawer — a full-viewport dialog whose panel anchors
    to the resolved edge ('auto' follows the toggle's viewport side). */
export const mobileNav = <Msg>(
  props: MobileNavProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const send = props.toParentMessage
  const side = model.resolvedSide
  const width = props.width ?? 320
  const label = props.label ?? props.title ?? 'Navigation'

  return h.submodel({
    slotId: model.dialog.id,
    model: model.dialog,
    view: DialogPrimitive.view,
    viewInputs: {
      toView: ({
        dialog: dialogAttributes,
        backdrop,
        panel,
        initialFocus,
        closeButton,
        isVisible,
      }: DialogPrimitive.RenderInfo) => {
        const hd = h
        return hd.dialog(
          [
            ...dialogAttributes,
            hd.DataAttribute('slot', 'mobile-nav'),
            hd.AriaLabel(label),
            hd.Class(cn(DIALOG_CLASS, props.class)),
          ],
          isVisible
            ? [
                hd.div(
                  [
                    ...backdrop,
                    hd.DataAttribute('slot', 'mobile-nav-overlay'),
                    hd.Class(OVERLAY_CLASS),
                  ],
                  [],
                ),
                hd.div(
                  [
                    ...panel,
                    ...initialFocus,
                    hd.Tabindex(-1),
                    hd.DataAttribute('slot', 'mobile-nav-drawer'),
                    hd.DataAttribute('side', side),
                    hd.Style({ maxWidth: `${String(width)}px` }),
                    hd.Class(cn(DRAWER_CLASS, DRAWER_SIDE_CLASS[side])),
                  ],
                  [
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'mobile-nav-header'),
                        hd.Class(
                          cn(
                            HEADER_CLASS,
                            props.title === undefined
                              ? 'justify-end'
                              : 'justify-between',
                          ),
                        ),
                      ],
                      [
                        ...(props.title === undefined
                          ? [
                              hd.span(
                                [
                                  hd.Id(DialogPrimitive.titleId(model.dialog)),
                                  hd.Class(
                                    'absolute m-[-1px] h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]',
                                  ),
                                ],
                                [label],
                              ),
                            ]
                          : [
                              hd.h2(
                                [
                                  hd.Id(DialogPrimitive.titleId(model.dialog)),
                                  hd.DataAttribute('slot', 'mobile-nav-title'),
                                  hd.Class(HEADER_TITLE_CLASS),
                                ],
                                [props.title],
                              ),
                            ]),
                        hd.button(
                          [
                            ...closeButton,
                            hd.Type('button'),
                            hd.DataAttribute('slot', 'mobile-nav-close'),
                            hd.AriaLabel('Close navigation'),
                            hd.Class(CLOSE_CLASS),
                          ],
                          [Icon.x({ class: 'size-4' }, hd)],
                        ),
                      ],
                    ),
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'mobile-nav-content'),
                        hd.Class(CONTENT_CLASS),
                      ],
                      [props.content],
                    ),
                  ],
                ),
              ]
            : [],
        )
      },
    },
    toParentMessage: message =>
      send(Message.GotMobileNavDialogMessage({ message })),
  })
}

export type MobileNavToggleProps<Msg> = Readonly<{
  controls: string
  isExpanded: boolean
  message: Msg
  label?: string
  class?: string
}>

/** The hamburger button that opens a MobileNav. `controls` is the nav's
    dialog id; `isExpanded` mirrors `model.dialog.isOpen`. */
export const mobileNavToggle = <Msg>(
  props: MobileNavToggleProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.DataAttribute('slot', 'mobile-nav-toggle'),
      h.AriaControls(props.controls),
      h.AriaExpanded(props.isExpanded),
      h.AriaLabel(props.label ?? 'Open navigation'),
      h.OnClick(props.message),
      h.Class(cn(TOGGLE_CLASS, props.class)),
    ],
    [Icon.menu({ class: 'size-5' }, h)],
  )
