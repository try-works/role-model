import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { NotificationConfig } from '@/docs/components/pages/notification-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export const toastConfig: NotificationConfig = {
  slug: 'toast',
  title: 'Toast',
  namespace: 'Toast',
  kind: 'submodel',
  description:
    'Notification toasts with variants, positions, promise flows, and per-entry actions.',
}

export type ToastVariant =
  | 'default'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'promise'

export type ToastButtonSpec = Readonly<{
  label: string
  variant: ToastVariant
  description?: string
  actionLabel?: string
  count?: number
  sticky?: boolean
  numbered?: boolean
  dismissAll?: boolean
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
}>

export type ToastFixture = Readonly<{
  title: string
  heroOnly?: boolean
  wrap?: 'start' | 'center'
  stacked?: boolean
  limit?: number
  buttons: Readonly<[ToastButtonSpec, ...Array<ToastButtonSpec>]>
}>

export const toastTitle = (variant: ToastVariant): string => {
  switch (variant) {
    case 'default':
    case 'success':
    case 'promise':
      return 'Event has been created'
    case 'info':
      return 'Be there 10 minutes early'
    case 'warning':
      return 'Event starts before 8am'
    case 'error':
      return 'Event has not been created'
  }
}

export const toastFixtures: Readonly<[ToastFixture, ...Array<ToastFixture>]> = [
  {
    title: 'Basic',
    heroOnly: true,
    buttons: [
      {
        label: 'Show Toast',
        variant: 'default',
        description: 'Sunday, December 03, 2023 at 9:00 AM',
        actionLabel: 'Undo',
      },
    ],
  },
  {
    title: 'Types',
    buttons: [
      { label: 'Default', variant: 'default' },
      { label: 'Success', variant: 'success' },
      { label: 'Info', variant: 'info' },
      { label: 'Warning', variant: 'warning' },
      { label: 'Error', variant: 'error' },
      { label: 'Promise', variant: 'promise' },
    ],
  },
  {
    title: 'Description',
    buttons: [
      {
        label: 'Show Toast',
        variant: 'default',
        description: 'Monday, January 3rd at 6:00pm',
      },
    ],
  },
  {
    title: 'Stacking and queue',
    buttons: [
      {
        label: 'Add toast',
        variant: 'default',
        numbered: true,
        sticky: true,
        description: 'Hover or focus the stack to expand it.',
      },
      {
        label: 'Add 6 toasts',
        variant: 'default',
        count: 6,
        numbered: true,
        sticky: true,
        description: 'Dismiss a visible toast to reveal the next queued one.',
      },
      { label: 'Clear toasts', variant: 'default', dismissAll: true },
    ],
  },
  {
    title: 'Expanded',
    stacked: false,
    buttons: [
      {
        label: 'Add 6 expanded toasts',
        variant: 'default',
        count: 6,
        numbered: true,
        sticky: true,
        description:
          'Only the newest three are visible. The rest wait in the queue.',
      },
      { label: 'Clear toasts', variant: 'default', dismissAll: true },
    ],
  },
  {
    title: 'Visible limit',
    limit: 5,
    buttons: [
      {
        label: 'Add 6 toasts with limit 5',
        variant: 'default',
        count: 6,
        numbered: true,
        sticky: true,
        description: 'This stack displays up to five toasts.',
      },
      { label: 'Clear toasts', variant: 'default', dismissAll: true },
    ],
  },
  {
    title: 'Position',
    wrap: 'center',
    buttons: [
      { label: 'Top Left', variant: 'default', position: 'top-left' },
      { label: 'Top Center', variant: 'default', position: 'top-center' },
      { label: 'Top Right', variant: 'default', position: 'top-right' },
      { label: 'Bottom Left', variant: 'default', position: 'bottom-left' },
      { label: 'Bottom Center', variant: 'default', position: 'bottom-center' },
      { label: 'Bottom Right', variant: 'default', position: 'bottom-right' },
    ],
  },
]

const factoryName = (variant: ToastVariant): string =>
  variant === 'promise' ? 'info' : variant === 'default' ? 'plain' : variant

const showCallEmit = (button: ToastButtonSpec): string => {
  if (button.dismissAll) return 'Toast.dismissAll(model.notifications)'
  if (button.variant === 'promise') {
    return `Toast.show(model.notifications, Toast.info({
        title: 'Loading...',
        sticky: true,
      }))`
  }
  const props = [
    button.numbered
      ? 'title: `Toast ${model.notifications.nextEntryKey + 1}`'
      : `title: '${toastTitle(button.variant)}'`,
  ]
  if (button.sticky) props.push('sticky: true')
  if (button.description !== undefined) {
    props.push(`description: '${button.description}'`)
  }
  if (button.actionLabel !== undefined) {
    props.push(`actionLabel: '${button.actionLabel}'`)
  }
  if (button.position !== undefined) {
    props.push(`position: '${button.position}'`)
  }
  return `Toast.show(model.notifications, Toast.${factoryName(button.variant)}({
        ${props.join(',\n        ')},
      }))`
}

