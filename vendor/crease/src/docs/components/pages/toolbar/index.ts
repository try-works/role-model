import { authoredPage } from '@/docs/components/pages/authored-page'
import { toolbarExamples } from '@/docs/components/pages/toolbar/shared'
import { toolbarTailwindPreviewProgram } from '@/docs/components/pages/toolbar/tailwind'

export const toolbarPage = authoredPage({
  slug: 'toolbar',
  title: 'Toolbar',
  kind: 'submodel',
  previewProgram: toolbarTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'General-purpose toolbar container with start, center, and end content slots and roving-tabindex keyboard navigation.',
    architecture:
      'A layout recipe with a Mount-driven keyboard layer: arrow keys, Home, and End move a single roving tab stop across buttons, inputs, and tabbable children, skipping disabled items and deferring to text-input carets. FocusToolbarItems emits CompletedFocusToolbarItems once the listeners install; fold it and move on.',
    styling:
      'The chrome carries padding, background variant, and optional divider borders; the inner row is a space-between flex (or a 1fr auto 1fr grid when centerContent is set). Slots pull edge-marked items flush via the data-crease-edge-comp attribute.',
    accessibility:
      'The inner element is a native role="toolbar" with aria-label and aria-orientation. Roving tabindex keeps one tab stop in the row and arrow keys navigate between items, matching the ARIA toolbar pattern.',
    keyboard: [
      [
        'Arrow keys',
        'Moves focus between toolbar items, wrapping at the ends (horizontal by default).',
      ],
      ['Home / End', 'Focuses the first or last enabled item.'],
      ['Tab', 'Enters the toolbar once at the roving tab stop.'],
    ],
    examples: toolbarExamples('tailwind'),
    stylexExamples: toolbarExamples('stylex'),
    pleatExamples: toolbarExamples('pleat'),
  },
})
