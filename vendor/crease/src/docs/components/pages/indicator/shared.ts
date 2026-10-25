import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type IndicatorItem = Readonly<{
  kind: 'check' | 'checkbox' | 'radio'
  state: 'unchecked' | 'checked' | 'indeterminate'
  size?: 'sm' | 'md'
  isDisabled?: boolean
  /** Caption shown next to the control. */
  caption: string
}>

export type IndicatorFixture = Readonly<{
  title: string
  description: string
  items: ReadonlyArray<IndicatorItem>
}>

/* DERIVED example set — astryx ships no example blocks for Indicator
   (packages/cli/assets/templates/blocks has no Indicator/ dir and
   Indicator.doc.mjs only carries defineTheme theming examples), so these
   fixtures are derived from the component's usage in CheckboxInput /
   RadioList / Check tests: states × sizes × disabled. */
export const indicatorFixtures: Readonly<
  [IndicatorFixture, ...Array<IndicatorFixture>]
> = [
  {
    title: 'Indicator',
    description: 'Checkbox selection visuals in all three states.',
    items: [
      { kind: 'checkbox', state: 'unchecked', caption: 'Unchecked' },
      { kind: 'checkbox', state: 'checked', caption: 'Checked' },
      { kind: 'checkbox', state: 'indeterminate', caption: 'Indeterminate' },
    ],
  },
  {
    title: 'Indicator — Radio',
    description: 'Radio selection visuals for single-choice rows.',
    items: [
      { kind: 'radio', state: 'unchecked', caption: 'Unchecked' },
      { kind: 'radio', state: 'checked', caption: 'Checked' },
      { kind: 'radio', state: 'indeterminate', caption: 'Indeterminate' },
    ],
  },
  {
    title: 'Indicator — Check',
    description: 'The lightweight check mark used inside single-select rows.',
    items: [
      { kind: 'check', state: 'checked', caption: 'Checked' },
      {
        kind: 'check',
        state: 'checked',
        isDisabled: true,
        caption: 'Disabled',
      },
    ],
  },
  {
    title: 'Indicator — Sizes',
    description: 'Small (20px) and medium (24px) control sizes.',
    items: [
      { kind: 'checkbox', state: 'checked', size: 'sm', caption: 'Small' },
      { kind: 'checkbox', state: 'checked', size: 'md', caption: 'Medium' },
      { kind: 'radio', state: 'checked', size: 'sm', caption: 'Small' },
      { kind: 'radio', state: 'checked', size: 'md', caption: 'Medium' },
    ],
  },
  {
    title: 'Indicator — Disabled',
    description:
      'All states at half opacity when the owning control is disabled.',
    items: [
      {
        kind: 'checkbox',
        state: 'unchecked',
        isDisabled: true,
        caption: 'Unchecked',
      },
      {
        kind: 'checkbox',
        state: 'checked',
        isDisabled: true,
        caption: 'Checked',
      },
      {
        kind: 'checkbox',
        state: 'indeterminate',
        isDisabled: true,
        caption: 'Indeterminate',
      },
      { kind: 'radio', state: 'checked', isDisabled: true, caption: 'Checked' },
    ],
  },
]

const itemSource = (item: IndicatorItem): string => {
  const props = [
    `state: '${item.state}'`,
    ...(item.size === undefined ? [] : [`size: '${item.size}'`]),
    ...(item.isDisabled === true ? ['isDisabled: true'] : []),
  ]
  const fn =
    item.kind === 'check'
      ? 'checkIndicator'
      : item.kind === 'checkbox'
        ? 'checkboxIndicator'
        : 'radioIndicator'
  return `Indicator.${fn}({ ${props.join(', ')} }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = indicatorFixtures[index] ?? indicatorFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  /* `import * as Indicator` is auto-emitted by staticComponentApplication. */
  const componentImports = isStyleX
    ? [
        `import * as stylex from '@stylexjs/stylex'`,
        ``,
        `const styles = stylex.create({ wrap: { display: 'flex', gap: '1.5rem', alignItems: 'center' }, item: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, caption: { fontSize: '0.875rem', lineHeight: '1.25rem' } })`,
      ].join('\n')
    : ''
  const items = fixture.items
    .map(
      item => `h.div(
          [h.Class(${isStyleX ? "stylex.props(styles.item).className ?? ''" : "'flex items-center gap-2'"})],
          [
            ${itemSource(item)},
            h.span(${isStyleX ? "[h.Class(stylex.props(styles.caption).className ?? '')]" : "[h.Class('text-sm')]"}, ['${item.caption}']),
          ],
        )`,
    )
    .join(',\n        ')
  const viewBody = `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.wrap).className ?? ''" : "'flex flex-wrap items-center gap-6'"})],
      [
        ${items},
      ],
    )`
  return staticComponentApplication({
    componentName: 'Indicator',
    componentSlug: 'indicator',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const indicatorExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  indicatorFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const indicatorExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, indicatorExamplesFor(renderer))
