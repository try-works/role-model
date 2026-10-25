import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../../stylex/foundations-tokens.stylex'
import { icon } from '@/stylex/composition/icon'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'

const styles = stylex.create({
  root: {
    overflow: 'clip',
    backgroundColor: tokens.background,
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
  },
  skipLink: {
    margin: { default: '-1px', ':focus': 0 },
    padding: { default: 0, ':focus': '0.5rem 1rem' },
    borderWidth: 0,
    overflow: { default: 'hidden', ':focus': 'visible' },
    textDecoration: { default: 'none', ':focus': 'none' },
    backgroundColor: { default: 'transparent', ':focus': tokens.card },
    clipPath: { default: 'inset(50%)', ':focus': 'none' },
    color: { default: 'inherit', ':focus': tokens.primary },
    fontSize: { default: 'inherit', ':focus': '0.875rem' },
    fontWeight: { default: 400, ':focus': 600 },
    insetInlineStart: { default: 'auto', ':focus': '0.5rem' },
    position: { default: 'absolute', ':focus': 'fixed' },
    whiteSpace: { default: 'nowrap', ':focus': 'normal' },
    zIndex: { default: 'auto', ':focus': 9999 },
    height: { default: '1px', ':focus': 'auto' },
    top: { default: 'auto', ':focus': '0.5rem' },
    width: { default: '1px', ':focus': 'auto' },
  },
  topNav: {
    gap: '1rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    height: '3rem',
  },
  topNavItems: { gap: '0.25rem', alignItems: 'center', display: 'flex' },
  topNavItem: {
    borderRadius: foundationTokens.radiusMd,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  topNavItemSelected: {
    borderRadius: foundationTokens.radiusMd,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  middle: { display: 'flex', flexGrow: 1, minHeight: 0 },
  aside: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflowY: 'auto',
  },
  sideNav: {
    padding: '0.5rem',
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '16.25rem',
  },
  navSection: { gap: '0.125rem', display: 'flex', flexDirection: 'column' },
  navSectionTitle: {
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    paddingBlockEnd: '0.25rem',
  },
  navItem: {
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '1.5rem',
  },
  navItemSelected: {
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
  },
  logoLink: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  logoChip: {
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    display: 'flex',
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  },
  logoText: { fontSize: '0.875rem', fontWeight: 600, lineHeight: '1.25rem' },
  mainWrapper: {
    display: 'flex',
    flexGrow: 1,
    position: 'relative',
    height: '100%',
    minHeight: 0,
  },
  elevatedBackdrop: {
    inset: 0,
    backgroundColor: tokens.card,
    borderStartStartRadius: foundationTokens.radius2xl,
    pointerEvents: 'none',
    position: 'absolute',
  },
  main: {
    padding: '1.5rem',
    outline: 'none',
    backgroundColor: 'transparent',
    flexGrow: 1,
    isolation: 'isolate',
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
  },
  content: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  tiles: {
    gap: '1rem',
    display: 'grid',
    gridAutoRows: 'min-content',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': 'repeat(3, minmax(0, 1fr))',
    },
  },
  tile: {
    borderRadius: foundationTokens.radiusXl,
    aspectRatio: '16 / 9',
    backgroundColor: foundationTokens.muted,
    opacity: 0.5,
  },
  fill: {
    borderRadius: foundationTokens.radiusXl,
    backgroundColor: foundationTokens.muted,
    flexGrow: 1,
    opacity: 0.5,
    minHeight: { default: '100vh', '@media (min-width: 768px)': 'min-content' },
  },
})

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
