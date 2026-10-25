import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx Lightbox (packages/core/src/Lightbox/Lightbox.tsx) — examples and visual spec adapted to Crease UI tokens. */

import { Option } from 'effect'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as LightboxBehavior from '@/lib/lightbox'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* astryx renders its controls over the dark scrim with on-dark tokens;
   Crease UI has no on-dark tokens yet — statusPlateInk (~white) and backdrop
   stand in. */
/* PORT-NOTE: needs token 'on-dark' = #fff (uses statusPlateInk), 'on-dark-surface' = rgba(0,0,0,0.4) (uses backdrop), and interaction cursors 'zoom-in'/'grab'/'grabbing' (driven inline below). */

const styles = stylex.create({
  backdrop: {
    inset: 0,
    backdropFilter: 'blur(2px)',
    backgroundColor: tokens.backdrop,
    position: 'absolute',
  },
  caption: {
    paddingInline: '0.75rem',
    color: tokens.statusPlateInk,
    fontSize: '1rem',
    lineHeight: '1.5rem',
    paddingBlockStart: '0.5rem',
    maxWidth: '600px',
    width: '100%',
  },
  container: {
    inset: 0,
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'absolute',
  },
  controlButton: {
    borderRadius: foundationTokens.radiusFull,
    alignItems: 'center',
    backgroundColor: tokens.backdrop,
    color: tokens.statusPlateInk,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    justifyContent: 'center',
    opacity: {
      default: 1,
      ':disabled': 0.4,
      ':hover': 0.85,
    },
    outlineColor: {
      default: 'transparent',
      ':focus-visible': tokens.statusPlateInk,
    },
    outlineOffset: '2px',
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: '2px',
    pointerEvents: {
      default: 'auto',
      ':disabled': 'none',
    },
    position: 'absolute',
    transitionDuration: {
      default: interactionTokens.motionModerate,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: {
      default: 'opacity',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    zIndex: 10,
    height: '2.5rem',
    width: '2.5rem',
  },
  close: {
    insetInlineEnd: '0.75rem',
    top: '0.75rem',
  },
  counter: {
    color: tokens.statusPlateInk,
    fontSize: '0.875rem',
    insetInlineStart: '0.75rem',
    lineHeight: '1.25rem',
    position: 'absolute',
    zIndex: 10,
    top: '0.75rem',
  },
  dialog: {
    padding: 0,
    backgroundColor: tokens.transparent,
  },
  icon: {
    height: '1.5rem',
    width: '1.5rem',
  },
  iconSm: {
    height: '1.25rem',
    width: '1.25rem',
  },
  media: {
    objectFit: 'contain',
    pointerEvents: 'none',
    userSelect: 'none',
    maxHeight: 'calc(100dvh - 6rem)',
    maxWidth: '100%',
  },
  mediaGroup: {
    gap: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
    maxHeight: '100%',
    maxWidth: '100%',
  },
  navNext: {
    insetInlineEnd: '0.75rem',
    transform: 'translateY(-50%)',
    top: '50%',
  },
  navPrevious: {
    insetInlineStart: '0.75rem',
    transform: 'translateY(-50%)',
    top: '50%',
  },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  video: {
    maxHeight: 'calc(100dvh - 6rem)',
    maxWidth: '100%',
  },
  zoomFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    outlineStyle: 'none',
    maxHeight: '100%',
    maxWidth: '100%',
  },
  zoomFrameZoomable: {
    outlineColor: {
      default: 'transparent',
      ':focus-visible': tokens.statusPlateInk,
    },
    outlineOffset: '2px',
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: '2px',
    touchAction: 'none',
    userSelect: 'none',
  },
})

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
  layoutStyle?: ComponentLayoutStyle
}>

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
        h.Class(className(reset.media, styles.video)),
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
            h.Style({
              cursor: isPanning ? 'grabbing' : isZoomed ? 'grab' : 'zoom-in',
            }),
          ]
        : []),
      h.Class(
        className(
          styles.zoomFrame,
          zoomable ? styles.zoomFrameZoomable : undefined,
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
        h.Class(className(reset.media, styles.media)),
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
        panel: _panel,
        closeButton,
        isVisible,
      }: DialogPrimitive.RenderInfo) => {
        const hd = h
        return hd.dialog(
          [
            ...dialogAttributes,
            hd.DataAttribute('slot', 'lightbox'),
            hd.Class(className(styles.dialog, props.layoutStyle)),
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
                    hd.Class(className(styles.srOnly)),
                  ],
                  [item.alt],
                ),
                hd.div(
                  [
                    hd.DataAttribute('slot', 'lightbox-container'),
                    hd.Class(className(styles.container)),
                  ],
                  [
                    hd.div(
                      [
                        ...backdrop,
                        hd.DataAttribute('slot', 'lightbox-backdrop'),
                        hd.Class(className(styles.backdrop)),
                      ],
                      [],
                    ),
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'lightbox-media-group'),
                        hd.Class(className(styles.mediaGroup)),
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
                                    className(reset.text, styles.caption),
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
                              hd.Class(className(styles.counter)),
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
                                className(
                                  reset.button,
                                  styles.controlButton,
                                  styles.navPrevious,
                                ),
                              ),
                              hd.DataAttribute('slot', 'lightbox-previous'),
                            ],
                            [
                              Icon.chevronLeft(
                                { class: className(styles.icon) },
                                h,
                              ),
                            ],
                          ),
                          hd.button(
                            [
                              hd.Type('button'),
                              hd.Disabled(index >= count - 1),
                              hd.OnClick(send(Message.NavigatedNext())),
                              hd.AriaLabel('Next image'),
                              hd.Class(
                                className(
                                  reset.button,
                                  styles.controlButton,
                                  styles.navNext,
                                ),
                              ),
                              hd.DataAttribute('slot', 'lightbox-next'),
                            ],
                            [
                              Icon.chevronRight(
                                { class: className(styles.icon) },
                                h,
                              ),
                            ],
                          ),
                        ]
                      : []),
                    hd.button(
                      [
                        ...closeButton,
                        hd.AriaLabel('Close'),
                        hd.Class(
                          className(
                            reset.button,
                            styles.controlButton,
                            styles.close,
                          ),
                        ),
                        hd.DataAttribute('slot', 'lightbox-close'),
                      ],
                      [Icon.x({ class: className(styles.iconSm) }, h)],
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
