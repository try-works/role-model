import { authoredPage } from '@/docs/components/pages/authored-page'
import { hoverCardExamples } from '@/docs/components/pages/hover-card/shared'
import { hoverCardTailwindPreviewProgram } from '@/docs/components/pages/hover-card/tailwind'

export const hoverCardPage = authoredPage({
  slug: 'hover-card',
  title: 'Hover Card',
  kind: 'submodel',
  previewProgram: hoverCardTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Reveals supplementary preview information when a pointer or keyboard focus rests on a trigger.',
    architecture:
      'Hover Card keeps pointer and focus ownership plus versioned show and close delays in one shared child Model. Both delayed Commands map back to the child so stale completions cannot override a re-entered or refocused card.',
    apiHref: 'https://foldkit.dev/ui/hover-card',
    composition:
      'Hover Card child state\n├── focusable trigger\n└── non-modal preview panel',
    styling:
      'Use concise, read-only content and leave enough room around the anchor. Hover cards should enrich an existing target, never hide an action required to complete a task.',
    accessibility:
      'The trigger is a real button and opens on focus as well as hover, with a touch press fallback. The supplemental panel is non-modal, does not move or trap focus, and closes on Escape.',
    keyboard: [
      ['Tab', 'Focusing the trigger reveals the card.'],
      [
        'Shift+Tab / Tab away',
        'Schedules the card to close after its configured delay.',
      ],
      [
        'Pointer hover',
        'Keeps the card open while the pointer crosses from trigger to content.',
      ],
    ],
    examples: hoverCardExamples('tailwind'),
    stylexExamples: hoverCardExamples('stylex'),
    pleatExamples: hoverCardExamples('pleat'),
  },
})
