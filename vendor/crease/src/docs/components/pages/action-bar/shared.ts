import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ActionBarVariant = 'basic' | 'positions'

export interface ActionBarFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly variant: ActionBarVariant
}

export const actionBarFixtures: Readonly<
  [ActionBarFixture, ...Array<ActionBarFixture>]
> = [
  { title: 'Basic', heroOnly: true, variant: 'basic' },
  {
    title: 'Positions',
    description: 'side and align anchor the bar to any edge of the viewport.',
    variant: 'positions',
  },
]

const barChildrenEmit = `ActionBar.actionBarSelection(
              { children: [\`\${String(model.selected)} selected\`] },
              h,
            ),
            ActionBar.actionBarSeparator({}, h),
            ActionBar.actionBarItem(
              { onSelect: ClosedActionBar({}), children: ['Mark completed'] },
              h,
            ),
            ActionBar.actionBarItem(
              { onSelect: ClosedActionBar({}), children: ['Assign'] },
              h,
            ),
            ActionBar.actionBarItem(
              { onSelect: ClosedActionBar({}), children: ['Archive'] },
              h,
            ),
            ActionBar.actionBarItem(
              {
                onSelect: ClosedActionBar({}),
                variant: 'destructive',
                children: ['Delete'],
              },
              h,
            ),
            ActionBar.actionBarClose(
              {
                onClose: ClosedActionBar({}),
                ariaLabel: 'Clear selection',
                children: [Icon.icon('x', { class: 'size-4' }, h)],
              },
              h,
            ),`

const emitBasic = (renderer: 'tailwind' | 'stylex' | 'pleat'): string => {
  const sep = renderer === 'tailwind' ? 'ui' : 'stylex'
  return foldkitApplication({
    title: 'Action Bar — Basic',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import * as ActionBar from '@/${sep}/action-bar'
import * as Icon from '@/lib/icon'`,
    model: `export const Model = S.Struct({ selected: S.Number })
export type Model = typeof Model.Type`,
    messages: `export const ToggledSelection = taggedStruct('ToggledSelection')
export const ClosedActionBar = taggedStruct('ClosedActionBar')
export const IgnoredMountMessage = taggedStruct('IgnoredMountMessage')
export const Message = S.Union([
  ToggledSelection,
  ClosedActionBar,
  IgnoredMountMessage,
])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { selected: 0 } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledSelection':
      return { model: { ...model, selected: model.selected === 0 ? 3 : 0 } }
    case 'ClosedActionBar':
      return { model: { ...model, selected: 0 } }
    case 'IgnoredMountMessage':
      return { model }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Action Bar — Basic',
  body: h.main(
    [h.Class('flex min-h-screen items-center justify-center p-8')],
    [
      h.button(
        [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(ToggledSelection({}))],
        [model.selected === 0 ? 'Select 3 tasks' : 'Clear selection'],
      ),
      ActionBar.actionBar(
        {
          open: model.selected > 0,
          toParentMessage: mountMessage =>
            mountMessage._tag === 'RequestedClose'
              ? ClosedActionBar({})
              : IgnoredMountMessage({}),
          children: [
            ${barChildrenEmit}
          ],
        },
        h,
      ),
    ],
  ),
})`,
  })
}

const emitPositions = (renderer: 'tailwind' | 'stylex' | 'pleat'): string => {
  const sep = renderer === 'tailwind' ? 'ui' : 'stylex'
  return foldkitApplication({
    title: 'Action Bar — Positions',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import * as ActionBar from '@/${sep}/action-bar'
import * as Icon from '@/lib/icon'`,
    model: `const Side = S.Union([S.Literal('top'), S.Literal('bottom')])
const Align = S.Union([S.Literal('start'), S.Literal('center'), S.Literal('end')])
export const Model = S.Struct({
  selected: S.Number,
  side: Side,
  align: Align,
})
export type Model = typeof Model.Type`,
    messages: `export const OpenedAt = taggedStruct('OpenedAt', {
  side: Side,
  align: Align,
})
export const ClosedActionBar = taggedStruct('ClosedActionBar')
export const IgnoredMountMessage = taggedStruct('IgnoredMountMessage')
export const Message = S.Union([
  OpenedAt,
  ClosedActionBar,
  IgnoredMountMessage,
])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { selected: 0, side: 'bottom', align: 'center' },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'OpenedAt':
      return {
        model: {
          ...model,
          selected: 3,
          side: message.side,
          align: message.align,
        },
      }
    case 'ClosedActionBar':
      return { model: { ...model, selected: 0 } }
    case 'IgnoredMountMessage':
      return { model }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Action Bar — Positions',
  body: h.main(
    [h.Class('flex min-h-screen items-center justify-center p-8')],
    [
      h.div(
        [h.Class('flex flex-wrap justify-center gap-2')],
        [
          h.button(
            [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(OpenedAt({ side: 'top', align: 'start' }))],
            ['Top Left'],
          ),
          h.button(
            [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(OpenedAt({ side: 'top', align: 'center' }))],
            ['Top Center'],
          ),
          h.button(
            [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(OpenedAt({ side: 'top', align: 'end' }))],
            ['Top Right'],
          ),
          h.button(
            [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(OpenedAt({ side: 'bottom', align: 'start' }))],
            ['Bottom Left'],
          ),
          h.button(
            [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(OpenedAt({ side: 'bottom', align: 'center' }))],
            ['Bottom Center'],
          ),
          h.button(
            [h.Class('rounded-md border px-3 py-2 text-sm'), h.OnClick(OpenedAt({ side: 'bottom', align: 'end' }))],
            ['Bottom Right'],
          ),
        ],
      ),
      ActionBar.actionBar(
        {
          open: model.selected > 0,
          side: model.side,
          align: model.align,
          alignOffset: model.align === 'center' ? 0 : 16,
          toParentMessage: mountMessage =>
            mountMessage._tag === 'RequestedClose'
              ? ClosedActionBar({})
              : IgnoredMountMessage({}),
          children: [
            ${barChildrenEmit}
          ],
        },
        h,
      ),
    ],
  ),
})`,
  })
}

export const emitApplication = (
  fixture: ActionBarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string =>
  fixture.variant === 'positions'
    ? emitPositions(renderer)
    : emitBasic(renderer)

const actionBarExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  actionBarFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const actionBarExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, actionBarExamplesFor(renderer))
