import { authoredPage } from '@/docs/components/pages/authored-page'
import { comboboxExamples } from '@/docs/components/pages/combobox/shared'
import { comboboxTailwindPreviewProgram } from '@/docs/components/pages/combobox/tailwind'

export const comboboxPage = authoredPage({
  slug: 'combobox',
  title: 'Combobox',
  kind: 'submodel',
  previewProgram: comboboxTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Combines a searchable text input with a typed single-selection popup.',
    architecture:
      'Bind the value union once with Combobox.create<Value>(). The child Model owns query, active option, disclosure, and anchor state. The parent stores Option<FrameworkValue> plus remote request identity and results, derives the resting label, consumes typed Selected/Cleared OutMessages, and maps returned Commands.',
    apiHref: 'https://foldkit.dev/ui/combobox',
    composition:
      'Parent Model\n├── Combobox child Model (query + disclosure)\n├── selected domain Option\n└── projected domain items\n    ├── unique value\n    ├── display/search label\n    └── optional group / disabled state',
    styling:
      'Filtering is derived from the current child input value and item search text. Keep stable unique values separate from localized display labels.',
    accessibility:
      'The primitive manages combobox, listbox, active-descendant, disabled/read-only, and option semantics. Supply ariaLabel or ariaLabelledBy, announce loading/no-results beside the control, and use formName when the committed value participates in native submission.',
    keyboard: [
      ['Type', 'Filters the projected item list.'],
      ['Arrow Up / Down', 'Moves the active option.'],
      ['Enter', 'Emits Selected and closes the popup.'],
      ['Escape', 'Closes without replacing the stored domain selection.'],
    ],
    examples: comboboxExamples('tailwind'),
    stylexExamples: comboboxExamples('stylex'),
    pleatExamples: comboboxExamples('pleat'),
  },
})
