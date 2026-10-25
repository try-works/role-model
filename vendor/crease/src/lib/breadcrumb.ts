export type BreadcrumbTrailItem = Readonly<
  | { kind: 'link'; label: string; href: string }
  | { kind: 'page'; label: string }
  | { kind: 'ellipsis'; label?: string }
>

export const collapseBreadcrumbItems = (
  items: ReadonlyArray<BreadcrumbTrailItem>,
  maxItems = 4,
): ReadonlyArray<BreadcrumbTrailItem> => {
  const limit = Math.max(
    3,
    Math.floor(Number.isFinite(maxItems) ? maxItems : 4),
  )
  if (items.length <= limit || items.some(item => item.kind === 'ellipsis'))
    return items
  return [
    items[0]!,
    {
      kind: 'ellipsis',
      label: `${String(items.length - limit + 1)} omitted levels`,
    },
    ...items.slice(-(limit - 2)),
  ]
}
