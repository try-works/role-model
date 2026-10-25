import { authoredPage } from '@/docs/components/pages/authored-page'
import { directionExamples } from '@/docs/components/pages/direction/shared'
import { directionTailwindPreviewProgram } from '@/docs/components/pages/direction/tailwind'
export const directionPage = authoredPage({
  slug: 'direction',
  title: 'Direction',
  kind: 'helper',
  previewProgram: directionTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Sets left-to-right or right-to-left writing direction for a subtree.',
    architecture:
      'Direction is a stateless wrapper around the native dir attribute. It changes layout context without introducing component state.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'Prefer setting direction at the document root. Use this helper for isolated previews or mixed-direction regions.',
    accessibility:
      'Correct direction improves reading order and punctuation for assistive technology. Do not use CSS flex reversal as a substitute.',
    examples: directionExamples('tailwind'),
    stylexExamples: directionExamples('stylex'),
    pleatExamples: directionExamples('pleat'),
  },
})
