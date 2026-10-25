import { reset } from '@/stylex/reset'
import { Option, Schema as S } from 'effect'
import * as stylex from '@stylexjs/stylex'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx ChatReasoning.tsx (packages/lab) — compact
   collapsible reasoning/thinking display. astryx's --color-text-disabled
   role maps onto muted-foreground at reduced opacity; the controlled
   isExpanded prop becomes submodel state reported via
   ChangedChatReasoningExpansion. */

export const Model = S.Struct({
  id: S.String,
  isExpanded: S.Boolean,
})
export type Model = typeof Model.Type

export const init = (config: { id: string; isExpanded?: boolean }): Model => ({
  id: config.id,
  isExpanded: config.isExpanded ?? false,
})

export const Message = defineMessageUnion({
  ToggledChatReasoning: {},
  SetChatReasoningExpanded: { isExpanded: S.Boolean },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedChatReasoningExpansion: { isExpanded: S.Boolean },
})
export type OutMessage = typeof OutMessage.Type

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'ToggledChatReasoning':
      return {
        model: { ...model, isExpanded: !model.isExpanded },
        outMessage: OutMessage.ChangedChatReasoningExpansion({
          isExpanded: !model.isExpanded,
        }),
      }
    case 'SetChatReasoningExpanded':
      return { model: { ...model, isExpanded: message.isExpanded } }
  }
}

