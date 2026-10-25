import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Popover as PopoverPrimitive } from '@foldkit/ui'

import { overlayStyles } from './overlay-tokens'
import type {
  ButtonSize,
  ButtonVariant,
  ComponentLayoutStyle,
} from './contracts'
import * as Button from './button'
import { themedAnchor, themedPopoverPanel } from './overlay-boundary'
import { className } from './style'
import { complexTokens } from './complex-tokens'
import { tokens } from './tokens'

const styles = {
  content: Style.make({
    padding: '1rem',
    maxHeight: '24rem',
    overflowY: 'auto',
    width: 'max-content',
  }),
  bare: Style.make({
    padding: 0,
    backgroundColor: tokens.transparent,
    borderWidth: 0,
  }),
  sidebarTrigger: Style.make({
    padding: '0.5rem',
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: 'fit-content',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
  ),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* Ported from shadcn/ui popover.tsx on top of the foldkit Popover submodel.
   Radix keyframe animations are finite transitions driven by foldkit's
   data-closed phase. Pass isAnimated: true to init. */

export const Model = PopoverPrimitive.Model
export type Model = typeof Model.Type
export const Message = PopoverPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = PopoverPrimitive.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = PopoverPrimitive.init
export const update = PopoverPrimitive.update
export const open = PopoverPrimitive.open
export const close = PopoverPrimitive.close
export const RequestedOpen = PopoverPrimitive.Message.RequestedOpen
export const RequestedClose = PopoverPrimitive.Message.RequestedClose

const CONTENT_CLASS = styles.content

const BACKDROP_CLASS = overlayStyles.backdrop

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left'
export type PopoverAlign = 'start' | 'center' | 'end'

type Placement = NonNullable<PopoverPrimitive.AnchorConfig['placement']>

const PLACEMENTS: Readonly<
  Record<PopoverSide, Readonly<Record<PopoverAlign, Placement>>>
> = {
  top: { start: 'top-start', center: 'top', end: 'top-end' },
  right: { start: 'right-start', center: 'right', end: 'right-end' },
  bottom: { start: 'bottom-start', center: 'bottom', end: 'bottom-end' },
  left: { start: 'left-start', center: 'left', end: 'left-end' },
}

export type PopoverProps<Msg> = Readonly<{
  variant?: 'default' | 'sidebar'
  model: Model
  toParentMessage: (message: Message) => Msg
  trigger: Html | string
  /** Render with the Crease UI Button component while retaining the popover trigger behavior. */
  triggerButtonVariant?: ButtonVariant
  triggerButtonSize?: ButtonSize
  triggerLayoutStyle?: ComponentLayoutStyle | undefined
  content: Html | string
  align?: PopoverAlign
  side?: PopoverSide
  layoutStyle?: ComponentLayoutStyle | undefined
  direction?: 'ltr' | 'rtl'
  focusSelector?: string
  /** Portal the panel (theme preserved) so it escapes clipping ancestors. */
  portal?: 'themed'
  /** 'bare' drops the panel surface so the content supplies its own. */
  surface?: 'default' | 'bare'
}>

export const popover = <Msg>(
  props: PopoverProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const hasButtonTrigger =
    props.triggerButtonVariant !== undefined ||
    props.triggerButtonSize !== undefined
  const renderTrigger = (
    attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  ): Html =>
    hasButtonTrigger
      ? Button.button(
          {
            variant: props.triggerButtonVariant ?? 'default',
            size: props.triggerButtonSize ?? 'default',
            slot: 'popover-trigger',
            buttonAttributes: attributes,
            ...(props.triggerLayoutStyle === undefined
              ? {}
              : { layoutStyle: props.triggerLayoutStyle }),
            children: [props.trigger],
          },
          h,
        )
      : h.button(attributes, [props.trigger])
  const placement = PLACEMENTS[props.side ?? 'bottom'][props.align ?? 'center']

  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: PopoverPrimitive.view,
    viewInputs: {
      anchor: themedAnchor({ placement, gap: 4 }),
      ...(props.focusSelector === undefined
        ? {}
        : { focusSelector: props.focusSelector }),
      toView: ({ button, panel, backdrop, isVisible }) => {
        const hp = h

        return hp.div(
          [hp.DataAttribute('slot', 'popover')],
          [
            renderTrigger([
              ...button,
              hp.DataAttribute('slot', 'popover-trigger'),
              hp.AriaHasPopup('dialog'),
              ...(hasButtonTrigger
                ? []
                : [
                    hp.Class(
                      cn(
                        reset.button,
                        props.variant === 'sidebar' && styles.sidebarTrigger,
                        props.triggerLayoutStyle,
                      ),
                    ),
                  ]),
            ]),
            ...(isVisible
              ? [
                  hp.div(
                    [
                      ...backdrop,
                      hp.DataAttribute('slot', 'popover-backdrop'),
                      hp.Class(className(BACKDROP_CLASS)),
                    ],
                    [],
                  ),
                  hp.div(
                    [
                      ...panel,
                      ...(props.portal === 'themed'
                        ? [
                            hp.OnMount(
                              themedPopoverPanel(
                                `${props.model.id}-button`,
                                { placement, gap: 4 },
                                props.toParentMessage,
                                props.focusSelector,
                              ),
                            ),
                          ]
                        : []),
                      hp.DataAttribute('slot', 'popover-content'),
                      ...(props.direction === undefined
                        ? []
                        : [hp.Dir(props.direction)]),
                      hp.Class(
                        cn(
                          overlayStyles.panel,
                          CONTENT_CLASS,
                          overlayStyles.floating,
                          props.surface === 'bare' ? styles.bare : undefined,
                          props.layoutStyle,
                        ),
                      ),
                    ],
                    [props.content],
                  ),
                ]
              : []),
          ],
        )
      },
    },
    toParentMessage: props.toParentMessage,
  })
}

/*
Minimal wiring:
const model = init({ id: 'profile-popover', isAnimated: true })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
    const maybeVisibility = Option.fromNullishOr(nextModelOp__.outMessage);
popover({
  model,
  toParentMessage: message => GotPopoverMessage({ message }),
  trigger: 'Open profile',
  content: profileView,
  align: 'center',
  side: 'bottom',
})
*/
