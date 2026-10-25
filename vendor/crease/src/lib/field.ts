import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

export type FieldError = Readonly<{ message?: string }> | undefined
export type FieldOrientation = 'vertical' | 'horizontal' | 'responsive'

export type ControlFieldParts = Readonly<{
  controlId: string
  labelId: string
  descriptionId?: string
  errorId?: string
  describedBy?: string
  isInvalid: boolean
  isDisabled: boolean
}>

export type ControlFieldProps<Msg> = Readonly<{
  id: string
  label: Html | string
  description?: Html | string
  error?: Html | string
  errors?: ReadonlyArray<FieldError>
  orientation?: FieldOrientation
  isInvalid?: boolean
  isDisabled?: boolean
  isRequired?: boolean
  toControl: (parts: ControlFieldParts, h: HtmlBuilder<Msg>) => Html
}>

export type ControlFieldVisualAttributes<Msg> = Readonly<{
  field: ReadonlyArray<Attribute<Msg>>
  label: ReadonlyArray<Attribute<Msg>>
  description: ReadonlyArray<Attribute<Msg>>
  error: ReadonlyArray<Attribute<Msg>>
  errorList: ReadonlyArray<Attribute<Msg>>
}>

export const fieldErrorMessages = (
  errors: ReadonlyArray<FieldError> = [],
): ReadonlyArray<string> => [
  ...new Set(
    errors.flatMap(error =>
      error?.message === undefined ? [] : [error.message],
    ),
  ),
]

export const controlFieldParts = <Msg>(
  props: ControlFieldProps<Msg>,
): ControlFieldParts => {
  const messages = fieldErrorMessages(props.errors)
  const hasError = props.error !== undefined || messages.length > 0
  const descriptionId =
    props.description === undefined ? undefined : `${props.id}-description`
  const errorId = hasError ? `${props.id}-error` : undefined
  const describedBy = [descriptionId, errorId]
    .filter((id): id is string => id !== undefined)
    .join(' ')

  return {
    controlId: props.id,
    labelId: `${props.id}-label`,
    ...(descriptionId === undefined ? {} : { descriptionId }),
    ...(errorId === undefined ? {} : { errorId }),
    ...(describedBy.length === 0 ? {} : { describedBy }),
    isInvalid: props.isInvalid === true || hasError,
    isDisabled: props.isDisabled === true,
  }
}

export const renderControlField = <Msg>(
  props: ControlFieldProps<Msg>,
  visual: ControlFieldVisualAttributes<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const parts = controlFieldParts(props)
  const messages = fieldErrorMessages(props.errors)
  const errorContent =
    props.error !== undefined
      ? [props.error]
      : messages.length <= 1
        ? messages
        : [
            h.ul(
              [...visual.errorList],
              messages.map(message => h.li([], [message])),
            ),
          ]

  return h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'field'),
      h.DataAttribute('orientation', props.orientation ?? 'vertical'),
      h.DataAttribute('invalid', String(parts.isInvalid)),
      ...(parts.isDisabled ? [h.DataAttribute('disabled', '')] : []),
      ...(props.isRequired === true ? [h.DataAttribute('required', '')] : []),
      ...visual.field,
    ],
    [
      h.label(
        [
          h.Id(parts.labelId),
          h.For(parts.controlId),
          h.DataAttribute('slot', 'field-label'),
          ...visual.label,
        ],
        [props.label],
      ),
      props.toControl(parts, h),
      ...(parts.descriptionId === undefined
        ? []
        : [
            h.p(
              [
                h.Id(parts.descriptionId),
                h.DataAttribute('slot', 'field-description'),
                ...visual.description,
              ],
              [props.description ?? ''],
            ),
          ]),
      ...(parts.errorId === undefined
        ? []
        : [
            h.div(
              [
                h.Id(parts.errorId),
                h.Role('alert'),
                h.DataAttribute('slot', 'field-error'),
                ...visual.error,
              ],
              errorContent,
            ),
          ]),
    ],
  )
}
