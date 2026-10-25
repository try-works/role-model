import { Input as InputPrimitive } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

export type InputMode =
  | 'none'
  | 'text'
  | 'decimal'
  | 'numeric'
  | 'tel'
  | 'search'
  | 'email'
  | 'url'

export type InputBehaviorProps<Msg> = Readonly<{
  id: string
  value: string
  onInput?: (value: string) => Msg
  onChange?: (value: string) => Msg
  label?: Html | string
  description?: Html | string
  placeholder?: string
  type?: string
  name?: string
  form?: string
  autocomplete?: string
  inputMode?: InputMode
  describedBy?: string
  /** Extra WAI-ARIA role for composite inputs (e.g. 'searchbox', 'combobox'). */
  role?: string
  ariaLabel?: string
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
  isRequired?: boolean
}>

export type InputVisualAttributes<Msg> = Readonly<{
  field: ReadonlyArray<Attribute<Msg>>
  label: ReadonlyArray<Attribute<Msg>>
  input: ReadonlyArray<Attribute<Msg>>
  description: ReadonlyArray<Attribute<Msg>>
}>

const descriptionIds = <Msg>(
  props: InputBehaviorProps<Msg>,
): string | undefined => {
  const ids = [
    ...(props.description === undefined
      ? []
      : [InputPrimitive.descriptionId(props.id)]),
    ...(props.describedBy === undefined ? [] : [props.describedBy]),
  ]

  return ids.length === 0 ? undefined : [...new Set(ids)].join(' ')
}

export const renderInput = <Msg>(
  props: InputBehaviorProps<Msg>,
  visual: InputVisualAttributes<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  InputPrimitive.view(
    {
      id: props.id,
      value: props.value,
      ...(props.onInput === undefined ? {} : { onInput: props.onInput }),
      isDisabled: props.isDisabled ?? false,
      isReadOnly: props.isReadOnly ?? false,
      isInvalid: props.isInvalid ?? false,
      isAutofocus: props.isAutofocus ?? false,
      type: props.type ?? 'text',
      ...(props.name === undefined ? {} : { name: props.name }),
      ...(props.placeholder === undefined
        ? {}
        : { placeholder: props.placeholder }),
      toView: ({ input: primitiveInput, label, description }) => {
        const isInteractive =
          props.isDisabled !== true && props.isReadOnly !== true
        const describedBy = descriptionIds(props)
        const inputAttributes = primitiveInput.filter(
          attribute => attribute._tag !== 'AriaDescribedBy',
        )
        const control = h.input([
          ...inputAttributes,
          h.DataAttribute('slot', 'input'),
          ...(props.onChange === undefined || !isInteractive
            ? []
            : [h.OnChange(props.onChange)]),
          ...(props.isRequired === true
            ? [h.Required(true), h.AriaRequired(true)]
            : []),
          ...(props.form === undefined ? [] : [h.FormAttr(props.form)]),
          ...(props.autocomplete === undefined
            ? []
            : [h.Autocomplete(props.autocomplete)]),
          ...(props.inputMode === undefined
            ? []
            : [h.InputMode(props.inputMode)]),
          ...(props.role === undefined ? [] : [h.Role(props.role)]),
          ...(props.ariaLabel === undefined
            ? []
            : [h.AriaLabel(props.ariaLabel)]),
          ...(describedBy === undefined
            ? []
            : [h.AriaDescribedBy(describedBy)]),
          ...visual.input,
        ])

        if (props.label === undefined && props.description === undefined)
          return control

        return h.div(
          [
            h.DataAttribute('slot', 'input-field'),
            h.DataAttribute(
              'state',
              props.isInvalid === true ? 'invalid' : 'valid',
            ),
            ...visual.field,
          ],
          [
            ...(props.label === undefined
              ? []
              : [
                  h.label(
                    [
                      h.DataAttribute('slot', 'input-label'),
                      ...label,
                      ...visual.label,
                    ],
                    [props.label],
                  ),
                ]),
            control,
            ...(props.description === undefined
              ? []
              : [
                  h.p(
                    [
                      h.DataAttribute('slot', 'input-description'),
                      ...description,
                      ...visual.description,
                    ],
                    [props.description],
                  ),
                ]),
          ],
        )
      },
    },
    h,
  )
