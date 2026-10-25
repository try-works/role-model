import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type CarouselFixture = Readonly<{
  title: string
  description: string
  heroOnly?: boolean
  count: number
  label: string
  itemSize: 'full' | 'first-half' | 'third'
  padded?: boolean
  orientation?: 'horizontal' | 'vertical'
  loop?: boolean
  autoplay?: boolean
  status?: boolean
  direction?: 'rtl'
}>

export const carouselFixtures: Readonly<Array<CarouselFixture>> = [
  {
    title: 'Demo',
    description:
      'A horizontally scrollable carousel with previous and next controls.',
    heroOnly: true,
    count: 5,
    label: 'Featured projects',
    itemSize: 'full',
  },
  {
    title: 'Sizes',
    description:
      'Set the slide size per item — the first slide takes half the viewport, the rest a third.',
    count: 5,
    label: 'Sized slides',
    itemSize: 'first-half',
  },
  {
    title: 'Spacing',
    description:
      'Pad the inside of each slide to create space between the cards.',
    count: 5,
    label: 'Spaced slides',
    itemSize: 'full',
    padded: true,
  },
  {
    title: 'Orientation',
    description: 'A vertical carousel stacks slides along the Y axis.',
    count: 5,
    label: 'Vertical slides',
    itemSize: 'full',
    orientation: 'vertical',
  },
  {
    title: 'Options',
    description:
      'Loop keeps the carousel circular — next wraps to the first slide.',
    count: 5,
    label: 'Looping slides',
    itemSize: 'full',
    loop: true,
  },
  {
    title: 'API',
    description:
      'The carousel model exposes the selected index — render a status line straight from model.carousel.',
    count: 5,
    label: 'API slides',
    itemSize: 'full',
    status: true,
  },
  {
    title: 'Plugins',
    description:
      'Embla plugins extend the carousel — Autoplay advances every two seconds and stops on interaction.',
    count: 5,
    label: 'Autoplay slides',
    itemSize: 'full',
    autoplay: true,
  },
  {
    title: 'RTL',
    description:
      'Right-to-left direction flips the scroll direction and controls.',
    count: 5,
    label: 'RTL slides',
    itemSize: 'full',
    direction: 'rtl',
  },
]

const itemSizeSource = (fixture: CarouselFixture): string => {
  if (fixture.itemSize === 'first-half')
    return 'itemSize: index => (index === 0 ? 50 : 33.34),'
  if (fixture.itemSize === 'third') return 'itemSize: 33.34,'
  return ''
}

const slideSource = (
  fixture: CarouselFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const vertical = fixture.orientation === 'vertical'
  const card = `Card.card({${
    vertical
      ? isSx
        ? `
                layoutStyle: layoutStyle({ height: "100%" }),`
        : `
                class: 'h-full',`
      : ''
  }
                children: [
                  Card.cardContent({${
                    isSx
                      ? `
                    children: [h.div([h.Class(className(styles.${vertical ? 'cardContentVertical' : 'cardContent'}))], [String(index + 1)])],`
                      : `
                    class: 'flex ${vertical ? 'h-full' : 'aspect-square'} items-center justify-center p-6 text-4xl font-semibold',
                    children: [String(index + 1)],`
                  }
                  }, h),
                ],
              }, h)`
  if (fixture.padded !== true) return card
  return isSx
    ? `h.div([h.Class(className(styles.slidePadding))], [
              ${card},
            ])`
    : `h.div([h.Class('p-2')], [
              ${card},
            ])`
}

const carouselPropsSource = (
  fixture: CarouselFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const parts: Array<string> = [
    'model: model.carousel,',
    `toParentMessage: message =>
          Message['GotCarouselMessage']({ message }),`,
    `ariaLabel: '${fixture.label}',`,
  ]
  const size = itemSizeSource(fixture)
  if (size) parts.push(size)
  if (fixture.orientation === 'vertical') parts.push(`orientation: 'vertical',`)
  if (fixture.loop === true) parts.push('loop: true,')
  if (fixture.autoplay === true)
    parts.push(`plugins: [Autoplay({ delay: 2000, stopOnInteraction: true })],`)
  parts.push(
    renderer !== 'tailwind'
      ? fixture.orientation === 'vertical'
        ? 'layoutStyle: layoutStyle({ width: "100%", height: "12.5rem" }),'
        : 'layoutStyle: layoutStyle({ width: "100%" }),'
      : `class: '${fixture.orientation === 'vertical' ? 'w-full h-[200px]' : 'w-full'}',`,
  )
  return parts.join('\n        ')
}

