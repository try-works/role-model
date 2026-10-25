import { authoredPage } from '@/docs/components/pages/authored-page'
import { timerExamples } from '@/docs/components/pages/timer/shared'
import { timerTailwindPreviewProgram } from '@/docs/components/pages/timer/tailwind'

export const timerPage = authoredPage({
  slug: 'timer',
  title: 'Timer',
  kind: 'submodel',
  previewProgram: timerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A live elapsed duration rendered as a <time> element. Use `elapsed` for compact units ("2m 14s") or `clock` for a stopwatch reading.',
    architecture:
      'Timer is a submodel component. Its Model holds the start time, format, and current clock (nowMs). Compose the tick subscription via Subscription.lift — it emits one TickedTimer at the exact moment the rendered text changes, ticking once a second under an hour and once a minute in the hour-plus compact mode.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/timer.ts',
    styling:
      "The <time> element inherits font styling through CreaseUI's text type scale: `type` picks a preset (supporting by default), `size` overrides only the font size, and `color`/`weight` tune ink and weight. Tabular numerals keep digits aligned while values change.",
    accessibility:
      'Renders a semantic <time> element whose dateTime attribute carries the ISO 8601 duration (PT{S}S). The visible text and dateTime update together on each tick.',
    examples: timerExamples('tailwind'),
    stylexExamples: timerExamples('stylex'),
    pleatExamples: timerExamples('pleat'),
  },
})
