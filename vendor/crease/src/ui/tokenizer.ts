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
  panelMount,
  update,
} from '@/lib/tokenizer'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Tokenizer (packages/core/src/Tokenizer/)
   — examples and visual spec adapted to Crease UI tokens.

   The foldkit Multi combobox supplies the input + anchored listbox; the
   chips, wrapper chrome, clear-all, create row, and overflow collapse are
   rendered here (the primitive's own input wrapper is neutralized so chips
   and the input share one border box, like astryx's single field shell).

   PORT NOTE: astryx's `tokenOverflowBehavior` measures wrapper width and
   renders a "+N more" count; crease clips to the first row (`none`,
   `unfocusedInline`, `unfocusedLayer` collapse identically to an
   overflow-hidden single line when unfocused).
   PORT NOTE: `renderToken` custom token rendering isn't supported — tokens
   are always the neutral chip. */

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

const LABEL_CLASS = 'text-sm font-medium leading-none text-foreground'

const REQUIRED_CLASS = 'text-destructive'

const OPTIONAL_CLASS = 'text-sm text-muted-foreground'

/* astryx wrapper: relative, flexWrap wrap, gap spacing-1, cursor text,
   height auto; wrapperWithTokens drops padding to 3px for border
   concentricity (radius-1 tokens inside radius-2 wrapper). */
const WRAPPER_CLASS =
  'relative flex w-full cursor-text items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 shadow-xs transition-[color,box-shadow] outline-none hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--input)_30%,transparent)] focus-within:border-ring focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_50%,transparent)] aria-disabled:cursor-default aria-disabled:opacity-50 data-[invalid=true]:border-destructive dark:bg-input/30 dark:data-[invalid=true]:focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_40%,transparent)] data-[invalid=true]:focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_20%,transparent)]'

const WRAPPER_WITH_TOKENS_CLASS =
  'px-[calc(0.25rem-1px)] py-[calc(0.25rem-1px)]'

const WRAPPER_STATUS_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'border-destructive',
  warning: 'border-warning',
  success: 'border-success',
}

const WRAPPER_MIN_HEIGHT_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'min-h-7',
  md: 'min-h-8',
  lg: 'min-h-9',
}

/* astryx truncates unfocused overflow modes to a single clipped row. */
const TRUNCATED_CLASS = 'flex-nowrap overflow-hidden'

const TRUNCATED_SIZE_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9',
}

const START_ICON_CLASS =
  'inline-flex shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4'

/* astryx token: inline-flex, gap spacing-1, paddingBlock 0, radius-inner,
   supporting-size font-medium text, neutral bg; height = element - 8px. */
const TOKEN_CLASS =
  'inline-flex max-w-full shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-[4px] bg-muted font-medium text-foreground'

const TOKEN_SIZE_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'h-5 px-2 text-xs',
  md: 'h-6 px-2 text-xs',
  lg: 'h-7 px-2 text-xs',
}

const TOKEN_LABEL_CLASS =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'

const TOKEN_REMOVE_CLASS =
  'inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-inherit outline-hidden transition-colors hover:bg-accent-foreground/10 disabled:cursor-default [&>svg]:size-3'

const INPUT_WRAPPER_CLASS = 'flex min-w-0 flex-1 basis-10 items-center'

const INPUT_CLASS =
  'block min-w-0 flex-1 bg-transparent font-(inherit) text-sm text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-default data-[invalid=true]:text-muted-foreground'

/* astryx inputAtMax: zero-width invisible input once the cap is reached. */
const INPUT_AT_MAX_WRAPPER_CLASS =
  'invisible absolute w-0 min-w-0 flex-none p-0 opacity-0'

const ITEM_CLASS =
  "group relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[active]:bg-accent data-[active]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

const CREATE_ITEM_CLASS = `${ITEM_CLASS} text-muted-foreground`

const INDICATOR_CLASS = 'ml-auto opacity-0 group-data-[selected]:opacity-100'

const LIST_CLASS =
  'max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto p-1'

