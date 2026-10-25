import { authoredPage } from '@/docs/components/pages/authored-page'
import { listInputExamples } from '@/docs/components/pages/list-input/shared'
import { listInputTailwindPreviewProgram } from '@/docs/components/pages/list-input/tailwind'

export const listInputPage = authoredPage({
  slug: 'list-input',
  title: 'List Input',
  kind: 'submodel',
  previewProgram: listInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A compact, ordered collection editor: typed columns per record, add/remove actions, keyboard reordering, and item/field/list validation.',
    architecture:
      'List Input is a submodel: its Model owns reorder state and announcements while the parent Model owns the record list. Changes report ItemAdded/ItemRemoved/ItemUpdated/ItemReordered OutMessages upward.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/list-input.ts',
    styling:
      'Rows render as a grid (fields + remove + reorder); under 640px columns stack and the actions move to the first row. The Add button fills the row.',
    accessibility:
      'role=list rows carry posinset/setsize; reorder is a labelled toggle button with arrow-key moves and a grabbed/dropped live announcement stream.',
    examples: listInputExamples('tailwind'),
    stylexExamples: listInputExamples('stylex'),
    pleatExamples: listInputExamples('pleat'),
  },
})
