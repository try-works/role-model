import { authoredPage } from '@/docs/components/pages/authored-page'
import { drawerExamples } from '@/docs/components/pages/drawer/shared'
import { drawerTailwindPreviewProgram } from '@/docs/components/pages/drawer/tailwind'

export const drawerPage = authoredPage({
  slug: 'drawer',
  title: 'Drawer',
  kind: 'submodel',
  previewProgram: drawerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Presents a dismissible task panel that can be dragged away from any screen edge.',
    architecture:
      'Drawer composes the canonical Dialog Model with a shared finite drag phase and snap decision. Offset and velocity remain transient child state; threshold, fling, cancellation, focus, and animation Commands all flow through Drawer.update.',
    apiHref: 'https://foldkit.dev/ui/drawer',
    composition:
      'Trigger (parent Message)\nDrawer submodel\n├── modal dialog lifecycle\n├── drag gesture state\n└── panel\n    ├── optional handle\n    ├── title / description\n    ├── content\n    └── footer actions',
    styling:
      'Bottom drawers work well on touch-first layouts. Side drawers suit wider screens. Only transform is updated during a drag, and reduced-motion mode removes the settling transition.',
    accessibility:
      'The nested Dialog supplies naming, focus containment, Escape dismissal, and trigger focus restoration. Outside clicks dismiss the drawer by default; set disablePointerDismissal: true to keep it open. The visible drag handle supports mouse and touch gestures; every workflow still needs ordinary keyboard-operable close controls.',
    keyboard: [
      [
        'Tab / Shift+Tab',
        'Moves through controls while focus remains in the drawer.',
      ],
      ['Escape', 'Closes the drawer and restores focus to its trigger.'],
      [
        'Pointer drag',
        'Dragging at least 120px, or making a deliberate fast fling, dismisses the drawer; cancellation returns to open.',
      ],
    ],
    examples: drawerExamples('tailwind'),
    stylexExamples: drawerExamples('stylex'),
    pleatExamples: drawerExamples('pleat'),
  },
})