const CONTENT_CLASS =
  'z-50 w-(--button-width) min-w-[8rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md transition duration-200 ease-out motion-reduce:transition-none data-[closed]:opacity-0 data-[closed]:scale-95'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

const CLEAR_BUTTON_CLASS =
  'inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden transition-colors hover:bg-accent hover:text-foreground [&>svg]:size-3.5'

const END_SECTION_CLASS = 'flex shrink-0 items-center gap-2 self-start'

const STATUS_ICON_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'inline-flex shrink-0 items-center text-destructive [&>svg]:size-4',
  warning: 'inline-flex shrink-0 items-center text-warning [&>svg]:size-4',
  success: 'inline-flex shrink-0 items-center text-success [&>svg]:size-4',
}

const STATUS_MESSAGE_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'text-sm text-destructive',
  warning: 'text-sm text-warning',
  success: 'text-sm text-success',
}

const DESCRIPTION_CLASS = 'text-sm text-muted-foreground'

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
  /** Show the leading affordance icon (astryx `startIcon`; always a
   *  magnifying-glass search glyph here). */
  hasStartIcon?: boolean
  /** Astryx `hasClear` — clear-all button when tokens exist. */
  hasClear?: boolean
  /** Astryx `hasCreate` — free-text "Create" row from the typed query. */
  hasCreate?: boolean
  /** Astryx `hasEntriesOnFocus` — open the listbox when the input focuses. */
  hasEntriesOnFocus?: boolean
  maxEntries?: number
  /** 'none' | 'unfocusedInline' | 'unfocusedLayer' — collapses the token
   *  row while unfocused (see PORT NOTE on the header). */
  tokenOverflowBehavior?: 'none' | 'unfocusedInline' | 'unfocusedLayer'
  /** Rendered after the clear button on the field's end lane
   *  (astryx `endContent`). */
  endContent?: Html
  /** Astryx `resultCount` — trailing count text on the end lane. */
  resultCount?: string
  size?: 'sm' | 'md' | 'lg'
  width?: number
  htmlName?: string
  class?: string
  direction?: 'ltr' | 'rtl'
}>

