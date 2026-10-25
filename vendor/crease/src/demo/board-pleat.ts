import { Style, When, Theme } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineView } from 'foldkit/submodel'
import { modifyFields } from 'foldkit/struct'

import * as BlocksBlocks from '@/demo/blocks-pleat/creaseui-blocks'
import * as BlocksDashboards from '@/demo/blocks-pleat/creaseui-dashboards'
import * as AccountAccess from '@/demo/pleat-cards/account-access'
import * as CardOverview from '@/demo/pleat-cards/card-overview'
import * as ClaimableBalance from '@/demo/pleat-cards/claimable-balance'
import * as ContributionHistory from '@/demo/pleat-cards/contribution-history'
import * as CoverArt from '@/demo/pleat-cards/cover-art'
import * as DividendIncome from '@/demo/pleat-cards/dividend-income'
import * as EmptyConnectBank from '@/demo/pleat-cards/empty-connect-bank'
import * as EmptyDistributeTrack from '@/demo/pleat-cards/empty-distribute-track'
import * as EmptyExploreCatalog from '@/demo/pleat-cards/empty-explore-catalog'
import * as Faq from '@/demo/pleat-cards/faq'
import * as FrontDoor from '@/demo/pleat-cards/front-door'
import * as IndexInvesting from '@/demo/pleat-cards/index-investing'
import * as KitchenIsland from '@/demo/pleat-cards/kitchen-island'
import * as LoadingCard from '@/demo/pleat-cards/loading-card'
import * as NewMilestone from '@/demo/pleat-cards/new-milestone'
import * as NotificationSettings from '@/demo/pleat-cards/notification-settings'
import * as Payments from '@/demo/pleat-cards/payments'
import * as PayoutThreshold from '@/demo/pleat-cards/payout-threshold'
import * as PowerUsage from '@/demo/pleat-cards/power-usage'
import * as Preferences from '@/demo/pleat-cards/preferences'
import * as QrConnect from '@/demo/pleat-cards/qr-connect'
import * as ReceivingMethod from '@/demo/pleat-cards/receiving-method'
import * as RecentTransactions from '@/demo/pleat-cards/recent-transactions'
import * as ReleaseCatalog from '@/demo/pleat-cards/release-catalog'
import * as RollerShades from '@/demo/pleat-cards/roller-shades'
import * as SavingsProgress from '@/demo/pleat-cards/savings-progress'
import * as SavingsTargets from '@/demo/pleat-cards/savings-targets'
import * as SidebarNav from '@/demo/pleat-cards/sidebar-nav'
import * as SocialLinks from '@/demo/pleat-cards/social-links'
import * as StockPerformance from '@/demo/pleat-cards/stock-performance'
import * as SyncingState from '@/demo/pleat-cards/syncing-state'
import * as TransferFunds from '@/demo/pleat-cards/transfer-funds'
import * as UpcomingPayments from '@/demo/pleat-cards/upcoming-payments'
import * as Preset from '@/demo/create-preset'
import * as ColorPicker from '@/pleat/color-picker'
import * as Popover from '@/pleat/popover'
import * as ScrollArea from '@/pleat/scroll-area'
import * as Icon from '@/lib/icon'
import * as PreviewIcon from '@/demo/icon-preview'
import { className } from '@/pleat/style'
import { compositionTheme } from '../pleat/composition/composition-theme'
import { complexTokens } from '../pleat/complex-tokens'
import { foundationTokens } from '../pleat/foundations-tokens'
import { tokens } from '../pleat/tokens'
import { boardTokens } from './board-pleat-tokens'
import { cardTokens } from './pleat-cards/complex-card-tokens'
import { cardDemoTokens } from './pleat-cards/foundations-card-tokens'
import { interactionCardTokens } from './pleat-cards/interaction-card-tokens'
import { interactionTokens } from '../pleat/interaction-tokens'

import { scopedRoleDeclarations } from '@/theme/roles'
import { layoutStyle } from '@/pleat/contracts'

const pleatVariableName = (variable: { toString(): string }): string =>
  String(variable).replace(/^var\((--[^,)]+).*/, '$1')

const scopedPleatThemeCss = (): string => {
  const aliases: ReadonlyArray<
    readonly [{ toString(): string }, { toString(): string }]
  > = [
    [boardTokens.boardBackground, 'var(--background)'],
    [boardTokens.boardMuted, 'var(--muted)'],
    [boardTokens.boardMutedForeground, 'var(--muted-foreground)'],
    [cardTokens.muted, 'var(--muted)'],
    /* TW hardcodes bg-yellow-500 for the pending dot — preset-immune literal. */
    [cardDemoTokens.artworkSurface, 'var(--muted)'],
    [cardDemoTokens.artworkForeground, 'var(--muted-foreground)'],
    [
      cardDemoTokens.cameraPattern,
      'repeating-linear-gradient(45deg, transparent, transparent 10px, var(--border) 10px, var(--border) 11px)',
    ],
    [interactionCardTokens.qrForeground, 'var(--foreground)'],
    [interactionCardTokens.qrMuted, 'var(--muted)'],
    [interactionCardTokens.usageAccent, 'var(--chart-1)'],
    [compositionTheme.canvas, 'var(--muted)'],
  ]
  const roleDeclarations = (
    [
      ['tokens', tokens],
      ['foundationTokens', foundationTokens],
      ['complexTokens', complexTokens],
    ] as const
  )
    .map(([group, vars]) => {
      const names = new Map(
        Object.entries(vars).map(
          ([role, value]) => [role, String(value)] as const,
        ),
      )
      return scopedRoleDeclarations(group, role =>
        pleatVariableName(names.get(role) ?? ''),
      )
    })
    .join(';')
  const declarations = [
    roleDeclarations,
    ...aliases.map(
      ([variable, value]) => `${pleatVariableName(variable)}:${value}`,
    ),
  ].join(';')
  const inspectorDeclarations: ReadonlyArray<
    readonly [{ toString(): string }, { toString(): string }]
  > = [
    [tokens.background, boardTokens.panel],
    [tokens.foreground, boardTokens.text],
    [tokens.card, boardTokens.panelField],
    [tokens.cardForeground, boardTokens.text],
    [tokens.secondary, boardTokens.selected],
    [tokens.secondaryForeground, boardTokens.text],
    [tokens.mutedForeground, boardTokens.textMuted],
    [tokens.accent, boardTokens.selected],
    [tokens.accentForeground, boardTokens.text],
    [tokens.border, boardTokens.border],
    [tokens.input, boardTokens.border],
    [foundationTokens.muted, boardTokens.hover],
  ]
  const inspectorTheme = inspectorDeclarations
    .map(([variable, value]) => `${pleatVariableName(variable)}:${value}`)
    .join(';')
  const darkBoardBackground = [
    `${pleatVariableName(boardTokens.boardMuted)}:var(--background)`,
    `${pleatVariableName(compositionTheme.canvas)}:var(--background)`,
  ].join(';')
  return `[data-crease-board-theme]{${declarations}}.dark [data-crease-board-theme]{${darkBoardBackground}}[data-primitive-inspector]{${inspectorTheme}}`
}

