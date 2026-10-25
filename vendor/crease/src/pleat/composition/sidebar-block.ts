import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { className } from '../style'
import { foundationTokens } from '../foundations-tokens'
import { tokens } from '../tokens'

const styles = {
  header: Style.make({
    gap: '.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: '4rem',
  }),
  sticky: Style.make({
    backgroundColor: tokens.background,
    position: 'sticky',
    zIndex: 20,
    top: 0,
  }),
  borderless: Style.make({ borderBottomWidth: 0 }),
  compact: Style.make({ height: '3.5rem' }),
  label: Style.make({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  }),
  body: Style.make({
    padding: '1rem',
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
  }),
  cards: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
  }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    }),
  ),
  calendar: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  }),
  skeleton: Style.make({
    borderRadius: tokens.radius,
    backgroundColor: foundationTokens.muted,
    opacity: 0.5,
  }),
  docBody: Style.make({
    padding: '1rem',
    gap: '1rem',
    paddingBlock: '2.5rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
  }),
  docBodyTall: Style.make({
    padding: '1rem',
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
  }),
  docRow: Style.make({
    borderRadius: foundationTokens.radiusXl,
    backgroundColor: foundationTokens.muted,
    flexShrink: 0,
    opacity: 0.5,
    height: '6rem',
    maxWidth: '48rem',
    width: '100%',
  }),
  docFill: Style.make({
    borderRadius: foundationTokens.radiusXl,
    backgroundColor: foundationTokens.muted,
    opacity: 0.5,
    height: '100%',
    maxWidth: '48rem',
    width: '100%',
  }),
  docFillTall: Style.make({
    borderRadius: foundationTokens.radiusXl,
    backgroundColor: foundationTokens.muted,
    opacity: 0.5,
    height: '100vh',
    maxWidth: '48rem',
    width: '100%',
  }),
  tile: Style.make({ aspectRatio: '16 / 9' }),
  fill: Style.make({ flexGrow: 1, minHeight: '24rem' }),
  row: Style.make({ flexShrink: 0, height: '3rem' }),
  page: Style.make({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100svh',
  }),
  mail: Style.make({
    display: 'none',
    flexDirection: 'column',
    flexShrink: 0,
    borderRightColor: tokens.border,
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    height: '100svh',
    overflowY: 'auto',
    width: '19rem',
  }).pipe(Style.when(When.minWidth('768px'), { display: 'flex' })),
  mailItem: Style.make({
    padding: '1rem',
    gap: '0.5rem',
    backgroundColor: tokens.background,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: foundationTokens.muted })),
  preview: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '100svh',
  }),
  settings: Style.make({
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    height: 'min(30rem, calc(100svh - 6rem))',
    minWidth: 0,
  }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: '16rem minmax(0, 1fr)',
    }),
  ),
  settingsNavigation: Style.make({ display: 'none', overflowY: 'auto' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'block' }),
  ),
  settingsMain: Style.make({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflowY: 'auto',
  }),
  docBodySettings: Style.make({
    padding: '1rem',
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
    paddingTop: 0,
  }),
  docTile: Style.make({
    borderRadius: foundationTokens.radiusXl,
    aspectRatio: '16 / 9',
    backgroundColor: foundationTokens.muted,
    opacity: 0.5,
    maxWidth: '48rem',
    width: '100%',
  }),
}

export const blockHeader = <M>(
  children: ReadonlyArray<Html | string>,
  sticky: boolean,
  h: HtmlBuilder<M>,
  bordered = true,
  compact = false,
): Html =>
  h.header(
    [
      h.Class(
        className(
          styles.header,
          sticky && styles.sticky,
          !bordered && styles.borderless,
          compact && styles.compact,
        ),
      ),
    ],
    children,
  )
export const blockLabel = <M>(label: string, h: HtmlBuilder<M>): Html =>
  h.span([h.Class(className(styles.label))], [label])
export const blockPage = <M>(
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<M>,
): Html => h.div([h.Class(className(styles.page))], children)
export const blockCenter = <M>(
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<M>,
  onMount: M,
): Html =>
  h.div(
    [
      h.Class(className(styles.preview)),
      h.OnMount({
        name: 'open-settings-preview',
        f: () => Stream.succeed(onMount),
      }),
    ],
    children,
  )
export const settingsLayout = <M>(
  navigation: Html,
  content: ReadonlyArray<Html>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [h.Class(className(styles.settings))],
    [
      h.nav(
        [
          h.AriaLabel('Settings navigation'),
          h.Class(className(styles.settingsNavigation)),
        ],
        [navigation],
      ),
      h.main([h.Class(className(styles.settingsMain))], content),
    ],
  )
export const mailPanel = <M>(
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<M>,
): Html =>
  h.aside([h.AriaLabel('Messages'), h.Class(className(styles.mail))], children)
export const mailItem = <M>(
  children: ReadonlyArray<Html>,
  onClick: M,
  h: HtmlBuilder<M>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(onClick),
      h.Class(className(reset.button, styles.mailItem)),
    ],
    children,
  )
export const blockSkeleton = <M>(
  variant:
    | 'cards'
    | 'rows'
    | 'calendar'
    | 'document'
    | 'documentTall'
    | 'settings',
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.AriaHidden(true),
      h.Class(
        className(
          variant === 'document'
            ? styles.docBody
            : variant === 'documentTall'
              ? styles.docBodyTall
              : variant === 'settings'
                ? styles.docBodySettings
                : styles.body,
        ),
      ),
    ],
    variant === 'cards'
      ? [
          h.div(
            [h.Class(className(styles.cards))],
            Array.from({ length: 3 }, () =>
              h.div([h.Class(className(styles.skeleton, styles.tile))], []),
            ),
          ),
          h.div([h.Class(className(styles.skeleton, styles.fill))], []),
        ]
      : variant === 'calendar'
        ? [
            h.div(
              [h.Class(className(styles.calendar))],
              Array.from({ length: 20 }, () =>
                h.div([h.Class(className(styles.skeleton, styles.tile))], []),
              ),
            ),
          ]
        : variant === 'document'
          ? [
              h.div([h.Class(className(styles.docRow))], []),
              h.div([h.Class(className(styles.docFill))], []),
            ]
          : variant === 'documentTall'
            ? [
                h.div([h.Class(className(styles.docRow))], []),
                h.div([h.Class(className(styles.docFillTall))], []),
              ]
            : variant === 'settings'
              ? Array.from({ length: 10 }, () =>
                  h.div([h.Class(className(styles.docTile))], []),
                )
              : Array.from({ length: 14 }, () =>
                  h.div([h.Class(className(styles.skeleton, styles.row))], []),
                ),
  )
