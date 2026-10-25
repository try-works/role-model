import { Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx ChatReasoning.tsx (packages/lab) — compact
   collapsible reasoning/thinking display. Astryx's StyleX token map is
   adapted to Crease UI tokens; the disabled-ink roles map onto
   muted-foreground at reduced opacity. Astryx's controlled isExpanded prop
   becomes submodel state; the parent observes changes via the
   ChangedChatReasoningExpansion OutMessage. */

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

/* astryx's ThinkingIcon: a dashed ring with two thought dots. */
const thinkingIcon = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.svg(
    [
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
  class?: string
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
      h.Class(cn('mt-2 flex flex-col', props.class)),
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
          h.Class(
            'flex min-h-6 cursor-pointer items-center gap-1.5 py-0.5 select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:rounded-sm',
          ),
        ],
        [
          h.span(
            [
              h.Class(
                'inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground',
              ),
            ],
            [thinkingIcon(h)],
          ),
          h.div(
            [h.Class('flex min-w-0 items-center gap-1 overflow-hidden')],
            [
              h.span(
                [
                  h.Class(
                    cn(
                      'shrink-0 text-xs leading-5 font-medium whitespace-nowrap text-muted-foreground',
                      isStreaming ? 'shimmer' : undefined,
                    ),
                  ),
                ],
                [props.label ?? 'Thinking'],
              ),
              ...(props.duration !== undefined && !isStreaming
                ? [
                    h.span(
                      [
                        h.Class('shrink-0 text-xs text-muted-foreground/50'),
                        h.AriaHidden(true),
                      ],
                      ['·'],
                    ),
                    h.span(
                      [
                        h.Class(
                          'shrink-0 text-xs leading-5 whitespace-nowrap text-muted-foreground/50',
                        ),
                      ],
                      [props.duration],
                    ),
                  ]
                : []),
              ...(!isExpanded && previewText !== undefined && !isStreaming
                ? [
                    h.span(
                      [
                        h.Class('shrink-0 text-xs text-muted-foreground/50'),
                        h.AriaHidden(true),
                      ],
                      ['—'],
                    ),
                    h.span(
                      [
                        h.Class(
                          'min-w-0 truncate text-xs leading-5 whitespace-nowrap text-muted-foreground/50',
                        ),
                      ],
                      [previewText],
                    ),
                  ]
                : []),
            ],
          ),
          h.span(
            [
              h.Class(
                cn(
                  'inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground/50 transition-transform duration-150 ease-in-out',
                  isExpanded ? 'rotate-180' : undefined,
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
          // Collapsed content is only clipped visually, which leaves it in
          // the accessibility tree; inert removes it while keeping the
          // grid-template-rows expand/collapse transition running.
          h.Inert(!isExpanded),
          h.Class(
            cn(
              'grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none',
              isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            ),
          ),
        ],
        [
          h.div(
            [h.Class('min-h-0 overflow-hidden')],
            [
              h.div(
                [
                  h.Class(
                    'pt-2 pl-[22px] text-xs leading-5 text-muted-foreground',
                  ),
                ],
                [...props.children],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
