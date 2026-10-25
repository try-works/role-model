import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export type EmptyKind =
  | 'demo'
  | 'outline'
  | 'background'
  | 'avatar'
  | 'avatarGroup'
  | 'inputGroup'
  | 'rtl'

export type EmptyFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: EmptyKind
}>

export const emptyFixtures: ReadonlyArray<EmptyFixture> = [
  { title: 'Create a project', heroOnly: true, kind: 'demo' },
  {
    title: 'Outline',
    description:
      'A dashed border turns the empty state into a drop-zone style surface.',
    kind: 'outline',
  },
  {
    title: 'Background',
    description:
      'A muted background keeps the empty state present without a border.',
    kind: 'background',
  },
  {
    title: 'Avatar',
    description:
      'EmptyMedia can hold a single Avatar to explain who the state belongs to.',
    kind: 'avatar',
  },
  {
    title: 'Avatar Group',
    description: 'An AvatarGroup inside EmptyMedia covers shared collections.',
    kind: 'avatarGroup',
  },
  {
    title: 'InputGroup',
    description:
      'EmptyContent can host a search InputGroup with addons and a shortcut hint.',
    kind: 'inputGroup',
  },
  {
    title: 'RTL',
    description:
      'Wrap the composition in dir="rtl" to mirror the layout for Arabic.',
    kind: 'rtl',
  },
]

export const emptyRtlCopy = {
  title: 'لا توجد مشاريع بعد',
  description: 'لم تقم بإنشاء أي مشاريع بعد. ابدأ بإنشاء مشروعك الأول.',
  create: 'إنشاء مشروع',
  import: 'استيراد مشروع',
  learnMore: 'تعرف على المزيد',
} as const

const sq = (value: string): string => value.replaceAll("'", "\\'")

const emitStyles = `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  empty: { maxWidth: '36rem', width: '100%' },
  dashedBox: {
    borderColor: 'var(--border)',
    borderStyle: 'dashed',
    borderWidth: '1px',
  },
  backgroundBox: {
    backgroundColor: 'color-mix(in oklab, var(--muted) 30%, transparent)',
    height: '100%',
  },
  avatarSize: { height: '3rem', width: '3rem' },
  avatarRow: {
    display: 'flex',
    marginInlineStart: '-0.5rem',
  },
  actionRow: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
  },
  linkRow: {
    alignItems: 'center',
    color: 'var(--muted-foreground)',
    display: 'inline-flex',
    fontSize: '0.875rem', lineHeight: '1.25rem',
    gap: '0.25rem',
  },
  inputWidth: { width: '75%' },
  descWidth: { maxWidth: '20rem' },
})`

