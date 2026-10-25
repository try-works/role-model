import { authoredPage } from '@/docs/components/pages/authored-page'
import { circularProgressExamples } from '@/docs/components/pages/circular-progress/shared'
import { circularProgressTailwindPreviewProgram } from '@/docs/components/pages/circular-progress/tailwind'

export const circularProgressPage = authoredPage({
  slug: 'circular-progress',
  title: 'Circular Progress',
  kind: 'helper',
  previewProgram: circularProgressTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A ring-shaped progress indicator for determinate and indeterminate work.',
    architecture:
      'CircularProgress is a stateless render helper. Determinate rings draw a value/max arc; `isIndeterminate` swaps in a continuously rotating arc, and `hasValueLabel` or `children` fills the center.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/circular-progress.ts',
    accessibility:
      'The svg carries role="progressbar" with aria-valuemin/max/now in determinate mode; the label is sr-only unless `isLabelHidden` is false. Reduced-motion slows the spin.',
    examples: circularProgressExamples('tailwind'),
    stylexExamples: circularProgressExamples('stylex'),
    pleatExamples: circularProgressExamples('pleat'),
  },
})