const styles = {
  applyButton: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: boardTokens.transparent,
    color: boardTokens.text,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    height: '2.25rem',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.hover })),
  board: Style.make({
    padding: '1rem',
    gap: '1rem',
    alignItems: 'flex-start',
    backgroundColor: boardTokens.boardMuted,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    width: '150rem',
  }).pipe(
    Style.when(When.minWidth('1920px'), { padding: '3rem', gap: '3rem' }),
    Style.when(When.minWidth('768px'), {
      padding: '2.5rem',
      gap: '2.5rem',
      width: '187.5rem',
    }),
  ),
  boardGap: Style.make({ gap: '1rem' }).pipe(
    Style.when(When.minWidth('1920px'), { gap: '3rem' }),
    Style.when(When.minWidth('768px'), { gap: '2.5rem' }),
  ),
  choice: Style.make({
    borderRadius: foundationTokens.radiusMd,
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: boardTokens.transparent,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    transitionProperty: 'background-color',
    minHeight: '2.5rem',
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, { backgroundColor: boardTokens.hover }),
    Style.when(When.hover, { backgroundColor: boardTokens.hover }),
  ),
  choiceSelected: Style.make({ backgroundColor: boardTokens.selected }),
  column: Style.make({
    padding: '0.25rem',
    containIntrinsicSize: '380px 1200px',
    contentVisibility: 'auto',
    display: 'flex',
    flexDirection: 'column',
  }),
  columnWide: Style.make({
    padding: '0.25rem',
    containIntrinsicSize: '760px 1200px',
    contentVisibility: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gridColumnEnd: 'span 2',
    gridColumnStart: 'span 2',
  }),
  copyButton: Style.make({
    borderRadius: foundationTokens.radiusMd,
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: boardTokens.text,
    color: boardTokens.textInverse,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    position: 'relative',
    height: '2.25rem',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.textMuted })),
  copyIcon: Style.make({
    transitionProperty: 'scale, opacity, filter',
    height: '1rem',
    width: '1rem',
  }),
  copyIconHidden: Style.make({ filter: 'blur(4px)', opacity: 0, scale: 0.25 }),
  copiedIcon: Style.make({
    color: boardTokens.success,
    position: 'absolute',
    height: '1rem',
    left: '5.2rem',
    width: '1rem',
  }),
  customizerDrawer: Style.make({
    backgroundColor: boardTokens.panel,
    color: boardTokens.text,
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  }),
  customizer: Style.make({
    borderRadius: boardTokens.panelRadius,
    overflow: 'hidden',
    backgroundColor: boardTokens.panel,
    boxShadow: boardTokens.panelShadow,
    color: boardTokens.text,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 30,
    bottom: '1.25rem',
    left: '1.25rem',
    right: 'auto',
    top: '4.75rem',
    width: '17.625rem',
  }).pipe(
    Style.when(When.maxWidth('1023px'), {
      left: '0.75rem',
      right: '0.75rem',
      width: 'auto',
    }),
  ),
  customizerBody: Style.make({
    padding: '1rem',
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  customizerFooter: Style.make({
    padding: '1rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    borderTopColor: boardTokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  }),
  customizerHeader: Style.make({
    padding: '1rem',
    borderBottomColor: boardTokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  }),
  customizerHeaderInner: Style.make({
    borderColor: boardTokens.border,
    borderRadius: boardTokens.panelInnerRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    height: '3rem',
  }),
  details: Style.make({ display: 'block' }),
  detailsBody: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    marginTop: '0.5rem',
  }),
  divider: Style.make({
    marginInline: '-1rem',
    borderTopColor: boardTokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  }),
  error: Style.make({
    color: boardTokens.error,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  fieldInput: Style.make({
    borderColor: boardTokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingInline: '0.75rem',
    backgroundColor: boardTokens.panelInput,
    color: boardTokens.text,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    outlineColor: boardTokens.transparent,
    outlineStyle: 'none',
    outlineWidth: 0,
    height: '2.25rem',
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, {
      outlineColor: boardTokens.focus,
      outlineStyle: 'solid',
      outlineWidth: 2,
    }),
  ),
  group: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  iconCheck: Style.make({ height: '1rem', marginLeft: 'auto', width: '1rem' }),
  iconMenu: Style.make({
    color: boardTokens.textMuted,
    height: '1.25rem',
    width: '1.25rem',
  }),
  iconRight: Style.make({
    color: boardTokens.textSubtle,
    height: '1rem',
    width: '1rem',
  }),
  marker: Style.make({
    borderRadius: '50%',
    height: '0.875rem',
    width: '0.875rem',
  }),
  markerZinc: Style.make({ backgroundColor: boardTokens.markerZinc }),
  nestedGrid: Style.make({
    gap: '1rem',
    alignItems: 'flex-start',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }).pipe(
    Style.when(When.minWidth('1920px'), { gap: '3rem' }),
    Style.when(When.minWidth('768px'), { gap: '2.5rem' }),
  ),
  panelCode: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    color: boardTokens.textMuted,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  pickerChoiceLabel: Style.make({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  pickerContent: Style.make({
    borderColor: boardTokens.border,
    borderRadius: 'inherit',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: '0.5rem',
    backgroundColor: boardTokens.panelPopover,
    color: boardTokens.text,
  }),
  pickerLabel: Style.make({
    color: boardTokens.boardMutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    position: 'absolute',
    left: '0.75rem',
    top: '0.625rem',
  }),
  pickerMarkerGroup: Style.make({
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    marginLeft: '0.75rem',
    paddingBottom: '0.125rem',
  }),
  pickerTrigger: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingInline: '0.75rem',
    alignItems: 'flex-end',
    backgroundColor: boardTokens.panelField,
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
    height: '4.125rem',
    minWidth: 0,
    paddingBottom: '0.625rem',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.hover })),
  pickerTriggerLayout: layoutStyle({
    height: '4.125rem',
    minWidth: 0,
    width: '100%',
  }),
  pickerValue: Style.make({
    overflow: 'hidden',
    fontSize: '0.9375rem',
    fontWeight: 600,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  popoverSize: layoutStyle({ width: '18rem' }),
  presetButton: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    listStyle: 'none',
    alignItems: 'center',
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    height: '2.25rem',
  }),
  preview: Style.make({
    backgroundColor: boardTokens.boardMuted,
    contain: 'paint',
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingLeft: 0,
  }).pipe(Style.when(When.minWidth('1024px'), { paddingLeft: '20.625rem' })),
  previewCenter: Style.make({
    display: 'flex',
    justifyContent: 'center',
    minWidth: 'max-content',
    width: '100%',
  }),
  root: Style.make({ position: 'relative', minHeight: 'calc(100vh - 3.5rem)' }),
  scrollArea: layoutStyle({ flexGrow: 1, minHeight: 0 }),
  scrollChoices: layoutStyle({ maxHeight: '20rem' }),
  section: Style.make({ display: 'flex', flexDirection: 'column' }),
  title: Style.make({
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  sectionTabs: Style.make({
    backgroundColor: boardTokens.panelField,
    borderRadius: foundationTokens.radiusMd,
    display: 'flex',
    gap: '0.25rem',
    padding: '0.25rem',
  }),
  sectionTabsGrid: Style.make({
    backgroundColor: boardTokens.panelField,
    borderRadius: foundationTokens.radiusMd,
    display: 'grid',
    gap: '0.25rem',
    gridTemplateColumns: 'repeat(3, 1fr)',
    padding: '0.25rem',
  }),
  sectionTab: Style.make({
    borderRadius: foundationTokens.radiusSm,
    color: boardTokens.textMuted,
    fontSize: '0.6875rem',
    fontWeight: 600,
    paddingBlock: '0.375rem',
    paddingInline: '0.25rem',
    backgroundColor: boardTokens.transparent,
    flexGrow: 1,
    flexBasis: 0,
    flexShrink: 1,
  }),
  sectionTabActive: Style.make({
    backgroundColor: boardTokens.text,
    color: boardTokens.textInverse,
  }),
  tokenGroupLabel: Style.make({
    color: boardTokens.textSubtle,
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  }),
  tokenRow: Style.make({
    alignItems: 'center',
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: boardTokens.panelField,
    display: 'flex',
    gap: '0.625rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.625rem',
    textAlign: 'left',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.hover })),
  tokenRowOverridden: Style.make({
    borderColor: boardTokens.focus,
    backgroundColor: boardTokens.hover,
  }),
  tokenSwatch: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    flexShrink: 0,
    height: '1.5rem',
    width: '1.5rem',
  }),
  tokenName: Style.make({
    color: boardTokens.text,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  tokenValue: Style.make({
    color: boardTokens.textSubtle,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.625rem',
    lineHeight: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  tokenCustomBadge: Style.make({
    backgroundColor: boardTokens.selected,
    borderRadius: foundationTokens.radiusSm,
    color: boardTokens.text,
    flexShrink: 0,
    fontSize: '0.5625rem',
    fontWeight: 600,
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    textTransform: 'uppercase',
  }),
  tokenContrastBadge: Style.make({
    borderRadius: foundationTokens.radiusSm,
    flexShrink: 0,
    fontSize: '0.5625rem',
    fontWeight: 600,
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
  }),
  tokenEditor: Style.make({
    backgroundColor: boardTokens.panelInput,
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.625rem',
  }),
  tokenEditorRow: Style.make({
    alignItems: 'center',
    display: 'flex',
    gap: '0.5rem',
  }),
  tokenTextInput: Style.make({
    backgroundColor: boardTokens.panelInput,
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    color: boardTokens.text,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.75rem',
    height: '2rem',
    minWidth: 0,
    flexGrow: 1,
    paddingInline: '0.5rem',
  }),
  tokenResetButton: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    color: boardTokens.textMuted,
    flexShrink: 0,
    fontSize: '0.625rem',
    fontWeight: 600,
    height: '2rem',
    paddingInline: '0.5rem',
    backgroundColor: boardTokens.transparent,
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.hover })),
  tokenClearAll: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    color: boardTokens.textMuted,
    fontSize: '0.625rem',
    fontWeight: 600,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
  }),
  tokenHeader: Style.make({
    alignItems: 'center',
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'space-between',
  }),
  segLabel: Style.make({
    color: boardTokens.textMuted,
    fontSize: '0.75rem',
    fontWeight: 500,
  }),
  segRow: Style.make({ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }),
  segButton: Style.make({
    borderRadius: foundationTokens.radiusSm,
    fontSize: '0.75rem',
    fontWeight: 500,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    color: boardTokens.textMuted,
    backgroundColor: boardTokens.hover,
    transitionProperty: 'color, background-color',
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.selected })),
  segButtonActive: Style.make({
    backgroundColor: boardTokens.text,
    color: boardTokens.textInverse,
  }),
  knobRow: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  }),
  mono: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  }),
  colorFieldSwatch: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    flexShrink: 0,
    height: '1.25rem',
    marginBottom: '0.125rem',
    marginLeft: '0.75rem',
    width: '1.25rem',
  }),
  tileGrid: Style.make({
    display: 'grid',
    gap: '0.5rem',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
  tile: Style.make({
    borderColor: boardTokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    padding: '0.625rem',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    textAlign: 'left',
    backgroundColor: boardTokens.panelField,
    transitionProperty: 'border-color, background-color',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: boardTokens.hover })),
  tileActive: Style.make({
    backgroundColor: boardTokens.selected,
    borderColor: boardTokens.focus,
  }),
  tileSwatches: Style.make({
    alignItems: 'flex-end',
    display: 'flex',
    gap: '0.25rem',
    height: '2rem',
  }),
  tileSwatch: Style.make({
    borderRadius: '50%',
    borderColor: boardTokens.border,
    borderStyle: 'solid',
    borderWidth: 1,
    height: '0.875rem',
    width: '0.875rem',
  }),
  tileName: Style.make({
    color: boardTokens.text,
    fontSize: '0.75rem',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  toolbar: Style.make({
    alignItems: 'center',
    backgroundColor: boardTokens.panel,
    boxShadow: boardTokens.panelShadow,
    borderRadius: boardTokens.panelRadius,
    color: boardTokens.text,
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem',
    position: 'fixed',
    right: '1.25rem',
    top: '4.75rem',
    zIndex: 30,
  }).pipe(Style.when(When.maxWidth('1023px'), { right: '0.75rem' })),
  toolbarDivider: Style.make({
    backgroundColor: boardTokens.border,
    height: '1.25rem',
    marginInline: '0.125rem',
    width: 1,
  }),
  blocksCanvas: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: boardTokens.boardMuted,
    width: '70rem',
  }).pipe(
    Style.when(When.minWidth('1920px'), { gap: '3rem', padding: '3rem' }),
    Style.when(When.minWidth('768px'), { gap: '2.5rem', padding: '2.5rem' }),
  ),
  blockFrame: Style.make({
    backgroundColor: tokens.background,
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
  }),
  blockFrameBar: Style.make({
    alignItems: 'center',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    display: 'flex',
    gap: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
  }),
  blockFrameLabel: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.625rem',
    textTransform: 'uppercase',
  }),
  typeCanvas: Style.make({
    backgroundColor: tokens.background,
    color: tokens.foreground,
    padding: '2.5rem',
    width: '47.5rem',
  }),
  typeInner: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    marginInline: 'auto',
    maxWidth: '32.5rem',
  }),
  headingGroup: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  }),
  h1: Style.make({
    fontSize: '2.25rem',
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: '2.5rem',
  }),
  h2: Style.make({
    fontSize: '1.875rem',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    lineHeight: '2.25rem',
  }),
  h3: Style.make({
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: '2rem',
  }),
  h4: Style.make({
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: '1.75rem',
  }),
  bodyP: Style.make({ fontSize: '1rem', lineHeight: '1.75' }),
  mutedP: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.5',
  }),
  blockquote: Style.make({
    borderLeftColor: tokens.border,
    borderLeftStyle: 'solid',
    borderLeftWidth: 2,
    fontStyle: 'italic',
    paddingLeft: '1rem',
  }),
  listUl: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    listStyleType: 'disc',
    paddingLeft: '1.5rem',
  }),
  inlineCode: Style.make({
    backgroundColor: tokens.muted,
    borderRadius: foundationTokens.radiusSm,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    padding: '0.125rem 0.375rem',
  }),
  paletteCanvas: Style.make({
    backgroundColor: tokens.background,
    padding: '2rem',
    width: '55rem',
  }),
  swatchGrid: Style.make({
    display: 'grid',
    gap: '0.75rem',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  }).pipe(
    Style.when(When.minWidth('1920px'), {
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    }),
  ),
  swatch: Style.make({
    backgroundColor: tokens.card,
    borderColor: tokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
  }),
  swatchColor: Style.make({ height: '4rem' }),
  swatchMeta: Style.make({
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
  }),
  swatchLabel: Style.make({
    color: tokens.foreground,
    fontSize: '0.75rem',
    fontWeight: 500,
  }),
  swatchVar: Style.make({
    color: tokens.mutedForeground,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.625rem',
  }),
}

