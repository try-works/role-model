import { authoredPage } from '@/docs/components/pages/authored-page'
import { inputGroupExamples } from '@/docs/components/pages/input-group/shared'
import { inputGroupTailwindPreviewProgram } from '@/docs/components/pages/input-group/tailwind'
export const inputGroupPage = authoredPage({
  slug: 'input-group',
  title: 'Input Group',
  kind: 'recipe',
  previewProgram: inputGroupTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Composes a text control with contextual prefixes, suffixes, actions, or block-level supporting content.',
    architecture:
      'Input Group is a stateless composition recipe. The input value remains parent state; addons provide context and should not become a second competing control.',
    apiHref: 'https://foldkit.dev/ui/input',
    composition:
      'InputGroup\n├── InputGroupAddon / InputGroupText\n├── InputGroupInput\n└── InputGroupButton',
    styling:
      'Place units and stable prefixes inline. Use block alignment only for supporting content that genuinely needs the full row.',
    accessibility:
      'The group role communicates association, but the input still needs its own accessible label. Decorative addons should not duplicate that name.',
    examples: inputGroupExamples('tailwind'),
    stylexExamples: inputGroupExamples('stylex'),
    pleatExamples: inputGroupExamples('pleat'),
  },
})
