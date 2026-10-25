import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { MarkdownSource } from '@/lib/markdown'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type MarkdownExampleKind =
  | 'showcase'
  | 'rich'
  | 'table'
  | 'compact'
  | 'cited'

export type MarkdownFixture = Readonly<{
  title: string
  description?: string
  kind: MarkdownExampleKind
  content: string
  density?: 'default' | 'compact'
  headingLevelStart?: number
  sources?: Readonly<Record<string, MarkdownSource>>
  contentWidth?: number
  contentAlign?: 'center'
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Markdown/*.tsx — same
   demos, same content, on the ported parser subset. */
export const SHOWCASE_CONTENT = `## Formatting

**Bold text** and *italic text* with ~~strikethrough~~.

- First item
- Second item
- Third item

> A quoted passage with an accent border.

[Documentation](https://creaseui.com/docs/components/button)`

export const RICH_CONTENT = `# Rich Content

## Inline Formatting

Mix **bold**, *italic*, and \`inline code\` in one paragraph. Links like [CreaseUI](https://creaseui.com/docs/components/button) render inline.

## Code Block

\`\`\`typescript
export function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Task List

- [x] Parse headings
- [x] Parse lists
- [ ] Parse math`

export const TABLE_CONTENT = `| CreaseUI feature | Tailwind | StyleX | Notes |
| :-- | :-: | :-: | --: |
| Component examples | Yes | Yes | Shared fixtures |
| Runtime theme | Yes | Yes | Semantic tokens |
| Copyable source | Yes | Yes | TypeScript |`

export const COMPACT_CONTENT = `## Summary

Here's the install command:

\`\`\`bash
npx creaseui add button
\`\`\`

- Built on Foldkit UI
- Ships StyleX variants
- Typed component APIs

> Everything else is optional.`

export const CITED_CONTENT = `Tokyo is the capital of Japan [src-1]. It blends the ultramodern and the traditional [src-2]. Popular districts include Shibuya, Shinjuku, and Ginza [src-3].

The city hosted the Olympics in 2021 [src-4]. The Shibuya crossing is one of the busiest intersections in the world [src-5].`

export const CITED_SOURCES: Readonly<Record<string, MarkdownSource>> = {
  'src-1': {
    title: 'Tokyo — Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Tokyo',
  },
  'src-2': {
    title: 'Japan Travel — Tokyo',
    url: 'https://www.japan.travel/en/destinations/kanto/tokyo/',
  },
  'src-3': {
    title: 'Tokyo Neighbourhood Guide',
    url: 'https://www.timeout.com/tokyo',
  },
  'src-4': {
    title: 'Tokyo 2020 Olympics',
    url: 'https://olympics.com/en/olympic-games/tokyo-2020',
  },
  'src-5': {
    title: 'Shibuya Crossing',
    url: 'https://en.wikipedia.org/wiki/Shibuya_Crossing',
  },
}

export const markdownFixtures: Readonly<
  [MarkdownFixture, ...Array<MarkdownFixture>]
> = [
  {
    title: 'Markdown',
    description:
      'Headings, lists, inline formatting, blockquotes, and links in one block of markdown.',
    kind: 'showcase',
    content: SHOWCASE_CONTENT,
    contentWidth: 400,
    contentAlign: 'center',
  },
  {
    title: 'Markdown — Rich Content',
    description:
      'Full markdown features: headings, formatting, code blocks, and a task list.',
    kind: 'rich',
    content: RICH_CONTENT,
  },
  {
    title: 'Markdown — Data Table',
    description:
      'A GitHub-flavored markdown table with column alignment rendered as a styled table.',
    kind: 'table',
    content: TABLE_CONTENT,
  },
  {
    title: 'Markdown — Compact AI Response',
    description:
      'Compact density and an h3 heading start suited for chat-style AI responses.',
    kind: 'compact',
    content: COMPACT_CONTENT,
    density: 'compact',
    headingLevelStart: 3,
    contentWidth: 450,
  },
  {
    title: 'Markdown — Cited Content',
    description:
      'Citation markers resolved against a sources map into footnote chips.',
    kind: 'cited',
    content: CITED_CONTENT,
    density: 'compact',
    headingLevelStart: 3,
    sources: CITED_SOURCES,
  },
]

const sourcesEmit = (
  sources: Readonly<Record<string, MarkdownSource>>,
): string => `const SOURCES = {
${Object.entries(sources)
  .map(
    ([id, src]) =>
      `  '${id}': { title: '${src.title.replace(/'/g, "\\'")}'${src.url === undefined ? '' : `, url: '${src.url}'`} },`,
  )
  .join('\n')}
}`

const emitBody = (fixture: MarkdownFixture, isStyleX: boolean): string => {
  const props: string[] = [
    'model: model.markdown',
    'toParentMessage: message => GotMarkdownMessage({ message })',
    'children: CONTENT',
  ]
  if (fixture.density !== undefined) {
    props.push(`density: '${fixture.density}'`)
  }
  if (fixture.headingLevelStart !== undefined) {
    props.push(`headingLevelStart: ${String(fixture.headingLevelStart)}`)
  }
  if (fixture.sources !== undefined) {
    props.push('sources: SOURCES')
  }
  if (fixture.contentWidth !== undefined) {
    props.push(`contentWidth: ${String(fixture.contentWidth)}`)
  }
  if (fixture.contentAlign !== undefined) {
    props.push(`contentAlign: '${fixture.contentAlign}'`)
  }
  return `    Markdown.markdown({\n      ${props.join(',\n      ')}\n    }, h)`
}

const emitApplication = (
  fixture: MarkdownFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  return foldkitApplication({
    title: `Markdown — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import * as Markdown from '@/${base}/markdown'

const CONTENT = ${JSON.stringify(fixture.content)}${fixture.sources === undefined ? '' : `\n\n${sourcesEmit(fixture.sources)}`}`,
    model: `export const Model = S.Struct({
  markdown: Markdown.Model,
})
export type Model = typeof Model.Type`,
    messages: `export const GotMarkdownMessage = taggedStruct('GotMarkdownMessage', {
  message: Markdown.Message,
})
export const Message = S.Union([GotMarkdownMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { markdown: Markdown.init() },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotMarkdownMessage': {
      const markdownOp__ = Markdown.update(model.markdown, message.message)
      const commands = markdownOp__.commands ?? []
      return {
        model: { ...model, markdown: markdownOp__.model },
        commands: Command.mapMessages(commands, next =>
          GotMarkdownMessage({ message: next })),
      }
    }
  }
}`,
    view: `${isStyleX ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Markdown — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const markdownExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  markdownFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: emitApplication(fixture, renderer),
  }))

export const markdownExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, markdownExamplesFor(renderer))
