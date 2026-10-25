import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

type DialogSpec = Readonly<{
  triggerLabel: string
  triggerVariant: 'outline' | 'destructive'
  dialogTitle: string
  dialogDescription: string
  actionLabel: string
  cancelLabel: string
  size?: 'sm'
  mediaIcon?: string
  mediaVariant?: 'destructive'
  actionVariant?: 'destructive'
}>

export type AlertDialogFixture = Readonly<{
  kind:
    | 'basic'
    | 'small'
    | 'media'
    | 'smallMedia'
    | 'destructive'
    | 'rtl'
    | 'async'
  title: string
  description: string
  dialogs: Readonly<[DialogSpec, ...Array<DialogSpec>]>
  async?: Readonly<{ pendingLabel: string; completeLabel: string }>
}>

export const alertDialogFixtures: Readonly<
  [AlertDialogFixture, ...Array<AlertDialogFixture>]
> = [
  {
    kind: 'basic',
    title: 'Basic',
    description:
      'A basic alert dialog with a title, description, and cancel and continue buttons.',
    dialogs: [
      {
        triggerLabel: 'Show Dialog',
        triggerVariant: 'outline',
        dialogTitle: 'Are you absolutely sure?',
        dialogDescription:
          'This action cannot be undone. This will permanently delete your account and remove your data from our servers.',
        actionLabel: 'Continue',
        cancelLabel: 'Cancel',
      },
    ],
  },
  {
    kind: 'small',
    title: 'Small',
    description: "Use the size 'sm' to make the alert dialog smaller.",
    dialogs: [
      {
        triggerLabel: 'Show Dialog',
        triggerVariant: 'outline',
        dialogTitle: 'Allow accessory to connect?',
        dialogDescription:
          'Do you want to allow the USB accessory to connect to this device?',
        actionLabel: 'Allow',
        cancelLabel: "Don't allow",
        size: 'sm',
      },
    ],
  },
  {
    kind: 'media',
    title: 'Media',
    description:
      'Use the media prop to add a media element such as an icon to the alert dialog.',
    dialogs: [
      {
        triggerLabel: 'Share Project',
        triggerVariant: 'outline',
        dialogTitle: 'Share this project?',
        dialogDescription:
          'Anyone with the link will be able to view and edit this project.',
        actionLabel: 'Share',
        cancelLabel: 'Cancel',
        mediaIcon: 'circle-fading-plus',
      },
    ],
  },
  {
    kind: 'smallMedia',
    title: 'Small with Media',
    description: "Use the size 'sm' together with the media prop.",
    dialogs: [
      {
        triggerLabel: 'Show Dialog',
        triggerVariant: 'outline',
        dialogTitle: 'Allow accessory to connect?',
        dialogDescription:
          'Do you want to allow the USB accessory to connect to this device?',
        actionLabel: 'Allow',
        cancelLabel: "Don't allow",
        size: 'sm',
        mediaIcon: 'bluetooth',
      },
    ],
  },
  {
    kind: 'destructive',
    title: 'Destructive',
    description:
      "Use actionVariant 'destructive' for a destructive action button and mediaVariant 'destructive' to tint the media element.",
    dialogs: [
      {
        triggerLabel: 'Delete Chat',
        triggerVariant: 'destructive',
        dialogTitle: 'Delete chat?',
        dialogDescription:
          'This will permanently delete this chat conversation. View Settings delete any memories saved during this chat.',
        actionLabel: 'Delete',
        cancelLabel: 'Cancel',
        size: 'sm',
        mediaIcon: 'trash-2',
        mediaVariant: 'destructive',
        actionVariant: 'destructive',
      },
    ],
  },
  {
    kind: 'rtl',
    title: 'RTL',
    description:
      'The alert dialog mirrors its layout inside a dir="rtl" container, including the small media variant.',
    dialogs: [
      {
        triggerLabel: 'إظهار الحوار',
        triggerVariant: 'outline',
        dialogTitle: 'هل أنت متأكد تمامًا؟',
        dialogDescription:
          'لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف حسابك نهائيًا من خوادمنا.',
        actionLabel: 'متابعة',
        cancelLabel: 'إلغاء',
      },
      {
        triggerLabel: 'إظهار الحوار (صغير)',
        triggerVariant: 'outline',
        dialogTitle: 'السماح للملحق بالاتصال؟',
        dialogDescription: 'هل تريد السماح لملحق USB بالاتصال بهذا الجهاز؟',
        actionLabel: 'السماح',
        cancelLabel: 'عدم السماح',
        size: 'sm',
        mediaIcon: 'bluetooth',
      },
    ],
  },
  {
    kind: 'async',
    title: 'Async deletion',
    description:
      'Confirmed starts parent-owned work, disables decisions while pending, and closes only after completion.',
    dialogs: [
      {
        triggerLabel: 'Delete project',
        triggerVariant: 'destructive',
        dialogTitle: 'Delete this project?',
        dialogDescription:
          'This action permanently removes releases, environments, and team access.',
        actionLabel: 'Delete project',
        cancelLabel: 'Cancel',
      },
    ],
    async: { pendingLabel: 'Deleting…', completeLabel: 'Project deleted.' },
  },
]

