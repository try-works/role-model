import { Option, Stream } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

export type FormMethod = 'get' | 'post' | 'dialog'

export type FormBehaviorProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  id?: string
  name?: string
  action?: string
  method?: FormMethod
  autocomplete?: 'on' | 'off'
  isNoValidate?: boolean
  onSubmit?: Msg
  ariaLabel?: string
}>

export type FormError = Readonly<{
  controlId: string
  message: Html | string
}>

export type ErrorSummaryProps<Msg> = Readonly<{
  id: string
  title: Html | string
  errors: ReadonlyArray<FormError>
  isAutofocus?: boolean
  onErrorLink?: (controlId: string) => Msg
}>

export type ErrorSummaryVisualAttributes<Msg> = Readonly<{
  root: ReadonlyArray<Attribute<Msg>>
  title: ReadonlyArray<Attribute<Msg>>
  list: ReadonlyArray<Attribute<Msg>>
  link: ReadonlyArray<Attribute<Msg>>
}>

export const formControlIds = (
  id: string,
): Readonly<{
  descriptionId: string
  messageId: string
  describedBy: string
}> => {
  const descriptionId = `${id}-description`
  const messageId = `${id}-message`
  return {
    descriptionId,
    messageId,
    describedBy: `${descriptionId} ${messageId}`,
  }
}

export const renderForm = <Msg>(
  props: FormBehaviorProps<Msg>,
  visual: ReadonlyArray<Attribute<Msg>>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.form(
    [
      h.DataAttribute('slot', 'form'),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
      ...(props.name === undefined ? [] : [h.Name(props.name)]),
      ...(props.action === undefined ? [] : [h.Action(props.action)]),
      ...(props.method === undefined ? [] : [h.Method(props.method)]),
      ...(props.autocomplete === undefined
        ? []
        : [h.Attribute('autocomplete', props.autocomplete)]),
      ...(props.isNoValidate === undefined
        ? []
        : [h.Novalidate(props.isNoValidate)]),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.onSubmit === undefined ? [] : [h.OnSubmit(props.onSubmit)]),
      ...visual,
    ],
    [...props.children],
  )

export const renderErrorSummary = <Msg>(
  props: ErrorSummaryProps<Msg>,
  visual: ErrorSummaryVisualAttributes<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  if (props.errors.length === 0) return h.empty
  const titleId = `${props.id}-title`
  return h.div(
    [
      h.Id(props.id),
      h.Key(props.id),
      h.Role('alert'),
      h.AriaLabelledBy(titleId),
      h.Tabindex(-1),
      ...(props.isAutofocus === true
        ? [
            h.OnMount({
              name: `focus-form-error-summary-${props.id}`,
              f: element => {
                if (element instanceof HTMLElement) element.focus()
                return Stream.empty
              },
            }),
          ]
        : []),
      h.DataAttribute('slot', 'form-error-summary'),
      ...visual.root,
    ],
    [
      h.p(
        [
          h.Id(titleId),
          h.DataAttribute('slot', 'form-error-summary-title'),
          ...visual.title,
        ],
        [props.title],
      ),
      h.ul(
        [h.DataAttribute('slot', 'form-error-summary-list'), ...visual.list],
        props.errors.map(error =>
          h.li(
            [],
            [
              h.a(
                props.onErrorLink === undefined
                  ? [
                      h.Href(`#${error.controlId}`),
                      h.DataAttribute('slot', 'form-error-summary-link'),
                      ...visual.link,
                    ]
                  : [
                      h.Tabindex(0),
                      h.Role('link'),
                      h.OnClick(props.onErrorLink(error.controlId), {
                        focusSelector: `#${error.controlId}`,
                      }),
                      h.OnKeyDownFocus(key =>
                        key === 'Enter' && props.onErrorLink !== undefined
                          ? Option.some({
                              focusSelector: `#${error.controlId}`,
                              message: props.onErrorLink(error.controlId),
                            })
                          : Option.none(),
                      ),
                      h.DataAttribute('slot', 'form-error-summary-link'),
                      ...visual.link,
                    ],
                [error.message],
              ),
            ],
          ),
        ),
      ),
    ],
  )
}
