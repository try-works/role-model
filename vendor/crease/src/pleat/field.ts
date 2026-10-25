import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Fieldset as FieldsetPrimitive } from '@foldkit/ui'
import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  type ControlFieldProps as SharedControlFieldProps,
  type FieldError,
  fieldErrorMessages,
  renderControlField,
} from '@/lib/field'
import type { ComponentLayoutStyle } from './contracts'
import {
  fieldDisabledScope,
  fieldGroupScope,
  fieldHorizontalScope,
  fieldLabelScope,
  fieldResponsiveScope,
  fieldVerticalScope,
} from './field.markers'
import { foundationTokens } from './foundations-tokens'
import { className, type Marker } from './style'
import { tokens } from './tokens'
export type { ControlFieldParts, FieldError } from '@/lib/field'

/** Legend id for the fieldset's `id`; pass to `fieldLegend`'s `id` prop. */
export const fieldSetLegendId = FieldsetPrimitive.legendId
/** Description id for the fieldset's `id`; pass to `fieldDescription`'s `id` prop. */
export const fieldSetDescriptionId = FieldsetPrimitive.descriptionId
export type FieldVariants = Readonly<{
  orientation?: 'vertical' | 'horizontal' | 'responsive' | null
}>
type Slot = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
  children: ReadonlyArray<Html | string>
}>
const styles = {
  set: Style.make({
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  }).pipe(
    Style.when(When.pseudo(':has(>[data-slot=checkbox-group])'), {
      gap: '0.75rem',
    }),
    Style.when(When.pseudo(':has(>[data-slot=radio-group])'), {
      gap: '0.75rem',
    }),
  ),
  legend: Style.make({
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    marginBottom: '0.75rem',
  }),
  legendLabel: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  group: Style.make({
    gap: '1.75rem',
    containerName: 'field-group',
    containerType: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }).pipe(
    Style.when(When.data('slot', 'checkbox-group'), { gap: '0.75rem' }),
    Style.when(When.pseudo(':where([data-slot="field-group"] > *)'), {
      gap: '1rem',
    }),
  ),
  field: Style.make({ gap: '0.5rem', display: 'flex', width: '100%' }).pipe(
    Style.when(When.pseudo(':where([data-slot="field-label"] > *)'), {
      padding: '1rem',
    }),
    Style.when(When.pseudo(':where([data-slot="form"] > *:not(:last-child))'), {
      marginBlockEnd: '1.5rem',
    }),
  ),
  vertical: Style.make({ flexDirection: 'column' }),
  horizontal: Style.make({ alignItems: 'center', flexDirection: 'row' }).pipe(
    Style.when(When.pseudo(':has(>[data-slot=field-content])'), {
      alignItems: 'flex-start',
    }),
  ),
  responsive: Style.make({ flexDirection: 'column' }).pipe(
    Style.when(When.container('(min-width: 28rem)', 'field-group'), {
      alignItems: 'center',
      flexDirection: 'row',
    }),
    Style.when(
      When.all(
        When.container('(min-width: 28rem)', 'field-group'),
        When.pseudo(':has(> [data-slot="field-content"])'),
      ),
      { alignItems: 'flex-start' },
    ),
  ),
  invalid: Style.make({ color: tokens.destructive }),
  content: Style.make({
    flex: '1',
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.375,
  }),
  label: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }).pipe(
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="horizontal"] > *)',
      ),
      { flex: 'auto' },
    ),
    Style.when(
      When.all(
        When.container('(min-width: 28rem)', 'field-group'),
        When.pseudo(
          ':where([data-slot="field"][data-orientation="responsive"] > *)',
        ),
      ),
      { flex: 'auto', width: 'auto' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="responsive"] > *)',
      ),
      { width: '100%' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="vertical"] > *)',
      ),
      { width: '100%' },
    ),
  ),
  controlLabel: Style.make({ lineHeight: 1, userSelect: 'none' }),
  fieldLabel: Style.make({
    borderColor: tokens.border,
    backgroundColor: 'transparent',
    lineHeight: 1.375,
    userSelect: 'none',
    width: 'fit-content',
  }).pipe(
    Style.when(When.has(When.data('checked')), {
      borderColor: tokens.primary,
      backgroundColor: foundationTokens.primaryFaint,
    }),
    Style.when(When.pseudo(':has(>[data-slot=field])'), {
      borderRadius: foundationTokens.radiusMd,
      borderStyle: 'solid',
      borderWidth: 1,
      flexDirection: 'column',
      width: '100%',
    }),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="responsive"] > *)',
      ),
      { width: '100%' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="vertical"] > *)',
      ),
      { width: '100%' },
    ),
    Style.when(
      When.all(
        When.container('(min-width: 28rem)', 'field-group'),
        When.pseudo(
          ':where([data-slot="field"][data-orientation="responsive"] > *)',
        ),
      ),
      { width: 'auto' },
    ),
  ),
  labelDisabled: Style.empty.pipe(
    Style.when(When.within(fieldDisabledScope, When.pseudo(':is(*)')), {
      opacity: 0.5,
    }),
  ),
  fontNormal: Style.make({ fontWeight: 400 }),
  title: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.375,
    width: 'fit-content',
  }).pipe(
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="horizontal"] > *)',
      ),
      { flex: 'auto' },
    ),
    Style.when(
      When.all(
        When.container('(min-width: 28rem)', 'field-group'),
        When.pseudo(
          ':where([data-slot="field"][data-orientation="responsive"] > *)',
        ),
      ),
      { flex: 'auto', width: 'auto' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="responsive"] > *)',
      ),
      { width: '100%' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="vertical"] > *)',
      ),
      { width: '100%' },
    ),
  ),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  }),
  descriptionSpacing: Style.empty.pipe(
    Style.when(
      When.pseudo(
        ':where([data-slot="field"]:has([data-orientation="horizontal"]) *)',
      ),
      { textWrap: 'balance' },
    ),
    Style.when(
      When.pseudo(':is([data-slot="field-legend"][data-variant="legend"] + *)'),
      { marginTop: '-0.375rem' },
    ),
    Style.when(When.lastChild, { marginTop: '0px' }),
    Style.when(When.pseudo(':nth-last-child(2)'), { marginTop: '-0.25rem' }),
  ),
  separator: Style.make({
    marginBlock: '-0.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    position: 'relative',
    height: '1.25rem',
  }).pipe(
    Style.when(
      When.pseudo(
        ':where([data-slot="field-group"][data-variant="outline"] *)',
      ),
      { marginBlockEnd: '-0.5rem' },
    ),
  ),
  rule: Style.make({
    inset: 0,
    backgroundColor: tokens.border,
    flexShrink: 0,
    position: 'absolute',
    height: '1px',
    top: '50%',
    width: '100%',
  }),
  separatorContent: Style.make({
    marginInline: 'auto',
    paddingInline: '0.5rem',
    backgroundColor: tokens.background,
    color: tokens.mutedForeground,
    display: 'block',
    position: 'relative',
    width: 'fit-content',
  }),
  error: Style.make({
    color: tokens.destructive,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  }),
  errorList: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    listStyleType: 'disc',
    marginInlineStart: '1rem',
  }),
}
export type FieldSetProps = Slot &
  Readonly<{
    isDisabled?: boolean
    /** Base id; wires legend/description ids and aria-describedby via the
        foldkit Fieldset primitive. Pair with `fieldSetLegendId` and
        `fieldSetDescriptionId`. */
    id?: string
    /** Set when a `fieldDescription` is rendered inside this fieldset. */
    hasDescription?: boolean
  }>
