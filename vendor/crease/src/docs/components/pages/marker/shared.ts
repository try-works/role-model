import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MarkerKind =
  | 'demo'
  | 'variants'
  | 'status'
  | 'shimmer'
  | 'separator'
  | 'border'
  | 'icon'
  | 'linksAndButtons'

export interface MarkerFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: MarkerKind
}

export const markerFixtures: Readonly<
  [MarkerFixture, ...Array<MarkerFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Variants',
    description: 'Switch between the default, separator, and border variants.',
    kind: 'variants',
  },
  {
    title: 'Status',
    description:
      'Use role="status" with a spinner icon for live activity updates.',
    kind: 'status',
  },
  {
    title: 'Shimmer',
    description:
      'Apply the shimmer style to marker content while work is in progress.',
    kind: 'shimmer',
  },
  {
    title: 'Separator',
    description:
      'Separate groups in a timeline with a centered textual marker.',
    kind: 'separator',
  },
  {
    title: 'Border',
    description:
      'Use a border marker as a compact heading between adjacent regions.',
    kind: 'border',
  },
  {
    title: 'With Icon',
    description: 'Pair a decorative icon with content when it helps scanning.',
    kind: 'icon',
  },
  {
    title: 'Links and Buttons',
    description:
      'Render the marker as a link or button for interactive timeline entries.',
    kind: 'linksAndButtons',
  },
]

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesIcon = (kind: MarkerKind): boolean =>
  kind === 'demo' ||
  kind === 'status' ||
  kind === 'border' ||
  kind === 'icon' ||
  kind === 'linksAndButtons'
const kindUsesSpinner = (kind: MarkerKind): boolean =>
  kind === 'demo' || kind === 'status'
const kindUsesToast = (kind: MarkerKind): boolean => kind === 'linksAndButtons'

const emitImports = (fixture: MarkerFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts: Array<string> = [
    "import { Command, Runtime, Subscription, Update } from 'foldkit'",
    "import { type Document, type HtmlBuilder } from 'foldkit/html'",
    "import { defineMessageUnion } from 'foldkit/message'",
  ]
  if (isStyleX) {
    parts.push('', "import * as stylex from '@stylexjs/stylex'")
  }
  if (kindUsesIcon(fixture.kind)) {
    parts.push(`import * as Icon from '@/lib/icon'`)
  }
  parts.push(`import * as Marker from '@/${base}/marker'`)
  if (kindUsesToast(fixture.kind)) {
    parts.push(`import * as Toast from '@/${base}/toast'`)
  }
  if (kindUsesSpinner(fixture.kind)) {
    parts.push(`import * as Spinner from '@/${base}/spinner'`)
  }
  if (isStyleX) {
    parts.push(`import { tokens } from '@/stylex/tokens.stylex'`)
  }
  return parts.join('\n')
}

const emitStyles = (fixture: MarkerFixture): string => {
  const extras: Array<string> = []
  switch (fixture.kind) {
    case 'demo':
    case 'variants':
    case 'status':
    case 'shimmer':
    case 'separator':
    case 'linksAndButtons':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '24rem', paddingTop: '3rem', paddingBottom: '3rem' },",
      )
      break
    case 'border':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '24rem', paddingTop: '3rem', paddingBottom: '3rem' },",
      )
      break
    case 'icon':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '3rem', width: '100%', maxWidth: '24rem', paddingTop: '3rem', paddingBottom: '3rem' },",
      )
      break
  }
  return extras.join('\n')
}

const emitModel = (fixture: MarkerFixture): string => {
  const fields: Array<string> = []
  if (kindUsesToast(fixture.kind)) {
    fields.push('  notifications: Toast.Model,')
  }
  const struct =
    fields.length === 0
      ? 'export const Model = S.Struct({})'
      : `export const Model = S.Struct({\n${fields.join('\n')}\n})`
  return `${struct}\nexport type Model = typeof Model.Type`
}

