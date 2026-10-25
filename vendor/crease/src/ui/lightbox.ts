/* Ported from Meta Astryx Lightbox (packages/core/src/Lightbox/Lightbox.tsx) — examples and visual spec adapted to Crease UI tokens. */

import { Option } from 'effect'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as LightboxBehavior from '@/lib/lightbox'
import { cn } from '@/lib/utils'

export const Model = LightboxBehavior.Model
export type Model = typeof Model.Type
export const Message = LightboxBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = LightboxBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = LightboxBehavior.init
export const update = LightboxBehavior.update
export const open = LightboxBehavior.open
export const close = LightboxBehavior.close

export const KEYBOARD_PAN_STEP = LightboxBehavior.KEYBOARD_PAN_STEP

export type LightboxMedia = Readonly<{
  src: string
  alt: string
  caption?: string
  type?: 'image' | 'video'
}>

export type LightboxProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  media: LightboxMedia | ReadonlyArray<LightboxMedia>
  hasZoom?: boolean
  hasAutoPlay?: boolean
  class?: string
}>

const SR_ONLY_CLASS =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 [clip:rect(0,0,0,0)]'

const CONTROL_BUTTON_CLASS =
  'absolute z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40 disabled:pointer-events-none motion-reduce:transition-none'

/* astryx renders its controls over the dark scrim with on-dark tokens;
   Crease UI has no on-dark tokens yet. */
/* PORT-NOTE: needs token 'on-dark-surface' = rgba(0,0,0,0.4) control surface and 'on-dark' = #fff ink. */

const clampIndex = (count: number, index: number): number =>
  Math.min(Math.max(0, index), Math.max(0, count - 1))

const mediaView = <Msg>(
  props: LightboxProps<Msg>,
  item: LightboxMedia,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const send = props.toParentMessage
  const zoomable = (props.hasZoom ?? false) && item.type !== 'video'
  const isZoomed = model.zoom > 1
  const isPanning = Option.isSome(model.panAnchor)

  if (item.type === 'video') {
    return h.video(
      [
        h.Src(item.src),
        h.Controls(true),
        h.Draggable(false),
        h.Preload('metadata'),
        ...(props.hasAutoPlay === true
          ? [
              h.Muted(true),
              h.Attribute('autoplay', ''),
              h.Attribute('playsinline', ''),
            ]
          : []),
        h.DataAttribute('slot', 'lightbox-media'),
        h.Class('max-h-[calc(100dvh-6rem)] max-w-full'),
      ],
      [],
    )
  }

  const transform = `translate(${String(model.panX)}px, ${String(model.panY)}px) scale(${String(model.zoom)})`

  return h.div(
    [
      h.DataAttribute('slot', 'lightbox-zoom-frame'),
      ...(zoomable
        ? [
            h.Role('button'),
            h.Attribute('tabindex', '0'),
            h.AriaPressed(isZoomed ? 'true' : 'false'),
            h.AriaLabel(
              isZoomed
                ? 'Zoom out. Use arrow keys or drag to pan.'
                : 'Zoom in. Double-click or press Enter to zoom.',
            ),
            h.OnDoubleClick(send(Message.ToggledZoom())),
            h.OnKeyDownPreventDefault(key =>
              key === 'Enter' || key === ' '
                ? Option.some(send(Message.ToggledZoom()))
                : Option.none(),
            ),
            h.OnMount(LightboxBehavior.mediaMount(send)),
          ]
        : []),
      h.Class(
        cn(
          'flex max-h-full max-w-full items-center justify-center overflow-hidden outline-none',
          zoomable
            ? isPanning
              ? 'cursor-grabbing'
              : isZoomed
                ? 'cursor-grab'
                : 'cursor-zoom-in'
            : '',
          zoomable
            ? 'touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
            : '',
        ),
      ),
    ],
    [
      h.img([
        h.Src(item.src),
        h.Alt(item.alt),
        h.Draggable(false),
        h.DataAttribute('slot', 'lightbox-media'),
        h.Style({
          transform,
          transitionProperty: isPanning ? 'none' : 'transform',
          transitionDuration: '200ms',
          transitionTimingFunction: 'ease-out',
        }),
        h.Class(
          'max-h-[calc(100dvh-6rem)] max-w-full object-contain pointer-events-none motion-reduce:transition-none select-none',
        ),
      ]),
    ],
  )
}

