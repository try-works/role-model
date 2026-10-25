/* Deterministic seed data for the tablecn demo block — mirrors
   tablecn/src/app/lib/utils.ts (tasks) and tablecn/src/app/data-grid/lib/seeds.ts
   (people) field shapes, with a seeded RNG so both renderers show identical
   data. */

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskLabel = 'bug' | 'feature' | 'enhancement' | 'documentation'

export interface Task {
  id: string
  code: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  label: TaskLabel
  estimatedHours: number
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

export const taskStatuses: ReadonlyArray<TaskStatus> = [
  'todo',
  'in-progress',
  'done',
  'canceled',
]
export const taskPriorities: ReadonlyArray<TaskPriority> = [
  'low',
  'medium',
  'high',
]
export const taskLabels: ReadonlyArray<TaskLabel> = [
  'bug',
  'feature',
  'enhancement',
  'documentation',
]

/* mulberry32 — small seeded PRNG so the demo data is stable. */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(rand: () => number, items: ReadonlyArray<T>): T =>
  items[Math.floor(rand() * items.length)] ?? items[0]!

const int = (rand: () => number, min: number, max: number): number =>
  min + Math.floor(rand() * (max - min + 1))

/* faker.hacker.phrase() — "{verb} the {adjective} {abbreviation} {noun}"-ish.
   Small word lists approximating the same flavor. */
const hackerVerbs = [
  'Parse',
  'Override',
  'Back up',
  'Bypass',
  'Hack',
  'Compress',
  'Connect',
  'Copy',
  'Quantify',
  'Program',
  'Synthesize',
  'Transmit',
  'Index',
  'Navigate',
  'Calculate',
  'Reboot',
  'Input',
  'Generate',
  'Synthesize',
]
const hackerAdjectives = [
  'auxiliary',
  'primary',
  'open-source',
  'wireless',
  'online',
  'virtual',
  'digital',
  'back-end',
  'multi-byte',
  'redundant',
  '1080p',
  'optical',
  'mobile',
  'cross-platform',
  'neural',
  'haptic',
  'solid state',
  'bluetooth',
]
const hackerAbbreviations = [
  'TCP',
  'HTTP',
  'SDD',
  'RAM',
  'GB',
  'CSS',
  'SSL',
  'AGP',
  'SQL',
  'FTP',
  'JSON',
  'AI',
  'IB',
  'USB',
  'PNG',
  'SMTP',
  'RSS',
  'THX',
  'API',
  'ADP',
]
const hackerNouns = [
  'hard drive',
  'monitor',
  'application',
  'pixel',
  'array',
  'bus',
  'bandwidth',
  'driver',
  'firewall',
  'alarm',
  'program',
  'matrix',
  'transmitter',
  'sensor',
  'circuit',
  'panel',
  'system',
  'interface',
  'microchip',
  'card',
  'capacitor',
  'port',
  'feed',
  'protocol',
]

const hackerPhrase = (rand: () => number): string => {
  const phrase = `${pick(rand, hackerVerbs)} the ${pick(rand, hackerAdjectives)} ${pick(rand, hackerAbbreviations)} ${pick(rand, hackerNouns)}`
  return phrase
}

const taskId = (rand: () => number): string =>
  `task_${int(rand, 0, 0xffffff).toString(36).padStart(5, '0')}`

const daysAgo = (rand: () => number, maxDays: number): Date => {
  const offset = rand() * maxDays * 24 * 60 * 60 * 1000
  return new Date(Date.now() - offset)
}

export const generateTasks = (count: number, seed = 42): Array<Task> => {
  const rand = mulberry32(seed)
  const codes = new Set<string>()
  return Array.from({ length: count }, () => {
    let code = `TASK-${String(int(rand, 0, 9999)).padStart(4, '0')}`
    while (codes.has(code)) {
      code = `TASK-${String(int(rand, 0, 9999)).padStart(4, '0')}`
    }
    codes.add(code)
    const createdAt = daysAgo(rand, 30)
    return {
      id: taskId(rand),
      code,
      title: hackerPhrase(rand),
      estimatedHours: int(rand, 1, 24),
      status: pick(rand, taskStatuses),
      label: pick(rand, taskLabels),
      priority: pick(rand, taskPriorities),
      archived: rand() < 0.2,
      createdAt,
      updatedAt: new Date(
        createdAt.getTime() + rand() * (Date.now() - createdAt.getTime()),
      ),
    }
  })
}

/* ---- data-grid people (mirrors tablecn seeds.ts field shapes) ---- */

import type { DataGridColumn, DataGridConfig, FileCellData } from './data-grid'
export type { FileCellData }

export interface Person {
  id: string
  name?: string | undefined
  age?: number | undefined
  email?: string | undefined
  website?: string | undefined
  notes?: string | undefined
  salary?: number | undefined
  department?: string | undefined
  status?: string | undefined
  skills?: Array<string> | undefined
  isActive?: boolean | undefined
  startDate?: string | undefined
  attachments?: Array<FileCellData> | undefined
}

export const departments = [
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
] as const

export const personStatuses = [
  'Active',
  'On Leave',
  'Remote',
  'In Office',
] as const

export const skills = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'SQL',
  'AWS',
  'Docker',
  'Git',
  'Agile',
] as const

