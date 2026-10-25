import { authoredPage } from '@/docs/components/pages/authored-page'
import { chatReasoningExamples } from '@/docs/components/pages/chat-reasoning/shared'
import { chatReasoningTailwindPreviewProgram } from '@/docs/components/pages/chat-reasoning/tailwind'

export const chatReasoningPage = authoredPage({
  slug: 'chat-reasoning',
  title: 'Chat Reasoning',
  kind: 'submodel',
  previewProgram: chatReasoningTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A compact collapsible reasoning display that fits into a chat message flow, showing a short summary line that expands to reveal the full reasoning.',
    architecture:
      'Chat Reasoning is a submodel component. Its Model holds the expanded state; clicking the header (or pressing Enter/Space on it) emits ToggledChatReasoning, and the parent observes expansions via the ChangedChatReasoningExpansion OutMessage. Reasoning content is passed as children so callers control how the trace is rendered.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/chat-reasoning.ts',
    styling:
      'The header renders in muted supporting text with a thinking glyph and chevron; while isStreaming is set, the label shimmers and the duration and preview stay hidden. Supply a preview string (or single-line string children) to show an ellipsis-truncated collapsed summary.',
    accessibility:
      'The header is a role="button" control with aria-expanded and aria-controls wiring to the content region. Collapsed content is inert — hidden from the accessibility tree — while keeping the grid-rows expansion transition. It is focusable via Tab and toggles on Enter or Space.',
    keyboard: [
      [
        'Enter / Space',
        'Toggles the reasoning panel between collapsed and expanded.',
      ],
      ['Tab', 'Moves focus to and from the reasoning header.'],
    ],
    examples: chatReasoningExamples('tailwind'),
    stylexExamples: chatReasoningExamples('stylex'),
    pleatExamples: chatReasoningExamples('pleat'),
  },
})
