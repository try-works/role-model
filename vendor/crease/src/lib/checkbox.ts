import { Checkbox as CheckboxPrimitive } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

export type CheckboxBehaviorProps<Msg> = Readonly<{
  id: string
  isChecked: boolean
  /** Optional only because a read-only checkbox is decorative and its
   *  toggle can never fire. */
  onToggle?: (isChecked: boolean) => Msg
  label?: Html | string
  description?: Html | string
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  isIndeterminate?: boolean
  name?: string
  value?: string
}>

export type CheckboxVisualAttributes<Msg> = Readonly<{
  root: ReadonlyArray<Attribute<Msg>>
  control: ReadonlyArray<Attribute<Msg>>
  indicator: ReadonlyArray<Attribute<Msg>>
  text: ReadonlyArray<Attribute<Msg>>
  label: ReadonlyArray<Attribute<Msg>>
  description: ReadonlyArray<Attribute<Msg>>
}>

export const renderCheckbox = <Msg>(
  props: CheckboxBehaviorProps<Msg>,
  visual: CheckboxVisualAttributes<Msg>,
  indicator: Html,
  h: HtmlBuilder<Msg>,
): Html =>
  CheckboxPrimitive.view(
    {
      id: props.id,
      isChecked: props.isChecked,
      onToggle:
        props.onToggle ??
        (() => {
          throw new Error('checkbox: a toggleable checkbox needs onToggle')
        }),
      isDisabled: props.isDisabled ?? false,
      isReadOnly: props.isReadOnly ?? false,
      isIndeterminate: props.isIndeterminate ?? false,
      ...(props.name === undefined ? {} : { name: props.name }),
      ...(props.value === undefined ? {} : { value: props.value }),
      hasDescription: props.description !== undefined,
      toView: ({ checkbox, label, description, hiddenInput }) =>
        h.div(
          [h.DataAttribute('slot', 'checkbox-field'), ...visual.root],
          [
            h.button(
              [
                ...checkbox.filter(
                  attribute =>
                    props.description !== undefined ||
                    attribute._tag !== 'AriaDescribedBy',
                ),
                h.Id(props.id),
                h.Type('button'),
                h.DataAttribute('slot', 'checkbox'),
                h.AriaInvalid(props.isInvalid ?? false),
                ...visual.control,
              ],
              [
                h.span(
                  [
                    h.DataAttribute('slot', 'checkbox-indicator'),
                    ...visual.indicator,
                  ],
                  [indicator],
                ),
              ],
            ),
            ...(props.label === undefined && props.description === undefined
              ? []
              : [
                  h.div(
                    [...visual.text],
                    [
                      ...(props.label === undefined
                        ? []
                        : [
                            h.label([...label, ...visual.label], [props.label]),
                          ]),
                      ...(props.description === undefined
                        ? []
                        : [
                            h.p(
                              [...description, ...visual.description],
                              [props.description],
                            ),
                          ]),
                    ],
                  ),
                ]),
            ...(props.name === undefined ? [] : [h.input([...hiddenInput])]),
          ],
        ),
    },
    h,
  )
