import { authoredPage } from '@/docs/components/pages/authored-page'
import { attachmentExamples } from '@/docs/components/pages/attachment/shared'
import { attachmentTailwindPreviewProgram } from '@/docs/components/pages/attachment/tailwind'

export const attachmentPage = authoredPage({
  slug: 'attachment',
  title: 'Attachment',
  kind: 'helper',
  previewProgram: attachmentTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Displays a parent-owned file record with media, metadata, lifecycle state, and actions.',
    architecture:
      'Attachment is stateless Html composition. File input events, upload Effects, progress, retry, and removal belong to the parent Model/Message/update; pass the resulting domain state into the view helpers.',
    apiHref: 'https://foldkit.dev/guide/effects',
    composition:
      'Parent file/upload Model\n└── Attachment (derived state)\n    ├── media / preview\n    ├── content\n    │   ├── title\n    │   └── description / progress copy\n    └── actions → parent Messages',
    styling:
      'Use idle, uploading, processing, error, and done to reflect real domain state. Horizontal cards suit lists; vertical cards suit image grids; AttachmentGroup provides an overflow-safe strip.',
    accessibility:
      'Titles and descriptions remain readable text. Give icon-only actions an accessible label, preserve visible error copy, and do not communicate upload status through color alone.',
    keyboard: [
      ['Tab', 'Moves to attachment actions supplied by the parent.'],
      ['Enter / Space', 'Activates the focused parent action.'],
    ],
    examples: attachmentExamples('tailwind'),
    stylexExamples: attachmentExamples('stylex'),
    pleatExamples: attachmentExamples('pleat'),
  },
})
