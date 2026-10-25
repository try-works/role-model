import { authoredPage } from '@/docs/components/pages/authored-page'
import { timeInputExamples } from '@/docs/components/pages/time-input/shared'
import { timeInputTailwindPreviewProgram } from '@/docs/components/pages/time-input/tailwind'

export const timeInputPage = authoredPage({
  slug: 'time-input',
  title: 'Time Input',
  kind: 'submodel',
  previewProgram: timeInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Styled time input with flexible typed entry or hour/minute selectors, 12h/24h formats, seconds, and min/max windows.',
    architecture:
      'Time Input is a submodel: its Model owns draft text and Foldkit Listbox interaction state while the parent owns the committed "HH:MM[:SS]" value. Both presentations report ChangedValue OutMessages upward.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/time-input.ts',
    styling:
      'Use presentation: "select" for styled hour and minute dropdowns, with optional seconds and AM/PM. The default presentation supports flexible typed entry. Both use Crease theme and status tokens.',
    accessibility:
      'Selector fields form a labelled group. Each segment is a named button opening a Foldkit listbox with arrow keys, typeahead, Home/End, Enter, and Escape. Typed fields have associated labels; invalid and disabled states are exposed to assistive technology.',
    examples: timeInputExamples('tailwind'),
    stylexExamples: timeInputExamples('stylex'),
    pleatExamples: timeInputExamples('pleat'),
  },
})
