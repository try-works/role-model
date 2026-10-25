import { authoredPage } from '@/docs/components/pages/authored-page'
import { separatorExamples } from '@/docs/components/pages/separator/shared'
import { separatorTailwindPreviewProgram } from '@/docs/components/pages/separator/tailwind'

export const separatorPage = authoredPage({
  slug: 'separator',
  title: 'Separator',
  kind: 'helper',
  previewProgram: separatorTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Separates adjacent content visually or as an explicit semantic boundary.',
    architecture:
      'Separator is stateless. It defaults to decorative role none; decorative: false opts into the separator role when the boundary conveys structure.',
    apiHref: 'https://foldkit.dev/ui/overview',
    accessibility:
      'Keep decorative separators out of the accessibility tree. Use decorative: false only when the boundary itself conveys organization.',
    examples: separatorExamples('tailwind'),
    stylexExamples: separatorExamples('stylex'),
    pleatExamples: separatorExamples('pleat'),
  },
})
