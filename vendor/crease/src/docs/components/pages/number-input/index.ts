import { authoredPage } from '@/docs/components/pages/authored-page'
import { numberInputExamples } from '@/docs/components/pages/number-input/shared'
import { numberInputTailwindPreviewProgram } from '@/docs/components/pages/number-input/tailwind'

export const numberInputPage = authoredPage({
  slug: 'number-input',
  title: 'Number Input',
  kind: 'submodel',
  previewProgram: numberInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A stepper input for numeric values with locale-aware editing, optional units, min/max clamping, and a clear button.',
    architecture:
      'Number Input is a submodel: its Model owns focus and the draft text while the parent Model owns the committed value. Edits report ChangedValue OutMessages upward.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/number-input.ts',
    styling:
      'Two sizes plus stepper affordances; status renders an attached message strip under the control.',
    accessibility:
      'The input uses inputmode=decimal with an aria-describedby chain covering description and status; steppers and clear use labelled buttons.',
    examples: numberInputExamples('tailwind'),
    stylexExamples: numberInputExamples('stylex'),
    pleatExamples: numberInputExamples('pleat'),
  },
})
