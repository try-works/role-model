import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx MobileNav + MobileNavToggle (packages/core/src/MobileNav/) — examples and visual spec adapted to Crease UI tokens. */

import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as MobileNavBehavior from '@/lib/mobile-nav'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { overlayStyles } from './overlay-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

const styles = stylex.create({
  close: {
    borderRadius: tokens.controlRadius,
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    height: '2rem',
    width: '2rem',
  },
  content: {
    padding: '0.5rem',
    overscrollBehavior: 'contain',
    flexGrow: 1,
    touchAction: 'pan-y',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  dialog: {
    padding: 0,
    overflow: 'clip',
    overscrollBehavior: 'contain',
    backgroundColor: tokens.transparent,
    justifyContent: 'stretch',
    outlineStyle: 'none',
    touchAction: 'none',
    maxHeight: 'none',
    maxWidth: 'none',
  },
  drawer: {
    overflow: 'hidden',
    backgroundColor: tokens.background,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    outlineStyle: 'none',
    position: 'absolute',
    transitionDuration: {
      default: interactionTokens.motionSlow,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    bottom: 0,
    top: 0,
    width: '100vw',
  },
  drawerStart: {
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
    insetInlineStart: 0,
    transform: {
      default: 'translateX(0)',
      ':is([data-closed])': 'translateX(-100%)',
      ':is([dir="rtl"] [data-closed])': 'translateX(100%)',
    },
  },
  drawerEnd: {
    borderInlineStartColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
    insetInlineEnd: 0,
    transform: {
      default: 'translateX(0)',
      ':is([data-closed])': 'translateX(100%)',
      ':is([dir="rtl"] [data-closed])': 'translateX(-100%)',
    },
  },
  header: {
    paddingInline: '0.5rem',
    alignItems: 'center',
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: '1px',
    display: 'flex',
    flexShrink: 0,
    height: '3rem',
  },
  headerBetween: {
    justifyContent: 'space-between',
  },
  headerEnd: {
    justifyContent: 'flex-end',
  },
  headerTitle: {
    color: tokens.foreground,
    fontWeight: 600,
    marginInlineStart: '0.25rem',
  },
  icon: {
    height: '1rem',
    width: '1rem',
  },
  overlay: {
    inset: 0,
    backdropFilter: 'blur(2px)',
    backgroundColor: tokens.backdrop,
    opacity: {
      default: 1,
      ':is([data-closed])': 0,
    },
    position: 'absolute',
    transitionDuration: {
      default: interactionTokens.motionSlow,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'opacity',
    transitionTimingFunction: interactionTokens.easingStandard,
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
  toggleIcon: {
    height: '1.25rem',
    width: '1.25rem',
  },
  toggle: {
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.mutedHover,
    },
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    justifyContent: 'center',
    outlineStyle: 'none',
    transitionDuration: {
      default: interactionTokens.motionFast,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '2.25rem',
    width: '2.25rem',
  },
})

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

export type MobileNavProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  content: Html
  title?: string
  label?: string
  width?: number
  layoutStyle?: ComponentLayoutStyle
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
            hd.Class(
              className(overlayStyles.dialog, styles.dialog, props.layoutStyle),
            ),
          ],
          isVisible
            ? [
                hd.div(
                  [
                    ...backdrop,
                    hd.DataAttribute('slot', 'mobile-nav-overlay'),
                    hd.Class(className(styles.overlay)),
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
                    hd.Class(
                      className(
                        styles.drawer,
                        side === 'start'
                          ? styles.drawerStart
                          : styles.drawerEnd,
                      ),
                    ),
                  ],
                  [
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'mobile-nav-header'),
                        hd.Class(
                          className(
                            styles.header,
                            props.title === undefined
                              ? styles.headerEnd
                              : styles.headerBetween,
                          ),
                        ),
                      ],
                      [
                        ...(props.title === undefined
                          ? [
                              hd.span(
                                [
                                  hd.Id(DialogPrimitive.titleId(model.dialog)),
                                  hd.Class(className(styles.srOnly)),
                                ],
                                [label],
                              ),
                            ]
                          : [
                              hd.h2(
                                [
                                  hd.Id(DialogPrimitive.titleId(model.dialog)),
                                  hd.DataAttribute('slot', 'mobile-nav-title'),
                                  hd.Class(
                                    className(reset.text, styles.headerTitle),
                                  ),
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
                            hd.Class(
                              className(
                                reset.button,
                                overlayStyles.close,
                                styles.close,
                              ),
                            ),
                          ],
                          [Icon.x({ class: className(styles.icon) }, hd)],
                        ),
                      ],
                    ),
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'mobile-nav-content'),
                        hd.Class(className(styles.content)),
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
  layoutStyle?: ComponentLayoutStyle
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
      h.Class(className(reset.button, styles.toggle, props.layoutStyle)),
    ],
    [Icon.menu({ class: className(styles.toggleIcon) }, h)],
  )
