import { authoredPage } from '@/docs/components/pages/authored-page'
import { alertExamples } from '@/docs/components/pages/alert/shared'
import { alertTailwindPreviewProgram } from '@/docs/components/pages/alert/tailwind'

export const alertPage = authoredPage({
  slug: 'alert',
  title: 'Alert',
  kind: 'helper',
  previewProgram: alertTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Presents per-render feedback with explicit severity and announcement policy.',
    architecture:
      'Alert owns no Model. Severity, icon, title, description, and whether new content should be static, politely announced, or assertively announced are required per-render decisions.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition:
      'Alert[severity, announcement]\n├── AlertIcon (decorative)\n├── AlertTitle\n└── AlertDescription',
    styling:
      'Semantic info, success, warning, and error tones share one two-column icon/content grid. Titles are not truncated, and long descriptions wrap within the container.',
    accessibility:
      'announcement="static" adds no live-region role. "status" maps to polite status semantics for non-urgent updates. "alert" maps to assertive alert semantics and is reserved for urgent failures.',
    examples: alertExamples('tailwind'),
    stylexExamples: alertExamples('stylex'),
    pleatExamples: alertExamples('pleat'),
  },
})
