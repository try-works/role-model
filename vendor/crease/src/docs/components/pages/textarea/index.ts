import { authoredPage } from '@/docs/components/pages/authored-page'
import { textareaExamples } from '@/docs/components/pages/textarea/shared'
import { textareaTailwindPreviewProgram } from '@/docs/components/pages/textarea/tailwind'

export const textareaPage = authoredPage({
  slug: 'textarea',
  title: 'Textarea',
  kind: 'helper',
  previewProgram: textareaTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Captures controlled multi-line text with accessible labeling and validation.',
    architecture:
      'Textarea is a stateless controlled helper with no child Model. The parent owns its text, validation, and submission policy; rows, wrapping, labels, descriptions, and resize policy are per-render inputs. Both skins share one semantic renderer and reflect parent changes directly.',
    apiHref: 'https://foldkit.dev/ui/textarea',
    styling:
      'Set rows for an initial height and allow field-sizing to grow with content. Use renderer-specific layout inputs to constrain width.',
    accessibility:
      'Use a visible label and linked correction guidance. Description IDs are deterministic and emitted only with real description content. Native disabled, read-only, invalid, form, rows, wrapping, and naming behavior is preserved.',
    examples: textareaExamples('tailwind'),
    stylexExamples: textareaExamples('stylex'),
    pleatExamples: textareaExamples('pleat'),
  },
})
