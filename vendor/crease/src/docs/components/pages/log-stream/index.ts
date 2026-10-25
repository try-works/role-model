import { authoredPage } from '@/docs/components/pages/authored-page'
import { logStreamExamples } from '@/docs/components/pages/log-stream/shared'
import { logStreamTailwindPreviewProgram } from '@/docs/components/pages/log-stream/tailwind'

export const logStreamPage = authoredPage({
  slug: 'log-stream',
  title: 'Log Stream',
  kind: 'submodel',
  previewProgram: logStreamTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A mono grid of log rows (timestamp | level | source | message) with level accents, expandable per-row detail panels, and follow-scroll live tailing with a Jump to latest affordance.',
    architecture:
      'Log Stream is a submodel component. Its Model wraps the shared message-scroller model (scroll position, follow pinning) plus expandedIds for open detail rows. Scrolling away from the tail reveals a jump button that re-pins the stream; ChangedLogStreamFollowing reports pin transitions as an out message.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/log-stream.ts',
    styling:
      'The default variant uses theme surface tokens; the terminal variant is intentionally always-dark — brand chrome mirroring real shells — implemented as a StyleX theme override on the shared tokens. Rows use content-visibility for cheap long lists and appended rows fade in.',
    accessibility:
      'The region is role="log" whose aria-live channel is polite only while following the tail and off while unfollowed, so a busy stream never floods assistive tech. Expandable rows are disclosure buttons with aria-expanded.',
    examples: logStreamExamples('tailwind'),
    stylexExamples: logStreamExamples('stylex'),
    pleatExamples: logStreamExamples('pleat'),
  },
})
