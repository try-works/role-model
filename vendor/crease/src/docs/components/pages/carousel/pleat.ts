import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import Autoplay from 'embla-carousel-autoplay'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  carouselFixtures,
  type CarouselFixture,
} from '@/docs/components/pages/carousel/shared'
import * as Card from '@/pleat/card'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import * as Carousel from '@/pleat/carousel'
import { className } from '@/pleat/style'

const styles = {
  wrap: Style.make({
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: '20rem',
    width: '100%',
  }),
  carousel: Style.make({ width: '100%' }),
  verticalCarousel: Style.make({ height: '12.5rem' }),
  verticalCard: Style.make({ height: '100%' }),
  cardContentVertical: Style.make({
    padding: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '2.25rem',
    fontWeight: 600,
    height: '100%',
    justifyContent: 'center',
    lineHeight: '2.5rem',
  }),
  cardContent: Style.make({
    padding: '1.5rem',
    alignItems: 'center',
    aspectRatio: '1/1',
    display: 'flex',
    fontSize: '2.25rem',
    fontWeight: 600,
    justifyContent: 'center',
    lineHeight: '2.5rem',
  }),
  slidePadding: Style.make({ padding: '0.5rem' }),
  apiStatus: Style.make({
    paddingBlock: '0.5rem',
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textAlign: 'center',
  }),
}

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

export const carouselPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = fixtureOf(index)
  const preview = model as { carousel: Carousel.Model }
  const vertical = fixture.orientation === 'vertical'
  const cards = Array.from({ length: fixture.count }, (_, i) => {
    const card = Card.card(
      {
        ...(vertical
          ? { layoutStyle: styles.verticalCard as ComponentLayoutStyle }
          : {}),
        children: [
          Card.cardContent(
            {
              layoutStyle: (vertical
                ? styles.cardContentVertical
                : styles.cardContent) as ComponentLayoutStyle,
              children: [String(i + 1)],
            },
            h,
          ),
        ],
      },
      h,
    )
    return fixture.padded === true
      ? h.div([h.Class(className(styles.slidePadding))], [card])
      : card
  })
  const carousel = Carousel.carousel(
    {
      model: preview.carousel,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotCarouselPreviewMessage', message }),
        ),
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
      layoutStyle: (vertical
        ? [styles.carousel, styles.verticalCarousel]
        : styles.carousel) as ComponentLayoutStyle,
      items: cards,
    },
    h,
  )
  const children =
    fixture.status === true
      ? [
          carousel,
          h.p(
            [h.Class(className(reset.text, styles.apiStatus))],
            [
              `Slide ${preview.carousel.index + 1} of ${preview.carousel.count}`,
            ],
          ),
        ]
      : [carousel]
  return h.div(
    [
      h.Class(className(styles.wrap)),
      ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
    ],
    children,
  )
}
