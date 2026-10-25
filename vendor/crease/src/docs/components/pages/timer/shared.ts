import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type TimerFixture = Readonly<{
  title: string
  description: string
  layout: 'showcase' | 'formats' | 'inline' | 'typography'
  /** Milliseconds before now at which the timers started. */
  offsetMs: number
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Timer/*.tsx —
   same demos, same start offsets, names from the *.doc.mjs files.
   astryx's <Text>/<Stack> scaffolds map onto inline utility classes since
   the Text/Stack ports live on a sibling branch. */
export const timerFixtures: Readonly<[TimerFixture, ...Array<TimerFixture>]> = [
  {
    title: 'Timer',
    description:
      'A live processing readout with the same start time rendered in elapsed and clock formats.',
    layout: 'showcase',
    offsetMs: 3_753_000,
  },
  {
    title: 'Timer — Formats',
    description:
      'Elapsed compact units and stopwatch clock notation shown from the same start time.',
    layout: 'formats',
    offsetMs: 3_753_000,
  },
  {
    title: 'Timer — Inline',
    description:
      'A Timer composed into status copy while inheriting the surrounding typography.',
    layout: 'inline',
    offsetMs: 0,
  },
  {
    title: 'Timer — Typography',
    description:
      'Timer using its Timestamp-matched default typography and an emphasized override.',
    layout: 'typography',
    offsetMs: 128_000,
  },
]

const timerSource = (
  fixture: TimerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const hasClock = fixture.layout === 'showcase' || fixture.layout === 'formats'
  const supporting = (text: string): string =>
    isStyleX
      ? `h.span([h.Class(className(styles.supporting))], ['${text}'])`
      : `h.span([h.Class('text-xs leading-5 text-muted-foreground')], ['${text}'])`
  const cls = (twClasses: string, stylexKey: string): string =>
    isStyleX
      ? `h.Class(className(styles.${stylexKey}))`
      : `h.Class('${twClasses}')`

  const emphasizedCall = (modelField: string): string => `Timer.timer(
            {
              model: model.${modelField},
              type: 'body',
              size: 'xl',
              color: 'primary',
              weight: 'semibold',
            },
            h,
          )`

  const viewBody = (() => {
    switch (fixture.layout) {
      case 'showcase':
        return `h.div(
    [${cls('flex flex-col gap-4', 'page')}],
    [
      h.span([${cls('text-[17px] leading-6 font-semibold', 'large')}], ['Processing']),
      h.div(
        [${cls('flex items-center gap-6', 'row')}],
        [
          h.div(
            [${cls('flex flex-col gap-1', 'column')}],
            [
              ${supporting('Elapsed')},
              ${emphasizedCall('timer')},
            ],
          ),
          h.div(
            [${cls('flex flex-col gap-1', 'column')}],
            [
              ${supporting('Clock')},
              ${emphasizedCall('clock')},
            ],
          ),
        ],
      ),
    ],
  )`
      case 'formats':
        return `h.div(
    [${cls('flex flex-col gap-3', 'page')}],
    [
      h.div(
        [${cls('flex items-center gap-3', 'labelRow')}],
        [
          ${supporting('Elapsed')},
          Timer.timer({ model: model.timer, type: 'body', color: 'primary' }, h),
        ],
      ),
      h.div(
        [${cls('flex items-center gap-3', 'labelRow')}],
        [
          ${supporting('Clock')},
          Timer.timer({ model: model.clock, type: 'body', color: 'primary' }, h),
        ],
      ),
    ],
  )`
      case 'inline':
        return `h.p(
    [${cls('text-sm leading-5 text-foreground', 'body')}],
    [
      'Processing for ',
      Timer.timer({ model: model.timer, type: 'inherit', color: 'inherit' }, h),
    ],
  )`
      case 'typography':
        return `h.div(
    [${cls('flex flex-col gap-3', 'page')}],
    [
      ${supporting('Default')},
      Timer.timer({ model: model.timer }, h),
      ${supporting('Emphasized')},
      ${emphasizedCall('timer')},
    ],
  )`
    }
  })()

  return foldkitApplication({
    title: `Timer — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
import * as Timer from '@/stylex/timer'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  page: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  row: { alignItems: 'center', display: 'flex', gap: '1.5rem' },
  column: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  labelRow: { alignItems: 'center', display: 'flex', gap: '0.75rem' },
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1.25rem' },
  large: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: '1.5rem' },
  body: { color: 'var(--foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },
})`
    : `import * as Timer from '@/ui/timer'`
}`,
    model: `export const Model = S.Struct({
  timer: Timer.Model,${
    hasClock
      ? `
  clock: Timer.Model,`
      : ''
  }
})
export type Model = typeof Model.Type`,
    messages: `export const GotTimerMessage = taggedStruct('GotTimerMessage', {
  message: Timer.Message,
})${
      hasClock
        ? `
export const GotClockMessage = taggedStruct('GotClockMessage', {
  message: Timer.Message,
})`
        : ''
    }
export const Message = S.Union([GotTimerMessage${hasClock ? ', GotClockMessage' : ''}])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    timer: Timer.init({
      id: 'timer',
      startTimeMs: Date.now() - ${String(fixture.offsetMs)},
    }),${
      hasClock
        ? `
    clock: Timer.init({
      id: 'clock',
      startTimeMs: Date.now() - ${String(fixture.offsetMs)},
      format: 'clock',
    }),`
        : ''
    }
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTimerMessage': {
      const next = Timer.update(model.timer, message.message)
      return {
        model: { ...model, timer: next.model },
        commands: Command.mapMessages(next.commands ?? [], inner =>
          GotTimerMessage({ message: inner })),
      }
    }${
      hasClock
        ? `
    case 'GotClockMessage': {
      const next = Timer.update(model.clock, message.message)
      return {
        model: { ...model, clock: next.model },
        commands: Command.mapMessages(next.commands ?? [], inner =>
          GotClockMessage({ message: inner })),
      }
    }`
        : ''
    }
  }
}`,
    subscriptions: `export const subscriptions = Subscription.aggregate<Model, Message>()(
  {
    timerTick: Subscription.lift(Timer.subscriptions)<Model, Message>({
      toChildModel: model => model.timer,
      toParentMessage: message => GotTimerMessage({ message }),
    }).tick,${
      hasClock
        ? `
    clockTick: Subscription.lift(Timer.subscriptions)<Model, Message>({
      toChildModel: model => model.clock,
      toParentMessage: message => GotClockMessage({ message }),
    }).tick,`
        : ''
    }
  },
)`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main(
    [h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      ${viewBody.split('\n').join('\n      ')},
    ],
  ),
})`,
  })
}

const timerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  timerFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: timerSource(fixture, renderer),
  }))

export const timerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, timerExamplesFor(renderer))
