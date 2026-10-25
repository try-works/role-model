import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type MoreMenuItemSpec = Readonly<{
  type?: 'action'
  label: string
  icon?: 'copy' | 'pencil' | 'share' | 'trash-2'
  variant?: 'destructive'
}>

export type MoreMenuOptionSpec =
  | MoreMenuItemSpec
  | Readonly<{ type: 'divider' }>
  | Readonly<{
      type: 'section'
      title: string
      items: ReadonlyArray<MoreMenuItemSpec>
    }>

export type MoreMenuFixture = Readonly<{
  title: string
  description: string
  variant?: 'secondary'
  label?: string
  options: ReadonlyArray<MoreMenuOptionSpec>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/MoreMenu/*.tsx + *.doc.mjs.
   'MoreMenu — Bottom Sheet' is skipped: astryx's presentation='bottom-sheet'
   has no crease primitive. Heroicons map to lucide: PencilIcon→pencil,
   DocumentDuplicateIcon→copy, ShareIcon→share, TrashIcon→trash-2. */
export const moreMenuFixtures: Readonly<
  [MoreMenuFixture, ...Array<MoreMenuFixture>]
> = [
  {
    title: 'MoreMenu',
    description: 'A basic three-dot menu with simple action items.',
    options: [{ label: 'Edit' }, { label: 'Duplicate' }, { label: 'Delete' }],
  },
  {
    title: 'MoreMenu — Default',
    description:
      'Basic three-dot overflow menu with simple text-only action items.',
    options: [{ label: 'Edit' }, { label: 'Duplicate' }, { label: 'Delete' }],
  },
  {
    title: 'MoreMenu — With Dividers',
    description:
      'A three-dot menu with a divider separating destructive actions from safe ones.',
    variant: 'secondary',
    options: [
      { label: 'Edit', icon: 'pencil' },
      { label: 'Duplicate', icon: 'copy' },
      { type: 'divider' },
      { label: 'Delete', icon: 'trash-2' },
    ],
  },
  {
    title: 'MoreMenu — With Sections',
    description: 'A three-dot menu with actions organized into labeled groups.',
    variant: 'secondary',
    label: 'Document actions',
    options: [
      {
        type: 'section',
        title: 'Actions',
        items: [
          { label: 'Edit', icon: 'pencil' },
          { label: 'Duplicate', icon: 'copy' },
        ],
      },
      {
        type: 'section',
        title: 'Danger zone',
        items: [{ label: 'Delete', icon: 'trash-2' }],
      },
    ],
  },
]

/** Builds the MoreMenuOption list for a fixture; makeIcon is renderer-owned. */
export const fixtureOptions = <IconHtml>(
  fixture: MoreMenuFixture,
  makeIcon: (name: string) => IconHtml,
): ReadonlyArray<
  | Readonly<{ label: string; icon?: IconHtml; variant?: 'destructive' }>
  | Readonly<{ type: 'divider' }>
  | Readonly<{
      type: 'section'
      title: string
      items: ReadonlyArray<
        Readonly<{ label: string; icon?: IconHtml; variant?: 'destructive' }>
      >
    }>
> =>
  fixture.options.map(option => {
    if (option.type === 'divider') {
      return { type: 'divider' } as const
    }
    if (option.type === 'section') {
      return {
        type: 'section' as const,
        title: option.title,
        items: option.items.map(item => ({
          label: item.label,
          ...(item.icon === undefined ? {} : { icon: makeIcon(item.icon) }),
          ...(item.variant === 'destructive'
            ? { variant: 'destructive' as const }
            : {}),
        })),
      }
    }
    return {
      label: option.label,
      ...(option.icon === undefined ? {} : { icon: makeIcon(option.icon) }),
      ...(option.variant === 'destructive'
        ? { variant: 'destructive' as const }
        : {}),
    }
  })

// ---------- generated example source ----------

const optionSource = (option: MoreMenuOptionSpec): string => {
  if (option.type === 'divider') {
    return `{ type: 'divider' }`
  }
  if (option.type === 'section') {
    return `{
      type: 'section',
      title: '${option.title}',
      items: [
        ${option.items.map(itemSource).join(',\n        ')},
      ],
    }`
  }
  return itemSource(option)
}

const itemSource = (item: MoreMenuItemSpec): string => {
  const fields: Array<string> = [`label: '${item.label}'`]
  if (item.icon !== undefined) {
    fields.push(`icon: Icon.icon('${item.icon}', { class: 'size-4' }, h)`)
  }
  if (item.variant === 'destructive') {
    fields.push(`variant: 'destructive'`)
  }
  return `{ ${fields.join(', ')} }`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = moreMenuFixtures[index] ?? moreMenuFixtures[0]
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const uiDir = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const usesIcons = fixture.options.some(
    option =>
      (option.type === 'section' &&
        option.items.some(item => item.icon !== undefined)) ||
      (option.type !== 'divider' &&
        option.type !== 'section' &&
        option.icon !== undefined),
  )
  return foldkitApplication({
    title: `More Menu — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as MoreMenu from '@/${uiDir}/more-menu'${usesIcons ? `\nimport * as Icon from '@/lib/icon'` : ''}`,
    model: `export const Model = S.Struct({
  menu: MoreMenu.Model,
  maybeLastAction: S.Option(S.String),
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotMenuMessage = taggedStruct('GotMoreMenuMessage${tag}', { message: MoreMenu.Message });
export const Message = S.Union([GotMenuMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    menu: MoreMenu.init({ id: 'more-menu-${tag.toLowerCase()}', isAnimated: true }),
    maybeLastAction: Option.none(),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotMoreMenuMessage${tag}': {
      const menuOp__ = MoreMenu.update(model.menu, message.message);
      const menu = menuOp__.model;
      const commands = menuOp__.commands ?? [];
      const maybeSelection = Option.fromNullishOr(menuOp__.outMessage);
      const maybeLastAction = Option.match(maybeSelection, {
        onNone: () => model.maybeLastAction,
        onSome: selection => Option.some(selection.value),
      });
      return {
        model: { ...model, menu, maybeLastAction },
        commands: Command.mapMessages(commands, next => GotMenuMessage({ message: next })),
      };
    }
  }
}`,
    view: `${renderer !== 'tailwind' ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'More Menu — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen flex-col items-center justify-center gap-4 p-8'"})], [
    MoreMenu.moreMenu({
      model: model.menu,
      toParentMessage: message => GotMenuMessage({ message }),${fixture.variant === undefined ? '' : `\n      variant: '${fixture.variant}',`}${fixture.label === undefined ? '' : `\n      label: '${fixture.label}',`}
      items: [
        ${fixture.options.map(optionSource).join(',\n        ')},
      ],
    }, h),
    h.p([h.Role('status'), h.Class('text-sm text-muted-foreground')], [
      Option.match(model.maybeLastAction, {
        onNone: () => 'No action selected.',
        onSome: action => \`Selected: \${action}\`,
      }),
    ]),
  ]),
})`,
  })
}

const moreMenuExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  moreMenuFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const moreMenuExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, moreMenuExamplesFor(renderer))
