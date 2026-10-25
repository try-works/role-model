import { authoredPage } from '@/docs/components/pages/authored-page'
import { dateInputExamples } from '@/docs/components/pages/date-input/shared'
import { dateInputTailwindPreviewProgram } from '@/docs/components/pages/date-input/tailwind'

export const dateInputPage = authoredPage({
  slug: 'date-input',
  title: 'Date Input',
  kind: 'submodel',
  previewProgram: dateInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A segmented date input with a calendar popover. Type a date in freeform text or pick one from the calendar.',
    architecture:
      'Date Input is a foldkit submodel. The child Model owns the committed Option<CalendarDate>, the pending text while editing, and an embedded foldkit DatePicker for the popover calendar. ChangedValue OutMessages carry the commit; reflect/reflectConstraints sync externally-derived values and min/max/disabled windows.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/date-input.ts',
    styling:
      'The wrapper follows the input-group chrome: input border, 8px radius, an inset border shadow at 30% on hover, and the accent ring on focus-within. Status variants tint the border and focus ring — error uses destructive, warning chart-4, success chart-2.',
    accessibility:
      'The input is a combobox: aria-haspopup=dialog, aria-expanded tracks the popover, and the calendar grid keeps grid semantics. Blur or Enter commits pending text; invalid input marks the field and announces "Invalid date" through a live region. The clear button is labelled and stays out of the tab order so Enter-to-submit forms are not interrupted.',
    keyboard: [
      [
        'Type',
        'Parses a freeform date — ISO, month-name, or numeric — and commits immediately when it resolves.',
      ],
      [
        'ArrowDown / Click',
        'Opens the calendar while focus stays in the input.',
      ],
      [
        'Enter',
        'Commits pending text; unparseable input marks the field invalid.',
      ],
      ['Escape', 'Closes the calendar and returns focus to the input.'],
      ['Clear button', 'Clears the value and emits ChangedValue(none).'],
    ],
    composition:
      'Parent Model\n├── DateInput child Model (value + pending text + embedded DatePicker)\n└── ChangedValue OutMessage → parent domain state\n    ├── min/max/disabled dates live on the embedded calendar (init or reflectConstraints)\n    └── format prop controls display of the committed value only',
    examples: dateInputExamples('tailwind'),
    stylexExamples: dateInputExamples('stylex'),
    pleatExamples: dateInputExamples('pleat'),
  },
})