const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const dialogSource = (
  spec: DialogSpec,
  modelField: string,
  messageTag: string,
  pending: AlertDialogFixture['async'],
): string => `AlertDialog.alertDialog({
      model: model.${modelField},
      toParentMessage: message => Message['${messageTag}']({ message }),
      title: '${esc(spec.dialogTitle)}',
      description: '${esc(spec.dialogDescription)}',
      actionLabel: '${esc(spec.actionLabel)}',
      cancelLabel: '${esc(spec.cancelLabel)}',${spec.size === 'sm' ? `\n      size: 'sm' as const,` : ''}${spec.mediaIcon === undefined ? '' : `\n      media: [Icon.icon('${spec.mediaIcon}', {}, h)],`}${spec.mediaVariant === undefined ? '' : `\n      mediaVariant: '${spec.mediaVariant}' as const,`}${spec.actionVariant === undefined ? '' : `\n      actionVariant: '${spec.actionVariant}' as const,`}${pending === undefined ? '' : `\n      pendingLabel: '${esc(pending.pendingLabel)}',\n      isPending: model.status === 'pending',`}
    }, h)`

const triggerSource = (spec: DialogSpec, messageTag: string): string =>
  `Button.button({ variant: '${spec.triggerVariant}' as const, onClick: Message['${messageTag}'](), children: ['${esc(spec.triggerLabel)}'] }, h)`

const applySource = (
  modelField: string,
  messageTag: string,
): string => `const apply${modelField === 'dialog' ? 'Dialog' : 'DialogSmall'} = (model: Model, result: ReturnType<typeof AlertDialog.update>): Update.Return<Model, Message> => {
  const commands = Command.mapMessages(result.commands, message => Message['${messageTag}']({ message }))
  if (result.outMessage?._tag === 'ConfirmedAlertDialog') {
    const closed = AlertDialog.close(result.model)
    return { model: { ...model, ${modelField}: closed.model }, commands: [...commands, ...Command.mapMessages(closed.commands, message => Message['${messageTag}']({ message }))] }
  }
  return { model: { ...model, ${modelField}: result.model }, commands }
}`

const asyncApplySource = `const applyDialog = (model: Model, result: ReturnType<typeof AlertDialog.update>): Update.Return<Model, Message> => {
  const commands = Command.mapMessages(result.commands, message => Message['GotAlertDialogMessage']({ message }))
  if (result.outMessage?._tag === 'ConfirmedAlertDialog') {
    return { model: { ...model, dialog: result.model, status: 'pending' as const }, commands: [...commands, DeleteProject()] }
  }
  return { model: { ...model, dialog: result.model, status: 'idle' as const }, commands }
}`

