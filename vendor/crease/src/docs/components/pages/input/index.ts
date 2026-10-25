import { authoredPage } from '@/docs/components/pages/authored-page'
import { inputExamples } from '@/docs/components/pages/input/shared'
import { inputTailwindPreviewProgram } from '@/docs/components/pages/input/tailwind'

export const inputPage = authoredPage({
  slug: 'input',
  title: 'Input',
  kind: 'helper',
  previewProgram: inputTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Captures a single line of controlled text with linked labeling, description, and validation state.',
    architecture:
      'Input is a stateless controlled helper with no child Model. The parent owns the string value, validation, and submission policy; labels, descriptions, native attributes, and layout are per-render inputs. Both skins share one semantic renderer and reflect every parent value directly.',
    apiHref: 'https://foldkit.dev/ui/input',
    styling:
      'Use type for native input behavior and renderer-specific layout inputs for width. Label and description are rendered and linked by the helper.',
    accessibility:
      'Provide a visible label. Description IDs are deterministic and emitted only when their element exists; describedBy can add external help or error IDs. Disabled, read-only, invalid, autocomplete, input-mode, form, and naming attributes remain native.',
    examples: inputExamples('tailwind'),
    stylexExamples: inputExamples('stylex'),
    pleatExamples: inputExamples('pleat'),
  },
})
