import { authoredPage } from '@/docs/components/pages/authored-page'
import { markerExamples } from '@/docs/components/pages/marker/shared'
import { markerTailwindPreviewProgram } from '@/docs/components/pages/marker/tailwind'

export const markerPage = authoredPage({
  slug: 'marker',
  title: 'Marker',
  kind: 'helper',
  previewProgram: markerTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Labels a boundary, timestamp, or contextual point inside a longer stream of content.',
    architecture:
      'Marker is a stateless view helper. The parent Model chooses where markers occur in the surrounding sequence.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition: 'Marker → MarkerIcon / MarkerContent',
    styling:
      'Choose separator for a centered label between rules or border for a conventional section boundary.',
    accessibility:
      'Choose purpose explicitly: annotation maps to note, status uses a polite live status, and decorative hides the whole marker. MarkerIcon is always decorative.',
    examples: markerExamples('tailwind'),
    stylexExamples: markerExamples('stylex'),
    pleatExamples: markerExamples('pleat'),
  },
})
