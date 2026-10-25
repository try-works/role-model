import { authoredPage } from '@/docs/components/pages/authored-page'
import { messageExamples } from '@/docs/components/pages/message/shared'
import { messageTailwindPreviewProgram } from '@/docs/components/pages/message/tailwind'
export const messagePage = authoredPage({
  slug: 'message',
  title: 'Message',
  kind: 'recipe',
  previewProgram: messageTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Composes sender identity, conversational content, and delivery metadata into one transcript row.',
    architecture:
      'Message is a stateless composition recipe. The parent owns ordered message data, delivery status, and action Messages; the helper only renders semantic author, content, metadata, and action parts.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition:
      'MessageGroup\n└── Message → MessageAvatar / MessageContent\n              └── MessageHeader / Bubble / MessageFooter',
    styling:
      'Keep sender alignment consistent across the transcript and use Bubble variants for content tone rather than reordering the DOM.',
    accessibility:
      'Render transcript updates in an appropriately labeled log when they arrive live. Sender names and delivery state must be text, not color alone.',
    examples: messageExamples('tailwind'),
    stylexExamples: messageExamples('stylex'),
    pleatExamples: messageExamples('pleat'),
  },
})
