import { authoredPage } from '@/docs/components/pages/authored-page'
import { spinnerExamples } from '@/docs/components/pages/spinner/shared'
import { spinnerTailwindPreviewProgram } from '@/docs/components/pages/spinner/tailwind'

export const spinnerPage = authoredPage({
  slug: 'spinner',
  title: 'Spinner',
  kind: 'helper',
  previewProgram: spinnerTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Indicates short, indeterminate work with a compact animated icon.',
    architecture:
      'Spinner is a stateless view helper. Command state in the parent Model determines when it appears.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'Choose from finite sm, md, or lg sizes and current, muted, or primary tones. Prefer Skeleton when the shape of loading content is known.',
    accessibility:
      'Provide label for a standalone spinner, or set isDecorative when a surrounding status already names the operation. Reduced-motion mode keeps the icon still.',
    examples: spinnerExamples('tailwind'),
    stylexExamples: spinnerExamples('stylex'),
    pleatExamples: spinnerExamples('pleat'),
  },
})
