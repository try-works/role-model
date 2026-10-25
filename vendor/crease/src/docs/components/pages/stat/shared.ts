import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type StatItem = Readonly<{
  label: string
  value: string
  delta?: Readonly<{
    value: string
    direction: 'up' | 'down' | 'flat'
    sentiment?: 'positive' | 'negative' | 'neutral'
  }>
  description?: string
  size?: 'sm' | 'md' | 'lg'
  withMedia?: boolean
}>

export type StatFixture = Readonly<{
  title: string
  description: string
  layout: 'cards' | 'row' | 'single'
  items: ReadonlyArray<StatItem>
}>

/* Example set ported from Meta Astryx Stat stories
   (packages/lab/src/Stat/Stat.stories.tsx — Showcase, Sizes, WithMedia):
   no blocks dir exists for Stat, so these come from the storybook scenes. */
export const statFixtures: Readonly<[StatFixture, ...Array<StatFixture>]> = [
  {
    title: 'Stat',
    description: 'Key metrics with trend deltas inside cards.',
    layout: 'cards',
    items: [
      {
        label: 'Total revenue',
        value: '$1.28M',
        delta: { value: '+12.4%', direction: 'up' },
        description: 'vs. previous 30 days',
      },
      {
        label: 'Error rate',
        value: '0.42%',
        delta: { value: '-0.08%', direction: 'down', sentiment: 'positive' },
        description: 'vs. previous 30 days',
      },
      {
        label: 'Active users',
        value: '18,204',
        delta: { value: '0.0%', direction: 'flat' },
        description: 'vs. previous 30 days',
      },
    ],
  },
  {
    title: 'Stat — Sizes',
    description: 'The value font scales across small, medium, and large.',
    layout: 'row',
    items: [
      {
        label: 'Deploys',
        value: '128',
        delta: { value: '+6', direction: 'up' },
        size: 'sm',
      },
      {
        label: 'Deploys',
        value: '128',
        delta: { value: '+6', direction: 'up' },
        size: 'md',
      },
      {
        label: 'Deploys',
        value: '128',
        delta: { value: '+6', direction: 'up' },
        size: 'lg',
      },
    ],
  },
  {
    title: 'Stat — With Media',
    description: 'A sparkline or other media slot rendered under the stat.',
    layout: 'single',
    items: [
      {
        label: 'Conversion',
        value: '7.8%',
        delta: { value: '+0.9%', direction: 'up' },
        description: 'checkout completion',
        withMedia: true,
      },
    ],
  },
]

const sparklineSource = (
  isStyleX: boolean,
): string => `const sparklineSvg = (h: HtmlBuilder<Message>) =>
          h.svg(
            [h.ViewBox('0 0 160 36'), h.Role('img'), h.AriaLabel('Rising trend'), h.Class(${isStyleX ? "stylex.props(styles.sparkline).className ?? ''" : "'h-9 w-full text-primary'"}), h.Style({ display: 'block' })],
            [h.polyline([h.Points('0,28 24,26 48,30 72,18 96,20 120,10 160,8'), h.Fill('none'), h.Stroke('currentColor'), h.StrokeWidth('3'), h.StrokeLinecap('round'), h.StrokeLinejoin('round')], [])],
          )`

const deltaSource = (delta: NonNullable<StatItem['delta']>): string => {
  const props = [`value: '${delta.value}'`, `direction: '${delta.direction}'`]
  if (delta.sentiment !== undefined)
    props.push(`sentiment: '${delta.sentiment}'`)
  return `{ ${props.join(', ')} }`
}

const statSource = (item: StatItem): string => {
  const props = [`label: '${item.label}'`, `value: '${item.value}'`]
  if (item.delta !== undefined) props.push(`delta: ${deltaSource(item.delta)}`)
  if (item.description !== undefined)
    props.push(`description: '${item.description}'`)
  if (item.size !== undefined) props.push(`size: '${item.size}'`)
  if (item.withMedia === true) props.push(`media: [sparklineSvg(h)]`)
  return `Stat.stat({ ${props.join(', ')} }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = statFixtures[index] ?? statFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const componentImports = [
    `import * as Card from '@/${isStyleX ? 'stylex' : 'ui'}/card'`,
    isStyleX
      ? `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({ grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }, row: { display: 'flex', gap: '2rem', alignItems: 'flex-end' }, card: { padding: '1rem' }, sparkline: { display: 'block', height: '2.25rem', width: '100%', color: 'var(--primary)' } })`
      : '',
    sparklineSource(isStyleX),
  ]
    .filter(Boolean)
    .join('\n\n')

  const cardWrap = (body: string) =>
    `Card.card({ children: [Card.cardContent({ children: [${body}] }, h)] }, h)`

  const viewBody =
    fixture.layout === 'cards'
      ? `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.grid).className ?? ''" : "'grid grid-cols-3 gap-4'"})],
      [
        ${fixture.items.map(item => cardWrap(statSource(item))).join(',\n        ')},
      ],
    )`
      : fixture.layout === 'row'
        ? `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex items-end gap-8'"})],
      [
        ${fixture.items.map(item => statSource(item)).join(',\n        ')},
      ],
    )`
        : cardWrap(
            fixture.items.map(item => statSource(item)).join(',\n          '),
          )

  return staticComponentApplication({
    componentName: 'Stat',
    componentSlug: 'stat',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const statExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  statFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const statExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, statExamplesFor(renderer))
