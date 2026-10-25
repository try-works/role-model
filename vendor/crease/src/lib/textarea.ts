import { Textarea as TextareaPrimitive } from '@foldkit/ui'
import type {
  Attribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from 'foldkit/html'

export type ResizePolicy = 'none' | 'vertical' | 'horizontal' | 'both'
export type WrapPolicy = 'soft' | 'hard' | 'off'

export type TextareaBehaviorProps<Msg> = Readonly<{
  id: string
  value: string
  onInput?: (value: string) => Msg
  onChange?: (value: string) => Msg
  label?: Html | string
  description?: Html | string
  placeholder?: string
  name?: string
  form?: string
  rows?: number
  wrap?: WrapPolicy
  resize?: ResizePolicy
  describedBy?: string
  direction?: 'ltr' | 'rtl'
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
}>

export type TextareaVisualAttributes<Msg> = Readonly<{
  field: ReadonlyArray<Attribute<Msg>>
  label: ReadonlyArray<Attribute<Msg>>
  textarea: ReadonlyArray<TextareaAttribute<Msg>>
  description: ReadonlyArray<Attribute<Msg>>
}>

const descriptionIds = <Msg>(
  props: TextareaBehaviorProps<Msg>,
): string | undefined => {
  const ids = [
    ...(props.description === undefined
      ? []
      : [TextareaPrimitive.descriptionId(props.id)]),
    ...(props.describedBy === undefined ? [] : [props.describedBy]),
  ]

  return ids.length === 0 ? undefined : [...new Set(ids)].join(' ')
}

export const renderTextarea = <Msg>(
  props: TextareaBehaviorProps<Msg>,
  visual: TextareaVisualAttributes<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  TextareaPrimitive.view(
    {
      id: props.id,
      value: props.value,
      ...(props.onInput === undefined ? {} : { onInput: props.onInput }),
      isDisabled: props.isDisabled ?? false,
      isReadOnly: props.isReadOnly ?? false,
      isInvalid: props.isInvalid ?? false,
      isAutofocus: props.isAutofocus ?? false,
      ...(props.name === undefined ? {} : { name: props.name }),
      ...(props.rows === undefined ? {} : { rows: props.rows }),
      ...(props.placeholder === undefined
        ? {}
        : { placeholder: props.placeholder }),
      toView: ({ textarea: primitiveTextarea, label, description }) => {
        const isInteractive =
          props.isDisabled !== true && props.isReadOnly !== true
        const describedBy = descriptionIds(props)
        const textareaAttributes = primitiveTextarea.filter(
          (attribute): attribute is TextareaAttribute<Msg> =>
            attribute._tag !== 'AriaDescribedBy',
        )
        const control = h.textarea([
          ...textareaAttributes,
          h.DataAttribute('slot', 'textarea'),
          h.DataAttribute('resize', props.resize ?? 'vertical'),
          ...(props.onChange === undefined || !isInteractive
            ? []
            : [h.OnChange(props.onChange)]),
          ...(props.form === undefined ? [] : [h.FormAttr(props.form)]),
          ...(props.wrap === undefined ? [] : [h.Wrap(props.wrap)]),
          ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
          ...(describedBy === undefined
            ? []
            : [h.AriaDescribedBy(describedBy)]),
          ...visual.textarea,
        ])

        if (props.label === undefined && props.description === undefined)
          return control

        return h.div(
          [
            h.DataAttribute('slot', 'textarea-field'),
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
                      h.DataAttribute('slot', 'textarea-label'),
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
                      h.DataAttribute('slot', 'textarea-description'),
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
