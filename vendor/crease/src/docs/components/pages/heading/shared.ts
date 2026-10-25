import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type HeadingExampleKind =
  | 'showcase'
  | 'truncation'
  | 'pageHierarchy'
  | 'cardGrid'

export type HeadingFixture = Readonly<{
  title: string
  description?: string
  kind: HeadingExampleKind
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Heading/*.tsx — same demos,
   same labels and copy. */
export const headingFixtures: Readonly<
  [HeadingFixture, ...Array<HeadingFixture>]
> = [
  {
    title: 'Heading',
    description: 'All six heading levels stacked to show the type scale.',
    kind: 'showcase',
  },
  {
    title: 'Heading — Truncation',
    description:
      'Single-line and multi-line heading truncation with ellipsis for constrained layouts',
    kind: 'truncation',
  },
  {
    title: 'Heading — Page Hierarchy',
    description:
      'Real-world page layout demonstrating heading levels h1 through h3 with supporting text',
    kind: 'pageHierarchy',
  },
  {
    title: 'Heading — Card Grid',
    description:
      'Responsive card grid with truncated headings and descriptions for uniform layout',
    kind: 'cardGrid',
  },
]

const viewBody = (fixture: HeadingFixture, isStyleX: boolean): string => {
  const stack = (items: string, style: string) =>
    `h.div(
      [h.Class(${style})],
      [
        ${items},
      ],
    )`

  switch (fixture.kind) {
    case 'showcase':
      return stack(
        [1, 2, 3, 4, 5, 6]
          .map(
            level =>
              `Heading.heading({ level: ${level}, children: ['Heading Level ${level}'] }, h)`,
          )
          .join(',\n        '),
        isStyleX
          ? 'className(styles.column)'
          : "'flex flex-col gap-2 items-start'",
      )
    case 'truncation':
      return stack(
        `h.div(
          [h.Class(${isStyleX ? 'className(styles.box)' : "'w-75 border p-3'"})],
          [
            Heading.heading({ level: 2, maxLines: 1, children: ['Very Long Heading That Will Be Truncated To One Line With Ellipsis'] }, h),
          ],
        ),
        h.div(
          [h.Class(${isStyleX ? 'className(styles.box)' : "'w-75 border p-3'"})],
          [
            Heading.heading({ level: 2, maxLines: 2, children: ['Very Long Heading That Will Be Truncated To Two Lines To Keep Card Layout Compact'] }, h),
          ],
        )`,
        isStyleX ? 'className(styles.demoColumn)' : "'flex flex-col gap-6'",
      )
    case 'pageHierarchy':
      return stack(
        `h.div(
          [],
          [
            Heading.heading({ level: 1, children: ['Dashboard Overview'] }, h),
            Text.text({ type: 'supporting', display: 'block', children: ['Last updated 5 minutes ago'] }, h),
          ],
        ),
        h.div(
          [],
          [
            Heading.heading({ level: 2, children: ['Recent Activity'] }, h),
            Text.text({ type: 'body', display: 'block', children: ["Here's what's been happening in your workspace."] }, h),
          ],
        ),
        h.div(
          [],
          [
            Heading.heading({ level: 3, children: ['Today'] }, h),
            Text.text({ type: 'body', display: 'block', children: [
              '• Project Alpha updated',
              h.br([]),
              '• 3 new comments',
              h.br([]),
              '• Task completed',
            ] }, h),
          ],
        )`,
        isStyleX
          ? 'className(styles.pageColumn)'
          : "'flex flex-col gap-6 w-full max-w-100'",
      )
    case 'cardGrid':
      return `Card.card(
      { children: [
        Card.cardContent({ children: [
          h.div(
            [h.Class(${isStyleX ? 'className(styles.column)' : "'flex flex-col gap-2'"})],
            [
              Heading.heading({ level: 3, children: ['Card Title'] }, h),
              Text.text({ type: 'body', maxLines: 2, display: 'block', children: ['This is a card description that might be quite long and needs to be truncated after two lines to keep the card compact and uniform.'] }, h),
              Text.text({ type: 'supporting', display: 'block', children: ['Updated 1 hour ago'] }, h),
            ],
          ),
        ] }, h),
      ]${isStyleX ? ', layoutStyle: layoutStyle({ width: "300px" })' : ", class: 'w-75'"} }, h)`
  }
}

const stylexStyles = (fixture: HeadingFixture): string => {
  switch (fixture.kind) {
    case 'showcase':
      return "column: { alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '0.5rem' }"
    case 'truncation':
      return [
        "demoColumn: { display: 'flex', flexDirection: 'column', gap: '1.5rem' }",
        "box: { borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', padding: '0.75rem', width: '300px' }",
      ].join(',\n  ')
    case 'pageHierarchy':
      return "pageColumn: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px', width: '100%' }"
    case 'cardGrid':
      return [
        "column: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }",
        "card: { width: '300px' }",
      ].join(',\n  ')
  }
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = headingFixtures[index] ?? headingFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const imports: string[] = []
  if (isStyleX) {
    imports.push(
      `import * as stylex from '@stylexjs/stylex'`,
      `import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'`,
    )
  }
  if (fixture.kind === 'pageHierarchy' || fixture.kind === 'cardGrid') {
    imports.push(`import * as Text from '@/${base}/text'`)
  }
  if (fixture.kind === 'cardGrid') {
    imports.push(`import * as Card from '@/${base}/card'`)
  }
  const styles = stylexStyles(fixture)
  const componentImports = [
    ...imports,
    ...(isStyleX && styles !== ''
      ? [``, `const styles = stylex.create({\n  ${styles}\n})`]
      : []),
  ].join('\n')
  return staticComponentApplication({
    componentName: 'Heading',
    componentSlug: 'heading',
    renderer,
    exampleName: fixture.title,
    ...(componentImports === '' ? {} : { componentImports }),
    viewBody: viewBody(fixture, isStyleX),
  })
}

const headingExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  headingFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const headingExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, headingExamplesFor(renderer))
