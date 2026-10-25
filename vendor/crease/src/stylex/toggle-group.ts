import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  type Bundle as BehaviorBundle,
  Message,
  Model,
  type OutMessage,
  create as createBehavior,
  init,
} from '@/lib/toggle-group'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import type { ToggleVariants } from './toggle'
import { tokens } from './tokens.stylex'

export { Message, Model, init }
export type { OutMessage }

export type ToggleGroupItem<Value extends string = string> = Readonly<{
  value: Value
  children: ReadonlyArray<Html | string>
  ariaLabel?: string
  isDisabled?: boolean
  layoutStyle?: ComponentLayoutStyle
}>
type SingleSelection<Value extends string> = Readonly<{
  value: Value
  values?: never
}>
type MultipleSelection<Value extends string> = Readonly<{
  value?: never
  values: ReadonlyArray<Value>
}>
type SharedProps<Value extends string> = Readonly<{
  ariaLabel?: string
  items: ReadonlyArray<ToggleGroupItem<Value>>
  direction?: 'ltr' | 'rtl'
  arrangement?: 'joined' | 'wrapped'
  orientation?: 'vertical'
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
  layoutStyle?: ComponentLayoutStyle
}> &
  (SingleSelection<Value> | MultipleSelection<Value>)
export type ToggleGroupProps<Value extends string, Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  ariaLabel: string
  items: ReadonlyArray<ToggleGroupItem<Value>>
  direction?: 'ltr' | 'rtl'
  arrangement?: 'joined' | 'wrapped'
  orientation?: 'vertical'
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
  layoutStyle?: ComponentLayoutStyle
}> &
  (SingleSelection<Value> | MultipleSelection<Value>)
type LegacyToggleGroupProps<Value extends string, Msg> = SharedProps<Value> &
  Readonly<{
    onToggle: (value: Value) => Msg
  }>

const styles = stylex.create({
  group: {
    borderRadius: foundationTokens.radiusMd,
    gap: 0,
    alignItems: 'center',
    display: 'flex',
    width: 'fit-content',
  },
  groupWrapped: { gap: '0.25rem', flexWrap: 'wrap' },
  groupVertical: { alignItems: 'stretch', flexDirection: 'column' },
  outlineGroup: { boxShadow: foundationTokens.shadowXs },
  item: {
    borderColor: foundationTokens.transparent,
    borderRadius: '0px',
    borderStyle: 'solid',
    borderWidth: 0,
    gap: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: {
      default: foundationTokens.transparent,
      ':hover': foundationTokens.muted,
    },
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
    height: '2.25rem',
    minWidth: 0,
  },
  itemWrapped: { borderRadius: foundationTokens.radiusMd },
  outline: { borderColor: tokens.input, borderWidth: 1 },
  outlineVerticalRest: { borderTopWidth: 0 },
  itemVerticalFirst: {
    borderTopLeftRadius: foundationTokens.radiusMd,
    borderTopRightRadius: foundationTokens.radiusMd,
  },
  itemVerticalLast: {
    borderBottomLeftRadius: foundationTokens.radiusMd,
    borderBottomRightRadius: foundationTokens.radiusMd,
  },
  itemHorizontalFirst: {
    borderBottomLeftRadius: foundationTokens.radiusMd,
    borderTopLeftRadius: foundationTokens.radiusMd,
  },
  itemHorizontalLast: {
    borderBottomRightRadius: foundationTokens.radiusMd,
    borderTopRightRadius: foundationTokens.radiusMd,
  },
  outlineHorizontalRest: { borderLeftWidth: 0 },
  pressed: { backgroundColor: tokens.accent, color: tokens.accentForeground },
  disabled: { opacity: 0.5, pointerEvents: 'none' },
  sm: { height: '2rem' },
  lg: { height: '2.5rem' },
})

const selectedValues = <Value extends string>(
  props: SharedProps<Value>,
): ReadonlyArray<Value> =>
  props.values === undefined ? [props.value] : props.values