export const lightbox = <Msg>(
  props: LightboxProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const send = props.toParentMessage
  const items: ReadonlyArray<LightboxMedia> = Array.isArray(props.media)
    ? props.media
    : [props.media]
  const count = items.length
  const index = clampIndex(count, model.index)
  const item = items[index] ?? items[0]
  const zoomable =
    (props.hasZoom ?? false) && item !== undefined && item.type !== 'video'
  const isZoomed = model.zoom > 1 && zoomable

  return h.submodel({
    slotId: model.dialog.id,
    model: model.dialog,
    view: DialogPrimitive.view,
    viewInputs: {
      toView: ({
        dialog: dialogAttributes,
        backdrop,
        panel,
        closeButton,
        isVisible,
      }: DialogPrimitive.RenderInfo) => {
        const hd = h
        return hd.dialog(
          [
            ...dialogAttributes,
            hd.DataAttribute('slot', 'lightbox'),
            hd.Class(cn('bg-transparent p-0', props.class)),
            hd.OnKeyDownPreventDefault(key => {
              if (key === 'Escape') return Option.none()
              if (key === '+' || key === '=') {
                return zoomable
                  ? Option.some(send(Message.ZoomedIn()))
                  : Option.none()
              }
              if (key === '-' || key === '_') {
                return zoomable
                  ? Option.some(send(Message.ZoomedOut()))
                  : Option.none()
              }
              if (isZoomed) {
                switch (key) {
                  case 'ArrowLeft':
                    return Option.some(
                      send(Message.PannedBy({ dx: KEYBOARD_PAN_STEP, dy: 0 })),
                    )
                  case 'ArrowRight':
                    return Option.some(
                      send(Message.PannedBy({ dx: -KEYBOARD_PAN_STEP, dy: 0 })),
                    )
                  case 'ArrowUp':
                    return Option.some(
                      send(Message.PannedBy({ dx: 0, dy: KEYBOARD_PAN_STEP })),
                    )
                  case 'ArrowDown':
                    return Option.some(
                      send(Message.PannedBy({ dx: 0, dy: -KEYBOARD_PAN_STEP })),
                    )
                  default:
                    return Option.none()
                }
              }
              if (key === 'ArrowLeft')
                return Option.some(send(Message.NavigatedPrevious()))
              if (key === 'ArrowRight')
                return Option.some(send(Message.NavigatedNext()))
              return Option.none()
            }),
          ],
          isVisible && item !== undefined
            ? [
                hd.span(
                  [
                    hd.Id(DialogPrimitive.titleId(model.dialog)),
                    hd.Class(SR_ONLY_CLASS),
                  ],
                  [item.alt],
                ),
                hd.div(
                  [
                    ...panel,
                    hd.DataAttribute('slot', 'lightbox-container'),
                    hd.Class(
                      'absolute inset-0 flex flex-col items-center justify-center overflow-hidden',
                    ),
                  ],
                  [
                    hd.div(
                      [
                        ...backdrop,
                        hd.DataAttribute('slot', 'lightbox-backdrop'),
                        hd.Class(
                          'absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-[closed]:opacity-0 motion-reduce:transition-none',
                        ),
                      ],
                      [],
                    ),
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'lightbox-media-group'),
                        hd.Class(
                          'relative z-10 flex max-h-full max-w-full flex-col items-center justify-center gap-2 px-3',
                        ),
                      ],
                      [
                        mediaView(props, item, h),
                        ...(item.caption === undefined
                          ? []
                          : [
                              hd.p(
                                [
                                  hd.DataAttribute('slot', 'lightbox-caption'),
                                  hd.Class(
                                    'w-full max-w-[600px] px-3 pt-2 text-base text-white',
                                  ),
                                ],
                                [item.caption],
                              ),
                            ]),
                      ],
                    ),
                    ...(count > 1
                      ? [
                          hd.div(
                            [
                              hd.DataAttribute('slot', 'lightbox-counter'),
                              hd.AriaLive('polite'),
                              hd.Class(
                                'absolute start-3 top-3 z-10 text-sm text-white',
                              ),
                            ],
                            [`${String(index + 1)} / ${String(count)}`],
                          ),
                          hd.button(
                            [
                              hd.Type('button'),
                              hd.Disabled(index <= 0),
                              hd.OnClick(send(Message.NavigatedPrevious())),
                              hd.AriaLabel('Previous image'),
                              hd.Class(
                                cn(
                                  CONTROL_BUTTON_CLASS,
                                  'start-3 top-1/2 -translate-y-1/2',
                                ),
                              ),
                              hd.DataAttribute('slot', 'lightbox-previous'),
                            ],
                            [Icon.chevronLeft({ class: 'size-6' }, h)],
                          ),
                          hd.button(
                            [
                              hd.Type('button'),
                              hd.Disabled(index >= count - 1),
                              hd.OnClick(send(Message.NavigatedNext())),
                              hd.AriaLabel('Next image'),
                              hd.Class(
                                cn(
                                  CONTROL_BUTTON_CLASS,
                                  'end-3 top-1/2 -translate-y-1/2',
                                ),
                              ),
                              hd.DataAttribute('slot', 'lightbox-next'),
                            ],
                            [Icon.chevronRight({ class: 'size-6' }, h)],
                          ),
                        ]
                      : []),
                    hd.button(
                      [
                        ...closeButton,
                        hd.AriaLabel('Close'),
                        hd.Class(cn(CONTROL_BUTTON_CLASS, 'end-3 top-3')),
                        hd.DataAttribute('slot', 'lightbox-close'),
                      ],
                      [Icon.x({ class: 'size-5' }, h)],
                    ),
                  ],
                ),
              ]
            : [],
        )
      },
    },
    toParentMessage: message =>
      send(Message.GotLightboxDialogMessage({ message })),
  })
}
