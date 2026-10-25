import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  selectFixtures,
  type SelectFixture,
  type SelectItem,
} from '@/docs/components/pages/select/shared'
import * as Field from '@/ui/field'
import * as Select from '@/ui/select'
import * as Switch from '@/ui/switch'

const GotSelectPreviewMessage = defineMessageUnion({
  GotSelectPreviewMessage: { message: Select.Message },
  ChangedAlignItem: { isChecked: S.Boolean },
})
type SelectPreviewMessage = typeof GotSelectPreviewMessage.Type
const SelectPreviewModel = S.Struct({
  _docsPage: S.Literal('select'),
  select: Select.Model,
  maybeSelected: S.Option(S.String),
  alignItem: S.Boolean,
})
type SelectPreviewModel = typeof SelectPreviewModel.Type

const ExampleSelect = Select.create<string>()

const fixtureView = (
  fixture: SelectFixture,
  model: SelectPreviewModel,
  h: HtmlBuilder<SelectPreviewMessage>,
): Html => {
  const select = ExampleSelect.select(
    {
      model: model.select,
      maybeSelectedValue: model.maybeSelected,
      toParentMessage: message =>
        GotSelectPreviewMessage.GotSelectPreviewMessage({ message }),
      ariaLabel: 'Example select',
      placeholder: fixture.placeholder,
      items: fixture.items,
      itemToValue: (item: SelectItem) => item.value,
      itemToLabel: (item: SelectItem) => item.label,
      itemToConfig: (item: SelectItem) => ({
        isDisabled: item.isDisabled ?? false,
      }),
      ...(fixture.groups
        ? {
            itemGroupKey: (item: SelectItem) => item.group ?? '',
            groupToHeading: (group: string) => group,
          }
        : {}),
      ...(fixture.isDisabled === true ? { isDisabled: true } : {}),
      ...(fixture.kind === 'invalid' ? { isInvalid: true } : {}),
      ...(fixture.rtl === true ? { direction: 'rtl' as const } : {}),
      ...(fixture.kind === 'alignItem'
        ? {
            position: model.alignItem
              ? ('item-aligned' as const)
              : ('popper' as const),
          }
        : {}),
      ...(fixture.triggerClass === undefined
        ? {}
        : { triggerClass: fixture.triggerClass }),
    },
    h,
  )
  if (fixture.kind === 'alignItem') {
    return Field.fieldGroup(
      {
        children: [
          Field.field(
            {
              children: [
                Switch.switchControl(
                  {
                    id: 'align-item',
                    isChecked: model.alignItem,
                    onToggle: isChecked =>
                      GotSelectPreviewMessage.ChangedAlignItem({ isChecked }),
                    label: 'Align Item',
                    description: 'Toggle to align the item with the trigger.',
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          Field.field(
            {
              children: [select],
            },
            h,
          ),
        ],
      },
      h,
    )
  }
  return fixture.kind === 'invalid'
    ? h.div(
        [],
        [
          Field.field(
            {
              isInvalid: true,
              children: [
                Field.fieldLabel(
                  {
                    for: `${model.select.id}-button`,
                    children: ['Fruit'],
                  },
                  h,
                ),
                select,
                Field.fieldError({ children: ['Please select a fruit.'] }, h),
              ],
            },
            h,
          ),
        ],
      )
    : select
}

export const selectTailwindPreviewProgram = definePreviewProgram<
  SelectPreviewModel,
  SelectPreviewMessage
>({
  Model: SelectPreviewModel,
  Message: GotSelectPreviewMessage,
  init: index => ({
    _docsPage: 'select',
    select: Select.init({
      id: `docs-select-${String(index)}`,
      isAnimated: true,
    }),
    maybeSelected:
      (selectFixtures[index] ?? selectFixtures[0]).kind === 'alignItem'
        ? Option.some('banana')
        : Option.none(),
    alignItem: true,
  }),
  update: (model, message) => {
    if (message._tag === 'ChangedAlignItem') {
      return { model: { ...model, alignItem: message.isChecked } }
    }
    const {
      model: select,
      commands: selectCommands,
      outMessage: selectOut,
    } = Select.update(model.select, message.message)
    const commands = selectCommands ?? []
    const maybeSelected = Option.match(Option.fromNullishOr(selectOut), {
      onNone: () => model.maybeSelected,
      onSome: selection =>
        selection._tag === 'Selected'
          ? Option.some(selection.value)
          : Option.none<string>(),
    })
    return {
      model: { ...model, select, maybeSelected },
      commands: Command.mapMessages(commands, next =>
        GotSelectPreviewMessage.GotSelectPreviewMessage({ message: next }),
      ),
    }
  },
  view: (index, model, h) =>
    fixtureView(selectFixtures[index] ?? selectFixtures[0], model, h),
})
