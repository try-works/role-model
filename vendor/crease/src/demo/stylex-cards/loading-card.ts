import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'

import { card, cardContent, cardHeader } from '@/stylex/card'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'
import { interactionTokens } from '../../stylex/interaction-tokens.stylex.const'

const pulse = stylex.keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
})

const styles = stylex.create({
  actions: { gap: '0.5rem', display: 'flex' },
  body: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  button: { flexGrow: 1, height: '2.25rem' },
  copy: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  description: { height: '1rem', width: '12rem' },
  half: { width: '50%' },
  hero: { borderRadius: tokens.radius, height: '8rem', width: '100%' },
  placeholder: {
    borderRadius: tokens.controlRadius,
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: pulse,
    backgroundColor: tokens.secondary,
  },
  threeQuarters: { width: '75%' },
  title: { height: '1.25rem', width: '8rem' },
  line: { height: '1rem', width: '100%' },
})

const placeholder = <Msg>(style: StaticStyles, h: HtmlBuilder<Msg>): Html =>
  h.div([h.AriaHidden(true), h.Class(className(styles.placeholder, style))], [])

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              placeholder(styles.title, h),
              placeholder(styles.description, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.body))],
                [
                  placeholder(styles.hero, h),
                  h.div(
                    [h.Class(className(styles.copy))],
                    [
                      placeholder(styles.line, h),
                      placeholder([styles.line, styles.threeQuarters], h),
                      placeholder([styles.line, styles.half], h),
                    ],
                  ),
                  h.div(
                    [h.Class(className(styles.actions))],
                    [
                      placeholder(styles.button, h),
                      placeholder(styles.button, h),
                    ],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
