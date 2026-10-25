import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Listbox as ListboxPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as Checkbox from '@/ui/checkbox'
import * as Drawer from '@/ui/drawer'
import * as Button from '@/ui/button'
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
import { cn } from '@/lib/utils'
import {
  drawerTrigger,
  filterOptions,
  optionContent,
  searchablePopover,
} from '@/lib/multi-selector-view'

/* Ported from Meta Astryx MultiSelector (packages/core/src/MultiSelector/)
   — examples and visual spec adapted to Crease UI tokens.

   foldkit's Multi Listbox supplies the trigger button + anchored checkbox
   option panel (incl. section headings via itemGroupKey). The selection
   lives in src/lib/multi-selector.ts; the select-all row is a
   SELECT_ALL_VALUE pseudo-option folded by the lib update.

   Searchable selectors compose a Popover with a search input and the
   listbox's navigation/selection model. */

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

const LABEL_CLASS = 'text-sm font-medium leading-none text-foreground'

const REQUIRED_CLASS = 'text-destructive'

const OPTIONAL_CLASS = 'text-sm text-muted-foreground'

/* astryx wrapper = bordered input shell; the trigger button inside is
   borderless and flexes to fill it. */
const TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_50%,transparent)] hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--input)_30%,transparent)] aria-disabled:cursor-default aria-disabled:opacity-50 data-[readonly]:cursor-default aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_20%,transparent)] dark:bg-input/30'

const TRIGGER_STATUS_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'border-destructive',
  warning: 'border-warning',
  success: 'border-success',
}

/* astryx triggerGhost: borderless, auto width, font-medium, hover wash +
   :active scale(0.98), disabled drops both. */
const TRIGGER_GHOST_CLASS =
  'flex w-auto items-center justify-between gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-sm font-medium text-foreground shadow-none outline-none transition-[background-color,color,opacity,transform] hover:bg-accent focus-visible:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_50%,transparent)] active:scale-[0.98] aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100 data-[readonly]:cursor-default data-[readonly]:hover:bg-transparent data-[readonly]:active:scale-100'

const TRIGGER_CONTENT_CLASS =
  'flex min-w-0 flex-1 items-center gap-1 overflow-hidden'

const TRIGGER_TEXT_CLASS = 'overflow-hidden text-ellipsis whitespace-nowrap'

const TRIGGER_PLACEHOLDER_CLASS = 'text-muted-foreground'

const TRIGGER_BADGES_CLASS = 'flex min-w-0 flex-wrap items-center gap-1'

/* astryx badge ~ Token look: neutral bg, radius-inner, supporting text. */
const TRIGGER_BADGE_CLASS =
  'inline-flex h-5 shrink-0 items-center rounded-[4px] bg-muted px-1.5 text-xs font-medium text-foreground'

const TRIGGER_OVERFLOW_CLASS =
  'shrink-0 text-sm font-medium text-muted-foreground'

const TRIGGER_ICON_CLASS =
  'inline-flex shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4'

const CHEVRON_CLASS =
  'inline-flex shrink-0 items-center justify-center text-muted-foreground transition-transform duration-150 ease-out data-[open=true]:rotate-180 [&>svg]:size-4'

const CLEAR_BUTTON_CLASS =
  'inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden transition-colors hover:bg-accent hover:text-foreground [&>svg]:size-3.5'

const CONTENT_CLASS =
  'relative z-50 w-(--button-width) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md transition duration-200 ease-out motion-reduce:transition-none data-[closed]:opacity-0 data-[closed]:scale-95'

const VIEWPORT_CLASS = 'w-full scroll-my-1 p-1'

/* astryx option row: checkbox box + label, gap spacing-2, radius-element. */
const ITEM_CLASS =
  "group relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[active]:bg-accent data-[active]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2"

