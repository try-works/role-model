import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type FieldStatusItemSpec = Readonly<{
  type: 'warning' | 'error' | 'success'
  message: string
  variant?: 'attached' | 'detached'
}>

export type FieldStatusFixture = Readonly<{
  title: string
  description: string
  items: ReadonlyArray<FieldStatusItemSpec>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/FieldStatus/*.tsx +
   *.doc.mjs — same demos, same copy. */
export const fieldStatusFixtures: Readonly<
  [FieldStatusFixture, ...Array<FieldStatusFixture>]
> = [
  {
    title: 'FieldStatus — Basic',
    description:
      'Detached error and success messages for validation feedback. Use below checkboxes, switches, or custom controls where an attached status would overlap.',
    items: [
      {
        type: 'error',
        message: 'This field is required',
        variant: 'detached',
      },
      {
        type: 'success',
        message: 'Your changes have been saved',
        variant: 'detached',
      },
    ],
  },
  {
    title: 'FieldStatus',
    description:
      'Field status messages in error, warning, and success states with attached and detached variants.',
    items: [
      {
        type: 'error',
        message: 'This field is required',
        variant: 'detached',
      },
      {
        type: 'warning',
        message: 'This username is already taken by another team',
        variant: 'detached',
      },
      {
        type: 'success',
        message: 'Your changes have been saved',
        variant: 'detached',
      },
    ],
  },
]

const itemSource = (item: FieldStatusItemSpec): string =>
  `FieldStatus.fieldStatus({ type: '${item.type}', message: '${item.message}', variant: '${item.variant ?? 'attached'}' }, h)`

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = fieldStatusFixtures[index] ?? fieldStatusFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const wrapperOpen = isStyleX
    ? `h.div([h.Class(stylex.props(styles.stack).className ?? '')], [`
    : `h.div([h.Class('flex flex-col gap-4')], [`
  return staticComponentApplication({
    componentName: 'FieldStatus',
    componentSlug: 'field-status',
    renderer,
    exampleName: fixture.title,
    ...(isStyleX
      ? {
          componentImports: `import * as stylex from '@stylexjs/stylex'\n\nconst styles = stylex.create({\n  stack: { display: 'flex', flexDirection: 'column', gap: '1rem' },\n})`,
        }
      : {}),
    viewBody: `${wrapperOpen}
      ${fixture.items.map(itemSource).join(',\n      ')},
    ])`,
  })
}

const fieldStatusExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  fieldStatusFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const fieldStatusExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, fieldStatusExamplesFor(renderer))
