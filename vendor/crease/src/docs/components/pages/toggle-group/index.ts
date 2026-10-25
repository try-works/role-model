import { authoredPage } from '@/docs/components/pages/authored-page'
import { toggleGroupExamples } from '@/docs/components/pages/toggle-group/shared'
import { toggleGroupTailwindPreviewProgram } from '@/docs/components/pages/toggle-group/tailwind'

export const toggleGroupPage = authoredPage({
  slug: 'toggle-group',
  title: 'Toggle Group',
  kind: 'submodel',
  previewProgram: toggleGroupTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Groups related toggle buttons while coordinating roving focus around parent-owned single or multiple selection.',
    architecture:
      'Bind the value union once with ToggleGroup.create<Value>(). The parent owns selected value(s); the child Model owns only the roving-focus cursor. Fold the typed Selected OutMessage according to exclusive or multiple-selection policy.',
    apiHref: 'https://foldkit.dev/ui/tabs',
    styling:
      'Use short labels or familiar icons. Joined arrangement reads as one segmented control; wrapped arrangement preserves individual boundaries on narrow viewports.',
    accessibility:
      'The shared behavior adapts Foldkit manual roving focus to a named button group while removing tab-specific semantics. Each item remains a native button with aria-pressed; disabled items are skipped.',
    keyboard: [
      [
        'Arrow keys',
        'Moves focus between enabled items without changing selection.',
      ],
      ['Home / End', 'Moves focus to the first or last enabled item.'],
      ['Space / Enter', 'Toggles the focused item.'],
    ],
    examples: toggleGroupExamples('tailwind'),
    stylexExamples: toggleGroupExamples('stylex'),
    pleatExamples: toggleGroupExamples('pleat'),
  },
})
