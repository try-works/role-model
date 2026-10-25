import { authoredPage } from '@/docs/components/pages/authored-page'
import { labelExamples } from '@/docs/components/pages/label/shared'
import { labelTailwindPreviewProgram } from '@/docs/components/pages/label/tailwind'

export const labelPage = authoredPage({
  slug: 'label',
  title: 'Label',
  kind: 'helper',
  previewProgram: labelTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description: 'Associates visible text with a form control.',
    architecture:
      'Label is a stateless native label helper. Controlled input values and change Messages remain in the parent application.',
    apiHref: 'https://foldkit.dev/ui/input',
    accessibility:
      'Set for to the exact control id. isRequired and isDisabled mirror presentation; native required and disabled semantics remain on the control.',
    examples: labelExamples('tailwind'),
    stylexExamples: labelExamples('stylex'),
    pleatExamples: labelExamples('pleat'),
  },
})
