import { authoredPage } from '@/docs/components/pages/authored-page'
import { timestampExamples } from '@/docs/components/pages/timestamp/shared'
import { timestampTailwindPreviewProgram } from '@/docs/components/pages/timestamp/tailwind'

export const timestampPage = authoredPage({
  slug: 'timestamp',
  title: 'Timestamp',
  kind: 'submodel',
  previewProgram: timestampTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A <time> element that renders an instant as relative ("2h ago"), absolute, or auto-switched text, with an optional hover card carrying copyable full-date and multi-timezone lines.',
    architecture:
      'Timestamp is a submodel component. Its Model holds the instant (valueMs), format, live flag, and the nested HoverCard state; a gated tick subscription advances nowMs at the CreaseUI refresh cadence (1s under a minute, 30s under an hour, 60s under a day, 5m beyond) only while a relative format is live. Formatting helpers (formatInstant, formatRelativeTime, formatTooltipLines) handle absolute, relative, and tooltip values.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/timestamp.ts',
    styling:
      "Renders through CreaseUI's text scale: `type` picks the preset (supporting by default), `size` overrides only the font size, `color`/`weight` tune ink. When a tooltip is available the text carries CreaseUI's dashed underline hint; the hover card lists label/value rows with a per-line copy affordance.",
    accessibility:
      'Semantic <time> element with a dateTime attribute (ISO 8601 instant) and — for relative formats — an aria-label containing the long absolute form. The hover card exposes the same instant in full precision and its copy buttons announce through a polite live region.',
    keyboard: [
      [
        'Tab',
        'Focuses the timestamp trigger, opening the hover card after its show delay.',
      ],
      ['Escape', 'Dismisses the hover card.'],
    ],
    examples: timestampExamples('tailwind'),
    stylexExamples: timestampExamples('stylex'),
    pleatExamples: timestampExamples('pleat'),
  },
})
