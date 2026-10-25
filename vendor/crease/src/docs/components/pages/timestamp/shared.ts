import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { AstryxTextColor, AstryxTextType } from '@/lib/astryx-text'
import type { TimestampFormat, TimestampTooltipEntry } from '@/ui/timestamp'

export type TimestampStampSpec = Readonly<{
  /** ISO string, or `secondsAgo: n` for a value relative to init time. */
  value: string | Readonly<{ secondsAgo: number }>
  format?: TimestampFormat
  type?: AstryxTextType
  color?: AstryxTextColor
  isTimezoneShown?: boolean
  tooltipEntries?: ReadonlyArray<TimestampTooltipEntry>
}>

export type TimestampSection = Readonly<{
  /** Section caption; omit for an unlabeled group. */
  label?: string
  direction: 'horizontal' | 'vertical'
  stamps: ReadonlyArray<TimestampStampSpec>
}>

export type TimestampFixture = Readonly<{
  title: string
  description: string
  sections: ReadonlyArray<TimestampSection>
}>

const DEMO_DATE = '2026-02-19T17:00:00Z'

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Timestamp/*.tsx —
   same demos, same values, names/descriptions from the *.doc.mjs files.
   astryx's <Text>/<Stack> scaffolds map onto inline utility classes since
   the Text/Stack ports live on a sibling branch. */
export const timestampFixtures: Readonly<
  [TimestampFixture, ...Array<TimestampFixture>]