const statusIcon = <Msg>(
  type: 'error' | 'warning' | 'success',
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(STATUS_ICON_CLASS[type]), h.AriaHidden(true)],
    [
      type === 'error'
        ? Icon.octagonX({ class: 'size-4' }, h)
        : type === 'warning'
          ? Icon.triangleAlert({ class: 'size-4' }, h)
          : Icon.circleCheck({ class: 'size-4' }, h),
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
    [h.Class(cn(TOKEN_CLASS, TOKEN_SIZE_CLASS[size]))],
    [
      h.span([h.Class(TOKEN_LABEL_CLASS)], [token.label]),
      h.button(
        [
          h.Type('button'),
          h.Tabindex(-1),
          h.Class(TOKEN_REMOVE_CLASS),
          h.AriaLabel(`Remove ${token.label}`),
          h.DataAttribute('slot', 'tokenizer-token-remove'),
          ...(isDisabled
            ? [h.Disabled(true)]
            : [h.OnClick(toParent(Message.RemovedToken({ index })))]),
        ],
        [Icon.x({ class: 'size-3' }, h)],
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
        [
          h.Id(labelId),
          h.Class(
            'pointer-events-none absolute m-[-1px] h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip-path:inset(50%)]',
          ),
        ],
        [props.label],
      )
    : h.label(
        [h.Id(labelId), h.Class(LABEL_CLASS)],
        [
          props.label,
          ...(props.isRequired === true
            ? [h.span([h.Class(REQUIRED_CLASS)], [' *'])]
            : []),
          ...(props.isOptional === true
            ? [h.span([h.Class(OPTIONAL_CLASS)], [' (optional)'])]
            : []),
        ],
      )

  // astryx `createEntries`: offered from the typed text, hidden once the
  // label already exists among results or tokens.
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
    itemToConfig: value => ({
      className: cn(
        value.startsWith(CREATE_ID_PREFIX) ? CREATE_ITEM_CLASS : ITEM_CLASS,
      ),
      content: h.span(
        [h.DataAttribute('slot', 'command-item'), h.Class('contents')],
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
            [h.Class(INDICATOR_CLASS)],
            [Icon.check({ class: 'size-4' }, h)],
          ),
        ],
      ),
    }),
    inputClassName: INPUT_CLASS,
    ...(props.placeholder === undefined
      ? {}
      : { inputPlaceholder: props.placeholder }),
    inputWrapperClassName: cn(
      INPUT_WRAPPER_CLASS,
      isAtMax && INPUT_AT_MAX_WRAPPER_CLASS,
    ),
    inputWrapperAttributes: childAttributes([
      h.DataAttribute('slot', 'command-input-wrapper'),
    ]),
    openOnFocus: props.hasEntriesOnFocus ?? true,
    itemsClassName: CONTENT_CLASS,
    itemsAttributes: childAttributes([
      h.DataAttribute('slot', 'command-list'),
      h.OnMount(
        panelMount(model.id, { placement: 'bottom-start', gap: 4 }, toParent),
      ),
    ]),
    itemsScrollClassName: LIST_CLASS,
    backdropClassName: BACKDROP_CLASS,
    backdropAttributes: childAttributes([
      h.DataAttribute('slot', 'combobox-backdrop'),
    ]),
    className: 'contents',
    attributes: childAttributes([
      h.DataAttribute('slot', 'command'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ]),
    anchor: { placement: 'bottom-start', gap: 4 },
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
        cn(
          WRAPPER_CLASS,
          WRAPPER_MIN_HEIGHT_CLASS[size],
          model.tokens.length > 0 && WRAPPER_WITH_TOKENS_CLASS,
          isTruncated && TRUNCATED_CLASS,
          isTruncated && TRUNCATED_SIZE_CLASS[size],
          isLayerExpanded &&
            'absolute inset-x-0 top-0 z-50 bg-popover shadow-md',
          props.status !== undefined &&
            statusVariant !== 'detached' &&
            WRAPPER_STATUS_CLASS[props.status.type],
          props.class,
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
            cn(
              'flex min-w-0 flex-1 flex-wrap items-center gap-1',
              isTruncated && TRUNCATED_CLASS,
            ),
          ),
        ],
        [
          ...(props.hasStartIcon === true
            ? [
                h.span(
                  [
                    h.Class(START_ICON_CLASS),
                    h.AriaHidden(true),
                    ...(model.tokens.length > 0
                      ? [h.Class('ml-[calc(0.5rem-0.25rem+1px)]')]
                      : []),
                  ],
                  [Icon.search({ class: 'size-4' }, h)],
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
                h.Class(END_SECTION_CLASS),
              ],
              [
                ...(props.hasClear === true &&
                model.tokens.length > 0 &&
                !isDisabled
                  ? [
                      h.button(
                        [
                          h.Type('button'),
                          h.Class(CLEAR_BUTTON_CLASS),
                          h.AriaLabel('Clear all'),
                          h.DataAttribute('slot', 'tokenizer-clear'),
                          h.OnClick(toParent(Message.ClickedClearAll())),
                        ],
                        [Icon.x({ class: 'size-3.5' }, h)],
                      ),
                    ]
                  : []),
                ...(props.resultCount === undefined
                  ? []
                  : [
                      h.span(
                        [
                          h.Class('shrink-0 text-sm text-muted-foreground'),
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
      h.Class(cn('flex max-w-full min-w-0 flex-col gap-1.5')),
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
            [h.Class('relative'), h.DataAttribute('slot', 'tokenizer-layer')],
            [
              // Height placeholder keeps the field's row height while the
              // expanded wrapper overlays it (astryx unfocusedLayer).
              h.div(
                [h.Class(TRUNCATED_SIZE_CLASS[size]), h.AriaHidden(true)],
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
              [h.Id(descriptionId), h.Class(DESCRIPTION_CLASS)],
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
                h.Class(STATUS_MESSAGE_CLASS[props.status.type]),
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
