import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import * as CalendarDate from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { data as docs } from '@/demo/blocks/sidebar-01'
import { data as docs05 } from '@/demo/blocks/sidebar-05'
import { data as app } from '@/demo/blocks/sidebar-07'
import { data as mail } from '@/demo/blocks/sidebar-09'
import { data as workspace } from '@/demo/blocks/sidebar-10'
import { data as files } from '@/demo/blocks/sidebar-11'
import { data as settings } from '@/demo/blocks/sidebar-13'
import { button } from '@/stylex/button'
import * as Calendar from '@/stylex/calendar'
import * as Dialog from '@/stylex/dialog'
import * as Popover from '@/stylex/popover'
import { collapsible } from '@/stylex/collapsible'
import { icon } from '@/stylex/composition/icon'
import {
  settingsLayout,
  blockCenter,
  blockHeader,
  blockLabel,
  blockPage,
  blockSkeleton,
  mailItem,
} from '@/stylex/composition/sidebar-block'
import * as Sidebar from '@/stylex/sidebar'
import { sidebarScope } from '../../stylex/sidebar.markers.stylex'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbList,
  breadcrumbPage,
  breadcrumbSeparator,
} from '@/stylex/breadcrumb'
import { separator } from '@/stylex/separator'
import * as stylex from '@stylexjs/stylex'
import * as BaseIcon from '@/lib/icon'
import { className } from '@/stylex/style'
import { complexTokens } from '../../stylex/complex-tokens.stylex'
import { foundationTokens } from '../../stylex/foundations-tokens.stylex'
import { interactionTokens } from '../../stylex/interaction-tokens.stylex.const'
import { tokens } from '../../stylex/tokens.stylex'
import * as Switch from '@/stylex/switch'
import * as DropdownMenu from '@/stylex/dropdown-menu'

/* Mirrors TW searchForm: form > sidebar-group(py-0) > group-content(relative)
   > sr-only label + sidebarInput(pl-8) + absolutely positioned search icon. */