export const Model = S.Struct({
  accountAccess: AccountAccess.Model,
  faq: Faq.Model,
  kitchenIsland: KitchenIsland.Model,
  newMilestone: NewMilestone.Model,
  notificationSettings: NotificationSettings.Model,
  payments: Payments.Model,
  payoutThreshold: PayoutThreshold.Model,
  preferences: Preferences.Model,
  receivingMethod: ReceivingMethod.Model,
  recentTransactions: RecentTransactions.Model,
  releaseCatalog: ReleaseCatalog.Model,
  rollerShades: RollerShades.Model,
  savingsTargets: SavingsTargets.Model,
  socialLinks: SocialLinks.Model,
  stockPerformance: StockPerformance.Model,
  transferFunds: TransferFunds.Model,
  upcomingPayments: UpcomingPayments.Model,
  preset: Preset.Config,
  presetInput: S.String,
  presetError: S.NullOr(S.String),
  isPresetCopied: S.Boolean,
  section: S.Literals(['tokens', 'theme', 'color', 'shape', 'type', 'motion']),
  scheme: S.Literals(['system', 'light', 'dark']),
  tokenScheme: S.Literals(['light', 'dark']),
  openToken: S.NullOr(S.String),
  tokenDrafts: S.Record(S.String, S.String),
  tokenPicker: ColorPicker.Model,
  /* The Color pane's real color pickers — they write decomposed oklch back
     into the parametric fields (hue/chroma/lightness, surface lightness +
     saturation + base, nearest chart family). */
  colorPickers: S.Struct({
    accent: ColorPicker.Model,
    surfaceLight: ColorPicker.Model,
    surfaceDark: ColorPicker.Model,
    chart: ColorPicker.Model,
  }),
  canvas: S.Literals(['board', 'blocks', 'type', 'palette']),
  primitiveInspector: S.Struct({
    boxPadding: S.Literals(['responsive', 'none', 'sm', 'md', 'xl']),
    boxSurface: S.Literals(['card', 'muted', 'section']),
    gridColumns: S.Literals(['one', 'two']),
    inlineJustify: S.Literals(['start', 'center', 'end', 'between']),
    stackGap: S.Literals(['responsive', 'sm', 'md', 'xl']),
    textVariant: S.Literals(['inherit', 'caption', 'headingSm', 'headingMd']),
  }),
  pickerPopovers: S.Struct({
    style: Popover.Model,
    base: Popover.Model,
    chartColor: Popover.Model,
    iconLibrary: Popover.Model,
    font: Popover.Model,
    fontHeading: Popover.Model,
    menuAccent: Popover.Model,
    menuColor: Popover.Model,
  }),
})
export type Model = typeof Model.Type
export type PrimitiveInspector = Model['primitiveInspector']

