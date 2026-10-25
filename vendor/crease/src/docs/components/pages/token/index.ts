import { authoredPage } from '@/docs/components/pages/authored-page'
import { tokenExamples } from '@/docs/components/pages/token/shared'
import { tokenTailwindPreviewProgram } from '@/docs/components/pages/token/tailwind'

export const tokenPage = authoredPage({
  slug: 'token',
  title: 'Token',
  kind: 'helper',
  previewProgram: tokenTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A compact pill/chip for a selected entity — the building block of multi-select fields, active filters, and tokenizers.',
    architecture:
      'Token is a stateless render helper in one of four shapes: static label, clickable (onClick), link (href), or removable (onRemove). `icon` takes a render function, `endContent` takes Html for a trailing badge.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/token.ts',
    accessibility:
      'The remove button stops propagation so the token’s own click/link is not triggered; `isLabelHidden` keeps the label as aria-label.',
    examples: tokenExamples('tailwind'),
    stylexExamples: tokenExamples('stylex'),
    pleatExamples: tokenExamples('pleat'),
  },
})