const searchStyles = stylex.create({
  group: {
    paddingInline: '.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  },
  box: { position: 'relative', width: '100%' },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  input: { paddingInlineStart: '2rem' },
  /* TW-16 site-header search: 'w-full sm:ml-auto sm:w-auto' form with an
     'h-8 pl-7' input. */
  headerForm: {
    marginInlineStart: { default: '0', '@media (min-width: 640px)': 'auto' },
    width: { default: '100%', '@media (min-width: 640px)': 'auto' },
  },
  headerBox: {
    position: 'relative',
    width: { default: '100%', '@media (min-width: 640px)': 'auto' },
  },
  headerInput: { paddingInlineStart: '1.75rem', height: '2rem' },
  /* TW-08/16 navSecondary 'mt-auto' — pins the group to the sidebar bottom. */
  autoTop: { marginTop: 'auto' },
  /* TW-15 'mx-0' separator — kills its default horizontal margin. */
  separatorFlush: { marginInline: 0 },
  /* TW-06 newsletter card: card('gap-2 py-4 shadow-none') > header px-4
     (title text-sm + description) + content px-4 > grid gap-2.5 form. */
  optCard: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusXl,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '.5rem',
    paddingBlock: '1.25rem',
    backgroundColor: tokens.card,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '.875rem',
  },
  optHead: { gap: '.25rem', paddingInline: '1.25rem', display: 'grid' },
  optTitle: { fontSize: '.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  optDesc: {
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
  },
  optBody: {
    gap: '.75rem',
    paddingInline: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
  },
  optGrid: { gap: '.625rem', display: 'grid' },
  /* TW brand 'flex flex-col gap-0.5 leading-none' + font-medium title. */
  brandStack: {
    gap: '.125rem',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
  },
  brandTitle: { fontSize: '.875rem', fontWeight: 500, lineHeight: 1 },
  /* Workspace brand: TW 'grid flex-1 text-left text-sm leading-tight' +
     'truncate font-medium' title + 'truncate text-xs' detail. */
  brandGrid: {
    display: 'grid',
    flexGrow: 1,
    fontSize: '.875rem',
    lineHeight: 1.25,
    textAlign: 'left',
  },
  brandTitleTruncate: {
    overflow: 'hidden',
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  brandDetailPlain: {},
  brandDetailXs: {
    overflow: 'hidden',
    fontSize: '.75rem',
    lineHeight: '1rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /* TW-02 wraps its nav groups in 'gap-0' sidebarContent — clone the
     content chrome with zero gap (sidebarContent only takes layoutStyle). */
  contentFlat: {
    gap: 0,
    overflow: 'auto',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  /* TW-15 calendar groups sit in 'py-0' sidebarGroups; the calendar itself
     in a 'px-0' group. sidebarGroup only accepts layout styles, so these
     clone styles.group with the padding side zeroed. */
  groupFlatX: {
    padding: '0.5rem',
    paddingInline: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  },
  groupFlatY: {
    padding: '0.5rem',
    paddingBlock: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  },
  /* TW brand logo box 'flex aspect-square size-8 rounded-lg
     bg-sidebar-primary text-sidebar-primary-foreground'. */
  brandIconBox: {
    borderRadius: tokens.radius,
    alignItems: 'center',
    aspectRatio: '1 / 1',
    backgroundColor: complexTokens.sidebarPrimary,
    color: complexTokens.sidebarPrimaryForeground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '2rem',
  },
  icon: {
    flexShrink: 0,
    opacity: 0.5,
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateY(-50%)',
    userSelect: 'none',
    height: '1rem',
    left: '.5rem',
    top: '50%',
    width: '1rem',
  },
  /* TW trigger '-ml-1' / '-mr-1 ml-auto rotate-180' + separator 'mr-2 h-4'. */
  trigger: { marginInlineStart: '-.25rem' },
  trigger8: { height: '2rem', width: '2rem' },
  /* TW-16 siteHeader wrap + inner 'h-(--header-height)' row. */
  siteHeader16: {
    alignItems: 'center',
    backgroundColor: tokens.background,
    display: 'flex',
    flexShrink: 0,
    position: 'sticky',
    zIndex: 50,
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    top: 0,
    width: '100%',
  },
  siteHeader16Row: {
    gap: '.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    height: '3.5rem',
    width: '100%',
  },
  rightTrigger: { marginInlineEnd: '-.25rem', marginInlineStart: 'auto' },
  triggerIcon: { transform: 'rotate(180deg)' },
  headerSeparator: { marginInlineEnd: '.5rem', height: '1rem' },
  /* TW collapsible chevrons: 'ml-auto size-4 shrink-0 transition-transform
     rotate-90' (trailing) and 'size-4 shrink-0' (leading, file tree). */
  chevron: {
    flexShrink: 0,
    marginInlineStart: 'auto',
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'transform',
    height: '1rem',
    width: '1rem',
  },
  chevronLead: {
    flexShrink: 0,
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'transform',
    height: '1rem',
    width: '1rem',
  },
  chevronOpen: { transform: 'rotate(90deg)' },
  /* TW trigger wrapper 'contents' — StyleX needs an explicit display:contents. */
  contents: { display: 'contents' },
  endIcon: {
    flexShrink: 0,
    marginInlineStart: 'auto',
    height: '1rem',
    width: '1rem',
  },
  /* TW sidebar-06 dropdown trigger: sidebarMenuButtonVariants inside a
     shrink-wrap parent (content width); data-[open] keeps accent. */
  menuTrigger: {
    padding: '0.5rem',
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: 'fit-content',
  },
  fullWidth: { width: '100%' },
  /* TW-09 nested sidebars: flex-row wrapper inside the 350px icon sidebar —
     rail 'w-[calc(var(--sidebar-width-icon)+1px)] border-r' + 'flex-1' mail. */
  mailRow: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  mailRail: {
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    borderRightColor: tokens.border,
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    height: '100%',
    width: 'calc(var(--sidebar-width-icon) + 1px)',
  },
  mailColumn: {
    backgroundColor: complexTokens.sidebar,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    height: '100%',
    minWidth: 0,
    overflowY: 'auto',
  },
  /* TW-09 mail header 'gap-3.5 border-b p-4'. */
  mailHead: {
    padding: '1rem',
    gap: '.875rem',
    display: 'flex',
    flexDirection: 'column',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  mailTitleRow: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  mailTitle: {
    color: tokens.foreground,
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
  },
  mailSwitchRow: {
    gap: '.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
  },
  /* TW-09 mail rows are 'text-sm leading-tight' (14px / 17.5px). */
  mailNameRow: {
    gap: '.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '.875rem',
    lineHeight: 1.25,
    width: '100%',
  },
  mailDate: {
    fontSize: '.75rem',
    lineHeight: '1rem',
    marginInlineStart: 'auto',
  },
  mailSubject: {
    fontSize: '.875rem',
    fontWeight: 500,
    lineHeight: 1.25,
  },
  /* TW-09 'line-clamp-2 w-[260px] text-xs whitespace-break-spaces'. */
  mailTeaser: {
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    display: '-webkit-box',
    fontSize: '.75rem',
    lineHeight: '1rem',
    whiteSpace: 'pre-wrap',
    width: '260px',
  },
  /* TW-09 group 'px-0' — keeps block padding from base p-2. */
  mailGroup: {
    paddingBlock: '.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  },
  /* TW-09 inset header 'sticky top-0 flex shrink-0 items-center gap-2
     border-b bg-background p-4' — padding-sized, not h-16. */
  mailInsetHeader: {
    padding: '1rem',
    gap: '.5rem',
    alignItems: 'center',
    backgroundColor: tokens.background,
    display: 'flex',
    flexShrink: 0,
    position: 'sticky',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    top: 0,
  },
  /* TW navUser trigger: sidebarMenuButtonVariants({size:'lg', open accent}). */
  userTrigger: {
    padding: {
      default: '.5rem',
      /* TW 'md:p-0' on the rail footer's lg menu-button — the icon-
         collapsed rail renders a bare size-8 avatar button. */
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    borderRadius: tokens.controlRadius,
    gap: '.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': complexTokens.sidebarAccent,
      ':active': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: {
      default: '3rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
    /* TW keeps w-full when collapsed: 'md:h-8 md:p-0' only clips the
       height — the avatar sits left and the chevrons icon right. */
    width: '100%',
  },
  userTriggerOpen: {
    padding: {
      default: '.5rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: 0,
    },
    borderRadius: tokens.controlRadius,
    gap: '.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: complexTokens.sidebarAccent,
    color: complexTokens.sidebarAccentForeground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: {
      default: '3rem',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
    width: '100%',
  },
  /* TW avatar 'size-8 rounded-lg' + muted fallback. */
  userAvatar: {
    borderRadius: tokens.radius,
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    color: tokens.mutedForeground,
    display: 'flex',
    flexShrink: 0,
    fontSize: '.875rem',
    fontWeight: 400,
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  },
  /* TW 'grid flex-1 text-left text-sm leading-tight'. */
  userText: {
    display: 'grid',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    fontSize: '.875rem',
    lineHeight: 1.25,
    textAlign: 'left',
    minWidth: 0,
  },
  userName: {
    overflow: 'hidden',
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userEmail: {
    overflow: 'hidden',
    fontSize: '.75rem',
    lineHeight: '1rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevronTd: {
    flexShrink: 0,
    marginInlineStart: 'auto',
    height: '1rem',
    width: '1rem',
  },
  /* TW-12/15 right-sidebar user header 'h-16 border-b' (+ base header
     styles: flex-col gap-2 p-2 — rendered as plain slot div since
     borders aren't a ComponentLayoutStyle). */
  userHeader: {
    padding: '.5rem',
    gap: '.5rem',
    display: 'flex',
    flexDirection: 'column',
    borderBottomColor: complexTokens.sidebarBorder,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: '4rem',
  },
  /* TW team switcher trigger: sidebarMenuButtonVariants 'w-fit px-1.5'. */
  teamTrigger: {
    padding: '.5rem',
    borderRadius: tokens.controlRadius,
    gap: '.5rem',
    overflow: 'hidden',
    paddingInline: '.375rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: 'fit-content',
  },
  teamTriggerOpen: {
    padding: '.5rem',
    borderRadius: tokens.controlRadius,
    gap: '.5rem',
    overflow: 'hidden',
    paddingInline: '.375rem',
    alignItems: 'center',
    backgroundColor: complexTokens.sidebarAccent,
    color: complexTokens.sidebarAccentForeground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: 'fit-content',
  },
  /* TW 'size-5 rounded-md bg-sidebar-primary' logo box. */
  teamIconBox: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    aspectRatio: '1 / 1',
    backgroundColor: complexTokens.sidebarPrimary,
    color: complexTokens.sidebarPrimaryForeground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: '1.25rem',
  },
  iconXs: { flexShrink: 0, height: '.75rem', width: '.75rem' },
  teamName: {
    overflow: 'hidden',
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /* TW-10 dropdown team item 'size-6 rounded-xs border' icon box. */
  teamItemIcon: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusBase,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: tokens.background,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  },
  chevronSm: {
    flexShrink: 0,
    opacity: 0.5,
    height: '1rem',
    width: '1rem',
  },
  /* TW-10 header nav actions 'ml-auto px-3 flex items-center gap-2' —
     the -1rem end margin cancels the header's px-4 so only the px-3
     applies (TW's header carries no padding). */
  headerActions: {
    gap: '.5rem',
    paddingInline: '.75rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    marginInlineEnd: '-1rem',
    marginInlineStart: 'auto',
  },
  /* TW 'hidden font-medium text-muted-foreground md:inline-block'. */
  editDate: {
    color: tokens.mutedForeground,
    display: { default: 'none', '@media (min-width: 768px)': 'inline-block' },
    fontWeight: 500,
  },
  /* TW ghost icon button 'h-7 w-7'. */
  headerIconButton: {
    height: '1.75rem',
    width: '1.75rem',
  },
  /* TW ROW_ACTION_CLASS: absolute top-1.5 right-1 w-5 action, hidden until
     row hover/focus (SX menuActionHover: hover/focus-visible on itself). */
  rowAction: {
    padding: 0,
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: complexTokens.sidebarForeground,
    display: 'flex',
    justifyContent: 'center',
    opacity: {
      default: 0,
      ':focus-visible': 1,
      ':hover': 1,
    },
    outlineStyle: 'none',
    position: 'absolute',
    height: '1.25rem',
    right: '.25rem',
    top: '.375rem',
    width: '1.25rem',
  },
  /* TW 'text-sidebar-foreground/70' trailing More row — icon and label
     each render at 70% alpha of the foreground color (not element
     opacity, which blends the whole row as one layer). */
  dimmedButton: {
    color: {
      default: complexTokens.sidebarForegroundDim,
      ':hover': complexTokens.sidebarAccentForeground,
    },
  },
  /* TW-12/15 calendar checkbox 'size-4 rounded-sm border
     data-[active]:bg-primary data-[active]:border-primary'. */
  calBox: {
    borderColor: complexTokens.sidebarBorder,
    borderRadius: foundationTokens.radiusBase,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    aspectRatio: '1 / 1',
    color: complexTokens.sidebarPrimaryForeground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: '1rem',
  },
  calBoxActive: {
    borderColor: complexTokens.sidebarPrimary,
    borderRadius: foundationTokens.radiusBase,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    aspectRatio: '1 / 1',
    backgroundColor: complexTokens.sidebarPrimary,
    color: complexTokens.sidebarPrimaryForeground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: '1rem',
  },
  calCheck: { height: '.75rem', width: '.75rem' },
  /* TW-10 actions popover groups 'border-b last:border-none'. */
  actionGroup: {
    padding: '.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    minWidth: 0,
    width: '100%',
  },
  actionGroupLast: {
    borderBottomWidth: 0,
  },
  menuTriggerOpen: {
    padding: '0.5rem',
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: {
      default: complexTokens.sidebarAccent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: complexTokens.sidebarAccentForeground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: 'fit-content',
  },
})

export const Model = S.Struct({
  isOpen: S.Boolean,
  isMobileOpen: S.Boolean,
  active: S.String,
  query: S.String,
  unreadOnly: S.Boolean,
  expanded: S.Record(S.String, S.Boolean),
  calendar: Calendar.Model,
  selectedDate: S.Option(CalendarDate.CalendarDate),
  dialog: Dialog.Model,
  popover: Popover.Model,
  submenus: S.Array(DropdownMenu.Model),
  teamMenu: DropdownMenu.Model,
  userMenu: DropdownMenu.Model,
  activeTeamIndex: S.Number,
  favoriteMenus: S.Array(DropdownMenu.Model),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledStyleXSidebar: {},
  ToggledStyleXMobileSidebar: {},
  SelectedStyleXSidebarItem: { label: S.String },
  ChangedStyleXSidebarSearch: {
    value: S.String,
  },
  ToggledStyleXSidebarUnread: {
    isChecked: S.Boolean,
  },
  ChangedStyleXSidebarGroup: {
    id: S.String,
    isOpen: S.Boolean,
  },
  GotStyleXSidebarCalendar: {
    message: Calendar.Message,
  },
  GotStyleXSidebarDialog: {
    message: Dialog.Message,
  },
  OpenedStyleXSidebarDialog: {},
  GotStyleXSidebarPopover: {
    message: Popover.Message,
  },
  GotStyleXSidebarSubmenu: {
    index: S.Number,
    message: DropdownMenu.Message,
  },
  GotStyleXSidebarTeamMenu: {
    message: DropdownMenu.Message,
  },
  GotStyleXSidebarUserMenu: {
    message: DropdownMenu.Message,
  },
  GotStyleXSidebarFavoriteMenu: {
    index: S.Number,
    message: DropdownMenu.Message,
  },
})
export type Message = typeof Message.Type
export const init = (): Model => ({
  isOpen: true,
  isMobileOpen: false,
  active: 'Data Fetching',
  query: '',
  unreadOnly: false,
  expanded: {
    Playground: true,
    'Build Your Application': true,
    src: true,
    'src/ui': true,
  },
  calendar: Calendar.init({
    id: 'stylex-sidebar-calendar',
    today: { year: 2024, month: 10, day: 15 },
  }),
  selectedDate: Option.none(),
  dialog: Dialog.init({
    id: 'stylex-sidebar-settings',
    isAnimated: true,
  }),
  submenus: docs.navMain.map((_, index) =>
    DropdownMenu.init({ id: 'stylex-submenu-' + index }),
  ),
  popover: Popover.init({ id: 'stylex-sidebar-popover' }),
  teamMenu: DropdownMenu.init({ id: 'stylex-sidebar-team' }),
  userMenu: DropdownMenu.init({ id: 'stylex-sidebar-user' }),
  activeTeamIndex: 0,
  favoriteMenus: Array.from({ length: 16 }, (_, index) =>
    DropdownMenu.init({ id: 'stylex-favorite-' + index }),
  ),
})
type FavoriteAction = 'remove' | 'copy-link' | 'open-tab' | 'delete'
const FAVORITE_ACTIONS: ReadonlyArray<FavoriteAction> = [
  'remove',
  'copy-link',
  'open-tab',
  'delete',
]
const FavoriteMenu = DropdownMenu.create<FavoriteAction>()

type TeamItem = 'team-0' | 'team-1' | 'team-2' | 'add-team'
const TEAM_ITEMS: ReadonlyArray<TeamItem> = [
  'team-0',
  'team-1',
  'team-2',
  'add-team',
]
type UserItem = 'upgrade' | 'account' | 'billing' | 'notifications' | 'log-out'
const USER_ITEMS: ReadonlyArray<UserItem> = [
  'upgrade',
  'account',
  'billing',
  'notifications',
  'log-out',
]
const TeamMenu = DropdownMenu.create<TeamItem>()
const UserMenu = DropdownMenu.create<UserItem>()

type UpdateReturn = Update.Return<Model, Message>
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ToggledStyleXSidebar: () => ({
        model: { ...model, isOpen: !model.isOpen },
      }),
      ToggledStyleXMobileSidebar: () => ({
        model: { ...model, isMobileOpen: !model.isMobileOpen },
      }),
      SelectedStyleXSidebarItem: ({ label }) => ({
        model: { ...model, active: label },
      }),
      ChangedStyleXSidebarSearch: ({ value }) => ({
        model: { ...model, query: value },
      }),
      ToggledStyleXSidebarUnread: ({ isChecked }) => ({
        model: { ...model, unreadOnly: isChecked },
      }),
      ChangedStyleXSidebarGroup: ({ id, isOpen }) => ({
        model: { ...model, expanded: { ...model.expanded, [id]: isOpen } },
      }),
      GotStyleXSidebarCalendar: ({ message: child }) => {
        const {
          model: calendar,
          commands: calendarCommands__,
          outMessage: calendarOut__,
        } = Calendar.update(model.calendar, child)
        const commands = calendarCommands__ ?? []
        const selection = Option.fromNullishOr(calendarOut__)
        return {
          model: {
            ...model,
            calendar,
            selectedDate: Option.match(selection, {
              onNone: () => model.selectedDate,
              onSome: s =>
                s._tag === 'SelectedDate'
                  ? Option.some(s.date)
                  : model.selectedDate,
            }),
          },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarCalendar']({ message }),
          ),
        }
      },
      GotStyleXSidebarDialog: ({ message: child }) => {
        const { model: dialog, commands: dialogCommands__ } = Dialog.update(
          model.dialog,
          child,
        )
        const commands = dialogCommands__ ?? []
        return {
          model: { ...model, dialog },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarDialog']({ message }),
          ),
        }
      },
      OpenedStyleXSidebarDialog: () => {
        const { model: dialog, commands: dialogCommands__ } = Dialog.open(
          model.dialog,
        )
        const commands = dialogCommands__ ?? []
        return {
          model: { ...model, dialog },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarDialog']({ message }),
          ),
        }
      },
      GotStyleXSidebarSubmenu: ({ index, message: child }) => {
        const current = model.submenus[index]
        if (current === undefined) return { model: model }
        const { model: submenu, commands: submenuCommands__ } =
          DropdownMenu.update(current, child)
        const commands = submenuCommands__ ?? []
        return {
          model: {
            ...model,
            submenus: model.submenus.map((p, i) => (i === index ? submenu : p)),
          },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarSubmenu']({ index, message }),
          ),
        }
      },
      GotStyleXSidebarTeamMenu: ({ message: child }) => {
        const {
          model: teamMenu,
          commands: teamMenuCommands__,
          outMessage: teamMenuOut__,
        } = TeamMenu.update(model.teamMenu, child)
        const commands = teamMenuCommands__ ?? []
        const selected =
          teamMenuOut__ !== undefined && teamMenuOut__._tag === 'Selected'
            ? teamMenuOut__.value
            : undefined
        const activeTeamIndex =
          selected !== undefined && selected.startsWith('team-')
            ? Number(selected.slice(5))
            : model.activeTeamIndex
        return {
          model: { ...model, teamMenu, activeTeamIndex },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarTeamMenu']({ message }),
          ),
        }
      },
      GotStyleXSidebarUserMenu: ({ message: child }) => {
        const { model: userMenu, commands: userMenuCommands__ } =
          UserMenu.update(model.userMenu, child)
        const commands = userMenuCommands__ ?? []
        return {
          model: { ...model, userMenu },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarUserMenu']({ message }),
          ),
        }
      },
      GotStyleXSidebarFavoriteMenu: ({ index, message: child }) => {
        const current = model.favoriteMenus[index]
        if (current === undefined) return { model: model }
        const { model: favoriteMenu, commands: favoriteMenuCommands__ } =
          FavoriteMenu.update(current, child)
        const commands = favoriteMenuCommands__ ?? []
        return {
          model: {
            ...model,
            favoriteMenus: model.favoriteMenus.map((p, i) =>
              i === index ? favoriteMenu : p,
            ),
          },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarFavoriteMenu']({ index, message }),
          ),
        }
      },
      GotStyleXSidebarPopover: ({ message: child }) => {
        const { model: popover, commands: popoverCommands__ } = Popover.update(
          model.popover,
          child,
        )
        const commands = popoverCommands__ ?? []
        return {
          model: { ...model, popover },
          commands: Command.mapMessages(commands, message =>
            Message['GotStyleXSidebarPopover']({ message }),
          ),
        }
      },
    }),
  )

