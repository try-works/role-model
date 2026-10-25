import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type Guest = Readonly<{ id: string; name: string; email: string }>

export type ListInputFixture = Readonly<{
  title: string
  description: string
  initialGuests: ReadonlyArray<Guest>
  isReorderable?: boolean
  maxItems?: number
  hasFieldStatus?: boolean
  hasListStatus?: boolean
}>

/* No Astryx example blocks exist for ListInput (packages/lab); these demos
   derive from ListInput.doc.mjs' "Controlled guest list" usage block and
   ListInput.test.tsx behaviors. */
export const listInputFixtures: Readonly<
  [ListInputFixture, ...Array<ListInputFixture>]
> = [
  {
    title: 'List Input',
    description:
      'A compact, ordered collection editor with add, remove, and optional reordering.',
    initialGuests: [
      { id: 'g-1', name: 'Ada Lovelace', email: 'ada@example.com' },
      { id: 'g-2', name: 'Grace Hopper', email: 'grace@example.com' },
    ],
  },
  {
    title: 'Controlled guest list',
    description:
      'Typed columns, reordering, per-field validation on empty emails, and a list-level error while empty.',
    initialGuests: [
      { id: 'g-1', name: 'Ada Lovelace', email: 'ada@example.com' },
    ],
    isReorderable: true,
    maxItems: 6,
    hasFieldStatus: true,
    hasListStatus: true,
  },
]

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = listInputFixtures[index] ?? listInputFixtures[0]
  const guestLines = fixture.initialGuests
    .map(
      guest =>
        `    { id: '${guest.id}', name: '${guest.name}', email: '${guest.email}' },`,
    )
    .join('\n')
  const extraProps = `${fixture.isReorderable === true ? '\n        isReorderable: true,' : ''}${fixture.maxItems === undefined ? '' : `\n        maxItems: ${fixture.maxItems},`}${
    fixture.hasFieldStatus === true
      ? `
        getFieldStatus: (guest, key) =>
          key === 'email' && guest.email === ''
            ? { type: 'error' as const, message: 'Enter an email address' }
            : undefined,`
      : ''
  }${
    fixture.hasListStatus === true
      ? `
        ...(model.guests.length === 0
          ? { status: { type: 'error' as const, message: 'Add at least one guest' } }
          : {}),`
      : ''
  }`
  return foldkitApplication({
    title: `ListInput — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Input from '@/${ui(renderer)}/input'
import * as ListInput from '@/${ui(renderer)}/list-input'`,
    model: `type Guest = Readonly<{ id: string; name: string; email: string }>

export const Model = S.Struct({
  input: ListInput.Model,
  guests: S.Array(S.Struct({ id: S.String, name: S.String, email: S.String })),
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotListInputMessage = taggedStruct('GotListInputMessage', { message: ListInput.Message });
export const ChangedGuests = taggedStruct('ChangedGuests', { guests: S.Array(S.Struct({ id: S.String, name: S.String, email: S.String })) });
export const Message = S.Union([GotListInputMessage, ChangedGuests])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {
    input: ListInput.init({ id: 'docs-list-input' }),
    guests: [
${guestLines}
    ],
  } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedGuests':
      return { model: { ...model, guests: [...message.guests] } }
    case 'GotListInputMessage': {
      const next = ListInput.update(model.input, message.message)
      const commands = next.commands ?? []
      const guests = (() => {
        const out = next.outMessage
        if (out === undefined) return model.guests
        switch (out._tag) {
          case 'ItemAdded':
            return [...model.guests, out.item as Guest]
          case 'ItemRemoved':
            return model.guests.filter((_, i) => i !== out.index)
          case 'ItemUpdated':
            return model.guests.map((guest, i) =>
              i === out.index ? (out.nextItem as Guest) : guest,
            )
          case 'ItemReordered':
            return ListInput.moveItem(model.guests, out.fromIndex, out.toIndex)
        }
      })()
      return {
        model: { ...model, input: next.model, guests },
        commands: Command.mapMessages(commands, next2 =>
          GotListInputMessage({ message: next2 }),
        ),
      }
    }
  }
}`,
    view: `const guestColumns = (h: HtmlBuilder<Message>): ReadonlyArray<ListInput.ListInputColumn<Guest, Message>> => [
  {
    key: 'name',
    header: 'Name',
    width: { type: 'proportional', value: 1 },
    renderInput: ctx =>
      Input.input(
        {
          id: \`docs-list-input-name-\${ctx.index}\`,
          value: ctx.item.name,
          onChange: name => ctx.updateItem({ ...ctx.item, name }, 'name'),
          isDisabled: ctx.isDisabled,
          isInvalid: ctx.status?.type === 'error',
        },
        h,
      ),
  },
  {
    key: 'email',
    header: 'Email',
    width: { type: 'proportional', value: 2 },
    renderInput: ctx =>
      Input.input(
        {
          id: \`docs-list-input-email-\${ctx.index}\`,
          type: 'email',
          value: ctx.item.email,
          onChange: email => ctx.updateItem({ ...ctx.item, email }, 'email'),
          isDisabled: ctx.isDisabled,
          isInvalid: ctx.status?.type === 'error',
        },
        h,
      ),
  },
]

${renderer !== 'tailwind' ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'mx-auto flex min-h-screen w-full max-w-2xl items-center p-8'"})], [
    ListInput.listInput(
      {
        model: model.input,
        toParentMessage: message => GotListInputMessage({ message }),
        id: 'docs-list-input',
        label: 'Guests',
        itemName: 'guest',
        value: model.guests,
        getItemKey: guest => guest.id,
        createItem: () => ({ id: \`g-\${String(model.guests.length + 1)}\`, name: '', email: '' }),
        columns: guestColumns(h),${extraProps}
      },
      h,
    ),
  ]),
})`,
  })
}

const listInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  listInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const listInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, listInputExamplesFor(renderer))
