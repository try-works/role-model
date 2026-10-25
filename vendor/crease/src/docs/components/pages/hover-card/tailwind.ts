import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  hoverCardFixtures,
  hoverCardRtlSides,
  hoverCardSides,
} from '@/docs/components/pages/hover-card/shared'
import * as HoverCard from '@/ui/hover-card'

const HoverCardPreviewMessage = defineMessageUnion({
  GotHoverCardMessage: { index: S.Number, message: HoverCard.Message },
})
type HoverCardPreviewMessage = typeof HoverCardPreviewMessage.Type

const HoverCardPreviewModel = S.Struct({
  _docsPage: S.Literal('hover-card'),
  hoverCards: S.Array(HoverCard.Model),
})
type HoverCardPreviewModel = typeof HoverCardPreviewModel.Type

const basicCard = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-0.5')],
    [
      h.div([h.Class('font-semibold')], ['@creaseui']),
      h.div(
        [],
        ['UI components for Foldkit, built with TypeScript and Effect.'],
      ),
      h.div(
        [h.Class('mt-1 text-xs text-muted-foreground')],
        ['Available in Tailwind and StyleX'],
      ),
    ],
  )

const sideCard =
  (side: string) =>
  <Msg>(h: HtmlBuilder<Msg>): Html =>
    h.div(
      [h.Class('flex flex-col gap-1')],
      [
        h.h4([h.Class('font-medium')], ['Hover Card']),
        h.p(
          [],
          [`This hover card appears on the ${side} side of the trigger.`],
        ),
      ],
    )

const rtlCard = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Dir('rtl'), h.Class('flex w-full flex-col gap-1')],
    [
      h.div([h.Class('font-semibold')], ['سماعات لاسلكية']),
      h.div([h.Class('text-sm text-muted-foreground')], ['٩٩.٩٩ $']),
    ],
  )

export const hoverCardTailwindPreviewProgram = definePreviewProgram<
  HoverCardPreviewModel,
  HoverCardPreviewMessage
>({
  Model: HoverCardPreviewModel,
  Message: HoverCardPreviewMessage,
  init: index => {
    const fixture = hoverCardFixtures[index] ?? hoverCardFixtures[0]
    const count = fixture.kind === 'basic' ? 1 : hoverCardSides.length
    return {
      _docsPage: 'hover-card',
      hoverCards: Array.from({ length: count }, (_unused, cardIndex) =>
        HoverCard.init({
          id: `docs-hover-card-${String(index)}-${String(cardIndex)}`,
          showDelay: 10,
          closeDelay: 100,
        }),
      ),
    }
  },
  update: (model, message) => {
    const target = model.hoverCards[message.index]
    if (target === undefined) {
      return { model }
    }
    const { model: next, commands: nextCommands__ } = HoverCard.update(
      target,
      message.message,
    )
    const hoverCards = model.hoverCards.map((hoverCard, cardIndex) =>
      cardIndex === message.index ? next : hoverCard,
    )
    const commands = nextCommands__ ?? []
    return {
      model: { ...model, hoverCards },
      commands: Command.mapMessages(commands, nextMessage =>
        HoverCardPreviewMessage.GotHoverCardMessage({
          index: message.index,
          message: nextMessage,
        }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = hoverCardFixtures[index] ?? hoverCardFixtures[0]
    const firstCard = model.hoverCards[0]
    if (fixture.kind === 'basic' && firstCard !== undefined) {
      return HoverCard.hoverCard(
        {
          model: firstCard,
          toParentMessage: message =>
            HoverCardPreviewMessage.GotHoverCardMessage({ index: 0, message }),
          trigger: 'Hover Here',
          triggerButtonVariant: 'link',
          ariaLabel: 'Preview the CreaseUI profile',
          content: basicCard(h),
        },
        h,
      )
    }
    if (fixture.kind === 'rtl') {
      return h.div(
        [h.Class('flex flex-wrap justify-center gap-2')],
        model.hoverCards.map((hoverCard, cardIndex) => {
          const entry = hoverCardRtlSides[cardIndex] ?? hoverCardRtlSides[0]
          return HoverCard.hoverCard(
            {
              model: hoverCard,
              toParentMessage: message =>
                HoverCardPreviewMessage.GotHoverCardMessage({
                  index: cardIndex,
                  message,
                }),
              trigger: entry.label,
              triggerButtonVariant: 'outline',
              ariaLabel: entry.label,
              side: entry.side,
              content: rtlCard(h),
            },
            h,
          )
        }),
      )
    }
    return h.div(
      [h.Class('flex flex-wrap justify-center gap-2')],
      model.hoverCards.map((hoverCard, cardIndex) => {
        const side = hoverCardSides[cardIndex] ?? 'bottom'
        return HoverCard.hoverCard(
          {
            model: hoverCard,
            toParentMessage: message =>
              HoverCardPreviewMessage.GotHoverCardMessage({
                index: cardIndex,
                message,
              }),
            trigger: side.charAt(0).toUpperCase() + side.slice(1),
            triggerButtonVariant: 'outline',
            ariaLabel: `Hover card on the ${side} side`,
            side,
            content: sideCard(side)(h),
          },
          h,
        )
      }),
    )
  },
})
