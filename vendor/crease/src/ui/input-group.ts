import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { type ButtonProps, button } from '@/ui/button'
import { cn } from '@/lib/utils'

type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
  /** Upstream demos restyle the group radius per example (`[--radius:...]`). */
  radius?: 'xl' | 'full'
}>

const GROUP_RADIUS_CLASS = {
  xl: 'rounded-2xl',
  full: 'rounded-full',
} as const

export const inputGroup = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'input-group'),
      h.Role('group'),
      h.Class(
        cn(
          'group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30',
          'h-8 min-w-0 has-[>textarea]:h-auto',
          'has-[>[data-align=inline-start]]:[&>input]:pl-2',
          'has-[>[data-align=inline-end]]:[&>input]:pr-2',
          'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
          'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',
          'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50',
          'has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
          props.radius === undefined
            ? undefined
            : GROUP_RADIUS_CLASS[props.radius],
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        'inline-start':
          'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
        'inline-end':
          'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
        'block-start':
          'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3',
        'block-end':
          'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
)

export type InputGroupAddonVariants = VariantProps<
  typeof inputGroupAddonVariants
>

export type InputGroupAddonProps<Msg = never> = SlotProps &
  Readonly<{
    align?: InputGroupAddonVariants['align']
    focusControlId?: string
    onFocus?: Msg
  }>

export const inputGroupAddon = <Msg>(
  props: InputGroupAddonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const align = props.align ?? 'inline-start'

  return h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'input-group-addon'),
      h.DataAttribute('align', align),
      ...(props.focusControlId === undefined || props.onFocus === undefined
        ? []
        : [
            h.OnClick(props.onFocus, {
              focusSelector: `#${props.focusControlId}`,
            }),
          ]),
      h.Class(cn(inputGroupAddonVariants({ align }), props.class)),
    ],
    [...props.children],
  )
}

export const inputGroupButtonVariants = cva(
  'flex items-center gap-2 text-sm shadow-none',
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
        sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
        'icon-xs':
          'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
        'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
      },
    },
    defaultVariants: {
      size: 'xs',
    },
  },
)

export type InputGroupButtonVariants = VariantProps<
  typeof inputGroupButtonVariants
>

export type InputGroupButtonProps<Msg> = Omit<
  ButtonProps<Msg>,
  'size' | 'class'
> &
  Readonly<{
    size?: InputGroupButtonVariants['size']
    class?: string
  }>

export const inputGroupButton = <Msg>(
  props: InputGroupButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return button<Msg>(
    {
      children: props.children,
      variant: props.variant ?? 'ghost',
      type: props.type ?? 'button',
      size: 'default',
      slot: 'input-group-button',
      dataSize: props.size ?? 'xs',
      ...(props.onClick === undefined ? {} : { onClick: props.onClick }),
      ...(props.isDisabled === undefined
        ? {}
        : { isDisabled: props.isDisabled }),
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      class: cn(
        inputGroupButtonVariants({ size: props.size ?? 'xs' }),
        props.class,
      ),
    },
    h,
  )
}

export const inputGroupText = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'input-group-text'),
      h.Class(
        cn(
          "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

const INPUT_CLASS =
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-8 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'

const INPUT_GROUP_CONTROL_CLASS =
  'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent'

export type InputGroupInputProps<Msg> = Readonly<{
  id: string
  value: string
  onInput: (value: string) => Msg
  onKeyDown?: (key: string) => Msg
  placeholder?: string
  type?: string
  name?: string
  isDisabled?: boolean
  isInvalid?: boolean
  ariaLabel?: string
  step?: string
  class?: string
}>

export const inputGroupInput = <Msg>(
  props: InputGroupInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  // PORT NOTE: src/ui/input.ts cannot accept the data-slot attribute required
  // by InputGroup's focus/error selectors, so this renders the same styled
  // native input directly.
  return h.input([
    h.Id(props.id),
    h.Value(props.value),
    h.OnInput(props.onInput),
    ...(props.onKeyDown === undefined
      ? []
      : [h.OnKeyDown(key => props.onKeyDown!(key))]),
    h.Type(props.type ?? 'text'),
    ...(props.step === undefined ? [] : [h.Step(props.step)]),
    ...(props.name === undefined ? [] : [h.Name(props.name)]),
    ...(props.placeholder === undefined
      ? []
      : [h.Placeholder(props.placeholder)]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    ...((props.isDisabled ?? false) ? [h.Disabled(true)] : []),
    ...((props.isInvalid ?? false) ? [h.AriaInvalid(true)] : []),
    h.DataAttribute('slot', 'input-group-control'),
    h.Class(cn(INPUT_CLASS, INPUT_GROUP_CONTROL_CLASS, props.class)),
  ])
}

export type InputGroupTextareaProps<Msg> = Readonly<{
  id: string
  value: string
  onInput: (value: string) => Msg
  placeholder?: string
  name?: string
  isDisabled?: boolean
  isInvalid?: boolean
  ariaLabel?: string
  class?: string
}>

export const inputGroupTextarea = <Msg>(
  props: InputGroupTextareaProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.textarea([
    h.Id(props.id),
    h.Value(props.value),
    h.OnInput(props.onInput),
    ...(props.name === undefined ? [] : [h.Name(props.name)]),
    ...(props.placeholder === undefined
      ? []
      : [h.Placeholder(props.placeholder)]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    ...((props.isDisabled ?? false) ? [h.Disabled(true)] : []),
    ...((props.isInvalid ?? false) ? [h.AriaInvalid(true)] : []),
    h.DataAttribute('slot', 'input-group-control'),
    h.Class(
      cn(
        'field-sizing-content min-h-16 w-full flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-transparent',
        props.class,
      ),
    ),
  ])
}
