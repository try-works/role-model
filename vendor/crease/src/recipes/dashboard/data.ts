import { Schema as S } from 'effect'

export const User = S.Struct({
  id: S.String,
  name: S.String,
  email: S.String,
  role: S.Literals(['Admin', 'Member', 'Viewer']),
  status: S.Literals(['Active', 'Invited', 'Inactive']),
  joined: S.String,
})
export type User = typeof User.Type

const people: [string, string, User['role'], User['status']][] = [
  ['Olivia Rhye', 'olivia@forma.co', 'Admin', 'Active'],
  ['Phoenix Baker', 'phoenix@forma.co', 'Member', 'Active'],
  ['Lana Steiner', 'lana@forma.co', 'Member', 'Active'],
  ['Demi Wilkinson', 'demi@forma.co', 'Viewer', 'Invited'],
  ['Drew Cano', 'drew@forma.co', 'Member', 'Active'],
  ['Natali Craig', 'natali@forma.co', 'Admin', 'Active'],
  ['Orlando Diggs', 'orlando@forma.co', 'Member', 'Inactive'],
  ['Andi Lane', 'andi@forma.co', 'Member', 'Active'],
  ['Kate Morrison', 'kate@forma.co', 'Viewer', 'Active'],
  ['Koray Okumus', 'koray@forma.co', 'Member', 'Active'],
  ['Alex Morgan', 'alex@forma.co', 'Admin', 'Active'],
  ['Sophie Moore', 'sophie@forma.co', 'Viewer', 'Invited'],
  ['James Wilson', 'james@forma.co', 'Member', 'Active'],
  ['Emma Davis', 'emma@forma.co', 'Member', 'Active'],
  ['Noah Kim', 'noah@forma.co', 'Member', 'Active'],
  ['Isabella Chen', 'isabella@forma.co', 'Viewer', 'Inactive'],
  ['Liam Patel', 'liam@forma.co', 'Member', 'Active'],
  ['Mia Anderson', 'mia@forma.co', 'Member', 'Invited'],
  ['Ethan Brooks', 'ethan@forma.co', 'Viewer', 'Active'],
  ['Ava Thompson', 'ava@forma.co', 'Member', 'Active'],
  ['Lucas Martin', 'lucas@forma.co', 'Member', 'Active'],
  ['Amelia Scott', 'amelia@forma.co', 'Viewer', 'Active'],
  ['Benjamin Lee', 'benjamin@forma.co', 'Member', 'Invited'],
  ['Charlotte Evans', 'charlotte@forma.co', 'Member', 'Active'],
]
export const seedUsers: User[] = people.map(
  ([name, email, role, status], i) => ({
    id: `user-${i + 1}`,
    name,
    email,
    role,
    status,
    joined: `2026-09-${String(3 + i).padStart(2, '0')}`,
  }),
)

export const Settings = S.Struct({
  workspace: S.String,
  email: S.String,
  timezone: S.String,
  currency: S.String,
  description: S.String,
  weekly: S.Boolean,
  security: S.Boolean,
  product: S.Boolean,
})
export type Settings = typeof Settings.Type
export const defaultSettings: Settings = {
  workspace: 'Forma',
  email: 'alex@forma.co',
  timezone: 'Europe/Berlin',
  currency: 'USD',
  description: 'A little space for our team to do great work.',
  weekly: true,
  security: true,
  product: false,
}

export const ranges = {
  '7d': {
    label: 'Last 7 days',
    dates: ['Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8', 'Oct 9'],
    current: [1100, 1400, 1250, 1780, 1560, 1820, 2090],
    previous: [900, 1100, 1050, 1400, 1200, 1550, 1640],
    customers: 612,
    subscriptions: 84,
    rate: '4.6%',
  },
  '30d': {
    label: 'Last 30 days',
    dates: [
      'Sep 10',
      'Sep 13',
      'Sep 16',
      'Sep 19',
      'Sep 22',
      'Sep 25',
      'Sep 28',
      'Oct 1',
      'Oct 4',
      'Oct 7',
      'Oct 9',
    ],
    current: [2600, 3200, 2850, 4250, 3800, 4500, 4100, 5500, 4950, 5870, 6200],
    previous: [
      2100, 2600, 2400, 3200, 3150, 3650, 3250, 4300, 4050, 4700, 4850,
    ],
    customers: 2420,
    subscriptions: 384,
    rate: '4.8%',
  },
  '90d': {
    label: 'Last 90 days',
    dates: [
      'Jul 12',
      'Jul 21',
      'Jul 30',
      'Aug 8',
      'Aug 17',
      'Aug 26',
      'Sep 4',
      'Sep 13',
      'Sep 22',
      'Oct 1',
      'Oct 9',
    ],
    current: [
      7400, 9200, 8700, 10800, 9500, 12000, 13200, 12800, 14500, 17800, 18900,
    ],
    previous: [
      6200, 7600, 7300, 8800, 8200, 10500, 11000, 10800, 12700, 14300, 15500,
    ],
    customers: 7186,
    subscriptions: 1128,
    rate: '5.1%',
  },
} as const
export type Range = keyof typeof ranges
export const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
export const number = (value: number) =>
  new Intl.NumberFormat('en-US').format(value)
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
