import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type StatusDotItem = Readonly<{
  label: string
  variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral'
  pulsing?: boolean
}>

export type StatusDotFixture = Readonly<{
  title: string
  description: string
  layout: 'row' | 'list'
  items: ReadonlyArray<StatusDotItem>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/StatusDot/*.tsx — same
   demos, same labels. */
export const statusDotFixtures: Readonly<
  [StatusDotFixture, ...Array<StatusDotFixture>]
> = [
  {
    title: 'Status Dot',
    description: 'A positive status dot indicator.',
    layout: 'row',
    items: [
      { variant: 'success', label: 'Positive' },
      { variant: 'warning', label: 'Warning' },
      { variant: 'error', label: 'Negative' },
      { variant: 'accent', label: 'Info' },
      { variant: 'neutral', label: 'Neutral' },
    ],
  },
  {
    title: 'StatusDot — Variants',
    description: 'All five semantic color variants displayed in a row.',
    layout: 'row',
    items: [
      { variant: 'success', label: 'Positive' },
      { variant: 'warning', label: 'Warning' },
      { variant: 'error', label: 'Negative' },
      { variant: 'accent', label: 'Info' },
      { variant: 'neutral', label: 'Neutral' },
    ],
  },
  {
    title: 'StatusDot — Pulsing',
    description:
      'Animated pulsing dots for live, processing, and error states.',
    layout: 'row',
    items: [
      { variant: 'success', label: 'Live', pulsing: true },
      { variant: 'warning', label: 'Processing', pulsing: true },
      { variant: 'error', label: 'Error', pulsing: true },
      { variant: 'accent', label: 'Processing', pulsing: true },
      { variant: 'neutral', label: 'Error', pulsing: true },
    ],
  },
  {
    title: 'StatusDot — Status Indicators',
    description:
      'Labeled status dot list for presence indicators like online, away, and offline.',
    layout: 'list',
    items: [
      { variant: 'success', label: 'Online' },
      { variant: 'warning', label: 'Away' },
      { variant: 'error', label: 'Offline' },
      { variant: 'neutral', label: 'Unknown' },
    ],
  },
]

const itemSource = (item: StatusDotItem): string => {
  const props = [`variant: '${item.variant}'`, `label: '${item.label}'`]
  if (item.pulsing === true) {
    props.push('pulsing: true')
  }
  return `StatusDot.statusDot({ ${props.join(', ')} }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = statusDotFixtures[index] ?? statusDotFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  /* `import * as StatusDot` is auto-emitted by staticComponentApplication. */
  const componentImports = [
    isStyleX
      ? [
          `import * as stylex from '@stylexjs/stylex'`,
          ``,
          `const styles = stylex.create({ wrap: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }, label: { fontSize: '0.875rem', lineHeight: '1.25rem' } })`,
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  const items =
    fixture.layout === 'list'
      ? fixture.items
          .map(
            item =>
              `h.div(
          [h.Class(${isStyleX ? "stylex.props(styles.wrap).className ?? ''" : "'flex items-center gap-2'"})],
          [
            ${itemSource(item)},
            h.span(${isStyleX ? "[h.Class(stylex.props(styles.label).className ?? '')]" : "[h.Class('text-sm')]"}, ['${item.label}']),
          ],
        )`,
          )
          .join(',\n        ')
      : fixture.items.map(item => itemSource(item)).join(',\n        ')
  const wrap = fixture.layout === 'list' ? 'list' : 'wrap'
  const viewBody = isStyleX
    ? `h.div(
      [h.Class(stylex.props(styles.${wrap}).className ?? '')],
      [
        ${items},
      ],
    )`
    : `h.div(
      [h.Class('${fixture.layout === 'list' ? 'flex flex-col gap-2' : 'flex items-center gap-2'}')],
      [
        ${items},
      ],
    )`
  return staticComponentApplication({
    componentName: 'StatusDot',
    componentSlug: 'status-dot',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const statusDotExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  statusDotFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const statusDotExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, statusDotExamplesFor(renderer))
