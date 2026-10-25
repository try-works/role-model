import { authoredPage } from '@/docs/components/pages/authored-page'
import { paginationExamples } from '@/docs/components/pages/pagination/shared'
import { paginationTailwindPreviewProgram } from '@/docs/components/pages/pagination/tailwind'
export const paginationPage = authoredPage({
  slug: 'pagination',
  title: 'Pagination',
  kind: 'recipe',
  previewProgram: paginationTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'A parent-controlled page recipe with addressable link and in-place action policies.',
    architecture:
      'The parent or router owns the current page and URL. The shared helper only normalizes finite boundary/sibling counts and derives a per-render page window; it stores no hidden navigation state.',
    apiHref: 'https://foldkit.dev/ui/link',
    composition:
      'nav[aria-label]\n└── ul\n    ├── disabled boundary or previous control\n    ├── page links/buttons and inert ellipses\n    └── disabled boundary or next control',
    styling:
      'Use siblingCount=0 for the smallest viewport neighborhood. Ellipses describe omitted ranges and are never interactive.',
    accessibility:
      'Addressable destinations are anchors; in-place updates are native buttons. The current control exposes aria-current=page and an explicit current-page name. Disabled boundaries are native disabled buttons or non-focusable aria-disabled link semantics.',
    keyboard: [
      [
        'Tab / Shift+Tab',
        'Moves only through available links or action buttons; disabled boundaries are skipped.',
      ],
      [
        'Enter',
        'Follows an addressable page link or activates an in-place page button.',
      ],
      ['Space', 'Activates an in-place page button.'],
    ],
    examples: paginationExamples('tailwind'),
    stylexExamples: paginationExamples('stylex'),
    pleatExamples: paginationExamples('pleat'),
  },
})
