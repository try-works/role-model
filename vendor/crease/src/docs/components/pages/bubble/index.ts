import { authoredPage } from '@/docs/components/pages/authored-page'
import { bubbleExamples } from '@/docs/components/pages/bubble/shared'
import { bubbleTailwindPreviewProgram } from '@/docs/components/pages/bubble/tailwind'

export const bubblePage = authoredPage({
  slug: 'bubble',
  title: 'Bubble',
  kind: 'helper',
  previewProgram: bubbleTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Presents one message in a conversational thread with alignment, tone, and optional reactions.',
    architecture:
      'Bubble is a stateless composition helper. The application Model owns the message list, sender, delivery state, and reactions; view maps those values to bubbles.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition: 'BubbleGroup\n└── Bubble → BubbleContent / BubbleReactions',
    styling:
      'Use align to distinguish participants and variants for semantic tone. Keep message width bounded for readable line length.',
    accessibility:
      'Render the surrounding transcript as a list or log when messages update live. Alignment and color must not be the only indication of the sender.',
    examples: bubbleExamples('tailwind'),
    stylexExamples: bubbleExamples('stylex'),
    pleatExamples: bubbleExamples('pleat'),
  },
})
