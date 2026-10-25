import { authoredPage } from '@/docs/components/pages/authored-page'
import { datePickerExamples } from '@/docs/components/pages/date-picker/shared'
import { datePickerTailwindPreviewProgram } from '@/docs/components/pages/date-picker/tailwind'

export const datePickerPage = authoredPage({
  slug: 'date-picker',
  title: 'Date Picker',
  kind: 'submodel',
  previewProgram: datePickerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Combines an anchored disclosure with Calendar to select a date.',
    architecture:
      'DatePicker is one nested child Model: its disclosure state contains a Calendar Model. The parent owns the committed date, text query, and parsing policy; focusDate synchronizes the child’s transient displayed month after valid typed or external updates.',
    apiHref: 'https://foldkit.dev/ui/date-picker',
    composition:
      'Parent Model\n├── selectedDate (domain state)\n└── DatePicker Model\n    ├── popover disclosure + positioning\n    └── Calendar Model\n        └── focus and navigation state',
    styling:
      'Trigger, panel, and calendar layout styles are separate view inputs. Preserve the compact trigger label and avoid constraining the panel below the calendar’s usable width.',
    accessibility:
      'Give the trigger a purpose-specific accessible name. Opening moves interaction into the date grid; selection closes the panel and returns the chosen value to the parent.',
    keyboard: [
      [
        'Enter / Space',
        'Opens the picker from its trigger or selects the focused date.',
      ],
      ['Arrow keys', 'Moves through dates inside the calendar.'],
      ['Escape', 'Closes the panel and restores trigger focus.'],
    ],
    examples: datePickerExamples('tailwind'),
    stylexExamples: datePickerExamples('stylex'),
    pleatExamples: datePickerExamples('pleat'),
  },
})
