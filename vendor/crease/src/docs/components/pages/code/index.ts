import { authoredPage } from '@/docs/components/pages/authored-page'
import { codeExamples } from '@/docs/components/pages/code/shared'
import { codeTailwindPreviewProgram } from '@/docs/components/pages/code/tailwind'

export const codePage = authoredPage({
  slug: 'code',
  title: 'Code',
  kind: 'helper',
  previewProgram: codeTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Inline code rendered in a compact mono treatment inside running text.',
    architecture:
      'Code is a stateless render helper. The parent supplies the code content and optional color/size inputs per render; it returns Html directly.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/code.ts',
    styling:
      'Inline code inherits the surrounding text size so it sits naturally in headings, body, and captions; the size input overrides it when a fixed mono size is needed.',
    accessibility:
      'Renders a semantic code element so assistive technology announces the content as code.',
    examples: codeExamples('tailwind'),
    stylexExamples: codeExamples('stylex'),
    pleatExamples: codeExamples('pleat'),
  },
})
