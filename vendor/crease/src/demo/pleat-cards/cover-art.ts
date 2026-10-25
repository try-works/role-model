import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/demo/icon-preview'
import { card, cardContent, cardDescription, cardFooter } from '@/pleat/card'
import { item, itemGroup } from '@/pleat/item'
import { label } from '@/pleat/label'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'
import { interactionTokens } from '../../pleat/interaction-tokens'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  content: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  eyebrow: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 400,
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textAlign: 'center',
    textTransform: 'uppercase',
  }),
  artwork: Style.make({ aspectRatio: '1 / 1' }),
  artworkFill: layoutStyle({ height: '100%', width: '100%' }),
  artworkLabel: Style.make({
    alignItems: 'center',
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  }),
  artworkIcon: Style.make({
    color: tokens.mutedForeground,
    opacity: 0.5,
    height: '2.5rem',
    width: '2.5rem',
  }),
  visuallyHidden: Style.make({
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  }),
  footer: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  uploadButton: Style.make({
    borderRadius: tokens.controlRadius,
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    height: '2rem',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: tokens.secondaryHover })),
  hint: Style.make({
    fontSize: '0.75rem',
    lineHeight: '1rem',
    textAlign: 'center',
  }),
}

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
                    [h.Class(className(styles.eyebrow))],
                    [label({ for: 'cover-art', children: ['Cover Art'] }, h)],
                  ),
                  h.div(
                    [h.Class(className(styles.artwork))],
                    [
                      itemGroup(
                        {
                          layoutStyle: styles.artworkFill,
                          children: [
                            item(
                              {
                                layoutStyle: styles.artworkFill,
                                variant: 'outline',
                                children: [
                                  h.label(
                                    [
                                      h.For('cover-art'),
                                      h.Class(className(styles.artworkLabel)),
                                    ],
                                    [
                                      Icon.icon<Msg>(
                                        'image',
                                        {
                                          class: className(styles.artworkIcon),
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
                      ),
                    ],
                  ),
                  h.input([
                    h.Id('cover-art'),
                    h.Type('file'),
                    h.Accept('image/jpeg,image/png'),
                    h.Class(className(reset.input, styles.visuallyHidden)),
                  ]),
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
                [h.Class(className(styles.footer))],
                [
                  h.label(
                    [
                      h.For('cover-art'),
                      h.Class(className(styles.uploadButton)),
                    ],
                    ['Upload Artwork'],
                  ),
                  h.div(
                    [h.Class(className(styles.hint))],
                    [
                      cardDescription(
                        {
                          children: [
                            'Minimum 3000 × 3000px',
                            h.br([]),
                            'JPEG or PNG only',
                          ],
                        },
                        h,
                      ),
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

// Stateful? no. Submodels wired: none. PORT NOTEs: Button-as-child label substitute.
