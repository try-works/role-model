import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  controlledBooleanApplication,
  foldkitApplication,
} from '@/docs/components/pages/authored-page'

export type CollapsibleFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'basic' | 'settings' | 'tree' | 'rtl' | 'single'
  config?: string
}>

export const collapsibleFixtures: ReadonlyArray<CollapsibleFixture> = [
  { title: 'Demo', heroOnly: true, kind: 'basic' },
  {
    title: 'Basic',
    kind: 'basic',
    description:
      'A card wraps a collapsible whose content can hold rich elements like buttons.',
  },
  {
    title: 'Settings Panel',
    kind: 'settings',
    description:
      'Collapsed fields reveal related options inside a labeled card.',
  },
  {
    title: 'File Tree',
    kind: 'tree',
    description:
      'Nested collapsibles model an open-path set; each folder owns its disclosure id.',
  },
  {
    title: 'RTL',
    kind: 'rtl',
    description:
      'Right-to-left direction renders inside a dir="rtl" container with localized copy.',
  },
  {
    title: 'Disabled',
    kind: 'single',
    config: 'isDisabled: true,',
    description:
      'A disabled trigger exposes the panel state but does not dispatch Messages.',
  },
]

export const fileTree = [
  {
    name: 'components',
    items: [
      {
        name: 'ui',
        items: [
          { name: 'button.ts' },
          { name: 'card.ts' },
          { name: 'dialog.ts' },
          { name: 'input.ts' },
          { name: 'select.ts' },
          { name: 'table.ts' },
        ],
      },
      { name: 'login-form.ts' },
      { name: 'register-form.ts' },
    ],
  },
  {
    name: 'lib',
    items: [{ name: 'utils.ts' }, { name: 'cn.ts' }, { name: 'api.ts' }],
  },
  {
    name: 'hooks',
    items: [
      { name: 'use-media-query.ts' },
      { name: 'use-debounce.ts' },
      { name: 'use-local-storage.ts' },
    ],
  },
  { name: 'types', items: [{ name: 'index.d.ts' }, { name: 'api.d.ts' }] },
  { name: 'public', items: [{ name: 'favicon.ico' }, { name: 'logo.svg' }] },
] as const

const basicSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Collapsible — card panel',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Button from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/button'
import * as Card from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/card'
import * as Collapsible from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/collapsible'
import * as Icon from '@/lib/icon'`,
    model: `export const Model = S.Struct({ isOpen: S.Boolean })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledDetails = taggedStruct('ToggledDetails', { isOpen: S.Boolean });
