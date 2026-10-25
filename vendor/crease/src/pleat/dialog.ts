import { Style, When } from '@pleat/core'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import { overlayStyles } from './overlay-tokens'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'

import { layoutStyle } from './contracts'
const styles = {
  content: Style.make({
    padding: '1.5rem',
    gap: '1rem',
    display: 'grid',
    outlineStyle: 'none',
    maxWidth: '32rem',
  }),
  settings: Style.make({
    padding: 0,
    overflow: 'hidden',
    maxHeight: 'calc(100svh - 2rem)',
    maxWidth: 'min(50rem, calc(100vw - 2rem))',
    width: '100%',
  }).pipe(Style.when(When.minWidth('768px'), { maxHeight: '35rem' })),
  settingsHeaderMargin: layoutStyle({
    marginInline: '1.5rem',
    marginTop: '1.5rem',
  }),
  icon: Style.make({
    display: 'block',
    flexShrink: 0,
    verticalAlign: 'middle',
    height: '1rem',
    width: '1rem',
  }),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* Ported from shadcn/ui dialog.tsx on top of the foldkit Dialog submodel.

   Class strings are shadcn's, with two adaptations:
   - Centering: foldkit renders a native <dialog> that is already fixed inset-0
     fullscreen, so the panel is flex-centered by the wrapper instead of
     shadcn's fixed + translate(-50%,-50%) trick.
   - Animation: foldkit marks transition phases with data-closed/data-enter/
     data-leave (Headless-UI style) instead of Radix's data-[state]. shadcn's
     animate-in/fade-in-0/zoom-in-95 become CSS transitions driven by
     data-[closed]:. Pass isAnimated: true to init for the transition to run.

   State (Model/Message/update) is the foldkit Dialog's own — re-exported here
   so consumers import everything from this module, shadcn-style. */

export const Model = DialogPrimitive.Model
export type Model = typeof Model.Type
export const Message = DialogPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = DialogPrimitive.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = DialogPrimitive.init
export const update = DialogPrimitive.update
export const open = DialogPrimitive.open
export const close = DialogPrimitive.close

const DIALOG_CLASS = overlayStyles.dialog

const OVERLAY_CLASS = overlayStyles.overlay

const CONTENT_CLASS = styles.content

const HEADER_CLASS = overlayStyles.header

export const FOOTER_CLASS = overlayStyles.footer

const TITLE_CLASS = overlayStyles.title

const DESCRIPTION_CLASS = overlayStyles.description

const CLOSE_CLASS = overlayStyles.close

/** Attribute bundles handed to the content/footer slots so consumer buttons
 *  can close the dialog without a parent message (spread onto your button). */
export type DialogSlots = Readonly<{
  closeButton: ReadonlyArray<ChildAttribute>
  initialFocusAttributes: () => ReadonlyArray<ChildAttribute>
}>

export type DialogPartProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export type DialogTextPartProps = DialogPartProps &
  Readonly<{ attributes: ReadonlyArray<ChildAttribute> }>

export type DialogCloseProps = Readonly<{
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
  ariaLabel?: string
}>

export const dialogHeader = <Msg>(
  props: DialogPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'dialog-header'),
      h.Class(cn(HEADER_CLASS, props.layoutStyle)),
    ],
    [...props.children],
  )

export const dialogTitle = <Msg>(
  props: DialogTextPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.h2(
    [
      ...props.attributes,
      h.DataAttribute('slot', 'dialog-title'),
      h.Class(cn(reset.text, TITLE_CLASS, props.layoutStyle)),
    ],
    [...props.children],
  )

export const dialogDescription = <Msg>(
  props: DialogTextPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.p(
    [
      ...props.attributes,
      h.DataAttribute('slot', 'dialog-description'),
      h.Class(cn(reset.text, DESCRIPTION_CLASS, props.layoutStyle)),
    ],
    [...props.children],
  )

export const dialogFooter = <Msg>(
  props: DialogPartProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'dialog-footer'),
      h.Class(cn(FOOTER_CLASS, props.layoutStyle)),
    ],
    [...props.children],
  )

