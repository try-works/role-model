import { authoredPage } from '@/docs/components/pages/authored-page'
import { itemExamples } from '@/docs/components/pages/item/shared'
import { itemTailwindPreviewProgram } from '@/docs/components/pages/item/tailwind'

export const itemPage = authoredPage({
  slug: 'item',
  title: 'Item',
  kind: 'helper',
  previewProgram: itemTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Composes media, copy, metadata, and actions into a reusable list item.',
    architecture:
      'Item is a stateless composition helper. Collections and selection state remain in the parent Model and are mapped to item views.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition:
      'ItemGroup\n├── Item → ItemMedia / ItemContent / ItemActions\n│           └── ItemTitle / ItemDescription\n└── ItemSeparator',
    styling:
      'Use li inside semantic collections and article for standalone feed entries. Variants change surface emphasis without changing document meaning.',
    accessibility:
      'ItemGroup supplies list and list-item semantics; a standalone Item keeps its native element semantics. Preserve a useful title even when media is decorative.',
    examples: itemExamples('tailwind'),
    stylexExamples: itemExamples('stylex'),
    pleatExamples: itemExamples('pleat'),
  },
})
