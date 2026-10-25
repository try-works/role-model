import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'
import type {
  TextColor,
  TextType,
  TextWeight,
  TextWordBreak,
  TextWrap,
} from '@/ui/text'

export type TextRow = Readonly<{
  type?: TextType
  color?: TextColor
  weight?: TextWeight
  display?: 'inline' | 'block'
  maxLines?: number
  wordBreak?: TextWordBreak
  textWrap?: TextWrap
  hasStrikethrough?: boolean
  hasTabularNumbers?: boolean
  content: string
}>

export type TextExampleKind =
  | 'showcase'
  | 'colors'
  | 'headingLevels'
  | 'inline'
  | 'types'
  | 'weight'
  | 'truncation'
  | 'wordBreak'
  | 'wrap'

export type TextFixture = Readonly<{
  title: string
  description?: string
  kind: TextExampleKind
  rows: ReadonlyArray<TextRow>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Text/*.tsx — same demos,
   same labels and copy. */
export const LONG_TEXT =
  'The design system provides a consistent set of typography tokens, spacing scales, and color palettes that ensure every surface in the product feels cohesive regardless of which team built it.'

export const textFixtures: Readonly<[TextFixture, ...Array<TextFixture>]> = [
  {
    title: 'Text',
    description:
      'Inline text snippets inside a sentence showing how Text renders alongside body copy.',
    kind: 'showcase',
    rows: [
      { type: 'body', content: 'Body: The bulk of content' },
      { type: 'large', content: 'Large: Emphasized content' },
      { type: 'label', content: 'Label: Form and chart labels' },
      { type: 'supporting', content: 'Supporting: Helper text' },
      { type: 'code', content: 'Code: const x = 42;' },
    ],
  },
  {
    title: 'Text — Colors',
    description:
      'All text color options (primary, secondary, disabled, placeholder, active) applied to body text to show their intended use.',
    kind: 'colors',
    rows: [
      {
        type: 'body',
        color: 'primary',
        content: 'Primary — Default for headings and body text',
      },
      {
        type: 'body',
        color: 'secondary',
        content: 'Secondary — Supporting details and metadata',
      },
      {
        type: 'body',
        color: 'accent',
        content: 'Accent — Links, emphasis, and accent-colored text',
      },
      {
        type: 'body',
        color: 'disabled',
        content: 'Disabled — Unavailable or inactive content',
      },
      {
        type: 'body',
        color: 'placeholder',
        content: 'Placeholder — Empty field hints',
      },
    ],
  },
  {
    title: 'Text — Heading Levels',
    description:
      'All 6 heading levels (h1 through h6) rendered with Heading to show the full type scale.',
    kind: 'headingLevels',
    rows: [],
  },
  {
    title: 'Text — Inline',
    description:
      'Mixing body and code text inline within a single line using the default inline display mode.',
    kind: 'inline',
    rows: [],
  },
  {
    title: 'Text — Types',
    description:
      'All 5 semantic text types (body, large, label, supporting, code) with their default styling from the theme.',
    kind: 'types',
    rows: [
      {
        type: 'body',
        content: 'Body text for paragraphs and general content',
      },
      {
        type: 'large',
        content: 'Large text for introductions and callouts',
      },
      {
        type: 'label',
        content: 'Label text for form fields and section titles',
      },
      {
        type: 'supporting',
        content: 'Supporting text for captions and metadata',
      },
      { type: 'code', content: 'const theme = defineTheme({})' },
      {
        type: 'body',
        hasStrikethrough: true,
        content: 'Body text with strikethrough decoration',
      },
      {
        type: 'body',
        hasTabularNumbers: true,
        content: '1,234.56  78.90  100,000.00',
      },
    ],
  },
  {
    title: 'Text — Weight',
    description:
      'The 4 font weight variants (normal, medium, semibold, bold) applied to body text.',
    kind: 'weight',
    rows: [
      { type: 'body', weight: 'normal', display: 'block', content: 'Normal' },
      { type: 'body', weight: 'medium', display: 'block', content: 'Medium' },
      {
        type: 'body',
        weight: 'semibold',
        display: 'block',
        content: 'Semibold',
      },
      { type: 'body', weight: 'bold', display: 'block', content: 'Bold' },
    ],
  },
  {
    title: 'Text — Truncation',
    description:
      'Single-line and multi-line text truncation with ellipsis using maxLines in a width-constrained container.',
    kind: 'truncation',
    rows: [
      { maxLines: 1, content: '1 line' },
      { maxLines: 2, content: '2 lines' },
      { maxLines: 3, content: '3 lines' },
    ],
  },
  {
    title: 'Text — Word Break',
    description:
      'Compares break-word and break-all word break modes on a long unbreakable string.',
    kind: 'wordBreak',
    rows: [],
  },
  {
    title: 'Text — Wrap',
    description:
      'The 4 text-wrap modes (wrap, nowrap, balance, pretty) shown in width-constrained containers.',
    kind: 'wrap',
    rows: [],
  },
]

const rowPropsSource = (row: TextRow): string => {
  const props: string[] = []
  if (row.type !== undefined) {
    props.push(`type: '${row.type}'`)
  }
  if (row.color !== undefined) {
    props.push(`color: '${row.color}'`)
  }
  if (row.weight !== undefined) {
    props.push(`weight: '${row.weight}'`)
  }
  if (row.display !== undefined) {
    props.push(`display: '${row.display}'`)
  }
  if (row.maxLines !== undefined) {
    props.push(`maxLines: ${String(row.maxLines)}`)
  }
  if (row.wordBreak !== undefined) {
    props.push(`wordBreak: '${row.wordBreak}'`)
  }
  if (row.textWrap !== undefined) {
    props.push(`textWrap: '${row.textWrap}'`)
  }
  if (row.hasStrikethrough === true) {
    props.push('hasStrikethrough: true')
  }
  if (row.hasTabularNumbers === true) {
    props.push('hasTabularNumbers: true')
  }
  return props.join(', ')
}

export const textRowCall = (row: TextRow, isStyleX: boolean): string => {
  const props = rowPropsSource(row)
  const children = `'${row.content}'`
  void isStyleX
  return props === ''
    ? `Text.text({ children: [${children}] }, h)`
    : `Text.text({ ${props}, children: [${children}] }, h)`
}

const typesLabels = [
  'Body text',
  'Large text',
  'Label text',
  'Supporting text',
  'Code text',
  'Strikethrough',
  'Tabular numbers',
]

const viewBody = (
  fixture: TextFixture,
  index: number,
  isStyleX: boolean,
): string => {
  const wrapClass = isStyleX
    ? 'className(styles.column)'
    : "'flex flex-col gap-3'"
  const stack = (items: string, gap: '2' | '3' = '3') =>
    `h.div(
      [h.Class(${isStyleX ? `className(${gap === '2' ? 'styles.columnTight' : 'styles.column'})` : `'flex flex-col gap-${gap}'`})],
      [
        ${items},
      ],
    )`

  switch (fixture.kind) {
    case 'showcase':
      return stack(
        fixture.rows.map(row => textRowCall(row, isStyleX)).join(',\n        '),
        '2',
      )
    case 'colors':
    case 'weight':
      return stack(
        fixture.rows.map(row => textRowCall(row, isStyleX)).join(',\n        '),
      )
    case 'headingLevels':
      return stack(
        [1, 2, 3, 4, 5, 6]
          .map(
            level =>
              `Heading.heading({ level: ${level}, children: ['Heading ${level}'] }, h)`,
          )
          .join(',\n        '),
      )
    case 'inline':
      return `Text.text(
      { type: 'body', display: 'block', children: [
        'Design tokens are ',
        Text.text({ type: 'code', children: ['themeable'] }, h),
        ' and shared across every surface.',
      ] },
      h,
    )`
    case 'types':
      return stack(
        fixture.rows
          .map((row, rowIndex) => {
            const label = typesLabels[rowIndex] ?? ''
            return `h.div(
          [h.Class(${isStyleX ? 'className(styles.rowGroup)' : "'flex flex-col'"})],
          [
            Text.text({ type: 'supporting', color: 'secondary', children: ['${label}'] }, h),
            ${textRowCall({ ...row, display: 'block' }, isStyleX)},
          ],
        )`
          })
          .join(',\n        '),
      )
    case 'truncation':
      return `h.div(
      [h.Class(${isStyleX ? 'className(styles.demoColumn)' : "'flex flex-col gap-4 max-w-75'"})],
      [
        ${fixture.rows
          .map(
            row => `h.div(
          [],
          [
            Text.text({ type: 'supporting', color: 'secondary', display: 'block', children: ['${row.content}'] }, h),
            h.div(
              [h.Class(${isStyleX ? 'className(styles.box)' : "'border p-2'"})],
              [
                Text.text({ type: 'body'${row.maxLines === undefined ? '' : `, maxLines: ${String(row.maxLines)}`}, children: [LONG_TEXT] }, h),
              ],
            ),
          ],
        )`,
          )
          .join(',\n        ')},
      ],
    )`
    case 'wordBreak':
      return `h.div(
      [h.Class(${isStyleX ? 'className(styles.demoColumnWide)' : "'flex flex-col gap-4 max-w-100'"})],
      [
        h.div(
          [],
          [
            Text.text({ type: 'label', display: 'block', children: ['Break-word (default for multi-line)'] }, h),
            h.div(
              [h.Class(${isStyleX ? 'className(styles.boxNarrow)' : "'w-50 border p-2'"})],
              [
                Text.text({ type: 'body', maxLines: 2, wordBreak: 'break-word', children: ['This is a verylongunbreakableword for a break-word example'] }, h),
              ],
            ),
          ],
        ),
        h.div(
          [],
          [
            Text.text({ type: 'label', display: 'block', children: ['Break-all (default for single-line)'] }, h),
            h.div(
              [h.Class(${isStyleX ? 'className(styles.boxNarrow)' : "'w-50 border p-2'"})],
              [
                Text.text({ type: 'body', maxLines: 2, wordBreak: 'break-all', children: ['Breaks anywhere: abcdefghijklmnopqrstuvwxyz0123456789'] }, h),
              ],
            ),
          ],
        ),
      ],
    )`
    case 'wrap':
      return `h.div(
      [h.Class(${isStyleX ? 'className(styles.demoColumnWide)' : "'flex flex-col gap-4 max-w-100'"})],
      [
        ${(
          [
            [
              'Wrap (default)',
              'wrap',
              'This text wraps normally at word boundaries when it reaches the edge.',
              '',
            ],
            [
              'Nowrap',
              'nowrap',
              'This text does not wrap and will overflow its container.',
              ' overflow-hidden',
            ],
            [
              'Balance',
              'balance',
              'This text is balanced for better visual appearance across lines.',
              '',
            ],
            [
              'Pretty',
              'pretty',
              'This text uses pretty wrap to avoid orphans at the end of paragraphs.',
              '',
            ],
          ] as const
        )
          .map(
            ([label, wrap, content, overflow]) => `h.div(
          [],
          [
            Text.text({ type: 'label', display: 'block', children: ['${label}'] }, h),
            h.div(
              [h.Class(${isStyleX ? `className(${overflow === '' ? 'styles.boxNarrow' : 'styles.boxNarrowClipped'})` : `'w-50 border p-2${overflow}'`})],
              [
                Text.text({ type: 'body', textWrap: '${wrap}', children: ['${content}'] }, h),
              ],
            ),
          ],
        )`,
          )
          .join(',\n        ')},
      ],
    )`
  }
}

const stylexStyles = (fixture: TextFixture): string => {
  const parts: string[] = []
  if (fixture.kind === 'types') {
    parts.push("rowGroup: { display: 'flex', flexDirection: 'column' }")
  }
  if (
    fixture.kind === 'showcase' ||
    fixture.kind === 'colors' ||
    fixture.kind === 'weight' ||
    fixture.kind === 'headingLevels' ||
    fixture.kind === 'types'
  ) {
    parts.push(
      "column: { display: 'flex', flexDirection: 'column', gap: '0.75rem' }",
    )
  }
  if (fixture.kind === 'showcase') {
    parts.push(
      "columnTight: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }",
    )
  }
  if (fixture.kind === 'truncation') {
    parts.push(
      "demoColumn: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }",
      "box: { borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', padding: '0.5rem' }",
    )
  }
  if (fixture.kind === 'wordBreak' || fixture.kind === 'wrap') {
    parts.push(
      "demoColumnWide: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }",
      "boxNarrow: { borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', padding: '0.5rem', width: '200px' }",
    )
  }
  if (fixture.kind === 'wrap') {
    parts.push(
      "boxNarrowClipped: { borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', padding: '0.5rem', width: '200px', overflow: 'hidden' }",
    )
  }
  return parts.join(',\n  ')
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = textFixtures[index] ?? textFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const imports: string[] = []
  if (isStyleX) {
    imports.push(
      `import * as stylex from '@stylexjs/stylex'`,
      `import { className } from '@/stylex/style'`,
    )
  }
  if (fixture.kind === 'headingLevels') {
    imports.push(
      `import * as Heading from '@/${isStyleX ? 'stylex' : 'ui'}/heading'`,
    )
  }
  if (fixture.kind === 'truncation') {
    imports.push(``, `const LONG_TEXT = '${LONG_TEXT}'`)
  }
  const styles = stylexStyles(fixture)
  const componentImports = [
    ...imports,
    ...(isStyleX && styles !== ''
      ? [``, `const styles = stylex.create({\n  ${styles}\n})`]
      : []),
  ].join('\n')
  return staticComponentApplication({
    componentName: 'Text',
    componentSlug: 'text',
    renderer,
    exampleName: fixture.title,
    ...(componentImports === '' ? {} : { componentImports }),
    viewBody: viewBody(fixture, index, isStyleX),
  })
}

const textExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  textFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const textExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, textExamplesFor(renderer))
