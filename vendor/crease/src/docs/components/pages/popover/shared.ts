import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left'
export type PopoverAlign = 'start' | 'center' | 'end'

export type PopoverInstance = Readonly<{
  id: string
  trigger: string
  side: PopoverSide
  align: PopoverAlign
  text: string
  rtl?: boolean
}>

export const popoverFixtures = [
  { title: 'Basic', kind: 'basic' },
  {
    title: 'Align',
    kind: 'align',
    instances: [
      {
        id: 'start',
        trigger: 'Start',
        side: 'bottom',
        align: 'start',
        text: 'Aligned to start',
      },
      {
        id: 'center',
        trigger: 'Center',
        side: 'bottom',
        align: 'center',
        text: 'Aligned to center',
      },
      {
        id: 'end',
        trigger: 'End',
        side: 'bottom',
        align: 'end',
        text: 'Aligned to end',
      },
    ],
  },
  { title: 'With Form', kind: 'form' },
  {
    title: 'Interactive content',
    description:
      'A bottom-start panel whose child update and effect commands are delegated by the parent.',
    kind: 'legacy',
    side: 'bottom',
    align: 'start',
  },
  {
    title: 'Right aligned',
    description:
      'Placement is an input to the same complete submodel integration.',
    kind: 'legacy',
    side: 'right',
    align: 'center',
  },
  {
    title: 'RTL',
    kind: 'rtl',
    instances: [
      {
        id: 'left',
        trigger: 'يسار',
        side: 'left',
        align: 'center',
        text: 'left',
        rtl: true,
      },
      {
        id: 'top',
        trigger: 'أعلى',
        side: 'top',
        align: 'center',
        text: 'top',
        rtl: true,
      },
      {
        id: 'bottom',
        trigger: 'أسفل',
        side: 'bottom',
        align: 'center',
        text: 'bottom',
        rtl: true,
      },
      {
        id: 'right',
        trigger: 'يمين',
        side: 'right',
        align: 'center',
        text: 'right',
        rtl: true,
      },
    ],
  },
] as const

export type PopoverFixture = (typeof popoverFixtures)[number]

const escape = (value: string): string => value.replaceAll(`'`, `\\'`)

const legacySource = (
  fixture: { title: string; side: string; align: string },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `Popover — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'\n" : ''}
import * as Popover from '@/${isStyleX ? 'stylex' : 'ui'}/popover'${isStyleX ? "\n\nconst styles = stylex.create({\n  content: { display: 'grid', gap: '0.5rem' },\n  heading: { fontWeight: 500 },\n  copy: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },\n  input: { borderColor: 'var(--border)', borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px', paddingBlock: '0.5rem', paddingInline: '0.75rem' },\n})" : ''}`,
    model: `export const Model = S.Struct({ popover: Popover.Model })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotPopoverMessage = taggedStruct('GotPopoverMessage${tag}', { message: Popover.Message });
export const Message = S.Union([GotPopoverMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { popover: Popover.init({ id: 'dimensions-popover', isAnimated: true, contentFocus: true }) } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotPopoverMessage${tag}': {
      const popoverOp__ = Popover.update(model.popover, message.message);
    const popover = popoverOp__.model;
    const commands = popoverOp__.commands ?? [];
      return { model: { ...model, popover }, commands: Command.mapMessages(commands, next => GotPopoverMessage({ message: next })) }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Popover — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    Popover.popover({
      model: model.popover,
      toParentMessage: message => GotPopoverMessage({ message }),
      trigger: 'Open dimensions',
      ${isStyleX ? "triggerButtonVariant: 'outline'," : "triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',"}
      side: '${fixture.side}',
      align: '${fixture.align}',
      content: h.div([h.Class(${isStyleX ? 'className(styles.content)' : "'grid gap-2'"})], [
        h.h4([h.Class(${isStyleX ? 'className(styles.heading)' : "'font-medium'"})], ['Dimensions']),
        h.p([h.Class(${isStyleX ? 'className(styles.copy)' : "'text-sm text-muted-foreground'"})], ['Set the dimensions for the layer.']),
        h.input([h.Type('number'), h.AriaLabel('Width'), h.Class(${isStyleX ? 'className(styles.input)' : "'rounded-md border px-3 py-2'"})]),
      ]),
    }, h),
  ]),
})`,
  })
}

