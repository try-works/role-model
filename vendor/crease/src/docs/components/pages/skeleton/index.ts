import { authoredPage } from '@/docs/components/pages/authored-page'
import { skeletonExamples } from '@/docs/components/pages/skeleton/shared'
import { skeletonTailwindPreviewProgram } from '@/docs/components/pages/skeleton/tailwind'

export const skeletonPage = authoredPage({
  slug: 'skeleton',
  title: 'Skeleton',
  kind: 'helper',
  previewProgram: skeletonTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description: 'Reserves the shape of content while data is loading.',
    architecture:
      'Skeleton is stateless. The parent Model decides whether to render loading placeholders or resolved content.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'Match skeleton dimensions to the content they replace so loading does not cause layout shift.',
    accessibility:
      'Mark the surrounding region busy and provide an accessible loading label when the wait is meaningful. Skeleton shapes themselves remain decorative.',
    examples: skeletonExamples('tailwind'),
    stylexExamples: skeletonExamples('stylex'),
    pleatExamples: skeletonExamples('pleat'),
  },
})
