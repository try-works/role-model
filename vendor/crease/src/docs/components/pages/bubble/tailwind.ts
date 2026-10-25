import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  bubbleFixtures,
  COLLAPSIBLE_TEXT,
  type BubbleCluster,
  type BubbleFixture,
  type BubbleReactionsSpec,
  type BubbleSpec,
} from '@/docs/components/pages/bubble/shared'
import * as Bubble from '@/ui/bubble'
import * as Button from '@/ui/button'
import * as Icon from '@/lib/icon'
import * as Popover from '@/ui/popover'
import * as Tooltip from '@/ui/tooltip'

const PreviewMessage = defineMessageUnion({
  ClickedOption: { label: S.String },
  ClickedRunIt: {},
  ToggledCollapsible: { isOpen: S.Boolean },
  GotTooltipMessage: { message: Tooltip.Message },
  GotPopoverMessage: { message: Popover.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('bubble'),
  lastClicked: S.UndefinedOr(S.String),
  ranIt: S.Boolean,
  open: S.Boolean,
  tooltip: Tooltip.Model,
  popover: Popover.Model,
})
type PreviewModel = typeof PreviewModel.Type

const reactionsView = (
  model: PreviewModel,
  reactions: BubbleReactionsSpec,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  switch (reactions.kind) {
    case 'emoji':
      return Bubble.bubbleReactions(
        {
          ...(reactions.side === 'top' ? { side: 'top' as const } : {}),
          ...(reactions.align !== undefined && reactions.align !== 'end'
            ? { align: reactions.align }
            : {}),
          ...(reactions.ariaLabel === undefined
            ? {}
            : { ariaLabel: reactions.ariaLabel }),
          children: reactions.items.map(item => h.span([], [item])),
        },
        h,
      )
    case 'action':
      return Bubble.bubbleReactions(
        {
          children: [
            Button.button(
              {
                variant: 'ghost',
                size: 'xs',
                onClick: PreviewMessage.ClickedRunIt(),
                children: [
                  model.ranIt ? reactions.clickedLabel : reactions.label,
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'tooltip':
      return Bubble.bubbleReactions(
        {
          class: 'p-0',
          children: [
            Tooltip.tooltip(
              {
                model: model.tooltip,
                toParentMessage: message =>
                  PreviewMessage.GotTooltipMessage({ message }),
                trigger: Icon.icon(reactions.icon, {}, h),
                triggerClass:
                  'flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                content: reactions.content,
                ariaLabel: 'Read receipt',
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'popover':
      return Bubble.bubbleReactions(
        {
          children: [
            Popover.popover(
              {
                model: model.popover,
                toParentMessage: message =>
                  PreviewMessage.GotPopoverMessage({ message }),
                trigger: Icon.icon(
                  reactions.icon,
                  { class: 'size-3.5', ariaLabel: 'Show error details' },
                  h,
                ),
                triggerClass:
                  'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:text-destructive',
                content: h.div(
                  [h.Class('grid gap-1')],
                  [
                    h.p([h.Class('text-sm font-medium')], [reactions.title]),
                    h.p(
                      [h.Class('text-sm text-muted-foreground')],
                      [reactions.description],
                    ),
                  ],
                ),
              },
              h,
            ),
          ],
        },
        h,
      )
  }
}

const contentView = (
  model: PreviewModel,
  bubble: BubbleSpec,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Bubble.bubbleContent(
    {
      ...(bubble.onClick === true
        ? {
            onClick: PreviewMessage.ClickedOption({
              label: bubble.text[0] ?? '',
            }),
          }
        : {}),
      children: [
        bubble.collapsible === true
          ? h.div(
              [],
              [
                model.open
                  ? COLLAPSIBLE_TEXT.join('\n\n')
                  : `${COLLAPSIBLE_TEXT.join('\n\n').slice(0, 180)}...`,
              ],
            )
          : bubble.text.length === 1
            ? (bubble.text[0] ?? '')
            : h.div(
                [h.Class('whitespace-pre-line')],
                [bubble.text.join('\n\n')],
              ),
        ...(bubble.collapsible === true
          ? [
              h.button(
                [
                  h.Type('button'),
                  h.AriaExpanded(model.open),
                  h.OnClick(
                    PreviewMessage.ToggledCollapsible({
                      isOpen: !model.open,
                    }),
                  ),
                  h.Class(
                    'inline-flex items-center gap-1 p-0 text-muted-foreground underline-offset-4 hover:underline',
                  ),
                ],
                [
                  model.open ? 'Show less' : 'Show more',
                  Icon.icon('chevron-down', { class: 'size-4' }, h),
                ],
              ),
            ]
          : []),
      ],
    },
    h,
  )

const bubbleView = (
  model: PreviewModel,
  bubble: BubbleSpec,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Bubble.bubble(
    {
      ...(bubble.variant === undefined || bubble.variant === 'default'
        ? {}
        : { variant: bubble.variant }),
      ...(bubble.align === undefined ? {} : { align: bubble.align }),
      children: [
        contentView(model, bubble, h),
        ...(bubble.reactions === undefined
          ? []
          : [reactionsView(model, bubble.reactions, h)]),
      ],
    },
    h,
  )

const clusterView = (
  model: PreviewModel,
  cluster: BubbleCluster,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  cluster.grouped === true
    ? Bubble.bubbleGroup(
        {
          children: cluster.bubbles.map(bubble => bubbleView(model, bubble, h)),
        },
        h,
      )
    : cluster.bubbles[0] === undefined
      ? h.empty
      : cluster.bubbles.length === 1
        ? bubbleView(model, cluster.bubbles[0], h)
        : h.div(
            [],
            cluster.bubbles.map(bubble => bubbleView(model, bubble, h)),
          )

const fixtureView = (
  fixture: BubbleFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  h.div(
    [h.Class(`flex w-full max-w-sm flex-col gap-${fixture.gap} py-12`)],
    [
      ...fixture.clusters.map(cluster => clusterView(model, cluster, h)),
      ...(fixture.kind === 'linkButton' && model.lastClicked !== undefined
        ? [
            h.p(
              [h.Class('text-sm text-muted-foreground')],
              [`You clicked: ${model.lastClicked}`],
            ),
          ]
        : []),
    ],
  )

export const bubbleTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'bubble',
    lastClicked: undefined,
    ranIt: false,
    open: false,
    tooltip: Tooltip.init({ id: `docs-bubble-tooltip-${String(index)}` }),
    popover: Popover.init({ id: `docs-bubble-popover-${String(index)}` }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ClickedOption':
        return { model: { ...model, lastClicked: message.label } }
      case 'ClickedRunIt':
        return { model: { ...model, ranIt: true } }
      case 'ToggledCollapsible':
        return { model: { ...model, open: message.isOpen } }
      case 'GotTooltipMessage': {
        const result = Tooltip.update(model.tooltip, message.message)
        return {
          model: { ...model, tooltip: result.model },
          commands: Command.mapMessages(result.commands, next =>
            PreviewMessage.GotTooltipMessage({ message: next }),
          ),
        }
      }
      case 'GotPopoverMessage': {
        const result = Popover.update(model.popover, message.message)
        return {
          model: { ...model, popover: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            PreviewMessage.GotPopoverMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    fixtureView(bubbleFixtures[index] ?? bubbleFixtures[0], model, h),
})
