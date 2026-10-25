import { authoredPage } from '@/docs/components/pages/authored-page'
import { emptyExamples } from '@/docs/components/pages/empty/shared'
import { emptyTailwindPreviewProgram } from '@/docs/components/pages/empty/tailwind'

export const emptyPage = authoredPage({
  slug: 'empty',
  title: 'Empty',
  kind: 'recipe',
  previewProgram: emptyTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Explains an empty collection or unavailable result and offers a useful next action.',
    architecture:
      'Empty is a stateless composition recipe. The parent Model determines why content is absent and the action dispatches a domain Message.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition:
      'Empty\n├── EmptyHeader → EmptyMedia / EmptyTitle / EmptyDescription\n└── EmptyContent → application actions',
    styling:
      'Keep the composition focused: one explanation, one primary recovery action, and optional supporting guidance.',
    accessibility:
      'Use a real heading for the title when the empty state is the main content. Action labels should describe what happens next.',
    examples: emptyExamples('tailwind'),
    stylexExamples: emptyExamples('stylex'),
    pleatExamples: emptyExamples('pleat'),
  },
})
