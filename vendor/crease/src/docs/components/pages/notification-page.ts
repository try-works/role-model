import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { PageDefinition } from '@/docs/components/page-definition'
import type { ComponentKind } from '@/docs/components/page-definition'
import type * as Toast from '@/ui/toast'

export type NotificationConfig = Readonly<{
  slug: 'toast'
  title: 'Toast'
  namespace: 'Toast'
  description: string
  kind: ComponentKind
}>

const application = (
  config: NotificationConfig,
  example: string,
  variant: Toast.Variant,
  sticky: boolean,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string => {
  const factory = variant.toLowerCase()
  return foldkitApplication({
    title: `${config.title} — ${example}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Button from '@/${renderer === 'stylex' ? 'stylex' : 'ui'}/button'
import * as ${config.namespace} from '@/${renderer === 'stylex' ? 'stylex' : 'ui'}/${config.slug}'`,
    model: `export const Model = S.Struct({ notifications: ${config.namespace}.Model, maybeLastDismissedTitle: S.Option(S.String) })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ClickedShow = taggedStruct('ClickedShow${config.title}${example.replaceAll(/[^a-zA-Z0-9]/g, '')}');
export const GotNotificationMessage = taggedStruct('Got${config.title}Message${example.replaceAll(/[^a-zA-Z0-9]/g, '')}', { message: S.Union([${config.namespace}.Message, ${config.namespace}.ActivatedToastAction]) });
export const Message = S.Union([ClickedShow, GotNotificationMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { notifications: ${config.namespace}.init({ id: '${config.slug}-demo' }), maybeLastDismissedTitle: Option.none() } })`,
    update: `const mapNotifications = (
  model: Model,
  result: ReturnType<typeof ${config.namespace}.update>,
): Update.Return<Model, Message> => {
  const out = result.outMessage
  return { model: {
      ...model,
      notifications: result.model,
      maybeLastDismissedTitle: out === undefined
        ? model.maybeLastDismissedTitle
        : Option.some(out.entry.payload.title),
    }, commands: Command.mapMessages(result.commands, next => GotNotificationMessage({ message: next })) }
}

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedShow${config.title}${example.replaceAll(/[^a-zA-Z0-9]/g, '')}':
      return mapNotifications(model, ${config.namespace}.show(model.notifications, ${config.namespace}.${factory}({
        title: '${variant === 'Error' ? 'Could not save changes' : 'Event has been created'}',
        description: '${variant === 'Error' ? 'Try again in a moment.' : 'Sunday at 9:00 AM'}',
        actionLabel: 'Undo',
        sticky: ${String(sticky)},
        duration: '4 seconds',
      })))
    case 'Got${config.title}Message${example.replaceAll(/[^a-zA-Z0-9]/g, '')}':
      return mapNotifications(model, ${config.namespace}.update(model.notifications, message.message))
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${config.title} — ${example}',
  body: h.main([], [
    Button.button({ onClick: ClickedShow(), children: ['Show ${config.title.toLowerCase()}'] }, h),
    ${config.namespace}.${config.slug}({
      model: model.notifications,
      toParentMessage: message => GotNotificationMessage({ message }),
      ariaLabel: '${config.title} notifications',
    }, h),
  ]),
})`,
  })
}

export const notificationExamples = (
  config: NotificationConfig,
  renderer: 'tailwind' | 'stylex' | 'pleat',
) =>
  [
    {
      title: 'Timed notification',
      description:
        'Showing a non-sticky entry returns a delay Command that is mapped through the parent Message.',
      code: application(
        config,
        'Timed notification',
        'Success',
        false,
        renderer,
      ),
    },
    {
      title: 'Sticky error',
      description:
        'A sticky error remains until its action or dismiss control emits a typed parent-handled fact.',
      code: application(config, 'Sticky error', 'Error', true, renderer),
    },
  ] as const

export const notificationDefinition = (
  config: NotificationConfig,
): PageDefinition => ({
  kind: config.kind,
  description: config.description,
  architecture: `${config.title} uses the canonical notification Model. show and updateToast issue versioned delay Commands; stale completions are ignored. ActivatedToast and DismissedToast OutMessages keep application consequences in the parent.`,
  usage: `const { model: notifications, commands = [] } = ${config.namespace}.show(
  model.notifications,
  { title: 'Saved', variant: 'Success' },
)

${config.namespace}.${config.slug}({
  model: notifications,
  toParentMessage: message => GotNotificationMessage({ message }),
}, h)`,
  apiHref: 'https://foldkit.dev/guide/effects',
  composition: `Parent Model\n└── ${config.title} Model\n    ├── stable keyed entries\n    ├── variant + payload + duration\n    ├── optional action → parent Message\n    └── dismiss/timer Message + OutMessage`,
  styling:
    'Toast.init({ id, limit: 3 }) caps visible notifications; the newest appear first and older entries wait with their timers paused. Cards stack by default and expand on hover or focus, remaining expanded while dismissals move cards beneath the pointer. Drag a card toward the screen edge to dismiss it; short or cancelled drags snap back. Buttons remain clickable. Configure swipeToDismiss with direction and threshold, or false to disable it. Set stacked: false on Toast.toast to keep cards expanded. Both renderers use the Base UI 500 ms cubic-bezier(0.22, 1, 0.36, 1) movement with 150 ms height transitions. Sticky notifications require an obvious dismissal route.',
  accessibility:
    'The viewport is a named polite live region. Error entries use alert while other variants use status. Actions and dismiss controls are real, labeled buttons.',
  keyboard: [
    ['F6', 'Focuses the notification viewport and expands its stack.'],
    ['Tab', 'Moves to an action or dismiss button in a visible notification.'],
    ['Enter / Space', 'Runs the focused action or dismisses the entry.'],
    ['Escape', 'Dismisses the focused notification.'],
  ],
  examples: notificationExamples(config, 'tailwind'),
})