const item = (
  label: string,
  model: Model,
  h: HtmlBuilder<Message>,
  name?: string,
  collapsed = false,
): Html =>
  Sidebar.sidebarMenuItem(
    {
      children: [
        Sidebar.sidebarMenuButton(
          {
            children: [
              ...(name === undefined ? [] : [icon({ name }, h)]),
              ...(collapsed ? [] : [blockLabel(label, h)]),
            ],
            tooltip: label,
            isActive: model.active === label,
            onClick: Message['SelectedStyleXSidebarItem']({ label }),
          },
          h,
        ),
      ],
    },
    h,
  )
const subItems = (
  labels: ReadonlyArray<string>,
  model: Model,
  h: HtmlBuilder<Message>,
  flat = false,
): Html =>
  Sidebar.sidebarMenuSub(
    {
      ...(flat ? { variant: 'flat' as const } : {}),
      children: labels
        .filter(label =>
          label.toLowerCase().includes(model.query.toLowerCase()),
        )
        .map(label =>
          Sidebar.sidebarMenuSubItem(
            {
              children: [
                Sidebar.sidebarMenuSubButton(
                  {
                    children: [label],
                    href: '#',
                    isActive: model.active === label,
                    onClick: Message['SelectedStyleXSidebarItem']({ label }),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ),
    },
    h,
  )
/* TW sidebar-02 collapsible content: plain menu items, no sub indent. */
const docItems = (
  labels: ReadonlyArray<string>,
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  Sidebar.sidebarMenu(
    {
      children: labels
        .filter(label =>
          label.toLowerCase().includes(model.query.toLowerCase()),
        )
        .map(label => item(label, model, h)),
    },
    h,
  )
const group = (
  title: string,
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  Sidebar.sidebarGroup(
    {
      children: [
        /* TW-13 has an unlabeled settings group — skip the empty label. */
        ...(title === ''
          ? []
          : [Sidebar.sidebarGroupLabel({ children: [title] }, h)]),
        Sidebar.sidebarMenu({ children }, h),
      ],
    },
    h,
  )
type ExpandableShape = 'menu' | 'chevronLead' | 'plusMinus' | 'label'
const expandable = (
  id: string,
  label: string,
  content: Html,
  model: Model,
  h: HtmlBuilder<Message>,
  initiallyOpen = false,
  name?: string,
  shape: ExpandableShape = 'menu',
  flatGroup = false,
  emoji?: string,
): Html => {
  const isOpen = model.expanded[id] ?? initiallyOpen
  const trailing =
    shape === 'plusMinus'
      ? [
          BaseIcon.icon(
            isOpen ? 'minus' : 'plus',
            {
              class: className(searchStyles.endIcon),
            },
            h,
          ),
        ]
      : shape === 'chevronLead'
        ? []
        : [
            BaseIcon.icon(
              'chevron-right',
              {
                class: className(
                  searchStyles.chevron,
                  isOpen && searchStyles.chevronOpen,
                ),
              },
              h,
            ),
          ]
  const leading =
    shape === 'chevronLead'
      ? [
          BaseIcon.icon(
            'chevron-right',
            {
              class: className(
                searchStyles.chevronLead,
                isOpen && searchStyles.chevronOpen,
              ),
            },
            h,
          ),
        ]
      : []
  const disclosure = collapsible(
    {
      variant: shape === 'label' ? 'sidebarLabel' : 'sidebar',
      id: 'stylex-group-' + id.replaceAll(/[^a-z0-9]/gi, '-'),
      isOpen,
      onToggle: next =>
        Message['ChangedStyleXSidebarGroup']({ id, isOpen: next }),
      trigger: h.span(
        [h.Class(className(searchStyles.contents))],
        [
          ...leading,
          ...(name === undefined ? [] : [icon({ name }, h)]),
          /* TW workspace rows carry emoji + name as two spans so the name
             truncates with ellipsis and spacing matches exactly. */
          ...(emoji === undefined ? [] : [h.span([], [emoji])]),
          blockLabel(label, h),
          ...trailing,
        ],
      ),
      content,
      /* TW-15 calendar group labels are 'w-full' (flatGroup); TW-02's are
         content-width, the sidebarLabel default. */
      ...(flatGroup ? { triggerLayoutStyle: searchStyles.fullWidth } : {}),
    },
    h,
  )
  /* TW nests menu-button collapsibles inside sidebarMenuItem; the
     group-label variant (sidebar-02) is wrapped in its own sidebarGroup. */
  if (shape === 'label')
    return flatGroup
      ? /* TW-15 calendar groups use 'py-0' — clone the group chrome. */
        h.div(
          [
            h.DataAttribute('slot', 'sidebar-group'),
            h.DataAttribute('sidebar', 'group'),
            h.Class(className(searchStyles.groupFlatY)),
          ],
          [disclosure],
        )
      : Sidebar.sidebarGroup({ children: [disclosure] }, h)
  return Sidebar.sidebarMenuItem({ children: [disclosure] }, h)
}
/* TW team switcher: w-fit px-1.5 menu-button [size-5 logo box + name +
   chevron-down] opening the team dropdown (teams + Add team). */
const teamSwitcher = (model: Model, h: HtmlBuilder<Message>): Html => {
  const team = workspace.teams[model.activeTeamIndex] ?? workspace.teams[0]
  if (team === undefined) return h.div([], [])
  const teamIcon = (logo: string): Html =>
    h.div(
      [h.Class(className(searchStyles.teamIconBox))],
      [BaseIcon.icon(logo, { class: className(searchStyles.iconXs) }, h)],
    )
  return Sidebar.sidebarMenu(
    {
      children: [
        Sidebar.sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<TeamItem, Message>(
                {
                  model: model.teamMenu,
                  toParentMessage: message =>
                    Message['GotStyleXSidebarTeamMenu']({ message }),
                  trigger: h.span(
                    [h.Class(className(searchStyles.contents))],
                    [
                      teamIcon(team.logo),
                      h.span(
                        [h.Class(className(searchStyles.teamName))],
                        [team.name],
                      ),
                      BaseIcon.icon(
                        'chevron-down',
                        { class: className(searchStyles.chevronSm) },
                        h,
                      ),
                    ],
                  ),
                  triggerStyle: model.teamMenu.isOpen
                    ? searchStyles.teamTriggerOpen
                    : searchStyles.teamTrigger,
                  items: TEAM_ITEMS,
                  itemToConfig: item => {
                    if (item === 'add-team') {
                      return {
                        label: 'Add team',
                        icon: h.div(
                          [h.Class(className(searchStyles.teamItemIcon))],
                          [
                            BaseIcon.icon(
                              'plus',
                              { class: className(searchStyles.iconXs) },
                              h,
                            ),
                          ],
                        ),
                        group: '',
                      }
                    }
                    const index =
                      item === 'team-0' ? 0 : item === 'team-1' ? 1 : 2
                    const t = workspace.teams[index]
                    return {
                      label: t?.name ?? '',
                      icon: h.div(
                        [h.Class(className(searchStyles.teamItemIcon))],
                        [
                          BaseIcon.icon(
                            t?.logo ?? 'command',
                            { class: className(searchStyles.iconXs) },
                            h,
                          ),
                        ],
                      ),
                      shortcut: `⌘${index + 1}`,
                      group: 'Teams',
                    }
                  },
                  side: 'bottom',
                  align: 'start',
                  ariaLabel: 'Switch team',
                },
                h,
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
/* TW navUser: lg menu-button [avatar + name/email + chevronsUpDown]
   opening the user dropdown (Upgrade/Account/Billing/Notifications/Log out). */
const navUser = (
  model: Model,
  h: HtmlBuilder<Message>,
  collapsed = false,
  side: 'left' | 'right' | 'top' = 'right',
): Html =>
  Sidebar.sidebarMenu(
    {
      children: [
        Sidebar.sidebarMenuItem(
          {
            children: [
              DropdownMenu.dropdownMenu<UserItem, Message>(
                {
                  model: model.userMenu,
                  toParentMessage: message =>
                    Message['GotStyleXSidebarUserMenu']({ message }),
                  trigger: h.span(
                    [h.Class(className(searchStyles.contents))],
                    collapsed
                      ? [
                          h.div(
                            [h.Class(className(searchStyles.userAvatar))],
                            ['CU'],
                          ),
                          /* TW keeps the 'grid flex-1' text wrapper in the
                             collapsed rail too — it shrinks to 0 width but
                             still takes the second gap-2 slot before the
                             chevrons icon. */
                          h.div(
                            [h.Class(className(searchStyles.userText))],
                            [
                              h.span(
                                [h.Class(className(searchStyles.userName))],
                                ['CreaseUI'],
                              ),
                              h.span(
                                [h.Class(className(searchStyles.userEmail))],
                                ['m@example.com'],
                              ),
                            ],
                          ),
                          /* TW keeps the 'ml-auto' chevrons-up-down visible
                             beside the avatar in the collapsed rail. */
                          BaseIcon.icon(
                            'chevrons-up-down',
                            { class: className(searchStyles.endIcon) },
                            h,
                          ),
                        ]
                      : [
                          h.div(
                            [h.Class(className(searchStyles.userAvatar))],
                            ['CU'],
                          ),
                          h.div(
                            [h.Class(className(searchStyles.userText))],
                            [
                              h.span(
                                [h.Class(className(searchStyles.userName))],
                                ['CreaseUI'],
                              ),
                              h.span(
                                [h.Class(className(searchStyles.userEmail))],
                                ['m@example.com'],
                              ),
                            ],
                          ),
                          BaseIcon.icon(
                            'chevrons-up-down',
                            { class: className(searchStyles.chevronTd) },
                            h,
                          ),
                        ],
                  ),
                  triggerStyle: model.userMenu.isOpen
                    ? searchStyles.userTriggerOpen
                    : searchStyles.userTrigger,
                  items: USER_ITEMS,
                  itemToConfig: item =>
                    M.value(item).pipe(
                      M.withReturnType<
                        DropdownMenu.DropdownMenuItemConfig<UserItem>
                      >(),
                      M.when('upgrade', () => ({
                        label: 'Upgrade to Pro',
                        icon: BaseIcon.icon('sparkles', {}, h),
                        group: 'CreaseUI · m@example.com',
                      })),
                      M.when('account', () => ({
                        label: 'Account',
                        icon: BaseIcon.icon('badge-check', {}, h),
                        group: 'Account',
                      })),
                      M.when('billing', () => ({
                        label: 'Billing',
                        icon: BaseIcon.icon('credit-card', {}, h),
                        group: 'Account',
                      })),
                      M.when('notifications', () => ({
                        label: 'Notifications',
                        icon: BaseIcon.icon('bell', {}, h),
                        group: 'Account',
                      })),
                      M.when('log-out', () => ({
                        label: 'Log out',
                        icon: BaseIcon.icon('log-out', {}, h),
                        group: '',
                      })),
                      M.exhaustive,
                    ),
                  side,
                  align: 'start',
                  ariaLabel: 'User menu',
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
const user = (
  model: Model,
  h: HtmlBuilder<Message>,
  collapsed: boolean,
): Html =>
  Sidebar.sidebarFooter(
    {
      children: [navUser(model, h, collapsed)],
    },
    h,
  )
const brand = (
  label: string,
  detail: string,
  h: HtmlBuilder<Message>,
  collapsed: boolean,
  extraChildren: ReadonlyArray<Html> = [],
  iconName = 'gallery-vertical-end',
  /* TW ships two label-stack markups: docs sidebars (01-06) use 'flex
     flex-col gap-0.5 leading-none'; workspace sidebars (07+) use 'grid
     flex-1 text-left text-sm leading-tight' + 'truncate text-xs' detail. */
  stackShape: 'docs' | 'workspace' = 'docs',
  /* Children appended inside the menu button after the label stack
     (e.g. the teamSwitcher's 'ml-auto' chevrons-up-down). */
  buttonTrailing: ReadonlyArray<Html> = [],
): Html =>
  Sidebar.sidebarHeader(
    {
      children: [
        Sidebar.sidebarMenu(
          {
            children: [
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        children: [
                          h.div(
                            [h.Class(className(searchStyles.brandIconBox))],
                            [icon({ name: iconName }, h)],
                          ),
                          ...(collapsed
                            ? []
                            : [
                                h.div(
                                  [
                                    h.Class(
                                      className(
                                        stackShape === 'docs'
                                          ? searchStyles.brandStack
                                          : searchStyles.brandGrid,
                                      ),
                                    ),
                                  ],
                                  [
                                    h.span(
                                      [
                                        h.Class(
                                          className(
                                            stackShape === 'docs'
                                              ? searchStyles.brandTitle
                                              : searchStyles.brandTitleTruncate,
                                          ),
                                        ),
                                      ],
                                      [label],
                                    ),
                                    h.span(
                                      [
                                        h.Class(
                                          className(
                                            stackShape === 'docs'
                                              ? searchStyles.brandDetailPlain
                                              : searchStyles.brandDetailXs,
                                          ),
                                        ),
                                      ],
                                      [detail],
                                    ),
                                  ],
                                ),
                              ]),
                          ...buttonTrailing,
                        ],
                        size: 'lg',
                        tooltip: label,
                      },
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
        ...extraChildren,
      ],
    },
    h,
  )
const searchForm = (id: string, model: Model, h: HtmlBuilder<Message>): Html =>
  h.form(
    [],
    [
      h.div(
        [
          h.DataAttribute('slot', 'sidebar-group'),
          h.DataAttribute('sidebar', 'group'),
          h.Class(className(searchStyles.group)),
        ],
        [
          h.div(
            [
              h.DataAttribute('slot', 'sidebar-group-content'),
              h.DataAttribute('sidebar', 'group-content'),
              h.Class(className(searchStyles.box)),
            ],
            [
              h.label(
                [
                  h.For(`sidebar-${id}-search`),
                  h.Class(className(searchStyles.srOnly)),
                ],
                ['Search'],
              ),
              Sidebar.sidebarInput(
                {
                  id: `sidebar-${id}-search`,
                  value: model.query,
                  onInput: value =>
                    Message['ChangedStyleXSidebarSearch']({ value }),
                  placeholder: 'Search the docs...',
                  inputStyle: searchStyles.input,
                },
                h,
              ),
              BaseIcon.icon(
                'search',
                { class: className(searchStyles.icon) },
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )

const documentation = (
  id: string,
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  /* TW-02 wraps its nav groups in a 'gap-0' sidebarContent; every other
     docs variant keeps the default gap-2 container. */
  const wrapContent = (children: ReadonlyArray<Html>): Html =>
    id === '02'
      ? h.div(
          [
            h.DataAttribute('slot', 'sidebar-content'),
            h.DataAttribute('sidebar', 'content'),
            h.Class(className(searchStyles.contentFlat)),
          ],
          [...children],
        )
      : Sidebar.sidebarContent({ children }, h)
  return [
    ...(id === '14'
      ? []
      : [
          brand(
            'Documentation',
            id === '01' || id === '02' ? 'v1.0.1' : 'v1.0.0',
            h,
            false,
            ['01', '02', '05'].includes(id) ? [searchForm(id, model, h)] : [],
          ),
        ]),
    wrapContent(
      id === '03' || id === '04' || id === '14'
        ? [
            /* TW-03/04/14: always-open groups — menuItem = [font-medium
                 menuButton title, sidebarMenuSub items]; 04 uses gap-2
                 menu + flattened sub; 14 adds a 'Table of Contents' label. */
            Sidebar.sidebarGroup(
              {
                children: [
                  ...(id === '14'
                    ? [
                        Sidebar.sidebarGroupLabel(
                          { children: ['Table of Contents'] },
                          h,
                        ),
                      ]
                    : []),
                  Sidebar.sidebarMenu(
                    {
                      ...(id === '04' ? { variant: 'loose' as const } : {}),
                      children: docs.navMain.map(g =>
                        Sidebar.sidebarMenuItem(
                          {
                            children: [
                              Sidebar.sidebarMenuButton(
                                {
                                  children: [g.title],
                                  href: '#',
                                  weight: 'medium',
                                },
                                h,
                              ),
                              subItems(
                                g.items.map(i => i.title),
                                model,
                                h,
                                id === '04',
                              ),
                            ],
                          },
                          h,
                        ),
                      ),
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ]
        : id === '05'
          ? /* TW-05: one sidebarGroup > sidebarMenu > menuItem[disclosure]
               per nav section — the group gives the px-2 inset and the
               menu the gap-1 spacing the bare content children lack.
               TW-05's own navMain adds the trailing 'Community' group, so
               this variant reads its own data, not docs.navMain. */
            [
              group(
                '',
                docs05.navMain.map(g =>
                  expandable(
                    g.title,
                    g.title,
                    subItems(
                      g.items.map(i => i.title),
                      model,
                      h,
                    ),
                    model,
                    h,
                    false,
                    undefined,
                    'plusMinus',
                  ),
                ),
                h,
              ),
            ]
          : id === '06'
            ? /* TW-06: one sidebarGroup > sidebarMenu > menuItem[dropdown]
               per nav section — group px-2 inset + menu gap-1 parity. */
              [
                group(
                  '',
                  docs.navMain.map((g, index) => {
                    const submenu = model.submenus[index]
                    return submenu === undefined
                      ? h.empty
                      : Sidebar.sidebarMenuItem(
                          {
                            children: [
                              DropdownMenu.dropdownMenu<string, Message>(
                                {
                                  model: submenu,
                                  toParentMessage: message =>
                                    Message['GotStyleXSidebarSubmenu']({
                                      index,
                                      message,
                                    }),
                                  trigger: h.span(
                                    [h.Class(className(searchStyles.contents))],
                                    [
                                      g.title,
                                      BaseIcon.icon(
                                        'ellipsis',
                                        {
                                          class: className(
                                            searchStyles.chevron,
                                          ),
                                        },
                                        h,
                                      ),
                                    ],
                                  ),
                                  triggerStyle: submenu.isOpen
                                    ? searchStyles.menuTriggerOpen
                                    : searchStyles.menuTrigger,
                                  items: g.items.map(i => i.title),
                                  itemToConfig: title => ({ label: title }),
                                  side: 'right',
                                  align: 'start',
                                  ariaLabel: g.title + ' submenu',
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        )
                  }),
                  h,
                ),
              ]
            : docs.navMain.map(g => {
                const labels = g.items.map(i => i.title)
                if (id === '02')
                  return expandable(
                    g.title,
                    g.title,
                    docItems(labels, model, h),
                    model,
                    h,
                    id === '02',
                    undefined,
                    'label',
                  )
                if (id === '01')
                  return group(
                    g.title,
                    labels
                      .filter(l =>
                        l.toLowerCase().includes(model.query.toLowerCase()),
                      )
                      .map(l => item(l, model, h)),
                    h,
                  )
                return group(g.title, [subItems(labels, model, h)], h)
              }),
    ),
    ...(id === '06'
      ? [
          Sidebar.sidebarFooter(
            {
              children: [
                /* TW-06 opt-in card (gap-2 py-4, px-4 header/content). */
                h.div(
                  [h.Class(className(searchStyles.optCard))],
                  [
                    h.div(
                      [h.Class(className(searchStyles.optHead))],
                      [
                        h.div(
                          [h.Class(className(searchStyles.optTitle))],
                          ['Subscribe to our newsletter'],
                        ),
                        h.div(
                          [h.Class(className(searchStyles.optDesc))],
                          [
                            'Opt-in to receive updates and news about the sidebar.',
                          ],
                        ),
                      ],
                    ),
                    h.div(
                      [h.Class(className(searchStyles.optBody))],
                      [
                        h.form(
                          [],
                          [
                            h.div(
                              [h.Class(className(searchStyles.optGrid))],
                              [
                                Sidebar.sidebarInput(
                                  {
                                    id: 'newsletter-email',
                                    type: 'email',
                                    value: model.query,
                                    onInput: value =>
                                      Message['ChangedStyleXSidebarSearch']({
                                        value,
                                      }),
                                    placeholder: 'Email',
                                  },
                                  h,
                                ),
                                button(
                                  {
                                    children: ['Subscribe'],
                                    size: 'sm',
                                    radius: 'md',
                                    layoutStyle: searchStyles.fullWidth,
                                  },
                                  h,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            },
            h,
          ),
        ]
      : []),
  ]
}
const application = (
  id: string,
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const collapsed = !model.isOpen && !model.isMobileOpen
  return [
    /* TW-08/16 brand icon 'command'; TW-07 'gallery-vertical-end'.
       TW-07/10/15 brand is a teamSwitcher dropdown trigger whose trigger
       carries the trailing 'ml-auto' chevrons-up-down icon. */
    brand(
      'Acme Inc',
      'Enterprise',
      h,
      collapsed,
      [],
      id === '08' || id === '16' ? 'command' : 'gallery-vertical-end',
      'workspace',
      collapsed || !['07', '10', '15'].includes(id)
        ? []
        : [
            BaseIcon.icon(
              'chevrons-up-down',
              { class: className(searchStyles.chevronTd) },
              h,
            ),
          ],
    ),
    Sidebar.sidebarContent(
      {
        children: [
          ...(collapsed
            ? app.navMain.map(g => item(g.title, model, h, g.icon, true))
            : /* TW-16: 'Platform' group = sidebarGroup > label + menu. */
              [
                group(
                  'Platform',
                  app.navMain.map(g =>
                    expandable(
                      g.title,
                      g.title,
                      subItems(
                        g.items.map(i => i.title),
                        model,
                        h,
                      ),
                      model,
                      h,
                      false,
                      g.icon,
                    ),
                  ),
                  h,
                ),
              ]),
          ...(collapsed
            ? []
            : [
                group(
                  'Projects',
                  [
                    /* TW-16/08/07: each project row has a hover 'More'
                       menu-action; a trailing plain 'More' item follows. */
                    ...app.projects.map(p =>
                      Sidebar.sidebarMenuItem(
                        {
                          children: [
                            Sidebar.sidebarMenuButton(
                              {
                                children: [
                                  icon({ name: p.icon }, h),
                                  blockLabel(p.name, h),
                                ],
                                tooltip: p.name,
                                isActive: model.active === p.name,
                                onClick: Message['SelectedStyleXSidebarItem']({
                                  label: p.name,
                                }),
                                href: '#',
                              },
                              h,
                            ),
                            Sidebar.sidebarMenuAction(
                              {
                                showOnHover: true,
                                children: [
                                  BaseIcon.icon('ellipsis', {}, h),
                                  h.span(
                                    [h.Class(className(searchStyles.srOnly))],
                                    ['More'],
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ),
                    Sidebar.sidebarMenuItem(
                      {
                        children: [
                          Sidebar.sidebarMenuButton(
                            {
                              /* TW 'text-sidebar-foreground/70' on both
                                 the icon and the label. */
                              children: [
                                BaseIcon.icon(
                                  'ellipsis',
                                  {
                                    class: className(searchStyles.dimmedButton),
                                  },
                                  h,
                                ),
                                h.span(
                                  [
                                    h.Class(
                                      className(searchStyles.dimmedButton),
                                    ),
                                  ],
                                  ['More'],
                                ),
                              ],
                              tooltip: 'More',
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ],
                  h,
                ),
              ]),
          ...(['08', '16'].includes(id)
            ? [
                /* TW-08/16 navSecondary: 'mt-auto' group pinning the
                   size-sm Support/Feedback items to the sidebar bottom. */
                Sidebar.sidebarGroup(
                  {
                    layoutStyle: searchStyles.autoTop,
                    children: [
                      Sidebar.sidebarMenu(
                        {
                          children: (
                            [
                              ['Support', 'life-buoy'],
                              ['Feedback', 'send'],
                            ] as const
                          ).map(([label, name]) =>
                            Sidebar.sidebarMenuItem(
                              {
                                children: [
                                  Sidebar.sidebarMenuButton(
                                    {
                                      children: [
                                        icon({ name }, h),
                                        ...(collapsed
                                          ? []
                                          : [blockLabel(label, h)]),
                                      ],
                                      tooltip: label,
                                      isActive: model.active === label,
                                      onClick: Message[
                                        'SelectedStyleXSidebarItem'
                                      ]({
                                        label,
                                      }),
                                      size: 'sm',
                                      href: '#',
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ),
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ]
            : []),
        ],
      },
      h,
    ),
    user(model, h, collapsed),
  ]
}
/* TW-10 favorite row: menuButton [emoji span + name span] + hover-revealed
   row-action dropdown; TW-15 uses a static show-on-hover menuAction. */
const favoriteActionConfig = (
  action: FavoriteAction,
  h: HtmlBuilder<Message>,
): DropdownMenu.DropdownMenuItemConfig<FavoriteAction> =>
  M.value(action).pipe(
    M.withReturnType<DropdownMenu.DropdownMenuItemConfig<FavoriteAction>>(),
    M.when('remove', () => ({
      label: 'Remove from Favorites',
      icon: icon({ name: 'star-off' }, h),
      group: 'Favorite',
    })),
    M.when('copy-link', () => ({
      label: 'Copy Link',
      icon: icon({ name: 'link' }, h),
      group: 'Page',
    })),
    M.when('open-tab', () => ({
      label: 'Open in New Tab',
      icon: icon({ name: 'arrow-up-right' }, h),
      group: 'Page',
    })),
    M.when('delete', () => ({
      label: 'Delete',
      icon: icon({ name: 'trash-2' }, h),
      group: '',
    })),
    M.exhaustive,
  )
const favoriteItem = (
  fav: Readonly<{ name: string; emoji: string; url: string }>,
  index: number,
  dropdown: boolean,
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const action = dropdown
    ? DropdownMenu.dropdownMenu<FavoriteAction, Message>(
        {
          model:
            model.favoriteMenus[index] ??
            DropdownMenu.init({ id: 'stylex-favorite-' + index }),
          toParentMessage: message =>
            Message['GotStyleXSidebarFavoriteMenu']({ index, message }),
          trigger: h.span(
            [h.Class(className(searchStyles.contents))],
            [
              BaseIcon.icon(
                'ellipsis',
                { class: className(searchStyles.endIcon) },
                h,
              ),
              h.span([h.Class(className(searchStyles.srOnly))], ['More']),
            ],
          ),
          triggerStyle: searchStyles.rowAction,
          placement: 'sidebarAction',
          items: FAVORITE_ACTIONS,
          itemToConfig: action => favoriteActionConfig(action, h),
          side: 'right',
          align: 'start',
          ariaLabel: `${fav.name} actions`,
        },
        h,
      )
    : Sidebar.sidebarMenuAction(
        {
          showOnHover: true,
          children: [
            icon({ name: 'ellipsis' }, h),
            h.span([h.Class(className(searchStyles.srOnly))], ['More']),
          ],
        },
        h,
      )
  return Sidebar.sidebarMenuItem(
    {
      children: [
        Sidebar.sidebarMenuButton(
          {
            children: [h.span([], [fav.emoji]), blockLabel(fav.name, h)],
            tooltip: fav.name,
            href: fav.url,
          },
          h,
        ),
        action,
      ],
    },
    h,
  )
}
/* TW dimmed trailing 'More' row (ellipsis icon + label). */
const moreRow = (h: HtmlBuilder<Message>): Html =>
  Sidebar.sidebarMenuItem(
    {
      children: [
        Sidebar.sidebarMenuButton(
          {
            children: [
              BaseIcon.icon(
                'ellipsis',
                { class: className(searchStyles.dimmedButton) },
                h,
              ),
              h.span([h.Class(className(searchStyles.dimmedButton))], ['More']),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
/* TW favorites group: label + menu(items + trailing 'More' dimmed row). */
const favoritesNav = (
  model: Model,
  h: HtmlBuilder<Message>,
  dropdown: boolean,
): Html =>
  Sidebar.sidebarGroup(
    {
      children: [
        Sidebar.sidebarGroupLabel({ children: ['Favorites'] }, h),
        Sidebar.sidebarMenu(
          {
            children: [
              ...workspace.favorites.map((f, index) =>
                favoriteItem(f, index, dropdown, model, h),
              ),
              moreRow(h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
const workspaceNav = (
  model: Model,
  h: HtmlBuilder<Message>,
  id: string,
): ReadonlyArray<Html> => [
  /* TW-10/15 left header: team switcher dropdown + nav menu. */
  Sidebar.sidebarHeader(
    {
      children: [
        teamSwitcher(model, h),
        Sidebar.sidebarMenu(
          {
            children: workspace.navMain.map(i =>
              item(i.title, model, h, i.icon === 'home' ? 'house' : i.icon),
            ),
          },
          h,
        ),
      ],
    },
    h,
  ),
  Sidebar.sidebarContent(
    {
      children: [
        favoritesNav(model, h, id === '10'),
        group(
          'Workspaces',
          [
            ...workspace.workspaces.map(w =>
              expandable(
                w.name,
                w.name,
                subItems(
                  w.pages.map(p => p.emoji + ' ' + p.name),
                  model,
                  h,
                ),
                model,
                h,
                false,
                undefined,
                'menu',
                false,
                w.emoji,
              ),
            ),
            moreRow(h),
          ],
          h,
        ),
        group(
          '',
          workspace.navSecondary.map(i => item(i.title, model, h, i.icon)),
          h,
        ),
      ],
    },
    h,
  ),
]
type TreeItem = string | ReadonlyArray<TreeItem>
const tree = (
  entries: ReadonlyArray<TreeItem>,
  model: Model,
  h: HtmlBuilder<Message>,
  parent = '',
): Html =>
  Sidebar.sidebarMenu(
    {
      children: entries.map(entry => {
        if (typeof entry === 'string') return item(entry, model, h, 'file')
        const [name, ...children] = entry
        if (typeof name !== 'string') return h.empty
        const path = parent ? parent + '/' + name : name
        return expandable(
          path,
          name,
          Sidebar.sidebarMenuSub(
            { children: [tree(children, model, h, path)] },
            h,
          ),
          model,
          h,
          false,
          'folder',
          'chevronLead',
        )
      }),
    },
    h,
  )
/* TW-10 actions popover content: grouped menu items inside a transparent
   'w-56 p-0' sidebar (border-b separators between groups). */
const ACTION_GROUPS: ReadonlyArray<
  ReadonlyArray<Readonly<{ label: string; icon: string }>>
> = [
  [
    { label: 'Customize Page', icon: 'settings-2' },
    { label: 'Turn into wiki', icon: 'file-text' },
  ],
  [
    { label: 'Copy Link', icon: 'link' },
    { label: 'Duplicate', icon: 'copy' },
    { label: 'Move to', icon: 'corner-up-right' },
    { label: 'Move to Trash', icon: 'trash-2' },
  ],
  [
    { label: 'Undo', icon: 'corner-up-left' },
    { label: 'View analytics', icon: 'chart-no-axes-combined' },
    { label: 'Version History', icon: 'gallery-vertical-end' },
    { label: 'Show delete pages', icon: 'trash' },
    { label: 'Notifications', icon: 'bell' },
  ],
  [
    { label: 'Import', icon: 'arrow-up' },
    { label: 'Export', icon: 'arrow-down' },
  ],
]
const actionNav = (h: HtmlBuilder<Message>): ReadonlyArray<Html> => [
  Sidebar.sidebarContent(
    {
      children: ACTION_GROUPS.map((groupItems, groupIndex) =>
        h.div(
          [
            h.DataAttribute('slot', 'sidebar-group'),
            h.Class(className(searchStyles.actionGroup)),
            ...(groupIndex === ACTION_GROUPS.length - 1
              ? [h.Class(className(searchStyles.actionGroupLast))]
              : []),
          ],
          [
            Sidebar.sidebarMenu(
              {
                children: groupItems.map(i =>
                  Sidebar.sidebarMenuItem(
                    {
                      children: [
                        Sidebar.sidebarMenuButton(
                          {
                            children: [
                              icon({ name: i.icon }, h),
                              h.span([], [i.label]),
                            ],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ),
              },
              h,
            ),
          ],
        ),
      ),
    },
    h,
  ),
]
/* Mirrors TW sidebar-12/15 rightData.calendars. */
const CALENDAR_GROUPS: ReadonlyArray<
  Readonly<{ name: string; items: ReadonlyArray<string> }>
> = [
  { name: 'My Calendars', items: ['Personal', 'Work', 'Family'] },
  { name: 'Favorites', items: ['Holidays', 'Birthdays'] },
  { name: 'Other', items: ['Travel', 'Reminders', 'Deadlines'] },
]
const calendarNav = (
  model: Model,
  h: HtmlBuilder<Message>,
  userSide: 'left' | 'right' = 'right',
): ReadonlyArray<Html> => [
  /* TW-12/15-right: navUser inside a 'h-16 border-b' sidebar header. */
  h.div(
    [
      h.DataAttribute('slot', 'sidebar-header'),
      h.Class(className(searchStyles.userHeader)),
    ],
    [navUser(model, h, false, userSide)],
  ),
  Sidebar.sidebarContent(
    {
      children: [
        /* TW-15: calendar inside a 'px-0' group, then an mx-0 separator. */
        h.div(
          [
            h.DataAttribute('slot', 'sidebar-group'),
            h.DataAttribute('sidebar', 'group'),
            h.Class(className(searchStyles.groupFlatX)),
          ],
          [
            Sidebar.sidebarGroupContent(
              {
                children: [
                  Calendar.calendar(
                    {
                      model: model.calendar,
                      maybeSelectedDate: model.selectedDate,
                      toParentMessage: message =>
                        Message['GotStyleXSidebarCalendar']({ message }),
                      /* TW-15 sizes right-sidebar cells to w-[33px]. */
                      cellWidth: '2.0625rem',
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        ),
        Sidebar.sidebarSeparator(
          { layoutStyle: searchStyles.separatorFlush },
          h,
        ),
        ...CALENDAR_GROUPS.flatMap((g, index) => [
          expandable(
            'calendar-group-' + index,
            g.name,
            Sidebar.sidebarGroupContent(
              {
                children: [
                  Sidebar.sidebarMenu(
                    {
                      children: g.items.map((label, itemIndex) =>
                        Sidebar.sidebarMenuItem(
                          {
                            children: [
                              Sidebar.sidebarMenuButton(
                                {
                                  children: [
                                    h.div(
                                      [
                                        h.Class(
                                          className(
                                            itemIndex < 2
                                              ? searchStyles.calBoxActive
                                              : searchStyles.calBox,
                                          ),
                                        ),
                                      ],
                                      itemIndex < 2
                                        ? [
                                            BaseIcon.icon(
                                              'check',
                                              {
                                                class: className(
                                                  searchStyles.calCheck,
                                                ),
                                              },
                                              h,
                                            ),
                                          ]
                                        : [],
                                    ),
                                    label,
                                  ],
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                      ),
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            model,
            h,
            index === 0,
            undefined,
            'label',
            true,
          ),
          /* TW-15 puts an 'mx-0' separator after EVERY calendar group. */
          Sidebar.sidebarSeparator(
            { layoutStyle: searchStyles.separatorFlush },
            h,
          ),
        ]),
      ],
    },
    h,
  ),
  /* TW-15 footer: sidebarMenu > menuItem > menuButton [plus, 'New Calendar']. */
  Sidebar.sidebarFooter(
    {
      children: [
        Sidebar.sidebarMenu(
          {
            children: [
              Sidebar.sidebarMenuItem(
                {
                  children: [
                    Sidebar.sidebarMenuButton(
                      {
                        children: [icon({ name: 'plus' }, h), 'New Calendar'],
                      },
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
    },
    h,
  ),
]
const trigger = (h: HtmlBuilder<Message>): Html =>
  Sidebar.sidebarTrigger(
    {
      onClick: Message['ToggledStyleXSidebar'](),
      onMobileClick: Message['ToggledStyleXMobileSidebar'](),
      layoutStyle: searchStyles.trigger,
    },
    h,
  )
/* sidebar-14 puts its trigger on the right (sidebar is on the right):
   TW '-mr-1 ml-auto rotate-180'. */
const rightTrigger = (h: HtmlBuilder<Message>): Html =>
  Sidebar.sidebarTrigger(
    {
      onClick: Message['ToggledStyleXSidebar'](),
      onMobileClick: Message['ToggledStyleXMobileSidebar'](),
      layoutStyle: searchStyles.rightTrigger,
      iconStyle: searchStyles.triggerIcon,
    },
    h,
  )
/* TW-16 siteHeader trigger is 'size-8' (no -ml-1 nudge). */
const headerTrigger16 = (h: HtmlBuilder<Message>): Html =>
  Sidebar.sidebarTrigger(
    {
      onClick: Message['ToggledStyleXSidebar'](),
      onMobileClick: Message['ToggledStyleXMobileSidebar'](),
      layoutStyle: searchStyles.trigger8,
    },
    h,
  )
/* TW header: separator(vertical, 'mr-2 h-4') between trigger and breadcrumb. */
const headerSeparator = (h: HtmlBuilder<Message>): Html =>
  separator(
    {
      orientation: 'vertical',
      layoutStyle: searchStyles.headerSeparator,
    },
    h,
  )
const crumb = (
  label: string,
  isPage: boolean,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  isPage
    ? [
        breadcrumbItem(
          {
            children: [breadcrumbPage({ children: [label] }, h)],
          },
          h,
        ),
      ]
    : [
        breadcrumbItem(
          {
            children: [breadcrumbLink({ href: '#', children: [label] }, h)],
          },
          h,
        ),
        breadcrumbSeparator({}, h),
      ]
/* Per-variant breadcrumb trails, mirroring each Tailwind preview header. */
const crumbTrail = (
  id: string,
  active: string,
  h: HtmlBuilder<Message>,
): Html => {
  const trail: ReadonlyArray<string> =
    id === '09'
      ? ['All Inboxes', 'Inbox']
      : id === '11'
        ? ['src', 'ui', 'button.ts']
        : id === '12'
          ? ['October 2024']
          : id === '10' || id === '15'
            ? ['Project Management & Task Tracking']
            : ['Build Your Application', active]
  return breadcrumb(
    {
      children: [
        breadcrumbList(
          {
            children: trail.flatMap((label, index) =>
              crumb(label, index === trail.length - 1, h),
            ),
          },
          h,
        ),
      ],
    },
    h,
  )
}
const settingsContent = (model: Model, h: HtmlBuilder<Message>): Html =>
  settingsLayout(
    Sidebar.sidebar(
      {
        collapsible: 'none',
        children: [
          Sidebar.sidebarContent(
            {
              children: [
                group(
                  '',
                  /* TW-13 marks 'Messages & media' active statically. */
                  settings.nav.map(i =>
                    Sidebar.sidebarMenuItem(
                      {
                        children: [
                          Sidebar.sidebarMenuButton(
                            {
                              children: [
                                icon({ name: i.icon }, h),
                                blockLabel(i.name, h),
                              ],
                              tooltip: i.name,
                              isActive: i.name === 'Messages & media',
                              href: '#',
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ),
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
    [
      /* TW-13 header: breadcrumb 'Settings > Messages & media'. */
      blockHeader(
        [
          breadcrumb(
            {
              children: [
                breadcrumbList(
                  {
                    children: [
                      ...crumb('Settings', false, h),
                      ...crumb('Messages & media', true, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
        false,
        h,
        false,
      ),
      blockSkeleton('settings', h),
    ],
    h,
  )

export const view = (
  model: Model,
  id: string,
  h: HtmlBuilder<Message>,
): Html => {
  if (id === '13')
    return blockCenter(
      [
        button(
          {
            children: ['Open Dialog'],
            onClick: Message['OpenedStyleXSidebarDialog'](),
          },
          h,
        ),
        Dialog.dialog(
          {
            size: 'settings',
            model: model.dialog,
            toParentMessage: message =>
              Message['GotStyleXSidebarDialog']({ message }),
            title: 'Settings',
            description: 'Customize your settings here.',
            showCloseButton: true,
            content: () => [settingsContent(model, h)],
          },
          h,
        ),
      ],
      h,
      Message['OpenedStyleXSidebarDialog'](),
    )
  const state = model.isOpen ? 'expanded' : 'collapsed'
  const isApp = ['07', '08', '16'].includes(id)
  const title =
    id === '09'
      ? 'Inbox'
      : id === '11'
        ? 'button.ts'
        : id === '12'
          ? 'October 2024'
          : id === '10' || id === '15'
            ? 'Project Management & Task Tracking'
            : model.active
  const navigation =
    id === '09'
      ? [
          /* TW-09: one icon sidebar whose inner is flex-row containing a
             49px icon rail (collapsible none) + flex-1 mail list sidebar. */
          h.div(
            [h.Class(className(searchStyles.mailRow))],
            [
              h.div(
                [
                  h.DataAttribute('slot', 'sidebar'),
                  /* Scope marker + collapsed-icon attr so rail menu
                     buttons inherit the icon-collapsed chrome (size-8,
                     centered, labels hidden). */
                  h.DataAttribute('collapsible', 'icon'),
                  h.Class(className(searchStyles.mailRail, sidebarScope)),
                ],
                [
                  brand(
                    'Acme Inc',
                    'Enterprise',
                    h,
                    !model.isMobileOpen,
                    [],
                    'command',
                    'workspace',
                  ),
                  Sidebar.sidebarContent(
                    {
                      children: [
                        /* TW-09 rail: content > group > groupContent > menu —
                           the group wrapper provides the px-2 rail inset. */
                        Sidebar.sidebarGroup(
                          {
                            children: [
                              h.div(
                                [
                                  h.DataAttribute(
                                    'slot',
                                    'sidebar-group-content',
                                  ),
                                  h.DataAttribute('sidebar', 'group-content'),
                                ],
                                [
                                  Sidebar.sidebarMenu(
                                    {
                                      children: mail.navMain.map(i =>
                                        item(
                                          i.title,
                                          /* TW-09 marks 'Inbox' active in
                                             the rail. */
                                          { ...model, active: 'Inbox' },
                                          h,
                                          i.icon,
                                          !model.isMobileOpen,
                                        ),
                                      ),
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
                  Sidebar.sidebarFooter(
                    {
                      children: [
                        navUser(model, h, !model.isMobileOpen, 'right'),
                      ],
                    },
                    h,
                  ),
                ],
              ),
              h.div(
                [
                  h.DataAttribute('slot', 'sidebar'),
                  h.Class(className(searchStyles.mailColumn)),
                ],
                [
                  h.div(
                    [h.Class(className(searchStyles.mailHead))],
                    [
                      h.div(
                        [h.Class(className(searchStyles.mailTitleRow))],
                        [
                          h.div(
                            [h.Class(className(searchStyles.mailTitle))],
                            ['Inbox'],
                          ),
                          h.div(
                            [h.Class(className(searchStyles.mailSwitchRow))],
                            [
                              h.span([], ['Unreads']),
                              Switch.switchControl(
                                {
                                  id: 'stylex-sidebar-09-unreads',
                                  isChecked: model.unreadOnly,
                                  onToggle: isChecked =>
                                    Message['ToggledStyleXSidebarUnread']({
                                      isChecked,
                                    }),
                                },
                                h,
                              ),
                            ],
                          ),
                        ],
                      ),
                      Sidebar.sidebarInput(
                        {
                          id: 'stylex-sidebar-09-mail-search',
                          value: model.query,
                          onInput: value =>
                            Message['ChangedStyleXSidebarSearch']({
                              value,
                            }),
                          placeholder: 'Type to search...',
                        },
                        h,
                      ),
                    ],
                  ),
                  Sidebar.sidebarContent(
                    {
                      children: [
                        h.div(
                          [
                            h.DataAttribute('slot', 'sidebar-group'),
                            h.Class(className(searchStyles.mailGroup)),
                          ],
                          [
                            Sidebar.sidebarGroupContent(
                              {
                                children: mail.mails
                                  .filter(m =>
                                    (m.name + ' ' + m.subject)
                                      .toLowerCase()
                                      .includes(model.query.toLowerCase()),
                                  )
                                  .map(m =>
                                    mailItem(
                                      [
                                        h.div(
                                          [
                                            h.Class(
                                              className(
                                                searchStyles.mailNameRow,
                                              ),
                                            ),
                                          ],
                                          [
                                            h.span([], [m.name]),
                                            h.span(
                                              [
                                                h.Class(
                                                  className(
                                                    searchStyles.mailDate,
                                                  ),
                                                ),
                                              ],
                                              [m.date],
                                            ),
                                          ],
                                        ),
                                        h.span(
                                          [
                                            h.Class(
                                              className(
                                                searchStyles.mailSubject,
                                              ),
                                            ),
                                          ],
                                          [m.subject],
                                        ),
                                        h.span(
                                          [
                                            h.Class(
                                              className(
                                                searchStyles.mailTeaser,
                                              ),
                                            ),
                                          ],
                                          [m.teaser],
                                        ),
                                      ],
                                      Message['SelectedStyleXSidebarItem']({
                                        label: m.subject,
                                      }),
                                      h,
                                    ),
                                  ),
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
              ),
            ],
          ),
        ]
      : id === '11'
        ? [
            Sidebar.sidebarContent(
              {
                children: [
                  group(
                    'Changes',
                    files.changes.map(c =>
                      Sidebar.sidebarMenuItem(
                        {
                          children: [
                            Sidebar.sidebarMenuButton(
                              {
                                children: [icon({ name: 'file' }, h), c.file],
                              },
                              h,
                            ),
                            Sidebar.sidebarMenuBadge(
                              { children: [c.state] },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ),
                    h,
                  ),
                  group('Files', [tree(files.tree, model, h)], h),
                ],
              },
              h,
            ),
          ]
        : id === '12'
          ? calendarNav(model, h, 'right')
          : id === '10' || id === '15'
            ? workspaceNav(model, h, id)
            : isApp
              ? application(id, model, h)
              : documentation(id, model, h)
  const nav = Sidebar.sidebar(
    {
      state,
      belowHeader: id === '16',
      side: id === '14' ? 'right' : 'left',
      variant: id === '04' ? 'floating' : id === '08' ? 'inset' : 'sidebar',
      collapsible: isApp || id === '09' ? 'icon' : 'offcanvas',
      isMobileOpen: model.isMobileOpen,
      onMobileDismiss: Message['ToggledStyleXMobileSidebar'](),
      children: navigation,
    },
    h,
  )
  const main = Sidebar.sidebarInset(
    {
      variant: id === '08' ? 'inset' : 'sidebar',
      state,
      children: [
        ...(id === '16'
          ? []
          : id === '09'
            ? [
                h.header(
                  [h.Class(className(searchStyles.mailInsetHeader))],
                  [trigger(h), headerSeparator(h), crumbTrail(id, title, h)],
                ),
              ]
            : [
                blockHeader(
                  [
                    ...(id === '14' ? [] : [trigger(h), headerSeparator(h)]),
                    crumbTrail(id, title, h),
                    ...(id === '14' ? [rightTrigger(h)] : []),
                    ...(id === '10'
                      ? [
                          h.div(
                            [h.Class(className(searchStyles.headerActions))],
                            [
                              h.span(
                                [h.Class(className(searchStyles.editDate))],
                                ['Edit Oct 08'],
                              ),
                              button(
                                {
                                  children: [icon({ name: 'star' }, h)],
                                  variant: 'ghost',
                                  size: 'icon',
                                  layoutStyle: searchStyles.headerIconButton,
                                },
                                h,
                              ),
                              Popover.popover(
                                {
                                  model: model.popover,
                                  toParentMessage: message =>
                                    Message['GotStyleXSidebarPopover']({
                                      message,
                                    }),
                                  trigger: icon(
                                    {
                                      ariaLabel: 'Page actions',
                                      name: 'ellipsis',
                                    },
                                    h,
                                  ),
                                  triggerLayoutStyle:
                                    searchStyles.headerIconButton,
                                  content: Sidebar.sidebar(
                                    {
                                      collapsible: 'none',
                                      children: actionNav(h),
                                    },
                                    h,
                                  ),
                                  align: 'end',
                                },
                                h,
                              ),
                            ],
                          ),
                        ]
                      : []),
                  ],
                  id === '15',
                  h,
                  true,
                  /* TW-10/15 site headers use 'h-14' (3.5rem), not h-16. */
                  id === '10' || id === '15',
                ),
              ]),
        blockSkeleton(
          id === '02' || id === '09'
            ? 'rows'
            : id === '12'
              ? 'calendar'
              : id === '10'
                ? 'document'
                : id === '15'
                  ? 'documentTall'
                  : 'cards',
          h,
        ),
      ],
    },
    h,
  )
  const right =
    id === '15'
      ? [
          Sidebar.sidebar(
            {
              side: 'right',
              collapsible: 'offcanvas',
              children: calendarNav(model, h, 'left'),
            },
            h,
          ),
        ]
      : []
  return blockPage(
    [
      ...(id === '16'
        ? [
            /* TW-16 siteHeader: 'sticky top-0 z-50 border-b' header wrap
               > 'h-(--header-height) gap-2 px-4' row — trigger size-8 +
               separator 'mr-2 h-4' + breadcrumb + right-aligned search. */
            h.header(
              [h.Class(className(searchStyles.siteHeader16))],
              [
                h.div(
                  [h.Class(className(searchStyles.siteHeader16Row))],
                  [
                    headerTrigger16(h),
                    headerSeparator(h),
                    crumbTrail(id, title, h),
                    h.form(
                      [h.Class(className(searchStyles.headerForm))],
                      [
                        h.div(
                          [h.Class(className(searchStyles.headerBox))],
                          [
                            h.label(
                              [
                                h.For('stylex-sidebar-16-search'),
                                h.Class(className(searchStyles.srOnly)),
                              ],
                              ['Search'],
                            ),
                            Sidebar.sidebarInput(
                              {
                                id: 'stylex-sidebar-16-search',
                                value: model.query,
                                onInput: value =>
                                  Message['ChangedStyleXSidebarSearch']({
                                    value,
                                  }),
                                placeholder: 'Type to search...',
                                inputStyle: searchStyles.headerInput,
                              },
                              h,
                            ),
                            BaseIcon.icon(
                              'search',
                              { class: className(searchStyles.icon) },
                              h,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ]
        : []),
      Sidebar.sidebarProvider(
        {
          state,
          belowHeader: id === '16',
          ...(id === '09' ? { width: '350px' } : {}),
          ...(id === '04' ? { width: '19rem' } : {}),
          children: id === '14' ? [main, nav] : [nav, main, ...right],
        },
        h,
      ),
    ],
    h,
  )
}