const GROUP_HEADING_CLASS = 'px-2 py-1.5 text-xs text-muted-foreground'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

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
  /** Astryx shows it as a tooltip on the disabled trigger; accepted but not
   *  rendered. */
  disabledMessage?: string
  isReadOnly?: boolean
  status?: MultiSelectorStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  /** 'input' bordered shell (default) or borderless 'ghost'. */
  variant?: 'input' | 'ghost'
  /** astryx `startIcon`; always the search glyph here. */
  hasStartIcon?: boolean
  hasClear?: boolean
  hasSelectAll?: boolean
  selectAllLabel?: string
  /** Accepted for API parity — see PORT NOTE (no panel input). */
  hasSearch?: boolean
  searchPlaceholder?: string
  triggerDisplay?: 'count' | 'labels' | 'badges'
  /** astryx `badgeMaxCount` for triggerDisplay 'badges' (default 3). */
  badgeMaxCount?: number
  /** Accepted for API parity — see PORT NOTE. */
  presentation?: 'popover' | 'bottom-sheet'
  options: ReadonlyArray<MultiSelectorOption | MultiSelectorSection>
  placeholder?: string
  width?: number
  htmlName?: string
  class?: string
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
    [h.Class(STATUS_ICON_CLASS[type]), h.AriaHidden(true)],
    [
      type === 'error'
        ? Icon.octagonX({ class: 'size-4' }, h)
        : type === 'warning'
          ? Icon.triangleAlert({ class: 'size-4' }, h)
          : Icon.circleCheck({ class: 'size-4' }, h),
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

  // Flatten sections for option lookup; groups surface via itemGroupKey.
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
          h.Class(
            'pointer-events-none absolute m-[-1px] h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip-path:inset(50%)]',
          ),
        ],
        [props.label],
      )
    : h.label(
        [
          h.Id(labelId),
          h.For(ListboxPrimitive.Multi.buttonId(model.listbox.id)),
          h.Class(LABEL_CLASS),
        ],
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
    [h.Class(TRIGGER_CONTENT_CLASS), h.DataAttribute('slot', 'select-value')],
    [
      ...(props.hasStartIcon === true
        ? [
            h.span(
              [h.Class(TRIGGER_ICON_CLASS), h.AriaHidden(true)],
              [Icon.search({ class: 'size-4' }, h)],
            ),
          ]
        : []),
      ...(triggerDisplay === 'badges' && hasSelection
        ? [
            h.span(
              [h.Class(TRIGGER_BADGES_CLASS)],
              [
                ...labels
                  .slice(0, badgeMaxCount)
                  .map(label =>
                    h.span([h.Class(TRIGGER_BADGE_CLASS)], [label]),
                  ),
                ...(labels.length > badgeMaxCount
                  ? [
                      h.span(
                        [h.Class(TRIGGER_OVERFLOW_CLASS)],
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
                  cn(
                    TRIGGER_TEXT_CLASS,
                    !hasSelection && TRIGGER_PLACEHOLDER_CLASS,
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
            className: ITEM_CLASS,
            content: h.span(
              [h.DataAttribute('slot', 'select-item'), h.Class('contents')],
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
            className: ITEM_CLASS,
            content: h.span(
              [h.DataAttribute('slot', 'select-item'), h.Class('contents')],
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
            content: h.span([h.Class(GROUP_HEADING_CLASS)], [groupKey]),
            className: 'px-0 py-0',
          }),
        }
      : {}),
    buttonContent: h.span(
      [h.Class('contents')],
      [
        triggerContent,
        props.hasClear === true && hasSelection && !props.isDisabled
          ? h.span(
              [
                h.Class(CLEAR_BUTTON_CLASS),
                h.Role('button'),
                h.AriaLabel('Clear all'),
                h.DataAttribute('slot', 'multi-selector-clear'),
                h.OnClick(toParent(Message.ClickedClearAll()), {
                  propagation: 'Stop',
                }),
              ],
              [Icon.x({ class: 'size-3.5' }, h)],
            )
          : hasStatusIcon && statusType !== undefined
            ? statusIcon(statusType, h)
            : h.span(
                [
                  h.Class(CHEVRON_CLASS),
                  h.AriaHidden(true),
                  h.DataAttribute('open', String(model.listbox.isOpen)),
                ],
                [Icon.chevronDown({ class: 'size-4' }, h)],
              ),
      ],
    ),
    buttonClassName: cn(
      variant === 'ghost' ? TRIGGER_GHOST_CLASS : TRIGGER_CLASS,
      props.status !== undefined &&
        statusVariant !== 'detached' &&
        variant === 'input' &&
        TRIGGER_STATUS_CLASS[props.status.type],
      props.class,
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
    itemsClassName: CONTENT_CLASS,
    itemsAttributes: childAttributes([
      h.DataAttribute('slot', 'select-content'),
    ]),
    itemsScrollClassName: VIEWPORT_CLASS,
    backdropClassName: BACKDROP_CLASS,
    className: 'flex w-full flex-col',
    attributes: childAttributes([
      h.DataAttribute('slot', 'multi-selector'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ]),
    anchor: { placement: 'bottom-start', gap: 4 },
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
      search: [h.Class('sticky top-0 z-10 border-b bg-popover p-2')],
      input: [
        h.Class(
          'h-8 w-full min-w-0 rounded-sm border-0 bg-transparent px-2 text-sm text-foreground outline-ring placeholder:text-muted-foreground',
        ),
      ],
      empty: [h.Class('p-4 text-center text-sm text-muted-foreground')],
    },
  }
  const drawerView = (): Html =>
    h.div(
      [...(viewInputs.attributes ?? []), h.Class('flex w-full flex-col')],
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
                [
                  h.Class(
                    'max-h-[60dvh] overflow-y-auto overscroll-contain p-4',
                  ),
                ],
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
      h.Class(cn('flex w-full flex-col gap-1.5')),
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