const personNotes = [
  'Excellent team player with strong communication skills. Consistently meets deadlines and delivers high-quality work.',
  'Currently working on the Q4 project initiative. Requires additional training in advanced analytics tools.',
  'Relocated from the Seattle office last month. Adjusting well to the new team dynamics and company culture.',
  'Submitted request for professional development courses. Shows great initiative in learning new technologies.',
  'Outstanding performance in the last quarter. Recommended for leadership training program next year.',
  'Recently completed certification in project management. Looking to take on more responsibility in upcoming projects.',
  'Needs improvement in time management. Working with mentor to develop better organizational skills.',
  'Transferred from the marketing department. Bringing valuable cross-functional experience to the team.',
  'On track for promotion consideration. Has exceeded expectations in client relationship management.',
  'Participating in the company mentorship program. Showing strong potential for career advancement.',
  'Recently returned from parental leave. Successfully reintegrated into current project workflows.',
  'Fluent in three languages. Often assists with international client communications and translations.',
  'Leading the diversity and inclusion initiative. Organizing monthly team building events and workshops.',
  'Requested flexible work arrangement for family care. Maintaining productivity while working remotely.',
  'Completed advanced training in data visualization. Now serving as the team\u2019s go-to expert for dashboards.',
  `This employee has demonstrated exceptional growth over the past year. Starting as a junior developer, they quickly mastered our tech stack and began contributing to major features within their first month.\n\nKey accomplishments include:\n- Led the migration of our legacy authentication system to OAuth 2.0\n- Reduced API response times by 40% through query optimization\n- Mentored two interns who are now full-time employees\n- Presented at three internal tech talks on React best practices\n\nAreas for continued development:\n- Public speaking skills for external conferences\n- Cross-team collaboration on larger initiatives\n\nOverall, this is one of our strongest performers and a key contributor to team morale. Highly recommended for the senior engineer promotion track.`,
  `Performance Review Summary - Q4 2024\n\nStrengths:\nThe employee consistently demonstrates strong problem-solving abilities and technical expertise. They have taken ownership of several critical projects and delivered them on time with high quality.\n\nGrowth Areas:\n- Documentation could be more thorough\n- Sometimes takes on too much work without delegating\n- Could benefit from more proactive communication\n\nGoals for Next Quarter:\n1. Complete AWS Solutions Architect certification\n2. Lead the new customer dashboard project\n3. Improve test coverage to 85% on owned modules\n4. Participate in at least two cross-functional initiatives\n\nManager Notes:\nThis team member is a valuable asset to the organization. Their dedication and work ethic serve as an example for others. We should ensure they have opportunities for advancement to retain this talent long-term.`,
]

const firstNames = [
  'Alice',
  'Bruno',
  'Chloe',
  'Derek',
  'Emma',
  'Felix',
  'Grace',
  'Hana',
  'Igor',
  'Julia',
  'Kai',
  'Lena',
  'Marco',
  'Nadia',
  'Oscar',
  'Priya',
  'Quentin',
  'Rosa',
  'Sam',
  'Tara',
  'Umar',
  'Vera',
  'Wade',
  'Xenia',
  'Yusuf',
  'Zoe',
  'Adrian',
  'Bianca',
  'Carlos',
  'Dina',
]
const lastNames = [
  'Anderson',
  'Bauer',
  'Chen',
  'Dubois',
  'Evans',
  'Fischer',
  'Garcia',
  'Hoffman',
  'Ivanov',
  'Johnson',
  'Kim',
  'Lopez',
  'Muller',
  'Novak',
  'Osei',
  'Petrov',
  'Quinn',
  'Rossi',
  'Silva',
  'Tanaka',
  'Ueda',
  'Varga',
  'Weber',
  'Xu',
  'Yamamoto',
  'Zhang',
]
const domains = ['example.com', 'mail.dev', 'web.org', 'company.io', 'site.net']
const siteHosts = [
  'https://www.site.com',
  'https://portfolio.dev',
  'https://blog.io',
  'https://projects.example.org',
  'https://page.net',
  'https://work.dev',
]