const STYLES_BLOCK = `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  wrap: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem' },
  panel: { width: '10rem' },
  panelWide: { width: '16rem' },
  content: { display: 'grid', gap: '0.5rem' },
  contentWide: { display: 'grid', gap: '1rem' },
  heading: { fontWeight: 500 },
  copy: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },
  fieldGroup: { display: 'grid', gap: '1rem' },
  labelHalf: { width: '50%' },
})
`

const basicSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: 'Popover — Basic',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
`
    : ''
}
import * as Popover from '@/${isStyleX ? 'stylex' : 'ui'}/popover'${isStyleX ? STYLES_BLOCK : ''}`,
    model: `export const Model = S.Struct({ popover: Popover.Model })
export type Model = typeof Model.Type`,
    messages: `export const GotPopoverMessage = taggedStruct('GotPopoverMessageBasic', {
  message: Popover.Message,
})
export const Message = S.Union([GotPopoverMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { popover: Popover.init({ id: 'basic-popover', isAnimated: true, contentFocus: true }) },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotPopoverMessageBasic': {
      const next = Popover.update(model.popover, message.message)
      const commands = next.commands ?? []
      return {
        model: { ...model, popover: next.model },
        commands: Command.mapMessages(commands, next =>
          GotPopoverMessage({ message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Popover — Basic',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    Popover.popover({
      model: model.popover,
      toParentMessage: message => GotPopoverMessage({ message }),
      trigger: 'Open Popover',
      ${isStyleX ? "triggerButtonVariant: 'outline'," : "triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',"}
      align: 'start',
      content: h.div([h.Class(${isStyleX ? 'className(styles.content)' : "'grid gap-2'"})], [
        h.h4([h.Class(${isStyleX ? 'className(styles.heading)' : "'font-medium'"})], ['Dimensions']),
        h.p([h.Class(${isStyleX ? 'className(styles.copy)' : "'text-sm text-muted-foreground'"})], ['Set the dimensions for the layer.']),
      ]),
    }, h),
  ]),
})`,
  })
}

