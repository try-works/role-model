type BlockRenderer = 'tailwind' | 'stylex' | 'pleat' | 'pleat'

const rawBlockSources = import.meta.glob(
  [
    '/src/*.ts',
    '/src/lib/**/*.ts',
    '/src/ui/**/*.ts',
    '/src/stylex/**/*.ts',
    '/src/demo/**/*.ts',
    '/src/demo/**/*.json',
  ],
  { query: '?raw', import: 'default' },
) as Record<string, () => Promise<string>>

const SHARED_STEMS: Readonly<Record<string, string>> = {
  'dashboard-01': 'featured-page',
  'login-03': 'featured-page',
  'login-04': 'featured-page',
  'creaseui-executive-summary': 'creaseui-dashboards',
  'creaseui-cohort-funnel': 'creaseui-dashboards',
  'creaseui-project-status': 'creaseui-dashboards',
  'creaseui-service-monitoring': 'creaseui-dashboards',
  'creaseui-incident-console': 'creaseui-dashboards',
  'creaseui-kanban-board': 'creaseui-blocks',
  'creaseui-inbox-table': 'creaseui-blocks',
  'creaseui-order-detail': 'creaseui-blocks',
  'creaseui-checkout-form': 'creaseui-blocks',
  'creaseui-data-dashboard': 'creaseui-blocks',
  'creaseui-card-grid': 'creaseui-blocks',
  'chart-analytics-dashboard': 'chart-analytics-dashboard',
}

export const blockSourcePath = (
  renderer: BlockRenderer,
  name: string,
): string => {
  const stem =
    SHARED_STEMS[name] ?? (renderer === 'tailwind' ? name : 'sidebar-page')
  const dir = renderer === 'tailwind' ? 'blocks' : `blocks-${renderer}`
  return `/src/demo/${dir}/${stem}.ts`
}

const IMPORT_SPECIFIER =
  /(?:import|export)\s+[\w*$,\s{}]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g

const normalizePath = (path: string): string => {
  const out: string[] = []
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') out.pop()
    else out.push(seg)
  }
  return `/${out.join('/')}`
}

const withExtension = (base: string): string | undefined => {
  const candidates =
    base.endsWith('.ts') || base.endsWith('.json')
      ? [base]
      : [`${base}.ts`, `${base}.json`, `${base}/index.ts`]
  return candidates.find(p => rawBlockSources[p] !== undefined)
}

const resolveSpecifier = (
  fromPath: string,
  specifier: string,
): string | undefined => {
  if (specifier.startsWith('@/')) {
    return withExtension(`/src/${specifier.slice(2)}`)
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const dir = fromPath.slice(0, fromPath.lastIndexOf('/'))
    return withExtension(normalizePath(`${dir}/${specifier}`))
  }
  return undefined
}

const SIDEBAR_DATA_FILE = /^\/src\/demo\/blocks\/sidebar-\d+\.ts$/

const dependencyPaths = (
  renderer: BlockRenderer,
  name: string,
  source: string,
): ReadonlyArray<string> => {
  const otherRendererDirs: ReadonlyArray<string> =
    renderer === 'tailwind'
      ? ['/src/stylex/', '/src/pleat/']
      : renderer === 'stylex'
        ? ['/src/ui/', '/src/pleat/']
        : ['/src/ui/', '/src/stylex/']
  const deps: string[] = []
  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? match[2]
    if (specifier === undefined) continue
    const path = resolveSpecifier(blockSourcePath(renderer, name), specifier)
    if (path === undefined) continue
    if (
      SIDEBAR_DATA_FILE.test(path) &&
      path !== `/src/demo/blocks/${name}.ts`
    ) {
      continue
    }
    // The other renderer's component tree is never part of this block.
    if (otherRendererDirs.some(dir => path.startsWith(dir))) continue
    deps.push(path)
  }
  return deps
}

export type BlockSources = Readonly<{
  primary: string
  files: Readonly<Record<string, string>>
}>

export const loadBlockSources = async (
  renderer: BlockRenderer,
  name: string,
): Promise<BlockSources> => {
  const primary = blockSourcePath(renderer, name)
  if (rawBlockSources[primary] === undefined) {
    return {
      primary,
      files: { [primary]: '// Source unavailable for this block.' },
    }
  }

  const loadSource = async (path: string): Promise<string> => {
    const loader = rawBlockSources[path]
    if (loader === undefined) return '// Source unavailable.'
    try {
      return (await loader()) as string
    } catch {
      return '// Failed to load source.'
    }
  }

  try {
    const primarySource = await loadSource(primary)
    // The block's own source plus the files it directly uses — components,
    // lib modules, and data files — without walking further deps, matching
    // how shadcn lists a block's file tree.
    const paths = [primary, ...dependencyPaths(renderer, name, primarySource)]
    const entries = await Promise.all(
      [...new Set(paths)].map(
        async path => [path, await loadSource(path)] as const,
      ),
    )
    return { primary, files: Object.fromEntries(entries) }
  } catch {
    return { primary, files: { [primary]: '// Failed to load block source.' } }
  }
}