export const Message = defineMessageUnion({
  GotAccountAccessMessage: {
    message: AccountAccess.Message,
  },
  GotFaqMessage: {
    message: Faq.Message,
  },
  GotKitchenIslandMessage: {
    message: KitchenIsland.Message,
  },
  GotNewMilestoneMessage: {
    message: NewMilestone.Message,
  },
  GotNotificationSettingsMessage: { message: NotificationSettings.Message },
  GotPaymentsMessage: {
    message: Payments.Message,
  },
  GotPayoutThresholdMessage: {
    message: PayoutThreshold.Message,
  },
  GotPreferencesMessage: {
    message: Preferences.Message,
  },
  GotReceivingMethodMessage: {
    message: ReceivingMethod.Message,
  },
  GotRecentTransactionsMessage: {
    message: RecentTransactions.Message,
  },
  GotReleaseCatalogMessage: {
    message: ReleaseCatalog.Message,
  },
  GotRollerShadesMessage: {
    message: RollerShades.Message,
  },
  GotSavingsTargetsMessage: {
    message: SavingsTargets.Message,
  },
  GotSocialLinksMessage: {
    message: SocialLinks.Message,
  },
  GotStockPerformanceMessage: {
    message: StockPerformance.Message,
  },
  GotTransferFundsMessage: {
    message: TransferFunds.Message,
  },
  GotUpcomingPaymentsMessage: {
    message: UpcomingPayments.Message,
  },
  ChangedCreatePresetInput: {
    value: S.String,
  },
  AppliedCreatePresetInput: {},
  ChangedCreatePresetField: {
    field: Preset.Field,
    value: S.String,
  },
  ChangedCreatePresetOption: {
    field: Preset.OptionField,
    value: S.String,
  },
  ChoseCreateTheme: { name: S.String },
  ChoseCreateSection: {
    section: S.Literals([
      'tokens',
      'theme',
      'color',
      'shape',
      'type',
      'motion',
    ]),
  },
  ChoseCreateTokenScheme: {
    scheme: S.Literals(['light', 'dark']),
  },
  ToggledCreateToken: { token: S.String },
  ChangedCreateToken: {
    token: S.String,
    value: S.String,
  },
  GotCreateTokenPickerMessage: {
    message: ColorPicker.Message,
  },
  GotCreateColorPickerMessage: {
    target: S.Literals(['accent', 'surfaceLight', 'surfaceDark', 'chart']),
    message: ColorPicker.Message,
  },
  ClickedResetCreateTokens: {},
  ChoseCreateScheme: { scheme: S.Literals(['system', 'light', 'dark']) },
  ChoseCreateCanvas: {
    canvas: S.Literals(['board', 'blocks', 'type', 'palette']),
  },
  ClickedResetCreatePreset: {},
  ClickedCopyCreatePreset: {},
  ClickedShuffleCreatePreset: {},
  CompletedCopyCreatePreset: {},
  CompletedWaitBeforeClearingCreatePresetCopy: {},
  GotCreatePresetPickerMessage: {
    field: Preset.Field,
    message: Popover.Message,
  },
  ChangedPrimitiveBoxPadding: {
    value: S.Literals(['responsive', 'none', 'sm', 'md', 'xl']),
  },
  ChangedPrimitiveBoxSurface: {
    value: S.Literals(['card', 'muted', 'section']),
  },
  ChangedPrimitiveGridColumns: {
    value: S.Literals(['one', 'two']),
  },
  ChangedPrimitiveInlineJustify: {
    value: S.Literals(['start', 'center', 'end', 'between']),
  },
  ChangedPrimitiveStackGap: {
    value: S.Literals(['responsive', 'sm', 'md', 'xl']),
  },
  ChangedPrimitiveTextVariant: {
    value: S.Literals(['inherit', 'caption', 'headingSm', 'headingMd']),
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

const COLOR_PICKER_TARGETS = [
  'accent',
  'surfaceLight',
  'surfaceDark',
  'chart',
] as const
type ColorPickerTarget = (typeof COLOR_PICKER_TARGETS)[number]

/* The derived color a pane picker edits, as the oklch literal it reflects. */
const pickerToken = (
  preset: Preset.Config,
  target: ColorPickerTarget,
): string =>
  target === 'accent'
    ? Preset.accentToken(preset)
    : target === 'surfaceLight'
      ? Preset.surfaceToken(preset, 'light')
      : target === 'surfaceDark'
        ? Preset.surfaceToken(preset, 'dark')
        : Preset.chartToken(preset)

const reflectColorPickers = (
  preset: Preset.Config,
  pickers: Model['colorPickers'],
  except?: ColorPickerTarget,
): Model['colorPickers'] => {
  const next = { ...pickers }
  for (const target of COLOR_PICKER_TARGETS) {
    if (target === except) continue
    const hex = Preset.tokenToHex(pickerToken(preset, target))
    if (Option.isSome(hex)) {
      next[target] = ColorPicker.reflectValue(next[target], hex.value)
    }
  }
  return next
}

const initColorPicker = (id: string, token: string): ColorPicker.Model =>
  Option.getOrElse(
    Option.map(Preset.tokenToHex(token), hex =>
      ColorPicker.reflectValue(ColorPicker.init({ id }), hex),
    ),
    () => ColorPicker.init({ id }),
  )

/* A picked color decomposes back into the parametric fields that derive it:
   accent → hue/chroma/lightness, a surface → its lightness + shared tint +
   nearest base hue, chart → nearest named family. */
const applyPickedColor = (
  preset: Preset.Config,
  target: ColorPickerTarget,
  l: number,
  c: number,
  h: number,
): Preset.Config => {
  const fitAt = (knob: Preset.Knob, value: number): number =>
    Preset.fit(Preset.rangeOf(knob), value)
  switch (target) {
    case 'accent':
      return {
        ...preset,
        hue: fitAt('hue', h),
        chroma: fitAt('chroma', c),
        lightness: fitAt('lightness', l * 100),
      }
    case 'surfaceLight':
      return {
        ...preset,
        surfaceLightness: fitAt('surfaceLightness', l * 100),
        surfaceSaturation: fitAt('surfaceSaturation', c),
        base: Preset.snapBase(h, c),
      }
    case 'surfaceDark':
      return {
        ...preset,
        surfaceLightnessDark: fitAt('surfaceLightnessDark', l * 100),
        surfaceSaturation: fitAt('surfaceSaturation', c),
        base: Preset.snapBase(h, c),
      }
    case 'chart':
      return { ...preset, chartColor: Preset.snapChartColor(h, c) }
  }
}

export const init = (): Model => ({
  accountAccess: AccountAccess.init(),
  faq: Faq.init(),
  kitchenIsland: KitchenIsland.init(),
  newMilestone: NewMilestone.init(),
  notificationSettings: NotificationSettings.init(),
  payments: Payments.init(),
  payoutThreshold: PayoutThreshold.init(),
  preferences: Preferences.init(),
  receivingMethod: ReceivingMethod.init(),
  recentTransactions: RecentTransactions.init(),
  releaseCatalog: ReleaseCatalog.init(),
  rollerShades: RollerShades.init(),
  savingsTargets: SavingsTargets.init(),
  socialLinks: SocialLinks.init(),
  stockPerformance: StockPerformance.init(),
  transferFunds: TransferFunds.init(),
  upcomingPayments: UpcomingPayments.init(),
  preset: Preset.DEFAULT_CONFIG,
  presetInput: Preset.encodePreset(Preset.DEFAULT_CONFIG),
  presetError: null,
  isPresetCopied: false,
  section: 'tokens',
  scheme: 'system',
  tokenScheme: 'light',
  openToken: null,
  tokenDrafts: {},
  tokenPicker: ColorPicker.init({ id: 'create-token-picker' }),
  colorPickers: {
    accent: initColorPicker(
      'create-accent-picker',
      Preset.accentToken(Preset.DEFAULT_CONFIG),
    ),
    surfaceLight: initColorPicker(
      'create-surface-light-picker',
      Preset.surfaceToken(Preset.DEFAULT_CONFIG, 'light'),
    ),
    surfaceDark: initColorPicker(
      'create-surface-dark-picker',
      Preset.surfaceToken(Preset.DEFAULT_CONFIG, 'dark'),
    ),
    chart: initColorPicker(
      'create-chart-picker',
      Preset.chartToken(Preset.DEFAULT_CONFIG),
    ),
  },
  canvas: 'board',
  primitiveInspector: {
    boxPadding: 'responsive',
    boxSurface: 'muted',
    gridColumns: 'two',
    inlineJustify: 'center',
    stackGap: 'responsive',
    textVariant: 'inherit',
  },
  pickerPopovers: {
    style: Popover.init({ id: 'create-style-picker', isAnimated: true }),
    base: Popover.init({
      id: 'create-base-picker',
      isAnimated: true,
    }),
    chartColor: Popover.init({
      id: 'create-chart-color-picker',
      isAnimated: true,
    }),
    iconLibrary: Popover.init({
      id: 'create-icon-library-picker',
      isAnimated: true,
    }),
    font: Popover.init({ id: 'create-font-picker', isAnimated: true }),
    fontHeading: Popover.init({
      id: 'create-heading-picker',
      isAnimated: true,
    }),
    menuAccent: Popover.init({
      id: 'create-menu-accent-picker',
      isAnimated: true,
    }),
    menuColor: Popover.init({
      id: 'create-menu-color-picker',
      isAnimated: true,
    }),
  },
})

const CopyPreset = Command.define('CopyCreatePreset', {
  args: { code: S.String },
  messages: [Message.CompletedCopyCreatePreset],
  execute: ({ code }) =>
    Effect.promise(() => navigator.clipboard.writeText(code)).pipe(
      Effect.as(Message.CompletedCopyCreatePreset()),
    ),
})
const WaitBeforeClearingPresetCopy = Command.define(
  'WaitBeforeClearingCreatePresetCopy',
  {
    messages: [Message.CompletedWaitBeforeClearingCreatePresetCopy],
    execute: Effect.sleep('1800 millis').pipe(
      Effect.as(Message.CompletedWaitBeforeClearingCreatePresetCopy()),
    ),
  },
)

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ChangedPrimitiveBoxPadding: ({ value }) => ({
        model: modifyFields(model, {
          primitiveInspector: current => ({ ...current, boxPadding: value }),
        }),
      }),
      ChangedPrimitiveBoxSurface: ({ value }) => ({
        model: modifyFields(model, {
          primitiveInspector: current => ({ ...current, boxSurface: value }),
        }),
      }),
      ChangedPrimitiveGridColumns: ({ value }) => ({
        model: modifyFields(model, {
          primitiveInspector: current => ({ ...current, gridColumns: value }),
        }),
      }),
      ChangedPrimitiveInlineJustify: ({ value }) => ({
        model: modifyFields(model, {
          primitiveInspector: current => ({ ...current, inlineJustify: value }),
        }),
      }),
      ChangedPrimitiveStackGap: ({ value }) => ({
        model: modifyFields(model, {
          primitiveInspector: current => ({ ...current, stackGap: value }),
        }),
      }),
      ChangedPrimitiveTextVariant: ({ value }) => ({
        model: modifyFields(model, {
          primitiveInspector: current => ({ ...current, textVariant: value }),
        }),
      }),
      ChangedCreatePresetInput: ({ value }) => ({
        model: modifyFields(model, {
          presetInput: () => value,
          presetError: () => null,
        }),
      }),
      AppliedCreatePresetInput: () => {
        const preset = Preset.parsePresetInput(model.presetInput)
        return Option.match(preset, {
          onNone: () => ({
            model: modifyFields(model, {
              presetError: () =>
                'Enter a valid CreaseUI preset code, URL, or --preset flag.',
            }),
          }),
          onSome: decoded => ({
            model: modifyFields(model, {
              preset: () => decoded,
              presetInput: () => Preset.encodePreset(decoded),
              presetError: () => null,
              colorPickers: pickers => reflectColorPickers(decoded, pickers),
            }),
          }),
        })
      },
      ChangedCreatePresetField: ({ field, value }) => {
        const preset = { ...model.preset, [field]: value }
        const { model: picker, commands: pickerCommands__ } = Popover.close(
          model.pickerPopovers[field],
        )
        const commands = pickerCommands__ ?? []
        return {
          model: modifyFields(model, {
            preset: () => preset,
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
            pickerPopovers: current => ({ ...current, [field]: picker }),
            colorPickers: pickers => reflectColorPickers(preset, pickers),
          }),
          commands: Command.mapMessages(commands, next =>
            Message['GotCreatePresetPickerMessage']({ field, message: next }),
          ),
        }
      },
      ClickedCopyCreatePreset: () => ({
        model: model,
        commands: [
          CopyPreset({ code: Preset.presetRegistryJson(model.preset) }),
        ],
      }),
      ChangedCreatePresetOption: ({ field, value }) => {
        const preset = { ...model.preset, [field]: value }
        return {
          model: modifyFields(model, {
            preset: () => preset,
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
            colorPickers: pickers => reflectColorPickers(preset, pickers),
          }),
        }
      },
      ChoseCreateTheme: ({ name }) => {
        const preset = Preset.presets.find(each => each.name === name)
        if (preset === undefined) return { model: model }
        return {
          model: modifyFields(model, {
            preset: () => preset.config,
            presetInput: () => Preset.encodePreset(preset.config),
            presetError: () => null,
            scheme: () => preset.scheme ?? 'system',
            colorPickers: pickers =>
              reflectColorPickers(preset.config, pickers),
          }),
        }
      },
      ChoseCreateSection: ({ section }) => ({
        model: modifyFields(model, {
          section: () => section,
        }),
      }),
      ChoseCreateScheme: ({ scheme }) => ({
        model: modifyFields(model, {
          scheme: () => scheme,
        }),
      }),
      ChoseCreateTokenScheme: ({ scheme }) => ({
        model: modifyFields(model, {
          tokenScheme: () => scheme,
          openToken: () => null,
        }),
      }),
      ToggledCreateToken: ({ token }) => {
        const opening = model.openToken !== token
        const name = token.startsWith('dark:') ? token.slice(5) : token
        const hex = opening
          ? Option.flatMap(
              Option.fromNullishOr(
                Preset.presetTokens(model.preset, model.tokenScheme)[name],
              ),
              Preset.tokenToHex,
            )
          : Option.none<string>()
        return {
          model: modifyFields(model, {
            openToken: () => (opening ? token : null),
            tokenDrafts: drafts => {
              const { [token]: _dropped, ...rest } = drafts
              return rest
            },
            tokenPicker: picker =>
              Option.isSome(hex)
                ? ColorPicker.reflectValue(picker, hex.value)
                : picker,
          }),
        }
      },
      ChangedCreateToken: ({ token, value }) => {
        /* Drafts hold the raw text so the input never reverts mid-typing;
           overrides only take complete normalized values — a fragment like
           '#f0' would otherwise land in the emitted CSS as invalid. */
        const overrides = { ...model.preset.overrides }
        const normalized = Option.getOrElse(
          Preset.hexToToken(value.trim()),
          () => value.trim(),
        )
        if (Preset.validTokenValue(normalized)) overrides[token] = normalized
        else delete overrides[token]
        const preset = { ...model.preset, overrides }
        return {
          model: modifyFields(model, {
            preset: () => preset,
            tokenDrafts: drafts => ({ ...drafts, [token]: value }),
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
          }),
        }
      },
      GotCreateTokenPickerMessage: ({ message: pickerMessage }) => {
        /* Picker emits the selected color in its display format; normalize any
           parseable color through oklch so overrides stay on the preset's
           canonical token shape regardless of the format select. The target
           token is the currently open row — the picker only renders there. */
        const next = ColorPicker.update(model.tokenPicker, pickerMessage)
        const normalized =
          model.openToken === null
            ? undefined
            : Option.getOrElse(
                Option.flatMap(Option.fromNullishOr(next.outMessage), change =>
                  Option.flatMap(
                    ColorPicker.parseColorString(change.value),
                    rgb => Preset.hexToToken(ColorPicker.rgbToHex(rgb)),
                  ),
                ),
                () => undefined,
              )
        const preset =
          model.openToken !== null &&
          normalized !== undefined &&
          Preset.validTokenValue(normalized)
            ? {
                ...model.preset,
                overrides: {
                  ...model.preset.overrides,
                  [model.openToken]: normalized,
                },
              }
            : model.preset
        return {
          model: modifyFields(model, {
            tokenPicker: () => next.model,
            preset: () => preset,
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
          }),
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotCreateTokenPickerMessage({ message: child }),
          ),
        }
      },
      GotCreateColorPickerMessage: ({ target, message: pickerMessage }) => {
        /* The pane's pickers decompose a picked color back into the
           parametric fields that derive it (hue/chroma/lightness for accent,
           lightness + tint + base for surfaces, nearest family for chart).
           The dragged picker keeps its own color so mid-drag feedback is
           smooth; the rest reflect the resulting preset. */
        const next = ColorPicker.update(
          model.colorPickers[target],
          pickerMessage,
        )
        const picked = Option.flatMap(
          Option.fromNullishOr(next.outMessage),
          change =>
            Option.flatMap(ColorPicker.parseColorString(change.value), rgb =>
              Preset.hexToToken(ColorPicker.rgbToHex(rgb)),
            ),
        )
        const preset = Option.getOrElse(
          Option.map(Option.flatMap(picked, Preset.tokenOklch), ([l, c, h]) =>
            applyPickedColor(model.preset, target, l, c, h),
          ),
          () => model.preset,
        )
        const pickers = reflectColorPickers(
          preset,
          { ...model.colorPickers, [target]: next.model },
          target,
        )
        return {
          model: modifyFields(model, {
            colorPickers: () => pickers,
            preset: () => preset,
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
          }),
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotCreateColorPickerMessage({ target, message: child }),
          ),
        }
      },
      ClickedResetCreateTokens: () => {
        const preset = { ...model.preset, overrides: {} }
        return {
          model: modifyFields(model, {
            preset: () => preset,
            tokenDrafts: () => ({}),
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
            openToken: () => null,
          }),
        }
      },
      ChoseCreateCanvas: ({ canvas }) => ({
        model: modifyFields(model, {
          canvas: () => canvas,
        }),
      }),
      ClickedResetCreatePreset: () => ({
        model: modifyFields(model, {
          preset: () => Preset.DEFAULT_CONFIG,
          presetInput: () => Preset.encodePreset(Preset.DEFAULT_CONFIG),
          presetError: () => null,
          colorPickers: pickers =>
            reflectColorPickers(Preset.DEFAULT_CONFIG, pickers),
        }),
      }),
      ClickedShuffleCreatePreset: () => {
        const preset = Preset.shufflePreset()
        return {
          model: modifyFields(model, {
            preset: () => preset,
            presetInput: () => Preset.encodePreset(preset),
            presetError: () => null,
            colorPickers: pickers => reflectColorPickers(preset, pickers),
          }),
        }
      },
      CompletedCopyCreatePreset: () => ({
        model: modifyFields(model, { isPresetCopied: () => true }),
        commands: [WaitBeforeClearingPresetCopy()],
      }),
      CompletedWaitBeforeClearingCreatePresetCopy: () => ({
        model: modifyFields(model, { isPresetCopied: () => false }),
      }),
      GotCreatePresetPickerMessage: ({ field, message: childMessage }) => {
        const { model: picker, commands: pickerCommands__ } = Popover.update(
          model.pickerPopovers[field],
          childMessage,
        )
        const commands = pickerCommands__ ?? []
        return {
          model: modifyFields(model, {
            pickerPopovers: current => ({ ...current, [field]: picker }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message['GotCreatePresetPickerMessage']({ field, message: next }),
          ),
        }
      },
      GotAccountAccessMessage: ({ message: childMessage }) => {
        const { model: accountAccess, commands: accountAccessCommands__ } =
          AccountAccess.update(model.accountAccess, childMessage)
        const commands = accountAccessCommands__ ?? []
        return {
          model: modifyFields(model, { accountAccess: () => accountAccess }),
          commands: Command.mapMessages(commands, next =>
            Message['GotAccountAccessMessage']({ message: next }),
          ),
        }
      },
      GotFaqMessage: ({ message: childMessage }) => {
        const { model: faq, commands: faqCommands__ } = Faq.update(
          model.faq,
          childMessage,
        )
        const commands = faqCommands__ ?? []
        return {
          model: modifyFields(model, { faq: () => faq }),
          commands: Command.mapMessages(commands, next =>
            Message.GotFaqMessage({ message: next }),
          ),
        }
      },
      GotKitchenIslandMessage: ({ message: childMessage }) => {
        const { model: kitchenIsland, commands: kitchenIslandCommands__ } =
          KitchenIsland.update(model.kitchenIsland, childMessage)
        const commands = kitchenIslandCommands__ ?? []
        return {
          model: modifyFields(model, { kitchenIsland: () => kitchenIsland }),
          commands: Command.mapMessages(commands, next =>
            Message.GotKitchenIslandMessage({ message: next }),
          ),
        }
      },
      GotNewMilestoneMessage: ({ message: childMessage }) => {
        const { model: newMilestone, commands: newMilestoneCommands__ } =
          NewMilestone.update(model.newMilestone, childMessage)
        const commands = newMilestoneCommands__ ?? []
        return {
          model: modifyFields(model, { newMilestone: () => newMilestone }),
          commands: Command.mapMessages(commands, next =>
            Message.GotNewMilestoneMessage({ message: next }),
          ),
        }
      },
      GotNotificationSettingsMessage: ({ message: childMessage }) => {
        const {
          model: notificationSettings,
          commands: notificationSettingsCommands__,
        } = NotificationSettings.update(
          model.notificationSettings,
          childMessage,
        )
        const commands = notificationSettingsCommands__ ?? []
        return {
          model: modifyFields(model, {
            notificationSettings: () => notificationSettings,
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotNotificationSettingsMessage({ message: next }),
          ),
        }
      },
      GotPaymentsMessage: ({ message: childMessage }) => {
        const { model: payments, commands: paymentsCommands__ } =
          Payments.update(model.payments, childMessage)
        const commands = paymentsCommands__ ?? []
        return {
          model: modifyFields(model, { payments: () => payments }),
          commands: Command.mapMessages(commands, next =>
            Message.GotPaymentsMessage({ message: next }),
          ),
        }
      },
      GotPayoutThresholdMessage: ({ message: childMessage }) => {
        const { model: payoutThreshold, commands: payoutThresholdCommands__ } =
          PayoutThreshold.update(model.payoutThreshold, childMessage)
        const commands = payoutThresholdCommands__ ?? []
        return {
          model: modifyFields(model, {
            payoutThreshold: () => payoutThreshold,
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotPayoutThresholdMessage({ message: next }),
          ),
        }
      },
      GotPreferencesMessage: ({ message: childMessage }) => {
        const { model: preferences, commands: preferencesCommands__ } =
          Preferences.update(model.preferences, childMessage)
        const commands = preferencesCommands__ ?? []
        return {
          model: modifyFields(model, { preferences: () => preferences }),
          commands: Command.mapMessages(commands, next =>
            Message.GotPreferencesMessage({ message: next }),
          ),
        }
      },
      GotReceivingMethodMessage: ({ message: childMessage }) => {
        const { model: receivingMethod, commands: receivingMethodCommands__ } =
          ReceivingMethod.update(model.receivingMethod, childMessage)
        const commands = receivingMethodCommands__ ?? []
        return {
          model: modifyFields(model, {
            receivingMethod: () => receivingMethod,
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotReceivingMethodMessage({ message: next }),
          ),
        }
      },
      GotRecentTransactionsMessage: ({ message: childMessage }) => {
        const {
          model: recentTransactions,
          commands: recentTransactionsCommands__,
        } = RecentTransactions.update(model.recentTransactions, childMessage)
        const commands = recentTransactionsCommands__ ?? []
        return {
          model: modifyFields(model, {
            recentTransactions: () => recentTransactions,
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotRecentTransactionsMessage({ message: next }),
          ),
        }
      },
      GotReleaseCatalogMessage: ({ message: childMessage }) => {
        const { model: releaseCatalog, commands: releaseCatalogCommands__ } =
          ReleaseCatalog.update(model.releaseCatalog, childMessage)
        const commands = releaseCatalogCommands__ ?? []
        return {
          model: modifyFields(model, { releaseCatalog: () => releaseCatalog }),
          commands: Command.mapMessages(commands, next =>
            Message.GotReleaseCatalogMessage({ message: next }),
          ),
        }
      },
      GotRollerShadesMessage: ({ message: childMessage }) => {
        const { model: rollerShades, commands: rollerShadesCommands__ } =
          RollerShades.update(model.rollerShades, childMessage)
        const commands = rollerShadesCommands__ ?? []
        return {
          model: modifyFields(model, { rollerShades: () => rollerShades }),
          commands: Command.mapMessages(commands, next =>
            Message.GotRollerShadesMessage({ message: next }),
          ),
        }
      },
      GotSavingsTargetsMessage: ({ message: childMessage }) => {
        const { model: savingsTargets, commands: savingsTargetsCommands__ } =
          SavingsTargets.update(model.savingsTargets, childMessage)
        const commands = savingsTargetsCommands__ ?? []
        return {
          model: modifyFields(model, { savingsTargets: () => savingsTargets }),
          commands: Command.mapMessages(commands, next =>
            Message.GotSavingsTargetsMessage({ message: next }),
          ),
        }
      },
      GotSocialLinksMessage: ({ message: childMessage }) => {
        const { model: socialLinks, commands: socialLinksCommands__ } =
          SocialLinks.update(model.socialLinks, childMessage)
        const commands = socialLinksCommands__ ?? []
        return {
          model: modifyFields(model, { socialLinks: () => socialLinks }),
          commands: Command.mapMessages(commands, next =>
            Message.GotSocialLinksMessage({ message: next }),
          ),
        }
      },
      GotStockPerformanceMessage: ({ message: childMessage }) => {
        const {
          model: stockPerformance,
          commands: stockPerformanceCommands__,
        } = StockPerformance.update(model.stockPerformance, childMessage)
        const commands = stockPerformanceCommands__ ?? []
        return {
          model: modifyFields(model, {
            stockPerformance: () => stockPerformance,
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotStockPerformanceMessage({ message: next }),
          ),
        }
      },
      GotTransferFundsMessage: ({ message: childMessage }) => {
        const { model: transferFunds, commands: transferFundsCommands__ } =
          TransferFunds.update(model.transferFunds, childMessage)
        const commands = transferFundsCommands__ ?? []
        return {
          model: modifyFields(model, { transferFunds: () => transferFunds }),
          commands: Command.mapMessages(commands, next =>
            Message.GotTransferFundsMessage({ message: next }),
          ),
        }
      },
      GotUpcomingPaymentsMessage: ({ message: childMessage }) => {
        const {
          model: upcomingPayments,
          commands: upcomingPaymentsCommands__,
        } = UpcomingPayments.update(model.upcomingPayments, childMessage)
        const commands = upcomingPaymentsCommands__ ?? []
        return {
          model: modifyFields(model, {
            upcomingPayments: () => upcomingPayments,
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotUpcomingPaymentsMessage({ message: next }),
          ),
        }
      },
    }),
  )

const accountAccessView = defineView<
  AccountAccess.Model,
  AccountAccess.Message
>(AccountAccess.view)
const faqView = defineView<Faq.Model, Faq.Message>(Faq.view)
const kitchenIslandView = defineView<
  KitchenIsland.Model,
  KitchenIsland.Message
>(KitchenIsland.view)
const newMilestoneView = defineView<NewMilestone.Model, NewMilestone.Message>(
  NewMilestone.view,
)
const notificationSettingsView = defineView<
  NotificationSettings.Model,
  NotificationSettings.Message
>(NotificationSettings.view)
const paymentsView = defineView<Payments.Model, Payments.Message>(Payments.view)
const payoutThresholdView = defineView<
  PayoutThreshold.Model,
  PayoutThreshold.Message
>(PayoutThreshold.view)
const preferencesView = defineView<Preferences.Model, Preferences.Message>(
  Preferences.view,
)
const receivingMethodView = defineView<
  ReceivingMethod.Model,
  ReceivingMethod.Message
>(ReceivingMethod.view)
const recentTransactionsView = defineView<
  RecentTransactions.Model,
  RecentTransactions.Message
>(RecentTransactions.view)
const releaseCatalogView = defineView<
  ReleaseCatalog.Model,
  ReleaseCatalog.Message
>(ReleaseCatalog.view)
const rollerShadesView = defineView<RollerShades.Model, RollerShades.Message>(
  RollerShades.view,
)
const savingsTargetsView = defineView<
  SavingsTargets.Model,
  SavingsTargets.Message
>(SavingsTargets.view)
const socialLinksView = defineView<SocialLinks.Model, SocialLinks.Message>(
  SocialLinks.view,
)
const stockPerformanceView = defineView<
  StockPerformance.Model,
  StockPerformance.Message
>(StockPerformance.view)
const transferFundsView = defineView<
  TransferFunds.Model,
  TransferFunds.Message
>(TransferFunds.view)
const upcomingPaymentsView = defineView<
  UpcomingPayments.Model,
  UpcomingPayments.Message
>(UpcomingPayments.view)

const titleCase = (value: string): string =>
  value
    .split('-')
    .map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')

export const presetCustomizer = (
  model: Model,
  h: HtmlBuilder<Message>,
  inspector: Html | null = null,
  placement: 'page' | 'drawer' = 'page',
): Html => {
  const picker = (
    label: string,
    field: Preset.Field,
    values: readonly string[],
    marker?: Style.Style,
  ): Html =>
    Popover.popover<Message>(
      {
        model: model.pickerPopovers[field],
        toParentMessage: message =>
          Message['GotCreatePresetPickerMessage']({ field, message }),
        side: 'right',
        align: 'start',
        portal: 'themed',
        surface: 'bare',
        triggerLayoutStyle: styles.pickerTriggerLayout,
        trigger: h.div(
          [h.Class(className(styles.pickerTrigger))],
          [
            h.span([h.Class(className(styles.pickerLabel))], [label]),
            h.span(
              [h.Class(className(styles.pickerValue))],
              [titleCase(model.preset[field])],
            ),
            h.span(
              [h.Class(className(styles.pickerMarkerGroup))],
              [
                ...(marker === undefined
                  ? []
                  : [
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.Class(className(styles.marker, marker)),
                        ],
                        [],
                      ),
                    ]),
                Icon.chevronRight({ class: className(styles.iconRight) }, h),
              ],
            ),
          ],
        ),
        layoutStyle: styles.popoverSize,
        content: h.div(
          [h.Class(className(styles.pickerContent))],
          [
            ScrollArea.scrollArea<Message>(
              {
                layoutStyle: styles.scrollChoices,
                children: values.map(value => {
                  const isSelected = model.preset[field] === value
                  return h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        Message['ChangedCreatePresetField']({ field, value }),
                      ),
                      h.Class(
                        className(
                          reset.button,
                          styles.choice,
                          isSelected && styles.choiceSelected,
                        ),
                      ),
                    ],
                    [
                      h.span(
                        [h.Class(className(styles.pickerChoiceLabel))],
                        [titleCase(value)],
                      ),
                      ...(isSelected
                        ? [
                            Icon.check(
                              { class: className(styles.iconCheck) },
                              h,
                            ),
                          ]
                        : []),
                    ],
                  )
                }),
              },
              h,
            ),
          ],
        ),
      },
      h,
    )

  const pairs = (
    values: readonly string[],
  ): ReadonlyArray<readonly [string, string]> =>
    values.map(value => [value, titleCase(value)] as const)

  const seg = (
    label: string,
    options: ReadonlyArray<readonly [string, string]>,
    current: string,
    onPick: (value: string) => Message,
  ): Html =>
    h.div(
      [h.Class(className(styles.knobRow)), h.DataAttribute('seg', label)],
      [
        h.div([h.Class(className(styles.segLabel))], [label]),
        h.div(
          [h.Class(className(styles.segRow))],
          options.map(([value, optionLabel]) =>
            h.button(
              [
                h.Type('button'),
                h.OnClick(onPick(value)),
                h.Class(
                  className(
                    reset.button,
                    styles.segButton,
                    value === current && styles.segButtonActive,
                  ),
                ),
              ],
              [optionLabel],
            ),
          ),
        ),
      ],
    )

  const fieldSeg = (
    label: string,
    field: Preset.Field,
    values: readonly string[],
  ): Html =>
    seg(label, pairs(values), model.preset[field], value =>
      Message['ChangedCreatePresetField']({ field, value }),
    )

  const optionSeg = (
    label: string,
    field: Preset.OptionField,
    values: readonly string[],
  ): Html =>
    seg(label, pairs(values), model.preset[field], value =>
      Message['ChangedCreatePresetOption']({ field, value }),
    )

  /* A color choice in the Color pane: field-styled trigger (label + hex +
     swatch) opening the color-picker popover, mirroring the enum pickers. */
  const colorField = (
    label: string,
    target: ColorPickerTarget,
    token: string,
  ): Html =>
    ColorPicker.colorPicker<Message>(
      {
        model: model.colorPickers[target],
        toParentMessage: message =>
          Message.GotCreateColorPickerMessage({ target, message }),
        side: 'right',
        align: 'start',
        portal: 'themed',
        triggerLayoutStyle: styles.pickerTriggerLayout,
        trigger: h.div(
          [h.Class(className(styles.pickerTrigger))],
          [
            h.span([h.Class(className(styles.pickerLabel))], [label]),
            h.span(
              [h.Class(className(styles.pickerValue, styles.mono))],
              [Option.getOrElse(Preset.tokenToHex(token), () => token)],
            ),
            h.span(
              [
                h.AriaHidden(true),
                h.Class(className(styles.colorFieldSwatch)),
                h.Style({ background: token }),
              ],
              [],
            ),
          ],
        ),
      },
      h,
    )

  const tile = (preset: Preset.Preset): Html => {
    const config = preset.config
    const baseH = Preset.baseHue(config)
    return h.button(
      [
        h.Type('button'),
        h.OnClick(Message['ChoseCreateTheme']({ name: preset.name })),
        h.Title(preset.description),
        h.Class(
          className(
            reset.button,
            styles.tile,
            Preset.sameConfig(config, model.preset) && styles.tileActive,
          ),
        ),
      ],
      [
        h.span(
          [h.Class(className(styles.tileSwatches))],
          [
            h.span(
              [
                h.Class(className(styles.tileSwatch)),
                h.Style({
                  background: `oklch(${config.surfaceLightness}% ${config.surfaceSaturation} ${baseH})`,
                }),
              ],
              [],
            ),
            h.span(
              [
                h.Class(className(styles.tileSwatch)),
                h.Style({
                  background: `oklch(${config.lightness}% ${config.chroma} ${config.hue})`,
                }),
              ],
              [],
            ),
          ],
        ),
        h.span([h.Class(className(styles.tileName))], [preset.name]),
      ],
    )
  }

  const sectionTab = (section: Model['section'], label: string): Html =>
    h.button(
      [
        h.Type('button'),
        h.OnClick(Message['ChoseCreateSection']({ section })),
        h.Class(
          className(
            reset.button,
            styles.sectionTab,
            model.section === section && styles.sectionTabActive,
          ),
        ),
      ],
      [label],
    )

  const pane = (children: ReadonlyArray<Html>): Html =>
    h.div(
      [h.Class(className(styles.customizerBody, styles.group))],
      [...children],
    )

  /* tweakcn-style token editor: derived values plus per-scheme overrides. */
  const tokenGroups: ReadonlyArray<
    readonly [string, ReadonlyArray<Preset.OverridableToken>]
  > = [
    ['Primary', ['primary', 'primary-foreground']],
    ['Secondary', ['secondary', 'secondary-foreground']],
    ['Accent', ['accent', 'accent-foreground']],
    ['Base', ['background', 'foreground']],
    ['Card', ['card', 'card-foreground']],
    ['Popover', ['popover', 'popover-foreground']],
    ['Muted', ['muted', 'muted-foreground']],
    ['Destructive', ['destructive', 'destructive-foreground']],
    ['Border & Input', ['border', 'input', 'ring']],
    ['Chart', ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']],
    [
      'Sidebar',
      [
        'sidebar',
        'sidebar-foreground',
        'sidebar-primary',
        'sidebar-primary-foreground',
        'sidebar-accent',
        'sidebar-accent-foreground',
      ],
    ],
  ]
  const effectiveTokens = Preset.presetTokens(model.preset, model.tokenScheme)
  const customCount = Object.keys(model.preset.overrides).length

  const tokenEditor = (
    token: string,
    key: string,
    value: string,
    hex: Option.Option<string>,
  ): Html => {
    const setValue = (value: string): Message =>
      Message['ChangedCreateToken']({ token: key, value })
    const shown = model.tokenDrafts[key] ?? Option.getOrElse(hex, () => value)
    return h.div(
      [h.Class(className(styles.tokenEditor))],
      [
        h.div(
          [h.Class(className(styles.tokenEditorRow))],
          [
            h.input([
              h.Type('text'),
              h.Value(shown),
              h.AriaLabel(`${token} value`),
              h.Placeholder('#rrggbb or oklch(…)'),
              h.OnInput(setValue),
              h.Class(className(reset.input, styles.tokenTextInput)),
            ]),
            h.button(
              [
                h.Type('button'),
                h.AriaLabel(`Reset ${token}`),
                h.OnClick(setValue('')),
                h.Class(className(reset.button, styles.tokenResetButton)),
              ],
              ['Reset'],
            ),
          ],
        ),
        ...(Option.isSome(hex)
          ? [
              ColorPicker.colorPicker(
                {
                  model: model.tokenPicker,
                  toParentMessage: message =>
                    Message.GotCreateTokenPickerMessage({ message }),
                  inline: true,
                },
                h,
              ),
            ]
          : []),
        h.p([h.Class(className(reset.text, styles.tokenValue))], [value]),
      ],
    )
  }

  const tokenRow = (token: Preset.OverridableToken): Html => {
    const key = model.tokenScheme === 'dark' ? `dark:${token}` : token
    const value = effectiveTokens[token] ?? ''
    const overridden = key in model.preset.overrides
    const open = model.openToken === key
    const pair = token.endsWith('-foreground')
      ? token.slice(0, -'-foreground'.length)
      : null
    const ratio =
      pair === null
        ? Option.none<number>()
        : Preset.contrastRatio(value, effectiveTokens[pair] ?? '')
    return h.div(
      [h.DataAttribute('token', key)],
      [
        h.button(
          [
            h.Type('button'),
            h.Id(`create-token-${key.replaceAll(':', '-')}`),
            h.AriaExpanded(open),
            h.OnClick(Message['ToggledCreateToken']({ token: key })),
            h.Class(
              className(
                reset.button,
                styles.tokenRow,
                overridden && styles.tokenRowOverridden,
              ),
            ),
          ],
          [
            h.span(
              [
                h.Class(className(styles.tokenSwatch)),
                h.Style({ background: value }),
              ],
              [],
            ),
            h.span(
              [h.Class(className(styles.section))],
              [
                h.span([h.Class(className(styles.tokenName))], [token]),
                h.span([h.Class(className(styles.tokenValue))], [value]),
              ],
            ),
            ...Option.match(ratio, {
              onNone: () => [],
              onSome: each => [
                h.span(
                  [
                    h.Class(className(styles.tokenContrastBadge)),
                    h.Style({
                      backgroundColor:
                        each >= 4.5
                          ? 'rgb(52 199 89 / 0.2)'
                          : each >= 3
                            ? 'rgb(255 204 0 / 0.2)'
                            : 'rgb(255 69 58 / 0.2)',
                      color:
                        each >= 4.5
                          ? 'oklch(0.627 0.194 149.214)'
                          : each >= 3
                            ? 'rgb(255 214 10)'
                            : 'oklch(0.704 0.191 22.216)',
                    }),
                  ],
                  [each.toFixed(1)],
                ),
              ],
            }),
            ...(overridden
              ? [
                  h.span(
                    [h.Class(className(styles.tokenCustomBadge))],
                    ['custom'],
                  ),
                ]
              : []),
          ],
        ),
        ...(open
          ? [tokenEditor(token, key, value, Preset.tokenToHex(value))]
          : []),
      ],
    )
  }

  const tokenSchemeTab = (scheme: Model['tokenScheme'], label: string): Html =>
    h.button(
      [
        h.Type('button'),
        h.OnClick(Message['ChoseCreateTokenScheme']({ scheme })),
        h.Class(
          className(
            reset.button,
            styles.sectionTab,
            model.tokenScheme === scheme && styles.sectionTabActive,
          ),
        ),
      ],
      [label],
    )

  const panes: Record<Model['section'], Html> = {
    theme: pane([
      h.div([h.Class(className(styles.tileGrid))], Preset.presets.map(tile)),
      fieldSeg('Style', 'style', Preset.STYLES),
      fieldSeg('Icons', 'iconLibrary', Preset.ICON_LIBRARIES),
    ]),
    color: pane([
      colorField('Accent', 'accent', Preset.accentToken(model.preset)),
      colorField(
        'Surface — light',
        'surfaceLight',
        Preset.surfaceToken(model.preset, 'light'),
      ),
      colorField(
        'Surface — dark',
        'surfaceDark',
        Preset.surfaceToken(model.preset, 'dark'),
      ),
      picker('Base', 'base', Preset.BASES, styles.markerZinc),
      optionSeg('Hover', 'hover', Preset.HOVERS),
      colorField('Chart', 'chart', Preset.chartToken(model.preset)),
      fieldSeg('Menu accent', 'menuAccent', Preset.MENU_ACCENTS),
      fieldSeg('Menu color', 'menuColor', Preset.MENU_COLORS),
    ]),
    shape: pane([
      optionSeg('Controls', 'controlShape', Preset.CONTROL_SHAPES),
      optionSeg('Outlines', 'outlines', Preset.OUTLINES),
      optionSeg('Shadow style', 'shadowStyle', Preset.SHADOW_STYLES),
      optionSeg('Relief', 'relief', Preset.RELIEFS),
    ]),
    type: pane([
      picker('Font', 'font', Preset.FONTS),
      picker('Heading font', 'fontHeading', Preset.FONT_HEADINGS),
    ]),
    motion: pane([optionSeg('Easing', 'easing', Preset.EASINGS)]),
    tokens: pane([
      h.div(
        [h.Class(className(styles.tokenHeader))],
        [
          h.div(
            [h.Class(className(styles.sectionTabs))],
            [tokenSchemeTab('light', 'Light'), tokenSchemeTab('dark', 'Dark')],
          ),
          ...(customCount > 0
            ? [
                h.button(
                  [
                    h.Type('button'),
                    h.OnClick(Message['ClickedResetCreateTokens']()),
                    h.Class(className(reset.button, styles.tokenClearAll)),
                  ],
                  [`Clear ${customCount} custom`],
                ),
              ]
            : []),
        ],
      ),
      ...tokenGroups.map(([group, tokens]) =>
        h.div(
          [h.Class(className(styles.section))],
          [
            h.div([h.Class(className(styles.tokenGroupLabel))], [group]),
            ...tokens.map(tokenRow),
          ],
        ),
      ),
    ]),
  }

  return h.aside(
    [
      h.Class(
        className(
          placement === 'drawer' ? styles.customizerDrawer : styles.customizer,
        ),
      ),
      h.DataAttribute('theme-lab-customizer', placement),
    ],
    [
      h.div(
        [h.Class(className(styles.customizerHeader, styles.group))],
        [
          h.div(
            [h.Class(className(styles.customizerHeaderInner))],
            [
              h.h1([h.Class(className(reset.text, styles.title))], ['Theme']),
              Icon.icon('menu', { class: className(styles.iconMenu) }, h),
            ],
          ),
          h.div(
            [h.Class(className(styles.sectionTabsGrid))],
            [
              sectionTab('tokens', 'Tokens'),
              sectionTab('theme', 'Themes'),
              sectionTab('color', 'Color'),
              sectionTab('shape', 'Shape'),
              sectionTab('type', 'Type'),
              sectionTab('motion', 'Motion'),
            ],
          ),
        ],
      ),
      ScrollArea.scrollArea<Message>(
        {
          layoutStyle: styles.scrollArea,
          children: [
            h.div(
              [h.Class(className(styles.customizerBody))],
              [
                ...(inspector === null
                  ? []
                  : [
                      inspector,
                      h.div([h.Class(className(styles.divider))], []),
                    ]),
                panes[model.section],
              ],
            ),
          ],
        },
        h,
      ),
      h.div(
        [h.Class(className(styles.customizerFooter))],
        [
          h.div(
            [
              h.DataAttribute('crease-style', model.preset.style),
              h.DataAttribute('icon-library', model.preset.iconLibrary),
              h.Class(className(styles.panelCode)),
            ],
            [`--preset ${Preset.encodePreset(model.preset)}`],
          ),
          h.details(
            [h.Class(className(styles.details))],
            [
              h.summary(
                [h.Class(className(styles.presetButton))],
                ['Open Preset'],
              ),
              h.div(
                [h.Class(className(styles.detailsBody))],
                [
                  h.input([
                    h.Id('create-preset-input'),
                    h.AriaLabel('Open preset'),
                    h.Value(model.presetInput),
                    h.OnInput(value =>
                      Message['ChangedCreatePresetInput']({ value }),
                    ),
                    h.Placeholder('Paste code or CreaseUI URL'),
                    h.Class(className(reset.input, styles.fieldInput)),
                  ]),
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(Message['AppliedCreatePresetInput']()),
                      h.Class(className(reset.button, styles.applyButton)),
                    ],
                    ['Apply Preset'],
                  ),
                  ...(model.presetError === null
                    ? []
                    : [
                        h.p(
                          [h.Class(className(reset.text, styles.error))],
                          [model.presetError],
                        ),
                      ]),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Style({
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.5rem',
              }),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(Message['ClickedShuffleCreatePreset']()),
                  h.Class(className(reset.button, styles.applyButton)),
                ],
                ['Shuffle'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(Message['ClickedResetCreatePreset']()),
                  h.Class(className(reset.button, styles.applyButton)),
                ],
                ['Reset'],
              ),
            ],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message['ClickedCopyCreatePreset']()),
              h.Class(className(reset.button, styles.copyButton)),
            ],
            [
              Icon.icon(
                'copy',
                {
                  class: className(
                    styles.copyIcon,
                    model.isPresetCopied && styles.copyIconHidden,
                  ),
                },
                h,
              ),
              ...(model.isPresetCopied
                ? [
                    Icon.check(
                      {
                        class: className(styles.copiedIcon),
                      },
                      h,
                    ),
                    'Copied',
                  ]
                : ['Copy Registry JSON']),
            ],
          ),
        ],
      ),
    ],
  )
}

