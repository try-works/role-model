import type { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { RadioGroup as RadioGroupPrimitive } from '@foldkit/ui'

export type RadioGroupOption = Readonly<{
  value: string
  label: Html | string
  description?: Html | string
  isDisabled?: boolean
  isInvalid?: boolean
}>

export const Model = RadioGroupPrimitive.Model
export type Model = typeof Model.Type
export const Message = RadioGroupPrimitive.Message
export type Message = typeof Message.Type
export type OutMessage = RadioGroupPrimitive.OutMessage<string>
export const init = RadioGroupPrimitive.init
const StringRadioGroup = RadioGroupPrimitive.create<string>()
export const update = StringRadioGroup.update

export type RadioGroupBehaviorProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  selectedValue: Option.Option<string>
  ariaLabel: string
  options: ReadonlyArray<RadioGroupOption>
  isDisabled?: boolean
  isReadOnly?: boolean
  name?: string
  orientation?: RadioGroupPrimitive.Orientation
  direction?: 'ltr' | 'rtl'
}>

type OptionState = Readonly<{
  index: number
  isSelected: boolean
  isDisabled: boolean
  isReadOnly: boolean
}>

const childAttributeTag = (attribute: ChildAttribute): string | undefined => {
  const value = attribute.attribute
  return typeof value === 'object' &&
    value !== null &&
    '_tag' in value &&
    typeof value._tag === 'string'
    ? value._tag
    : undefined
}

export type RadioGroupVisualAttributes<Msg> = Readonly<{
  group: ReadonlyArray<Attribute<Msg>>
  row: ReadonlyArray<Attribute<Msg>>
  item: (state: OptionState) => ReadonlyArray<Attribute<Msg>>
  indicator: ReadonlyArray<Attribute<Msg>>
  text: ReadonlyArray<Attribute<Msg>>
  label: ReadonlyArray<Attribute<Msg>>
  description: ReadonlyArray<Attribute<Msg>>
}>

export const renderRadioGroup = <Msg>(
  props: RadioGroupBehaviorProps<Msg>,
  visual: RadioGroupVisualAttributes<Msg>,
  toIndicator: (isSelected: boolean, h: HtmlBuilder<Msg>) => Html,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: StringRadioGroup.view,
    viewInputs: {
      selectedValue: props.selectedValue,
      options: props.options.map(option => option.value),
      ariaLabel: props.ariaLabel,
      isDisabled: props.isDisabled ?? false,
      isReadOnly: props.isReadOnly ?? false,
      isOptionDisabled: (_value, index) =>
        props.options[index]?.isDisabled === true,
      hasOptionDescription: (_value, index) =>
        props.options[index]?.description !== undefined,
      ...(props.name === undefined ? {} : { name: props.name }),
      ...(props.orientation === undefined
        ? {}
        : { orientation: props.orientation }),
      toView: ({ group, options, hiddenInput }) =>
        h.div(
          [
            ...group,
            h.DataAttribute('slot', 'radio-group'),
            ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
            ...visual.group,
          ],
          [
            ...options.map(option => {
              const content = props.options[option.index]
              if (content === undefined) return h.empty
              return h.div(
                [...visual.row],
                [
                  h.button(
                    [
                      ...option.option.filter(
                        attribute =>
                          content.description !== undefined ||
                          childAttributeTag(attribute) !== 'AriaDescribedBy',
                      ),
                      h.Type('button'),
                      h.DataAttribute('slot', 'radio-group-item'),
                      ...(content.isInvalid === true
                        ? [h.AriaInvalid(true)]
                        : []),
                      ...visual.item(option),
                    ],
                    [
                      h.span(
                        [
                          h.DataAttribute('slot', 'radio-group-indicator'),
                          ...visual.indicator,
                        ],
                        [toIndicator(option.isSelected, h)],
                      ),
                    ],
                  ),
                  h.div(
                    [...visual.text],
                    [
                      h.label(
                        [
                          ...option.label,
                          h.For(
                            `${props.model.id}-option-${String(option.index)}`,
                          ),
                          ...visual.label,
                        ],
                        [content.label],
                      ),
                      ...(content.description === undefined
                        ? []
                        : [
                            h.p(
                              [...option.description, ...visual.description],
                              [content.description],
                            ),
                          ]),
                    ],
                  ),
                ],
              )
            }),
            ...(props.name === undefined ? [] : [h.input([...hiddenInput])]),
          ],
        ),
    },
    toParentMessage: props.toParentMessage,
  })
