import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  popoverFixtures,
  type PopoverFixture,
  type PopoverInstance,
} from '@/docs/components/pages/popover/shared'
import * as Field from '@/ui/field'
import * as Input from '@/ui/input'
import * as Popover from '@/ui/popover'

const GotPopoverPreviewMessage = defineMessageUnion({
  GotPopoverMessage: { id: S.String, message: Popover.Message },
  ChangedFieldInput: { id: S.String, value: S.String },
})
type PreviewMessage = typeof GotPopoverPreviewMessage.Type
const PreviewModel = S.Struct({
  _docsPage: S.Literal('popover'),
  popovers: S.Record(S.String, Popover.Model),
  values: S.Record(S.String, S.String),
})
type PreviewModel = typeof PreviewModel.Type

const headerContent = <Msg>(rtl: boolean, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('grid gap-2')],
    [
      h.h4([h.Class('font-medium')], [rtl ? 'الأبعاد' : 'Dimensions']),
      h.p(
        [h.Class('text-sm text-muted-foreground')],
        [rtl ? 'تعيين الأبعاد للطبقة.' : 'Set the dimensions for the layer.'],
      ),
    ],
  )

const instanceView = (
  instance: PopoverInstance,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Popover.popover(
    {
      model:
        model.popovers[instance.id] ??
        Popover.init({ id: `popover-${instance.id}`, isAnimated: true }),
      toParentMessage: message =>
        GotPopoverPreviewMessage.GotPopoverMessage({
          id: instance.id,
          message,
        }),
      trigger: instance.trigger,
      triggerClass: 'rounded-md border px-3 py-1.5 text-sm',
      side: instance.side,
      align: instance.align,
      class: 'w-40',
      ...(instance.rtl === true ? { direction: 'rtl' as const } : {}),
      content: instance.rtl === true ? headerContent(true, h) : instance.text,
    },
    h,
  )

const basicView = (model: PreviewModel, h: HtmlBuilder<PreviewMessage>): Html =>
  Popover.popover(
    {
      model:
        model.popovers['basic'] ??
        Popover.init({ id: 'popover-basic', isAnimated: true }),
      toParentMessage: message =>
        GotPopoverPreviewMessage.GotPopoverMessage({ id: 'basic', message }),
      trigger: 'Open Popover',
      triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',
      align: 'start',
      content: headerContent(false, h),
    },
    h,
  )

const formView = (
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const fieldInput = (id: string, label: string, value: string): Html =>
    Field.field(
      {
        orientation: 'horizontal',
        children: [
          Field.fieldLabel({ for: id, children: [label], class: 'w-1/2' }, h),
          Input.input(
            {
              id,
              value: model.values[id] ?? value,
              onInput: value =>
                GotPopoverPreviewMessage.ChangedFieldInput({ id, value }),
            },
            h,
          ),
        ],
      },
      h,
    )
  return Popover.popover(
    {
      model:
        model.popovers['form'] ??
        Popover.init({ id: 'popover-form', isAnimated: true }),
      toParentMessage: message =>
        GotPopoverPreviewMessage.GotPopoverMessage({ id: 'form', message }),
      trigger: 'Open Popover',
      triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',
      align: 'start',
      class: 'w-64',
      focusSelector: '[data-slot=popover-content] input',
      content: h.div(
        [h.Class('grid gap-4')],
        [
          headerContent(false, h),
          h.div(
            [h.Class('grid gap-4')],
            [
              fieldInput('width', 'Width', '100%'),
              fieldInput('height', 'Height', '25px'),
            ],
          ),
        ],
      ),
    },
    h,
  )
}

const legacyView = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const fixture = popoverFixtures[index]
  const side = fixture?.kind === 'legacy' ? fixture.side : 'bottom'
  const align = fixture?.kind === 'legacy' ? fixture.align : 'start'
  return Popover.popover(
    {
      model:
        model.popovers['main'] ??
        Popover.init({ id: 'popover-main', isAnimated: true }),
      toParentMessage: message =>
        GotPopoverPreviewMessage.GotPopoverMessage({ id: 'main', message }),
      trigger: 'Open dimensions',
      triggerClass: 'rounded-md border px-4 py-2 text-sm font-medium',
      side,
      align,
      focusSelector: '[data-slot=popover-content] input',
      content: h.div(
        [h.Class('grid gap-2')],
        [
          h.h4([h.Class('font-medium')], ['Dimensions']),
          h.p(
            [h.Class('text-sm text-muted-foreground')],
            ['Set the dimensions for the layer.'],
          ),
          h.input([
            h.Type('number'),
            h.AriaLabel('Width'),
            h.Class('rounded-md border px-3 py-2'),
          ]),
        ],
      ),
    },
    h,
  )
}

const idsForFixture = (fixture: PopoverFixture): ReadonlyArray<string> => {
  switch (fixture.kind) {
    case 'legacy':
      return ['main']
    case 'basic':
      return ['basic']
    case 'form':
      return ['form']
    case 'align':
    case 'rtl':
      return fixture.instances.map(instance => instance.id)
  }
}

const render = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const fixture = popoverFixtures[index] ?? popoverFixtures[0]
  switch (fixture.kind) {
    case 'legacy':
      return legacyView(index, model, h)
    case 'basic':
      return basicView(model, h)
    case 'form':
      return formView(model, h)
    case 'align':
      return h.div(
        [h.Class('flex flex-wrap justify-center gap-6')],
        fixture.instances.map(instance => instanceView(instance, model, h)),
      )
    case 'rtl':
      return h.div(
        [h.Class('flex flex-wrap justify-center gap-2')],
        fixture.instances.map(instance => instanceView(instance, model, h)),
      )
  }
}

const mapPopover = (
  model: PreviewModel,
  id: string,
  result: ReturnType<typeof Popover.update>,
) => ({
  model: {
    ...model,
    popovers: { ...model.popovers, [id]: result.model },
  },
  commands: Command.mapMessages(result.commands ?? [], next =>
    GotPopoverPreviewMessage.GotPopoverMessage({ id, message: next }),
  ),
})

export const popoverTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: GotPopoverPreviewMessage,
  init: index => {
    const fixture = popoverFixtures[index] ?? popoverFixtures[0]
    return {
      _docsPage: 'popover',
      popovers: Object.fromEntries(
        idsForFixture(fixture).map(id => [
          id,
          Popover.init({
            id: `docs-popover-${id}-${String(index)}`,
            isAnimated: true,
            contentFocus: true,
          }),
        ]),
      ),
      values: { width: '100%', height: '25px' },
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedFieldInput':
        return {
          model: {
            ...model,
            values: { ...model.values, [message.id]: message.value },
          },
        }
      case 'GotPopoverMessage': {
        const popover = model.popovers[message.id]
        if (popover === undefined) {
          return { model }
        }
        return mapPopover(
          model,
          message.id,
          Popover.update(popover, message.message),
        )
      }
    }
  },
  view: (index, model, h) => render(index, model, h),
})
