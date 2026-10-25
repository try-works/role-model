import type { HtmlBuilder } from 'foldkit/html'
import type { Html } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

type SpinnerAccessibility =
  | Readonly<{ isDecorative: true; label?: never }>
  | Readonly<{ isDecorative?: false; label: string }>
export type SpinnerProps = SpinnerAccessibility &
  Readonly<{
    size?: 'sm' | 'md' | 'lg' | 'xl'
    tone?: 'current' | 'muted' | 'primary'
    /** Emits data-icon="inline-start|inline-end" for parent icon positioning. */
    dataIcon?: 'inline-start' | 'inline-end'
    class?: string
  }>

const SIZE_CLASS = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-6',
  xl: 'size-8',
} as const
const TONE_CLASS = {
  current: 'text-current',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
} as const

export const spinner = <Msg>(props: SpinnerProps, h: HtmlBuilder<Msg>): Html =>
  Icon.loaderCircle<Msg>(
    {
      ...(props.isDecorative ? {} : { ariaLabel: props.label }),
      class: cn(
        'animate-spin motion-reduce:animate-none',
        SIZE_CLASS[props.size ?? 'md'],
        TONE_CLASS[props.tone ?? 'current'],
        props.class,
      ),
      ...(props.dataIcon === undefined ? {} : { dataIcon: props.dataIcon }),
    },
    h,
  )
