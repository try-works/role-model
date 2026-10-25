import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type TypographyFixture = Readonly<{
  title: string
  kind: 'article' | 'single' | 'table' | 'list'
  rtl?: boolean
  component?: string
  children?: ReadonlyArray<string>
}>

export const typographyFixtures: ReadonlyArray<TypographyFixture> = [
  { title: 'Basic', kind: 'article' },
  {
    title: 'h1',
    kind: 'single',
    component: 'typographyH1',
    children: ['Taxing Laughter: The Joke Tax Chronicles'],
  },
  {
    title: 'h2',
    kind: 'single',
    component: 'typographyH2',
    children: ['The People of the Kingdom'],
  },
  {
    title: 'h3',
    kind: 'single',
    component: 'typographyH3',
    children: ['The Joke Tax'],
  },
  {
    title: 'h4',
    kind: 'single',
    component: 'typographyH4',
    children: ['People stopped telling jokes'],
  },
  {
    title: 'p',
    kind: 'single',
    component: 'typographyP',
    children: [
      'The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax.',
    ],
  },
  {
    title: 'blockquote',
    kind: 'single',
    component: 'typographyBlockquote',
    children: [
      '“After all,” he said, “everyone enjoys a good joke, so it’s only fair that they should pay for the privilege.”',
    ],
  },
  { title: 'table', kind: 'table' },
  { title: 'list', kind: 'list' },
  {
    title: 'Inline code',
    kind: 'single',
    component: 'typographyInlineCode',
    children: ['@/ui/alert-dialog'],
  },
  {
    title: 'Lead',
    kind: 'single',
    component: 'typographyLead',
    children: [
      'A modal dialog that interrupts the user with important content and expects a response.',
    ],
  },
  {
    title: 'Large',
    kind: 'single',
    component: 'typographyLarge',
    children: ['Are you absolutely sure?'],
  },
  {
    title: 'Small',
    kind: 'single',
    component: 'typographySmall',
    children: ['Email address'],
  },
  {
    title: 'Muted',
    kind: 'single',
    component: 'typographyMuted',
    children: ['Enter your email address.'],
  },
  { title: 'RTL', kind: 'article', rtl: true },
]

const ARTICLE = {
  title: 'Taxing Laughter: The Joke Tax Chronicles',
  lead: 'Once upon a time, in a far-off land, there was a very lazy king who spent all day lounging on his throne. One day, his advisors came to him with a problem: the kingdom was running out of money.',
  kingsPlan: 'The King’s Plan',
  kingThought: 'The king thought long and hard, and finally came up with',
  brilliantPlan: 'a brilliant plan',
  taxJokes: ': he would tax the jokes in the kingdom.',
  blockquote:
    '“After all,” he said, “everyone enjoys a good joke, so it’s only fair that they should pay for the privilege.”',
  jokeTax: 'The Joke Tax',
  subjectsNotAmused:
    'The king’s subjects were not amused. They grumbled and complained, but the king was firm:',
  list: [
    '1st level of puns: 5 gold coins',
    '2nd level of jokes: 10 gold coins',
    '3rd level of one-liners: 20 gold coins',
  ],
  stoppedTelling:
    'As a result, people stopped telling jokes, and the kingdom fell into a gloom. But there was one person who refused to let the king’s foolishness get him down: a court jester named Jokester.',
  jokestersRevolt: 'Jokester’s Revolt',
  sneaking:
    'Jokester began sneaking into the castle in the middle of the night and leaving jokes all over the place: under the king’s pillow, in his soup, even in the royal toilet. The king was furious, but he couldn’t seem to stop Jokester.',
  discovered:
    'And then, one day, the people of the kingdom discovered that the jokes left by Jokester were so funny that they couldn’t help but laugh. And once they started laughing, they couldn’t stop.',
  peoplesRebellion: 'The People’s Rebellion',
  uplifted:
    'The people of the kingdom, feeling uplifted by the laughter, started to tell jokes and puns again, and soon the entire kingdom was in on the joke.',
  treasury: 'King’s Treasury',
  happiness: 'People’s happiness',
  rows: [
    ['Empty', 'Overflowing'],
    ['Modest', 'Satisfied'],
    ['Full', 'Ecstatic'],
  ] as ReadonlyArray<readonly [string, string]>,
  realized:
    'The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax. Jokester was declared a hero, and the kingdom lived happily ever after.',
  moral:
    'The moral of the story is: never underestimate the power of a good laugh and always be careful of bad ideas.',
}