const emitBody = (fixture: EmptyFixture, isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  const emptyProps = isStyleX
    ? `layoutStyle: layoutStyle({ maxWidth: "36rem", width: "100%" }),`
    : `class: 'w-full max-w-xl',`
  const media = (variant: 'icon' | 'default', children: string) =>
    `Empty.emptyMedia({ variant: '${variant}', children: [${children}] }, h)`
  const header = (title: string, description: string, mediaCall: string) =>
    `Empty.emptyHeader({ children: [
        ${mediaCall},
        Empty.emptyTitle({ children: ['${sq(title)}'] }, h),
        Empty.emptyDescription({ children: ['${sq(description)}'] }, h),
      ] }, h)`
  const content = (children: string) =>
    `Empty.emptyContent({ children: [${children}] }, h)`
  const button = (variant: string, label: string, extra?: string) =>
    `Button.button({ variant: '${variant}', size: 'sm', onClick: NoOp(), children: [${extra === undefined ? '' : `${extra}, `}'${sq(label)}'] }, h)`
  switch (fixture.kind) {
    case 'demo': {
      const inner = `Empty.empty({
    ${emptyProps}
    children: [
      ${header(
        'No Projects Yet',
        "You haven't created any projects yet. Get started by creating your first project.",
        media('icon', "Icon.icon('folder-code', {}, h)"),
      )},
      ${content(`h.div([h.Class(${cls('flex-row justify-center gap-2', 'styles.actionRow')})], [
          ${button('default', 'Create Project')},
          ${button('outline', 'Import Project')},
        ])`)},
      h.a([
        h.Href('#'),
        h.Class(${cls('inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline', 'styles.linkRow')}),
      ], ['Learn More', Icon.icon('arrow-up-right', {}, h)]),
    ],
  }, h)`
      return inner
    }
    case 'outline':
      return `${isStyleX ? `h.div([h.Class(className(styles.dashedBox))], [` : ''}Empty.empty({
    ${emptyProps}
    children: [
      ${header(
        'Cloud Storage Empty',
        'Upload files to your cloud storage to access them anywhere.',
        media('icon', "Icon.icon('cloud', {}, h)"),
      )},
      ${content(button('outline', 'Upload Files'))},
    ],
  }, h)${isStyleX ? '])' : ''}`
    case 'background':
      return `${isStyleX ? `h.div([h.Class(className(styles.backgroundBox))], [` : ''}Empty.empty({
    ${emptyProps}
    children: [
      ${header(
        'No Notifications',
        "You're all caught up. New notifications will appear here.",
        media('icon', "Icon.icon('bell', {}, h)"),
      )},
      ${content(`Button.button({ variant: 'outline', size: 'sm', onClick: NoOp(), children: [Icon.icon('refresh-ccw', {}, h), 'Refresh'] }, h)`)},
    ],
  }, h)${isStyleX ? '])' : ''}`
    case 'avatar':
      return `Empty.empty({
    ${emptyProps}
    children: [
      ${header(
        'User Offline',
        'This user is currently offline. You can leave a message to notify them or try again later.',
        media(
          'default',
          `Avatar.avatar({ ${isStyleX ? 'grayscale: true, layoutStyle: layoutStyle({ height: "3rem", width: "3rem" })' : "class: 'size-12 grayscale'"}, children: [
            Avatar.avatarImage({ src: '/logo-mark.svg', alt: '@creaseui', model: { status: 'loaded' } }, h),
            Avatar.avatarFallback({ children: ['LR'] }, h),
          ] }, h)`,
        ),
      )},
      ${content(button('default', 'Leave Message'))},
    ],
  }, h)`
    case 'avatarGroup':
      return `Empty.empty({
    ${emptyProps}
    children: [
      ${header(
        'No Team Members',
        'Invite your team to collaborate on this project.',
        media(
          'default',
          `Avatar.avatarGroup({ ${isStyleX ? 'grayscale: true, ' : ''}children: [
            ${[
              ['/logo-mark.svg', '@creaseui', 'CU'],
              ['https://github.com/maxleiter.png', '@maxleiter', 'LR'],
              ['https://github.com/evilrabbit.png', '@evilrabbit', 'ER'],
            ]
              .map(
                ([src, alt, fb]) =>
                  `Avatar.avatar({ children: [
              Avatar.avatarImage({ src: '${src}', alt: '${alt}', model: { status: 'loaded' } }, h),
              Avatar.avatarFallback({ children: ['${fb}'] }, h),
            ] }, h)`,
              )
              .join(',\n            ')},
          ] }, h)`,
        ),
      )},
      ${content(`Button.button({ variant: 'default', size: 'sm', onClick: NoOp(), children: [Icon.icon('plus', {}, h), 'Invite Members'] }, h)`)},
    ],
  }, h)`
    case 'inputGroup':
      return `Empty.empty({
    ${emptyProps}
    children: [
      Empty.emptyHeader({ children: [
        Empty.emptyTitle({ children: ['404 - Not Found'] }, h),
        Empty.emptyDescription({ children: ['The page you\\'re looking for doesn\\'t exist. Try searching for what you need below.'] }, h),
      ] }, h),
      Empty.emptyContent({ children: [
        InputGroup.inputGroup({${isStyleX ? ' layoutStyle: layoutStyle({ width: "75%" }),' : " class: 'sm:w-3/4',"} children: [
          InputGroup.inputGroupInput({ id: 'empty-search', placeholder: 'Try searching for pages...', value: model.search, onInput: value => ChangedEmptyInputGroup({ value }) }, h),
          InputGroup.inputGroupAddon({ children: [Icon.icon('search', {}, h)] }, h),
          InputGroup.inputGroupAddon({ align: 'inline-end', children: [Kbd.kbd({ children: ['/'] }, h)] }, h),
        ] }, h),
        Empty.emptyDescription({ children: [
          h.span([], ['Need help? ', h.a([h.Href('#'), h.Class('underline')], ['Contact support'])]),
        ] }, h),
      ] }, h),
    ],
  }, h)`
    case 'rtl':
      return `h.div([h.Dir('rtl')], [
    Empty.empty({
      ${emptyProps}
      children: [
        ${header(
          emptyRtlCopy.title,
          emptyRtlCopy.description,
          media('icon', "Icon.icon('folder-code', {}, h)"),
        )},
        ${content(`h.div([h.Class(${cls('flex-row justify-center gap-2', 'styles.actionRow')})], [
            ${button('default', emptyRtlCopy.create)},
            ${button('outline', emptyRtlCopy.import)},
          ])`)},
        h.a([
          h.Href('#'),
          h.Class(${cls('inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline', 'styles.linkRow')}),
        ], ['${emptyRtlCopy.learnMore}', Icon.icon('arrow-up-right', {}, h)]),
      ],
    }, h),
  ])`
  }
}

const emitImports = (fixture: EmptyFixture, isStyleX: boolean): string => {
  const parts: string[] = []
  if (fixture.kind === 'avatar' || fixture.kind === 'avatarGroup')
    parts.push(
      `import * as Avatar from '@/${isStyleX ? 'stylex' : 'ui'}/avatar'`,
    )
  if (fixture.kind === 'inputGroup')
    parts.push(
      `import * as InputGroup from '@/${isStyleX ? 'stylex' : 'ui'}/input-group'\nimport * as Kbd from '@/${isStyleX ? 'stylex' : 'ui'}/kbd'`,
    )
  parts.push(`import * as Button from '@/${isStyleX ? 'stylex' : 'ui'}/button'`)
  parts.push(`import * as Icon from '@/lib/icon'`)
  return `${isStyleX ? `import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'\n\n${emitStyles}\n\n` : ''}${parts.join('\n')}`
}

const emitInputGroupApplication = (
  fixture: EmptyFixture,
  isStyleX: boolean,
): string =>
  foldkitApplication({
    title: `Empty — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Empty from '@/${isStyleX ? 'stylex' : 'ui'}/empty'
${emitImports(fixture, isStyleX)}`,
    model: `export const Model = S.Struct({ search: S.String })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ChangedEmptyInputGroup = taggedStruct('ChangedEmptyInputGroup', { value: S.String })
export const Message = S.Union([ChangedEmptyInputGroup])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { search: '' } })`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedEmptyInputGroup':
      return { model: { ...model, search: message.value } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Empty — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)
  .split('\n')
  .map(line => `    ${line}`)
  .join('\n')}
  ]),
})`,
  })

const emptyExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  emptyFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code:
      fixture.kind === 'inputGroup'
        ? emitInputGroupApplication(fixture, renderer !== 'tailwind')
        : staticComponentApplication({
            componentName: 'Empty',
            componentSlug: 'empty',
            renderer,
            exampleName: fixture.title,
            componentImports: emitImports(fixture, renderer !== 'tailwind'),
            viewBody: emitBody(fixture, renderer !== 'tailwind'),
          }),
  }))

export const emptyExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, emptyExamplesFor(renderer))
