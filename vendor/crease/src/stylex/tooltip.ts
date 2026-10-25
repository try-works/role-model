import { reset } from '@/stylex/reset'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Tooltip as TooltipPrimitive } from '@foldkit/ui'
import { Option } from 'effect'
import * as Mount from 'foldkit/mount'

import * as TooltipBehavior from '@/lib/tooltip'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { overlayStyles } from './overlay-tokens.stylex'
import type {
  ButtonSize,
  ButtonVariant,
  ComponentLayoutStyle,
} from './contracts'
import * as Button from './button'
import { themedAnchor } from './overlay-boundary'
import { className } from './style'

const styles = stylex.create({
  content: { overflowY: 'visible' },
  customContent: {
    maxWidth: 'min(20rem, calc(100vw - 2rem))',
    width: 'max-content',
  },
  customRoot: { display: 'inline-flex', position: 'relative' },
  disabledTrigger: { display: 'inline-block', width: 'fit-content' },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* Ported from shadcn/ui tooltip.tsx on top of foldkit Tooltip.

   Foldkit's floating anchor may flip a panel to avoid collisions. The arrow is
   styled from the anchor's runtime data-placement, so it follows that flip. */

export const Model = TooltipBehavior.Model
export type Model = typeof Model.Type
export const Message = TooltipBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = TooltipBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = TooltipBehavior.init
export const update = TooltipBehavior.update
export const reflectShowDelay = TooltipBehavior.reflectShowDelay
export const reflectCloseDelay = TooltipBehavior.reflectCloseDelay

const CONTENT_CLASS = styles.content

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
export type TooltipAlign = 'start' | 'center' | 'end'

type Placement = NonNullable<TooltipPrimitive.AnchorConfig['placement']>

const PLACEMENTS: Readonly<
  Record<TooltipSide, Readonly<Record<TooltipAlign, Placement>>>
> = {
  top: { start: 'top-start', center: 'top', end: 'top-end' },
  right: { start: 'right-start', center: 'right', end: 'right-end' },
  bottom: { start: 'bottom-start', center: 'bottom', end: 'bottom-end' },
  left: { start: 'left-start', center: 'left', end: 'left-end' },
}

const ARROW_CLASS = overlayStyles.arrow

export type TooltipProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  content: Html | string
  align?: TooltipAlign
  side?: TooltipSide
  isDisabled?: boolean
  ariaLabel?: string
  /** Render with the Crease UI Button component while retaining tooltip trigger behavior. */
  triggerButtonVariant?: ButtonVariant
  triggerButtonSize?: ButtonSize
  triggerLayoutStyle?: ComponentLayoutStyle
  layoutStyle?: ComponentLayoutStyle
  showArrow?: boolean
  gap?: number
  offset?: number
  /** Only the theme-safe inline mode is supported by the StyleX boundary. */
  portal?: false
}> &
  (
    | Readonly<{ trigger: Html | string; renderTrigger?: undefined }>
    | Readonly<{
        trigger?: undefined
        /** Attach tooltip behavior to an existing link or control without nesting buttons. */
        renderTrigger: (
          attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
        ) => Html
      }>
  )

export const tooltip = <Msg>(
  props: TooltipProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const side = props.side ?? 'top'
  const placement = PLACEMENTS[side][props.align ?? 'center']

  const triggerId = `${props.model.id}-trigger`
  const panelId = `${props.model.id}-panel`
  const disabled = props.isDisabled ?? false
  const hasButtonTrigger =
    props.triggerButtonVariant !== undefined ||
    props.triggerButtonSize !== undefined
  const renderTrigger = (
    attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ): Html =>
    props.renderTrigger !== undefined
      ? props.renderTrigger(attributes)
      : hasButtonTrigger
        ? Button.button(
            {
              variant: props.triggerButtonVariant ?? 'default',
              size: props.triggerButtonSize ?? 'default',
              isDisabled: disabled,
              slot: disabled ? 'button' : 'tooltip-trigger',
              buttonAttributes: attributes,
              ...(props.ariaLabel === undefined
                ? {}
                : { ariaLabel: props.ariaLabel }),
              ...(props.triggerLayoutStyle === undefined
                ? {}
                : { layoutStyle: props.triggerLayoutStyle }),
              children,
            },
            h,
          )
        : h.button(attributes, children)
  const send = props.toParentMessage
  const anchor = themedAnchor({
    placement,
    gap: props.gap ?? 4,
    ...(props.offset === undefined ? {} : { offset: props.offset }),
  })
  const root = props.renderTrigger === undefined ? h.div : h.span
  return root(
    [
      h.DataAttribute('slot', 'tooltip'),
      ...(props.renderTrigger === undefined
        ? []
        : [h.Class(className(styles.customRoot))]),
    ],
    [
      ...(disabled
        ? [
            h.span(
              [
                h.Id(triggerId),
                h.AriaDescribedBy(panelId),
                h.DataAttribute('slot', 'tooltip-trigger'),
                h.Class(className(styles.disabledTrigger)),
                h.OnMouseEnter(
                  send(TooltipBehavior.Message.EnteredTooltipTrigger()),
                ),
                h.OnMouseLeave(
                  send(TooltipBehavior.Message.LeftTooltipTrigger()),
                ),
                h.OnPointerDown(pointerType =>
                  Option.some(
                    send(
                      TooltipBehavior.Message.PressedPointerOnTooltipTrigger({
                        pointerType,
                      }),
                    ),
                  ),
                ),
              ],
              [
                renderTrigger(
                  [
                    ...(hasButtonTrigger || props.renderTrigger !== undefined
                      ? []
                      : [h.Class(cn(reset.button, props.triggerLayoutStyle))]),
                    ...(props.renderTrigger === undefined
                      ? [h.Type('button'), h.Disabled(true)]
                      : []),
                    ...(props.ariaLabel === undefined
                      ? []
                      : [h.AriaLabel(props.ariaLabel)]),
                  ],
                  [props.trigger ?? ''],
                ),
              ],
            ),
          ]
        : [
            renderTrigger(
              [
                ...(hasButtonTrigger || props.renderTrigger !== undefined
                  ? []
                  : [h.Class(cn(reset.button, props.triggerLayoutStyle))]),
                h.Id(triggerId),
                ...(props.renderTrigger === undefined
                  ? [h.Type('button'), h.Disabled(false)]
                  : []),
                h.AriaDescribedBy(panelId),
                ...(props.ariaLabel === undefined
                  ? []
                  : [h.AriaLabel(props.ariaLabel)]),
                h.OnMouseEnter(
                  send(TooltipBehavior.Message.EnteredTooltipTrigger()),
                ),
                h.OnMouseLeave(
                  send(TooltipBehavior.Message.LeftTooltipTrigger()),
                ),
                h.OnFocus(
                  send(TooltipBehavior.Message.FocusedTooltipTrigger()),
                ),
                h.OnBlur(send(TooltipBehavior.Message.BlurredTooltipTrigger())),
                h.OnPointerDown(pointerType =>
                  Option.some(
                    send(
                      TooltipBehavior.Message.PressedPointerOnTooltipTrigger({
                        pointerType,
                      }),
                    ),
                  ),
                ),
                h.OnKeyDownPreventDefault(key =>
                  key === 'Escape' && props.model.isOpen
                    ? Option.some(
                        send(TooltipBehavior.Message.PressedEscapeOnTooltip()),
                      )
                    : Option.none(),
                ),
                h.DataAttribute('slot', 'tooltip-trigger'),
              ],
              [props.trigger ?? ''],
            ),
          ]),
      ...(props.model.isOpen
        ? [
            root(
              [
                h.Id(panelId),
                h.Role('tooltip'),
                h.Style({
                  position: 'absolute',
                  margin: '0',
                  visibility: 'hidden',
                  pointerEvents: 'none',
                }),
                h.OnMount(
                  Mount.mapMessage(
                    TooltipPrimitive.AnchorTooltip({
                      buttonId: triggerId,
                      anchor,
                    }),
                    () =>
                      send(TooltipBehavior.Message.CompletedTooltipAnchor()),
                  ),
                ),
                h.DataAttribute('open', ''),
                h.DataAttribute('slot', 'tooltip-content'),
                h.Class(
                  cn(
                    overlayStyles.tooltip,
                    CONTENT_CLASS,
                    props.renderTrigger !== undefined && styles.customContent,
                    props.layoutStyle,
                  ),
                ),
              ],
              [
                props.content,
                ...(props.showArrow === false
                  ? []
                  : [
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.DataAttribute('slot', 'tooltip-arrow'),
                          h.Class(className(ARROW_CLASS)),
                        ],
                        [],
                      ),
                    ]),
              ],
            ),
          ]
        : []),
    ],
  )
}

/*
Minimal wiring:
const model = init({ id: 'save-tooltip', showDelay: 0 })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
    const maybeVisibility = Option.fromNullishOr(nextModelOp__.outMessage);
tooltip({
  model,
  toParentMessage: message => GotTooltipMessage({ message }),
  trigger: saveIcon,
  content: 'Save changes',
})
*/
