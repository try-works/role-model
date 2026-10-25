import { authoredPage } from '@/docs/components/pages/authored-page'
import { toggleExamples } from '@/docs/components/pages/toggle/shared'
import { toggleTailwindPreviewProgram } from '@/docs/components/pages/toggle/tailwind'

export const togglePage = authoredPage({
  slug: 'toggle',
  title: 'Toggle',
  kind: 'helper',
  previewProgram: toggleTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Represents one independently pressed or unpressed formatting option.',
    architecture:
      'Toggle is a stateless controlled button. The parent Model stores pressed state and onToggle dispatches the next domain fact.',
    apiHref: 'https://foldkit.dev/ui/button',
    styling:
      'Use outline when a persistent boundary helps distinguish the control from nearby content. Icon-only toggles require ariaLabel; pressed state remains visible through surface and contrast, not color alone.',
    accessibility:
      'The helper exposes aria-pressed and preserves native button Enter/Space activation, native disabled behavior, focus-visible treatment, optional description linkage, and an explicit accessible name for icon-only content.',
    keyboard: [['Enter / Space', 'Toggles the focused pressed button.']],
    examples: toggleExamples('tailwind'),
    stylexExamples: toggleExamples('stylex'),
    pleatExamples: toggleExamples('pleat'),
  },
})
