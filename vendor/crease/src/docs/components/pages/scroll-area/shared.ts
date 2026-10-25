import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export const scrollAreaTags = Array.from(
  { length: 50 },
  (_, index) => `v1.2.0-beta.${String(50 - index)}`,
)
export const scrollAreaItems = Array.from(
  { length: 8 },
  (_, index) => `Component ${String(index + 1)}`,
)

export const scrollAreaFixtures = [
  { title: 'Basic', kind: 'tags', rtl: false, heading: 'Tags' },
  { title: 'Horizontal', kind: 'horizontal', rtl: false },
  { title: 'RTL', kind: 'tags', rtl: true, heading: 'العلامات' },
] as const

const tagsBody = (
  fixture: { rtl: boolean; heading: string },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  renderer === 'tailwind'
    ? `ScrollArea.scrollArea({
  orientation: 'vertical',
  ${fixture.rtl ? "direction: 'rtl'," : ''}
  ariaLabel: 'Version tags',
  class: 'h-72 w-48 rounded-md border',
  children: [
    h.div([h.Class('p-4')], [
      h.h4([h.Class('mb-4 text-sm font-medium leading-none')], ['${fixture.heading}']),
      ...scrollAreaTags.map(tag => h.div([], [
        h.div([h.Class('text-sm')], [tag]),
        Separator.separator({ class: 'my-2' }, h),
      ])),
    ]),
  ],
}, h)`
    : `h.div([h.Class(className(styles.tagsFrame))], [
  ScrollArea.scrollArea({
    orientation: 'vertical',
    ${fixture.rtl ? "direction: 'rtl'," : ''}
    ariaLabel: 'Version tags',
    children: [
    h.div([h.Class(className(styles.tagsContent))], [
      h.h4([h.Class(className(styles.tagsHeading))], ['${fixture.heading}']),
      ...scrollAreaTags.map(tag => h.div([], [
        h.div([h.Class(className(styles.tag))], [tag]),
        Separator.separator({ layoutStyle: layoutStyle({ marginBlock: "0.5rem" }) }, h),
      ])),
    ]),
    ],
  }, h),
])`

const horizontalBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  renderer === 'tailwind'
    ? `ScrollArea.scrollArea({
  orientation: 'horizontal',
  ariaLabel: 'Component versions',
  class: 'w-80 rounded-md border p-4',
  children: [
    h.div([h.Class('flex w-max gap-3')], scrollAreaItems.map(item =>
      h.span([h.Class('rounded-md bg-muted px-3 py-2 text-sm')], [item]),
    )),
  ],
}, h)`
    : `h.div([h.Class(className(styles.horizontalFrame))], [
  ScrollArea.scrollArea({
    orientation: 'horizontal',
    ariaLabel: 'Component versions',
    children: [
    h.div([h.Class(className(styles.horizontalContent))], scrollAreaItems.map(item =>
      h.span([h.Class(className(styles.pill))], [item]),
    )),
    ],
  }, h),
])`

const body = (
  fixture: (typeof scrollAreaFixtures)[number],
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  fixture.kind === 'tags'
    ? tagsBody(fixture, renderer)
    : horizontalBody(renderer)

const styleImports = `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
const styles = stylex.create({
  tagsFrame: { height: '18rem', width: '12rem', borderColor: 'var(--border)', borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: 1, overflow: 'hidden' },
  tagsContent: { padding: '1rem' },
  tagsHeading: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1, marginBottom: '1rem' },
  tag: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  separator: { marginBlock: '0.5rem' },
  horizontalFrame: { width: '20rem', borderColor: 'var(--border)', borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: 1, overflow: 'hidden', padding: '1rem' },
  horizontalContent: { display: 'flex', gap: '0.75rem', width: 'max-content' },
  pill: { borderRadius: '0.375rem', paddingBlock: '0.5rem', paddingInline: '0.75rem', backgroundColor: 'var(--muted)', fontSize: '0.875rem', lineHeight: '1.25rem' },
})`

const scrollAreaExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  scrollAreaFixtures.map(fixture => ({
    title: fixture.title,
    code: staticComponentApplication({
      componentName: 'ScrollArea',
      componentSlug: 'scroll-area',
      renderer,
      exampleName: fixture.title,
      componentImports: `import * as Separator from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/separator'

const scrollAreaTags = Array.from({ length: 50 }, (_, index) => \`v1.2.0-beta.\${String(50 - index)}\`)
const scrollAreaItems = Array.from({ length: 8 }, (_, index) => \`Component \${String(index + 1)}\`)${renderer !== 'tailwind' ? `\n${styleImports}` : ''}`,
      viewBody: body(fixture, renderer),
    }),
  }))

export const scrollAreaExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, scrollAreaExamplesFor(renderer))
