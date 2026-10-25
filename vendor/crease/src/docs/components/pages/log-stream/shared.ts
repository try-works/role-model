import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type LogFixtureEntry = Readonly<{
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source?: string
  message: string
  /** Rendered inside a <pre> in the expanded detail panel. */
  detailText?: string
}>

export type LogStreamFixture = Readonly<{
  title: string
  description: string
  variant: 'default' | 'terminal'
  maxHeight: number
  entries: ReadonlyArray<LogFixtureEntry>
  /** 'follow' shows astryx's controlled append/reset toolbar. */
  layout: 'terminal' | 'monitoring' | 'follow'
}>

/* astryx ships no example blocks for LogStream — these fixtures are derived
   from apps/storybook/stories/LogStream.stories.tsx (TerminalBuild,
   MonitoringRows, ControlledFollow) and keep the stories' entries verbatim. */
export const logStreamFixtures: Readonly<
  [LogStreamFixture, ...Array<LogStreamFixture>]
> = [
  {
    title: 'Build logs',
    description:
      'A fixed-dark terminal surface tailing a build pipeline with a warning row expandable to its compiler output.',
    variant: 'terminal',
    maxHeight: 360,
    layout: 'terminal',
    entries: [
      {
        id: 'b-01',
        timestamp: '12:04:16.002',
        level: 'info',
        source: 'build',
        message: 'Build machine: 4 cores, 8 GB RAM (iad1)',
      },
      {
        id: 'b-02',
        timestamp: '12:04:16.089',
        level: 'info',
        source: 'build',
        message: 'Cloning github.com/acme/creaseui-console (branch: main)',
      },
      {
        id: 'b-03',
        timestamp: '12:04:18.021',
        level: 'info',
        source: 'stage',
        message: 'Install',
      },
      {
        id: 'b-04',
        timestamp: '12:04:18.144',
        level: 'info',
        source: 'install',
        message: '$ pnpm install --frozen-lockfile',
      },
      {
        id: 'b-05',
        timestamp: '12:04:23.348',
        level: 'info',
        source: 'build',
        message: '$ vite build',
      },
      {
        id: 'b-06',
        timestamp: '12:04:38.207',
        level: 'warn',
        source: 'build',
        message: 'Compiled with warnings (1)',
        detailText:
          './src/pages/logs.ts\n42:9 Warning: "range" is assigned a value but never used.',
      },
      {
        id: 'b-07',
        timestamp: '12:04:45.201',
        level: 'info',
        source: 'deploy',
        message: 'Uploading build outputs (23.4 MB)',
      },
      {
        id: 'b-08',
        timestamp: '12:04:50.004',
        level: 'info',
        source: 'deploy',
        message: 'Build completed in 34s',
      },
    ],
  },
  {
    title: 'Log results',
    description:
      'Theme-surface monitoring rows with per-level accents and expandable warning and error details.',
    variant: 'default',
    maxHeight: 360,
    layout: 'monitoring',
    entries: [
      {
        id: 'l-01',
        timestamp: '14:02:08.114',
        level: 'info',
        source: 'api-gateway',
        message: 'GET /v1/projects 200 in 42ms',
      },
      {
        id: 'l-02',
        timestamp: '14:02:08.371',
        level: 'debug',
        source: 'auth',
        message: 'token cache hit for key sess_7f31',
      },
      {
        id: 'l-03',
        timestamp: '14:02:09.243',
        level: 'warn',
        source: 'billing',
        message: 'upstream latency 1840ms exceeds 1500ms budget',
        detailText:
          '{\n  "upstream": "payments.stripe",\n  "latencyMs": 1840,\n  "budgetMs": 1500,\n  "traceId": "tr_9c41b2"\n}',
      },
      {
        id: 'l-04',
        timestamp: '14:02:10.037',
        level: 'error',
        source: 'billing',
        message: 'charge failed: upstream returned 502',
        detailText:
          '{\n  "error": "UpstreamBadGateway",\n  "attempt": 1,\n  "retryInMs": 400,\n  "invoice": "inv_20418"\n}',
      },
      {
        id: 'l-05',
        timestamp: '14:02:11.305',
        level: 'info',
        source: 'billing',
        message: 'charge succeeded for inv_20418 in 322ms',
      },
      {
        id: 'l-06',
        timestamp: '14:02:13.078',
        level: 'debug',
        source: 'api-gateway',
        message: 'route table reloaded (37 routes)',
      },
    ],
  },
  {
    title: 'Controlled follow',
    description:
      'Follow-pinned tailing with an append/reset toolbar; scrolling away pauses the pin and reveals Jump to latest.',
    variant: 'default',
    maxHeight: 320,
    layout: 'follow',
    entries: [
      {
        id: 'l-01',
        timestamp: '14:02:08.114',
        level: 'info',
        source: 'api-gateway',
        message: 'GET /v1/projects 200 in 42ms',
      },
      {
        id: 'l-02',
        timestamp: '14:02:08.371',
        level: 'debug',
        source: 'auth',
        message: 'token cache hit for key sess_7f31',
      },
      {
        id: 'l-03',
        timestamp: '14:02:09.243',
        level: 'warn',
        source: 'billing',
        message: 'upstream latency 1840ms exceeds 1500ms budget',
        detailText:
          '{\n  "upstream": "payments.stripe",\n  "latencyMs": 1840,\n  "budgetMs": 1500,\n  "traceId": "tr_9c41b2"\n}',
      },
      {
        id: 'l-04',
        timestamp: '14:02:10.037',
        level: 'error',
        source: 'billing',
        message: 'charge failed: upstream returned 502',
        detailText:
          '{\n  "error": "UpstreamBadGateway",\n  "attempt": 1,\n  "retryInMs": 400,\n  "invoice": "inv_20418"\n}',
      },
      {
        id: 'l-05',
        timestamp: '14:02:11.305',
        level: 'info',
        source: 'billing',
        message: 'charge succeeded for inv_20418 in 322ms',
      },
      {
        id: 'l-06',
        timestamp: '14:02:13.078',
        level: 'debug',
        source: 'api-gateway',
        message: 'route table reloaded (37 routes)',
      },
    ],
  },
]

