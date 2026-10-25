import { Button as ButtonPrimitive } from '@foldkit/ui'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

export type ButtonType = 'button' | 'submit' | 'reset'

export type ButtonBehaviorProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  onClick?: Msg
  /** Native behavior attributes supplied by a composing overlay or dialog. */
  buttonAttributes?: ReadonlyArray<Attribute<Msg> | ChildAttribute>
  id?: string
  isDisabled?: boolean
  isLoading?: boolean
  loadingContent?: ReadonlyArray<Html | string>
  leadingIcon?: Html
  trailingIcon?: Html
  type?: ButtonType
  isAutofocus?: boolean
  ariaLabel?: string
  name?: string
  value?: string
  form?: string
  slot?: string
  dataSize?: string
}>

export type ButtonLinkBehaviorProps = Readonly<{
  children: ReadonlyArray<Html | string>
  href: string
  leadingIcon?: Html
  trailingIcon?: Html
  ariaLabel?: string
  slot?: string
  dataSize?: string
  target?: '_blank' | '_self'
}>

const content = <Msg>(
  props: Pick<
    ButtonBehaviorProps<Msg>,
    'children' | 'isLoading' | 'loadingContent' | 'leadingIcon' | 'trailingIcon'
  >,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html> => [
  ...(props.isLoading === true && props.loadingContent !== undefined
    ? [
        h.span(
          [
            h.DataAttribute('slot', 'button-loading'),
            h.AriaHidden(true),
            h.Style({ display: 'contents' }),
          ],
          [...props.loadingContent],
        ),
      ]
    : []),
  ...(props.leadingIcon === undefined
    ? []
    : [
        h.span(
          [h.DataAttribute('slot', 'button-icon'), h.AriaHidden(true)],
          [props.leadingIcon],
        ),
      ]),
  h.span(
    [
      h.DataAttribute('slot', 'button-content'),
      h.Style({ display: 'contents' }),
    ],
    [...props.children],
  ),
  ...(props.trailingIcon === undefined
    ? []
    : [
        h.span(
          [h.DataAttribute('slot', 'button-icon'), h.AriaHidden(true)],
          [props.trailingIcon],
        ),
      ]),
]

export const renderButton = <Msg>(
  props: ButtonBehaviorProps<Msg>,
  visualAttributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  h: HtmlBuilder<Msg>,
): Html => {
  const isDisabled = props.isDisabled === true || props.isLoading === true

  return ButtonPrimitive.view(
    {
      ...(props.onClick === undefined ? {} : { onClick: props.onClick }),
      isDisabled,
      type: props.type ?? 'button',
      isAutofocus: props.isAutofocus ?? false,
      toView: ({ button: primitiveAttributes }) =>
        h.button(
          [
            ...primitiveAttributes,
            h.DataAttribute('slot', props.slot ?? 'button'),
            h.DataAttribute(
              'state',
              props.isLoading === true ? 'loading' : 'idle',
            ),
            ...(props.dataSize === undefined
              ? []
              : [h.DataAttribute('size', props.dataSize)]),
            ...(isDisabled ? [h.Disabled(true)] : []),
            ...(props.id === undefined ? [] : [h.Id(props.id)]),
            ...(props.ariaLabel === undefined
              ? []
              : [h.AriaLabel(props.ariaLabel)]),
            ...(props.name === undefined ? [] : [h.Name(props.name)]),
            ...(props.value === undefined ? [] : [h.Value(props.value)]),
            ...(props.form === undefined ? [] : [h.FormAttr(props.form)]),
            ...(props.buttonAttributes ?? []),
            ...visualAttributes,
          ],
          content(props, h),
        ),
    },
    h,
  )
}

export const renderButtonLink = <Msg>(
  props: ButtonLinkBehaviorProps,
  visualAttributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.Href(props.href),
      h.DataAttribute('slot', props.slot ?? 'button'),
      ...(props.dataSize === undefined
        ? []
        : [h.DataAttribute('size', props.dataSize)]),
      ...(props.target === undefined
        ? []
        : [h.Attribute('target', props.target)]),
      ...(props.target === '_blank' ? [h.Rel('noopener noreferrer')] : []),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...visualAttributes,
    ],
    content(props, h),
  )
