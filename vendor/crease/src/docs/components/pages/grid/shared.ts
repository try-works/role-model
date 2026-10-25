import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

/* Astryx Grid/GridSpan example blocks ported 1:1. astryx Card default →
   crease Card size 'sm' (16px padding); astryx Card variant="cyan" (tinted
   feature surface) → cyan utility tint in Tailwind and a stylex.create'd
   light-dark card stand-in in StyleX; astryx Card height={80} → h-20 /
   layoutStyle height '5rem'. The auto-fit demo's astryx useResizable px
   panel becomes crease Resizable's percent two-panel group. */

export type GridFixture = Readonly<{
  title: string
  description?: string
  kind:
    | 'showcase'
    | 'spanning'
    | 'autoFit'
    | 'dashboard'
    | 'gallery'
    | 'spanColumns'
    | 'spanShowcase'
}>

export const gridFixtures: Readonly<[GridFixture, ...Array<GridFixture>]> = [
  {
    title: 'Grid',
    kind: 'showcase',
  },
  {
    title: 'Grid — Column Spanning',
    description: 'Grid with featured items spanning multiple columns and rows',
    kind: 'spanning',
  },
  {
    title: 'Grid — Responsive Auto-Fit',
    description: 'Responsive grid where cards stretch to fill remaining space',
    kind: 'autoFit',
  },
  {
    title: 'Grid — Dashboard Layout',
    description:
      'Dashboard layout with mixed-size widgets and a full-width summary row',
    kind: 'dashboard',
  },
  {
    title: 'Grid — Card Gallery',
    description:
      'Card gallery with responsive columns that maintain consistent widths',
    kind: 'gallery',
  },
  {
    title: 'GridSpan — Columns',
    description:
      'Grid items spanning two of three columns. Wrap a grid child in GridSpan to make it occupy multiple columns for asymmetric layouts.',
    kind: 'spanColumns',
  },
  {
    title: 'Grid Span',
    description:
      'GridSpan lets a grid item span multiple columns or rows within an Grid, enabling masonry-style and asymmetric layouts.',
    kind: 'spanShowcase',
  },
]

export const gridStats: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Components', value: '54 available' },
  { label: 'Templates', value: '28 available' },
  { label: 'Tokens', value: '120 defined' },
  { label: 'Themes', value: '6 published' },
  { label: 'Icons', value: '312 available' },
  { label: 'Patterns', value: '18 documented' },
  { label: 'Contributors', value: '42 active' },
]

export const gridTeams: ReadonlyArray<{ name: string; members: number }> = [
  { name: 'Design Systems', members: 8 },
  { name: 'Frontend Platform', members: 12 },
  { name: 'Developer Experience', members: 6 },
  { name: 'Accessibility', members: 4 },
  { name: 'Performance', members: 7 },
  { name: 'Mobile Infrastructure', members: 9 },
]

export const gridMetrics: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Revenue', value: '$48,290' },
  { label: 'Active Users', value: '12,841' },
  { label: 'Conversion', value: '3.2%' },
  { label: 'Avg Response', value: '245ms' },
]

export const gridGalleryCards: ReadonlyArray<{
  title: string
  description: string
}> = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of the platform.',
  },
  { title: 'Components', description: 'Browse the full component library.' },
  { title: 'Design Tokens', description: 'Colors, spacing, and typography.' },
  { title: 'Theming', description: 'Customize the look and feel.' },
  { title: 'Accessibility', description: 'Build inclusive experiences.' },
  { title: 'Patterns', description: 'Common UI composition patterns.' },
]

/* Emitted text/card helpers. Child arguments are emitted raw, so callers pass
   a quoted literal ('1 col') or an expression (team.name). */

const labelTw = (child: string): string =>
  `h.p([h.Class('text-sm font-medium')], [${child}])`
const labelSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.label).className ?? '')], [${child}])`
const supportingTw = (child: string): string =>
  `h.p([h.Class('text-xs')], [${child}])`
const supportingSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.supporting).className ?? '')], [${child}])`
const bodyTw = (child: string): string =>
  `h.p([h.Class('text-sm text-muted-foreground')], [${child}])`
