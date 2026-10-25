import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type CodeExampleKind = 'showcase' | 'textSizes' | 'inline' | 'various'

export type CodeFixture = Readonly<{
  title: string
  description?: string
  kind: CodeExampleKind
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Code/*.tsx — same demos,
   same labels and copy. */
export const codeFixtures: Readonly<[CodeFixture, ...Array<CodeFixture>]> = [
  {
    title: 'Code',
    description:
      'Inline code snippets inside a sentence showing how Code renders alongside body copy.',
    kind: 'showcase',
  },
  {
    title: 'Code — Inline',
    description: 'Code text displayed inline alongside body copy.',
    kind: 'inline',
  },
  {
    title: 'Code — Text Sizes',
    description:
      'Code rendered inside headings, body, and supporting text to show size inheritance.',
    kind: 'textSizes',
  },
  {
    title: 'Code — Content Types',
    description:
      'Common content types rendered inline: variables, terminal commands, CSS values, and file paths.',
    kind: 'various',
  },
]

const variousEntries = [
  ['Variable', 'const model = { count: 0 }'],
  ['Terminal', 'npm run dev'],
  ['CSS', 'border-radius: 8px'],
  ['File path', 'src/ui/button.ts'],
  ['Shortcut', '⌘ + K'],
] as const

const codeCall = (content: string): string =>
  `Code.code({ children: ['${content}'] }, h)`

const textCall = (
  type: string,
  parts: ReadonlyArray<string>,
): string => `Text.text(
          { type: '${type}', display: 'block', children: [
            ${parts.join(',\n            ')},
          ] },
          h,
        )`

const viewBody = (fixture: CodeFixture, isStyleX: boolean): string => {
  const stack = (items: string) =>
    `h.div(
      [h.Class(${isStyleX ? 'className(styles.column)' : "'flex flex-col gap-4'"})],
      [
        ${items},
      ],
    )`

  switch (fixture.kind) {
    case 'showcase':
      return stack(
        `${textCall('body', ["'Install dependencies with '", codeCall('npm install'), "' and start building.'"])},
        ${textCall('body', ["'Use the variant: '", codeCall('v3.0.0'), "' release for the latest features.'"])}`,
      )
    case 'inline':
      return `Text.text(
      { type: 'body', display: 'block', children: [
        'Foldkit programs use ',
        ${codeCall('Model')},
        ', ',
        ${codeCall('update')},
        ', and ',
        ${codeCall('view')},
        ' to model state, handle messages, and render HTML.',
      ] },
      h,
    )`
    case 'textSizes':
      return stack(
        `Heading.heading({ level: 3, children: ['Configure ', ${codeCall('config.json')}] }, h),
        ${textCall('body', ["'Run '", codeCall('pnpm install'), "' to set up the workspace.'"])},
        ${textCall('supporting', ["'Supports '", codeCall('ES2022'), "' and newer toolchains.'"])},
        ${textCall('label', ["'Shortcut: '", codeCall('⌘ + K')])}`,
      )
    case 'various':
      return stack(
        variousEntries
          .map(
            ([label, content]) => `h.div(
          [h.Class(${isStyleX ? 'className(styles.rowGroup)' : "'flex flex-col'"})],
          [
            Text.text({ type: 'supporting', color: 'secondary', children: ['${label}'] }, h),
            ${codeCall(content)},
          ],
        )`,
          )
          .join(',\n        '),
      )
  }
}

const stylexStyles = (fixture: CodeExampleKind): string => {
  const parts = [
    "column: { display: 'flex', flexDirection: 'column', gap: '1rem' }",
  ]
  if (fixture === 'various') {
    parts.push("rowGroup: { display: 'flex', flexDirection: 'column' }")
  }
  return parts.join(',\n  ')
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = codeFixtures[index] ?? codeFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const imports: string[] = []
  if (isStyleX) {
    imports.push(
      `import * as stylex from '@stylexjs/stylex'`,
      `import { className } from '@/stylex/style'`,
    )
  }
  if (fixture.kind !== 'various') {
    imports.push(`import * as Text from '@/${base}/text'`)
  }
  if (fixture.kind === 'textSizes') {
    imports.push(`import * as Heading from '@/${base}/heading'`)
  }
  if (fixture.kind === 'various') {
    imports.push(`import * as Text from '@/${base}/text'`)
  }
  const needsStack = fixture.kind !== 'inline'
  const componentImports = [
    ...imports,
    ...(isStyleX && needsStack
      ? [
          ``,
          `const styles = stylex.create({\n  ${stylexStyles(fixture.kind)}\n})`,
        ]
      : []),
  ].join('\n')
  return staticComponentApplication({
    componentName: 'Code',
    componentSlug: 'code',
    renderer,
    exampleName: fixture.title,
    ...(componentImports === '' ? {} : { componentImports }),
    viewBody: viewBody(fixture, isStyleX),
  })
}

const codeExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  codeFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const codeExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, codeExamplesFor(renderer))
