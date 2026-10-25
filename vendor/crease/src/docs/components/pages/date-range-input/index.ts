import { authoredPage } from '@/docs/components/pages/authored-page'
import { dateRangeInputExamples } from '@/docs/components/pages/date-range-input/shared'
import { dateRangeInputTailwindPreviewProgram } from '@/docs/components/pages/date-range-input/tailwind'

export const dateRangeInputPage = authoredPage({
  slug: 'date-range-input',
  title: 'Date Range Input',
  kind: 'submodel',
  previewProgram: dateRangeInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A date range picker with a button trigger that opens a calendar popover with optional preset ranges.',
    architecture:
      'Date Range Input is a foldkit submodel. The child Model owns the committed Option<Range>, the in-progress first click, and an embedded foldkit Calendar + Popover. The first day click sets a pending start and clamps the calendar to the span-cap window; the second click commits a normalized range, closes, and emits ChangedValue. Presets carry a getRange thunk evaluated at render and commit through ClickedPreset.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/date-range-input.ts',
    styling:
      'The trigger reuses the input-wrapper chrome: input border, 8px radius, inset border shadow at 30% on hover and the accent ring on focus-within. Preset buttons sit in a bordered sidebar; the applied preset carries aria-current and the accent fill.',
    accessibility:
      'The trigger is a real button with aria-haspopup=dialog, aria-expanded, and a labelled summary of the selection. Presets are a labelled group of buttons — the applied one carries aria-current; out-of-window presets stay visible but disabled. The calendar grid keeps grid semantics with a single roving tabindex.',
    keyboard: [
      ['Trigger', 'Opens the calendar popover; focus moves into the day grid.'],
      [
        'First day click',
        'Marks the pending start and clamps the span-cap window.',
      ],
      [
        'Second day click',
        'Commits the normalized range and closes the popover.',
      ],
      ['Escape', 'Closes the popover and discards a pending start.'],
      ['Clear button', 'Clears the range and emits ChangedValue(none).'],
    ],
    composition:
      'Parent Model\n├── DateRangeInput child Model (range + pendingStart + Calendar + Popover)\n├── presets evaluated at render (getRange)\n└── ChangedValue OutMessage → parent domain state\n    ├── min/max/disabled dates + span caps live on the Model (init or reflectConstraints)\n    └── presets outside the window render disabled, not hidden',
    examples: dateRangeInputExamples('tailwind'),
    stylexExamples: dateRangeInputExamples('stylex'),
    pleatExamples: dateRangeInputExamples('pleat'),
  },
})
