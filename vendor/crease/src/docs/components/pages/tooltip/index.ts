import { authoredPage } from '@/docs/components/pages/authored-page'
import { tooltipExamples } from '@/docs/components/pages/tooltip/shared'
import { tooltipTailwindPreviewProgram } from '@/docs/components/pages/tooltip/tailwind'

export const tooltipPage = authoredPage({
  slug: 'tooltip',
  title: 'Tooltip',
  kind: 'submodel',
  previewProgram: tooltipTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Provides a short, non-interactive label or explanation for a focused or hovered control.',
    architecture:
      'Tooltip is a Foldkit child Model. Its update returns delayed-show and delayed-close Commands with generation IDs; the parent maps them back through GotTooltipMessage so stale completions cannot override current hover or focus ownership.',
    apiHref: 'https://foldkit.dev/ui/tooltip',
    composition:
      'Tooltip submodel\n├── accessible trigger\n└── anchored panel\n    ├── concise content\n    └── optional placement-aware arrow',
    styling:
      'Keep tooltip text brief. Side and alignment express preference, while Foldkit’s anchor layer may flip the rendered placement to avoid viewport collisions.',
    accessibility:
      'Tooltips open on keyboard focus as well as hover, ignore pointer-induced focus on touch, and must never contain required or interactive content. Give icon-only triggers an accessible name independent of the tooltip text.',
    keyboard: [
      ['Tab', 'Focusing the trigger schedules or reveals the tooltip.'],
      ['Escape', 'Dismisses the visible tooltip without moving focus.'],
      ['Blur', 'Closes the tooltip when focus leaves the trigger.'],
    ],
    examples: tooltipExamples('tailwind'),
    stylexExamples: tooltipExamples('stylex'),
    pleatExamples: tooltipExamples('pleat'),
  },
})
