import { authoredPage } from '@/docs/components/pages/authored-page'
import { radioGroupExamples } from '@/docs/components/pages/radio-group/shared'
import { radioGroupTailwindPreviewProgram } from '@/docs/components/pages/radio-group/tailwind'

export const radioGroupPage = authoredPage({
  slug: 'radio-group',
  title: 'Radio Group',
  kind: 'submodel',
  previewProgram: radioGroupTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Chooses exactly one value from a visible set of mutually exclusive options.',
    architecture:
      'Radio Group is a thin Foldkit interaction Submodel. The child owns only roving focus; the parent owns the selected Option<string>, delegates child Messages through update, and stores the Selected OutMessage value. Both skins render through one shared primitive adapter.',
    apiHref: 'https://foldkit.dev/ui/radio-group',
    styling:
      'Keep the full choice set visible. Descriptions are useful when labels alone do not explain the consequence of each choice.',
    accessibility:
      'ariaLabel names the group, each option has a linked label and only present descriptions are referenced. An optional name emits the hidden form value. Read-only groups remain navigable without committing a new selection.',
    keyboard: [
      ['Arrow keys', 'Moves selection and focus within the group.'],
      ['Space', 'Selects the focused option.'],
    ],
    examples: radioGroupExamples('tailwind'),
    stylexExamples: radioGroupExamples('stylex'),
    pleatExamples: radioGroupExamples('pleat'),
  },
})
