import { Style, Global } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { card, cardContent, cardHeader } from '@/pleat/card'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'
import { interactionTokens } from '../../pleat/interaction-tokens'

const pulse = Global.keyframes('loading-card-pulse', {
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
})

const styles = {
  actions: Style.make({ gap: '0.5rem', display: 'flex' }),
  body: Style.make({ gap: '1rem', display: 'flex', flexDirection: 'column' }),
  button: Style.make({ flexGrow: 1, height: '2.25rem' }),
  copy: Style.make({ gap: '0.5rem', display: 'flex', flexDirection: 'column' }),
  description: Style.make({ height: '1rem', width: '12rem' }),
  half: Style.make({ width: '50%' }),
  hero: Style.make({
    borderRadius: tokens.radius,
    height: '8rem',
    width: '100%',
  }),
  placeholder: Style.make({
    borderRadius: tokens.controlRadius,
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: pulse,
    backgroundColor: tokens.secondary,
  }),
  threeQuarters: Style.make({ width: '75%' }),
  title: Style.make({ height: '1.25rem', width: '8rem' }),
  line: Style.make({ height: '1rem', width: '100%' }),
}

const placeholder = <Msg>(
  styleOrStyles: Style.Style | ReadonlyArray<Style.Style>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.AriaHidden(true),
      h.Class(
        className(
          styles.placeholder,
          ...(Array.isArray(styleOrStyles) ? styleOrStyles : [styleOrStyles]),
        ),
      ),
    ],
    [],
  )

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