const shimmerSweep = stylex.keyframes({
  from: { backgroundPosition: '100% 0' },
  to: { backgroundPosition: '0 0' },
})

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    marginBlockStart: '0.5rem',
  },
  header: {
    borderRadius: {
      default: '0px',
      ':focus-visible': foundationTokens.radiusSm,
    },
    gap: '0.375rem',
    paddingBlock: '0.125rem',
    alignItems: 'center',
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    outlineStyle: 'none',
    userSelect: 'none',
    minHeight: '1.5rem',
  },
  icon: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1rem',
    width: '1rem',
  },
  labelRow: {
    gap: '0.25rem',
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    minWidth: 0,
  },
  label: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  },
  disabledInk: {
    color: foundationTokens.mutedForeground50,
    flexShrink: 0,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  disabledInkNowrap: {
    color: foundationTokens.mutedForeground50,
    flexShrink: 0,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  },
  preview: {
    overflow: 'hidden',
    color: foundationTokens.mutedForeground50,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  chevron: {
    alignItems: 'center',
    color: foundationTokens.mutedForeground50,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '0.875rem',
    width: '0.875rem',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  shimmer: {
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundPosition: '0 0',
    /* PORT-NOTE: astryx shimmer sweep is 4s; nearest loop token is 2s. */
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: shimmerSweep,
    animationTimingFunction: interactionTokens.easingLinear,
    backgroundClip: 'text',
    backgroundImage:
      'linear-gradient(calc(90deg + 20deg), currentColor calc(50% - (3ch + 40px)), color-mix(in oklch, oklch(from currentColor l c h / calc(alpha * 0.2)), currentColor 50%) calc(50% - (3ch + 40px) * 0.5), oklch(from currentColor l c h / calc(alpha * 0.2)) 50%, color-mix(in oklch, oklch(from currentColor l c h / calc(alpha * 0.2)), currentColor 50%) calc(50% + (3ch + 40px) * 0.5), currentColor calc(50% + (3ch + 40px)))',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'calc(200% + (3ch + 40px) * 2) 100%',
  },
  content: {
    display: 'grid',
    gridTemplateRows: '0fr',
    transitionDuration: {
      default: interactionTokens.motionSlow,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'grid-template-rows',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  contentExpanded: {
    gridTemplateRows: '1fr',
  },
  contentInner: {
    overflow: 'hidden',
    minHeight: 0,
  },
  contentPadding: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    paddingBlockStart: '0.5rem',
    paddingInlineStart: '1.375rem',
  },
})

/* astryx's ThinkingIcon: a dashed ring with two thought dots. */
const thinkingIcon = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.svg(
    [
      h.Class(className(reset.svg)),
      h.Width('14'),
      h.Height('14'),
      h.ViewBox('0 0 14 14'),
      h.Fill('none'),
      h.AriaHidden(true),
    ],
    [
      h.circle(
        [
          h.Cx('7'),
          h.Cy('7'),
          h.R('5.5'),
          h.Stroke('currentColor'),
          h.StrokeWidth('1.5'),
          h.StrokeDasharray('3 2'),
        ],
        [],
      ),
      h.circle(
        [h.Cx('5.5'), h.Cy('7'), h.R('0.75'), h.Fill('currentColor')],
        [],
      ),
      h.circle(
        [h.Cx('8.5'), h.Cy('7'), h.R('0.75'), h.Fill('currentColor')],
        [],
      ),
    ],
  )

export type ChatReasoningProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Reasoning content rendered inside the expanded panel. */
  children: ReadonlyArray<Html | string>
  /** Header label. @default 'Thinking' */
  label?: string
  /** Duration string shown after the label (e.g. "12s"). */
  duration?: string
  /** Whether reasoning is still streaming. Shows shimmer on the label. */
  isStreaming?: boolean
  /** Collapsed single-line preview; falls back to string children. */
  preview?: string
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

export const chatReasoning = <Msg>(
  props: ChatReasoningProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const isExpanded = props.model.isExpanded
  const isStreaming = props.isStreaming ?? false
  const previewText =
    props.preview ??
    (props.children.length === 1 && typeof props.children[0] === 'string'
      ? props.children[0]
      : undefined)
  const contentId = `${props.model.id}-content`

  return h.div(
    [
      h.DataAttribute('slot', 'chat-reasoning'),
      h.DataAttribute('expanded', String(isExpanded)),
      h.DataAttribute('streaming', String(isStreaming)),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      h.div(
        [
          h.Role('button'),
          h.Tabindex(0),
          h.AriaExpanded(isExpanded),
          h.Attribute('aria-controls', contentId),
          h.OnClick(props.toParentMessage(Message.ToggledChatReasoning())),
          h.OnKeyDownPreventDefault(key =>
            key === 'Enter' || key === ' '
              ? Option.some(
                  props.toParentMessage(Message.ToggledChatReasoning()),
                )
              : Option.none(),
          ),
          h.Class(className(styles.header)),
        ],
        [
          h.span([h.Class(className(styles.icon))], [thinkingIcon(h)]),
          h.div(
            [h.Class(className(styles.labelRow))],
            [
              h.span(
                [
                  h.Class(
                    className(
                      styles.label,
                      ...(isStreaming ? [styles.shimmer] : []),
                    ),
                  ),
                ],
                [props.label ?? 'Thinking'],
              ),
              ...(props.duration !== undefined && !isStreaming
                ? [
                    h.span(
                      [
                        h.Class(className(styles.disabledInk)),
                        h.AriaHidden(true),
                      ],
                      ['·'],
                    ),
                    h.span(
                      [h.Class(className(styles.disabledInkNowrap))],
                      [props.duration],
                    ),
                  ]
                : []),
              ...(!isExpanded && previewText !== undefined && !isStreaming
                ? [
                    h.span(
                      [
                        h.Class(className(styles.disabledInk)),
                        h.AriaHidden(true),
                      ],
                      ['—'],
                    ),
                    h.span([h.Class(className(styles.preview))], [previewText]),
                  ]
                : []),
            ],
          ),
          h.span(
            [
              h.Class(
                className(
                  styles.chevron,
                  ...(isExpanded ? [styles.chevronExpanded] : []),
                ),
              ),
            ],
            [Icon.chevronDown({ class: 'size-3' }, h)],
          ),
        ],
      ),
      h.div(
        [
          h.Id(contentId),
          h.Inert(!isExpanded),
          h.Class(
            className(
              styles.content,
              ...(isExpanded ? [styles.contentExpanded] : []),
            ),
          ),
        ],
        [
          h.div(
            [h.Class(className(styles.contentInner))],
            [
              h.div(
                [h.Class(className(styles.contentPadding))],
                [...props.children],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
