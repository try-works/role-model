import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../../pleat/foundations-tokens'
import { icon } from '@/pleat/composition/icon'
import { reset } from '@/pleat/reset'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'

const styles = {
  root: Style.make({
    overflow: 'clip',
    backgroundColor: tokens.background,
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
  }),
  skipLink: Style.make({
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    textDecoration: 'none',
    backgroundColor: 'transparent',
    clipPath: 'inset(50%)',
    color: 'inherit',
    fontSize: 'inherit',
    fontWeight: 400,
    insetInlineStart: 'auto',
    position: 'absolute',
    whiteSpace: 'nowrap',
    zIndex: 'auto',
    height: '1px',
    top: 'auto',
    width: '1px',
  }).pipe(
    Style.when(When.focus, {
      margin: 0,
      padding: '0.5rem 1rem',
      overflow: 'visible',
      textDecoration: 'none',
      backgroundColor: tokens.card,
      clipPath: 'none',
      color: tokens.primary,
      fontSize: '0.875rem',
      fontWeight: 600,
      insetInlineStart: '0.5rem',
      position: 'fixed',
      whiteSpace: 'normal',
      zIndex: 9999,
      height: 'auto',
      top: '0.5rem',
      width: 'auto',
    }),
  ),
  topNav: Style.make({
    gap: '1rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    height: '3rem',
  }),
  topNavItems: Style.make({
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  }),
  topNavItem: Style.make({
    borderRadius: foundationTokens.radiusMd,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  topNavItemSelected: Style.make({
    borderRadius: foundationTokens.radiusMd,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  middle: Style.make({ display: 'flex', flexGrow: 1, minHeight: 0 }),
  aside: Style.make({
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflowY: 'auto',
  }),
  sideNav: Style.make({
    padding: '0.5rem',
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '16.25rem',
  }),
  navSection: Style.make({
    gap: '0.125rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  navSectionTitle: Style.make({
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    paddingBlockEnd: '0.25rem',
  }),
  navItem: Style.make({
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '1.5rem',
  }),
  navItemSelected: Style.make({
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.accent,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    height: '1.5rem',
  }),
  logoLink: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
  }),
  logoChip: Style.make({
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    display: 'flex',
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  }),
  logoText: Style.make({
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  mainWrapper: Style.make({
    display: 'flex',
    flexGrow: 1,
    position: 'relative',
    height: '100%',
    minHeight: 0,
  }),
  elevatedBackdrop: Style.make({
    inset: 0,
    backgroundColor: tokens.card,
    borderStartStartRadius: foundationTokens.radius2xl,
    pointerEvents: 'none',
    position: 'absolute',
  }),
  main: Style.make({
    padding: '1.5rem',
    outline: 'none',
    backgroundColor: 'transparent',
    flexGrow: 1,
    isolation: 'isolate',
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
  }),
  content: Style.make({
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  }),
  tiles: Style.make({
    gap: '1rem',
    display: 'grid',
    gridAutoRows: 'min-content',
    gridTemplateColumns: 'minmax(0, 1fr)',
  }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    }),
  ),
  tile: Style.make({
    borderRadius: foundationTokens.radiusXl,
    aspectRatio: '16 / 9',
    backgroundColor: foundationTokens.muted,
    opacity: 0.5,
  }),
  fill: Style.make({
    borderRadius: foundationTokens.radiusXl,
    backgroundColor: foundationTokens.muted,
    flexGrow: 1,
    opacity: 0.5,
    minHeight: '100vh',
  }).pipe(Style.when(When.minWidth('768px'), { minHeight: 'min-content' })),
}

const navLogo = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.a(
    [h.Href('#'), h.Class(className(reset.link, styles.logoLink))],
    [
      h.span([h.Class(className(styles.logoChip))], [icon({ name: 'box' }, h)]),
      h.span([h.Class(className(styles.logoText))], ['Acme Inc']),
    ],
  )

const topNavItem = <Msg>(
  label: string,
  selected: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.Href('#'),
      h.Class(
        className(
          reset.link,
          selected ? styles.topNavItemSelected : styles.topNavItem,
        ),
      ),
    ],
    [label],
  )

const topNav = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.nav(
    [h.AriaLabel('Main navigation'), h.Class(className(styles.topNav))],
    [
      navLogo(h),
      h.div(
        [h.Class(className(styles.topNavItems))],
        [
          topNavItem('Home', true, h),
          topNavItem('Products', false, h),
          topNavItem('Docs', false, h),
        ],
      ),
    ],
  )

const sideNavItem = <Msg>(
  label: string,
  iconName: string,
  selected: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.Href('#'),
      h.Class(
        className(
          reset.link,
          selected ? styles.navItemSelected : styles.navItem,
        ),
      ),
    ],
    [icon({ name: iconName }, h), label],
  )

const sideNav = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const sections: ReadonlyArray<{
    title?: string
    items: ReadonlyArray<Html>
  }> = [
    {
      items: [
        sideNavItem('Dashboard', 'house', true, h),
        sideNavItem('Analytics', 'chart-column', false, h),
        sideNavItem('Projects', 'folder', false, h),
      ],
    },
    {
      title: 'Organization',
      items: [
        sideNavItem('Team', 'users', false, h),
        sideNavItem('Settings', 'settings', false, h),
      ],
    },
  ]
  return h.aside(
    [h.Class(className(styles.aside))],
    [
      h.nav(
        [h.Class(className(styles.sideNav))],
        sections.map(section =>
          h.div(
            [h.Class(className(styles.navSection))],
            [
              ...(section.title === undefined
                ? []
                : [
                    h.div(
                      [h.Class(className(styles.navSectionTitle))],
                      [section.title],
                    ),
                  ]),
              ...section.items,
            ],
          ),
        ),
      ),
    ],
  )
}

const pageContent = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.content))],
    [
      h.div(
        [h.Class(className(styles.tiles))],
        Array.from({ length: 3 }, () =>
          h.div([h.Class(className(styles.tile))], []),
        ),
      ),
      h.div([h.Class(className(styles.fill))], []),
    ],
  )

export const appShell = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.root))],
    [
      h.a(
        [
          h.Href('#app-shell-01-main'),
          h.Class(className(reset.link, styles.skipLink)),
        ],
        ['Skip to content'],
      ),
      h.header([], [topNav(h)]),
      h.div(
        [h.Class(className(styles.middle))],
        [
          sideNav(h),
          h.div(
            [h.Class(className(styles.mainWrapper))],
            [
              h.div([h.Class(className(styles.elevatedBackdrop))], []),
              h.main(
                [
                  h.Id('app-shell-01-main'),
                  h.Tabindex(-1),
                  h.Class(className(styles.main)),
                ],
                [pageContent(h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )
