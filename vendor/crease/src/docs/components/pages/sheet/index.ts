import { authoredPage } from '@/docs/components/pages/authored-page'
import { sheetExamples } from '@/docs/components/pages/sheet/shared'
import { sheetTailwindPreviewProgram } from '@/docs/components/pages/sheet/tailwind'

export const sheetPage = authoredPage({
  slug: 'sheet',
  title: 'Sheet',
  kind: 'submodel',
  previewProgram: sheetTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Presents task content from a screen edge — top, right, bottom, or left — while preserving the underlying page context. A bottom sheet adds drag-to-dismiss, snap points, and a multi-sheet switcher.',
    architecture:
      'Sheet reuses Foldkit’s Dialog child Model. Programmatic open and child update return focus/animation Commands that the parent must map through GotSheetMessage. With side bottom the panel layers a pointer-gesture state machine on top — drag phases, detent offsets computed from snap points, velocity-aware settle, and magnetic capture — and the switcher variant keeps one shared dialog whose sheets swap content with a retained-fade transition.',
    apiHref: 'https://foldkit.dev/ui/dialog',
    composition:
      'Trigger (parent Message)\nSheet submodel\n└── edge panel\n    ├── header / title / description\n    ├── content\n    ├── footer\n    └── close action\n\nbottom side\n└── grab handle + scrollable body\n\nswitcher\n└── one shared dialog hosting multiple bottom sheets',
    styling:
      'Right and left sheets suit settings or navigation; top sheets suit short contextual workflows. Bottom sheets span the full width of the viewport at the bottom edge with a top-edge grab handle and rounded top corners; the scrim thins as the sheet slides down to its peek detent. Avoid using a sheet for content that needs the full page.',
    accessibility:
      'Sheet inherits Dialog’s title/description relationships, focus trap, Escape behavior, and trigger focus restoration. Use initialFocusAttributes once when a specific control should receive focus. Sheets labelled required refuse dismissal while info sheets swipe away; on bottom sheets the visible title may be replaced by an sr-only label when the layout composes its own headings.',
    keyboard: [
      ['Tab / Shift+Tab', 'Cycles within the open sheet.'],
      [
        'Escape',
        'Closes the sheet (unless its purpose is required) and returns focus to its trigger.',
      ],
      [
        'Drag the handle',
        'On bottom sheets: snaps between detents; a fast flick can dismiss info sheets.',
      ],
    ],
    examples: sheetExamples('tailwind'),
    stylexExamples: sheetExamples('stylex'),
    pleatExamples: sheetExamples('pleat'),
  },
})