const viewBodySource = (
  fixture: CarouselFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const carousel = `Carousel.carousel({
        ${carouselPropsSource(fixture, renderer)}
        items: Array.from({ length: ${fixture.count} }, (_, index) =>
          ${slideSource(fixture, renderer)},
        ),
      }, h)`
  const body =
    fixture.direction === 'rtl'
      ? `h.div([h.Dir('rtl')], [
    ${carousel},
  ])`
      : carousel
  if (fixture.status !== true) return body
  return `h.div(
    [h.Class(${renderer !== 'tailwind' ? 'className(styles.apiWrap)' : `'mx-auto max-w-xs'`})],
    [
      ${body},
      h.p(
        [h.Class(${renderer !== 'tailwind' ? 'className(styles.apiStatus)' : `'py-2 text-center text-sm text-muted-foreground'`})],
        [\`Slide \${model.carousel.index + 1} of \${model.carousel.count}\`],
      ),
    ],
  )`
}

const stylexStylesSource = (fixture: CarouselFixture): string => {
  const parts: Array<string> = [`  carousel: { width: '100%' },`]
  if (fixture.orientation === 'vertical')
    parts.push(
      `  verticalCarousel: { height: '12.5rem' },`,
      `  verticalCard: { height: '100%' },`,
      `  cardContentVertical: { alignItems: 'center', display: 'flex', fontSize: '2.25rem', lineHeight: '2.5rem', fontWeight: 600, height: '100%', justifyContent: 'center', padding: '1.5rem' },`,
    )
  else
    parts.push(
      `  cardContent: { alignItems: 'center', aspectRatio: '1/1', display: 'flex', fontSize: '2.25rem', lineHeight: '2.5rem', fontWeight: 600, justifyContent: 'center', padding: '1.5rem' },`,
    )
  if (fixture.padded === true)
    parts.push(`  slidePadding: { padding: '0.5rem' },`)
  if (fixture.status === true)
    parts.push(
      `  apiWrap: { marginInline: 'auto', maxWidth: '20rem', width: '100%' },`,
      `  apiStatus: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem', paddingBlock: '0.5rem', textAlign: 'center' },`,
    )
  return `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', marginInline: 'auto', maxWidth: '20rem', minHeight: '100vh', padding: '2rem' },
${parts.join('\n')}
});`
}

const source = (
  f: CarouselFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const sx = renderer !== 'tailwind'
  const tag = f.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  return foldkitApplication({
    title: `Carousel — ${f.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${f.autoplay === true ? `import Autoplay from 'embla-carousel-autoplay'\n` : ''}
import * as Card from '@/${sx ? 'stylex' : 'ui'}/card'
import * as Carousel from '@/${sx ? 'stylex' : 'ui'}/carousel'${
      sx
        ? `
import * as stylex from '@stylexjs/stylex'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'${stylexStylesSource(f)}`
        : ''
    }`,
    model: `export const Model = S.Struct({ carousel: Carousel.Model })
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  GotCarouselMessage: { message: Carousel.Message },
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { carousel: Carousel.init('docs-carousel', ${f.count}) },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotCarouselMessage':
      return {
        model: {
          ...model,
          carousel: Carousel.update(model.carousel, message.message),
        },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Carousel — ${f.title}',
  body: h.main(
    [h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'mx-auto flex min-h-screen max-w-xs items-center p-8'"})],
    [
    ${viewBodySource(f, renderer)},
    ],
  ),
})`,
  })
}

const carouselExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  carouselFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const carouselExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, carouselExamplesFor(renderer))
