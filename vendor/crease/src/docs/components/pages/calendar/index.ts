import { authoredPage } from '@/docs/components/pages/authored-page'
import { calendarExamples } from '@/docs/components/pages/calendar/shared'
import { calendarTailwindPreviewProgram } from '@/docs/components/pages/calendar/tailwind'
export const calendarPage = authoredPage({
  slug: 'calendar',
  title: 'Calendar',
  kind: 'submodel',
  previewProgram: calendarTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A keyboard-accessible date grid with month and year navigation.',
    architecture:
      'Calendar owns navigation mode, focused date, and disabled-date rules. The parent owns the domain selection: update returns SelectedDate as an OutMessage, which the parent deliberately stores.',
    apiHref: 'https://foldkit.dev/ui/calendar',
    composition:
      'Parent Model\n├── selectedDate (domain state)\n└── Calendar Model\n    ├── days / months / years view\n    ├── focused date\n    └── navigation constraints',
    styling:
      'The renderer exposes a finite comfortable size for density changes. Keep day targets large enough to operate and let the submodel retain its date semantics.',
    accessibility:
      'The calendar is a labeled grid with roving focus. Today, the selected date, unavailable dates, and view-navigation controls remain programmatically distinguishable.',
    keyboard: [
      ['Arrow keys', 'Moves focus between dates.'],
      ['Page Up / Page Down', 'Moves to the previous or next month.'],
      ['Enter / Space', 'Selects the focused date and emits SelectedDate.'],
    ],
    examples: calendarExamples('tailwind'),
    stylexExamples: calendarExamples('stylex'),
    pleatExamples: calendarExamples('pleat'),
  },
})
