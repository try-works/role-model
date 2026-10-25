import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'
import type { Anchor } from '@foldkit/ui'

import * as HoverCardBehavior from '@/lib/hover-card'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { overlayStyles } from './overlay-tokens.stylex'
import { themedAnchor } from './overlay-boundary'
import type {
  ButtonVariant,
  ButtonSize,
  ComponentLayoutStyle,
} from './contracts'
import { className } from './style'
import * as Button from './button'
import { tokens } from './tokens.stylex'
import { foundationTokens } from './foundations-tokens.stylex'

const styles = stylex.create({
  base: { display: 'inline-flex', position: 'relative' },
  content: {
    padding: '1rem',
    borderRadius: tokens.controlRadius,
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    position: 'absolute',
    maxWidth: 'calc(100vw - 2rem)',
    width: '16rem',
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

export const Model = HoverCardBehavior.Model
export type Model = typeof Model.Type

export const Entered = HoverCardBehavior.Message.EnteredHoverCard
export const Left = HoverCardBehavior.Message.LeftHoverCard
export const Focused = HoverCardBehavior.Message.FocusedHoverCardTrigger
export const Blurred = HoverCardBehavior.Message.BlurredHoverCardTrigger
export const PressedEscape = HoverCardBehavior.Message.PressedEscapeOnHoverCard
export const PressedPointer =
  HoverCardBehavior.Message.PressedPointerOnHoverCardTrigger
export const CompletedAnchor =
  HoverCardBehavior.Message.CompletedHoverCardAnchor
export const CompletedWaitBeforeShowingHoverCard =
  HoverCardBehavior.Message.CompletedWaitBeforeShowingHoverCard
export const CompletedWaitBeforeClosingHoverCard =
  HoverCardBehavior.Message.CompletedWaitBeforeClosingHoverCard
export const Message = HoverCardBehavior.Message
export type Message = typeof Message.Type

export type InitConfig = HoverCardBehavior.InitConfig
export const init = HoverCardBehavior.init
export const update = HoverCardBehavior.update
export const reflectShowDelay = HoverCardBehavior.reflectShowDelay
export const reflectCloseDelay = HoverCardBehavior.reflectCloseDelay

const CONTENT_CLASS = overlayStyles.panel

export type HoverCardSide = 'top' | 'right' | 'bottom' | 'left'
export type HoverCardAlign = 'start' | 'center' | 'end'

type Placement = NonNullable<Anchor.AnchorConfig['placement']>
const PLACEMENTS: Readonly<
  Record<HoverCardSide, Readonly<Record<HoverCardAlign, Placement>>>
> = {
  top: { start: 'top-start', center: 'top', end: 'top-end' },
  right: { start: 'right-start', center: 'right', end: 'right-end' },
  bottom: { start: 'bottom-start', center: 'bottom', end: 'bottom-end' },
  left: { start: 'left-start', center: 'left', end: 'left-end' },
}

export type HoverCardProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  trigger: Html | string
  content: Html | string
  /** Compose one Crease UI Button with the hover-card trigger behavior. */
  triggerButtonVariant?: ButtonVariant
  triggerButtonSize?: ButtonSize
  align?: HoverCardAlign
  side?: HoverCardSide
  isDisabled?: boolean
  ariaLabel?: string
  triggerLayoutStyle?: ComponentLayoutStyle
  layoutStyle?: ComponentLayoutStyle
}>

export const hoverCard = <Msg>(
  props: HoverCardProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const panelId = `${props.model.id}-content`
  const triggerId = `${props.model.id}-trigger`
  const disabled = props.isDisabled ?? false
  const enter = props.toParentMessage(Entered())
  const leave = props.toParentMessage(Left())

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
            slot: 'hover-card-trigger',
            isDisabled: disabled,
            buttonAttributes: attributes,
            ...(props.triggerLayoutStyle === undefined
              ? {}
              : { layoutStyle: props.triggerLayoutStyle }),
            children: [props.trigger],
          },
          h,
        )
      : h.button(attributes, [props.trigger])

  return h.div(
    [
      h.DataAttribute('slot', 'hover-card'),
      h.OnMouseEnter(enter),
      h.OnMouseLeave(leave),
      h.Class(className(styles.base)),
    ],
    [
      renderTrigger([
        h.Type('button'),
        h.Id(triggerId),
        h.Disabled(disabled),
        h.AriaExpanded(props.model.isOpen),
        h.AriaControls(panelId),
        h.OnFocus(props.toParentMessage(Focused())),
        h.OnBlur(props.toParentMessage(Blurred())),
        h.OnPointerDown(pointerType =>
          Option.some(props.toParentMessage(PressedPointer({ pointerType }))),
        ),
        h.OnKeyDownPreventDefault(key =>
          key === 'Escape' && props.model.isOpen
            ? Option.some(props.toParentMessage(PressedEscape()))
            : Option.none(),
        ),
        ...(props.ariaLabel === undefined
          ? []
          : [h.AriaLabel(props.ariaLabel)]),
        h.DataAttribute('slot', 'hover-card-trigger'),
        ...(hasButtonTrigger
          ? []
          : [h.Class(cn(reset.button, props.triggerLayoutStyle))]),
      ]),
      ...(props.model.isOpen
        ? [
            h.div(
              [
                h.Id(panelId),
                h.DataAttribute('slot', 'hover-card-content'),
                h.Style({ position: 'absolute', visibility: 'hidden' }),
                h.OnMount(
                  Mount.mapMessage(
                    HoverCardBehavior.AnchorHoverCard({
                      buttonId: triggerId,
                      anchor: themedAnchor({
                        placement:
                          PLACEMENTS[props.side ?? 'bottom'][
                            props.align ?? 'center'
                          ],
                        gap: 8,
                        padding: 8,
                        portal: false,
                      }),
                    }),
                    () => props.toParentMessage(CompletedAnchor()),
                  ),
                ),
                h.Class(cn(CONTENT_CLASS, styles.content, props.layoutStyle)),
              ],
              [props.content],
            ),
          ]
        : []),
    ],
  )
}
