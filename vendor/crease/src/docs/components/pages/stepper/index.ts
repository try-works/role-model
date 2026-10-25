import { authoredPage } from '@/docs/components/pages/authored-page'
import { stepperExamples } from '@/docs/components/pages/stepper/shared'
import { stepperTailwindPreviewProgram } from '@/docs/components/pages/stepper/tailwind'

export const stepperPage = authoredPage({
  slug: 'stepper',
  title: 'Stepper',
  kind: 'submodel',
  previewProgram: stepperTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Multi-step progress indicator that shows where the user is in a linear flow, with per-step status, optional content, and responsive collapse.',
    architecture:
      'The parent owns the active step index; the child Model tracks the previously seen step for connector animation timing and the measured root width for horizontal collapse. Fold the ClickedStep OutMessage to write back a new active step, and call Stepper.reflectActiveStep when changing it programmatically.',
    styling:
      'The separated layout gives every step its own bar segment above the label; the on-track layout slots indicators into a single continuous connector line. Density controls block padding, and collapsedVariant chooses how a narrow horizontal stepper degrades.',
    accessibility:
      'Steps render as list items in an aria-labelled ordered list, with aria-current="step" on the active one. Clickable steps carry a "Go to step N, label" accessible name, statuses are announced via visually hidden text, and the collapsed summary row is hidden from assistive tech.',
    keyboard: [
      ['Tab', 'Moves focus between clickable steps and summary controls.'],
      ['Space / Enter', 'Activates the focused step or control button.'],
    ],
    examples: stepperExamples('tailwind'),
    stylexExamples: stepperExamples('stylex'),
    pleatExamples: stepperExamples('pleat'),
  },
})