const itemAttributes = <Value extends string, Msg>(
  props: SharedProps<Value>,
  item: ToggleGroupItem<Value>,
  isPressed: boolean,
  position: { readonly index: number; readonly isLast: boolean },
  h: HtmlBuilder<Msg>,
) => {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'default'
  const wrapped = props.arrangement === 'wrapped'
  const vertical = props.orientation === 'vertical'
  return [
    h.DataAttribute('slot', 'toggle-group-item'),
    h.DataAttribute('variant', variant),
    h.DataAttribute('size', size),
    h.AriaPressed(isPressed ? 'true' : 'false'),
    ...(item.ariaLabel === undefined ? [] : [h.AriaLabel(item.ariaLabel)]),
    h.Class(
      className(
        reset.button,
        styles.item,
        wrapped && styles.itemWrapped,
        !wrapped &&
          vertical &&
          position.index === 0 &&
          styles.itemVerticalFirst,
        !wrapped && vertical && position.isLast && styles.itemVerticalLast,
        !wrapped &&
          !vertical &&
          position.index === 0 &&
          styles.itemHorizontalFirst,
        !wrapped && !vertical && position.isLast && styles.itemHorizontalLast,
        variant === 'outline' && styles.outline,
        variant === 'outline' &&
          !wrapped &&
          vertical &&
          position.index > 0 &&
          styles.outlineVerticalRest,
        variant === 'outline' &&
          !wrapped &&
          !vertical &&
          position.index > 0 &&
          styles.outlineHorizontalRest,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        isPressed && styles.pressed,
        item.isDisabled && styles.disabled,
        item.layoutStyle,
      ),
    ),
  ]
}

const groupAttributes = <Value extends string, Msg>(
  props: SharedProps<Value>,
  h: HtmlBuilder<Msg>,
) => {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'default'
  const wrapped = props.arrangement === 'wrapped'
  return [
    h.DataAttribute('slot', 'toggle-group'),
    h.DataAttribute('variant', variant),
    h.DataAttribute('size', size),
    h.DataAttribute('arrangement', wrapped ? 'wrapped' : 'joined'),
    h.DataAttribute(
      'orientation',
      props.orientation === 'vertical' ? 'vertical' : 'horizontal',
    ),
    h.Class(
      className(
        styles.group,
        wrapped && styles.groupWrapped,
        props.orientation === 'vertical' && styles.groupVertical,
        variant === 'outline' && styles.outlineGroup,
        props.layoutStyle,
      ),
    ),
  ]
}

const renderToggleGroup = <Value extends string, Msg>(
  behavior: BehaviorBundle<Value>,
  props: ToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  behavior.render(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      selectedValues: selectedValues(props),
      items: props.items,
      ariaLabel: props.ariaLabel,
      ...(props.direction === undefined ? {} : { direction: props.direction }),
      ...(props.orientation === 'vertical'
        ? { orientation: 'vertical' as const }
        : {}),
    },
    { group: groupAttributes(props, h), item: () => [] },
    (state, ht) => {
      const item = props.items.find(
        candidate => candidate.value === state.value,
      )
      return item === undefined
        ? ht.empty
        : ht.button(
            [
              ht.Class(className(reset.button)),
              ...state.attributes,
              ...(props.direction === undefined
                ? []
                : [ht.Dir(props.direction)]),
              ...itemAttributes(
                props,
                item,
                state.isPressed,
                {
                  index: state.index,
                  isLast: state.index === props.items.length - 1,
                },
                ht,
              ),
            ],
            [...item.children],
          )
    },
    h,
  )

const renderLegacy = <Value extends string, Msg>(
  props: LegacyToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const selected = selectedValues(props)
  return h.div(
    [
      h.Role('group'),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      ...groupAttributes(props, h),
    ],
    props.items.map((item, index) =>
      h.button(
        [
          h.Class(className(reset.button)),
          h.Type('button'),
          h.OnClick(props.onToggle(item.value)),
          h.Disabled(item.isDisabled ?? false),
          ...itemAttributes(
            props,
            item,
            selected.includes(item.value),
            { index, isLast: index === props.items.length - 1 },
            h,
          ),
        ],
        [...item.children],
      ),
    ),
  )
}

export type ToggleGroupBundle<Value extends string> = Readonly<{
  update: BehaviorBundle<Value>['update']
  toggleGroup: <Msg>(
    props: ToggleGroupProps<Value, Msg>,
    h: HtmlBuilder<Msg>,
  ) => Html
}>
export const create = <
  Value extends string = string,
>(): ToggleGroupBundle<Value> => {
  const behavior = createBehavior<Value>()
  return {
    update: behavior.update,
    toggleGroup: (props, h) => renderToggleGroup(behavior, props, h),
  }
}
const StringToggleGroup = create<string>()
export const update = StringToggleGroup.update
export function toggleGroup<Msg, Value extends string = string>(
  props: LegacyToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html
export function toggleGroup<Value extends string, Msg>(
  props: ToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html
export function toggleGroup<Msg>(
  props: ToggleGroupProps<string, Msg> | LegacyToggleGroupProps<string, Msg>,
  h: HtmlBuilder<Msg>,
): Html {
  return 'model' in props
    ? StringToggleGroup.toggleGroup(props, h)
    : renderLegacy(props, h)
}
