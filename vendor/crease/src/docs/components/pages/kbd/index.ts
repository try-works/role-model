import { authoredPage } from '@/docs/components/pages/authored-page'
import { kbdExamples } from '@/docs/components/pages/kbd/shared'
import { kbdTailwindPreviewProgram } from '@/docs/components/pages/kbd/tailwind'

export const kbdPage = authoredPage({
  slug: 'kbd',
  title: 'Kbd',
  kind: 'helper',
  previewProgram: kbdTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Formats keyboard keys and shortcuts inline with explanatory text.',
    architecture:
      'Kbd is a stateless semantic helper that returns native kbd markup.',
    apiHref: 'https://foldkit.dev/ui/overview',
    accessibility:
      'Keep the written shortcut understandable and match the actual keyboard interaction. Use Kbd for notation, not as an interactive control.',
    examples: kbdExamples('tailwind'),
    stylexExamples: kbdExamples('stylex'),
    pleatExamples: kbdExamples('pleat'),
  },
})
