import { authoredPage } from '@/docs/components/pages/authored-page'
import { transferListExamples } from '@/docs/components/pages/transfer-list/shared'
import { transferListTailwindPreviewProgram } from '@/docs/components/pages/transfer-list/tailwind'

export const transferListPage = authoredPage({
  slug: 'transfer-list',
  title: 'Transfer List',
  kind: 'submodel',
  previewProgram: transferListTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A controlled dual-panel collection input for choosing and ordering values — rows move between an available and a selected panel via buttons, full drag-and-drop, and keyboard reorder, with optional search, grouping, and per-option transfer and reorder locks.',
    architecture:
      'Transfer List is a submodel component. Its Model holds the controlled value array, the search query, a DragAndDrop child model, and the live-announcement text; the caller passes the full option catalog, maps ChangedTransferList out messages back into state, and lifts the exported document subscriptions onto the child model. Pointer drag, collision detection, keyboard moves, and edge auto-scroll run through the foldkit DragAndDrop primitive.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/transfer-list.ts',
    styling:
      'Panels split side by side in a 40rem container query and stack below it. Drop position is a primary-tinted rule between rows; the dragged row fades to half opacity. Group headings segment the available panel, and each panel is capped at 20rem of scrollable height.',
    accessibility:
      "The root is a labelled group containing two sub-groups, each with a hidden heading. Rows expose listitem semantics inside a list, every action is a labelled button, and a polite live region announces every transfer and reorder. Keyboard reorder: Space or Enter grabs a selected row, arrows move it, Space or Enter drops, Escape cancels. The document-level subscriptions the primitive needs are lifted from the component's subscriptions export.",
    keyboard: [
      ['Space / Enter', 'Grab or drop the focused row when reordering'],
      ['ArrowUp / ArrowDown', 'Move the grabbed row one position'],
      ['Escape', 'Cancel the reorder and restore the original order'],
    ],
    examples: transferListExamples('tailwind'),
    stylexExamples: transferListExamples('stylex'),
    pleatExamples: transferListExamples('pleat'),
  },
})
