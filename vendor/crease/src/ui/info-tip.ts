/* Ported from Meta Astryx InfoTip (packages/lab/src/InfoTip/InfoTip.tsx) — examples and visual spec adapted to Crease UI tokens.

   Astryx wraps Tooltip around a real button with touchTrigger="tap" so the tap
   opens the tooltip: the trigger exists only to reveal the tip. Crease's
   generic tooltip wires pointer-down to a focus guard that suppresses the
   open, so InfoTip drives the shared TooltipBehavior directly: pointer down
   sends FocusedTooltipTrigger for an immediate open (matching tap), and the
   pointer-focus suppression is skipped. */

import { Tooltip as TooltipPrimitive } from '@foldkit/ui'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'

import * as Icon from '@/lib/icon'
import * as TooltipBehavior from '@/lib/tooltip'
import { cn } from '@/lib/utils'

export const Model = TooltipBehavior.Model
export type Model = typeof Model.Type
export const Message = TooltipBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = TooltipBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = TooltipBehavior.init
export const update = TooltipBehavior.update

const CONTENT_CLASS =
  'relative z-50 w-fit !overflow-y-visible rounded-md bg-primary px-3 py-1.5 text-xs text-balance text-primary-foreground'

const ARROW_CLASS =
  'absolute size-2.5 rotate-45 rounded-[2px] bg-primary ' +
  'group-data-[placement^=top]:left-1/2 group-data-[placement^=top]:bottom-0 group-data-[placement^=top]:-translate-x-1/2 group-data-[placement^=top]:translate-y-1/2 ' +
  'group-data-[placement^=bottom]:left-1/2 group-data-[placement^=bottom]:top-0 group-data-[placement^=bottom]:-translate-x-1/2 group-data-[placement^=bottom]:-translate-y-1/2 ' +
  'group-data-[placement^=left]:top-1/2 group-data-[placement^=left]:right-0 group-data-[placement^=left]:translate-x-1/2 group-data-[placement^=left]:-translate-y-1/2 ' +
  'group-data-[placement^=right]:top-1/2 group-data-[placement^=right]:left-0 group-data-[placement^=right]:-translate-x-1/2 group-data-[placement^=right]:-translate-y-1/2'

const TRIGGER_CLASS =
  'm-0 inline-flex cursor-pointer items-center justify-center rounded-full p-0.5 align-middle text-muted-foreground transition-colors duration-150 ease-in-out aria-disabled:cursor-default [@media(hover:hover)]:hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

export type InfoTipSize = 'xsm' | 'sm' | 'md' | 'lg'
export type InfoTipSide = 'top' | 'right' | 'bottom' | 'left'
export type InfoTipAlign = 'start' | 'center' | 'end'

type Placement = NonNullable<TooltipPrimitive.AnchorConfig['placement']>

const PLACEMENTS: Readonly<
  Record<InfoTipSide, Readonly<Record<InfoTipAlign, Placement>>>
> = {
  top: { start: 'top-start', center: 'top', end: 'top-end' },
  right: { start: 'right-start', center: 'right', end: 'right-end' },
  bottom: { start: 'bottom-start', center: 'bottom', end: 'bottom-end' },
  left: { start: 'left-start', center: 'left', end: 'left-end' },
}

const SIZE_CLASS: Readonly<Record<InfoTipSize, string>> = {
  xsm: '[&_svg]:size-3',
  sm: '[&_svg]:size-3.5',
  md: '[&_svg]:size-4',
  lg: '[&_svg]:size-4.5',
}

export type InfoTipProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Content shown in the tooltip. Keep it short and non-interactive. */
  content: Html | string
  /** Accessible name for the trigger button. Defaults to 'More information'. */
  label?: string
  /** Info icon size: xsm 12px, sm 14px, md 16px, lg 18px. */
  size?: InfoTipSize
  side?: InfoTipSide
  align?: InfoTipAlign
  class?: string
}>

export const infoTip = <Msg>(
  props: InfoTipProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const placement = PLACEMENTS[props.side ?? 'top'][props.align ?? 'center']
  const triggerId = `${props.model.id}-trigger`
  const panelId = `${props.model.id}-panel`
  const send = props.toParentMessage
  const anchor = { placement, gap: 4 }

  return h.div(
    [
      h.DataAttribute('slot', 'info-tip'),
      h.Class('inline-flex shrink-0 items-center align-middle'),
    ],
    [
      h.button(
        [
          h.Id(triggerId),
          h.Type('button'),
          h.AriaLabel(props.label ?? 'More information'),
          h.AriaDescribedBy(panelId),
          h.DataAttribute('slot', 'info-tip-trigger'),
          h.Class(
            cn(TRIGGER_CLASS, SIZE_CLASS[props.size ?? 'sm'], props.class),
          ),
          h.OnMouseEnter(send(Message.EnteredTooltipTrigger())),
          h.OnMouseLeave(send(Message.LeftTooltipTrigger())),
          h.OnFocus(send(Message.FocusedTooltipTrigger())),
          h.OnBlur(send(Message.BlurredTooltipTrigger())),
          h.OnPointerDown(() =>
            Option.some(send(Message.FocusedTooltipTrigger())),
          ),
          h.OnKeyDownPreventDefault(key =>
            key === 'Escape' && props.model.isOpen
              ? Option.some(send(Message.PressedEscapeOnTooltip()))
              : Option.none(),
          ),
        ],
        [Icon.info({}, h)],
      ),
      ...(props.model.isOpen
        ? [
            h.div(
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
                    () => send(Message.CompletedTooltipAnchor()),
                  ),
                ),
                h.DataAttribute('open', ''),
                h.DataAttribute('slot', 'tooltip-content'),
                h.Class(cn(CONTENT_CLASS, 'group')),
              ],
              [
                props.content,
                h.span(
                  [
                    h.AriaHidden(true),
                    h.DataAttribute('slot', 'tooltip-arrow'),
                    h.Class(ARROW_CLASS),
                  ],
                  [],
                ),
              ],
            ),
          ]
        : []),
    ],
  )
}

/*
Minimal wiring:
const model = init({ id: 'field-tip' })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
infoTip({
  model,
  toParentMessage: message => GotInfoTipMessage({ message }),
  content: 'Editors can change this field; viewers cannot.',
})
*/
