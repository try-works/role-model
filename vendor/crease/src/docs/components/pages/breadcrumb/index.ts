import { authoredPage } from '@/docs/components/pages/authored-page'
import { breadcrumbExamples } from '@/docs/components/pages/breadcrumb/shared'
import { breadcrumbTailwindPreviewProgram } from '@/docs/components/pages/breadcrumb/tailwind'

export const breadcrumbPage = authoredPage({
  slug: 'breadcrumb',
  title: 'Breadcrumb',
  kind: 'recipe',
  previewProgram: breadcrumbTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Renders parent-supplied route data as a named navigation landmark and semantic ordered trail.',
    architecture:
      'Breadcrumb owns no Model or route state. Typed link, current-page, and ellipsis values are per-render inputs; collapseBreadcrumbItems deterministically replaces only omitted middle ancestors.',
    apiHref: 'https://foldkit.dev/ui/link',
    composition:
      'nav[aria-label]\n└── ol\n    ├── li → ancestor link\n    ├── presentational separator\n    ├── optional accessible ellipsis\n    └── li → current-page text[aria-current=page]',
    styling:
      'Long labels wrap without widening the viewport. Collapse middle ancestors with maxItems before the trail becomes unreadable; the RTL direction mirrors only the default chevron.',
    accessibility:
      'The nav landmark is explicitly named, the trail is an ordered list, separators are hidden, omitted levels have accessible text, and the current page is text with aria-current rather than a fake disabled link.',
    keyboard: [
      ['Tab / Shift+Tab', 'Moves through ancestor links in document order.'],
      ['Enter', 'Follows the focused ancestor link.'],
    ],
    examples: breadcrumbExamples('tailwind'),
    stylexExamples: breadcrumbExamples('stylex'),
    pleatExamples: breadcrumbExamples('pleat'),
  },
})
