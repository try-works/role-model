import { authoredPage } from '@/docs/components/pages/authored-page'
import { notificationDefinition } from '@/docs/components/pages/notification-page'
import {
  toastConfig,
  toastExamples,
} from '@/docs/components/pages/toast/shared'
import { toastTailwindPreviewProgram } from '@/docs/components/pages/toast/tailwind'
const base = notificationDefinition(toastConfig)
export const toastPage = authoredPage({
  slug: 'toast',
  title: 'Toast',
  kind: 'submodel',
  previewProgram: toastTailwindPreviewProgram,
  definition: {
    ...base,
    examples: toastExamples('tailwind'),
    stylexExamples: toastExamples('stylex'),
    pleatExamples: toastExamples('pleat'),
  },
})
