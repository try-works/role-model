import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../foundations-tokens.stylex'
import { interactionTokens } from '../interaction-tokens.stylex.const'
import { className } from '../style'
import { tokens } from '../tokens.stylex'

const styles = stylex.create({
  active: { backgroundColor: foundationTokens.muted, color: tokens.primary },
  base: {
    borderRadius: foundationTokens.radiusFull,
    paddingInline: '1rem',
    textDecoration: 'none',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    fontSize: '1rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.5rem',
    textAlign: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    whiteSpace: 'nowrap',
    height: '1.75rem',
  },
  inactive: {
    color: { default: tokens.mutedForeground, ':hover': tokens.primary },
  },
})

export type ChartTabProps = Readonly<{
  active: boolean
  children: ReadonlyArray<Html | string>
  href: string
}>

export const chartTab = <Message>(
  props: ChartTabProps,
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(props.href),
      h.Class(
        className(
          reset.link,
          styles.base,
          props.active ? styles.active : styles.inactive,
        ),
      ),
    ],
    props.children,
  )
