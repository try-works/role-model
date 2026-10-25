import { authoredPage } from '@/docs/components/pages/authored-page'
import { buttonExamples } from '@/docs/components/pages/button/shared'
import { buttonTailwindPreviewProgram } from '@/docs/components/pages/button/tailwind'

export const buttonPage = authoredPage({
  slug: 'button',
  title: 'Button',
  kind: 'helper',
  previewProgram: buttonTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Triggers an action or navigates to another resource with CreaseUI variants and native button semantics.',
    architecture:
      'Button is a stateless render helper. The parent owns action and loading state; children, icons, labels, variants, and sizes are per-render inputs; there is no child Model or lifecycle resource. Both skins use the same native behavior and semantic slots, so call Button.button directly inside view without h.submodel.',
    apiHref: 'https://foldkit.dev/ui/button',
    styling:
      'Variants and sizes are source-owned recipes. Extend the installed module when the application needs a durable visual variant; use renderer-specific layout inputs for one-off positioning.',
    accessibility:
      'Button preserves native button semantics, defaults to type=\"button\", uses the native disabled attribute together with Foldkit’s accessible state attributes, and keeps the accessible name stable while loading content is hidden from assistive technology. Button links remain native anchors.',
    keyboard: [
      ['Enter', 'Activates the focused button.'],
      ['Space', 'Activates the focused button.'],
    ],
    examples: buttonExamples('tailwind'),
    stylexExamples: buttonExamples('stylex'),
    pleatExamples: buttonExamples('pleat'),
  },
})
