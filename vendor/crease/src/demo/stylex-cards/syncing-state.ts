import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/stylex/button'
import { card, cardContent } from '@/stylex/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/stylex/empty'
import { spinner } from '@/stylex/spinner'
import { className } from '@/stylex/style'

const styles = stylex.create({
  content: { padding: 0 },
})

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  card(
    {
      children: [
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.content))],
                [
                  empty(
                    {
                      children: [
                        emptyHeader(
                          {
                            children: [
                              emptyMedia(
                                {
                                  variant: 'icon',
                                  children: [
                                    spinner({ isDecorative: true }, h),
                                  ],
                                },
                                h,
                              ),
                              emptyTitle(
                                { children: ['Syncing your accounts'] },
                                h,
                              ),
                              emptyDescription(
                                {
                                  children: [
                                    "We're pulling in your latest transactions. This usually takes a few seconds.",
                                  ],
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        emptyContent(
                          {
                            children: [
                              button(
                                { variant: 'outline', children: ['Cancel'] },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
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

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