const ARTICLE_AR: typeof ARTICLE = {
  title: 'فرض الضرائب على الضحك: سجلات ضريبة النكتة',
  lead: 'في قديم الزمان، في أرض بعيدة، كان هناك ملك كسول جداً يقضي يومه كله مستلقياً على عرشه. في أحد الأيام، جاءه مستشاروه بمشكلة: المملكة كانت تنفد من المال.',
  kingsPlan: 'خطة الملك',
  kingThought: 'فكر الملك طويلاً وبجد، وأخيراً توصل إلى',
  brilliantPlan: 'خطة عبقرية',
  taxJokes: ': سيفرض ضريبة على النكات في المملكة.',
  blockquote:
    '"في النهاية،" قال، "الجميع يستمتع بنكتة جيدة، لذا من العدل أن يدفعوا مقابل هذا الامتياز."',
  jokeTax: 'ضريبة النكتة',
  subjectsNotAmused:
    'لم يكن رعايا الملك سعداء. تذمروا واشتكوا، لكن الملك كان حازماً:',
  list: [
    'المستوى الأول من التورية: 5 قطع ذهبية',
    'المستوى الثاني من النكات: 10 قطع ذهبية',
    'المستوى الثالث من النكات القصيرة: 20 قطعة ذهبية',
  ],
  stoppedTelling:
    'نتيجة لذلك، توقف الناس عن رواية النكات، وغرقت المملكة في الكآبة. لكن كان هناك شخص واحد رفض أن تحبطه حماقة الملك: مهرج البلاط المسمى المازح.',
  jokestersRevolt: 'ثورة المازح',
  sneaking:
    'بدأ المازح يتسلل إلى القلعة في منتصف الليل ويترك النكات في كل مكان: تحت وسادة الملك، في حسائه، حتى في المرحاض الملكي. كان الملك غاضباً، لكنه لم يستطع إيقاف المازح.',
  discovered:
    'وبعد ذلك، في يوم من الأيام، اكتشف سكان المملكة أن النكات التي تركها المازح كانت مضحكة جداً لدرجة أنهم لم يستطيعوا منع أنفسهم من الضحك. وبمجرد أن بدأوا بالضحك، لم يستطيعوا التوقف.',
  peoplesRebellion: 'ثورة الشعب',
  uplifted:
    'شعر سكان المملكة بالبهجة من الضحك، وبدأوا في رواية النكات والتورية مرة أخرى، وسرعان ما أصبحت المملكة بأكملها جزءاً من النكتة.',
  treasury: 'خزينة الملك',
  happiness: 'سعادة الشعب',
  rows: [
    ['فارغة', 'فائضة'],
    ['متواضعة', 'راضٍ'],
    ['ممتلئة', 'منتشٍ'],
  ],
  realized:
    'الملك، عندما رأى مدى سعادة رعاياه، أدرك خطأ طرقه وألغى ضريبة النكتة. أُعلن المازح بطلاً، ��عاشت المملكة في سعادة دائمة.',
  moral:
    'مغزى القصة هو: لا تستهن أبداً بقوة الضحك الجيد وكن دائماً حذراً من الأفكار السيئة.',
}

const str = (value: string): string => `'${value.replaceAll("'", "\\'")}'`

const STYLES_BLOCK = `
const styles = stylex.create({
  article: { maxWidth: '42rem', width: '100%' },
  tableWrap: { marginBlock: '1.5rem', overflowY: 'auto', width: '100%' },
  table: { width: '100%' },
  tr: { backgroundColor: { default: 'transparent', ':nth-child(even)': 'var(--muted)' }, borderTopStyle: 'solid', borderTopWidth: '1px', margin: '0', padding: '0' },
  th: { borderStyle: 'solid', borderWidth: '1px', fontWeight: 700, paddingBlock: '0.5rem', paddingInline: '1rem', textAlign: 'start' },
  td: { borderStyle: 'solid', borderWidth: '1px', paddingBlock: '0.5rem', paddingInline: '1rem', textAlign: 'start' },
  list: { listStyleType: 'disc', marginBlock: '1.5rem', marginInlineStart: '1.5rem' },
  listItem: { marginTop: '0.5rem' },
})
`

/** Emits the full Joke Tax article viewBody (dir=rtl swaps borders/padding to
 * inline-start via the same logical classes upstream uses). */
const articleBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  rtl: boolean,
): string => {
  const a = rtl ? ARTICLE_AR : ARTICLE
  const isSx = renderer !== 'tailwind'
  const cls = (tw: string, sxKey?: string): string =>
    isSx
      ? `h.Class(stylex.props(${sxKey === undefined ? 'styles.article' : sxKey}).className ?? '')`
      : `h.Class('${tw}')`
  const th = (text: string): string =>
    `h.th([${isSx ? "h.Class(stylex.props(styles.th).className ?? '')" : "h.Class('border px-4 py-2 text-left font-bold')"}], [${str(text)}])`
  const td = (text: string): string =>
    `h.td([${isSx ? "h.Class(stylex.props(styles.td).className ?? '')" : "h.Class('border px-4 py-2 text-left')"}], [${str(text)}])`
  return `h.article([h.Dir(${rtl ? "'rtl'" : "'ltr'"}), ${cls('w-full max-w-2xl')}], [
  Typography.typographyH1({ children: [${str(a.title)}] }, h),
  Typography.typographyLead({ children: [${str(a.lead)}] }, h),
  Typography.typographyH2({ children: [${str(a.kingsPlan)}] }, h),
  Typography.typographyP({ children: [
    ${str(a.kingThought)},
    ' ',
    h.a([h.Class('font-medium text-primary underline underline-offset-4'), h.Href('#')], [${str(a.brilliantPlan)}]),
    ${str(a.taxJokes)},
  ] }, h),
  Typography.typographyBlockquote({ children: [${str(a.blockquote)}] }, h),
  Typography.typographyH3({ children: [${str(a.jokeTax)}] }, h),
  Typography.typographyP({ children: [${str(a.subjectsNotAmused)}] }, h),
  h.ul([${isSx ? "h.Class(stylex.props(styles.list).className ?? '')" : "h.Class('my-6 ms-6 list-disc [&>li]:mt-2')"}],
    [${a.list.map(item => `h.li([], [${str(item)}])`).join(',\n    ')}]),
  Typography.typographyP({ children: [${str(a.stoppedTelling)}] }, h),
  Typography.typographyH3({ children: [${str(a.jokestersRevolt)}] }, h),
  Typography.typographyP({ children: [${str(a.sneaking)}] }, h),
  Typography.typographyP({ children: [${str(a.discovered)}] }, h),
  Typography.typographyH3({ children: [${str(a.peoplesRebellion)}] }, h),
  Typography.typographyP({ children: [${str(a.uplifted)}] }, h),
  h.div([${isSx ? "h.Class(stylex.props(styles.tableWrap).className ?? '')" : "h.Class('my-6 w-full overflow-y-auto')"}], [
    h.table([${isSx ? "h.Class(stylex.props(styles.table).className ?? '')" : "h.Class('w-full')"}], [
      h.thead([], [
        h.tr([${isSx ? "h.Class(stylex.props(styles.tr).className ?? '')" : "h.Class('m-0 border-t p-0 even:bg-muted')"}], [
          ${th(a.treasury)},
          ${th(a.happiness)},
        ]),
      ]),
      h.tbody([],
        [${a.rows.map(([l, r]) => `h.tr([${isSx ? "h.Class(stylex.props(styles.tr).className ?? '')" : "h.Class('m-0 border-t p-0 even:bg-muted')"}], [${td(l)}, ${td(r)}])`).join(',\n        ')}]),
    ]),
  ]),
  Typography.typographyP({ children: [${str(a.realized)}] }, h),
  Typography.typographyP({ children: [${str(a.moral)}] }, h),
])`
}

const tableBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const a = ARTICLE
  const th = (text: string): string =>
    `h.th([${isSx ? "h.Class(stylex.props(styles.th).className ?? '')" : "h.Class('border px-4 py-2 text-left font-bold')"}], [${str(text)}])`
  const td = (text: string): string =>
    `h.td([${isSx ? "h.Class(stylex.props(styles.td).className ?? '')" : "h.Class('border px-4 py-2 text-left')"}], [${str(text)}])`
  return `h.div([${isSx ? "h.Class(stylex.props(styles.tableWrap).className ?? '')" : "h.Class('my-6 w-full overflow-y-auto')"}], [
  h.table([${isSx ? "h.Class(stylex.props(styles.table).className ?? '')" : "h.Class('w-full')"}], [
    h.thead([], [
      h.tr([${isSx ? "h.Class(stylex.props(styles.tr).className ?? '')" : "h.Class('m-0 border-t p-0 even:bg-muted')"}], [
        ${th(a.treasury)},
        ${th(a.happiness)},
      ]),
    ]),
    h.tbody([],
      [${a.rows.map(([l, r]) => `h.tr([${isSx ? "h.Class(stylex.props(styles.tr).className ?? '')" : "h.Class('m-0 border-t p-0 even:bg-muted')"}], [${td(l)}, ${td(r)}])`).join(',\n      ')}]),
  ]),
])`
}

const listBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  return `h.ul([${isSx ? "h.Class(stylex.props(styles.list).className ?? '')" : "h.Class('my-6 ms-6 list-disc [&>li]:mt-2')"}],
  [${ARTICLE.list.map(item => `h.li([], [${str(item)}])`).join(',\n  ')}])`
}

const source = (
  fixture: TypographyFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Typography',
    componentSlug: 'typography',
    renderer,
    exampleName: fixture.title,
    componentImports:
      renderer !== 'tailwind'
        ? `import * as stylex from '@stylexjs/stylex'
${STYLES_BLOCK}`
        : '',
    viewBody:
      fixture.kind === 'article'
        ? `${articleBody(renderer, fixture.rtl === true)},`
        : fixture.kind === 'table'
          ? `${tableBody(renderer)},`
          : fixture.kind === 'list'
            ? `${listBody(renderer)},`
            : `Typography.${fixture.component ?? 'typographyP'}({ children: [${(fixture.children ?? []).map(str).join(', ')}] }, h),`,
  })

const typographyExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  typographyFixtures.map(fixture => ({
    title: fixture.title,
    code: source(fixture, renderer),
  }))

export const typographyArticle = ARTICLE
export const typographyArticleAr = ARTICLE_AR

export const typographyExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, typographyExamplesFor(renderer))
