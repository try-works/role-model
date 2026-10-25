import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Option } from 'effect'
import { Match as M } from 'effect'
import type * as FoldkitCalendar from 'foldkit/calendar'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { Calendar as CalendarPrimitive } from '@foldkit/ui'

import * as CalendarBehavior from '@/lib/calendar'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { cellScope, dayScope } from './calendar.markers'
import { className } from './style'
import { tokens } from './tokens'

export const Model = CalendarPrimitive.Model
export type Model = typeof Model.Type
export const Message = CalendarPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = CalendarPrimitive.OutMessage
export type OutMessage = typeof OutMessage.Type
export const init = CalendarPrimitive.init
export const update = CalendarBehavior.update
export const selectDate = CalendarPrimitive.selectDate
export const focusDate = CalendarPrimitive.focusDate
export const reflectMinDate = CalendarPrimitive.reflectMinDate
export const reflectMaxDate = CalendarPrimitive.reflectMaxDate
export const reflectDisabledDates = CalendarPrimitive.reflectDisabledDates
export const reflectDisabledDaysOfWeek =
  CalendarPrimitive.reflectDisabledDaysOfWeek
export const dropToDays = CalendarPrimitive.dropToDays
export * from '@/lib/calendar'

const styles = {
  caption: Style.make({
    paddingInline: 'var(--cell-size)',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: 'var(--cell-size)',
    width: '100%',
  }),
  captionButton: Style.make({
    borderRadius: tokens.controlRadius,
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    height: '2rem',
    paddingLeft: '0.5rem',
    paddingRight: '0.25rem',
  }),
  dayButton: Style.make({
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    alignItems: 'center',
    aspectRatio: '1 / 1',
    backgroundClip: 'padding-box',
    backgroundColor: tokens.transparent,
    boxShadow: tokens.shadowNone,
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: 1,
    opacity: 1,
    outlineStyle: 'none',
    position: 'static',
    whiteSpace: 'nowrap',
    minWidth: 'var(--cell-size)',
    width: '100%',
  }).pipe(
    Style.when(When.within(dayScope, When.data('focused')), {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
      position: 'relative',
      zIndex: 10,
    }),
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
    Style.when(When.within(dayScope, When.data('selected')), {
      backgroundColor: tokens.primary,
      color: tokens.primaryForeground,
    }),
    Style.when(When.hover, {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
    Style.when(
      When.all(When.hover, When.within(dayScope, When.data('selected'))),
      { backgroundColor: tokens.primary, color: tokens.primaryForeground },
    ),
    Style.when(When.within(dayScope, When.data('outside-month')), {
      color: tokens.mutedForeground,
    }),
    Style.when(When.within(dayScope, When.data('disabled')), { opacity: 0.5 }),
  ),
  dayCell: Style.make({
    padding: 0,
    aspectRatio: '1 / 1',
    backgroundColor: tokens.transparent,
    color: tokens.foreground,
    opacity: 1,
    position: 'relative',
    textAlign: 'center',
    height: 'var(--cell-size)',
    width: 'var(--cell-width, var(--cell-size))',
  }).pipe(
    Style.when(When.data('today'), {
      borderRadius: tokens.controlRadius,
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.data('disabled'), {
      color: tokens.mutedForeground,
      opacity: 0.5,
    }),
    Style.when(When.data('outside-month'), { color: tokens.mutedForeground }),
  ),
  dayRange: Style.make({ backgroundColor: tokens.accent }),
  dayRangeMiddle: Style.make({ borderRadius: '0px' }),
  dayRangeStart: Style.make({
    borderBottomLeftRadius: tokens.controlRadius,
    borderTopLeftRadius: tokens.controlRadius,
  }),
  dayRangeEnd: Style.make({
    borderBottomRightRadius: tokens.controlRadius,
    borderTopRightRadius: tokens.controlRadius,
  }),
  dayRangeSingle: Style.make({ borderRadius: tokens.controlRadius }),
  dayRangeEndpointButton: Style.make({
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.primary,
      color: tokens.primaryForeground,
    }),
    Style.when(When.within(dayScope, When.data('outside-month')), {
      color: tokens.primaryForeground,
    }),
  ),
  grid: Style.make({
    borderCollapse: 'collapse',
    outlineStyle: 'none',
    width: '100%',
  }),
  headerRow: Style.make({ display: 'flex' }),
  heading: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  navIcon: Style.make({ flexShrink: 0, height: '1rem', width: '1rem' }),
  captionIcon: Style.make({
    color: tokens.mutedForeground,
    height: '0.875rem',
    width: '0.875rem',
  }),
  month: Style.make({
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    width: '100%',
  }),
  nav: Style.make({
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
  }),
  navButton: Style.make({
    padding: 0,
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundClip: 'padding-box',
    backgroundColor: tokens.transparent,
    boxShadow: tokens.shadowNone,
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    opacity: 1,
    outlineStyle: 'none',
    pointerEvents: 'auto',
    whiteSpace: 'nowrap',
    height: 'var(--cell-size)',
    width: 'var(--cell-size)',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
    Style.when(When.aria('expanded', 'true'), {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
    Style.when(When.hover, {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
    Style.when(When.pseudo(':is([data-disabled], [aria-disabled="true"])'), {
      opacity: 0.5,
    }),
  ),
  pickerButton: Style.make({
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundClip: 'padding-box',
    backgroundColor: tokens.transparent,
    boxShadow: tokens.shadowNone,
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    opacity: 1,
    outlineStyle: 'none',
    position: 'static',
    whiteSpace: 'nowrap',
    height: 'var(--cell-size)',
    width: '100%',
  }).pipe(
    Style.when(When.within(cellScope, When.data('focused')), {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
      position: 'relative',
      zIndex: 10,
    }),
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
    Style.when(When.within(cellScope, When.data('selected')), {
      backgroundColor: tokens.primary,
      color: tokens.primaryForeground,
    }),
    Style.when(When.hover, {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
    Style.when(
      When.all(When.hover, When.within(cellScope, When.data('selected'))),
      { backgroundColor: tokens.primary, color: tokens.primaryForeground },
    ),
    Style.when(When.within(cellScope, When.data('disabled')), { opacity: 0.5 }),
  ),
  pickerCell: Style.make({
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: tokens.foreground,
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'center',
    lineHeight: '1.25rem',
    opacity: 1,
    height: 'var(--cell-size)',
  }).pipe(
    Style.when(When.data('today'), {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.data('disabled'), {
      color: tokens.mutedForeground,
      opacity: 0.5,
    }),
  ),
  pickerGrid: Style.make({
    gap: '0.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    outlineStyle: 'none',
  }),
  root: Style.make({
    padding: '0.75rem',
    backgroundColor: tokens.background,
    width: 'fit-content',
  }),
  rootFlush: Style.make({ padding: 0 }),
  week: Style.make({ display: 'flex', marginTop: '0.5rem', width: '100%' }),
  weekday: Style.make({
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    fontSize: '0.8rem',
    fontWeight: 400,
    justifyContent: 'center',
    height: 'var(--cell-size)',
    width: 'var(--cell-width, var(--cell-size))',
  }),
  weekNumber: Style.make({
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    fontSize: '0.8rem',
    fontWeight: 400,
    justifyContent: 'center',
    height: 'var(--cell-size)',
    width: 'var(--cell-size)',
  }),
}

export type CalendarViewOptions = Readonly<{
  /** 'dropdown' keeps the heading button that drills into the month/year
   * pickers. 'label' renders plain text — no button, no chevron. */
  captionLayout?: 'label' | 'dropdown'
  /** 'flush' removes the root padding — the calendar's own frame inside a
   * card, mirroring `p-0` on the Tailwind skin. */
  density?: 'default' | 'flush'
  direction?: 'ltr' | 'rtl'
  layoutStyle?: ComponentLayoutStyle | undefined
  range?: CalendarBehavior.CalendarRange
  size?: 'default' | 'comfortable'
  /** Overrides --cell-size directly (e.g. TW sidebar-15's w-[33px] cells). */
  cellWidth?: string
  weekNumbers?: boolean
}>

const captionHeading = <Msg>(
  heading: Readonly<{ id: string; text: string }>,
  headingButton: ReadonlyArray<ChildAttribute>,
  options: CalendarViewOptions,
  h: HtmlBuilder<Msg>,
): Html =>
  options.captionLayout === 'label'
    ? h.div(
        [h.Id(heading.id), h.Class(className(styles.heading))],
        [heading.text],
      )
    : h.button(
        [
          ...headingButton,
          h.Id(heading.id),
          h.Class(className(reset.button, styles.captionButton)),
        ],
        [
          heading.text,
          Icon.chevronDown({ class: className(styles.captionIcon) }, h),
        ],
      )
const navigationButton = <Msg>(
  attributes: ReadonlyArray<ChildAttribute>,
  direction: 'previous' | 'next',
  options: CalendarViewOptions,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [...attributes, h.Class(className(reset.button, styles.navButton))],
    [
      (direction === 'previous') !== (options.direction === 'rtl')
        ? Icon.chevronLeft({ class: className(styles.navIcon) }, h)
        : Icon.chevronRight({ class: className(styles.navIcon) }, h),
    ],
  )

const isoWeekNumber = (date: FoldkitCalendar.CalendarDate): number => {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day))
  utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7) + 3)
  const firstThursday = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4))
  firstThursday.setUTCDate(
    firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3,
  )
  return (
    1 +
    Math.round(
      (utc.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
  )
}

const daysView = <Msg>(
  attributes: CalendarPrimitive.DaysModeAttributes,
  options: CalendarViewOptions,
  h: HtmlBuilder<Msg>,
): Html => {
  const weekdays = attributes.columnHeaders.map(column =>
    h.div(
      [...column.attributes, h.Class(className(styles.weekday))],
      [column.name],
    ),
  )
  const weeks = attributes.weeks.map(week =>
    h.div(
      [...week.attributes, h.Class(className(styles.week))],
      [
        ...(options.weekNumbers === true
          ? [
              h.div(
                [
                  h.Class(className(styles.weekNumber)),
                  h.DataAttribute('slot', 'calendar-week-number'),
                ],
                [
                  week.cells[0] === undefined
                    ? ''
                    : String(isoWeekNumber(week.cells[0].date)),
                ],
              ),
            ]
          : []),
        ...week.cells.map(cell => {
          const position = CalendarBehavior.rangePosition(
            cell.date,
            options.range,
          )
          return h.div(
            [
              ...cell.cellAttributes,
              h.DataAttribute('range', position),
              h.Class(
                className(
                  styles.dayCell,
                  position !== 'outside' && styles.dayRange,
                  position === 'middle' && styles.dayRangeMiddle,
                  position === 'start' && styles.dayRangeStart,
                  position === 'end' && styles.dayRangeEnd,
                  position === 'single' && styles.dayRangeSingle, // eslint-disable-next-line no-restricted-syntax -- reason: defineMarker scopes are stylex.props-compatible but absent from the narrow Style.Style surface.
                  dayScope as unknown as Style.Style,
                ),
              ),
            ],
            [
              h.button(
                [
                  ...cell.buttonAttributes,
                  h.DataAttribute('slot', 'calendar-day'),
                  h.Class(
                    className(
                      reset.button,
                      styles.dayButton,
                      (position === 'start' ||
                        position === 'end' ||
                        position === 'single') &&
                        styles.dayRangeEndpointButton,
                    ),
                  ),
                ],
                [cell.label],
              ),
            ],
          )
        }),
      ],
    ),
  )
  return h.div(
    [
      ...attributes.root,
      ...(options.direction === undefined ? [] : [h.Dir(options.direction)]),
      h.DataAttribute('slot', 'calendar'),
      h.Style({
        '--cell-size': options.size === 'comfortable' ? '2.5rem' : '2rem',
        '--cell-width': options.cellWidth ?? 'var(--cell-size)',
      }),
      h.Class(
        className(
          styles.root,
          options.density === 'flush' && styles.rootFlush,
          options.layoutStyle,
        ),
      ),
    ],
    [
      h.div(
        [h.Class(className(styles.month))],
        [
          h.div(
            [h.Class(className(styles.nav))],
            [
              navigationButton(
                attributes.previousMonthButton,
                'previous',
                options,
                h,
              ),
              navigationButton(attributes.nextMonthButton, 'next', options, h),
            ],
          ),
          h.div(
            [h.Class(className(styles.caption))],
            [
              captionHeading(
                attributes.heading,
                attributes.headingButton,
                options,
                h,
              ),
            ],
          ),
          h.div(
            [...attributes.grid, h.Class(className(styles.grid))],
            [
              h.div(
                [...attributes.headerRow, h.Class(className(styles.headerRow))],
                [
                  ...(options.weekNumbers === true
                    ? [h.div([h.Class(className(styles.weekNumber))], [])]
                    : []),
                  ...weekdays,
                ],
              ),
              ...weeks,
            ],
          ),
        ],
      ),
    ],
  )
}

const pickerView = <Msg>(
  attributes: CalendarPrimitive.MonthsModeAttributes,
  options: CalendarViewOptions,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      ...attributes.root,
      ...(options.direction === undefined ? [] : [h.Dir(options.direction)]),
      h.DataAttribute('slot', 'calendar'),
      h.Style({
        '--cell-size': options.size === 'comfortable' ? '2.5rem' : '2rem',
        '--cell-width': options.cellWidth ?? 'var(--cell-size)',
      }),
      h.Class(
        className(
          styles.root,
          options.density === 'flush' && styles.rootFlush,
          options.layoutStyle,
        ),
      ),
    ],
    [
      h.div(
        [h.Class(className(styles.month))],
        [
          h.div(
            [h.Class(className(styles.caption))],
            [
              captionHeading(
                attributes.heading,
                attributes.headingButton,
                options,
                h,
              ),
            ],
          ),
          h.div(
            [...attributes.grid, h.Class(className(styles.pickerGrid))],
            attributes.cells.map(cell =>
              h.div(
                [
                  ...cell.cellAttributes,
                  h.Class(
                    className(
                      styles.pickerCell, // eslint-disable-next-line no-restricted-syntax -- reason: defineMarker scopes are stylex.props-compatible but absent from the narrow Style.Style surface.
                      cellScope as unknown as Style.Style,
                    ),
                  ),
                ],
                [
                  h.button(
                    [
                      ...cell.buttonAttributes,
                      h.Class(className(reset.button, styles.pickerButton)),
                    ],
                    [cell.shortLabel],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

const yearsView = <Msg>(
  attributes: CalendarPrimitive.YearsModeAttributes,
  options: CalendarViewOptions,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      ...attributes.root,
      ...(options.direction === undefined ? [] : [h.Dir(options.direction)]),
      h.DataAttribute('slot', 'calendar'),
      h.Style({
        '--cell-size': options.size === 'comfortable' ? '2.5rem' : '2rem',
        '--cell-width': options.cellWidth ?? 'var(--cell-size)',
      }),
      h.Class(
        className(
          styles.root,
          options.density === 'flush' && styles.rootFlush,
          options.layoutStyle,
        ),
      ),
    ],
    [
      h.div(
        [h.Class(className(styles.month))],
        [
          h.div(
            [h.Class(className(styles.nav))],
            [
              navigationButton(
                attributes.previousPageButton,
                'previous',
                options,
                h,
              ),
              navigationButton(attributes.nextPageButton, 'next', options, h),
            ],
          ),
          h.div(
            [h.Class(className(styles.caption))],
            [
              h.div(
                [
                  h.Id(attributes.heading.id),
                  h.Class(className(styles.heading)),
                ],
                [attributes.heading.text],
              ),
            ],
          ),
          h.div(
            [...attributes.grid, h.Class(className(styles.pickerGrid))],
            attributes.cells.map(cell =>
              h.div(
                [
                  ...cell.cellAttributes,
                  h.Class(
                    className(
                      styles.pickerCell, // eslint-disable-next-line no-restricted-syntax -- reason: defineMarker scopes are stylex.props-compatible but absent from the narrow Style.Style surface.
                      cellScope as unknown as Style.Style,
                    ),
                  ),
                ],
                [
                  h.button(
                    [
                      ...cell.buttonAttributes,
                      h.Class(className(reset.button, styles.pickerButton)),
                    ],
                    [cell.label],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

export const calendarView = <Msg>(
  attributes: CalendarPrimitive.CalendarAttributes,
  options: CalendarViewOptions,
  h: HtmlBuilder<Msg>,
): Html =>
  M.value(attributes).pipe(
    M.withReturnType<Html>(),
    M.tagsExhaustive({
      Days: days => daysView(days, options, h),
      Months: months => pickerView(months, options, h),
      Years: years => yearsView(years, options, h),
    }),
  )

export type CalendarProps<Msg> = Readonly<{
  model: Model
  maybeSelectedDate: Option.Option<FoldkitCalendar.CalendarDate>
  toParentMessage: (message: Message) => Msg
  /** 'dropdown' keeps the heading button that drills into the month/year
   * pickers. 'label' renders plain text — no button, no chevron. */
  captionLayout?: 'label' | 'dropdown'
  /** 'flush' removes the root padding — the calendar's own frame inside a
   * card, mirroring `p-0` on the Tailwind skin. */
  density?: 'default' | 'flush'
  direction?: 'ltr' | 'rtl'
  range?: CalendarBehavior.CalendarRange
  layoutStyle?: ComponentLayoutStyle | undefined
  size?: 'default' | 'comfortable'
  /** Overrides --cell-size directly (e.g. TW sidebar-15's w-[33px] cells). */
  cellWidth?: string
  weekNumbers?: boolean
  previousMonthLabel?: string
  nextMonthLabel?: string
  previousYearsPageLabel?: string
  nextYearsPageLabel?: string
  daysHeadingButtonLabel?: string
  monthsHeadingButtonLabel?: string
}>
export const calendar = <Msg>(
  props: CalendarProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: CalendarPrimitive.view,
    viewInputs: {
      maybeSelectedDate: props.maybeSelectedDate,
      toView: attributes =>
        calendarView(
          attributes,
          {
            ...(props.captionLayout === undefined
              ? {}
              : { captionLayout: props.captionLayout }),
            ...(props.density === undefined ? {} : { density: props.density }),
            ...(props.direction === undefined
              ? {}
              : { direction: props.direction }),
            ...(props.range === undefined ? {} : { range: props.range }),
            ...(props.layoutStyle === undefined
              ? {}
              : { layoutStyle: props.layoutStyle }),
            ...(props.size === undefined ? {} : { size: props.size }),
            ...(props.cellWidth === undefined
              ? {}
              : { cellWidth: props.cellWidth }),
            ...(props.weekNumbers === undefined
              ? {}
              : { weekNumbers: props.weekNumbers }),
          },
          h,
        ),
      ...(props.previousMonthLabel === undefined
        ? {}
        : { previousMonthLabel: props.previousMonthLabel }),
      ...(props.nextMonthLabel === undefined
        ? {}
        : { nextMonthLabel: props.nextMonthLabel }),
      ...(props.previousYearsPageLabel === undefined
        ? {}
        : { previousYearsPageLabel: props.previousYearsPageLabel }),
      ...(props.nextYearsPageLabel === undefined
        ? {}
        : { nextYearsPageLabel: props.nextYearsPageLabel }),
      ...(props.daysHeadingButtonLabel === undefined
        ? {}
        : { daysHeadingButtonLabel: props.daysHeadingButtonLabel }),
      ...(props.monthsHeadingButtonLabel === undefined
        ? {}
        : { monthsHeadingButtonLabel: props.monthsHeadingButtonLabel }),
    },
    toParentMessage: message =>
      props.toParentMessage(
        props.direction === 'rtl'
          ? CalendarBehavior.mirrorNavigationKeyForRtl(message)
          : message,
      ),
  })
