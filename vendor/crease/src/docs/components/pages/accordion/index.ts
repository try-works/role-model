import { authoredPage } from '@/docs/components/pages/authored-page'
import { accordionExamples } from '@/docs/components/pages/accordion/shared'
import { accordionTailwindPreviewProgram } from '@/docs/components/pages/accordion/tailwind'

export const accordionPage = authoredPage({
  slug: 'accordion',
  title: 'Accordion',
  kind: 'submodel',
  previewProgram: accordionTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Groups disclosure headings whose panels can open one-at-a-time or independently.',
    architecture:
      'Accordion stores stable open values in one child Model, delegates accessible behavior to controlled Disclosure helpers, enforces single/multiple policy in update, and emits a ChangedValue OutMessage for parent domain logic.',
    apiHref: 'https://foldkit.dev/ui/disclosure',
    composition:
      'Parent Model\n└── Accordion Model\n    ├── type: single | multiple\n    └── stable open values\n        └── per-render items\n            └── Disclosure heading + animated panel',
    styling:
      'Item order is a view concern; interaction state follows each stable value across insertion and reordering. Use single mode for mutually exclusive sections and multiple mode when comparison matters.',
    accessibility:
      'Each heading contains a real button connected to its panel with Disclosure semantics. Disabled headings remain visible but unavailable; focus indication and expanded state come from the primitive.',
    keyboard: [
      ['Tab / Shift+Tab', 'Moves between accordion heading buttons.'],
      ['Enter / Space', 'Toggles the focused disclosure.'],
    ],
    examples: accordionExamples('tailwind'),
    stylexExamples: accordionExamples('stylex'),
    pleatExamples: accordionExamples('pleat'),
  },
})
