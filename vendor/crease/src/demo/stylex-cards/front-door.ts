import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import * as Icon from '@/demo/icon-preview'
import { badge } from '@/stylex/badge'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { className } from '@/stylex/style'
import { foundationTokens } from '../../stylex/foundations-tokens.stylex'
import { tokens } from '../../stylex/tokens.stylex'
import { cardDemoTokens } from './foundations-card-tokens.stylex'

const styles = stylex.create({
  status: {
    gap: '0.375rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  lockIcon: { height: '1rem', width: '1rem' },
  camera: {
    borderRadius: tokens.controlRadius,
    overflow: 'hidden',
    alignItems: 'center',
    aspectRatio: '16 / 9',
    backgroundColor: foundationTokens.muted,
    backgroundImage: cardDemoTokens.cameraPattern,
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  },
  liveBadge: { position: 'absolute', right: '0.5rem', top: '0.5rem' },
})

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Front Door'] }, h),
              cardDescription({ children: ['Smart Lock Pro'] }, h),
              cardAction(
                {
                  children: [
                    h.div(
                      [h.Class(className(styles.status))],
                      [
                        'Locked',
                        Icon.icon<Msg>(
                          'lock',
                          { class: className(styles.lockIcon) },
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
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.camera))],
                [
                  h.div(
                    [h.Class(className(styles.liveBadge))],
                    [badge({ variant: 'destructive', children: ['Live'] }, h)],
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

// Stateful? no. Submodels wired: none. PORT NOTEs: none.
