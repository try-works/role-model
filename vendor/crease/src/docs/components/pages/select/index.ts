import { authoredPage } from '@/docs/components/pages/authored-page'
import { selectExamples } from '@/docs/components/pages/select/shared'
import { selectTailwindPreviewProgram } from '@/docs/components/pages/select/tailwind'

export const selectPage = authoredPage({
  slug: 'select',
  title: 'Select',
  kind: 'submodel',
  previewProgram: selectTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Lets a user choose one typed value from a disclosure listbox.',
    architecture:
      'Select wraps Foldkit’s Listbox child Model. Bind the domain value union once with Select.create<Value>(); the child owns disclosure, active item, typeahead, and focus while the parent owns the selected Option and persists typed Selected or Cleared OutMessages.',
    apiHref: 'https://foldkit.dev/ui/listbox',
    composition:
      'Parent Model\n├── Select child Model (open, active item, search)\n├── selected Option<Value>\n└── anchored listbox view\n    ├── trigger / selected label\n    └── options, groups, separators',
    styling:
      'Project domain items through stable, unique string values. Grouping is optional view data and does not alter the parent update contract.',
    accessibility:
      'The primitive supplies listbox/option semantics, active-descendant navigation, typeahead, disabled and read-only states, trigger relationships, and a named hidden form value. Always provide a visible label or ariaLabel; direction mirrors horizontal positioning in RTL subtrees.',
    keyboard: [
      ['Enter / Space', 'Opens the listbox and commits the active option.'],
      ['Arrow Up / Down', 'Moves the active option.'],
      ['Home / End', 'Moves to the first or last enabled option.'],
      ['Escape', 'Closes without changing the stored selection.'],
    ],
    examples: selectExamples('tailwind'),
    stylexExamples: selectExamples('stylex'),
    pleatExamples: selectExamples('pleat'),
  },
})
