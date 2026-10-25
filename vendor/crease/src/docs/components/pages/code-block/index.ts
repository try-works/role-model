import { authoredPage } from '@/docs/components/pages/authored-page'
import { codeBlockExamples } from '@/docs/components/pages/code-block/shared'
import { codeBlockTailwindPreviewProgram } from '@/docs/components/pages/code-block/tailwind'

export const codeBlockPage = authoredPage({
  slug: 'code-block',
  title: 'Code Block',
  kind: 'submodel',
  previewProgram: codeBlockTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Fenced code with language tag, title, line numbers, highlighting, and a copy-to-clipboard button.',
    architecture:
      'CodeBlock is a submodel component. The parent owns one CodeBlock.Model per block, wires GotCodeBlockMessage through update, and the child manages copy feedback and collapse state.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/code-block.ts',
    styling:
      'The header carries the language tag and optional title; line numbers, highlighted lines, and max-height scrolling are opt-in per block. Long snippets get collapse behavior.',
    accessibility:
      'Copy feedback restores after a delay and the button keeps an accessible label; code content is preserved as selectable text.',
    keyboard: [
      ['Tab', 'Moves focus to the copy button.'],
      ['Enter / Space', 'Copies the code and starts the copied feedback.'],
    ],
    examples: codeBlockExamples('tailwind'),
    stylexExamples: codeBlockExamples('stylex'),
    pleatExamples: codeBlockExamples('pleat'),
  },
})
