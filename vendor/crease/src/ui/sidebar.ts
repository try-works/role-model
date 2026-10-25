import { type VariantProps, cva } from 'class-variance-authority'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/ui/button'

export * from '@/lib/sidebar-state'

/* Ported from shadcn/ui sidebar.tsx as a Foldkit view system.

   React context is unnecessary here: pages own the open boolean and pass its
   derived state to sidebarProvider/sidebar. Descendant styling flows through
   the same group and data selectors as shadcn.

   Pages may keep owning the boolean directly, or use the Model/update and
   subscriptions helpers below for persistence and cmd/ctrl+b behavior. */

const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'
export type SidebarState = 'expanded' | 'collapsed'
export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'

type Slot = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>

const slotDiv =
  (slot: string, sidebarPart: string, baseClass: string) =>
  <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
    return h.div(
      [
        h.DataAttribute('slot', slot),
        h.DataAttribute('sidebar', sidebarPart),
        h.Class(cn(baseClass, props.class)),
      ],
      [...props.children],
    )
  }

export type SidebarProviderProps = Slot &
  Readonly<{
    state?: SidebarState
    width?: string
    mobileWidth?: string
    iconWidth?: string
  }>

export const sidebarProvider = <Msg>(
  props: SidebarProviderProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'sidebar-wrapper'),
      h.DataAttribute('state', props.state ?? 'expanded'),
      h.Style({
        '--sidebar-width': props.width ?? SIDEBAR_WIDTH,
        '--sidebar-width-mobile': props.mobileWidth ?? SIDEBAR_WIDTH_MOBILE,
        '--sidebar-width-icon': props.iconWidth ?? SIDEBAR_WIDTH_ICON,
      }),
      h.Class(
        cn(
          'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export type SidebarProps<Msg> = Slot &
  Readonly<{
    state?: SidebarState
    side?: SidebarSide
    variant?: SidebarVariant
    collapsible?: SidebarCollapsible
    presentation?: 'application' | 'contained'
    isMobileOpen?: boolean
    onMobileDismiss?: Msg
  }>

export const sidebar = <Msg>(
  props: SidebarProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const state = props.state ?? 'expanded'
  const side = props.side ?? 'left'
  const variant = props.variant ?? 'sidebar'
  const collapsible = props.collapsible ?? 'offcanvas'
  const onMobileDismiss = props.onMobileDismiss

  if (collapsible === 'none') {
    return h.div(
      [
        h.DataAttribute('slot', 'sidebar'),
        h.Class(
          cn(
            'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
            props.class,
          ),
        ),
      ],
      [...props.children],
    )
  }

  return h.div(
    [
      h.DataAttribute('state', state),
      h.DataAttribute('collapsible', state === 'collapsed' ? collapsible : ''),
      h.DataAttribute('variant', variant),
      h.DataAttribute('side', side),
      h.DataAttribute('slot', 'sidebar'),
      h.Class('group peer text-sidebar-foreground'),
    ],
    [
      ...((props.isMobileOpen ?? false)
        ? [
            h.button(
              [
                h.Type('button'),
                h.AriaLabel('Close sidebar backdrop'),
                ...(onMobileDismiss === undefined
                  ? []
                  : [
                      h.OnClick(onMobileDismiss),
                      h.OnKeyDownPreventDefault(key =>
                        key === 'Escape'
                          ? Option.some(onMobileDismiss)
                          : Option.none(),
                      ),
                    ]),
                h.Class('fixed inset-0 z-40 bg-black/50 md:hidden'),
              ],
              [],
            ),
            h.aside(
              [
                h.DataAttribute('slot', 'sidebar-mobile'),
                h.Role('dialog'),
                h.AriaModal(true),
                h.AriaLabel('Sidebar'),
                ...(onMobileDismiss === undefined
                  ? []
                  : [
                      h.OnKeyDownPreventDefault(key =>
                        key === 'Escape'
                          ? Option.some(onMobileDismiss)
                          : Option.none(),
                      ),
                    ]),
                h.Class(
                  cn(
                    'fixed inset-y-0 z-50 flex w-(--sidebar-width-mobile) max-w-[calc(100vw-2rem)] flex-col bg-sidebar text-sidebar-foreground shadow-xl md:hidden',
                    side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
                    props.class,
                  ),
                ),
              ],
              [
                ...props.children,
                ...(onMobileDismiss === undefined
                  ? []
                  : [
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaLabel('Close sidebar'),
                          h.OnClick(onMobileDismiss),
                          h.Class(
                            'absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:hidden',
                          ),
                        ],
                        [Icon.x({}, h)],
                      ),
                    ]),
              ],
            ),
          ]
        : []),
      h.div(
        [
          h.DataAttribute('slot', 'sidebar-gap'),
          h.Class(
            cn(
              'relative hidden w-(--sidebar-width) bg-transparent transition-[width] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:block',
              'group-data-[collapsible=offcanvas]:w-0',
              'group-data-[side=right]:rotate-180',
              variant === 'floating' || variant === 'inset'
                ? 'md:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
                : 'md:group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
            ),
          ),
        ],
        [],
      ),
      h.div(
        [
          h.DataAttribute('slot', 'sidebar-container'),
          h.Class(
            cn(
              props.presentation === 'contained'
                ? 'absolute inset-y-0 z-10 hidden h-full w-(--sidebar-width) transition-[left,right,width] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:flex'
                : 'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:flex',
              side === 'left'
                ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
                : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
              variant === 'floating' || variant === 'inset'
                ? 'p-2 md:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
                : 'md:group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
              props.class,
            ),
          ),
        ],
        [
          h.div(
            [
              h.DataAttribute('sidebar', 'sidebar'),
              h.DataAttribute('slot', 'sidebar-inner'),
              h.Class(
                'flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm',
              ),
            ],
            [...props.children],
          ),
        ],
      ),
    ],
  )
}

