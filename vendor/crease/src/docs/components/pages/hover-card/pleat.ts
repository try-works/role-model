import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  hoverCardFixtures,
  hoverCardRtlSides,
  hoverCardSides,
} from '@/docs/components/pages/hover-card/shared'
import * as HoverCard from '@/pleat/hover-card'
import { className } from '@/pleat/style'

const styles = {
  row: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  }),
  content: Style.make({
    gap: '0.125rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  gapSm: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  heading: Style.make({ fontWeight: 600 }),
  headingMedium: Style.make({ fontWeight: 500 }),
  meta: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    marginBlockStart: '0.25rem',
  }),
  muted: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

interface HoverCardPreviewShape {
  readonly hoverCards: ReadonlyArray<HoverCard.Model>
}

const toMsg =
  <Msg>(onMessageJson: (messageJson: string) => Msg, index: number) =>
  (message: HoverCard.Message): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'GotHoverCardMessage', index, message }),
    )

export const hoverCardPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = hoverCardFixtures[exampleIndex] ?? hoverCardFixtures[0]
  const { hoverCards } = model as HoverCardPreviewShape
  const firstCard = hoverCards[0]

  if (fixture.kind === 'basic' && firstCard !== undefined) {
    return HoverCard.hoverCard(
      {
        model: firstCard,
        toParentMessage: toMsg(onMessageJson, 0),
        trigger: 'Hover Here',
        triggerButtonVariant: 'link',
        ariaLabel: 'Preview the CreaseUI profile',
        content: h.div(
          [h.Class(className(styles.content))],
          [
            h.div([h.Class(className(styles.heading))], ['@creaseui']),
            h.div(
              [],
              ['UI components for Foldkit, built with TypeScript and Effect.'],
            ),
            h.div(
              [h.Class(className(styles.meta))],
              ['Available in Tailwind and StyleX'],
            ),
          ],
        ),
      },
      h,
    )
  }

  if (fixture.kind === 'rtl') {
    return h.div(
      [h.Class(className(styles.row))],
      hoverCards.map((hoverCard, cardIndex) => {
        const entry = hoverCardRtlSides[cardIndex] ?? hoverCardRtlSides[0]
        return HoverCard.hoverCard(
          {
            model: hoverCard,
            toParentMessage: toMsg(onMessageJson, cardIndex),
            trigger: entry.label,
            triggerButtonVariant: 'outline',
            ariaLabel: entry.label,
            side: entry.side,
            content: h.div(
              [h.Dir('rtl'), h.Class(className(styles.content))],
              [
                h.div([h.Class(className(styles.heading))], ['سماعات لاسلكية']),
                h.div([h.Class(className(styles.muted))], ['٩٩.٩٩ $']),
              ],
            ),
          },
          h,
        )
      }),
    )
  }

  return h.div(
    [h.Class(className(styles.row))],
    hoverCards.map((hoverCard, cardIndex) => {
      const side = hoverCardSides[cardIndex] ?? 'bottom'
      return HoverCard.hoverCard(
        {
          model: hoverCard,
          toParentMessage: toMsg(onMessageJson, cardIndex),
          trigger: side.charAt(0).toUpperCase() + side.slice(1),
          triggerButtonVariant: 'outline',
          ariaLabel: `Hover card on the ${side} side`,
          side,
          content: h.div(
            [h.Class(className(styles.gapSm))],
            [
              h.h4(
                [h.Class(className(reset.text, styles.headingMedium))],
                ['Hover Card'],
              ),
              h.p(
                [h.Class(className(reset.text))],
                [`This hover card appears on the ${side} side of the trigger.`],
              ),
            ],
          ),
        },
        h,
      )
    }),
  )
}