/** Entries appended by the Controlled follow toolbar (astryx liveScript). */
export const logStreamLiveScript: ReadonlyArray<Omit<LogFixtureEntry, 'id'>> = [
  {
    timestamp: '14:02:14.102',
    level: 'info',
    source: 'api-gateway',
    message: 'GET /v1/projects 200 in 38ms',
  },
  {
    timestamp: '14:02:15.310',
    level: 'debug',
    source: 'auth',
    message: 'token cache hit for key sess_9a02',
  },
  {
    timestamp: '14:02:17.708',
    level: 'warn',
    source: 'billing',
    message: 'webhook delivery slow: 2210ms to partner.acme',
  },
  {
    timestamp: '14:02:20.131',
    level: 'error',
    source: 'worker',
    message: 'job usage-rollup-0415 failed: table locked',
  },
]

const logStreamSource = (
  fixture: LogStreamFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const ns = renderer === 'stylex' ? 'LogStreamStyleX' : 'LogStream'
  const entriesLiteral = JSON.stringify(
    fixture.entries.map(({ detailText: _detailText, ...entry }) => entry),
    null,
    2,
  )
    .replace(/"([^"]+)":/g, '$1:')
    .split('\n')
    .join('\n  ')

  const detailProp = fixture.entries.some(
    entry => entry.detailText !== undefined,
  )
    ? `
/* Render each detail body as Foldkit Html using h.pre([], [detailText]). */`
    : ''

  const streamCall = `${ns}.logStream(
      {
        model: model.stream,
        toParentMessage: message => GotStreamMessage({ message }),
        entries: entries(model.entries, h),
        variant: '${fixture.variant}',
        maxHeight: ${String(fixture.maxHeight)},${
          fixture.layout === 'follow'
            ? `
        label: 'Live log stream',`
            : `
        label: '${fixture.title === 'Build logs' ? 'Build logs' : 'Log results stream'}',`
        }
      },
      h,
    )`

  const isFollow = fixture.layout === 'follow'
  const toolbar = isFollow
    ? `h.div(
        [h.Class('flex items-center gap-2')],
        [
          StatusDot.statusDot(
            { variant: model.stream.scroller.isFollowing ? 'success' : 'neutral', label: model.stream.scroller.isFollowing ? 'Following latest' : 'Not following' },
            h,
          ),
          h.span(
            [h.Class('flex-1 text-xs leading-5 text-muted-foreground')],
            [\`\${String(model.entries.length)} rows\`],
          ),
          Button.button(
            {
              variant: 'secondary',
              children: ['Append line'],
              isDisabled: model.entries.length - BASE_ENTRY_COUNT >= LIVE_SCRIPT.length,
              onClick: ClickedAppend(),
            },
            h,
          ),
          Button.button(
            {
              variant: 'ghost',
              children: ['Reset'],
              onClick: ClickedReset(),
            },
            h,
          ),
        ],
      ),
      `
    : ''

  return foldkitApplication({
    title: `Log Stream — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
import * as ${ns} from '@/${isStyleX ? 'stylex' : 'ui'}/log-stream'
import * as Button from '@/${isStyleX ? 'stylex' : 'ui'}/button'
import * as StatusDot from '@/${isStyleX ? 'stylex' : 'ui'}/status-dot'`,
    model: `const LogEntry = S.Struct({
  id: S.String,
  timestamp: S.String,
  level: S.Literals(['info', 'warn', 'error', 'debug']),
  source: S.optional(S.String),
  message: S.String,
  detailText: S.optional(S.String),
})
export type LogEntry = typeof LogEntry.Type

export const Model = S.Struct({
  stream: ${ns}.Model,
  entries: S.Array(LogEntry),
})
export type Model = typeof Model.Type`,
    messages: `export const GotStreamMessage = taggedStruct('GotStreamMessage', {
  message: ${ns}.Message,
})${
      isFollow
        ? `
export const ClickedAppend = taggedStruct('ClickedAppend', {})
export const ClickedReset = taggedStruct('ClickedReset', {})`
        : ''
    }
export const Message = S.Union([GotStreamMessage${
      isFollow ? ', ClickedAppend, ClickedReset' : ''
    }])
export type Message = typeof Message.Type`,
    init: `const BASE_ENTRIES: ReadonlyArray<LogEntry> = ${entriesLiteral}${
      isFollow
        ? `

const BASE_ENTRY_COUNT = BASE_ENTRIES.length

const LIVE_SCRIPT: ReadonlyArray<Omit<LogEntry, 'id'>> = ${JSON.stringify(
            logStreamLiveScript,
            null,
            2,
          )
            .replace(/"([^"]+)":/g, '$1:')
            .split('\n')
            .join('\n  ')}`
        : ''
    }${detailProp}

const entries = (
  rows: ReadonlyArray<LogEntry>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<${ns}.LogEntry> =>
  rows.map(row => {
    const { detailText } = row
    return {
      id: row.id,
      timestamp: row.timestamp,
      level: row.level,
      message: row.message,
      ...(row.source === undefined ? {} : { source: row.source }),
      ...(detailText === undefined
        ? {}
        : {
            detail: h.pre(
              [h.Class('m-0 whitespace-pre-wrap font-mono text-sm leading-[1.7]')],
              [detailText],
            ),
          }),
    }
  })

export const init = (): Update.Return<Model, Message> => ({
  model: {
    stream: ${ns}.init({
      id: 'log-stream',${
        isFollow
          ? `
      isFollowing: true,`
          : ''
      }
    }),
    entries: BASE_ENTRIES,
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotStreamMessage': {
      const next = ${ns}.update(model.stream, message.message)
      return {
        model: { ...model, stream: next.model },
        commands: Command.mapMessages(next.commands ?? [], inner =>
          GotStreamMessage({ message: inner })),
      }
    }${
      isFollow
        ? `
    case 'ClickedAppend': {
      const nextIndex = model.entries.length - BASE_ENTRY_COUNT
      const nextLine = LIVE_SCRIPT[nextIndex]
      if (nextLine === undefined) {
        return { model }
      }
      return {
        model: {
          ...model,
          entries: [
            ...model.entries,
            { ...nextLine, id: \`live-\${String(nextIndex)}\` },
          ],
          stream: {
            ...model.stream,
            scroller: { ...model.stream.scroller, isFollowing: true },
          },
        },
      }
    }
    case 'ClickedReset': {
      return {
        model: {
          ...model,
          entries: BASE_ENTRIES,
          stream: {
            ...model.stream,
            scroller: { ...model.stream.scroller, isFollowing: true },
          },
        },
      }
    }`
        : ''
    }
  }
}`,
    view: `${isStyleX ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main(
    [h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      h.div(
        [h.Class('flex w-full max-w-3xl flex-col gap-3')],
        [
          ${toolbar}${streamCall},
        ],
      ),
    ],
  ),
})`,
  })
}

const logStreamExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  logStreamFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: logStreamSource(fixture, renderer),
  }))

export const logStreamExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, logStreamExamplesFor(renderer))
