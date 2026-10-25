import { authoredPage } from '@/docs/components/pages/authored-page'
import { headingExamples } from '@/docs/components/pages/heading/shared'
import { headingTailwindPreviewProgram } from '@/docs/components/pages/heading/tailwind'

export const headingPage = authoredPage({
  slug: 'heading',
  title: 'Heading',
  kind: 'helper',
  previewProgram: headingTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Section and page titles that pair a semantic level with the visual type scale.',
    architecture:
      'Heading is a stateless render helper. The parent chooses the heading level and optional truncation per render; it returns Html directly.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/heading.ts',
    styling:
      'Choose the level for document structure first, then adjust type size with the type input when the visual scale should differ. Multi-line truncation is opt-in per instance.',
    accessibility:
      'Keep levels sequential (h1 to h2 to h3) so assistive technology gets a coherent outline. The standalone accessibilityLevel input can decouple semantics when a page outline demands it.',
    examples: headingExamples('tailwind'),
    stylexExamples: headingExamples('stylex'),
    pleatExamples: headingExamples('pleat'),
  },
})