export const fieldSet = <Msg>(p: FieldSetProps, h: HtmlBuilder<Msg>): Html => {
  if (p.id !== undefined) {
    return FieldsetPrimitive.view(
      {
        id: p.id,
        ...(p.isDisabled === undefined ? {} : { isDisabled: p.isDisabled }),
        ...(p.hasDescription === undefined
          ? {}
          : { hasDescription: p.hasDescription }),
        toView: ({ fieldset }) =>
          h.fieldset(
            [
              ...fieldset,
              h.DataAttribute('slot', 'field-set'),
              h.Class(className(reset.fieldset, styles.set, p.layoutStyle)),
            ],
            [...p.children],
          ),
      },
      h,
    )
  }
  return h.fieldset(
    [
      h.DataAttribute('slot', 'field-set'),
      ...(p.isDisabled === undefined ? [] : [h.Disabled(p.isDisabled)]),
      h.Class(className(reset.fieldset, styles.set, p.layoutStyle)),
    ],
    [...p.children],
  )
}
export type FieldLegendProps = Slot &
  Readonly<{ variant?: 'legend' | 'label'; id?: string }>
export const fieldLegend = <Msg>(
  p: FieldLegendProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.legend(
    [
      h.DataAttribute('slot', 'field-legend'),
      ...(p.id === undefined ? [] : [h.Id(p.id)]),
      h.DataAttribute('variant', p.variant ?? 'legend'),
      h.Class(
        className(
          reset.text,
          styles.legend,
          p.variant === 'label' && styles.legendLabel,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export type FieldGroupProps = Slot &
  Readonly<{ variant?: 'default' | 'outline' }>
export const fieldGroup = <Msg>(
  p: FieldGroupProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'field-group'),
      ...(p.variant === undefined
        ? []
        : [h.DataAttribute('variant', p.variant)]),
      h.Class(className(styles.group, fieldGroupScope, p.layoutStyle)),
    ],
    [...p.children],
  )
const orientationMarker = (
  orientation: NonNullable<FieldVariants['orientation']>,
): Marker =>
  orientation === 'horizontal'
    ? fieldHorizontalScope
    : orientation === 'responsive'
      ? fieldResponsiveScope
      : fieldVerticalScope
export const fieldVariants = (o: FieldVariants = {}): string =>
  className(
    styles.field,
    styles[o.orientation ?? 'vertical'] as Style.Style,
    orientationMarker(o.orientation ?? 'vertical'),
  )
export type ControlFieldProps<Msg> = SharedControlFieldProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle | undefined }>
export const controlField = <Msg>(
  p: ControlFieldProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = p.orientation ?? 'vertical'
  return renderControlField(
    p,
    {
      field: [
        h.Class(
          className(
            styles.field,
            styles[orientation] as Style.Style,
            (p.isInvalid === true ||
              p.error !== undefined ||
              fieldErrorMessages(p.errors).length > 0) &&
              styles.invalid,
            p.isDisabled && fieldDisabledScope,
            orientationMarker(orientation),
            p.layoutStyle,
          ),
        ),
      ],
      label: [
        h.Class(
          className(styles.label, styles.controlLabel, styles.labelDisabled),
        ),
      ],
      description: [h.Class(className(reset.text, styles.description))],
      error: [h.Class(className(reset.text, styles.error))],
      errorList: [h.Class(className(reset.list, styles.errorList))],
    },
    h,
  )
}
export type FieldProps = Slot &
  Readonly<{
    orientation?: FieldVariants['orientation']
    isInvalid?: boolean
    isDisabled?: boolean
    direction?: 'ltr' | 'rtl'
  }>
export const field = <Msg>(p: FieldProps, h: HtmlBuilder<Msg>): Html => {
  const orientation = p.orientation ?? 'vertical'
  return h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'field'),
      h.DataAttribute('orientation', orientation),
      ...(p.direction === undefined ? [] : [h.Dir(p.direction)]),
      ...(p.isInvalid ? [h.DataAttribute('invalid', 'true')] : []),
      ...(p.isDisabled ? [h.DataAttribute('disabled', '')] : []),
      h.Class(
        className(
          styles.field,
          styles[orientation] as Style.Style,
          p.isInvalid && styles.invalid,
          p.isDisabled && fieldDisabledScope,
          orientationMarker(orientation),
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
}
export const fieldContent = <Msg>(p: Slot, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'field-content'),
      h.Class(className(styles.content, p.layoutStyle)),
    ],
    [...p.children],
  )
export type FieldLabelProps = Slot &
  Readonly<{ for?: string; id?: string; weight?: 'normal' | 'medium' }>
export const fieldLabel = <Msg>(
  p: FieldLabelProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.label(
    [
      h.DataAttribute('slot', 'field-label'),
      ...(p.id === undefined ? [] : [h.Id(p.id)]),
      ...(p.for === undefined ? [] : [h.For(p.for)]),
      h.Class(
        className(
          styles.label,
          styles.fieldLabel,
          styles.labelDisabled,
          fieldLabelScope,
          p.weight === 'normal' && styles.fontNormal,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export const fieldTitle = <Msg>(p: Slot, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'field-label'),
      h.Class(className(styles.title, styles.labelDisabled, p.layoutStyle)),
    ],
    [...p.children],
  )
export const fieldDescription = <Msg>(
  p: Slot & Readonly<{ id?: string }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.p(
    [
      h.DataAttribute('slot', 'field-description'),
      ...(p.id === undefined ? [] : [h.Id(p.id)]),
      h.Class(
        className(
          reset.text,
          styles.description,
          styles.descriptionSpacing,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export type FieldSeparatorProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
  children?: ReadonlyArray<Html | string>
}>
export const fieldSeparator = <Msg>(
  p: FieldSeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const has = (p.children?.length ?? 0) > 0
  return h.div(
    [
      h.DataAttribute('slot', 'field-separator'),
      h.DataAttribute('content', String(has)),
      h.Class(className(styles.separator, p.layoutStyle)),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'separator'),
          h.DataAttribute('orientation', 'horizontal'),
          h.Role('none'),
          h.Class(className(styles.rule)),
        ],
        [],
      ),
      ...(has
        ? [
            h.span(
              [
                h.DataAttribute('slot', 'field-separator-content'),
                h.Class(className(styles.separatorContent)),
              ],
              [...(p.children ?? [])],
            ),
          ]
        : []),
    ],
  )
}
export type FieldErrorProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
  children?: ReadonlyArray<Html | string>
  errors?: ReadonlyArray<FieldError>
}>
export const fieldError = <Msg>(
  p: FieldErrorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const children = p.children ?? [],
    messages = fieldErrorMessages(p.errors)
  if (children.length === 0 && messages.length === 0) return h.empty
  const content =
    children.length > 0
      ? children
      : messages.length === 1
        ? [messages[0] ?? '']
        : [
            h.ul(
              [h.Class(className(reset.list, styles.errorList))],
              messages.map(message => h.li([], [message])),
            ),
          ]
  return h.div(
    [
      h.Role('alert'),
      h.DataAttribute('slot', 'field-error'),
      h.Class(className(styles.error, p.layoutStyle)),
    ],
    content,
  )
}
