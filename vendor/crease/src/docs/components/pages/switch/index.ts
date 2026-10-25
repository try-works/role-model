import { authoredPage } from '@/docs/components/pages/authored-page'
import { switchExamples } from '@/docs/components/pages/switch/shared'
import { switchTailwindPreviewProgram } from '@/docs/components/pages/switch/tailwind'

export const switchPage = authoredPage({
  slug: 'switch',
  title: 'Switch',
  kind: 'helper',
  previewProgram: switchTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Controls an immediate on/off setting with a visible label and optional description.',
    architecture:
      'Switch is a stateless controlled helper over the Foldkit Switch primitive. The parent Model owns the setting and onToggle returns the next boolean in a domain Message; both skins use one semantic adapter.',
    apiHref: 'https://foldkit.dev/ui/switch',
    styling:
      'Use the small size only in dense settings lists. Prefer Checkbox when the choice belongs to a submitted form rather than applying immediately.',
    accessibility:
      'Switch exposes switch semantics, checked state, linked optional description, and focusable disabled or read-only state. Use direction for an explicit RTL subtree so the thumb travels in the inline direction.',
    keyboard: [['Space', 'Toggles the focused switch.']],
    examples: switchExamples('tailwind'),
    stylexExamples: switchExamples('stylex'),
    pleatExamples: switchExamples('pleat'),
  },
})
