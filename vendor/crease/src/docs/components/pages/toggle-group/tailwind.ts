import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  toggleGroupFixtures,
  type TGFixture,
  type TGGroupSpec,
  type TGItem,
} from '@/docs/components/pages/toggle-group/shared'
import * as Field from '@/ui/field'
import * as Icon from '@/lib/icon'
import * as ToggleGroup from '@/ui/toggle-group'

const ExampleGroup = ToggleGroup.create<string>()

const GotToggleGroupPreviewMessage = defineMessageUnion({
  GotToggleGroupPreviewMessage: {
    id: S.String,
    message: ToggleGroup.Message,
  },
})
type PreviewMessage = typeof GotToggleGroupPreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('toggle-group'),
  groups: S.Record(S.String, ToggleGroup.Model),
  selections: S.Record(S.String, S.Array(S.String)),
})
type PreviewModel = typeof PreviewModel.Type

const itemChildren = (
  item: TGItem,
  h: HtmlBuilder<PreviewMessage>,
): ReadonlyArray<Html | string> => {
  if (item.icon !== undefined) {
    return [Icon.icon(item.icon, { class: 'size-4' }, h)]
  }
  if (item.weight !== undefined) {
    return [
      h.div(
        [
          h.Class(
            'flex size-16 flex-col items-center justify-center rounded-xl',
          ),
        ],
        [
          h.span(
            [h.Class(`text-2xl leading-none font-${item.weight}`)],
            ['Aa'],
          ),
          h.span(
            [h.Class('text-xs text-muted-foreground')],
            [item.label ?? ''],
          ),
        ],
      ),
    ]
  }
  return [item.label ?? '']
}

const itemConfig = (item: TGItem, h: HtmlBuilder<PreviewMessage>) => ({
  value: item.value,
  ariaLabel: item.ariaLabel,
  children: itemChildren(item, h),
  ...(item.isDisabled === true ? { isDisabled: true } : {}),
  ...(item.weight !== undefined
    ? { class: 'flex size-16 flex-col items-center justify-center rounded-xl' }
    : {}),
})

const groupView = (
  group: TGGroupSpec,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  ExampleGroup.toggleGroup(
    {
      model: model.groups[group.id] ?? ToggleGroup.init({ id: group.id }),
      toParentMessage: message =>
        GotToggleGroupPreviewMessage.GotToggleGroupPreviewMessage({
          id: group.id,
          message,
        }),
      ariaLabel: group.ariaLabel,
      ...(group.multiple
        ? { values: model.selections[group.id] ?? [] }
        : {
            value: model.selections[group.id]?.[0] ?? group.selected[0] ?? '',
          }),
      items: group.items.map(item => itemConfig(item, h)),
      ...(group.variant === 'outline' ? { variant: 'outline' as const } : {}),
      ...(group.size !== undefined ? { size: group.size } : {}),
      ...(group.arrangement === 'wrapped'
        ? { arrangement: 'wrapped' as const }
        : {}),
      ...(group.orientation === 'vertical'
        ? { orientation: 'vertical' as const }
        : {}),
      ...(group.rtl === true ? { direction: 'rtl' as const } : {}),
    },
    h,
  )

const fixtureView = (
  fixture: TGFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  if (fixture.kind === 'stack') {
    return h.div(
      [h.Class('flex flex-col gap-4')],
      fixture.groups.map(group => groupView(group, model, h)),
    )
  }
  if (fixture.kind === 'custom') {
    const group = fixture.groups[0]!
    return Field.field(
      {
        children: [
          Field.fieldLabel({ children: ['Font Weight'] }, h),
          groupView(group, model, h),
          Field.fieldDescription(
            {
              children: [
                'Use ',
                h.code(
                  [h.Class('rounded-md bg-muted px-1 py-0.5 font-mono')],
                  [`font-${model.selections[group.id]?.[0] ?? 'normal'}`],
                ),
                ' to set the font weight.',
              ],
            },
            h,
          ),
        ],
      },
      h,
    )
  }
  return groupView(fixture.groups[0]!, model, h)
}

export const toggleGroupTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: GotToggleGroupPreviewMessage,
  init: index => {
    const fixture = toggleGroupFixtures[index] ?? toggleGroupFixtures[0]
    return {
      _docsPage: 'toggle-group',
      groups: Object.fromEntries(
        fixture.groups.map(group => [
          group.id,
          ToggleGroup.init({ id: `docs-toggle-group-${group.id}` }),
        ]),
      ),
      selections: Object.fromEntries(
        fixture.groups.map(group => [group.id, [...group.selected]]),
      ),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotToggleGroupPreviewMessage': {
        const current = model.groups[message.id]
        if (current === undefined) {
          return { model }
        }
        const fixture = toggleGroupFixtures.find(candidate =>
          candidate.groups.some(group => group.id === message.id),
        )
        const spec = fixture?.groups.find(group => group.id === message.id)
        const next = ExampleGroup.update(current, message.message)
        const commands = next.commands ?? []
        const selection = Option.getOrUndefined(
          Option.fromNullishOr(next.outMessage),
        )?.value
        const previous = model.selections[message.id] ?? []
        const selections =
          selection === undefined
            ? model.selections
            : {
                ...model.selections,
                [message.id]:
                  spec?.multiple === true
                    ? previous.includes(selection)
                      ? previous.filter(value => value !== selection)
                      : [...previous, selection]
                    : [selection],
              }
        return {
          model: {
            ...model,
            groups: { ...model.groups, [message.id]: next.model },
            selections,
          },
          commands: Command.mapMessages(commands, next =>
            GotToggleGroupPreviewMessage.GotToggleGroupPreviewMessage({
              id: message.id,
              message: next,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    fixtureView(toggleGroupFixtures[index] ?? toggleGroupFixtures[0], model, h),
})
