import { authoredPage } from '@/docs/components/pages/authored-page'
import { linkExamples } from '@/docs/components/pages/link/shared'
import { linkTailwindPreviewProgram } from '@/docs/components/pages/link/tailwind'

export const linkPage = authoredPage({
  slug: 'link',
  title: 'Link',
  kind: 'helper',
  previewProgram: linkTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Inline and standalone hyperlinks with underline, external-link, and disabled variants.',
    architecture:
      'Link is a stateless render helper. The parent supplies href, underline, external-link, and color inputs per render; it returns Html directly. Optional tooltips use the Crease UI Tooltip model and messages supplied by the parent.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/link.ts',
    styling:
      'Inline links inherit surrounding text size; standalone links take the compact label size. Underlines appear on hover by default and can be pinned with the underlined variant (or hasUnderline for compatibility).',
    accessibility:
      'External links announce "(opens in new tab)" to screen readers and mark up noopener/noreferrer automatically. Disabled links are removed from the tab order. Tooltips are associated with the link through aria-describedby and appear on hover or keyboard focus.',
    keyboard: [
      ['Tab', 'Moves focus to and from the link.'],
      ['Enter', 'Activates the focused link.'],
      ['Escape', 'Dismisses the tooltip without moving focus.'],
    ],
    examples: linkExamples('tailwind'),
    stylexExamples: linkExamples('stylex'),
    pleatExamples: linkExamples('pleat'),
  },
})
