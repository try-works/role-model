import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type DialogFixtureKind =
  | 'profile'
  | 'compact'
  | 'share'
  | 'noClose'
  | 'sticky'
  | 'scroll'
  | 'rtl'

export type DialogFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: DialogFixtureKind
  triggerLabel: string
  triggerVariant: 'default' | 'outline'
  dialogTitle: string
  dialogDescription?: string
}>

export const dialogFixtures: ReadonlyArray<DialogFixture> = [
  {
    title: 'Edit profile',
    heroOnly: true,
    kind: 'profile',
    triggerLabel: 'Open Dialog',
    triggerVariant: 'outline',
    dialogTitle: 'Edit profile',
    dialogDescription:
      "Make changes to your profile here. Click save when you're done.",
  },
  {
    title: 'Compact confirmation',
    description:
      'A separate dialog instance owns a separate child Model and stable id.',
    kind: 'compact',
    triggerLabel: 'Review change',
    triggerVariant: 'outline',
    dialogTitle: 'Review change',
    dialogDescription: 'Confirm the updated workspace name.',
  },
  {
    title: 'Custom Close Button',
    description:
      'Compose the footer with bound close attributes for a labeled dismiss action.',
    kind: 'share',
    triggerLabel: 'Share',
    triggerVariant: 'outline',
    dialogTitle: 'Share link',
    dialogDescription: 'Anyone who has this link will be able to view this.',
  },
  {
    title: 'No Close Button',
    description:
      'showCloseButton hides the corner action while Escape and the backdrop still dismiss.',
    kind: 'noClose',
    triggerLabel: 'No Close Button',
    triggerVariant: 'outline',
    dialogTitle: 'No Close Button',
    dialogDescription:
      "This dialog doesn't have a close button in the top-right corner.",
  },
  {
    title: 'Sticky Footer',
    description:
      'Scrollable content keeps the footer actions visible while long copy scrolls.',
    kind: 'sticky',
    triggerLabel: 'Sticky Footer',
    triggerVariant: 'outline',
    dialogTitle: 'Sticky Footer',
    dialogDescription:
      'This dialog has a sticky footer that stays visible while the content scrolls.',
  },
  {
    title: 'Scrollable Content',
    description:
      'Overflowing content scrolls inside the panel instead of stretching it.',
    kind: 'scroll',
    triggerLabel: 'Scrollable Content',
    triggerVariant: 'outline',
    dialogTitle: 'Scrollable Content',
    dialogDescription: 'This is a dialog with scrollable content.',
  },
  {
    title: 'RTL',
    description:
      'A dir="rtl" layout override mirrors the panel for right-to-left copy.',
    kind: 'rtl',
    triggerLabel: 'افتح الحوار',
    triggerVariant: 'outline',
    dialogTitle: 'تعديل الملف الشخصي',
    dialogDescription:
      'قم بإجراء تغييرات على ملفك الشخصي هنا. انقر على حفظ عند الانتهاء.',
  },
]

export const dialogShareUrl = 'https://creaseui.com/docs/components/button'

export const dialogLorem =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

export const dialogRtlFields = [
  { id: 'name-1', label: 'الاسم', value: 'Pedro Duarte' },
  { id: 'username-1', label: 'اسم المستخدم', value: '@peduarte' },
] as const

const emitStyles = `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  compact: { maxWidth: '24rem' },
  shareWidth: { maxWidth: '28rem' },
  scrollArea: { marginInline: '-1rem', maxHeight: '50vh', overflowY: 'auto', paddingInline: '1rem' },
  lorem: { lineHeight: 'normal', marginBlockEnd: '1rem' },
  fieldGrid: { display: 'grid', gap: '1rem' },
  shareRow: { alignItems: 'center', display: 'flex', gap: '0.5rem' },
  shareCol: { display: 'grid', flex: '1 1 0%', gap: '0.5rem' },
  srOnly: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 },
  copy: { fontSize: '0.875rem', lineHeight: '1.25rem' },
})`

