import { authoredPage } from '@/docs/components/pages/authored-page'
import { infoTipExamples } from '@/docs/components/pages/info-tip/shared'
import { infoTipTailwindPreviewProgram } from '@/docs/components/pages/info-tip/tailwind'

export const infoTipPage = authoredPage({
  slug: 'info-tip',
  title: 'Info Tip',
  kind: 'submodel',
  previewProgram: infoTipTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A small "i" button that reveals a tooltip on hover, keyboard focus, and tap — for permission notes, metric definitions, and field help.',
    architecture:
      'A single-purpose trigger wired straight into the shared TooltipBehavior: pointer down focuses and opens immediately so the tip is reachable on touch screens, where a plain button trigger would swallow the tap. Model, Message, and update are the tooltip submodel re-exported.',
    styling:
      'The trigger is a bare inline-flex button: 2px padding, full rounding, muted icon color that deepens on hover under (hover: hover), and a focus-visible ring. The icon size maps 1:1 to icon sizes (12/14/16/18px, matching the text scale xs/sm/base/lg). The tooltip panel and arrow reuse the shared overlay styling.',
    accessibility:
      'The trigger is a real button with an aria-label ("More information" by default — override it to name what the tip explains), Tab-reachable, with the panel linked via aria-describedby and Escape dismissal.',
    keyboard: [
      ['Tab', 'Focuses the trigger and reveals the tooltip.'],
      ['Escape', 'Dismisses the open tooltip.'],
      [
        'Tap',
        'Opens the tooltip on touch screens (the trigger is the tip itself).',
      ],
    ],
    examples: infoTipExamples('tailwind'),
    stylexExamples: infoTipExamples('stylex'),
    pleatExamples: infoTipExamples('pleat'),
  },
})
