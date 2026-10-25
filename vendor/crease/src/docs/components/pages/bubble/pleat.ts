import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  bubbleFixtures,
  COLLAPSIBLE_TEXT,
  type BubbleCluster,
  type BubbleFixture,
  type BubbleReactionsSpec,
  type BubbleSpec,
} from '@/docs/components/pages/bubble/shared'
import * as Icon from '@/lib/icon'
import * as Bubble from '@/pleat/bubble'
import * as Button from '@/pleat/button'
import * as Popover from '@/pleat/popover'
import * as Tooltip from '@/pleat/tooltip'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { foundationTokens } from '../../../../pleat/foundations-tokens'
import { interactionTokens } from '../../../../pleat/interaction-tokens'
import { className } from '@/pleat/style'

const styles = {
  column4: Style.make({
    gap: '1rem',
    paddingBlock: '3rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  }),
  column8: Style.make({
    gap: '2rem',
    paddingBlock: '3rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  }),
  column12: Style.make({
    gap: '3rem',
    paddingBlock: '3rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  }),
  preLine: Style.make({ whiteSpace: 'pre-line' }),
  chevron: Style.make({
    transform: 'rotate(0deg)',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1rem',
    width: '1rem',
  }).pipe(
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  chevronExpanded: Style.make({ transform: 'rotate(180deg)' }),
  triggerLink: Style.make({
    padding: 0,
    gap: '0.25rem',
    alignItems: 'center',
    color: 'var(--muted-foreground)',
    display: 'inline-flex',
  }),
  icon: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  iconTrigger: Style.make({
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--muted-foreground)',
    display: 'flex',
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: 'var(--accent)',
      color: 'var(--accent-foreground)',
    }),
  ),
  iconTriggerPopover: Style.make({
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--muted-foreground)',
    display: 'inline-flex',
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: 'var(--accent)',
      color: 'var(--accent-foreground)',
    }),
    Style.when(When.aria('expanded', 'true'), { color: 'var(--destructive)' }),
  ),
  reactionsFlat: Style.make({ paddingBlock: 0, paddingInline: 0 }),
  popoverContent: Style.make({ gap: '0.25rem', display: 'grid' }),
  popoverTitle: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  popoverCopy: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  feedback: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

type PreviewSnapshot = Readonly<{
  lastClicked?: string
  ranIt: boolean
  open: boolean
  tooltip: Tooltip.Model
  popover: Popover.Model
}>

const reactionsView = <Msg>(
  model: PreviewSnapshot,
  reactions: BubbleReactionsSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
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
                onClick: onMessageJson(
                  JSON.stringify({ _tag: 'ClickedRunIt' }),
                ),
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
          layoutStyle: styles.reactionsFlat as ComponentLayoutStyle,
          children: [
            Tooltip.tooltip(
              {
                model: model.tooltip,
                toParentMessage: message =>
                  onMessageJson(
                    JSON.stringify({ _tag: 'GotTooltipMessage', message }),
                  ),
                trigger: Icon.icon(reactions.icon, {}, h),
                triggerLayoutStyle: styles.iconTrigger as ComponentLayoutStyle,
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
                  onMessageJson(
                    JSON.stringify({ _tag: 'GotPopoverMessage', message }),
                  ),
                trigger: Icon.icon(
                  reactions.icon,
                  {
                    class: className(styles.icon),
                    ariaLabel: 'Show error details',
                  },
                  h,
                ),
                triggerLayoutStyle:
                  styles.iconTriggerPopover as ComponentLayoutStyle,
                content: h.div(
                  [h.Class(className(styles.popoverContent))],
                  [
                    h.p(
                      [h.Class(className(reset.text, styles.popoverTitle))],
                      [reactions.title],
                    ),
                    h.p(
                      [h.Class(className(reset.text, styles.popoverCopy))],
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

const contentView = <Msg>(
  model: PreviewSnapshot,
  bubble: BubbleSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Bubble.bubbleContent(
    {
      variant: bubble.variant ?? 'default',
      ...(bubble.onClick === true
        ? {
            onClick: onMessageJson(
              JSON.stringify({
                _tag: 'ClickedOption',
                label: bubble.text[0] ?? '',
              }),
            ),
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
                [h.Class(className(styles.preLine))],
                [bubble.text.join('\n\n')],
              ),
        ...(bubble.collapsible === true
          ? [
              h.button(
                [
                  h.Type('button'),
                  h.AriaExpanded(model.open),
                  h.OnClick(
                    onMessageJson(
                      JSON.stringify({
                        _tag: 'ToggledCollapsible',
                        isOpen: !model.open,
                      }),
                    ),
                  ),
                  h.Class(className(reset.button, styles.triggerLink)),
                ],
                [
                  model.open ? 'Show less' : 'Show more',
                  Icon.icon(
                    'chevron-down',
                    {
                      class: className(
                        styles.chevron,
                        model.open && styles.chevronExpanded,
                      ),
                    },
                    h,
                  ),
                ],
              ),
            ]
          : []),
      ],
    },
    h,
  )

const bubbleView = <Msg>(
  model: PreviewSnapshot,
  bubble: BubbleSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Bubble.bubble(
    {
      ...(bubble.variant === undefined || bubble.variant === 'default'
        ? {}
        : { variant: bubble.variant }),
      ...(bubble.align === undefined ? {} : { align: bubble.align }),
      children: [
        contentView(model, bubble, onMessageJson, h),
        ...(bubble.reactions === undefined
          ? []
          : [reactionsView(model, bubble.reactions, onMessageJson, h)]),
      ],
    },
    h,
  )

const clusterView = <Msg>(
  model: PreviewSnapshot,
  cluster: BubbleCluster,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  cluster.grouped === true
    ? Bubble.bubbleGroup(
        {
          children: cluster.bubbles.map(bubble =>
            bubbleView(model, bubble, onMessageJson, h),
          ),
        },
        h,
      )
    : cluster.bubbles[0] === undefined
      ? h.empty
      : cluster.bubbles.length === 1
        ? bubbleView(model, cluster.bubbles[0], onMessageJson, h)
        : h.div(
            [],
            cluster.bubbles.map(bubble =>
              bubbleView(model, bubble, onMessageJson, h),
            ),
          )

export const bubblePleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = bubbleFixtures[exampleIndex] ?? bubbleFixtures[0]
  const previewModel = model as PreviewSnapshot
  return h.div(
    [
      h.Class(
        className(
          fixture.gap === '4'
            ? styles.column4
            : fixture.gap === '12'
              ? styles.column12
              : styles.column8,
        ),
      ),
    ],
    [
      ...fixture.clusters.map(cluster =>
        clusterView(previewModel, cluster, onMessageJson, h),
      ),
      ...(fixture.kind === 'linkButton' &&
      previewModel.lastClicked !== undefined
        ? [
            h.p(
              [h.Class(className(reset.text, styles.feedback))],
              [`You clicked: ${previewModel.lastClicked}`],
            ),
          ]
        : []),
    ],
  )
}