const emitContent = (fixture: DialogFixture, isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  switch (fixture.kind) {
    case 'profile':
      return `content: () => [
        Field.fieldGroup({ children: [
          Field.field({ children: [
            Field.fieldLabel({ for: 'name-1', children: ['Name'] }, h),
            Input.input({ id: 'name-1', value: model.name, onInput: value => ChangedName({ value }) }, h),
          ] }, h),
          Field.field({ children: [
            Field.fieldLabel({ for: 'username-1', children: ['Username'] }, h),
            Input.input({ id: 'username-1', value: model.username, onInput: value => ChangedUsername({ value }) }, h),
          ] }, h),
        ] }, h),
      ],`
    case 'compact':
      return `content: () => [
        h.p([h.Class(${cls('text-sm', 'styles.copy')})], [
          'Dialog content remains ordinary Foldkit Html.',
        ]),
      ],`
    case 'share':
      return `content: () => [
        h.div([h.Class(${cls('flex items-center gap-2', 'styles.shareRow')})], [
          h.div([h.Class(${cls('grid flex-1 gap-2', 'styles.shareCol')})], [
            h.label([h.For('link'), h.Class(${cls('sr-only', 'styles.srOnly')})], ['Link']),
            Input.input({ id: 'link', value: '${dialogShareUrl}', isReadOnly: true }, h),
          ]),
        ]),
      ],`
    case 'noClose':
      return ''
    case 'sticky':
    case 'scroll':
      return `content: () => [
        h.div(
          [h.Class(${cls('-mx-4 max-h-[50vh] overflow-y-auto px-4', 'styles.scrollArea')})],
          Array.from({ length: 10 }).map((_, index) =>
            h.p([h.Key(String(index)), h.Class(${cls('mb-4 leading-normal', 'styles.lorem')})], [
              '${dialogLorem}',
            ]),
          ),
        ),
      ],`
    case 'rtl':
      return ''
  }
}

const emitActionClass = (
  isStyleX: boolean,
  variant: 'default' | 'outline',
): string => {
  const options =
    variant === 'outline'
      ? "{ variant: 'outline', size: 'lg' }"
      : "{ size: 'lg' }"
  return isStyleX
    ? `className(...Button.buttonVisualStyles(${options}))`
    : `cn(Button.buttonVariants(${options}), 'transition-colors motion-reduce:transition-none')`
}

const emitFooter = (fixture: DialogFixture, isStyleX: boolean): string => {
  switch (fixture.kind) {
    case 'profile':
      return `footer: slots => [
        h.button([
          ...slots.closeButton,
          ...slots.initialFocusAttributes(),
          h.Type('button'),
          h.Class(${emitActionClass(isStyleX, 'outline')}),
        ], ['Cancel']),
        h.button([
          ...slots.closeButton,
          h.Type('button'),
          h.Class(${emitActionClass(isStyleX, 'default')}),
        ], ['Save changes']),
      ],`
    case 'compact':
      return `footer: slots => [
        h.button([
          ...slots.closeButton,
          ...slots.initialFocusAttributes(),
          h.Type('button'),
          h.Class(${emitActionClass(isStyleX, 'outline')}),
        ], ['Back']),
        h.button([
          ...slots.closeButton,
          h.Type('button'),
          h.Class(${emitActionClass(isStyleX, 'default')}),
        ], ['Confirm']),
      ],`
    case 'share':
      return `footer: slots => [
        h.button([
          ...slots.closeButton,
          h.Type('button'),
          h.Class(${emitActionClass(isStyleX, 'outline')}),
        ], ['Close']),
      ],`
    case 'sticky':
      return `footer: slots => [
        h.button([
          ...slots.closeButton,
          h.Type('button'),
          h.Class(${emitActionClass(isStyleX, 'outline')}),
        ], ['Close']),
      ],`
    case 'noClose':
    case 'scroll':
    case 'rtl':
      return ''
  }
}

const emitMaxWidth = (fixture: DialogFixture, isStyleX: boolean): string => {
  switch (fixture.kind) {
    case 'profile':
    case 'compact':
    case 'rtl':
      return isStyleX
        ? '      layoutStyle: layoutStyle({ maxWidth: "24rem" }),\n'
        : "      class: 'sm:max-w-sm',\n"
    case 'share':
      return isStyleX
        ? '      layoutStyle: layoutStyle({ maxWidth: "28rem" }),\n'
        : "      class: 'sm:max-w-md',\n"
    default:
      return ''
  }
}

