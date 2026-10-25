import { authoredPage } from '@/docs/components/pages/authored-page'
import { popoverExamples } from '@/docs/components/pages/popover/shared'
import { popoverTailwindPreviewProgram } from '@/docs/components/pages/popover/tailwind'

export const popoverPage = authoredPage({
  slug: 'popover',
  title: 'Popover',
  kind: 'submodel',
  previewProgram: popoverTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Displays interactive content in a floating panel anchored to a trigger.',
    architecture:
      'Popover directly wraps the canonical Foldkit interaction Submodel in both skins. Its child Model owns disclosure, anchor, dismissal, transition, and transient focus behavior; domain content remains per-render and visibility facts return through OutMessages.',
    apiHref: 'https://foldkit.dev/ui/popover',
    composition:
      'Popover submodel\n├── trigger button / anchor\n├── optional backdrop\n└── positioned panel\n    └── interactive content',
    styling:
      'Choose side and alignment as view configuration. The positioning engine can still flip or shift the panel to remain visible near viewport edges.',
    accessibility:
      'The primitive connects trigger state and deterministic panel IDs. Set contentFocus when the panel contains controls; Escape and outside interaction dismiss it and restore focus. Collision-aware placement stays within the viewport, and both skins disable overlay transitions for reduced motion.',
    keyboard: [
      ['Enter / Space', 'Opens or closes the anchored panel.'],
      [
        'Tab',
        'Moves into interactive popover content when contentFocus is enabled.',
      ],
      ['Escape', 'Closes the panel and restores trigger focus.'],
    ],
    examples: popoverExamples('tailwind'),
    stylexExamples: popoverExamples('stylex'),
    pleatExamples: popoverExamples('pleat'),
  },
})
