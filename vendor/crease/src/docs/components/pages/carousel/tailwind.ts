import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import Autoplay from 'embla-carousel-autoplay'
import type { HtmlBuilder } from 'foldkit/html'
import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  carouselFixtures,
  type CarouselFixture,
} from '@/docs/components/pages/carousel/shared'
import * as Card from '@/ui/card'
import * as Carousel from '@/ui/carousel'

const Message = defineMessageUnion({
  GotCarouselPreviewMessage: { message: Carousel.Message },
})
type Message = typeof Message.Type

const Model = S.Struct({
  _docsPage: S.Literal('carousel'),
  carousel: Carousel.Model,
})
type Model = typeof Model.Type

const fixtureOf = (index: number): CarouselFixture =>
  carouselFixtures[index] ?? {
    title: 'Demo',
    description: '',
    count: 5,
    label: 'Featured projects',
    itemSize: 'full',
  }

const itemSizeOf = (
  fixture: CarouselFixture,
): number | ((index: number) => number) => {
  if (fixture.itemSize === 'first-half')
    return index => (index === 0 ? 50 : 33.34)
  if (fixture.itemSize === 'third') return 33.34
  return 100
}

const slideView = (
  fixture: CarouselFixture,
  index: number,
  h: HtmlBuilder<Message>,
) => {
  const vertical = fixture.orientation === 'vertical'
  const card = Card.card(
    {
      ...(vertical ? { class: 'h-full' } : {}),
      children: [
        Card.cardContent(
          {
            class: `flex ${vertical ? 'h-full' : 'aspect-square'} items-center justify-center p-6 text-4xl font-semibold`,
            children: [String(index + 1)],
          },
          h,
        ),
      ],
    },
    h,
  )
  return fixture.padded === true ? h.div([h.Class('p-2')], [card]) : card
}

const carouselView = (
  fixture: CarouselFixture,
  model: Model,
  h: HtmlBuilder<Message>,
) =>
  Carousel.carousel(
    {
      model: model.carousel,
      toParentMessage: message =>
        Message['GotCarouselPreviewMessage']({ message }),
      ariaLabel: fixture.label,
      itemSize: itemSizeOf(fixture),
      ...(fixture.orientation === 'vertical'
        ? { orientation: 'vertical' as const }
        : {}),
      ...(fixture.loop === true ? { loop: true } : {}),
      ...(fixture.autoplay === true
        ? {
            plugins: [Autoplay({ delay: 2000, stopOnInteraction: true })],
          }
        : {}),
      class: fixture.orientation === 'vertical' ? 'w-full h-[200px]' : 'w-full',
      items: Array.from({ length: fixture.count }, (_, index) =>
        slideView(fixture, index, h),
      ),
    },
    h,
  )

export const carouselTailwindPreviewProgram = definePreviewProgram<
  Model,
  Message
>({
  Model,
  Message,
  init: index => {
    const fixture = fixtureOf(index)
    return {
      _docsPage: 'carousel',
      carousel: Carousel.init(`docs-carousel-${String(index)}`, fixture.count),
    }
  },
  update: (model, message) => ({
    model: {
      ...model,
      carousel: Carousel.update(model.carousel, message.message),
    },
  }),
  view: (index, model, h) => {
    const fixture = fixtureOf(index)
    const carousel = carouselView(fixture, model, h)
    const children =
      fixture.status === true
        ? [
            carousel,
            h.p(
              [h.Class('py-2 text-center text-sm text-muted-foreground')],
              [`Slide ${model.carousel.index + 1} of ${model.carousel.count}`],
            ),
          ]
        : [carousel]
    return h.div(
      [
        h.Class('mx-auto w-full max-w-xs'),
        ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
      ],
      children,
    )
  },
})