const emitRtlLayout = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  return `layout: parts => [
        h.div([h.Dir('rtl'), h.Class(${cls('grid gap-4', 'styles.fieldGrid')})], [
          parts.header({
            children: [
              parts.title({ children: ['تعديل الملف الشخصي'] }),
              parts.description({ children: ['قم بإجراء تغييرات على ملفك الشخصي هنا. انقر على حفظ عند الانتهاء.'] }),
            ],
          }),
          Field.fieldGroup({ children: [
            Field.field({ children: [
              Field.fieldLabel({ for: 'name-1', children: ['الاسم'] }, h),
              Input.input({ id: 'name-1', value: model.name, onInput: value => ChangedName({ value }) }, h),
            ] }, h),
            Field.field({ children: [
              Field.fieldLabel({ for: 'username-1', children: ['اسم المستخدم'] }, h),
              Input.input({ id: 'username-1', value: model.username, onInput: value => ChangedUsername({ value }) }, h),
            ] }, h),
          ] }, h),
          parts.footer({
            children: [
              h.button([
                ...parts.closeButtonAttributes,
                ...parts.initialFocusAttributes(),
                h.Type('button'),
                h.Class(${emitActionClass(isStyleX, 'outline')}),
              ], ['إلغاء']),
              h.button([
                ...parts.closeButtonAttributes,
                h.Type('button'),
                h.Class(${emitActionClass(isStyleX, 'default')}),
              ], ['حفظ التغييرات']),
            ],
          }),
          parts.close({}),
        ]),
      ],`
}

const hasInputs = (kind: DialogFixtureKind): boolean =>
  kind === 'profile' || kind === 'rtl'

const sq = (value: string): string => value.replaceAll("'", "\\'")

const dialogSource = (
  fixture: DialogFixture,
  _index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const isStyleX = renderer !== 'tailwind'
  const inputs = hasInputs(fixture.kind)
  const rtl = fixture.kind === 'rtl'
  return foldkitApplication({
    title: `Dialog — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'\n" : fixture.kind === 'noClose' || fixture.kind === 'scroll' ? '' : "\nimport { cn } from '@/lib/utils'\n"}
import * as Button from '@/${isStyleX ? 'stylex' : 'ui'}/button'
import * as Dialog from '@/${isStyleX ? 'stylex' : 'ui'}/dialog'${inputs || fixture.kind === 'share' ? `\nimport * as Field from '@/${isStyleX ? 'stylex' : 'ui'}/field'\nimport * as Input from '@/${isStyleX ? 'stylex' : 'ui'}/input'` : ''}${isStyleX ? `\n\n${emitStyles}` : ''}`,
    model: `export const Model = S.Struct({ dialog: Dialog.Model${inputs ? ', name: S.String, username: S.String' : ''} })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ClickedOpen = taggedStruct('ClickedOpen${tag}');
export const GotDialogMessage = taggedStruct('GotDialogMessage${tag}', { message: Dialog.Message });${
      inputs
        ? `
export const ChangedName = taggedStruct('ChangedName${tag}', { value: S.String });
export const ChangedUsername = taggedStruct('ChangedUsername${tag}', { value: S.String });`
        : ''
    }
export const Message = S.Union([ClickedOpen, GotDialogMessage${inputs ? ', ChangedName, ChangedUsername' : ''}])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { dialog: Dialog.init({ id: 'dialog-${tag.toLowerCase()}', isAnimated: true })${inputs ? ", name: 'Pedro Duarte', username: '@peduarte'" : ''} } })`,
    update: `const mapDialog = (
  model: Model,
  result: ReturnType<typeof Dialog.update>,
): Update.Return<Model, Message> => {
  return { model: { ...model, dialog: result.model }, commands: Command.mapMessages(result.commands, next => GotDialogMessage({ message: next })) }
}

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedOpen${tag}':
      return mapDialog(model, Dialog.open(model.dialog))
    case 'GotDialogMessage${tag}':
      return mapDialog(model, Dialog.update(model.dialog, message.message))${
        inputs
          ? `
    case 'ChangedName${tag}':
      return { model: { ...model, name: message.value } }
    case 'ChangedUsername${tag}':
      return { model: { ...model, username: message.value } }`
          : ''
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Dialog — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    Button.button({
      onClick: ClickedOpen(),${fixture.triggerVariant === 'outline' ? "\n      variant: 'outline'," : ''}
      children: ['${fixture.triggerLabel}'],
    }, h),
    Dialog.dialog({
      model: model.dialog,
      toParentMessage: message => GotDialogMessage({ message }),
      title: '${sq(fixture.dialogTitle)}',${fixture.dialogDescription === undefined ? '' : `\n      description: '${sq(fixture.dialogDescription)}',`}
${emitMaxWidth(fixture, isStyleX)}${fixture.kind === 'noClose' ? '      showCloseButton: false,\n' : ''}${
      rtl
        ? `      ${emitRtlLayout(isStyleX)}\n`
        : `      ${emitContent(fixture, isStyleX)}
      ${emitFooter(fixture, isStyleX)}\n`
    }    }, h),
  ]),
})`,
  })
}

const dialogExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  dialogFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: dialogSource(fixture, index, renderer),
  }))

export const dialogExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, dialogExamplesFor(renderer))