const bodySx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.body).className ?? '')], [${child}])`

const cardTw = (children: string): string =>
  `Card.card({ size: 'sm', children: [
            Card.cardContent({ children: [
              ${children},
            ] }, h),
          ] }, h)`
const cardSx = cardTw // Card API is renderer-identical

const tallCardTw = (children: string): string =>
  `Card.card({ size: 'sm', class: 'h-20', children: [
              Card.cardContent({ children: [
                ${children},
              ] }, h),
            ] }, h)`
const tallCardSx = (children: string): string =>
  `Card.card({ size: 'sm', layoutStyle: layoutStyle({ height: "5rem" }), children: [
              Card.cardContent({ children: [
                ${children},
              ] }, h)],
            }, h)`

const cyanCardTw = (children: string): string =>
  `Card.card({ size: 'sm', class: 'border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40', children: [
              Card.cardContent({ children: [
                ${children},
              ] }, h),
            ] }, h)`
const cyanCardSx = (children: string): string =>
  `h.div([h.Class(stylex.props(styles.featuredCard).className ?? '')], [
              Stack.vStack({ gap: 1, children: [
                ${children},
              ] }, h),
            ])`

const statsSource = `const STATS = [
  { label: 'Components', value: '54 available' },
  { label: 'Templates', value: '28 available' },
  { label: 'Tokens', value: '120 defined' },
  { label: 'Themes', value: '6 published' },
  { label: 'Icons', value: '312 available' },
  { label: 'Patterns', value: '18 documented' },
  { label: 'Contributors', value: '42 active' },
]`

const teamsSource = `const TEAMS = [
  { name: 'Design Systems', members: 8 },
  { name: 'Frontend Platform', members: 12 },
  { name: 'Developer Experience', members: 6 },
  { name: 'Accessibility', members: 4 },
  { name: 'Performance', members: 7 },
  { name: 'Mobile Infrastructure', members: 9 },
]`

const metricsSource = `const METRICS = [
  { label: 'Revenue', value: '$48,290' },
  { label: 'Active Users', value: '12,841' },
  { label: 'Conversion', value: '3.2%' },
  { label: 'Avg Response', value: '245ms' },
]`

const gallerySource = `const CARDS = [
  { title: 'Getting Started', description: 'Learn the basics of the platform.' },
  { title: 'Components', description: 'Browse the full component library.' },
  { title: 'Design Tokens', description: 'Colors, spacing, and typography.' },
  { title: 'Theming', description: 'Customize the look and feel.' },
  { title: 'Accessibility', description: 'Build inclusive experiences.' },
  { title: 'Patterns', description: 'Common UI composition patterns.' },
]`

const emitShowcase = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const card = renderer === 'tailwind' ? cardTw : cardSx
  return `Grid.grid(
      { columns: 3, gap: 2, width: 400, children: [
        ...Array.from({ length: 12 }, (_, i) =>
          ${card(`\`Item \${String(i + 1)}\``)},
        ),
      ] },
      h,
    )`
}

const emitSpanning = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const label = renderer === 'tailwind' ? labelTw : labelSx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const card = renderer === 'tailwind' ? cardTw : cardSx
  const cyan = renderer === 'tailwind' ? cyanCardTw : cyanCardSx
  const featured = `Stack.vStack({ gap: 1, children: [
                  ${label(`'Featured Release'`)},
                  ${supporting(`'CreaseUI is now available with new layout primitives, refreshed tokens, and improved theming support across the system.'`)},
                ] }, h)`
  return `Grid.grid(
      { columns: 3, gap: 4, width: '100%', maxWidth: 500, children: [
        Grid.gridSpan({ rows: 2, children: [
          ${
            renderer === 'tailwind'
              ? cyan(featured)
              : cyan(`${label(`'Featured Release'`)},
                  ${supporting(`'CreaseUI is now available with new layout primitives, refreshed tokens, and improved theming support across the system.'`)}`)
          },
        ] }, h),
        ...STATS.map(stat =>
          ${card(`${label('stat.label')},
              ${supporting('stat.value')}`)},
        ),
        Grid.gridSpan({ columns: 'full', children: [
          ${
            renderer === 'tailwind'
              ? cyan(`Stack.vStack({ gap: 1, children: [
                  ${label(`'Community Showcase'`)},
                  ${supporting(`'See how teams are building with CreaseUI across the organization'`)},
                ] }, h)`)
              : cyan(`${label(`'Community Showcase'`)},
                  ${supporting(`'See how teams are building with CreaseUI across the organization'`)}`)
          },
        ] }, h),
      ] },
      h,
    )`
}

const emitDashboard = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const label = renderer === 'tailwind' ? labelTw : labelSx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const card = renderer === 'tailwind' ? cardTw : cardSx
  return `Grid.grid(
      { columns: 4, gap: 4, width: '100%', maxWidth: 500, children: [
        Grid.gridSpan({ columns: 2, rows: 2, children: [
          ${card(`${label(`'Weekly Traffic'`)},
              ${supporting(`'Page views and unique visitors over the last 7 days'`)}`)},
        ] }, h),
        ...METRICS.map(metric =>
          ${card(`${supporting('metric.label')},
              ${label('metric.value')}`)},
        ),
        Grid.gridSpan({ columns: 'full', children: [
          ${card(`${label(`'Recent Activity'`)},
              ${supporting(`'Latest events across all projects'`)}`)},
        ] }, h),
      ] },
      h,
    )`
}

const emitGallery = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const label = renderer === 'tailwind' ? labelTw : labelSx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const card = renderer === 'tailwind' ? cardTw : cardSx
  return `Grid.grid(
      { columns: { minWidth: 180 }, gap: 5, width: '100%', maxWidth: 400, children: [
        ...CARDS.map(card =>
          ${card(`${label('card.title')},
              ${supporting('card.description')}`)},
        ),
      ] },
      h,
    )`
}

const emitSpanColumns = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const body = renderer === 'tailwind' ? bodyTw : bodySx
  const tall = renderer === 'tailwind' ? tallCardTw : tallCardSx
  return `Grid.grid(
      { columns: 3, gap: 3, width: 400, children: [
        Grid.gridSpan({ columns: 2, children: [
          ${tall(body(`'Spans 2 columns'`))},
        ] }, h),
        ${tall(body(`'1 col'`))},
        ${tall(body(`'1 col'`))},
        Grid.gridSpan({ columns: 2, children: [
          ${tall(body(`'Spans 2 columns'`))},
        ] }, h),
      ] },
      h,
    )`
}

const emitSpanShowcase = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const body = renderer === 'tailwind' ? bodyTw : bodySx
  const tall = renderer === 'tailwind' ? tallCardTw : tallCardSx
  const card = renderer === 'tailwind' ? cardTw : cardSx
  return `Grid.grid(
      { columns: 4, gap: 3, width: 400, children: [
        Grid.gridSpan({ columns: 3, children: [
          ${tall(body(`'Spans 3 columns'`))},
        ] }, h),
        ${tall(body(`'1 col'`))},
        Grid.gridSpan({ rows: 2, children: [
          ${card(body(`'1 col'`))},
        ] }, h),
        Grid.gridSpan({ columns: 3, children: [
          ${tall(body(`'Full-width row'`))},
        ] }, h),
        ${tall(body(`'1 col'`))},
        Grid.gridSpan({ columns: 2, children: [
          ${tall(body(`'Spans 2 columns'`))},
        ] }, h),
      ] },
      h,
    )`
}

/* The auto-fit demo is interactive (astryx uses useResizable), so it emits a
   complete foldkit application wiring crease Resizable's percent-based
   two-panel group — the grid lives in the first panel and reflows on drag. */
const emitAutoFit = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const label = renderer === 'tailwind' ? labelTw : labelSx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const card = renderer === 'tailwind' ? cardTw : cardSx
  const panelAttrs =
    renderer === 'tailwind'
      ? `h.Class('h-full overflow-auto p-4')`
      : `h.Class(stylex.props(styles.gridPanel).className ?? '')`
  const groupProp =
    renderer === 'tailwind'
      ? `class: 'h-full w-full border-0'`
      : `layoutStyle: layoutStyle({ height: "100%", width: "100%" })`
  const resizableCall = `Resizable.resizable(
            {
              model: model.resizable,
              toParentMessage: message => GotResizableMessage({ message }),
              direction: 'horizontal',
              minSize: 20,
              maxSize: 96,
              extent: 500,
              withHandle: true,
              ariaLabel: 'Resize grid',
              ${groupProp},
              first: h.div([${panelAttrs}], [
                Grid.grid({ columns: { minWidth: 180, repeat: 'fit' }, gap: 4, width: '100%', children: [
                  ...TEAMS.map(team =>
                    ${card(`${label('team.name')},
                      ${supporting(`\`\${String(team.members)} members\``)}`)},
                  ),
                ] }, h),
              ]),
              second: h.div([${
                renderer === 'tailwind'
                  ? `h.Class('h-full')`
                  : `h.Class(stylex.props(styles.filler).className ?? '')`
              }], []),
            },
            h,
          )`
  const viewBody =
    renderer === 'tailwind'
      ? `Card.card({ class: 'h-[400px] w-full max-w-[500px] gap-0 overflow-hidden bg-muted p-0', children: [
        ${resizableCall},
      ] }, h)`
      : `h.div([h.Class(stylex.props(styles.shell).className ?? '')], [
        ${resizableCall},
      ])`
  const view = `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Grid — Responsive Auto-Fit',
  body: h.main([${
    renderer === 'tailwind'
      ? `h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})`
      : `h.Class(stylex.props(styles.shellWrap).className ?? '')`
  }], [
    ${viewBody},
  ]),
})`
  const stylesSource =
    renderer !== 'tailwind'
      ? `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  shell: {
    backgroundColor: 'var(--muted)',
    borderRadius: '0.75rem',
    height: '25rem',
    maxWidth: '31.25rem',
    overflow: 'hidden',
    width: '100%',
  },
  shellWrap: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
  },
  gridPanel: { height: '100%', overflow: 'auto', padding: '1rem' },
  filler: { height: '100%' },
  group: { height: '100%', width: '100%' },
  label: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
  supporting: { fontSize: '0.75rem', lineHeight: '1rem' },
})`
      : ''
  return foldkitApplication({
    title: 'Grid — Responsive Auto-Fit',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import * as Grid from '@/${mod}/grid'
import * as Card from '@/${mod}/card'
import * as Stack from '@/${mod}/stack'
import * as Resizable from '@/${mod}/resizable'${stylesSource === '' ? '' : `\n${stylesSource}`}

${teamsSource}`,
    model: `export const Model = S.Struct({
  resizable: Resizable.Model,
})
export type Model = typeof Model.Type`,
    messages: `export const GotResizableMessage = taggedStruct('GotResizableMessage', { message: Resizable.Message });
export const Message = S.Union([GotResizableMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { resizable: Resizable.init('auto-fit-grid', 96) },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotResizableMessage':
      return {
        model: { ...model, resizable: Resizable.update(model.resizable, message.message) },
      }
  }
}`,
    view,
  })
}

const emitBody = (
  fixture: GridFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'showcase':
      return emitShowcase(renderer)
    case 'spanning':
      return emitSpanning(renderer)
    case 'dashboard':
      return emitDashboard(renderer)
    case 'gallery':
      return emitGallery(renderer)
    case 'spanColumns':
      return emitSpanColumns(renderer)
    case 'spanShowcase':
      return emitSpanShowcase(renderer)
    case 'autoFit':
      return '' // handled by emitAutoFit
  }
}

const usesCard = (kind: GridFixture['kind']): boolean => true // every grid example tiles content in cards
const usesStack = (kind: GridFixture['kind']): boolean =>
  kind === 'spanning' || kind === 'gallery'
const usesResizable = (kind: GridFixture['kind']): boolean => kind === 'autoFit'

const extraSourceFor = (kind: GridFixture['kind']): string => {
  switch (kind) {
    case 'spanning':
      return statsSource
    case 'dashboard':
      return metricsSource
    case 'gallery':
      return gallerySource
    default:
      return ''
  }
}

const stylexStylesFor = (kind: GridFixture['kind']): string => {
  const entries: Array<string> = []
  if (kind === 'spanning' || kind === 'gallery' || kind === 'dashboard') {
    entries.push(
      `  label: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 }`,
    )
    entries.push(`  supporting: { fontSize: '0.75rem', lineHeight: '1rem' }`)
  }
  if (kind === 'spanning') {
    entries.push(`  featuredCard: {
    backgroundColor: 'light-dark(oklch(0.984 0.019 200.873), oklch(0.302 0.056 225.514))',
    borderColor: 'light-dark(oklch(0.917 0.08 205.041), oklch(0.45 0.085 224.283))',
    borderRadius: '0.75rem',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: '1rem',
  }`)
  }
  if (kind === 'spanColumns' || kind === 'spanShowcase') {
    entries.push(`  tallCard: { height: '5rem' }`)
    entries.push(
      `  body: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' }`,
    )
  }
  if (entries.length === 0) return ''
  return `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${entries.join(',\n')},
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = gridFixtures[index] ?? gridFixtures[0]
  if (fixture.kind === 'autoFit') return emitAutoFit(renderer)
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const componentImports = [
    `import * as Card from '@/${mod}/card'`,
    usesStack(fixture.kind) ? `import * as Stack from '@/${mod}/stack'` : '',
    extraSourceFor(fixture.kind),
    renderer !== 'tailwind' ? stylexStylesFor(fixture.kind) : '',
  ]
    .filter(Boolean)
    .join('\n')
  return staticComponentApplication({
    componentName: 'Grid',
    componentSlug: 'grid',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody: emitBody(fixture, renderer),
  })
}

const gridExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  gridFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const gridExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, gridExamplesFor(renderer))
