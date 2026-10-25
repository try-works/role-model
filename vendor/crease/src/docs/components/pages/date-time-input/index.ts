import { authoredPage } from '@/docs/components/pages/authored-page'
import { dateTimeInputExamples } from '@/docs/components/pages/date-time-input/shared'
import { dateTimeInputTailwindPreviewProgram } from '@/docs/components/pages/date-time-input/tailwind'

export const dateTimeInputPage = authoredPage({
  slug: 'date-time-input',
  title: 'Date Time Input',
  kind: 'submodel',
  previewProgram: dateTimeInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A combined date and time picker: a typed date input with a calendar popover beside a typed time input.',
    architecture:
      "Date Time Input is a foldkit submodel owning one {date, time} value, the date half's typed text + embedded DatePicker, the time half's typed text + optional preset-time Popover, and per-half invalid flags. A commit only emits ChangedValue once both halves exist — a date pick with no time fills from the wall clock and clamps same-day min/max bounds.",
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/date-time-input.ts',
    styling:
      'Both segments reuse the input-wrapper chrome on a flex-wrap row with a 196px flex basis each — narrower fields wrap the time half onto its own line, to fit the available space. The time listbox mirrors selector option padding with aria-selected weight.',
    accessibility:
      'The date input is a combobox with aria-haspopup=dialog; the time input gains combobox semantics only when timeOptionInterval opts the listbox in. Each half has its own assertive live region announcing rejected typed input, and the label stays a single accessible name over the pair.',
    keyboard: [
      ['Trigger button or Alt+Down', 'Opens the calendar popover.'],
      [
        'Calendar day click',
        'Commits the date (filling time if empty) and closes.',
      ],
      [
        'ArrowUp / ArrowDown (time half)',
        'Steps the committed time by timeIncrementMinutes.',
      ],
      [
        'Enter / Tab / blur',
        'Commits typed text; invalid entries revert and mark the half.',
      ],
      ['Escape', 'Closes the open popover without committing.'],
    ],
    composition:
      'Parent Model\n├── DateTimeInput child Model ({date, time} + two embedded Popovers + DatePicker)\n├── timeOptionInterval → listbox of preset times\n└── ChangedValue OutMessage → parent domain state',
    examples: dateTimeInputExamples('tailwind'),
    stylexExamples: dateTimeInputExamples('stylex'),
    pleatExamples: dateTimeInputExamples('pleat'),
  },
})