export const Message = S.Union([ToggledDetails])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { isOpen: false } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledDetails': return { model: { isOpen: message.isOpen } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Product details',
  body: h.main([], [
    Card.card({ children: [
      Card.cardContent({ children: [
        Collapsible.collapsible({
          id: 'product-details',
          isOpen: model.isOpen,
          onToggle: isOpen => ToggledDetails({ isOpen }),
          trigger: h.span([h.Class('flex w-full items-center justify-between gap-2')], ['Product details', Icon.icon('chevron-down', { class: 'size-4' }, h)]),
          content: h.div([h.Class('flex flex-col items-start gap-2')], [
            'This panel can be expanded or collapsed to reveal additional content.',
            Button.button({ children: ['Learn More'], size: 'xs' }, h),
          ]),
        }, h),
      ] }, h),
    ] }, h),
  ]),
})`,
  })

const settingsSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Collapsible — settings panel',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Card from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/card'
import * as Collapsible from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/collapsible'
import * as Icon from '@/lib/icon'
import * as Input from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/input'`,
    model: `export const Model = S.Struct({
  isOpen: S.Boolean,
  top: S.String,
  right: S.String,
  bottom: S.String,
  left: S.String,
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledPanel = taggedStruct('ToggledPanel', { isOpen: S.Boolean });
export const ChangedRadius = taggedStruct('ChangedRadius', { side: S.Literals(['top', 'right', 'bottom', 'left']), value: S.String });
export const Message = S.Union([ToggledPanel, ChangedRadius])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { isOpen: false, top: '0', right: '0', bottom: '0', left: '0' } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledPanel': return { model: { ...model, isOpen: message.isOpen } }
    case 'ChangedRadius': return { model: { ...model, [message.side]: message.value } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Radius settings',
  body: h.main([], [
    Card.card({ children: [
      Card.cardHeader({ children: [
        Card.cardTitle({ children: ['Radius'] }, h),
        Card.cardDescription({ children: ['Set the corner radius of the element.'] }, h),
      ] }, h),
      Card.cardContent({ children: [
        h.div([h.Class('grid grid-cols-2 gap-2')], [
          Input.input({ id: 'radius-top', label: h.span([h.Class('sr-only')], ['Top radius']), value: model.top, onInput: value => ChangedRadius({ side: 'top', value }), placeholder: '0' }, h),
          Input.input({ id: 'radius-right', label: h.span([h.Class('sr-only')], ['Right radius']), value: model.right, onInput: value => ChangedRadius({ side: 'right', value }), placeholder: '0' }, h),
        ]),
        Collapsible.collapsible({
          id: 'radius-panel',
          isOpen: model.isOpen,
          onToggle: isOpen => ToggledPanel({ isOpen }),
          trigger: h.span([h.Class('flex w-full items-center justify-between')], ['More radii', Icon.icon('chevron-down', { class: 'size-4' }, h)]),
          content: h.div([h.Class('grid grid-cols-2 gap-2')], [
            Input.input({ id: 'radius-bottom', label: h.span([h.Class('sr-only')], ['Bottom radius']), value: model.bottom, onInput: value => ChangedRadius({ side: 'bottom', value }), placeholder: '0' }, h),
            Input.input({ id: 'radius-left', label: h.span([h.Class('sr-only')], ['Left radius']), value: model.left, onInput: value => ChangedRadius({ side: 'left', value }), placeholder: '0' }, h),
          ]),
        }, h),
      ] }, h),
    ] }, h),
  ]),
})`,
  })

const treeSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Collapsible — file tree',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Collapsible from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/collapsible'
import * as Icon from '@/lib/icon'`,
    model: `export const Model = S.Struct({ open: S.Array(S.String) })
export type Model = typeof Model.Type

const folders = [
  { name: 'components', items: ['ui', 'login-form.ts', 'register-form.ts'] },
  { name: 'lib', items: ['utils.ts', 'cn.ts', 'api.ts'] },
  { name: 'hooks', items: ['use-media-query.ts', 'use-debounce.ts', 'use-local-storage.ts'] },
  { name: 'types', items: ['index.d.ts', 'api.d.ts'] },
  { name: 'public', items: ['favicon.ico', 'logo.svg'] },
]
const uiFiles = ['button.ts', 'card.ts', 'dialog.ts', 'input.ts', 'select.ts', 'table.ts']`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledNode = taggedStruct('ToggledNode', { id: S.String, isOpen: S.Boolean });
export const Message = S.Union([ToggledNode])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { open: ['components'] } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledNode': return { model: { open: message.isOpen ? [...model.open, message.id] : model.open.filter(id => id !== message.id) } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'File tree',
  body: h.main([], [
    h.div([h.Class('w-full max-w-xs font-mono text-sm')], folders.map(folder =>
      Collapsible.collapsible({
        id: \`tree-\${folder.name}\`,
        isOpen: model.open.includes(folder.name),
        onToggle: isOpen => ToggledNode({ id: folder.name, isOpen }),
        trigger: h.span([h.Class('flex items-center gap-1')], [Icon.icon(model.open.includes(folder.name) ? 'chevron-down' : 'chevron-right', { class: 'size-3.5' }, h), folder.name]),
        content: h.div([h.Class('grid gap-1 ps-4')], folder.items.map(item => item === 'ui'
          ? Collapsible.collapsible({
              id: 'tree-components-ui',
              isOpen: model.open.includes('components/ui'),
              onToggle: isOpen => ToggledNode({ id: 'components/ui', isOpen }),
              trigger: h.span([h.Class('flex items-center gap-1')], [Icon.icon(model.open.includes('components/ui') ? 'chevron-down' : 'chevron-right', { class: 'size-3.5' }, h), 'ui']),
              content: h.div([h.Class('grid gap-1 ps-4')], uiFiles.map(file => h.span([h.Class('text-muted-foreground')], [file]))),
            }, h)
          : h.span([h.Class('text-muted-foreground')], [item]))),
      }, h))),
  ]),
})`,
  })

const rtlSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Collapsible — RTL order card',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Button from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/button'
import * as Collapsible from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/collapsible'
import * as Icon from '@/lib/icon'`,
    model: `export const Model = S.Struct({ isOpen: S.Boolean })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledDetails = taggedStruct('ToggledDetails', { isOpen: S.Boolean });
export const Message = S.Union([ToggledDetails])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { isOpen: false } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledDetails': return { model: { isOpen: message.isOpen } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Order details',
  body: h.main([], [
    h.div([h.Dir('rtl'), h.Class('flex w-80 flex-col gap-2')], [
      h.div([h.Class('flex items-center justify-between gap-4 px-4')], [
        h.h4([h.Class('text-sm font-semibold')], ['الطلب #4189']),
        Button.button({ variant: 'ghost', size: 'icon', ariaLabel: 'Toggle details', children: [Icon.icon('chevrons-up-down', { class: 'size-4' }, h)] }, h),
      ]),
      h.div([h.Class('flex items-center justify-between rounded-md border px-4 py-2 text-sm')], [
        h.span([h.Class('text-muted-foreground')], ['الحالة']),
        h.span([h.Class('font-medium')], ['تم الشحن']),
      ]),
      Collapsible.collapsible({
        id: 'order-details',
        isOpen: model.isOpen,
        onToggle: isOpen => ToggledDetails({ isOpen }),
        ariaLabel: 'Toggle order details',
        trigger: h.span([h.Class('sr-only')], ['Toggle order details']),
        content: h.div([h.Class('flex flex-col gap-2')], [
          h.div([h.Class('rounded-md border px-4 py-2 text-sm')], [
            h.p([h.Class('font-medium')], ['عنوان الشحن']),
            h.p([h.Class('text-muted-foreground')], ['شارع السوق 100، سان فرانسيسكو']),
          ]),
          h.div([h.Class('rounded-md border px-4 py-2 text-sm')], [
            h.p([h.Class('font-medium')], ['العناصر']),
            h.p([h.Class('text-muted-foreground')], ['سماعات الاستوديو ×2']),
          ]),
        ]),
      }, h),
    ]),
  ]),
})`,
  })

const singleSource = (
  fixture: CollapsibleFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  controlledBooleanApplication({
    componentName: 'Collapsible',
    componentSlug: 'collapsible',
    renderer,
    exampleName: fixture.title,
    field: 'isOpen',
    initialValue: false,
    messageName: 'ToggledDetails',
    messageField: 'isOpen',
    viewBody: `Collapsible.collapsible({
  id: 'details',
  isOpen: model.isOpen,
  onToggle: isOpen => ToggledDetails({ isOpen }),
  trigger: 'Unavailable details',
  content: 'Foldkit keeps disclosure state in the application Model.',
  ${fixture.config ?? ''}
}, h),`,
  })

const collapsibleExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  collapsibleFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code:
      fixture.kind === 'basic'
        ? basicSource(renderer)
        : fixture.kind === 'settings'
          ? settingsSource(renderer)
          : fixture.kind === 'tree'
            ? treeSource(renderer)
            : fixture.kind === 'rtl'
              ? rtlSource(renderer)
              : singleSource(fixture, renderer),
  }))

export const collapsibleExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, collapsibleExamplesFor(renderer))
