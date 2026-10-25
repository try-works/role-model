import { authoredPage } from '@/docs/components/pages/authored-page'
import { bannerExamples } from '@/docs/components/pages/banner/shared'
import { bannerTailwindPreviewProgram } from '@/docs/components/pages/banner/tailwind'

export const bannerPage = authoredPage({
  slug: 'banner',
  title: 'Banner',
  kind: 'submodel',
  previewProgram: bannerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A page-level notice for persistent messages — updates, confirmations, cautions, or problems — that can be dismissed and collapsed.',
    architecture:
      "Banner is a submodel: its Model tracks `isDismissed` and the collapsible panel's `isOpen`. The view renders a status-tinted header (icon, title, description, endContent, controls) plus an optional content region, and restores focus to the element that had it before the banner took it when dismissed.",
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/banner.ts',
    composition:
      'Parent Model\n├── Banner child Model(s)\n└── banner view\n    ├── status icon + title/description\n    ├── endContent actions, collapse toggle, dismiss button\n    └── optional collapsible children',
    styling:
      'Statuses tint the header at 20% of the status color and color the icon: info→primary, warning→chart-4, error→destructive, success→chart-2. `container="section"` removes radii for full-width page banners; `elevation` raises the card.',
    accessibility:
      'info/success render role="status"; warning/error render role="alert". Dismiss carries a label (`dismissLabel` or "Dismiss {title}"), the collapse toggle exposes aria-expanded/aria-controls only while the region is mounted, and dismiss returns focus to the previous focus origin.',
    keyboard: [
      [
        'Enter / Space',
        'Toggles the collapsible content or dismisses the banner.',
      ],
    ],
    examples: bannerExamples('tailwind'),
    stylexExamples: bannerExamples('stylex'),
    pleatExamples: bannerExamples('pleat'),
  },
})
