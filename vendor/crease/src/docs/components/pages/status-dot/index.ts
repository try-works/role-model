import { authoredPage } from '@/docs/components/pages/authored-page'
import { statusDotExamples } from '@/docs/components/pages/status-dot/shared'
import { statusDotTailwindPreviewProgram } from '@/docs/components/pages/status-dot/tailwind'

export const statusDotPage = authoredPage({
  slug: 'status-dot',
  title: 'Status Dot',
  kind: 'helper',
  previewProgram: statusDotTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A small colored dot that signals status such as presence, health, or severity.',
    architecture:
      'Status Dot is a stateless render helper. The parent Model supplies the variant and label and it returns Html directly.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/status-dot.ts',
    styling:
      'Choose the semantic variant that matches the status. The dot is a fixed 8px signal; pair it with a visible label or icon when color alone is not enough.',
    accessibility:
      'A color-only dot is not accessible in isolation (WCAG 2.1 SC 1.4.1). The required label becomes the aria-label; add a non-color mark (icon) or adjacent text when the status must be distinguishable without color.',
    examples: statusDotExamples('tailwind'),
    stylexExamples: statusDotExamples('stylex'),
    pleatExamples: statusDotExamples('pleat'),
  },
})