const buttonEmit = (button: ToastButtonSpec, index: number): string =>
  `    Button.button({
      onClick: ClickedShow${index}(),
      variant: 'outline',
      children: ['${button.label}'],
    }, h)`

const emitSource = (fixture: ToastFixture, isStyleX: boolean): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const lib = isStyleX ? 'stylex' : 'ui'
  const hasPromise = fixture.buttons.some(
    button => button.variant === 'promise',
  )
  const wrapClass =
    fixture.wrap === 'center'
      ? 'flex flex-wrap justify-center gap-2'
      : 'flex flex-wrap gap-2'
  const clickTags = fixture.buttons.map((_, index) => `ClickedShow${index}`)
  return foldkitApplication({
    title: `Toast — ${fixture.title}`,
    imports: `import { Effect, Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import * as Button from '@/${lib}/button'
import * as Toast from '@/${lib}/toast'`,
    model: `export const Model = S.Struct({
  notifications: Toast.Model,${
    hasPromise
      ? `
  pendingPromiseId: S.Option(S.String),`
      : ''
  }
})
export type Model = typeof Model.Type`,
    messages: `${fixture.buttons
      .map(
        (_, index) =>
          `export const ClickedShow${index} = taggedStruct('ClickedShow${index}${tag}')`,
      )
      .join('\n')}
export const GotToastMessage = taggedStruct('GotToastMessage${tag}', {
  message: S.Union([Toast.Message, Toast.ActivatedToastAction]),
})${
      hasPromise
        ? `
export const CompletedPromise = taggedStruct('CompletedPromise${tag}')`
        : ''
    }
export const Message = S.Union([${[...clickTags, 'GotToastMessage', ...(hasPromise ? ['CompletedPromise'] : [])].join(', ')}])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    notifications: Toast.init({ id: 'toast-${tag.toLowerCase()}', limit: ${fixture.limit ?? 3} }),${
      hasPromise
        ? `
    pendingPromiseId: Option.none(),`
        : ''
    }
  },
})`,
    update: `const mapToast = (
  model: Model,
  result: ReturnType<typeof Toast.update>,
): Update.Return<Model, Message> => ({
  model: { ...model, notifications: result.model },
  commands: Command.mapMessages(result.commands ?? [], next =>
    GotToastMessage({ message: next })),
})
${
  hasPromise
    ? `
const ResolvePromise = Command.define('ResolvePromise', {
  messages: [CompletedPromise],
  execute: Effect.sleep('1200 millis').pipe(Effect.as(CompletedPromise())),
})
`
    : ''
}
export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${fixture.buttons
  .map((button, index) => {
    if (button.variant === 'promise') {
      return `    case 'ClickedShow${index}${tag}': {
      const result = ${showCallEmit(button)}
      const mapped = mapToast(model, result)
      const next = mapped.model
      const commands = mapped.commands ?? []
      return {
        model: {
          ...next,
          pendingPromiseId: Option.fromNullishOr(
            next.notifications.entries.at(-1)?.id,
          ),
        },
        commands: [...commands, ResolvePromise()],
      }
    }`
    }
    if ((button.count ?? 1) > 1) {
      return `    case 'ClickedShow${index}${tag}': {
      let next = model
      const commands: Array<Command.Command<Message>> = []
      for (let index = 0; index < ${button.count}; index += 1) {
        const result = mapToast(next, ${showCallEmit(button).replaceAll('model.notifications', 'next.notifications')})
        next = result.model
        commands.push(...(result.commands ?? []))
      }
      return { model: next, commands }
    }`
    }
    return `    case 'ClickedShow${index}${tag}':
      return mapToast(model, ${showCallEmit(button)})`
  })
  .join('\n')}${
      hasPromise
        ? `
    case 'CompletedPromise${tag}':
      return Option.match(model.pendingPromiseId, {
        onNone: () => ({ model }),
        onSome: id =>
          mapToast(
            { ...model, pendingPromiseId: Option.none() },
            Toast.updateToast(model.notifications, id, {
              title: 'Event has been created',
              variant: 'Success',
              sticky: false,
              duration: '4 seconds',
            }),
          ),
      })`
        : ''
    }
    case 'GotToastMessage${tag}':
      return mapToast(model, Toast.update(model.notifications, message.message))
  }
}`,
    view: `${isStyleX ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Toast — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(shellStyles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    h.div([h.Class('${wrapClass}')], [
${fixture.buttons.map((button, index) => buttonEmit(button, index)).join(',\n')}
    ]),
    Toast.toast({
      model: model.notifications,
      toParentMessage: message => GotToastMessage({ message }),
      ariaLabel: 'Toast notifications',
      stacked: ${fixture.stacked !== false},
    }, h),
  ]),
})`,
  })
}

const toastExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  toastFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitSource(fixture, renderer !== 'tailwind'),
  }))

export const toastExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, toastExamplesFor(renderer))