export type SidebarTriggerProps<Msg> = Readonly<{
  onClick: Msg
  onMobileClick?: Msg
  class?: string
}>

export const sidebarTrigger = <Msg>(
  props: SidebarTriggerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const trigger = (onClick: Msg, visibilityClass?: string): Html =>
    h.button(
      [
        h.DataAttribute('sidebar', 'trigger'),
        h.DataAttribute('slot', 'sidebar-trigger'),
        h.OnClick(onClick),
        h.Type('button'),
        h.Class(
          cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'size-7',
            visibilityClass,
            props.class,
          ),
        ),
      ],
      [
        Icon.panelLeft<Msg>({}, h),
        h.span([h.Class('sr-only')], ['Toggle Sidebar']),
      ],
    )

  return props.onMobileClick === undefined
    ? trigger(props.onClick)
    : h.span(
        [h.DataAttribute('slot', 'sidebar-responsive-trigger')],
        [
          trigger(props.onMobileClick, 'md:hidden'),
          trigger(props.onClick, 'hidden md:inline-flex'),
        ],
      )
}

export type SidebarRailProps<Msg> = Readonly<{
  onClick: Msg
}>

export const sidebarRail = <Msg>(
  props: SidebarRailProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.button(
    [
      h.DataAttribute('sidebar', 'rail'),
      h.DataAttribute('slot', 'sidebar-rail'),
      h.AriaLabel('Toggle Sidebar'),
      h.Attribute('tabindex', '-1'),
      h.OnClick(props.onClick),
      h.Title('Toggle Sidebar'),
      h.Type('button'),
      h.Class(
        cn(
          'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-[transform,translate] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
          'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
          '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
          'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
          '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
          '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        ),
      ),
    ],
    [],
  )
}

export type SidebarInsetProps = Slot &
  Readonly<{
    variant?: SidebarVariant
    state?: SidebarState
  }>

export const sidebarInset = <Msg>(
  props: SidebarInsetProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.main(
    [
      h.DataAttribute('slot', 'sidebar-inset'),
      h.Class(
        cn(
          'relative flex w-full flex-1 flex-col bg-background',
          'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
          props.variant === 'inset' &&
            'md:m-2 md:ml-0 md:rounded-xl md:shadow-sm',
          props.variant === 'inset' && props.state === 'collapsed' && 'md:ml-2',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

const INPUT_CLASS =
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-8 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'

export type SidebarInputProps<Msg> = Readonly<{
  id?: string
  value?: string
  onInput?: (value: string) => Msg
  placeholder?: string
  ariaLabel?: string
  type?: string
  name?: string
  isDisabled?: boolean
  isInvalid?: boolean
  class?: string
}>

export const sidebarInput = <Msg>(
  props: SidebarInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.input([
    h.DataAttribute('slot', 'sidebar-input'),
    h.DataAttribute('sidebar', 'input'),
    ...(props.id === undefined ? [] : [h.Id(props.id)]),
    ...(props.value === undefined ? [] : [h.Value(props.value)]),
    ...(props.onInput === undefined ? [] : [h.OnInput(props.onInput)]),
    ...(props.placeholder === undefined
      ? []
      : [h.Placeholder(props.placeholder)]),
    ...(props.name === undefined ? [] : [h.Name(props.name)]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    h.Type(props.type ?? 'text'),
    h.Disabled(props.isDisabled ?? false),
    h.AriaInvalid(props.isInvalid ?? false),
    h.Class(
      cn(
        INPUT_CLASS,
        'h-8 w-full bg-background shadow-none md:group-data-[collapsible=icon]:hidden',
        props.class,
      ),
    ),
  ])
}

export const sidebarHeader = slotDiv(
  'sidebar-header',
  'header',
  'flex flex-col gap-2 p-2',
)

export const sidebarFooter = slotDiv(
  'sidebar-footer',
  'footer',
  'flex flex-col gap-2 p-2',
)

export const sidebarSeparator = <Msg>(
  props: Readonly<{ class?: string }> = {},
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'sidebar-separator'),
      h.DataAttribute('sidebar', 'separator'),
      h.DataAttribute('orientation', 'horizontal'),
      h.Role('none'),
      h.Class(
        cn(
          'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
          'mx-2 w-auto bg-sidebar-border',
          props.class,
        ),
      ),
    ],
    [],
  )
}

export const sidebarContent = slotDiv(
  'sidebar-content',
  'content',
  'flex min-h-0 flex-1 flex-col gap-2 overflow-auto md:group-data-[collapsible=icon]:overflow-hidden',
)

export const sidebarGroup = slotDiv(
  'sidebar-group',
  'group',
  'relative flex w-full min-w-0 flex-col p-2',
)

export const sidebarGroupLabel = slotDiv(
  'sidebar-group-label',
  'group-label',
  'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 md:group-data-[collapsible=icon]:-mt-8 md:group-data-[collapsible=icon]:opacity-0',
)

export type SidebarActionProps<Msg> = Slot &
  Readonly<{
    onClick?: Msg
  }>

export const sidebarGroupAction = <Msg>(
  props: SidebarActionProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.button(
    [
      h.DataAttribute('slot', 'sidebar-group-action'),
      h.DataAttribute('sidebar', 'group-action'),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
      h.Type('button'),
      h.Class(
        cn(
          'absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
          'after:absolute after:-inset-2 md:after:hidden',
          'md:group-data-[collapsible=icon]:hidden',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const sidebarGroupContent = slotDiv(
  'sidebar-group-content',
  'group-content',
  'w-full text-sm',
)

export const sidebarMenu = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.ul(
    [
      h.DataAttribute('slot', 'sidebar-menu'),
      h.DataAttribute('sidebar', 'menu'),
      h.Class(cn('flex w-full min-w-0 flex-col gap-1', props.class)),
    ],
    [...props.children],
  )
}

export const sidebarMenuItem = <Msg>(
  props: Slot,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.li(
    [
      h.DataAttribute('slot', 'sidebar-menu-item'),
      h.DataAttribute('sidebar', 'menu-item'),
      h.Class(cn('group/menu-item relative', props.class)),
    ],
    [...props.children],
  )
}

export const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none group-has-data-[sidebar=menu-action]/menu-item:pr-8 md:group-data-[collapsible=icon]:size-8! md:group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active]:bg-sidebar-accent data-[active]:font-medium data-[active]:text-sidebar-accent-foreground data-[open]:hover:bg-sidebar-accent data-[open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
        primary:
          'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm md:group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type SidebarMenuButtonVariants = VariantProps<
  typeof sidebarMenuButtonVariants
>

export type SidebarMenuButtonProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  onClick?: Msg
  ariaExpanded?: boolean
  href?: string
  isActive?: boolean
  variant?: SidebarMenuButtonVariants['variant']
  size?: SidebarMenuButtonVariants['size']
  tooltip?: string
  class?: string
}>

export const sidebarMenuButton = <Msg>(
  props: SidebarMenuButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'default'
  const attributes = [
    h.DataAttribute('slot', 'sidebar-menu-button'),
    h.DataAttribute('sidebar', 'menu-button'),
    h.DataAttribute('size', size),
    ...((props.isActive ?? false) ? [h.DataAttribute('active', '')] : []),
    ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
    ...(props.ariaExpanded === undefined
      ? []
      : [h.AriaExpanded(props.ariaExpanded)]),
    h.Class(
      cn(
        sidebarMenuButtonVariants({
          variant: props.variant ?? 'default',
          size,
        }),
        props.class,
      ),
    ),
  ]

  const children = [
    ...props.children,
    ...(props.tooltip === undefined
      ? []
      : [
          h.span(
            [
              h.Role('tooltip'),
              h.Class(
                'pointer-events-none fixed left-[calc(var(--sidebar-width-icon)+0.5rem)] z-50 hidden whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground opacity-0 shadow-md transition-opacity md:group-data-[collapsible=icon]:peer-hover/menu-button:block md:group-data-[collapsible=icon]:peer-hover/menu-button:opacity-100 md:group-data-[collapsible=icon]:peer-focus-visible/menu-button:block md:group-data-[collapsible=icon]:peer-focus-visible/menu-button:opacity-100',
              ),
            ],
            [props.tooltip],
          ),
        ]),
  ]

  return props.href === undefined
    ? h.button(
        [
          ...attributes,
          h.Type('button'),
          ...(props.tooltip === undefined
            ? []
            : [h.Title(props.tooltip), h.AriaLabel(props.tooltip)]),
        ],
        children,
      )
    : h.a(
        [
          h.Href(props.href),
          ...attributes,
          ...(props.tooltip === undefined
            ? []
            : [h.Title(props.tooltip), h.AriaLabel(props.tooltip)]),
        ],
        children,
      )
}

export type SidebarMenuActionProps<Msg> = SidebarActionProps<Msg> &
  Readonly<{
    showOnHover?: boolean
  }>

export const sidebarMenuAction = <Msg>(
  props: SidebarMenuActionProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.button(
    [
      h.DataAttribute('slot', 'sidebar-menu-action'),
      h.DataAttribute('sidebar', 'menu-action'),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
      h.Type('button'),
      h.Class(
        cn(
          'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
          'after:absolute after:-inset-2 md:after:hidden',
          'peer-data-[size=sm]/menu-button:top-1',
          'peer-data-[size=default]/menu-button:top-1.5',
          'peer-data-[size=lg]/menu-button:top-2.5',
          'md:group-data-[collapsible=icon]:hidden',
          (props.showOnHover ?? false) &&
            'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active]/menu-button:text-sidebar-accent-foreground data-[open]:opacity-100 md:opacity-0',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const sidebarMenuBadge = slotDiv(
  'sidebar-menu-badge',
  'menu-badge',
  'pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active]/menu-button:text-sidebar-accent-foreground peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 md:group-data-[collapsible=icon]:hidden',
)

export type SidebarMenuSkeletonProps = Readonly<{
  showIcon?: boolean
  widthPercent?: number
  class?: string
}>

export const sidebarMenuSkeleton = <Msg>(
  props: SidebarMenuSkeletonProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const widthPercent = Math.min(90, Math.max(50, props.widthPercent ?? 70))

  return h.div(
    [
      h.DataAttribute('slot', 'sidebar-menu-skeleton'),
      h.DataAttribute('sidebar', 'menu-skeleton'),
      h.Class(cn('flex h-8 items-center gap-2 rounded-md px-2', props.class)),
    ],
    [
      ...((props.showIcon ?? false)
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'skeleton'),
                h.DataAttribute('sidebar', 'menu-skeleton-icon'),
                h.Class('animate-pulse rounded-md bg-accent size-4'),
              ],
              [],
            ),
          ]
        : []),
      h.div(
        [
          h.DataAttribute('slot', 'skeleton'),
          h.DataAttribute('sidebar', 'menu-skeleton-text'),
          h.Style({ '--skeleton-width': `${widthPercent}%` }),
          h.Class(
            'animate-pulse rounded-md bg-accent h-4 max-w-(--skeleton-width) flex-1',
          ),
        ],
        [],
      ),
    ],
  )
}

export const sidebarMenuSub = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.ul(
    [
      h.DataAttribute('slot', 'sidebar-menu-sub'),
      h.DataAttribute('sidebar', 'menu-sub'),
      h.Class(
        cn(
          'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
          'md:group-data-[collapsible=icon]:hidden',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const sidebarMenuSubItem = <Msg>(
  props: Slot,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.li(
    [
      h.DataAttribute('slot', 'sidebar-menu-sub-item'),
      h.DataAttribute('sidebar', 'menu-sub-item'),
      h.Class(cn('group/menu-sub-item relative', props.class)),
    ],
    [...props.children],
  )
}

export type SidebarMenuSubButtonProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  href?: string
  onClick?: Msg
  size?: 'sm' | 'md'
  isActive?: boolean
  class?: string
}>

export const sidebarMenuSubButton = <Msg>(
  props: SidebarMenuSubButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'

  return h.a(
    [
      h.DataAttribute('slot', 'sidebar-menu-sub-button'),
      h.DataAttribute('sidebar', 'menu-sub-button'),
      h.DataAttribute('size', size),
      ...((props.isActive ?? false) ? [h.DataAttribute('active', '')] : []),
      ...(props.href === undefined ? [] : [h.Href(props.href)]),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
      h.Class(
        cn(
          'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
          'data-[active]:bg-sidebar-accent data-[active]:text-sidebar-accent-foreground',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          'md:group-data-[collapsible=icon]:hidden',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

/* Minimal page-owned state wiring:

   type Model = Readonly<{ isSidebarOpen: boolean }>
   type Message = { readonly _tag: 'ToggledSidebar' }

   // update:
   // { ...model, isSidebarOpen: !model.isSidebarOpen }

   // view:
   const state = model.isSidebarOpen ? 'expanded' : 'collapsed'
   sidebarProvider({
     state,
     children: [
       sidebar({ state, children: [sidebarRail({ onClick: toggled })] }),
       sidebarInset({
         children: [sidebarTrigger({ onClick: toggled })],
       }),
     ],
   })
*/
