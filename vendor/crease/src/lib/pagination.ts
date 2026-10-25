export type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis'

export type PaginationRangeConfig = Readonly<{
  page: number
  totalPages: number
  siblingCount?: number
  boundaryCount?: number
}>

const whole = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback

export const normalizePagination = (config: PaginationRangeConfig) => {
  const totalPages = Math.max(1, whole(config.totalPages, 1))
  return {
    page: Math.min(totalPages, Math.max(1, whole(config.page, 1))),
    totalPages,
    siblingCount: Math.min(totalPages, whole(config.siblingCount ?? 1, 1)),
    boundaryCount: Math.min(totalPages, whole(config.boundaryCount ?? 1, 1)),
  }
}

export const paginationItems = (
  config: PaginationRangeConfig,
): ReadonlyArray<PaginationItem> => {
  const { page, totalPages, siblingCount, boundaryCount } =
    normalizePagination(config)
  const pages = new Set<number>()
  for (let value = 1; value <= boundaryCount; value += 1) pages.add(value)
  for (
    let value = Math.max(1, totalPages - boundaryCount + 1);
    value <= totalPages;
    value += 1
  )
    pages.add(value)
  for (
    let value = Math.max(1, page - siblingCount);
    value <= Math.min(totalPages, page + siblingCount);
    value += 1
  )
    pages.add(value)

  const sorted = [...pages].sort((left, right) => left - right)
  const items: Array<PaginationItem> = []
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && value - previous === 2)
      items.push(previous + 1)
    else if (previous !== undefined && value - previous > 2)
      items.push(previous < page ? 'start-ellipsis' : 'end-ellipsis')
    items.push(value)
  })
  return items
}

export type LinkNavigation = Readonly<{
  kind: 'link'
  href: (page: number) => string
}>

export type ActionNavigation<Msg> = Readonly<{
  kind: 'action'
  onNavigate: (page: number) => Msg
}>

export type PaginationRecipeProps<Msg> = PaginationRangeConfig &
  Readonly<{
    navigation: LinkNavigation | ActionNavigation<Msg>
    ariaLabel?: string
  }>