export type BoardSplit = Readonly<{
  composition: 'split'
  columns: readonly [ReadonlyArray<Html>, ReadonlyArray<Html>]
}>

export type BoardItem = Html | BoardSplit

export type BoardColumn = Readonly<{
  items: ReadonlyArray<BoardItem>
  span: 1 | 2
}>

export const isBoardSplit = (item: BoardItem): item is BoardSplit =>
  typeof item === 'object' &&
  item !== null &&
  'composition' in item &&
  item.composition === 'split'

export const boardColumns = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<BoardColumn> => [
  {
    span: 1,
    items: [
      ContributionHistory.view<Message>(h),
      EmptyDistributeTrack.view<Message>(h),
      QrConnect.view<Message>(h),
      DividendIncome.view<Message>(h),
      IndexInvesting.view<Message>(h),
      SyncingState.view<Message>(h),
    ],
  },
  {
    span: 1,
    items: [
      h.submodel({
        slotId: 'payout-threshold',
        model: model.payoutThreshold,
        view: payoutThresholdView,
        toParentMessage: message =>
          Message.GotPayoutThresholdMessage({ message }),
      }),
      ClaimableBalance.view<Message>(h),
      h.submodel({
        slotId: 'preferences',
        model: model.preferences,
        view: preferencesView,
        toParentMessage: message => Message.GotPreferencesMessage({ message }),
      }),
      SavingsProgress.view<Message>(h),
      h.submodel({
        slotId: 'kitchen-island',
        model: model.kitchenIsland,
        view: kitchenIslandView,
        toParentMessage: message =>
          Message.GotKitchenIslandMessage({ message }),
      }),
    ],
  },
  {
    span: 2,
    items: [
      h.submodel({
        slotId: 'savings-targets',
        model: model.savingsTargets,
        view: savingsTargetsView,
        toParentMessage: message =>
          Message.GotSavingsTargetsMessage({ message }),
      }),
      h.submodel({
        slotId: 'recent-transactions',
        model: model.recentTransactions,
        view: recentTransactionsView,
        toParentMessage: message =>
          Message.GotRecentTransactionsMessage({ message }),
      }),
      {
        composition: 'split',
        columns: [
          [
            SidebarNav.view<Message>(h),
            h.submodel({
              slotId: 'faq',
              model: model.faq,
              view: faqView,
              toParentMessage: message => Message.GotFaqMessage({ message }),
            }),
          ],
          [
            h.submodel({
              slotId: 'payments',
              model: model.payments,
              view: paymentsView,
              toParentMessage: message =>
                Message.GotPaymentsMessage({ message }),
            }),
            FrontDoor.view<Message>(h),
          ],
        ],
      },
      h.submodel({
        slotId: 'release-catalog',
        model: model.releaseCatalog,
        view: releaseCatalogView,
        toParentMessage: message =>
          Message.GotReleaseCatalogMessage({ message }),
      }),
    ],
  },
  {
    span: 1,
    items: [
      h.submodel({
        slotId: 'account-access',
        model: model.accountAccess,
        view: accountAccessView,
        toParentMessage: message =>
          Message.GotAccountAccessMessage({ message }),
      }),
      CardOverview.view<Message>(h),
      h.submodel({
        slotId: 'transfer-funds',
        model: model.transferFunds,
        view: transferFundsView,
        toParentMessage: message =>
          Message.GotTransferFundsMessage({ message }),
      }),
      CoverArt.view<Message>(h),
      LoadingCard.view<Message>(h),
    ],
  },
  {
    span: 1,
    items: [
      h.submodel({
        slotId: 'receiving-method',
        model: model.receivingMethod,
        view: receivingMethodView,
        toParentMessage: message =>
          Message.GotReceivingMethodMessage({ message }),
      }),
      PowerUsage.view<Message>(h),
      EmptyConnectBank.view<Message>(h),
      h.submodel({
        slotId: 'upcoming-payments',
        model: model.upcomingPayments,
        view: upcomingPaymentsView,
        toParentMessage: message =>
          Message.GotUpcomingPaymentsMessage({ message }),
      }),
      h.submodel({
        slotId: 'roller-shades',
        model: model.rollerShades,
        view: rollerShadesView,
        toParentMessage: message => Message.GotRollerShadesMessage({ message }),
      }),
    ],
  },
  {
    span: 1,
    items: [
      h.submodel({
        slotId: 'stock-performance',
        model: model.stockPerformance,
        view: stockPerformanceView,
        toParentMessage: message =>
          Message.GotStockPerformanceMessage({ message }),
      }),
      EmptyExploreCatalog.view<Message>(h),
      h.submodel({
        slotId: 'new-milestone',
        model: model.newMilestone,
        view: newMilestoneView,
        toParentMessage: message => Message.GotNewMilestoneMessage({ message }),
      }),
      h.submodel({
        slotId: 'social-links',
        model: model.socialLinks,
        view: socialLinksView,
        toParentMessage: message => Message.GotSocialLinksMessage({ message }),
      }),
      h.submodel({
        slotId: 'notification-settings',
        model: model.notificationSettings,
        view: notificationSettingsView,
        toParentMessage: message =>
          Message.GotNotificationSettingsMessage({ message }),
      }),
    ],
  },
]