const emitMessages = (fixture: MarkerFixture): string => {
  const fields: Array<string> = []
  if (kindUsesToast(fixture.kind)) {
    fields.push(
      '  ClickedRevert: {},',
      '  GotToastMessage: { message: S.Union([Toast.Message, Toast.ActivatedToastAction]) },',
    )
  }
  if (fields.length === 0) {
    return `import { taggedStruct } from 'foldkit/schema'
// This example has no interaction. Runtime applications still expose a
// closed Message schema so the program boundary remains explicit.
export const NoOp = taggedStruct('NoOpMarker${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}');
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`
  }
  return `export const Message = defineMessageUnion({
${fields.join('\n')}
})
export type Message = typeof Message.Type`
}

const emitInit = (fixture: MarkerFixture): string => {
  const fields: Array<string> = []
  if (kindUsesToast(fixture.kind)) {
    fields.push("notifications: Toast.init({ id: 'marker-notifications' })")
  }
  return `export const init = (): Update.Return<Model, Message> => ({ model: { ${fields.join(', ')} } })`
}

const emitUpdate = (fixture: MarkerFixture): string => {
  const entries: Array<string> = []
  if (kindUsesToast(fixture.kind)) {
    entries.push(
      `    case 'ClickedRevert': {
      const result = Toast.show(model.notifications, Toast.info({ title: 'You clicked the revert button' }))
      return {
        model: { ...model, notifications: result.model },
        commands: Command.mapMessages(result.commands ?? [], next => Message.GotToastMessage({ message: next })),
      }
    }`,
      `    case 'GotToastMessage': {
      const { model: notifications, commands: notificationCommands__ } = Toast.update(model.notifications, message.message)
      const commands = notificationCommands__ ?? []
      return {
        model: { ...model, notifications },
        commands: Command.mapMessages(commands, next => Message.GotToastMessage({ message: next })),
      }
    }`,
    )
  }
  if (entries.length === 0) {
    return `export const update = (
  model: Model,
  _message: Message,
): Update.Return<Model, Message> => ({ model: model })`
  }
  return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
${entries.join('\n')}
  }
}`
}

const emitBody = (fixture: MarkerFixture, isStyleX: boolean): string => {
  const cls = (twClass: string, sxName: string): string =>
    isStyleX ? `stylex.props(styles.${sxName}).className ?? ''` : `'${twClass}'`
  const stack = cls('flex w-full max-w-sm flex-col gap-8 py-12', 'stack')
  const icon = (name: string): string =>
    `Marker.markerIcon({ children: [Icon.icon('${name}', {}, h)] }, h)`
  const content = (text: string, shimmer = false): string =>
    `Marker.markerContent({ ${shimmer ? 'shimmer: true, ' : ''}children: ['${text}'] }, h)`
  const spinner = `Spinner.spinner({ size: 'sm', isDecorative: true }, h)`
  switch (fixture.kind) {
    case 'demo':
      return `    h.div([h.Class(${stack})], [
      Marker.marker({
        children: [
          ${icon('git-branch')},
          ${content('Switched to a new branch')},
        ],
      }, h),
      Marker.marker({
        purpose: 'status',
        children: [
          Marker.markerIcon({ children: [${spinner}] }, h),
          ${content('Thinking...', true)},
        ],
      }, h),
      Marker.marker({
        variant: 'separator',
        children: [${content('Conversation compacted')}],
      }, h),
      Marker.marker({
        children: [
          ${icon('search')},
          ${content('Explored 4 files')},
        ],
      }, h),
    ]),`
    case 'variants':
      return `    h.div([h.Class(${stack})], [
      Marker.marker({
        children: [${content('A default marker for inline notes.')}],
      }, h),
      Marker.marker({
        variant: 'separator',
        children: [${content('A separator marker')}],
      }, h),
      Marker.marker({
        variant: 'border',
        children: [${content('A border marker for row boundaries.')}],
      }, h),
    ]),`
    case 'status':
      return `    h.div([h.Class(${stack})], [
      Marker.marker({
        purpose: 'status',
        children: [
          Marker.markerIcon({ children: [${spinner}] }, h),
          ${content('Compacting conversation')},
        ],
      }, h),
      Marker.marker({
        variant: 'separator',
        purpose: 'status',
        children: [
          Marker.markerIcon({ children: [${spinner}] }, h),
          ${content('Running tests')},
        ],
      }, h),
    ]),`
    case 'shimmer':
      return `    h.div([h.Class(${stack})], [
      Marker.marker({
        purpose: 'status',
        children: [${content('Thinking...', true)}],
      }, h),
      Marker.marker({
        variant: 'separator',
        purpose: 'status',
        children: [${content('Reading 4 files', true)}],
      }, h),
    ]),`
    case 'separator':
      return `    h.div([h.Class(${stack})], [
      Marker.marker({
        variant: 'separator',
        children: [${content('Today')}],
      }, h),
      Marker.marker({
        variant: 'separator',
        children: [${content('Worked for 42s')}],
      }, h),
      Marker.marker({
        variant: 'separator',
        children: [${content('Conversation compacted')}],
      }, h),
    ]),`
    case 'border':
      return `    h.div([h.Class(${cls('flex w-full max-w-sm flex-col gap-3 py-12', 'stack')})], [
      Marker.marker({
        variant: 'border',
        children: [
          ${icon('git-branch')},
          ${content('Switched to release-candidate')},
        ],
      }, h),
      Marker.marker({
        variant: 'border',
        children: [
          ${icon('search')},
          ${content('Reviewed 8 related files')},
        ],
      }, h),
      Marker.marker({
        variant: 'border',
        children: [
          ${icon('file-text')},
          ${content('Opened implementation notes')},
        ],
      }, h),
    ]),`
    case 'icon':
      return `    h.div([h.Class(${cls('flex w-full max-w-sm flex-col gap-12 py-12', 'stack')})], [
      Marker.marker({
        children: [
          ${icon('git-branch')},
          ${content('Switched to a new branch')},
        ],
      }, h),
      Marker.marker({
        variant: 'separator',
        children: [
          ${icon('search')},
          ${content('Explored 4 files')},
        ],
      }, h),
      Marker.marker({
        ${isStyleX ? "direction: 'column'," : "class: 'flex-col',"}
        children: [
          ${icon('book-open-check')},
          ${content('Syncing completed')},
        ],
      }, h),
    ]),`
    case 'linksAndButtons':
      return `    h.div([h.Class(${stack})], [
      Marker.marker({
        element: 'a',
        href: '#links-and-buttons',
        children: [
          ${icon('git-branch')},
          ${content('View the pull request')},
        ],
      }, h),
      Marker.marker({
        element: 'button',
        onClick: () => Message.ClickedRevert(),
        children: [
          ${icon('rotate-ccw')},
          ${content('Revert this change')},
        ],
      }, h),
      Toast.toast({
        model: model.notifications,
        toParentMessage: message => Message.GotToastMessage({ message }),
      }, h),
    ]),`
  }
}

const emitApplication = (
  fixture: MarkerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX ? emitStyles(fixture) : ''
  const bodyStart = isStyleX
    ? `h.main([h.Class(stylex.props(styles.page).className ?? '')], [`
    : `h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-4'"})], [`
  const pageStyle = isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '1rem' },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' },${
    stylesBlock === ''
      ? ''
      : `
${stylesBlock}`
  }
})

`
    : ''
  return foldkitApplication({
    title: `Marker — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'\n${emitImports(fixture, isStyleX)}\n\n${pageStyle}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Marker — ${sq(fixture.title)}',
  body: ${bodyStart}
    ${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const markerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  markerFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const markerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, markerExamplesFor(renderer))