const source = (
  fixture: AlertDialogFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const rtl = fixture.kind === 'rtl'
  const pending = fixture.async
  const needsIcon = fixture.dialogs.some(spec => spec.mediaIcon !== undefined)
  const ui = renderer !== 'tailwind' ? 'stylex' : 'ui'

  const model =
    pending !== undefined
      ? `export const Model = S.Struct({ dialog: AlertDialog.Model, status: S.Literals(['idle', 'pending', 'deleted']) })
export type Model = typeof Model.Type`
      : `export const Model = S.Struct({ dialog: AlertDialog.Model${rtl ? ', dialogSmall: AlertDialog.Model' : ''} })
export type Model = typeof Model.Type`

  const messages = `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedOpen: {},${rtl ? `\n  ClickedOpenSmall: {},` : ''}${pending !== undefined ? `\n  CompletedDelete: {},` : ''}
  GotAlertDialogMessage: { message: AlertDialog.Message },${rtl ? `\n  GotAlertDialogSmallMessage: { message: AlertDialog.Message },` : ''}
});
export type Message = typeof Message.Type`

  const init = `export const init = (): Update.Return<Model, Message> => ({ model: { dialog: AlertDialog.init({ id: 'alert-dialog', isAnimated: true })${rtl ? `, dialogSmall: AlertDialog.init({ id: 'alert-dialog-small', isAnimated: true })` : ''}${pending !== undefined ? `, status: 'idle' as const` : ''} } })`

  const update =
    pending !== undefined
      ? `const DeleteProject = Command.define('DeleteProject', {
  messages: [Message.CompletedDelete],
  execute: Effect.sleep('500 millis').pipe(Effect.as(Message.CompletedDelete())),
})

${asyncApplySource}

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedOpen': return applyDialog(model, AlertDialog.open(model.dialog))
    case 'CompletedDelete': return applyDialog({ ...model, status: 'deleted' }, AlertDialog.close(model.dialog))
    case 'GotAlertDialogMessage': return applyDialog(model, AlertDialog.update(model.dialog, message.message))
  }
}`
      : `${applySource('dialog', 'GotAlertDialogMessage')}${rtl ? `\n\n${applySource('dialogSmall', 'GotAlertDialogSmallMessage')}` : ''}

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedOpen': return applyDialog(model, AlertDialog.open(model.dialog))${rtl ? `\n    case 'ClickedOpenSmall': return applyDialogSmall(model, AlertDialog.open(model.dialogSmall))` : ''}
    case 'GotAlertDialogMessage': return applyDialog(model, AlertDialog.update(model.dialog, message.message))${rtl ? `\n    case 'GotAlertDialogSmallMessage': return applyDialogSmall(model, AlertDialog.update(model.dialogSmall, message.message))` : ''}
  }
}`

  const frame = rtl
    ? renderer !== 'tailwind'
      ? `h.div([h.Dir('rtl'), h.Class(stylex.props(styles.frame).className ?? '')], [\n      ${triggerSource(fixture.dialogs[0], 'ClickedOpen')},\n      ${dialogSource(fixture.dialogs[0], 'dialog', 'GotAlertDialogMessage', undefined)},\n      ${triggerSource(fixture.dialogs[1]!, 'ClickedOpenSmall')},\n      ${dialogSource(fixture.dialogs[1]!, 'dialogSmall', 'GotAlertDialogSmallMessage', undefined)},\n    ])`
      : `h.div([h.Dir('rtl'), h.Class('flex flex-wrap items-center justify-center gap-3')], [\n      ${triggerSource(fixture.dialogs[0], 'ClickedOpen')},\n      ${dialogSource(fixture.dialogs[0], 'dialog', 'GotAlertDialogMessage', undefined)},\n      ${triggerSource(fixture.dialogs[1]!, 'ClickedOpenSmall')},\n      ${dialogSource(fixture.dialogs[1]!, 'dialogSmall', 'GotAlertDialogSmallMessage', undefined)},\n    ])`
    : `${triggerSource(fixture.dialogs[0], 'ClickedOpen')},\n    ${dialogSource(fixture.dialogs[0], 'dialog', 'GotAlertDialogMessage', pending)}${pending !== undefined ? `,\n    h.p([h.Role('status')], [model.status === 'deleted' ? '${esc(pending.completeLabel)}' : 'No action taken.'])` : ''}`

  const view = `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Alert Dialog — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${frame},
  ]),
})`

  return foldkitApplication({
    title: `Alert Dialog — ${fixture.title}`,
    imports: `import ${pending !== undefined ? `{ Effect, Schema as S }` : `{ Schema as S }`} from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${rtl && renderer !== 'tailwind' ? `import * as stylex from '@stylexjs/stylex'\n\n` : ''}
import * as AlertDialog from '@/${ui}/alert-dialog'
import * as Button from '@/${ui}/button'${needsIcon ? `\nimport * as Icon from '@/lib/icon'` : ''}`,
    model,
    messages,
    init,
    update,
    view: `${rtl && renderer !== 'tailwind' ? `const styles = stylex.create({ frame: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' } })\n\n` : ''}${view}`,
  })
}

const alertDialogExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  alertDialogFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: source(fixture, renderer),
  }))

export const alertDialogExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, alertDialogExamplesFor(renderer))