> = [
  {
    title: 'Timestamp',
    description:
      'The default auto format picks relative or absolute text for one fixed instant.',
    sections: [
      {
        direction: 'horizontal',
        stamps: [{ value: '2026-03-25T12:00:00Z', color: 'primary' }],
      },
    ],
  },
  {
    title: 'Timestamp — Auto',
    description:
      'Auto format that shows relative time for recent dates and switches to the full date for older ones. The default choice for most use cases.',
    sections: [
      {
        label: 'Recent — renders as relative',
        direction: 'horizontal',
        stamps: [
          { value: { secondsAgo: 300 }, format: 'auto', color: 'primary' },
          { value: { secondsAgo: 7200 }, format: 'auto', color: 'primary' },
          { value: { secondsAgo: 86400 }, format: 'auto', color: 'primary' },
        ],
      },
      {
        label: 'Older than 7 days — renders as date_time',
        direction: 'horizontal',
        stamps: [
          { value: '2025-01-15T09:30:00Z', format: 'auto', color: 'primary' },
          { value: '2024-06-01T14:00:00Z', format: 'auto', color: 'primary' },
        ],
      },
    ],
  },
  {
    title: 'Timestamp — Colors',
    description:
      'Timestamp rendered in each available color variant: primary, secondary, disabled, and active.',
    sections: [
      {
        label: 'Primary',
        direction: 'vertical',
        stamps: [{ value: DEMO_DATE, format: 'date_time', color: 'primary' }],
      },
      {
        label: 'Secondary',
        direction: 'vertical',
        stamps: [{ value: DEMO_DATE, format: 'date_time', color: 'secondary' }],
      },
      {
        label: 'Disabled',
        direction: 'vertical',
        stamps: [{ value: DEMO_DATE, format: 'date_time', color: 'disabled' }],
      },
      {
        label: 'Accent',
        direction: 'vertical',
        stamps: [{ value: DEMO_DATE, format: 'date_time', color: 'accent' }],
      },
    ],
  },
  {
    title: 'Timestamp — Formats',
    description:
      'All display formats side by side: date, date_time, time, and their system equivalents. Use date and date_time for user-facing UI, system variants for logs and dev tools.',
    sections: [
      {
        label: 'User-facing formats',
        direction: 'horizontal',
        stamps: [
          { value: DEMO_DATE, format: 'date', color: 'primary' },
          { value: DEMO_DATE, format: 'date_long', color: 'primary' },
          { value: DEMO_DATE, format: 'date_weekday', color: 'primary' },
          { value: DEMO_DATE, format: 'date_time', color: 'primary' },
          { value: DEMO_DATE, format: 'time', color: 'primary' },
        ],
      },
      {
        label: 'System formats (logs and dev tools)',
        direction: 'horizontal',
        stamps: [
          {
            value: DEMO_DATE,
            format: 'system_date',
            type: 'code',
            color: 'primary',
          },
          {
            value: DEMO_DATE,
            format: 'system_date_time',
            type: 'code',
            color: 'primary',
          },
          {
            value: DEMO_DATE,
            format: 'system_time',
            type: 'code',
            color: 'primary',
          },
        ],
      },
    ],
  },
  {
    title: 'Timestamp — Relative',
    description:
      'Relative time labels from seconds to months ago, with hover tooltips showing the full date. Use in feeds, comment threads, and activity logs.',
    sections: [
      {
        label: 'Relative timestamps (hover for full date)',
        direction: 'vertical',
        stamps: [
          { value: { secondsAgo: 5 }, format: 'relative', color: 'primary' },
          { value: { secondsAgo: 120 }, format: 'relative', color: 'primary' },
          { value: { secondsAgo: 3600 }, format: 'relative', color: 'primary' },
          {
            value: { secondsAgo: 86400 },
            format: 'relative',
            color: 'primary',
          },
          {
            value: { secondsAgo: 259200 },
            format: 'relative',
            color: 'primary',
          },
          {
            value: { secondsAgo: 7776000 },
            format: 'relative',
            color: 'primary',
          },
        ],
      },
    ],
  },
  {
    title: 'Timestamp — Timezone',
    description:
      'Timestamps with the timezone abbreviation appended. Enable isTimezoneShown for audiences across time zones, like audit logs or team calendars.',
    sections: [
      {
        label: 'User-facing with timezone',
        direction: 'horizontal',
        stamps: [
          {
            value: DEMO_DATE,
            format: 'date_time',
            isTimezoneShown: true,
            color: 'primary',
          },
          {
            value: DEMO_DATE,
            format: 'time',
            isTimezoneShown: true,
            color: 'primary',
          },
        ],
      },
      {
        label:
          'System formats stay machine-readable — never suffixed with a zone',
        direction: 'horizontal',
        stamps: [
          {
            value: DEMO_DATE,
            format: 'system_date_time',
            type: 'code',
            color: 'primary',
          },
          {
            value: DEMO_DATE,
            format: 'system_time',
            type: 'code',
            color: 'primary',
          },
        ],
      },
    ],
  },
  {
    title: 'Timestamp — Tooltip time zones',
    description:
      "Hover tooltips that show one instant across several time zones or formats. Use tooltipEntries when readers must compare zones, like an incident log carrying both the reader's time and the event's origin zone.",
    sections: [
      {
        label: 'Local + UTC — hover to compare',
        direction: 'vertical',
        stamps: [
          {
            value: DEMO_DATE,
            format: 'relative',
            color: 'primary',
            tooltipEntries: [
              { format: 'date_time', label: 'Local' },
              { timezoneID: 'UTC', format: 'date_time', label: 'UTC' },
            ],
          },
        ],
      },
      {
        label: 'Incident origin zone alongside the reader\u2019s',
        direction: 'vertical',
        stamps: [
          {
            value: DEMO_DATE,
            format: 'date_time',
            color: 'primary',
            tooltipEntries: [
              { format: 'date_time', label: 'Local' },
              {
                timezoneID: 'America/Los_Angeles',
                format: 'date_time',
                label: 'Origin',
              },
            ],
          },
        ],
      },
      {
        label: 'Friendly line plus a machine-precise line',
        direction: 'vertical',
        stamps: [
          {
            value: DEMO_DATE,
            format: 'date_time',
            color: 'primary',
            tooltipEntries: [
              { format: 'full' },
              { format: 'system_date_time', label: 'ISO' },
            ],
          },
        ],
      },
    ],
  },
]

export const timestampValueLiteral = (
  spec: TimestampStampSpec['value'],
): string =>
  typeof spec === 'string'
    ? `'${spec}'`
    : `Date.now() - ${String(spec.secondsAgo * 1000)}`

