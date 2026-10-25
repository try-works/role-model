import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'

import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Listbox as ListboxPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import {
  drawerTrigger,
  filterOptions,
  optionContent,
  searchablePopover,
} from '@/lib/multi-selector-view'
import * as Checkbox from '@/stylex/checkbox'
import * as Drawer from '@/stylex/drawer'
import * as Button from '@/stylex/button'
import {
  Message,
  Model,
  OutMessage,
  SELECT_ALL_VALUE,
  init,
  reflect,
  reflectOptions,
  update,
} from '@/lib/multi-selector'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { themedAnchor } from './overlay-boundary'
import { overlayStyles } from './overlay-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx MultiSelector (packages/core/src/MultiSelector/)
   — examples and visual spec adapted to Crease UI tokens. StyleX mirror of
   src/ui/multi-selector.ts; see that file for the port notes. */

export {
  Message,
  Model,
  OutMessage,
  SELECT_ALL_VALUE,
  init,
  reflect,
  reflectOptions,
  update,
}

const listboxBundle = ListboxPrimitive.Multi.create<string>()

const styles = stylex.create({
  field: {
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  listboxFrame: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  label: {
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
  },
  labelHidden: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    pointerEvents: 'none',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
  requiredMark: { color: tokens.destructive },
  optional: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  trigger: {
    borderColor: {
      default: tokens.input,
      ':focus-visible': tokens.ring,
    },
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: tokens.inputSurface,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': `inset 0 0 0 2px ${foundationTokens.ringSoft}`,
      ':hover': `inset 0 0 0 2px ${foundationTokens.inputDark}`,
    },
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'space-between',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
    width: '100%',
  },
  triggerDisabled: { cursor: interactionTokens.cursorDefault, opacity: 0.5 },
  triggerReadOnly: { cursor: interactionTokens.cursorDefault },
  triggerError: {
    borderColor: {
      default: tokens.destructive,
      ':focus-visible': tokens.destructive,
    },
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': `inset 0 0 0 2px ${foundationTokens.destructiveRingSoft}`,
    },
  },
  triggerWarning: { borderColor: tokens.alertWarning },
  triggerSuccess: { borderColor: tokens.alertSuccess },
  /* astryx triggerGhost: borderless, font-medium, :active scale(0.98). */
  triggerGhost: {
    borderRadius: foundationTokens.radiusMd,
    borderWidth: 0,
    gap: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
    },
    boxShadow: 'none',
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'space-between',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    transform: {
      default: 'scale(1)',
      ':active': 'scale(0.98)',
    },
    transitionDuration: interactionTokens.motionFast,
    transitionProperty:
      'background-color, color, opacity, transform, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
    width: 'auto',
  },
  triggerGhostDisabled: {
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
    transform: 'none',
  },
  triggerGhostReadOnly: {
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    transform: 'none',
  },
  triggerContent: {
    gap: '0.25rem',
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  triggerText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  triggerPlaceholder: { color: tokens.mutedForeground },
  triggerBadges: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  triggerBadge: {
    borderRadius: foundationTokens.radiusSm,
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: tokens.muted,
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    height: '1.25rem',
  },
  triggerOverflow: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  triggerIcon: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
  },
  chevron: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    transform: {
      default: 'none',
      ':is([data-open="true"])': 'rotate(180deg)',
    },
    transformOrigin: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  iconSize: { height: '1rem', width: '1rem' },
  clearButton: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    height: '1.25rem',
    width: '1.25rem',
  },
  clearIconSize: { height: '0.875rem', width: '0.875rem' },
  content: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: foundationTokens.popover,
    boxShadow: tokens.shadowCard,
    color: foundationTokens.popoverForeground,
    position: 'relative',
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    zIndex: 50,
    maxHeight: '18.75rem',
    minWidth: '8rem',
    overflowX: 'hidden',
    overflowY: 'auto',
    width: 'var(--button-width)',
  },
  search: {
    padding: '0.5rem',
    borderColor: tokens.border,
    backgroundColor: foundationTokens.popover,
    position: 'sticky',
    zIndex: 1,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    top: 0,
  },
  searchInput: {
    borderRadius: foundationTokens.radiusSm,
    borderWidth: 0,
    paddingInline: '0.5rem',
    backgroundColor: tokens.transparent,
    color: tokens.foreground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineColor: tokens.ring,
    height: '2rem',
    minWidth: 0,
    width: '100%',
  },
  empty: {
    padding: '1rem',
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  drawerBody: {
    padding: '1rem',
    overscrollBehavior: 'contain',
    maxHeight: '60dvh',
    overflowY: 'auto',
  },
  viewport: { padding: '0.25rem', width: '100%' },
  item: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingInlineEnd: '2rem',
    paddingInlineStart: '0.5rem',
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  },
  itemActive: {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  itemDisabled: { opacity: 0.5, pointerEvents: 'none' },
  itemContent: { display: 'contents' },
  groupHeading: {
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  statusError: {
    color: tokens.destructive,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusWarning: {
    color: tokens.alertWarning,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusSuccess: {
    color: tokens.alertSuccess,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusMessageError: {
    color: tokens.destructive,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  statusMessageWarning: {
    color: tokens.alertWarning,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  statusMessageSuccess: {
    color: tokens.alertSuccess,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})

const STATUS_STYLE = {
  error: styles.statusError,
  warning: styles.statusWarning,
  success: styles.statusSuccess,
} as const

const STATUS_MESSAGE_STYLE = {
  error: styles.statusMessageError,
  warning: styles.statusMessageWarning,
  success: styles.statusMessageSuccess,
} as const

const TRIGGER_STATUS_STYLE = {
  error: styles.triggerError,
  warning: styles.triggerWarning,
  success: styles.triggerSuccess,
} as const

export type MultiSelectorOption = Readonly<{
  value: string
  label: string
}>

export type MultiSelectorSection = Readonly<{
  title: string
  options: ReadonlyArray<MultiSelectorOption>
}>

export type MultiSelectorStatus = Readonly<{
  type: 'error' | 'warning' | 'success'
  message?: string
}>

export type MultiSelectorProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  label: string
  isLabelHidden?: boolean
  description?: string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  disabledMessage?: string
  isReadOnly?: boolean
  status?: MultiSelectorStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  variant?: 'input' | 'ghost'
  hasStartIcon?: boolean
  hasClear?: boolean
  hasSelectAll?: boolean
  selectAllLabel?: string
  hasSearch?: boolean
  searchPlaceholder?: string
  triggerDisplay?: 'count' | 'labels' | 'badges'
  badgeMaxCount?: number
  presentation?: 'popover' | 'bottom-sheet'
  options: ReadonlyArray<MultiSelectorOption | MultiSelectorSection>
  placeholder?: string
  width?: number
  htmlName?: string
  layoutStyle?: ComponentLayoutStyle
  direction?: 'ltr' | 'rtl'
}>

const isSection = (
  option: MultiSelectorOption | MultiSelectorSection,
): option is MultiSelectorSection => 'options' in option

const statusIcon = <Msg>(
  type: 'error' | 'warning' | 'success',
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(className(STATUS_STYLE[type])), h.AriaHidden(true)],
    [
      Icon.icon(
        type === 'error'
          ? 'octagon-x'
          : type === 'warning'
            ? 'triangle-alert'
            : 'circle-check',
        { class: className(styles.iconSize) },
        h,
      ),
    ],
  )

export const multiSelector = <Msg>(
  props: MultiSelectorProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const toParent = props.toParentMessage
  const triggerDisplay = props.triggerDisplay ?? 'count'
  const statusVariant = props.statusVariant ?? 'attached'
  const variant = props.variant ?? 'input'
  const isInvalid =
    props.status?.type === 'error' && statusVariant !== 'detached'

  const flatOptions: ReadonlyArray<MultiSelectorOption> = props.options.flatMap(
    option => (isSection(option) ? [...option.options] : [option]),
  )
  const labelFor = (value: string): string =>
    flatOptions.find(option => option.value === value)?.label ?? value

  const labelId = `${model.id}-label`
  const descriptionId = `${model.id}-description`
  const statusMessageId = `${model.id}-status-message`
  const describedBy = [
    props.description === undefined ? undefined : descriptionId,
    props.status?.message === undefined || statusVariant === 'tooltip'
      ? undefined
      : statusMessageId,
  ].filter((id): id is string => id !== undefined)

  const visibleOptions =
    props.hasSearch === true
      ? filterOptions(flatOptions, model.query)
      : flatOptions
  const hasSelection = model.values.length > 0
  const allSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every(option => model.values.includes(option.value))
  const someSelected =
    !allSelected &&
    visibleOptions.some(option => model.values.includes(option.value))

  const labelView = props.isLabelHidden
    ? h.label(
        [
          h.Id(labelId),
          h.For(ListboxPrimitive.Multi.buttonId(model.listbox.id)),
          h.Class(className(styles.labelHidden)),
        ],
        [props.label],
      )
    : h.label(
        [
          h.Id(labelId),
          h.For(ListboxPrimitive.Multi.buttonId(model.listbox.id)),
          h.Class(className(styles.label)),
        ],
        [
          props.label,
          ...(props.isRequired === true
            ? [h.span([h.Class(className(styles.requiredMark))], [' *'])]
            : []),
          ...(props.isOptional === true
            ? [h.span([h.Class(className(styles.optional))], [' (optional)'])]
            : []),
        ],
      )

  const labels = model.values.map(labelFor)
  const triggerText =
    labels.length === 0
      ? (props.placeholder ?? '')
      : triggerDisplay === 'count'
        ? `${labels.length} selected`
        : triggerDisplay === 'labels'
          ? labels.length > 3
            ? `${labels.slice(0, 3).join(', ')}, +${labels.length - 3}`
            : labels.join(', ')
          : ''

  const badgeMaxCount = props.badgeMaxCount ?? 3
  const triggerContent = h.span(
    [
      h.Class(className(styles.triggerContent)),
      h.DataAttribute('slot', 'select-value'),
    ],
    [
      ...(props.hasStartIcon === true
        ? [
            h.span(
              [h.Class(className(styles.triggerIcon)), h.AriaHidden(true)],
              [Icon.icon('search', { class: className(styles.iconSize) }, h)],
            ),
          ]
        : []),
      ...(triggerDisplay === 'badges' && hasSelection
        ? [
            h.span(
              [h.Class(className(styles.triggerBadges))],
              [
                ...labels
                  .slice(0, badgeMaxCount)
                  .map(label =>
                    h.span([h.Class(className(styles.triggerBadge))], [label]),
                  ),
                ...(labels.length > badgeMaxCount
                  ? [
                      h.span(
                        [h.Class(className(styles.triggerOverflow))],
                        [`+${labels.length - badgeMaxCount}`],
                      ),
                    ]
                  : []),
              ],
            ),
          ]
        : [
            h.span(
              [
                h.Class(
                  className(
                    styles.triggerText,
                    !hasSelection && styles.triggerPlaceholder,
                  ),
                ),
              ],
              [triggerText],
            ),
          ]),
    ],
  )

  const hasStatusIcon =
    props.status !== undefined &&
    props.status.type !== 'error' &&
    statusVariant === 'attached'

  const statusType = props.status?.type

  const viewInputs: ListboxPrimitive.Multi.ViewInputs<string> = {
    items: [
      ...(props.hasSelectAll === true ? [SELECT_ALL_VALUE] : []),
      ...flatOptions.map(option => option.value),
    ],
    itemToConfig: (value, context) =>
      value === SELECT_ALL_VALUE
        ? {
            className: className(
              styles.item,
              context.isActive && styles.itemActive,
              context.isDisabled && styles.itemDisabled,
            ),
            content: h.span(
              [
                h.DataAttribute('slot', 'select-item'),
                h.Class(className(styles.itemContent)),
              ],
              [
                Checkbox.checkbox(
                  {
                    id: `${model.id}-opt-select-all`,
                    isChecked: allSelected,
                    isIndeterminate: someSelected,
                    isReadOnly: true,
                    label: props.selectAllLabel ?? 'Select all',
                    tabindex: -1,
                  },
                  h,
                ),
              ],
            ),
          }
        : {
            className: className(
              styles.item,
              context.isActive && styles.itemActive,
              context.isDisabled && styles.itemDisabled,
            ),
            content: h.span(
              [
                h.DataAttribute('slot', 'select-item'),
                h.Class(className(styles.itemContent)),
              ],
              [
                Checkbox.checkbox(
                  {
                    id: `${model.id}-opt-${value}`,
                    isChecked: context.isSelected,
                    isReadOnly: true,
                    label: labelFor(value),
                    tabindex: -1,
                  },
                  h,
                ),
              ],
            ),
          },
    selectedValues: model.values,
    itemToValue: value => value,
    ...(props.options.some(isSection)
      ? {
          itemGroupKey: value =>
            props.options
              .filter(isSection)
              .find(section =>
                section.options.some(entry => entry.value === value),
              )?.title ?? '',
          groupToHeading: groupKey => ({
            content: h.span(
              [h.Class(className(styles.groupHeading))],
              [groupKey],
            ),
          }),
        }
      : {}),
    buttonContent: h.span(
      [h.Class(className(styles.itemContent))],
      [
        triggerContent,
        props.hasClear === true && hasSelection && !props.isDisabled
          ? h.span(
              [
                h.Class(className(styles.clearButton)),
                h.Role('button'),
                h.AriaLabel('Clear all'),
                h.DataAttribute('slot', 'multi-selector-clear'),
                h.OnClick(toParent(Message.ClickedClearAll()), {
                  propagation: 'Stop',
                }),
              ],
              [Icon.icon('x', { class: className(styles.clearIconSize) }, h)],
            )
          : hasStatusIcon && statusType !== undefined
            ? statusIcon(statusType, h)
            : h.span(
                [
                  h.Class(className(styles.chevron)),
                  h.AriaHidden(true),
                  h.DataAttribute('open', String(model.listbox.isOpen)),
                ],
                [
                  Icon.icon(
                    'chevron-down',
                    {
                      class: className(styles.iconSize),
                    },
                    h,
                  ),
                ],
              ),
      ],
    ),
    buttonClassName: className(
      reset.button,
      variant === 'ghost' ? styles.triggerGhost : styles.trigger,
      props.isDisabled === true &&
        (variant === 'ghost'
          ? styles.triggerGhostDisabled
          : styles.triggerDisabled),
      props.isReadOnly === true &&
        (variant === 'ghost'
          ? styles.triggerGhostReadOnly
          : styles.triggerReadOnly),
      props.status !== undefined &&
        statusVariant !== 'detached' &&
        variant === 'input' &&
        TRIGGER_STATUS_STYLE[props.status.type],
      props.layoutStyle,
    ),
    buttonAttributes: childAttributes([
      h.DataAttribute('slot', 'multi-selector-trigger'),
      ...(props.isDisabled === true ? [h.AriaDisabled(true)] : []),
      ...(props.isReadOnly === true ? [h.DataAttribute('readonly', '')] : []),
      ...(isInvalid ? [h.AriaInvalid(true)] : []),
      ...(describedBy.length === 0
        ? []
        : [h.AriaDescribedBy(describedBy.join(' '))]),
    ]),
    itemsClassName: className(styles.content),
    itemsAttributes: childAttributes([
      h.DataAttribute('slot', 'select-content'),
    ]),
    itemsScrollClassName: className(styles.viewport),
    backdropClassName: className(overlayStyles.backdrop),
    className: className(styles.listboxFrame),
    attributes: childAttributes([
      h.DataAttribute('slot', 'multi-selector'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ]),
    anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
    isDisabled: props.isDisabled ?? false,
    isReadOnly: props.isReadOnly ?? false,
    isInvalid,
    ariaLabelledBy: labelId,
    ...(props.htmlName === undefined ? {} : { name: props.htmlName }),
  }

  const contentProps = {
    model,
    toParentMessage: toParent,
    inputs: viewInputs,
    options: flatOptions,
    label: props.label,
    hasSearch: props.hasSearch ?? false,
    ...(props.searchPlaceholder === undefined
      ? {}
      : { searchPlaceholder: props.searchPlaceholder }),
    visual: {
      search: [h.Class(className(styles.search))],
      input: [h.Class(className(styles.searchInput))],
      empty: [h.Class(className(styles.empty))],
    },
  }
  const drawerView = (): Html =>
    h.div(
      [
        ...(viewInputs.attributes ?? []),
        h.Class(className(styles.listboxFrame)),
      ],
      [
        drawerTrigger(
          { ...contentProps, labelId, isDisabled: props.isDisabled ?? false },
          h,
        ),
        ...(props.htmlName === undefined
          ? []
          : (model.values.length === 0 ? [''] : model.values).map(value =>
              h.input([
                h.Type('hidden'),
                h.Name(props.htmlName!),
                h.Value(value),
              ]),
            )),
        Drawer.drawer(
          {
            model: model.drawer,
            toParentMessage: message =>
              toParent(Message.GotDrawerMessage({ message })),
            title: props.label,
            ...(props.description === undefined
              ? {}
              : { description: props.description }),
            content: slots => [
              h.div(
                [h.Class(className(styles.drawerBody))],
                [
                  optionContent(
                    {
                      ...contentProps,
                      closeMessage: Message.RequestedCloseDrawer(),
                      initialFocusAttributes: slots.initialFocusAttributes(),
                    },
                    h,
                  ),
                ],
              ),
            ],
            footer: slots => [
              Button.button(
                { children: ['Done'], buttonAttributes: slots.closeButton },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    )

  const listboxView =
    props.presentation === 'bottom-sheet'
      ? drawerView()
      : props.hasSearch === true
        ? searchablePopover(contentProps, h)
        : h.submodel({
            slotId: model.listbox.id,
            model: model.listbox,
            view: listboxBundle.view,
            viewInputs,
            toParentMessage: message =>
              toParent(Message.GotListboxMessage({ message })),
          })

  return h.div(
    [
      h.Class(className(styles.field)),
      ...(props.width === undefined
        ? []
        : [h.Style({ width: `${props.width}px` })]),
    ],
    [
      labelView,
      listboxView,
      ...(props.description === undefined
        ? []
        : [
            h.p(
              [
                h.Id(descriptionId),
                h.Class(className(reset.text, styles.description)),
              ],
              [props.description],
            ),
          ]),
      ...(props.status?.message === undefined ||
      statusVariant === 'tooltip' ||
      statusVariant === 'detached'
        ? []
        : [
            h.div(
              [
                h.Id(statusMessageId),
                h.Class(className(STATUS_MESSAGE_STYLE[props.status.type])),
                h.Role('status'),
              ],
              [
                props.status.type === 'error'
                  ? statusIcon('error', h)
                  : h.span([], []),
                props.status.message,
              ],
            ),
          ]),
    ],
  )
}
