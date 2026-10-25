import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Tooltip as TooltipPrimitive } from '@foldkit/ui'
import { Option } from 'effect'
import * as Mount from 'foldkit/mount'

import * as TooltipBehavior from '@/lib/tooltip'
import { cn } from '@/lib/utils'

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

const CONTENT_CLASS =
  'relative z-50 w-fit !overflow-y-visible rounded-md bg-primary px-3 py-1.5 text-xs text-balance text-primary-foreground'

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

const ARROW_CLASS =
  'absolute size-2.5 rotate-45 rounded-[2px] bg-primary ' +
  'group-data-[placement^=top]:left-1/2 group-data-[placement^=top]:bottom-0 group-data-[placement^=top]:-translate-x-1/2 group-data-[placement^=top]:translate-y-1/2 ' +
  'group-data-[placement^=bottom]:left-1/2 group-data-[placement^=bottom]:top-0 group-data-[placement^=bottom]:-translate-x-1/2 group-data-[placement^=bottom]:-translate-y-1/2 ' +
  'group-data-[placement^=left]:top-1/2 group-data-[placement^=left]:right-0 group-data-[placement^=left]:translate-x-1/2 group-data-[placement^=left]:-translate-y-1/2 ' +
  'group-data-[placement^=right]:top-1/2 group-data-[placement^=right]:left-0 group-data-[placement^=right]:-translate-x-1/2 group-data-[placement^=right]:-translate-y-1/2'

export type TooltipProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  content: Html | string
  align?: TooltipAlign
  side?: TooltipSide
  isDisabled?: boolean
  ariaLabel?: string
  triggerClass?: string
  class?: string
  showArrow?: boolean
  gap?: number
  offset?: number
  portal?: boolean
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
  const renderTrigger = (
    attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ): Html =>
    props.renderTrigger === undefined
      ? h.button(attributes, children)
      : props.renderTrigger(attributes)
  const send = props.toParentMessage
  const anchor = {
    placement,
    gap: props.gap ?? 4,
    ...(props.offset === undefined ? {} : { offset: props.offset }),
    ...(props.portal === undefined ? {} : { portal: props.portal }),
  }
  const root = props.renderTrigger === undefined ? h.div : h.span
  return root(
    [
      h.DataAttribute('slot', 'tooltip'),
      ...(props.renderTrigger === undefined
        ? []
        : [h.Class('relative inline-flex')]),
    ],
    [
      ...(disabled
        ? [
            h.span(
              [
                h.Id(triggerId),
                h.AriaDescribedBy(panelId),
                h.DataAttribute('slot', 'tooltip-trigger'),
                h.Class('inline-block w-fit'),
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
                    ...(props.renderTrigger === undefined
                      ? [h.Type('button'), h.Disabled(true)]
                      : []),
                    ...(props.ariaLabel === undefined
                      ? []
                      : [h.AriaLabel(props.ariaLabel)]),
                    ...(props.triggerClass === undefined
                      ? []
                      : [h.Class(cn(props.triggerClass))]),
                  ],
                  [props.trigger ?? ''],
                ),
              ],
            ),
          ]
        : [
            renderTrigger(
              [
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
                ...(props.triggerClass === undefined
                  ? []
                  : [h.Class(cn(props.triggerClass))]),
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
                    CONTENT_CLASS,
                    'group',
                    props.renderTrigger !== undefined &&
                      'w-max max-w-[min(20rem,calc(100vw-2rem))]',
                    props.class,
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
                          h.Class(ARROW_CLASS),
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
