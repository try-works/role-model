import { authoredPage } from '@/docs/components/pages/authored-page'
import { aspectRatioExamples } from '@/docs/components/pages/aspect-ratio/shared'
import { aspectRatioTailwindPreviewProgram } from '@/docs/components/pages/aspect-ratio/tailwind'

export const aspectRatioPage = authoredPage({
  slug: 'aspect-ratio',
  title: 'Aspect Ratio',
  kind: 'helper',
  previewProgram: aspectRatioTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Keeps media or composed content at a stable width-to-height ratio.',
    architecture:
      'Aspect Ratio is a stateless layout helper backed by the native aspect-ratio style.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'Set the width on the wrapper or its parent. Children can fill the ratio box with absolute or full-size layout styles.',
    accessibility:
      'The wrapper adds no semantics. Images and media inside it still need appropriate alternative text or captions.',
    examples: aspectRatioExamples('tailwind'),
    stylexExamples: aspectRatioExamples('stylex'),
    pleatExamples: aspectRatioExamples('pleat'),
  },
})
