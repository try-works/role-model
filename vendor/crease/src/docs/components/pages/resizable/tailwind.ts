import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  resizableFixtures,
  type ResizableFixture,
} from '@/docs/components/pages/resizable/shared'
import * as Resizable from '@/ui/resizable'

const Got = defineMessageUnion({
  GotResizableMessage: { message: Resizable.Message },
  GotOuterGroupMessage: { message: Resizable.GroupMessage },
  GotInnerGroupMessage: { message: Resizable.GroupMessage },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('resizable'),
  panels: Resizable.Model,
  outer: Resizable.GroupModel,
  inner: Resizable.GroupModel,
})
type Model = typeof Model.Type

const label = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('flex size-full items-center justify-center p-6 font-semibold')],
    [text],
  )

const singleView = (
  fixture: Extract<ResizableFixture, { kind: 'single' }>,
  model: Model,
  h: HtmlBuilder<Got>,
): Html =>
  Resizable.resizable(
    {
      model: model.panels,
      toParentMessage: message => Got.GotResizableMessage({ message }),
      direction: fixture.direction,
      extent: 448,
      ...(fixture.withHandle ? { withHandle: true } : {}),
      ariaLabel: fixture.ariaLabel,
      class: 'h-64 w-full max-w-md',
      first: label(fixture.first, h),
      second: label(fixture.second, h),
    },
    h,
  )

const nestedView = (
  fixture: Extract<ResizableFixture, { kind: 'nested' }>,
  model: Model,
  h: HtmlBuilder<Got>,
): Html =>
  Resizable.resizableGroup(
    {
      model: model.outer,
      toParentMessage: message => Got.GotOuterGroupMessage({ message }),
      direction: 'horizontal',
      ...(fixture.rtl ? { rtl: true } : {}),
      extent: 448,
      withHandles: true,
      class: 'h-52 w-full max-w-md',
      panels: [
        label(fixture.first, h),
        Resizable.resizableGroup(
          {
            model: model.inner,
            toParentMessage: message => Got.GotInnerGroupMessage({ message }),
            direction: 'vertical',
            ...(fixture.rtl ? { rtl: true } : {}),
            extent: 208,
            withHandles: true,
            panels: [label(fixture.second, h), label(fixture.third, h)],
          },
          h,
        ),
      ],
    },
    h,
  )

export const resizableTailwindPreviewProgram = definePreviewProgram<Model, Got>(
  {
    Model,
    Message: Got,
    init: index => {
      const fixture = resizableFixtures[index] ?? resizableFixtures[0]
      return {
        _docsPage: 'resizable',
        panels: Resizable.init(
          `docs-resizable-${String(index)}`,
          fixture.kind === 'single' ? fixture.initialSize : 50,
        ),
        outer: Resizable.initGroup(
          `docs-resizable-outer-${String(index)}`,
          2,
          [50, 50],
        ),
        inner: Resizable.initGroup(
          `docs-resizable-inner-${String(index)}`,
          2,
          [25, 75],
        ),
      }
    },
    update: (model, message) => {
      switch (message._tag) {
        case 'GotResizableMessage':
          return {
            model: {
              ...model,
              panels: Resizable.update(model.panels, message.message),
            },
          }
        case 'GotOuterGroupMessage':
          return {
            model: {
              ...model,
              outer: Resizable.updateGroup(model.outer, message.message),
            },
          }
        case 'GotInnerGroupMessage':
          return {
            model: {
              ...model,
              inner: Resizable.updateGroup(model.inner, message.message),
            },
          }
      }
    },
    view: (index, model, h) => {
      const fixture = resizableFixtures[index] ?? resizableFixtures[0]
      return fixture.kind === 'single'
        ? singleView(fixture, model, h)
        : nestedView(fixture, model, h)
    },
  },
)
