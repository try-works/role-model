import { authoredPage } from '@/docs/components/pages/authored-page'
import { buttonGroupExamples } from '@/docs/components/pages/button-group/shared'
import { buttonGroupTailwindPreviewProgram } from '@/docs/components/pages/button-group/tailwind'

export const buttonGroupPage = authoredPage({
  slug: 'button-group',
  title: 'Button Group',
  kind: 'recipe',
  previewProgram: buttonGroupTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Visually joins related actions while preserving each button as an independent Foldkit message source.',
    architecture:
      'Button Group owns no state. Each child button emits its own typed parent Message; the group contributes layout and an accessible group boundary.',
    apiHref: 'https://foldkit.dev/ui/button',
    composition:
      'ButtonGroup\n├── Button / Input / Select\n├── ButtonGroupSeparator\n└── ButtonGroupText',
    styling:
      'Group actions only when they form one compact task. Keep destructive or unrelated actions visually separate.',
    accessibility:
      'The wrapper exposes role=group and every child retains native button semantics. Button labels must remain unambiguous when read without visual position.',
    examples: buttonGroupExamples('tailwind'),
    stylexExamples: buttonGroupExamples('stylex'),
    pleatExamples: buttonGroupExamples('pleat'),
  },
})
