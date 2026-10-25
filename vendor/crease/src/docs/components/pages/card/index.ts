import { authoredPage } from '@/docs/components/pages/authored-page'
import { cardExamples } from '@/docs/components/pages/card/shared'
import { cardTailwindPreviewProgram } from '@/docs/components/pages/card/tailwind'

export const cardPage = authoredPage({
  slug: 'card',
  title: 'Card',
  kind: 'helper',
  previewProgram: cardTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Groups related information and actions into one visually distinct surface.',
    architecture:
      'Card is a family of stateless layout helpers. The parent view chooses semantic elements and supplies all behavior through child components. Spacing is driven by the `--card-spacing` CSS variable; `size="sm"` tightens it.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition:
      'Card[size]\n├── CardHeader → CardTitle / CardDescription / CardAction\n├── CardContent\n└── CardFooter',
    styling:
      'Compose named parts instead of rebuilding their spacing. Use the element option when section or article better describes the content, and `--card-spacing` (or `-mx-(--card-spacing)` negative margins) to control inset and edge-to-edge content.',
    accessibility:
      'Card adds no landmark by default. Choose section or article only when the content has the corresponding document meaning and provide a heading.',
    examples: cardExamples('tailwind'),
    stylexExamples: cardExamples('stylex'),
    pleatExamples: cardExamples('pleat'),
  },
})
