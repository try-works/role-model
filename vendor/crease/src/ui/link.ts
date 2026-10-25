import { type VariantProps, cva } from 'class-variance-authority'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import * as Tooltip from './tooltip'
import { cn } from '@/lib/utils'
import type {
  TextColor,
  TextDisplay,
  TextSize,
  TextType,
  TextWeight,
} from '@/ui/text'
import { text } from '@/ui/text'

/* Ported from Meta Astryx Link (packages/core/src/Link/Link.tsx) — examples and
   visual spec adapted to Crease UI tokens. */

const BLANK_TARGET_REL_TOKENS = ['noopener', 'noreferrer'] as const

const computeTargetAndRel = (
  target: string | undefined,
  rel: string | undefined,
): { target?: string; rel?: string } => {
  if (target !== '_blank') {
    return {
      ...(target === undefined ? {} : { target }),
      ...(rel === undefined ? {} : { rel }),
    }
  }
  const tokens = rel?.split(/\s+/).filter(Boolean) ?? []
  for (const token of BLANK_TARGET_REL_TOKENS) {
    if (!tokens.includes(token)) {
      tokens.push(token)
    }
  }
  return { target, rel: tokens.join(' ') }
}

export const linkVariants = cva(
  'inline-flex items-center gap-0.5 [font:inherit] cursor-pointer transition-[color,text-decoration] duration-150 outline-none no-underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-[3px] aria-disabled:cursor-default',
  {
    variants: {
      variant: { default: '', underlined: 'underline' },
      color: {
        primary:
          'text-foreground [@media(hover:hover)]:hover:text-foreground/85',
        secondary:
          'text-muted-foreground [@media(hover:hover)]:hover:text-muted-foreground/85',
        disabled: 'text-muted-foreground opacity-50',
        placeholder: 'text-muted-foreground',
        accent: 'text-primary [@media(hover:hover)]:hover:text-primary/80',
        inherit: 'text-inherit',
      },
      hasUnderline: {
        true: 'underline',
      },
      isStandalone: {
        true: 'text-sm leading-5',
      },
      isDisabled: {
        true: 'pointer-events-none opacity-50',
      },
    },
  },
)

export type LinkVariants = VariantProps<typeof linkVariants>

/* where() would zero the selector's specificity and let the base
   no-underline win, so the compound stays real — same shape astryx emits:
   :hover:not(:disabled,[aria-disabled="true"]) inside @media (hover: hover). */
const hoverUnderline =
  '[@media(hover:hover)]:[&:hover:not(:disabled,[aria-disabled="true"])]:underline'

export type LinkVariant = 'default' | 'underlined'

export type LinkProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  href?: string
  label?: string
  variant?: LinkVariant
  hasUnderline?: boolean
  isDisabled?: boolean
  isExternalLink?: boolean
  newTabLabel?: string
  target?: string
  rel?: string
  download?: string
  onClick?: Msg
  /** The parent owns the Tooltip model and routes its messages through Tooltip.update. */
  tooltip?: Pick<
    Tooltip.TooltipProps<Msg>,
    | 'model'
    | 'toParentMessage'
    | 'content'
    | 'side'
    | 'align'
    | 'showArrow'
    | 'gap'
    | 'offset'
  >
  isStandalone?: boolean
  type?: TextType
  size?: TextSize
  weight?: TextWeight
  color?: TextColor
  display?: TextDisplay
  maxLines?: number
  class?: string
}>

export const link = <Msg>(props: LinkProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  const color = props.color ?? 'accent'
  const variant = props.variant ?? 'default'
  const hasUnderline = variant === 'underlined' || props.hasUnderline === true
  const isDisabled = props.isDisabled ?? false
  const isExternalLink = props.isExternalLink ?? false
  const newTabLabel = props.newTabLabel ?? '(opens in new tab)'
  const { target, rel } = computeTargetAndRel(
    isExternalLink ? '_blank' : props.target,
    props.rel,
  )
  const renderAsButton = props.href === undefined

  const sharedContent = [
    text(
      {
        type: props.type ?? 'body',
        ...(props.size === undefined ? {} : { size: props.size }),
        ...(props.weight === undefined ? {} : { weight: props.weight }),
        color,
        display: props.display ?? 'inline',
        ...(props.maxLines === undefined ? {} : { maxLines: props.maxLines }),
        children: props.children,
      },
      h,
    ),
    ...(isExternalLink && !renderAsButton
      ? [
          Icon.icon<Msg>('external-link', { class: 'size-2.5 shrink-0' }, h),
          h.span([h.Class('sr-only')], [newTabLabel]),
        ]
      : []),
  ]

  const linkClass = cn(
    linkVariants({
      variant,
      color,
      ...(hasUnderline ? { hasUnderline: true } : {}),
      ...(props.isStandalone === true ? { isStandalone: true } : {}),
      ...(isDisabled ? { isDisabled: true } : {}),
    }),
    hasUnderline ? undefined : hoverUnderline,
    props.class,
  )

  const renderLink = (
    attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  ): Html => {
    if (renderAsButton) {
      return h.button(
        [
          ...attributes,
          h.DataAttribute('slot', 'link'),
          h.DataAttribute('variant', variant),
          h.DataAttribute('color', color),
          h.Type('button'),
          h.Class(
            cn(
              linkClass,
              'bg-transparent border-none p-0',
              ...(isDisabled ? [] : ['active:bg-foreground/10']),
            ),
          ),
          ...(isDisabled
            ? [h.AriaDisabled(true), h.Tabindex(-1), h.Disabled(true)]
            : []),
          ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
          ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
        ],
        sharedContent,
      )
    }

    if (isDisabled) {
      return h.a(
        [
          ...attributes,
          h.DataAttribute('slot', 'link'),
          h.DataAttribute('variant', variant),
          h.DataAttribute('color', color),
          h.Class(linkClass),
          h.AriaDisabled(true),
          h.Tabindex(-1),
          ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
        ],
        sharedContent,
      )
    }

    return h.a(
      [
        ...attributes,
        h.DataAttribute('slot', 'link'),
        h.DataAttribute('variant', variant),
        h.DataAttribute('color', color),
        h.Class(cn(linkClass, 'active:bg-foreground/10')),
        h.Href(props.href ?? ''),
        ...(target === undefined ? [] : [h.Target(target)]),
        ...(rel === undefined ? [] : [h.Rel(rel)]),
        ...(props.download === undefined ? [] : [h.Download(props.download)]),
        ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
        ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ],
      sharedContent,
    )
  }
  return props.tooltip === undefined
    ? renderLink([])
    : Tooltip.tooltip(
        {
          ...props.tooltip,
          isDisabled,
          renderTrigger: renderLink,
        },
        h,
      )
}