export const presetThemeStyle = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.style(
    [],
    [
      `${Preset.presetCss(model.preset).replaceAll('.create-board-theme', '[data-crease-board-theme]')}${scopedPleatThemeCss()}`,
    ],
  )

/* The theme lab drawer embeds this panel on every page; /create keeps using
   the 'page' placement inside its own layout. */
export const createCustomizer = (
  model: Model,
  placement: 'page' | 'drawer',
  h: HtmlBuilder<Message>,
): Html => presetCustomizer(model, h, null, placement)

/* Site-wide variant of the preset CSS: emitted on :root/.dark so docs, blocks
   and every other page pick the theme up, plus the Pleat token aliases the
   components resolve against. Only rendered when the theme lab's apply switch
   is on. */
export const globalThemeStyle = <M>(model: Model, h: HtmlBuilder<M>): Html =>
  h.style(
    [],
    [
      `${Preset.presetInstallCss(model.preset)}${scopedPleatThemeCss().replaceAll('[data-crease-board-theme]', ':root')}`,
    ],
  )

export const boardSpriteDefinitions = (h: HtmlBuilder<Message>): Html =>
  PreviewIcon.spriteDefinitions(h)

const legacyBoardItem = (item: BoardItem, h: HtmlBuilder<Message>): Html =>
  isBoardSplit(item)
    ? h.div(
        [h.Class(className(styles.nestedGrid))],
        item.columns.map(column =>
          h.div([h.Class(className(styles.section, styles.boardGap))], column),
        ),
      )
    : item

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const schemeSuffix = model.scheme === 'system' ? '' : ` ${model.scheme}`
  const themeAttrs = (classNameValue: string) => [
    h.Class(classNameValue + schemeSuffix),
    h.DataAttribute('crease-board-theme', ''),
    h.DataAttribute('crease-style', model.preset.style),
    h.DataAttribute('icon-library', model.preset.iconLibrary),
    h.DataAttribute('slot', 'capture-target'),
  ]

  /* Columns are built once: each h.submodel call registers its slotId in
     this boundary, so building them per grid would duplicate the ids. */
  const columns = boardColumns(model, h)

  const boardGrid = (extra?: Style.Style): Html =>
    h.div(
      [
        ...themeAttrs(
          extra === undefined
            ? className(styles.board)
            : className(styles.board, extra),
        ),
      ],
      [
        boardSpriteDefinitions(h),
        ...columns.map(column =>
          h.div(
            [
              h.Class(
                className(
                  column.span === 2 ? styles.columnWide : styles.column,
                  styles.boardGap,
                ),
              ),
            ],
            column.items.map(item => legacyBoardItem(item, h)),
          ),
        ),
      ],
    )

  const typeCanvas = h.div(
    [...themeAttrs(className(styles.typeCanvas))],
    [
      h.div(
        [h.Class(className(styles.typeInner))],
        [
          h.div(
            [h.Class(className(styles.headingGroup))],
            [
              h.h1([h.Class(className(reset.text, styles.h1))], ['Heading 1']),
              h.h2([h.Class(className(reset.text, styles.h2))], ['Heading 2']),
              h.h3([h.Class(className(reset.text, styles.h3))], ['Heading 3']),
              h.h4([h.Class(className(reset.text, styles.h4))], ['Heading 4']),
            ],
          ),
          h.p(
            [h.Class(className(reset.text, styles.bodyP))],
            [
              'Body copy sits at the text scale — the quick brown fox jumps over the lazy dog, and every paragraph underneath follows the same leading.',
            ],
          ),
          h.p(
            [h.Class(className(reset.text, styles.mutedP))],
            [
              'Muted text for supporting details, captions and secondary descriptions.',
            ],
          ),
          h.blockquote(
            [h.Class(className(reset.text, styles.blockquote))],
            [
              '\u201cA quotation block, drawn with the theme\u2019s border and ink.\u201d',
            ],
          ),
          h.ul(
            [h.Class(className(reset.list, styles.listUl))],
            [
              h.li([], ['First list item']),
              h.li([], ['Second list item']),
              h.li([], ['Third list item']),
            ],
          ),
          h.p(
            [h.Class(className(reset.text))],
            [
              'Inline ',
              h.code([h.Class(className(styles.inlineCode))], ['code']),
              ' inside a paragraph.',
            ],
          ),
        ],
      ),
    ],
  )

  const SWATCHES: ReadonlyArray<readonly [string, string]> = [
    ['Background', '--background'],
    ['Foreground', '--foreground'],
    ['Card', '--card'],
    ['Popover', '--popover'],
    ['Primary', '--primary'],
    ['Primary fg', '--primary-foreground'],
    ['Secondary', '--secondary'],
    ['Secondary fg', '--secondary-foreground'],
    ['Muted', '--muted'],
    ['Muted fg', '--muted-foreground'],
    ['Accent', '--accent'],
    ['Accent fg', '--accent-foreground'],
    ['Border', '--border'],
    ['Input', '--input'],
    ['Ring', '--ring'],
    ['Chart 1', '--chart-1'],
    ['Chart 2', '--chart-2'],
    ['Chart 3', '--chart-3'],
    ['Chart 4', '--chart-4'],
    ['Chart 5', '--chart-5'],
    ['Sidebar', '--sidebar'],
    ['Sidebar fg', '--sidebar-foreground'],
    ['Sidebar accent', '--sidebar-accent'],
    ['Sidebar accent fg', '--sidebar-accent-foreground'],
  ]

  const paletteCanvas = h.div(
    [...themeAttrs(className(styles.paletteCanvas))],
    [
      h.div(
        [h.Class(className(styles.swatchGrid))],
        SWATCHES.map(([label, token]) =>
          h.div(
            [h.Class(className(styles.swatch))],
            [
              h.div(
                [
                  h.Class(className(styles.swatchColor)),
                  h.Style({ background: `var(${token})` }),
                ],
                [],
              ),
              h.div(
                [h.Class(className(styles.swatchMeta))],
                [
                  h.div(
                    [h.Class(className(reset.text, styles.swatchLabel))],
                    [label],
                  ),
                  h.div(
                    [h.Class(className(reset.text, styles.swatchVar))],
                    [`var(${token})`],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  )

  const blockFrame = (title: string, block: Html): Html =>
    h.div(
      [h.Class(className(styles.blockFrame))],
      [
        h.div(
          [h.Class(className(styles.blockFrameBar))],
          [
            h.span(
              [h.Class(className(reset.text, styles.blockFrameLabel))],
              [title],
            ),
          ],
        ),
        block,
      ],
    )

  /* Real blocks from the /blocks catalog, each framed so the canvas reads as
     distinct pieces rather than a squashed card grid. */
  const blocksCanvas = h.div(
    [...themeAttrs(className(styles.blocksCanvas))],
    [
      blockFrame('Kanban board', BlocksBlocks.kanbanBoard<Message>(h)),
      blockFrame(
        'Incident console',
        BlocksDashboards.incidentConsoleDashboard<Message>(h),
      ),
      blockFrame('Order detail', BlocksBlocks.orderDetail<Message>(h)),
    ],
  )

  const canvases: Record<Model['canvas'], Html> = {
    board: boardGrid(),
    blocks: blocksCanvas,
    type: typeCanvas,
    palette: paletteCanvas,
  }

  const toolbarSeg = <V extends string>(
    options: ReadonlyArray<readonly [V, string]>,
    current: V,
    onPick: (value: V) => Message,
  ): Html =>
    h.div(
      [h.Class(className(styles.sectionTabs))],
      options.map(([value, label]) =>
        h.button(
          [
            h.Type('button'),
            h.OnClick(onPick(value)),
            h.Class(
              className(
                reset.button,
                styles.sectionTab,
                value === current && styles.sectionTabActive,
              ),
            ),
          ],
          [label],
        ),
      ),
    )

  const toolbar = h.div(
    [h.Class(className(styles.toolbar))],
    [
      toolbarSeg(
        [
          ['board', 'Board'],
          ['blocks', 'Blocks'],
          ['type', 'Type'],
          ['palette', 'Palette'],
        ] as const,
        model.canvas,
        value => Message['ChoseCreateCanvas']({ canvas: value }),
      ),
      h.div([h.Class(className(styles.toolbarDivider))], []),
      toolbarSeg(
        [
          ['system', 'Auto'],
          ['light', 'Light'],
          ['dark', 'Dark'],
        ] as const,
        model.scheme,
        value => Message['ChoseCreateScheme']({ scheme: value }),
      ),
    ],
  )

  const preview = h.div(
    [h.Class(className(styles.preview))],
    [
      h.div(
        [h.Class(className(styles.previewCenter) + schemeSuffix)],
        [canvases[model.canvas]],
      ),
    ],
  )

  return h.main(
    [h.Class(className(styles.root))],
    [presetThemeStyle(model, h), toolbar, preview, presetCustomizer(model, h)],
  )
}

// SUBSCRIPTIONS — cards with sliders need document-level drag subscriptions.

export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift(KitchenIsland.subscriptions)<Model, Message>({
    toChildModel: model => model.kitchenIsland,
    toParentMessage: message => Message.GotKitchenIslandMessage({ message }),
  }),
  Subscription.lift(PayoutThreshold.subscriptions)<Model, Message>({
    toChildModel: model => model.payoutThreshold,
    toParentMessage: message => Message.GotPayoutThresholdMessage({ message }),
  }),
  Subscription.lift(RollerShades.subscriptions)<Model, Message>({
    toChildModel: model => model.rollerShades,
    toParentMessage: message => Message.GotRollerShadesMessage({ message }),
  }),
  ColorPicker.subscriptions<Model, Message>({
    id: 'create-token-picker',
    toChildModel: model => model.tokenPicker,
    toParentMessage: message =>
      Message.GotCreateTokenPickerMessage({ message }),
  }),
  ...COLOR_PICKER_TARGETS.map(target =>
    ColorPicker.subscriptions<Model, Message>({
      id: `create-${target === 'surfaceLight' ? 'surface-light' : target === 'surfaceDark' ? 'surface-dark' : target}-picker`,
      toChildModel: model => model.colorPickers[target],
      toParentMessage: message =>
        Message.GotCreateColorPickerMessage({ target, message }),
    }),
  ),
)
