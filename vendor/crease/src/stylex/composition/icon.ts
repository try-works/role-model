import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { className } from '../style'

const styles = stylex.create({
  md: { flexShrink: 0, height: '1.25rem', width: '1.25rem' },
  sm: { flexShrink: 0, height: '1rem', width: '1rem' },
})

export type IconProps = Readonly<{
  ariaLabel?: string
  name: string
  size?: 'sm' | 'md'
}>

export const icon = <Message>(
  props: IconProps,
  h: HtmlBuilder<Message>,
): Html =>
  Icon.icon(
    props.name,
    {
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      class: className(styles[props.size ?? 'sm']),
    },
    h,
  )
