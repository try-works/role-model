import { authoredPage } from '@/docs/components/pages/authored-page'
import { textExamples } from '@/docs/components/pages/text/shared'
import { textTailwindPreviewProgram } from '@/docs/components/pages/text/tailwind'

export const textPage = authoredPage({
  slug: 'text',
  title: 'Text',
  kind: 'helper',
  previewProgram: textTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Semantic typescale text for body, large, label, supporting, and code roles.',
    architecture:
      'Text is a stateless render helper. The parent supplies type, color, weight, display, truncation, and wrapping inputs per render; it returns Html directly.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/text.ts',
    styling:
      'Pick the semantic type that matches the content role before reaching for size or weight overrides. Truncation and wrapping belong to the layout, not the content.',
    accessibility:
      'Secondary and disabled colors reduce contrast; reserve them for metadata. Strikethrough and truncation must not hide information required to complete a task.',
    examples: textExamples('tailwind'),
    stylexExamples: textExamples('stylex'),
    pleatExamples: textExamples('pleat'),
  },
})
