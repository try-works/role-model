import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export const resizableFixtures = [
  {
    title: 'Basic',
    kind: 'nested',
    rtl: false,
    first: 'One',
    second: 'Two',
    third: 'Three',
  },
  {
    title: 'Vertical',
    kind: 'single',
    direction: 'vertical',
    withHandle: true,
    initialSize: 25,
    ariaLabel: 'Resize header and content',
    first: 'Header',
    second: 'Content',
  },
  {
    title: 'Handle',
    kind: 'single',
    direction: 'horizontal',
    withHandle: true,
    initialSize: 25,
    ariaLabel: 'Resize sidebar and content',
    first: 'Sidebar',
    second: 'Content',
  },
  {
    title: 'RTL',
    kind: 'nested',
    rtl: true,
    first: 'واحد',
    second: 'اثنان',
    third: 'ثلاثة',
  },
] as const

export type ResizableFixture = (typeof resizableFixtures)[number]

const STYLES_BLOCK = `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  group: { height: '13rem', width: '100%', maxWidth: '28rem' },
  groupTall: { height: '16rem', width: '100%', maxWidth: '28rem' },
  panel: { alignItems: 'center', display: 'flex', height: '100%', justifyContent: 'center', padding: '1.5rem', width: '100%' },
  label: { fontWeight: 600 },
})
`

const singleSource = (
  fixture: {
    title: string
    direction: string
    withHandle: boolean
    initialSize: number
    ariaLabel: string
    first: string
    second: string
  },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  return foldkitApplication({
    title: `Resizable — ${fixture.title}`,
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
import * as Resizable from '@/${isStyleX ? 'stylex' : 'ui'}/resizable'${isStyleX ? STYLES_BLOCK : ''}`,
    model: `export const Model = S.Struct({ panels: Resizable.Model })
export type Model = typeof Model.Type`,
    messages: `export const GotResizableMessage = taggedStruct('GotResizableMessage${tag}', {
  message: Resizable.Message,
})
export const Message = S.Union([GotResizableMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { panels: Resizable.init('${fixture.title.toLowerCase()}-panels', ${fixture.initialSize}) },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotResizableMessage${tag}':
      return {
        model: { ...model, panels: Resizable.update(model.panels, message.message) },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Resizable — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    Resizable.resizable({
      model: model.panels,
      toParentMessage: message => GotResizableMessage({ message }),
      direction: '${fixture.direction}',
      extent: 448,
      ${fixture.withHandle ? 'withHandle: true,' : ''}
      ariaLabel: '${fixture.ariaLabel}',
      ${isStyleX ? 'layoutStyle: layoutStyle({ height: "16rem", width: "100%", maxWidth: "28rem" })' : "class: 'h-64 w-full max-w-md'"},
      first: h.div([h.Class(${isStyleX ? 'className(styles.panel, styles.label)' : "'flex size-full items-center justify-center p-6 font-semibold'"})], ['${fixture.first}']),
      second: h.div([h.Class(${isStyleX ? 'className(styles.panel, styles.label)' : "'flex size-full items-center justify-center p-6 font-semibold'"})], ['${fixture.second}']),
    }, h),
  ]),
})`,
  })
}

const nestedSource = (
  fixture: {
    title: string
    rtl: boolean
    first: string
    second: string
    third: string
  },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const panelEmit = (label: string): string =>
    `h.div([h.Class(${isStyleX ? 'className(styles.panel, styles.label)' : "'flex size-full items-center justify-center p-6 font-semibold'"})], ['${label}'])`
  return foldkitApplication({
    title: `Resizable — ${fixture.title}`,
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
import * as Resizable from '@/${isStyleX ? 'stylex' : 'ui'}/resizable'${isStyleX ? STYLES_BLOCK : ''}`,
    model: `export const Model = S.Struct({
  outer: Resizable.GroupModel,
  inner: Resizable.GroupModel,
})
export type Model = typeof Model.Type`,
    messages: `export const GotOuterMessage = taggedStruct('GotOuterMessage${tag}', {
  message: Resizable.GroupMessage,
})
export const GotInnerMessage = taggedStruct('GotInnerMessage${tag}', {
  message: Resizable.GroupMessage,
})
export const Message = S.Union([GotOuterMessage, GotInnerMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    outer: Resizable.initGroup('outer-panels', 2, [50, 50]),
    inner: Resizable.initGroup('inner-panels', 2, [25, 75]),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotOuterMessage${tag}':
      return {
        model: { ...model, outer: Resizable.updateGroup(model.outer, message.message) },
      }
    case 'GotInnerMessage${tag}':
      return {
        model: { ...model, inner: Resizable.updateGroup(model.inner, message.message) },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Resizable — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    Resizable.resizableGroup({
      model: model.outer,
      toParentMessage: message => GotOuterMessage({ message }),
      direction: 'horizontal',${
        fixture.rtl
          ? `
      rtl: true,`
          : ''
      }
      extent: 448,
      withHandles: true,
      ${isStyleX ? 'layoutStyle: layoutStyle({ height: "13rem", width: "100%", maxWidth: "28rem" })' : "class: 'h-52 w-full max-w-md'"},
      panels: [
        ${panelEmit(fixture.first)},
        Resizable.resizableGroup({
          model: model.inner,
          toParentMessage: message => GotInnerMessage({ message }),
          direction: 'vertical',${
            fixture.rtl
              ? `
          rtl: true,`
              : ''
          }
          extent: 208,
          withHandles: true,
          panels: [
            ${panelEmit(fixture.second)},
            ${panelEmit(fixture.third)},
          ],
        }, h),
      ],
    }, h),
  ]),
})`,
  })
}

const resizableExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  resizableFixtures.map(fixture => ({
    title: fixture.title,
    code:
      fixture.kind === 'single'
        ? singleSource(fixture, renderer)
        : nestedSource(fixture, renderer),
  }))

export const resizableExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, resizableExamplesFor(renderer))
