import { authoredPage } from '@/docs/components/pages/authored-page'
import { blockquoteExamples } from '@/docs/components/pages/blockquote/shared'
import { blockquoteTailwindPreviewProgram } from '@/docs/components/pages/blockquote/tailwind'

export const blockquotePage = authoredPage({
  slug: 'blockquote',
  title: 'Blockquote',
  kind: 'helper',
  previewProgram: blockquoteTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Quoted passages with an accent border and optional cite attribution.',
    architecture:
      'Blockquote is a stateless render helper. The parent supplies the quote content and optional cite per render; it returns Html directly.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/blockquote.ts',
    styling:
      'The component carries its own left accent border and muted text; wrap it for layout instead of restyling the quote itself.',
    accessibility:
      'Renders a semantic blockquote element; cite labels render as attribution text so assistive tech can associate the source.',
    examples: blockquoteExamples('tailwind'),
    stylexExamples: blockquoteExamples('stylex'),
    pleatExamples: blockquoteExamples('pleat'),
  },
})
