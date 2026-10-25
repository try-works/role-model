import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type BlockquoteExampleKind = 'showcase' | 'withCite' | 'testimonials'

export type BlockquoteFixture = Readonly<{
  title: string
  description?: string
  kind: BlockquoteExampleKind
}>

export const QUOTE_1 =
  'Design systems are not just about components — they are about creating a shared language between designers and engineers.'
export const QUOTE_2 = 'The best way to predict the future is to invent it.'
export const QUOTE_3 = 'Simplicity is the ultimate sophistication.'

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Blockquote/*.tsx — same
   demos, same labels and copy. */
export const blockquoteFixtures: Readonly<
  [BlockquoteFixture, ...Array<BlockquoteFixture>]
> = [
  {
    title: 'Blockquote — Showcase',
    description: 'Default blockquote style with a left accent border.',
    kind: 'showcase',
  },
  {
    title: 'Blockquote — With Attribution',
    description: 'Blockquote with author attribution using the cite prop.',
    kind: 'withCite',
  },
  {
    title: 'Blockquote — Testimonials',
    description: 'Testimonial-style blockquotes inside a card grid layout.',
    kind: 'testimonials',
  },
]

const testimonialCards = [
  ['Sarah K.', QUOTE_1],
  ['Marcus T.', QUOTE_2],
  ['Priya L.', QUOTE_3],
] as const

const viewBody = (fixture: BlockquoteFixture, isStyleX: boolean): string => {
  const quotes = `Blockquote.blockquote(
        { children: ['${QUOTE_1}'] },
        h,
      ),
      Blockquote.blockquote(
        { cite: 'Steve Jobs', children: ['${QUOTE_2}'] },
        h,
      )`

  switch (fixture.kind) {
    case 'showcase':
      return `h.div(
      [h.Class(${isStyleX ? 'className(styles.column)' : "'flex flex-col gap-4 max-w-125'"})],
      [
        ${quotes},
      ],
    )`
    case 'withCite':
      return `h.div(
      [h.Class(${isStyleX ? 'className(styles.column)' : "'flex flex-col gap-4 max-w-125'"})],
      [
        ${quotes},
      ],
    )`
    case 'testimonials':
      return `h.div(
      [h.Class(${isStyleX ? 'className(styles.grid)' : "'grid gap-4 sm:grid-cols-2 max-w-160'"})],
      [
        ${testimonialCards
          .map(
            ([cite, quote], index) => `Card.card(
          {${index === 2 ? (isStyleX ? ' layoutStyle: layoutStyle({ gridColumn: "1 / -1" }),' : " class: 'sm:col-span-2',") : ''} children: [
            Card.cardContent(
              {
                children: [
                  Blockquote.blockquote({ cite: '${cite}', children: ['${quote}'] }, h),
                ],
              },
              h,
            ),
          ],
        }, h)`,
          )
          .join(',\n        ')},
      ],
    )`
  }
}

const stylexStyles = (fixture: BlockquoteExampleKind): string => {
  switch (fixture) {
    case 'showcase':
    case 'withCite':
      return "column: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }"
    case 'testimonials':
      return [
        "grid: { display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', maxWidth: '640px' }",
        "spanningCard: { gridColumn: '1 / -1' }",
      ].join(',\n  ')
  }
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = blockquoteFixtures[index] ?? blockquoteFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const imports: string[] = []
  if (isStyleX) {
    imports.push(
      `import * as stylex from '@stylexjs/stylex'`,
      `import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'`,
    )
  }
  if (fixture.kind === 'testimonials') {
    imports.push(`import * as Card from '@/${isStyleX ? 'stylex' : 'ui'}/card'`)
  }
  const styles = stylexStyles(fixture.kind)
  const componentImports = [
    ...imports,
    ...(isStyleX && styles !== ''
      ? [``, `const styles = stylex.create({\n  ${styles}\n})`]
      : []),
  ].join('\n')
  return staticComponentApplication({
    componentName: 'Blockquote',
    componentSlug: 'blockquote',
    renderer,
    exampleName: fixture.title,
    ...(componentImports === '' ? {} : { componentImports }),
    viewBody: viewBody(fixture, isStyleX),
  })
}

const blockquoteExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  blockquoteFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const blockquoteExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, blockquoteExamplesFor(renderer))