export type DialogParts<Msg> = Readonly<{
  header: (props: DialogPartProps) => Html
  title: (props: Omit<DialogTextPartProps, 'attributes'>) => Html
  description: (props: Omit<DialogTextPartProps, 'attributes'>) => Html
  footer: (props: DialogPartProps) => Html
  close: (props?: DialogCloseProps) => Html
  closeButtonAttributes: ReadonlyArray<ChildAttribute>
  initialFocusAttributes: () => ReadonlyArray<ChildAttribute>
}>

export type DialogProps<Msg> = Readonly<{
  size?: 'default' | 'settings'
  model: Model
  toParentMessage: (message: Message) => Msg
  title: string
  description?: string
  content?: (slots: DialogSlots) => ReadonlyArray<Html>
  footer?: (slots: DialogSlots) => ReadonlyArray<Html>
  /** Replaces the default header/content/footer layout with shadcn-like,
   *  bound part builders while the Foldkit model still owns behavior. */
  layout?: (parts: DialogParts<Msg>) => ReadonlyArray<Html>
  showCloseButton?: boolean
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const xIcon = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return h.svg(
    [
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('2'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.Class(className(reset.svg, styles.icon)),
      h.AriaHidden(true),
    ],
    [h.path([h.D('M18 6 6 18')], []), h.path([h.D('m6 6 12 12')], [])],
  )
}

export const dialog = <Msg>(
  props: DialogProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.submodel({
    slotId: props.model.id,
    model: props.model,
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
        let initialFocusClaimed = false
        const initialFocusAttributes = (): ReadonlyArray<ChildAttribute> => {
          initialFocusClaimed = true
          return initialFocus
        }
        const slots: DialogSlots = { closeButton, initialFocusAttributes }
        const parts: DialogParts<Msg> = {
          header: partProps => dialogHeader(partProps, hd),
          title: partProps =>
            dialogTitle({ ...partProps, attributes: title }, hd),
          description: partProps =>
            dialogDescription({ ...partProps, attributes: description }, hd),
          footer: partProps => dialogFooter(partProps, hd),
          close: (partProps = {}) =>
            hd.button(
              [
                ...closeButton,
                hd.Type('button'),
                hd.DataAttribute('slot', 'dialog-close'),
                hd.AriaLabel(partProps.ariaLabel ?? 'Close'),
                hd.Class(cn(reset.button, CLOSE_CLASS, partProps.layoutStyle)),
              ],
              [...(partProps.children ?? [xIcon(h)])],
            ),
          closeButtonAttributes: closeButton,
          initialFocusAttributes,
        }
        const content = props.layout?.(parts) ?? [
          parts.header({
            ...(props.size === 'settings'
              ? { layoutStyle: styles.settingsHeaderMargin }
              : {}),
            children: [
              parts.title({ children: [props.title] }),
              ...(props.description === undefined
                ? []
                : [parts.description({ children: [props.description] })]),
            ],
          }),
          ...(props.content === undefined ? [] : props.content(slots)),
          ...(props.footer === undefined
            ? []
            : [parts.footer({ children: props.footer(slots) })]),
          ...((props.showCloseButton ?? true) ? [parts.close()] : []),
        ]
        const panelFocusAttributes = initialFocusClaimed
          ? []
          : [...initialFocus, hd.Attribute('tabindex', '-1')]

        return hd.dialog(
          [...dialogAttributes, hd.Class(className(DIALOG_CLASS))],
          isVisible
            ? [
                hd.div([...backdrop, hd.Class(className(OVERLAY_CLASS))], []),
                hd.div(
                  [
                    ...panel,
                    ...panelFocusAttributes,
                    hd.DataAttribute('slot', 'dialog-content'),
                    hd.Class(
                      cn(
                        overlayStyles.panel,
                        CONTENT_CLASS,
                        overlayStyles.modal,
                        props.size === 'settings' && styles.settings,
                        props.layoutStyle,
                      ),
                    ),
                  ],
                  content,
                ),
              ]
            : [],
        )
      },
    },
    toParentMessage: props.toParentMessage,
  })
}
