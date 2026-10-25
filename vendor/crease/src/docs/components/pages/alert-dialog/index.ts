import { authoredPage } from '@/docs/components/pages/authored-page'
import { alertDialogExamples } from '@/docs/components/pages/alert-dialog/shared'
import { alertDialogTailwindPreviewProgram } from '@/docs/components/pages/alert-dialog/tailwind'

export const alertDialogPage = authoredPage({
  slug: 'alert-dialog',
  title: 'Alert Dialog',
  kind: 'submodel',
  previewProgram: alertDialogTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Interrupts with a consequential choice and emits explicit confirm or cancel facts.',
    architecture:
      'Alert Dialog reuses the canonical Dialog Model, view, focus trap, animation, and Commands. Its wrapper adds only RequestedConfirm/RequestedCancel messages and Confirmed/Cancelled OutMessages. Confirmation does not auto-close: the parent owns async consequences and closes after success.',
    apiHref: 'https://foldkit.dev/ui/dialog',
    composition:
      'Dialog behavior Submodel\n└── alertdialog panel\n    ├── required title + description\n    └── safe Cancel focus + explicit Confirm decision',
    styling:
      'Reserve this pattern for consequential choices. Use a specific action label and keep pending feedback in the same stable action control.',
    accessibility:
      'The panel has alertdialog semantics, required accessible name and description, no backdrop dismissal, a focus trap, and focus restoration. The safe Cancel action receives initial focus; Escape emits Cancelled.',
    keyboard: [
      ['Tab / Shift+Tab', 'Cycles between the decision actions.'],
      ['Enter / Space', 'Activates the focused explicit decision.'],
      ['Escape', 'Emits Cancelled, closes, and restores trigger focus.'],
    ],
    examples: alertDialogExamples('tailwind'),
    stylexExamples: alertDialogExamples('stylex'),
    pleatExamples: alertDialogExamples('pleat'),
  },
})
