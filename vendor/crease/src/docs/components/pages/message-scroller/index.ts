import { authoredPage } from '@/docs/components/pages/authored-page'
import { messageScrollerExamples } from '@/docs/components/pages/message-scroller/shared'
import { messageScrollerTailwindPreviewProgram } from '@/docs/components/pages/message-scroller/tailwind'
export const messageScrollerPage = authoredPage({
  slug: 'message-scroller',
  title: 'Message Scroller',
  kind: 'submodel',
  previewProgram: messageScrollerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Tracks a conversation viewport and offers an accessible jump control when content exists beyond an edge.',
    architecture:
      'The Model separates viewport measurements, follow mode, and the new-message fact. A mount-scoped adapter owns scroll, mutation, and resize observation; RequestedScroll returns a versioned, reduced-motion-aware DOM Command that the parent maps.',
    apiHref: 'https://foldkit.dev/guide/subscriptions',
    composition:
      'Message Scroller container\n├── viewport (mount-scoped scroll subscription)\n│   └── content\n│       └── keyed/message items + optional anchor\n└── start/end button (derived active state → scroll Command)',
    styling:
      'Give the viewport a bounded height and keep message items structurally stable. The jump button derives visibility from measurements rather than being hidden by consumer CSS.',
    accessibility:
      'The jump control leaves the accessibility tree when inactive and has a screen-reader label when active. Conversation messages should retain their own semantic author/time/content structure.',
    keyboard: [
      ['Tab', 'Reaches the jump control only while it is active.'],
      ['Enter / Space', 'Requests a smooth scroll to the configured edge.'],
    ],
    examples: messageScrollerExamples('tailwind'),
    stylexExamples: messageScrollerExamples('stylex'),
    pleatExamples: messageScrollerExamples('pleat'),
  },
})
