import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type CircularProgressItem = Readonly<{
  value?: number
  max?: number
  variant?: 'accent' | 'success' | 'warning' | 'error' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  hasValueLabel?: boolean
  formatValueLabel?: boolean
  isDisabled?: boolean
  isIndeterminate?: boolean
  label?: string
  isLabelHidden?: boolean
}>

export type CircularProgressFixture = Readonly<{
  title: string
  description: string
  layout: 'row' | 'single'
  items: ReadonlyArray<CircularProgressItem>
}>

/* Example set ported from Meta Astryx CircularProgress stories
   (packages/lab/src/CircularProgress/CircularProgress.stories.tsx —
   Default, WithValueLabel, CustomValueFormat, Sizes, Variants,
   Indeterminate, Disabled, Empty/Full). */
export const circularProgressFixtures: Readonly<
  [CircularProgressFixture, ...Array<CircularProgressFixture>]
> = [
  {
    title: 'Circular Progress',
    description: 'A determinate ring reporting one value.',
    layout: 'single',
    items: [{ value: 60 }],
  },
  {
    title: 'Circular Progress — Value Label',
    description:
      'The percentage or a custom value string centered inside the ring.',
    layout: 'row',
    items: [
      { value: 75, size: 'lg', hasValueLabel: true },
      {
        value: 3,
        max: 5,
        size: 'lg',
        hasValueLabel: true,
        formatValueLabel: true,
      },
    ],
  },
  {
    title: 'Circular Progress — Variants',
    description: 'Five color meanings for the fill arc.',
    layout: 'row',
    items: [
      { value: 60, variant: 'accent' },
      { value: 80, variant: 'success' },
      { value: 50, variant: 'warning' },
      { value: 92, variant: 'error' },
      { value: 35, variant: 'neutral' },
    ],
  },
  {
    title: 'Circular Progress — Sizes',
    description: 'Small (32px), medium (48px), and large (64px) rings.',
    layout: 'row',
    items: [
      { value: 60, size: 'sm' },
      { value: 60, size: 'md' },
      { value: 60, size: 'lg' },
    ],
  },
  {
    title: 'Circular Progress — Indeterminate',
    description: 'An unmeasured task spins a fixed arc continuously.',
    layout: 'single',
    items: [{ isIndeterminate: true }],
  },
  {
    title: 'Circular Progress — Disabled',
    description: 'Determinate and indeterminate rings at half opacity.',
    layout: 'row',
    items: [
      { value: 60, isDisabled: true },
      { isIndeterminate: true, isDisabled: true },
    ],
  },
  {
    title: 'Circular Progress — Empty And Full',
    description:
      'Zero shows a bare track; a completed ring can carry a success variant.',
    layout: 'row',
    items: [
      { value: 0 },
      { value: 100, variant: 'success', label: 'Complete' },
    ],
  },
]

const itemSource = (item: CircularProgressItem): string => {
  const props = [
    `label: '${item.label ?? 'Progress'}'`,
    `isLabelHidden: ${item.isLabelHidden ?? true}`,
    ...(item.value === undefined ? [] : [`value: ${item.value}`]),
    ...(item.max === undefined ? [] : [`max: ${item.max}`]),
    ...(item.variant === undefined ? [] : [`variant: '${item.variant}'`]),
    ...(item.size === undefined ? [] : [`size: '${item.size}'`]),
    ...(item.hasValueLabel === undefined
      ? []
      : [`hasValueLabel: ${item.hasValueLabel}`]),
    ...(item.formatValueLabel === undefined
      ? []
      : [`formatValueLabel: (value, max) => \`\${value}/\${max}\``]),
    ...(item.isDisabled === true ? ['isDisabled: true'] : []),
    ...(item.isIndeterminate === true ? ['isIndeterminate: true'] : []),
  ]
  return `CircularProgress.circularProgress({ ${props.join(', ')} }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = circularProgressFixtures[index] ?? circularProgressFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const componentImports = isStyleX
    ? `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({ row: { display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' } })`
    : ''
  const viewBody =
    fixture.layout === 'row'
      ? `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex flex-wrap items-center gap-6'"})],
      [
        ${fixture.items.map(itemSource).join(',\n        ')},
      ],
    )`
      : `h.div(
      [],
      [
        ${fixture.items.map(itemSource).join(',\n        ')},
      ],
    )`
  return staticComponentApplication({
    componentName: 'CircularProgress',
    componentSlug: 'circular-progress',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const circularProgressExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  circularProgressFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const circularProgressExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, circularProgressExamplesFor(renderer))