export const timestampStampConfig = (spec: TimestampStampSpec): string => {
  const fields = [
    `value: ${timestampValueLiteral(spec.value)}`,
    ...(spec.format === undefined ? [] : [`format: '${spec.format}' as const`]),
  ]
  return `{ ${fields.join(', ')} }`
}

export const timestampViewCall = (
  spec: TimestampStampSpec,
  index: number,
): string => {
  const props = [
    `model: model.stamps[${String(index)}]!`,
    'toParentMessage: (message) =>\n              GotTimestampMessage({ index: ' +
      String(index) +
      ', message })',
    ...(spec.type === undefined ? [] : [`type: '${spec.type}'`]),
    ...(spec.color === undefined ? [] : [`color: '${spec.color}'`]),
    ...(spec.isTimezoneShown === true ? ['isTimezoneShown: true'] : []),
    ...(spec.tooltipEntries === undefined
      ? []
      : [
          `tooltipEntries: ${JSON.stringify(spec.tooltipEntries).replace(/"/g, "'")}`,
        ]),
  ]
  return `Timestamp.timestamp(
          {
            ${props.join(',\n            ')},
          },
          h,
        )`
}

const timestampSource = (
  fixture: TimestampFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'

  let stampIndex = 0
  const sectionBodies = fixture.sections.map(section => {
    const calls = section.stamps
      .map(stamp => {
        const call = timestampViewCall(stamp, stampIndex)
        stampIndex += 1
        return call
      })
      .join(',\n            ')
    const rowClass = isStyleX
      ? `className(${
          section.direction === 'horizontal' ? 'styles.row' : 'styles.column'
        })`
      : `'${
          section.direction === 'horizontal'
            ? 'flex items-center gap-4'
            : 'flex flex-col gap-2'
        }'`
    const inner = `h.div(
            [h.Class(${rowClass})],
            [
              ${calls},
            ],
          )`
    if (section.label === undefined) {
      return inner
    }
    const labelClass = isStyleX
      ? 'className(styles.supporting)'
      : `'text-xs leading-5 text-muted-foreground'`
    const sectionClass = isStyleX
      ? 'className(styles.section)'
      : `'flex flex-col gap-1'`
    return `h.div(
          [h.Class(${sectionClass})],
          [
            h.span([h.Class(${labelClass})], ['${section.label.replace(/'/g, "\\'")}']),
            ${inner},
          ],
        )`
  })
  const pageClass = isStyleX
    ? 'className(styles.page)'
    : `'flex flex-col gap-4'`

  const stampInits = fixture.sections.flatMap(section =>
    section.stamps.map(stamp => timestampStampConfig(stamp)),
  )

  return foldkitApplication({
    title: fixture.title,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
import * as Timestamp from '@/stylex/timestamp'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  page: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  section: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  row: { alignItems: 'center', display: 'flex', gap: '1rem' },
  column: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1.25rem' },
})`
    : `import * as Timestamp from '@/ui/timestamp'`
}`,
    model: `export const Model = S.Struct({
  stamps: S.Array(Timestamp.Model),
})
export type Model = typeof Model.Type`,
    messages: `export const GotTimestampMessage = taggedStruct('GotTimestampMessage', {
  index: S.Number,
  message: Timestamp.Message,
})
export const Message = S.Union([GotTimestampMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    stamps: [${stampInits.join(', ')}].map((config, index) =>
      Timestamp.init({ ...config, id: \`stamp-\${String(index)}\` }),
    ),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTimestampMessage': {
      const stamp = model.stamps[message.index]
      if (stamp === undefined) {
        return { model }
      }
      const next = Timestamp.update(stamp, message.message)
      const stamps = model.stamps.map((current, index) =>
        index === message.index ? next.model : current,
      )
      return {
        model: { ...model, stamps },
        commands: Command.mapMessages(next.commands ?? [], (inner) =>
          GotTimestampMessage({ index: message.index, message: inner })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main(
    [h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      h.div(
        [h.Class(${pageClass})],
        [
          ${sectionBodies.join(',\n          ')},
        ],
      ),
    ],
  ),
})`,
  })
}

const timestampExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  timestampFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: timestampSource(fixture, renderer),
  }))

export const timestampExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, timestampExamplesFor(renderer))