const pickN = <T>(
  rand: () => number,
  items: ReadonlyArray<T>,
  min: number,
  max: number,
): Array<T> => {
  const count = int(rand, min, max)
  const copy = [...items]
  const out: Array<T> = []
  for (let i = 0; i < count && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]!)
  }
  return out
}

const sampleFiles = [
  { name: 'Resume.pdf', type: 'application/pdf', sizeRange: [50, 500] },
  { name: 'Contract.pdf', type: 'application/pdf', sizeRange: [100, 300] },
  { name: 'ID_Document.pdf', type: 'application/pdf', sizeRange: [200, 400] },
  { name: 'Profile_Photo.jpg', type: 'image/jpeg', sizeRange: [500, 2000] },
  {
    name: 'Presentation.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeRange: [1000, 5000],
  },
  { name: 'Report.docx', type: 'application/pdf', sizeRange: [100, 800] },
  {
    name: 'Timesheet.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeRange: [50, 200] as const,
  },
  {
    name: 'Certificate.pdf',
    type: 'application/pdf',
    sizeRange: [200, 500] as const,
  },
  {
    name: 'Background_Check.pdf',
    type: 'application/pdf',
    sizeRange: [300, 600] as const,
  },
] as const

const personId = (rand: () => number): string =>
  `person_${int(rand, 0, 0xffffff).toString(36).padStart(5, '0')}`

export const generatePeople = (count: number, seed = 12345): Array<Person> => {
  const rand = mulberry32(seed)
  return Array.from({ length: count }, (_, index) => {
    const firstName = pick(rand, firstNames)
    const lastName = pick(rand, lastNames)
    const fileCount = int(rand, 0, 3)
    const files = pickN(rand, sampleFiles, 0, Math.min(fileCount, 3))
    const attachments: Array<FileCellData> = files.map((file, fileIndex) => ({
      id: `${String(index + 1)}-file-${String(fileIndex)}`,
      name: file.name,
      size: int(rand, file.sizeRange[0], file.sizeRange[1]) * 1024,
      type: file.type,
      url: `https://example.com/files/${String(index + 1)}/${file.name}`,
    }))
    const year = int(rand, 2018, 2023)
    const month = int(rand, 1, 12)
    const day = int(rand, 1, 28)
    return {
      id: personId(rand),
      name: `${firstName} ${lastName}`,
      age: int(rand, 22, 65),
      email: `${firstName}.${lastName}@${pick(rand, domains)}`.toLowerCase(),
      website: `${pick(rand, siteHosts)}/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      notes: pick(rand, personNotes),
      salary: int(rand, 400, 1500) * 100,
      department: pick(rand, departments),
      status: pick(rand, personStatuses),
      isActive: rand() < 0.5,
      startDate: `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      skills: pickN(rand, skills, 1, 5),
      attachments,
    }
  })
}

/* ---- data-grid column config for the Person demo rows ---- */

