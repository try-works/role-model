import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'

import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Combobox as ComboboxPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import {
  CREATE_ID_PREFIX,
  Message,
  Model,
  OutMessage,
  type Token,
  init,
  reflect,
  reflectItems,
  update,
} from '@/lib/tokenizer'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { themedAnchor, themedComboboxPanel } from './overlay-boundary'
import { overlayStyles } from './overlay-tokens'
import { className } from './style'
import { tokens } from './tokens'

/* Ported from Meta Astryx Tokenizer (packages/core/src/Tokenizer/)
   — examples and visual spec adapted to Crease UI tokens. StyleX mirror of
   src/ui/tokenizer.ts; see that file for the port notes. */

export {
  CREATE_ID_PREFIX,
  Message,
  Model,
  OutMessage,
  type Token,
  init,
  reflect,
  reflectItems,
  update,
}

const comboboxPrimitive = ComboboxPrimitive.Multi.create<string>()

const styles = {
  field: Style.make({
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    minWidth: 0,
  }),
  label: Style.make({
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
  }),
  labelHidden: Style.make({
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
  }),
  requiredMark: Style.make({ color: tokens.destructive }),
  optional: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  wrapper: Style.make({
    borderColor: tokens.input,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.inputSurface,
    boxShadow: foundationTokens.shadowXs,
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
    width: '100%',
  }).pipe(
    Style.when(When.focusWithin, {
      borderColor: tokens.ring,
      boxShadow: `inset 0 0 0 2px ${foundationTokens.ringSoft}`,
    }),
    Style.when(When.hover, {
      boxShadow: `inset 0 0 0 2px ${foundationTokens.inputDark}`,
    }),
    Style.when(When.aria('disabled', 'true'), { opacity: 0.5 }),
  ),
  wrapperWithTokens: Style.make({
    paddingBlock: 'calc(0.25rem - 1px)',
    paddingInline: 'calc(0.25rem - 1px)',
  }),
  wrapperError: Style.make({
    borderColor: tokens.destructive,
    boxShadow: foundationTokens.shadowXs,
  }).pipe(
    Style.when(When.focusWithin, {
      borderColor: tokens.destructive,
      boxShadow: `inset 0 0 0 2px ${foundationTokens.destructiveRingSoft}`,
    }),
  ),
  wrapperWarning: Style.make({ borderColor: tokens.alertWarning }),
  wrapperSuccess: Style.make({ borderColor: tokens.alertSuccess }),
  sizeSm: Style.make({ minHeight: '1.75rem' }),
  sizeMd: Style.make({ minHeight: '2rem' }),
  sizeLg: Style.make({ minHeight: '2.25rem' }),
  truncated: Style.make({ overflow: 'hidden', flexWrap: 'nowrap' }),
  contentRow: Style.make({
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexWrap: 'wrap',
    minWidth: 0,
  }),
  endSection: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    alignSelf: 'flex-start',
    display: 'flex',
    flexShrink: 0,
  }),
  truncatedSm: Style.make({ height: '1.75rem' }),
  truncatedMd: Style.make({ height: '2rem' }),
  truncatedLg: Style.make({ height: '2.25rem' }),
  layerExpanded: Style.make({
    backgroundColor: foundationTokens.popover,
    boxShadow: tokens.shadowCard,
    position: 'absolute',
    zIndex: 50,
    left: 0,
    right: 0,
    top: 0,
  }),
  layerPlaceholder: Style.make({ display: 'block' }),
  layerRoot: Style.make({ position: 'relative' }),
  startIcon: Style.make({
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
  }),
  startIconWithTokens: Style.make({
    marginInlineStart: 'calc(0.5rem - 0.25rem + 1px)',
  }),
  iconSize: Style.make({ height: '1rem', width: '1rem' }),
  token: Style.make({
    borderRadius: foundationTokens.radiusBase,
    gap: '0.25rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: tokens.muted,
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  }),
  tokenSm: Style.make({ paddingInline: '0.5rem', height: '1.25rem' }),
  tokenMd: Style.make({ paddingInline: '0.5rem', height: '1.5rem' }),
  tokenLg: Style.make({ paddingInline: '0.5rem', height: '1.75rem' }),
  tokenLabel: Style.make({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  }),
  tokenRemove: Style.make({
    padding: 0,
    borderRadius: '50%',
    borderWidth: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    height: '1rem',
    width: '1rem',
  }),
  tokenRemoveDisabled: Style.make({ cursor: interactionTokens.cursorDefault }),
  tokenRemoveIcon: Style.make({ height: '0.75rem', width: '0.75rem' }),
  inputWrapper: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexBasis: '2.5rem',
    flexGrow: 1,
    minWidth: 0,
  }),
  inputWrapperAtMax: Style.make({
    padding: 0,
    flexGrow: 0,
    flexShrink: 0,
    opacity: 0,
    position: 'absolute',
    visibility: 'hidden',
    width: 0,
  }),
  comboboxContents: Style.make({ display: 'contents' }),
  input: Style.make({
    backgroundColor: 'transparent',
    color: tokens.foreground,
    display: 'block',
    flexBasis: '0%',
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    minWidth: 0,
  }).pipe(Style.when(When.placeholder, { color: tokens.mutedForeground })),
  item: Style.make({
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    position: 'relative',
    userSelect: 'none',
  }),
  itemActive: Style.make({
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  }),
  itemDisabled: Style.make({ opacity: 0.5, pointerEvents: 'none' }),
  itemCreate: Style.make({ color: tokens.mutedForeground }),
  itemContent: Style.make({ display: 'contents' }),
  itemIndicator: Style.make({ marginInlineStart: 'auto', opacity: 0 }),
  itemIndicatorSelected: Style.make({ opacity: 1 }),
  itemIconSize: Style.make({ height: '1rem', width: '1rem' }),
  list: Style.make({
    padding: '0.25rem',
    maxHeight: '18.75rem',
    overflowX: 'hidden',
    overflowY: 'auto',
  }),
  content: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: foundationTokens.popover,
    boxShadow: tokens.shadowCard,
    color: tokens.foreground,
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    zIndex: 50,
    maxWidth: 'calc(100vw - 2rem)',
    minWidth: '8rem',
    width: 'var(--button-width)',
  }),
  clearButton: Style.make({
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    height: '1.25rem',
    width: '1.25rem',
  }).pipe(Style.when(When.hover, { color: tokens.foreground })),
  clearIconSize: Style.make({ height: '0.875rem', width: '0.875rem' }),
  resultCount: Style.make({
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  statusError: Style.make({
    alignItems: 'center',
    color: tokens.destructive,
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusWarning: Style.make({
    alignItems: 'center',
    color: tokens.alertWarning,
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusSuccess: Style.make({
    alignItems: 'center',
    color: tokens.alertSuccess,
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusMessageError: Style.make({
    color: tokens.destructive,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  statusMessageWarning: Style.make({
    color: tokens.alertWarning,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  statusMessageSuccess: Style.make({
    color: tokens.alertSuccess,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

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

const WRAPPER_STATUS_STYLE = {
  error: styles.wrapperError,
  warning: styles.wrapperWarning,
  success: styles.wrapperSuccess,
} as const

const SIZE_STYLE = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
} as const

const TRUNCATED_SIZE_STYLE = {
  sm: styles.truncatedSm,
  md: styles.truncatedMd,
  lg: styles.truncatedLg,
} as const

const TOKEN_SIZE_STYLE = {
  sm: styles.tokenSm,
  md: styles.tokenMd,
  lg: styles.tokenLg,
} as const

export type TokenizerStatus = Readonly<{
  type: 'error' | 'warning' | 'success'
  message?: string
}>

export type TokenizerProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  label: string
  isLabelHidden?: boolean
  description?: string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  status?: TokenizerStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  placeholder?: string
  items?: ReadonlyArray<Token>
  hasStartIcon?: boolean
  hasClear?: boolean
  hasCreate?: boolean
  hasEntriesOnFocus?: boolean
  maxEntries?: number
  tokenOverflowBehavior?: 'none' | 'unfocusedInline' | 'unfocusedLayer'
  endContent?: Html
  resultCount?: string
  size?: 'sm' | 'md' | 'lg'
  width?: number
  htmlName?: string
  layoutStyle?: ComponentLayoutStyle | undefined
  direction?: 'ltr' | 'rtl'
}>

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

const tokenChip = <Msg>(
  token: Token,
  index: number,
  size: 'sm' | 'md' | 'lg',
  isDisabled: boolean,
  toParent: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(className(styles.token, TOKEN_SIZE_STYLE[size]))],
    [
      h.span([h.Class(className(styles.tokenLabel))], [token.label]),
      h.button(
        [
          h.Type('button'),
          h.Tabindex(-1),
          h.Class(
            className(
              reset.button,
              styles.tokenRemove,
              isDisabled && styles.tokenRemoveDisabled,
            ),
          ),
          h.AriaLabel(`Remove ${token.label}`),
          h.DataAttribute('slot', 'tokenizer-token-remove'),
          ...(isDisabled
            ? [h.Disabled(true)]
            : [h.OnClick(toParent(Message.RemovedToken({ index })))]),
        ],
        [Icon.icon('x', { class: className(styles.tokenRemoveIcon) }, h)],
      ),
    ],
  )

export const tokenizer = <Msg>(
  props: TokenizerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const toParent = props.toParentMessage
  const size = props.size ?? 'md'
  const isDisabled = props.isDisabled === true
  const items = props.items ?? []
  const maxEntries = props.maxEntries ?? Option.getOrUndefined(model.maxEntries)
  const isAtMax = maxEntries !== undefined && model.tokens.length >= maxEntries

  const statusVariant = props.statusVariant ?? 'attached'
  const isInvalid =
    props.status?.type === 'error' && statusVariant !== 'detached'
  const isTruncated =
    (props.tokenOverflowBehavior ?? 'none') !== 'none' &&
    !model.combobox.isOpen &&
    model.tokens.length > 0
  const isLayerExpanded =
    props.tokenOverflowBehavior === 'unfocusedLayer' && model.combobox.isOpen

  const labelId = `${model.id}-label`
  const descriptionId = `${model.id}-description`
  const statusMessageId = `${model.id}-status-message`
  const describedBy = [
    props.description === undefined ? undefined : descriptionId,
    props.status?.message === undefined || statusVariant === 'tooltip'
      ? undefined
      : statusMessageId,
  ].filter((id): id is string => id !== undefined)

  const labelView = props.isLabelHidden
    ? h.label(
        [h.Id(labelId), h.Class(className(styles.labelHidden))],
        [props.label],
      )
    : h.label(
        [h.Id(labelId), h.Class(className(styles.label))],
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

  const trimmedQuery = model.combobox.inputValue.trim()
  const query = trimmedQuery.toLocaleLowerCase()
  const matchedItems = items.filter(
    item => query === '' || item.label.toLocaleLowerCase().includes(query),
  )
  const createId =
    props.hasCreate === true &&
    trimmedQuery !== '' &&
    !isAtMax &&
    !model.tokens.some(t => t.id === trimmedQuery) &&
    !matchedItems.some(
      item =>
        item.label.toLocaleLowerCase() === trimmedQuery.toLocaleLowerCase(),
    )
      ? `${CREATE_ID_PREFIX}${trimmedQuery}`
      : undefined
  const values = [
    ...matchedItems.map(item => item.id),
    ...(createId === undefined ? [] : [createId]),
  ]

  const viewInputs: ComboboxPrimitive.Multi.ViewInputs<string> = {
    items: values,
    restingInputValue: '',
    selectedValues: model.tokens.map(t => t.id),
    itemToValue: value => value,
    itemToDisplayText: value => {
      if (value.startsWith(CREATE_ID_PREFIX)) {
        return `Create "${value.slice(CREATE_ID_PREFIX.length)}"`
      }
      const found = items.find(item => item.id === value)
      return found?.label ?? model.itemLabels[value] ?? value
    },
    itemToConfig: (value, context) => ({
      className: className(
        styles.item,
        context.isActive && styles.itemActive,
        context.isDisabled && styles.itemDisabled,
        value.startsWith(CREATE_ID_PREFIX) && styles.itemCreate,
      ),
      content: h.span(
        [
          h.DataAttribute('slot', 'command-item'),
          h.Class(className(styles.itemContent)),
        ],
        [
          h.span(
            [],
            [
              value.startsWith(CREATE_ID_PREFIX)
                ? `Create "${value.slice(CREATE_ID_PREFIX.length)}"`
                : (items.find(item => item.id === value)?.label ?? value),
            ],
          ),
          h.span(
            [
              h.Class(
                className(
                  styles.itemIndicator,
                  context.isSelected && styles.itemIndicatorSelected,
                ),
              ),
            ],
            [Icon.icon('check', { class: className(styles.itemIconSize) }, h)],
          ),
        ],
      ),
    }),
    inputClassName: className(reset.input, styles.input),
    ...(props.placeholder === undefined
      ? {}
      : { inputPlaceholder: props.placeholder }),
    inputWrapperClassName: className(
      styles.inputWrapper,
      isAtMax && styles.inputWrapperAtMax,
    ),
    inputWrapperAttributes: childAttributes([
      h.DataAttribute('slot', 'command-input-wrapper'),
    ]),
    openOnFocus: props.hasEntriesOnFocus ?? true,
    itemsClassName: className(styles.content),
    itemsAttributes: childAttributes([
      h.DataAttribute('slot', 'command-list'),
      h.OnMount(
        themedComboboxPanel(
          `${model.id}-wrapper`,
          { placement: 'bottom-start', gap: 4 },
          message => toParent(Message.GotComboboxMessage({ message })),
        ),
      ),
    ]),
    itemsScrollClassName: className(reset.list, styles.list),
    backdropAttributes: childAttributes([
      h.DataAttribute('slot', 'combobox-backdrop'),
    ]),
    className: className(styles.comboboxContents),
    attributes: childAttributes([
      h.DataAttribute('slot', 'command'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ]),
    anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
    isDisabled,
    isReadOnly: props.isReadOnly ?? false,
    isInvalid,
    ariaLabelledBy: labelId,
    ...(props.htmlName === undefined ? {} : { formName: props.htmlName }),
  }

  const comboboxView = h.submodel({
    slotId: model.combobox.id,
    model: model.combobox,
    view: comboboxPrimitive.view,
    viewInputs,
    toParentMessage: message =>
      toParent(Message.GotComboboxMessage({ message })),
  })

  const wrapper = h.div(
    [
      h.Class(
        className(
          styles.wrapper,
          SIZE_STYLE[size],
          model.tokens.length > 0 && styles.wrapperWithTokens,
          isTruncated && styles.truncated,
          isTruncated && TRUNCATED_SIZE_STYLE[size],
          isLayerExpanded && styles.layerExpanded,
          props.status !== undefined &&
            statusVariant !== 'detached' &&
            WRAPPER_STATUS_STYLE[props.status.type],
          props.layoutStyle,
        ),
      ),
      h.DataAttribute('slot', 'tokenizer-wrapper'),
      h.Id(`${model.id}-wrapper`),
      ...(isDisabled ? [h.AriaDisabled(true)] : []),
      ...(isInvalid ? [h.DataAttribute('invalid', 'true')] : []),
      ...(describedBy.length === 0
        ? []
        : [h.AriaDescribedBy(describedBy.join(' '))]),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'tokenizer-content'),
          h.Class(
            className(styles.contentRow, isTruncated && styles.truncated),
          ),
        ],
        [
          ...(props.hasStartIcon === true
            ? [
                h.span(
                  [
                    h.Class(
                      className(
                        model.tokens.length > 0
                          ? styles.startIconWithTokens
                          : styles.startIcon,
                      ),
                    ),
                    h.AriaHidden(true),
                  ],
                  [
                    Icon.icon(
                      'search',
                      { class: className(styles.iconSize) },
                      h,
                    ),
                  ],
                ),
              ]
            : []),
          ...model.tokens.map((token, index) =>
            tokenChip(token, index, size, isDisabled, toParent, h),
          ),
          comboboxView,
        ],
      ),
      ...((props.hasClear === true && model.tokens.length > 0 && !isDisabled) ||
      props.resultCount !== undefined ||
      props.endContent !== undefined ||
      (props.status !== undefined &&
        props.status.type !== 'error' &&
        statusVariant === 'attached')
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'tokenizer-end'),
                h.Class(className(styles.endSection)),
              ],
              [
                ...(props.hasClear === true &&
                model.tokens.length > 0 &&
                !isDisabled
                  ? [
                      h.button(
                        [
                          h.Type('button'),
                          h.Class(className(reset.button, styles.clearButton)),
                          h.AriaLabel('Clear all'),
                          h.DataAttribute('slot', 'tokenizer-clear'),
                          h.OnClick(toParent(Message.ClickedClearAll())),
                        ],
                        [
                          Icon.icon(
                            'x',
                            { class: className(styles.clearIconSize) },
                            h,
                          ),
                        ],
                      ),
                    ]
                  : []),
                ...(props.resultCount === undefined
                  ? []
                  : [
                      h.span(
                        [
                          h.Class(className(styles.resultCount)),
                          h.DataAttribute('slot', 'tokenizer-result-count'),
                        ],
                        [props.resultCount],
                      ),
                    ]),
                ...(props.endContent === undefined ? [] : [props.endContent]),
                ...(props.status !== undefined &&
                props.status.type !== 'error' &&
                statusVariant === 'attached'
                  ? [statusIcon(props.status.type, h)]
                  : []),
              ],
            ),
          ]
        : []),
    ],
  )

  return h.div(
    [
      h.Class(className(styles.field)),
      h.DataAttribute('slot', 'tokenizer'),
      h.Id(model.id),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      ...(props.width === undefined
        ? []
        : [h.Style({ width: `${props.width}px` })]),
    ],
    [
      labelView,
      isLayerExpanded
        ? h.div(
            [
              h.Class(className(styles.layerRoot)),
              h.DataAttribute('slot', 'tokenizer-layer'),
            ],
            [
              h.div(
                [
                  h.Class(
                    className(
                      styles.layerPlaceholder,
                      TRUNCATED_SIZE_STYLE[size],
                    ),
                  ),
                  h.AriaHidden(true),
                ],
                [],
              ),
              wrapper,
            ],
          )
        : wrapper,
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
