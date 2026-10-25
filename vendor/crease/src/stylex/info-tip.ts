import { reset } from '@/stylex/reset'
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
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'

import * as Icon from '@/lib/icon'
import * as TooltipBehavior from '@/lib/tooltip'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { overlayStyles } from './overlay-tokens.stylex'
import { themedAnchor } from './overlay-boundary'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

export const Model = TooltipBehavior.Model
export type Model = typeof Model.Type
export const Message = TooltipBehavior.Message
export type Message = typeof Message.Type
export const OutMessage = TooltipBehavior.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = TooltipBehavior.init
export const update = TooltipBehavior.update

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    verticalAlign: 'middle',
  },
  trigger: {
    margin: 0,
    padding: '0.125rem',
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'none',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': {
        default: null,
        '@media (hover: hover)': tokens.foreground,
      },
    },
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    justifyContent: 'center',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color',
    transitionTimingFunction: interactionTokens.easingStandard,
    verticalAlign: 'middle',
  },
  content: { overflowY: 'visible' },
  iconXsm: { height: '0.75rem', width: '0.75rem' },
  iconSm: { height: '0.875rem', width: '0.875rem' },
  iconMd: { height: '1rem', width: '1rem' },
  iconLg: { height: '1.125rem', width: '1.125rem' },
})

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

const SIZE_STYLE: Readonly<Record<InfoTipSize, StaticStyles>> = {
  xsm: styles.iconXsm,
  sm: styles.iconSm,
  md: styles.iconMd,
  lg: styles.iconLg,
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
  layoutStyle?: ComponentLayoutStyle
}>

export const infoTip = <Msg>(
  props: InfoTipProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const placement = PLACEMENTS[props.side ?? 'top'][props.align ?? 'center']
  const triggerId = `${props.model.id}-trigger`
  const panelId = `${props.model.id}-panel`
  const send = props.toParentMessage
  const anchor = themedAnchor({ placement, gap: 4 })

  return h.div(
    [h.DataAttribute('slot', 'info-tip'), h.Class(className(styles.root))],
    [
      h.button(
        [
          h.Id(triggerId),
          h.Type('button'),
          h.AriaLabel(props.label ?? 'More information'),
          h.AriaDescribedBy(panelId),
          h.DataAttribute('slot', 'info-tip-trigger'),
          h.Class(className(reset.button, styles.trigger, props.layoutStyle)),
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
        [Icon.info({ class: className(SIZE_STYLE[props.size ?? 'sm']) }, h)],
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
                h.Class(className(overlayStyles.tooltip, styles.content)),
              ],
              [
                props.content,
                h.span(
                  [
                    h.AriaHidden(true),
                    h.DataAttribute('slot', 'tooltip-arrow'),
                    h.Class(className(overlayStyles.arrow)),
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
