import { authoredPage } from '@/docs/components/pages/authored-page'
import { centerExamples } from '@/docs/components/pages/center/shared'
import { centerTailwindPreviews } from '@/docs/components/pages/center/tailwind'

const tailwindExamples = centerExamples('tailwind').map((example, index) => ({
  ...example,
  staticPreview: (centerTailwindPreviews[index] ?? centerTailwindPreviews[0])!,
}))

export const centerPage = authoredPage({
  slug: 'center',
  title: 'Center',
  kind: 'helper',
  previewMode: 'static',
  definition: {
    kind: 'helper',
    description:
      'Centers content on one or both flex axes — horizontal, vertical, or both — with the CreaseUI spacing scale for optional inner padding.',
    architecture:
      'Center is a stateless render helper. The axis prop resolves onto justify-content (main axis) and align-items (cross axis); isInline switches to inline-flex for text/icon contexts. Height gives the region its centering space.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/center.ts',
    styling:
      'Give the region a height (or place it inside a sized parent) for both-axes centering. Padding props follow the same edge → axis → all cascade as Stack.',
    accessibility:
      'Center applies no semantics of its own. Empty-state patterns should pair it with a real heading or status text inside.',
    examples: tailwindExamples,
    stylexExamples: centerExamples('stylex'),
    pleatExamples: centerExamples('pleat'),
  },
})
