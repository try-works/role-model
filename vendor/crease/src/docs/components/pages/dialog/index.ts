import { authoredPage } from '@/docs/components/pages/authored-page'
import { dialogExamples } from '@/docs/components/pages/dialog/shared'
import { dialogTailwindPreviewProgram } from '@/docs/components/pages/dialog/tailwind'

export const dialogPage = authoredPage({
  slug: 'dialog',
  title: 'Dialog',
  kind: 'submodel',
  previewProgram: dialogTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Opens focused content in a modal surface with focus trapping, restoration, dismissal, and optional transitions.',
    architecture:
      'Dialog directly wraps the canonical Foldkit interaction Submodel in both skins. Programmatic open and child update return Commands for focus, stack hygiene, and animation timing; always map them through the wrapper Message instead of discarding them. Each instance requires its own stable id and child Model.',
    apiHref: 'https://foldkit.dev/ui/dialog',
    composition:
      'Trigger (parent Message)\nDialog submodel\n└── panel\n    ├── header / title / description\n    ├── content\n    ├── footer\n    └── close action',
    styling:
      'Use dialogs for focused tasks that can be completed or cancelled in place. Keep content short enough that the modal context remains understandable.',
    accessibility:
      'Foldkit owns native dialog semantics, deterministic title/description IDs, stack-aware focus trapping, Escape and backdrop dismissal, and trigger focus restoration. Claim initialFocusAttributes on the intended first control. Overlay transitions honor reduced motion in both skins.',
    keyboard: [
      ['Tab / Shift+Tab', 'Cycles focus within the open dialog.'],
      ['Escape', 'Closes the dialog and restores trigger focus.'],
    ],
    examples: dialogExamples('tailwind'),
    stylexExamples: dialogExamples('stylex'),
    pleatExamples: dialogExamples('pleat'),
  },
})