export const personDataGridColumns: ReadonlyArray<DataGridColumn<Person>> = [
  {
    id: 'name',
    header: 'Name',
    iconName: 'text-align-start',
    width: 160,
    variant: 'text',
    get: p => p.name ?? '',
    set: (p, v) => ({ ...p, name: v }),
  },
  {
    id: 'age',
    header: 'Age',
    iconName: 'hash',
    width: 80,
    variant: 'number',
    numberMin: 18,
    numberMax: 100,
    numberStep: 1,
    get: p => (p.age === undefined ? '' : String(p.age)),
    set: (p, v) => ({ ...p, age: Number(v) || undefined }),
  },
  {
    id: 'email',
    header: 'Email',
    iconName: 'mail',
    width: 220,
    variant: 'text',
    get: p => p.email ?? '',
    set: (p, v) => ({ ...p, email: v }),
  },
  {
    id: 'website',
    header: 'Website',
    iconName: 'globe',
    width: 200,
    variant: 'url',
    get: p => p.website ?? '',
    set: (p, v) => ({ ...p, website: v }),
  },
  {
    id: 'notes',
    header: 'Notes',
    iconName: 'file-text',
    width: 320,
    variant: 'long-text',
    get: p => p.notes ?? '',
    set: (p, v) => ({ ...p, notes: v }),
  },
  {
    id: 'salary',
    header: 'Salary',
    iconName: 'hash',
    width: 120,
    variant: 'number',
    numberMin: 0,
    numberStep: 1000,
    get: p => (p.salary === undefined ? '' : String(p.salary)),
    set: (p, v) => ({ ...p, salary: Number(v) || undefined }),
  },
  {
    id: 'department',
    header: 'Department',
    iconName: 'building-2',
    width: 160,
    variant: 'select',
    options: departments,
    get: p => p.department ?? '',
    set: (p, v) => ({ ...p, department: v }),
  },
  {
    id: 'status',
    header: 'Status',
    iconName: 'list-checks',
    width: 140,
    variant: 'select',
    options: personStatuses,
    get: p => p.status ?? '',
    set: (p, v) => ({ ...p, status: v }),
  },
  {
    id: 'skills',
    header: 'Skills',
    iconName: 'tags',
    width: 200,
    variant: 'multi-select',
    options: skills,
    get: p => (p.skills ?? []).join(', '),
    getOptions: p => p.skills ?? [],
    set: (p, v) => ({
      ...p,
      skills: v === '' ? [] : v.split(',').map(s => s.trim()),
    }),
  },
  {
    id: 'isActive',
    header: 'Active',
    iconName: 'square-check',
    width: 90,
    variant: 'checkbox',
    get: p => (p.isActive === true ? 'true' : 'false'),
    getBoolean: p => p.isActive === true,
    set: (p, v) => ({ ...p, isActive: v === 'true' }),
  },
  {
    id: 'startDate',
    header: 'Start Date',
    iconName: 'calendar',
    width: 140,
    variant: 'date',
    get: p => p.startDate ?? '',
    set: (p, v) => ({ ...p, startDate: v }),
  },
  {
    id: 'attachments',
    header: 'Attachments',
    iconName: 'paperclip',
    width: 180,
    variant: 'file',
    maxFiles: 5,
    get: p => (p.attachments ?? []).map(file => file.name).join(', '),
    getFiles: p => p.attachments ?? [],
    setFiles: (p, files) => ({ ...p, attachments: [...files] }),
    set: (p, v) => (v === '' ? { ...p, attachments: [] } : p),
  },
]

export const personDataGridConfig: DataGridConfig<Person> = {
  columns: personDataGridColumns,
  rowKey: p => p.id,
  createRow: key => ({ id: key, skills: [], attachments: [] }),
}

/* ---------- tasks data-table config (faceted data-table component) ---------- */

import type { DataTableConfig } from '@/lib/data-table-state'

const statusRank: Record<TaskStatus, number> = {
  todo: 0,
  'in-progress': 1,
  done: 2,
  canceled: 3,
}
const priorityRank: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

export const taskDataTableConfig: DataTableConfig<Task> = {
  columns: [
    {
      id: 'code',
      header: 'Task',
      get: task => task.code,
    },
    {
      id: 'title',
      header: 'Title',
      get: task => task.title,
    },
    {
      id: 'label',
      header: 'Labels',
      get: task => task.label,
      set: (task, value) => ({ ...task, label: value as TaskLabel }),
      options: taskLabels.map(value => ({
        value,
        label: value[0]!.toUpperCase() + value.slice(1),
      })),
    },
    {
      id: 'status',
      header: 'Status',
      get: task => task.status,
      sortValue: task => statusRank[task.status] ?? 0,
      set: (task, value) => ({ ...task, status: value as TaskStatus }),
      filterVariant: 'options',
      options: taskStatuses.map(value => ({
        value,
        label:
          value === 'in-progress'
            ? 'In-Progress'
            : value[0]!.toUpperCase() + value.slice(1),
      })),
    },
    {
      id: 'priority',
      header: 'Priority',
      get: task => task.priority,
      sortValue: task => priorityRank[task.priority] ?? 0,
      set: (task, value) => ({ ...task, priority: value as TaskPriority }),
      filterVariant: 'options',
      options: taskPriorities.map(value => ({
        value,
        label: value[0]!.toUpperCase() + value.slice(1),
      })),
    },
    {
      id: 'estimatedHours',
      header: 'Est. Hours',
      get: task => String(task.estimatedHours),
      sortValue: task => task.estimatedHours,
      getNumber: task => task.estimatedHours,
      filterVariant: 'range',
      rangeStep: 1,
    },
    {
      id: 'createdAt',
      header: 'Created At',
      get: task =>
        task.createdAt instanceof Date
          ? task.createdAt.toISOString().slice(0, 10)
          : String(task.createdAt),
      sortValue: task =>
        task.createdAt instanceof Date
          ? task.createdAt.getTime()
          : new Date(task.createdAt).getTime(),
      getDate: task =>
        task.createdAt instanceof Date
          ? task.createdAt.getTime()
          : new Date(task.createdAt).getTime(),
      filterVariant: 'date',
    },
  ],
  rowKey: task => task.id,
  searchColumnId: 'title',
}
