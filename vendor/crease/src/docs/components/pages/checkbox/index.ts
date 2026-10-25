import { authoredPage } from '@/docs/components/pages/authored-page'
import { checkboxExamples } from '@/docs/components/pages/checkbox/shared'
import { checkboxTailwindPreviewProgram } from '@/docs/components/pages/checkbox/tailwind'

export const checkboxPage = authoredPage({
  slug: 'checkbox',
  title: 'Checkbox',
  kind: 'helper',
  previewProgram: checkboxTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Controls an independent boolean choice with linked labeling and optional form submission.',
    architecture:
      'Checkbox is a stateless controlled helper over the Foldkit Checkbox primitive. Store checked and indeterminate policy in the parent Model and return a typed Message from onToggle; both visual skins use the same primitive adapter.',
    apiHref: 'https://foldkit.dev/ui/checkbox',
    styling:
      'The indicator and focus state are supplied by the helper. Use description for consequences or additional context.',
    accessibility:
      'The label activates the control. Checked, indeterminate, disabled, read-only, and invalid states are exposed through Foldkit’s attribute bundle, and aria-describedby is emitted only when the description exists.',
    keyboard: [['Space', 'Toggles the focused checkbox.']],
    examples: checkboxExamples('tailwind'),
    stylexExamples: checkboxExamples('stylex'),
    pleatExamples: checkboxExamples('pleat'),
  },
})
