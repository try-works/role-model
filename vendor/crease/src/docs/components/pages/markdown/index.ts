import { authoredPage } from '@/docs/components/pages/authored-page'
import { markdownExamples } from '@/docs/components/pages/markdown/shared'
import { markdownTailwindPreviewProgram } from '@/docs/components/pages/markdown/tailwind'

export const markdownPage = authoredPage({
  slug: 'markdown',
  title: 'Markdown',
  kind: 'submodel',
  previewProgram: markdownTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Markdown rendered through the typography primitives: headings, lists, quotes, code blocks, tables, and citations.',
    architecture:
      'Markdown is a submodel component. The parent owns one Markdown.Model, wires GotMarkdownMessage through update, and the child parses the source and manages per-fence CodeBlock state.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/markdown.ts',
    styling:
      'Compact density tightens block spacing for chat surfaces; headingLevelStart shifts the rendered heading scale, and contentWidth/contentAlign bound prose measure.',
    accessibility:
      'Markdown semantics map to native elements (headings, lists, blockquotes, tables); citation chips resolve to accessible labels with their source titles.',
    examples: markdownExamples('tailwind'),
    stylexExamples: markdownExamples('stylex'),
    pleatExamples: markdownExamples('pleat'),
  },
})
