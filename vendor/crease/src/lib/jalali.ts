/* Jalaali (Persian) calendar conversion — jalaali-js leap table plus
   standard Fliegel–Van Flandern Julian-day conversions.
   Dates are plain {year, month, day} triples on both sides. */

export type JalaliDate = Readonly<{
  year: number
  month: number
  day: number
}>

export type GregorianDate = Readonly<{
  year: number
  month: number
  day: number
}>

const div = (a: number, b: number): number => Math.floor(a / b)
const mod = (a: number, b: number): number => a - Math.floor(a / b) * b

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
] as const

const jalCal = (
  jy: number,
): Readonly<{ leap: number; gy: number; march: number }> => {
  const gy = jy + 621
  let leapJ = -14
  let jp: number = BREAKS[0] ?? 0
  let jump = 0
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i] ?? jp
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}

const gregorianToJdn = (y: number, m: number, d: number): number => {
  const a = div(14 - m, 12)
  const y2 = y + 4800 - a
  const m2 = m + 12 * a - 3
  return (
    d +
    div(153 * m2 + 2, 5) +
    365 * y2 +
    div(y2, 4) -
    div(y2, 100) +
    div(y2, 400) -
    32045
  )
}

const jdnToGregorian = (jdn: number): GregorianDate => {
  const a = jdn + 32044
  const b = div(4 * a + 3, 146097)
  const c = a - div(146097 * b, 4)
  const d = div(4 * c + 3, 1461)
  const e = c - div(1461 * d, 4)
  const m = div(5 * e + 2, 153)
  return {
    year: 100 * b + d - 4800 + div(m, 10),
    month: m + 3 - 12 * div(m, 10),
    day: e - div(153 * m + 2, 5) + 1,
  }
}

const j2jdn = (jy: number, jm: number, jd: number): number => {
  const r = jalCal(jy)
  return (
    gregorianToJdn(jy + 621, 3, r.march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1
  )
}

export const toJalaali = (date: GregorianDate): JalaliDate => {
  const jdn = gregorianToJdn(date.year, date.month, date.day)
  let jy = date.year - 621
  let jdn1f = gregorianToJdn(jy + 621, 3, jalCal(jy).march)
  if (jdn < jdn1f) {
    jy -= 1
    jdn1f = gregorianToJdn(jy + 621, 3, jalCal(jy).march)
  }
  const k = jdn - jdn1f
  if (k <= 185) {
    return { year: jy, month: 1 + div(k, 31), day: mod(k, 31) + 1 }
  }
  const jm = 7 + div(k - 186, 30)
  return { year: jy, month: jm, day: mod(k - 186, 30) + 1 }
}

export const toGregorian = (date: JalaliDate): GregorianDate =>
  jdnToGregorian(j2jdn(date.year, date.month, date.day))

export const isJalaliLeap = (jy: number): boolean => jalCal(jy).leap === 0

export const jalaliMonthLength = (jy: number, jm: number): number =>
  jm <= 6 ? 31 : jm <= 11 ? 30 : isJalaliLeap(jy) ? 30 : 29

export type JalaliCell = JalaliDate & Readonly<{ inMonth: boolean }>

const jdnToJalaali = (jdn: number): JalaliDate => toJalaali(jdnToGregorian(jdn))

/** 6x7 grid of Jalali dates covering the view month; weeks start Saturday. */
export const jalaliMonthCells = (
  jy: number,
  jm: number,
): ReadonlyArray<JalaliCell> => {
  const first = toGregorian({ year: jy, month: jm, day: 1 })
  const firstWeekday = new Date(
    Date.UTC(first.year, first.month - 1, first.day),
  ).getUTCDay()
  const leading = mod(firstWeekday + 1, 7)
  const monthLength = jalaliMonthLength(jy, jm)
  const base = j2jdn(jy, jm, 1)
  const cells: Array<JalaliCell> = []
  for (let i = 0; i < 42; i += 1) {
    const date = jdnToJalaali(base - leading + i)
    cells.push({
      year: date.year,
      month: date.month,
      day: date.day,
      inMonth: i >= leading && i < leading + monthLength,
    })
  }
  return cells
}

export const FA_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

/** Saturday-first short weekday labels. */
export const FA_DAY_NAMES = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export const faDigits = (value: number): string =>
  String(value).replace(/\d/g, char => FA_DIGITS[Number(char)] ?? char)
