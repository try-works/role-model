import { authoredPage } from '@/docs/components/pages/authored-page'
import { multiSelectorExamples } from '@/docs/components/pages/multi-selector/shared'
import { multiSelectorTailwindPreviewProgram } from '@/docs/components/pages/multi-selector/tailwind'

export const multiSelectorPage = authoredPage({
  slug: 'multi-selector',
  title: 'Multi Selector',
  kind: 'submodel',
  previewProgram: multiSelectorTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A multi-select field whose trigger summarizes the selection as a count, comma-separated labels, or badges, with checkbox options (optionally sectioned) in an anchored popover or a bottom drawer.',
    architecture:
      'Multi Selector is a foldkit submodel. The child Model owns the committed value array plus an embedded foldkit Multi listbox for navigation and an optional searchable Popover or bottom Drawer; ChangedValues OutMessages carry each toggle. reflect/reflectOptions sync external selections and the select-all option set.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/multi-selector.ts',
    styling:
      'The trigger follows the input-group chrome (border, 8px radius, inset ring on hover/focus-visible); the ghost variant drops the border for toolbars and presses to scale(0.98). Options render a 4px-radius checkbox box that fills primary when selected, matching the checkbox primitive.',
    accessibility:
      'The trigger is a real button owning an anchored listbox — arrow keys navigate options and Enter toggles them. The select-all row exposes a tri-state checkbox, and the trigger keeps aria-invalid / described-by wiring for status messages.',
    keyboard: [
      ['Click / Enter / Space', 'Opens the anchored option panel.'],
      [
        'ArrowUp / ArrowDown',
        'Moves the active option without changing the selection.',
      ],
      ['Enter', 'Toggles the active option; the panel stays open.'],
      [
        'Type',
        'The search field filters option labels; plain lists support typeahead.',
      ],
      ['Escape', 'Closes the panel and returns focus to the trigger.'],
    ],
    composition:
      'Parent Model\n├── MultiSelector child Model (values + embedded Multi listbox)\n└── ChangedValues OutMessage → parent domain state\n    ├── hasSelectAll inserts a pseudo-option toggling the option set\n    ├── options accept flat entries or { title, options } sections\n    └── triggerDisplay renders count / labels / badges in the trigger',
    examples: multiSelectorExamples('tailwind'),
    stylexExamples: multiSelectorExamples('stylex'),
    pleatExamples: multiSelectorExamples('pleat'),
  },
})