const multiSource = (
  fixture: { title: string; instances: ReadonlyArray<PopoverInstance> },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const headerEmit = (
    text: string,
    rtl: boolean,
  ): string => `h.div([h.Class(${isStyleX ? 'className(styles.content)' : "'grid gap-2'"})], [
          h.h4([h.Class(${isStyleX ? 'className(styles.heading)' : "'font-medium'"})], ['${rtl ? 'الأبعاد' : 'Dimensions'}']),
          h.p([h.Class(${isStyleX ? 'className(styles.copy)' : "'text-sm text-muted-foreground'"})], ['${rtl ? 'تعيين الأبعاد للطبقة.' : text}']),
        ])`
  const popoverEmit = (
    instance: PopoverInstance,
  ): string => `    Popover.popover({
      model: model.popovers['${instance.id}'] ?? Popover.init({ id: 'popover-${instance.id}', isAnimated: true, contentFocus: true }),
      toParentMessage: message => GotPopoverMessage({ id: '${instance.id}', message }),
      trigger: '${escape(instance.trigger)}',
      ${isStyleX ? "triggerButtonVariant: 'outline',\n      triggerButtonSize: 'sm'," : "triggerClass: 'rounded-md border px-3 py-1.5 text-sm',"}
      side: '${instance.side}',
      align: '${instance.align}',${
        instance.rtl === true
          ? `
      direction: 'rtl',
      ${isStyleX ? 'layoutStyle: layoutStyle({ width: "10rem" }),' : "class: 'w-40',"}
      content: ${headerEmit(instance.text, true)},`
          : `
      ${isStyleX ? 'layoutStyle: layoutStyle({ width: "10rem" }),' : "class: 'w-40',"}
      content: '${escape(instance.text)}',`
      }
    }, h)`
  return foldkitApplication({
    title: `Popover — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
`
    : ''
}
import * as Popover from '@/${isStyleX ? 'stylex' : 'ui'}/popover'${isStyleX ? STYLES_BLOCK : ''}`,
    model: `export const Model = S.Struct({
  popovers: S.Record(S.String, Popover.Model),
})
export type Model = typeof Model.Type`,
    messages: `export const GotPopoverMessage = taggedStruct('GotPopoverMessage${tag}', {
  id: S.String,
  message: Popover.Message,
})
export const Message = S.Union([GotPopoverMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    popovers: {
${fixture.instances.map(instance => `      '${instance.id}': Popover.init({ id: 'popover-${instance.id}', isAnimated: true, contentFocus: true }),`).join('\n')}
    },
  },
})`,
    update: `const mapPopover = (
  model: Model,
  id: string,
  result: ReturnType<typeof Popover.update>,
): Update.Return<Model, Message> => {
  const commands = result.commands ?? []
  return {
    model: {
      ...model,
      popovers: { ...model.popovers, [id]: result.model },
    },
    commands: Command.mapMessages(commands, next =>
      GotPopoverMessage({ id, message: next })),
  }
}

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotPopoverMessage${tag}': {
      const popover = model.popovers[message.id]
      if (popover === undefined) {
        return { model }
      }
      return mapPopover(model, message.id, Popover.update(popover, message.message))
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Popover — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    h.div([h.Class(${isStyleX ? 'className(styles.wrap)' : "'flex flex-wrap justify-center gap-6'"})], [
${fixture.instances.map(popoverEmit).join(',\n')}
    ]),
  ]),
})`,
  })
}

const formSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const fieldEmit = (
    id: string,
    label: string,
    value: string,
  ): string => `          Field.field({ orientation: 'horizontal', children: [
            Field.fieldLabel({ for: '${id}', children: ['${label}']${isStyleX ? ', layoutStyle: layoutStyle({ width: "50%" })' : ", class: 'w-1/2'"} }, h),
            Input.input({
              id: '${id}',
              value: model.values['${id}'] ?? '${value}',
              onInput: value => ChangedFieldInput({ id: '${id}', value }),
            }, h),
          ] }, h)`
  return foldkitApplication({
    title: 'Popover — With Form',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
`
    : ''
}
import * as Field from '@/${isStyleX ? 'stylex' : 'ui'}/field'
import * as Input from '@/${isStyleX ? 'stylex' : 'ui'}/input'
import * as Popover from '@/${isStyleX ? 'stylex' : 'ui'}/popover'${isStyleX ? STYLES_BLOCK : ''}`,
    model: `export const Model = S.Struct({
  popover: Popover.Model,
  values: S.Record(S.String, S.String),
})
export type Model = typeof Model.Type`,
    messages: `export const GotPopoverMessage = taggedStruct('GotPopoverMessageWithForm', {
  message: Popover.Message,
})
export const ChangedFieldInput = taggedStruct('ChangedFieldInputWithForm', {
  id: S.String,
  value: S.String,
})
export const Message = S.Union([GotPopoverMessage, ChangedFieldInput])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    popover: Popover.init({ id: 'form-popover', isAnimated: true, contentFocus: true }),
    values: { width: '100%', height: '25px' },
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedFieldInputWithForm':
      return {
        model: {
          ...model,
          values: { ...model.values, [message.id]: message.value },
        },
      }
    case 'GotPopoverMessageWithForm': {
      const next = Popover.update(model.popover, message.message)
      const commands = next.commands ?? []
      return {
        model: { ...model, popover: next.model },
        commands: Command.mapMessages(commands, next =>
          GotPopoverMessage({ message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Popover — With Form',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    Popover.popover({
      model: model.popover,
      toParentMessage: message => GotPopoverMessage({ message }),
      trigger: 'Open Popover',
      ${isStyleX ? "triggerButtonVariant: 'outline'," : "triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',"}
      align: 'start',
      ${isStyleX ? '' : "class: 'w-64',"}
      content: h.div([h.Class(${isStyleX ? 'className(styles.content)' : "'grid gap-4'"})], [
        h.div([h.Class(${isStyleX ? 'className(styles.content)' : "'grid gap-2'"})], [
          h.h4([h.Class(${isStyleX ? 'className(styles.heading)' : "'font-medium'"})], ['Dimensions']),
          h.p([h.Class(${isStyleX ? 'className(styles.copy)' : "'text-sm text-muted-foreground'"})], ['Set the dimensions for the layer.']),
        ]),
        h.div([h.Class(${isStyleX ? 'className(styles.fieldGroup)' : "'grid gap-4'"})], [
${fieldEmit('width', 'Width', '100%')},
${fieldEmit('height', 'Height', '25px')},
        ]),
      ]),
    }, h),
  ]),
})`,
  })
}

const popoverExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  popoverFixtures.map(fixture => ({
    title: fixture.title,
    ...('description' in fixture ? { description: fixture.description } : {}),
    code:
      fixture.kind === 'legacy'
        ? legacySource(fixture, renderer)
        : fixture.kind === 'basic'
          ? basicSource(renderer)
          : fixture.kind === 'form'
            ? formSource(renderer)
            : multiSource(fixture, renderer),
  }))

export const popoverExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, popoverExamplesFor(renderer))
