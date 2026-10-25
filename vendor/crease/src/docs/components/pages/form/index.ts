import { authoredPage } from '@/docs/components/pages/authored-page'
import { formExamples } from '@/docs/components/pages/form/shared'
import { formTailwindPreviewProgram } from '@/docs/components/pages/form/tailwind'
export const formPage = authoredPage({
  slug: 'form',
  title: 'Form',
  kind: 'recipe',
  previewProgram: formTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Coordinates native submission, controlled fields, validation, and explicit effects without introducing hidden form state.',
    architecture:
      'Form is a stateless feature recipe. Field values, touched/submitted flags, validation versions, pending status, and Commands belong to the parent Foldkit Model and update function. The recipe only supplies semantic form and error-summary structure.',
    apiHref: 'https://foldkit.dev/core/forms',
    composition:
      'Form\n├── ErrorSummary (when invalid)\n├── Field.controlField\n│   └── controlled native input\n└── native submit Button',
    styling:
      'Keep errors next to their fields, place the summary before invalid fields, and reserve disabled controls for truly unavailable actions rather than using disabled state as the only pending indication.',
    accessibility:
      'Use Field.controlField for deterministic linkage. On failed submission, insert a focusable ErrorSummary whose links target invalid controls. Preserve native names, types, and autocomplete tokens so browser validation, autofill, and password managers can recognize the form.',
    keyboard: [
      ['Enter', 'Submits from a compatible native control.'],
      [
        'Tab',
        'Moves through controls and the submit action in document order.',
      ],
    ],
    examples: formExamples('tailwind'),
    stylexExamples: formExamples('stylex'),
    pleatExamples: formExamples('pleat'),
  },
})
