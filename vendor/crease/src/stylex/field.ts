import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
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
} from './field.markers.stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import { className, type Marker } from './style'
import { tokens } from './tokens.stylex'
export type { ControlFieldParts, FieldError } from '@/lib/field'

/** Legend id for the fieldset's `id`; pass to `fieldLegend`'s `id` prop. */
export const fieldSetLegendId = FieldsetPrimitive.legendId
/** Description id for the fieldset's `id`; pass to `fieldDescription`'s `id` prop. */
export const fieldSetDescriptionId = FieldsetPrimitive.descriptionId
export type FieldVariants = Readonly<{
  orientation?: 'vertical' | 'horizontal' | 'responsive' | null
}>
type Slot = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>
const styles = stylex.create({
  set: {
    gap: {
      default: '1.5rem',
      ':has(>[data-slot=checkbox-group])': '0.75rem',
      ':has(>[data-slot=radio-group])': '0.75rem',
    },
    display: 'flex',
    flexDirection: 'column',
  },
  legend: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    marginBottom: '0.75rem',
  },
  legendLabel: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  group: {
    gap: {
      '[data-slot="checkbox-group"]': '0.75rem',
      default: '1.75rem',
      ':where([data-slot="field-group"] > *)': '1rem',
    },
    containerName: 'field-group',
    containerType: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  field: {
    padding: {
      default: null,
      ':where([data-slot="field-label"] > *)': '1rem',
    },
    gap: '0.5rem',
    display: 'flex',
    marginBlockEnd: {
      default: null,
      ':where([data-slot="form"] > *:not(:last-child))': '1.5rem',
    },
    width: '100%',
  },
  vertical: { flexDirection: 'column' },
  horizontal: {
    alignItems: {
      default: 'center',
      ':has(>[data-slot=field-content])': 'flex-start',
    },
    flexDirection: 'row',
  },
  responsive: {
    alignItems: {
      '@container field-group (min-width: 28rem)': {
        default: 'center',
        ':has(> [data-slot="field-content"])': 'flex-start',
      },
    },
    flexDirection: {
      default: 'column',
      '@container field-group (min-width: 28rem)': 'row',
    },
  },
  invalid: { color: tokens.destructive },
  content: {
    flex: '1',
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.375,
  },
  label: {
    flex: {
      default: null,
      ':where([data-slot="field"][data-orientation="horizontal"] > *)': 'auto',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    width: {
      default: null,
      ':where([data-slot="field"][data-orientation="responsive"] > *)': '100%',
      ':where([data-slot="field"][data-orientation="vertical"] > *)': '100%',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
  },
  controlLabel: { lineHeight: 1, userSelect: 'none' },
  fieldLabel: {
    borderColor: {
      default: tokens.border,
      ':has([data-checked])': tokens.primary,
    },
    borderRadius: {
      default: null,
      ':has(>[data-slot=field])': foundationTokens.radiusMd,
    },
    borderStyle: {
      default: null,
      ':has(>[data-slot=field])': 'solid',
    },
    borderWidth: {
      default: null,
      ':has(>[data-slot=field])': 1,
    },
    backgroundColor: {
      default: 'transparent',
      ':has([data-checked])': foundationTokens.primaryFaint,
    },
    flexDirection: {
      default: null,
      ':has(>[data-slot=field])': 'column',
    },
    lineHeight: 1.375,
    userSelect: 'none',
    width: {
      default: 'fit-content',
      ':where([data-slot="field"][data-orientation="responsive"] > *)': '100%',
      ':where([data-slot="field"][data-orientation="vertical"] > *)': '100%',
      ':has(>[data-slot=field])': '100%',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
  },
  labelDisabled: {
    opacity: {
      default: null,
      [stylex.when.ancestor(':is(*)', fieldDisabledScope)]: 0.5,
    },
  },
  fontNormal: { fontWeight: 400 },
  title: {
    flex: {
      default: null,
      ':where([data-slot="field"][data-orientation="horizontal"] > *)': 'auto',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.375,
    width: {
      default: 'fit-content',
      ':where([data-slot="field"][data-orientation="responsive"] > *)': '100%',
      ':where([data-slot="field"][data-orientation="vertical"] > *)': '100%',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  descriptionSpacing: {
    textWrap: {
      default: null,
      ':where([data-slot="field"]:has([data-orientation="horizontal"]) *)':
        'balance',
    },
    marginTop: {
      default: null,
      ':is([data-slot="field-legend"][data-variant="legend"] + *)': '-0.375rem',
      ':last-child': '0px',
      ':nth-last-child(2)': '-0.25rem',
    },
  },
  separator: {
    marginBlock: '-0.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    marginBlockEnd: {
      default: null,
      ':where([data-slot="field-group"][data-variant="outline"] *)': '-0.5rem',
    },
    position: 'relative',
    height: '1.25rem',
  },
  rule: {
    inset: 0,
    /* TW's separator() emits bg-border (var(--border), preset-scoped). */
    backgroundColor: tokens.border,
    flexShrink: 0,
    position: 'absolute',
    height: '1px',
    top: '50%',
    width: '100%',
  },
  separatorContent: {
    marginInline: 'auto',
    paddingInline: '0.5rem',
    backgroundColor: tokens.background,
    color: tokens.mutedForeground,
    display: 'block',
    position: 'relative',
    width: 'fit-content',
  },
  error: {
    color: tokens.destructive,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  },
  errorList: {
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    listStyleType: 'disc',
    marginInlineStart: '1rem',
  },
})
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
    styles[o.orientation ?? 'vertical'] as StaticStyles,
    orientationMarker(o.orientation ?? 'vertical'),
  )
export type ControlFieldProps<Msg> = SharedControlFieldProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle }>
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
            styles[orientation] as StaticStyles,
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
          styles[orientation] as StaticStyles,
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
  layoutStyle?: ComponentLayoutStyle
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
  layoutStyle?: ComponentLayoutStyle
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
