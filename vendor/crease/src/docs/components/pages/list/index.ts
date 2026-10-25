import { authoredPage } from '@/docs/components/pages/authored-page'
import { listExamples } from '@/docs/components/pages/list/shared'
import { listTailwindPreviewProgram } from '@/docs/components/pages/list/tailwind'

export const listPage = authoredPage({
  slug: 'list',
  title: 'List',
  kind: 'helper',
  previewProgram: listTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Ordered, unordered, and none-marker lists of label/description rows.',
    architecture:
      'List is a stateless render helper. The parent supplies listStyle, divider, and row content per render; it returns Html directly.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/list.ts',
    styling:
      'Pick the marker style for the content semantics (disc for unordered, decimal for steps, none for stacked rows); dividers separate dense message-style rows.',
    accessibility:
      'List renders a semantic list element so assistive technology announces item count; interactive rows stay keyboard focusable.',
    examples: listExamples('tailwind'),
    stylexExamples: listExamples('stylex'),
    pleatExamples: listExamples('pleat'),
  },
})
