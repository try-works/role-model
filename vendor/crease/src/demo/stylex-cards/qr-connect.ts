import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import { button } from '@/stylex/button'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'
import { interactionCardTokens } from './interaction-card-tokens.stylex'

const styles = stylex.create({
  buttonRow: { paddingBlock: '0.625rem', display: 'grid', width: '100%' },
  cell: { backgroundColor: interactionCardTokens.qrMuted },
  cellFilled: { backgroundColor: interactionCardTokens.qrForeground },
  code: {
    padding: '0.5rem',
    gap: '0.25rem',
    backgroundColor: interactionCardTokens.qrBackground,
    display: 'grid',
    gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
    height: '10rem',
    width: '10rem',
  },
  content: { display: 'flex', justifyContent: 'center', paddingTop: '1.5rem' },
  frame: {
    padding: '1rem',
    borderColor: tokens.border,
    borderRadius: tokens.radius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: interactionCardTokens.qrBackground,
  },
  text: { textAlign: 'center' },
})

const qrCells = [
  0, 1, 2, 5, 6, 7, 8, 10, 13, 15, 16, 18, 19, 21, 23, 24, 29, 31, 32, 33, 34,
  37, 38, 39, 41, 43, 44, 46, 48, 50, 53, 55, 56, 58, 61, 62, 63,
]

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.content))],
                [
                  h.div(
                    [h.Class(className(styles.frame))],
                    [
                      // PORT NOTE: react-qr-code has no foldkit equivalent. This
                      // neutral grid preserves the source QR footprint.
                      h.div(
                        [
                          h.Role('img'),
                          h.AriaLabel('QR code placeholder'),
                          h.Class(className(styles.code)),
                        ],
                        Array.from({ length: 64 }, (_, index) =>
                          h.div(
                            [
                              h.Class(
                                className(
                                  styles.cell,
                                  qrCells.includes(index) && styles.cellFilled,
                                ),
                              ),
                            ],
                            [],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        cardHeader(
          {
            children: [
              h.div(
                [h.Class(className(styles.text))],
                [
                  cardTitle(
                    {
                      children: ['Scan to connect your mobile device'],
                    },
                    h,
                  ),
                  cardDescription(
                    {
                      children: [
                        'Open the Ledger mobile app and scan this code to link your device.',
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
        cardFooter(
          {
            children: [
              h.div(
                [h.Class(className(styles.buttonRow))],
                [
                  button(
                    {
                      variant: 'secondary',
                      children: ['Got it'],
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
}

// Stateful? no. Submodels wired: none. PORT NOTEs: QR library replaced by a neutral grid.
