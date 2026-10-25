import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'

export const OPENFREEMAP_STYLES = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

/** Crease UI's semantic colors for basemap surfaces, roads, and labels. */
export type MapPalette = Readonly<{
  bg: string
  park: string
  water: string
  waterway: string
  landuse: string
  wood: string
  buildingOutline: string
  roadMinor: string
  roadCasing: string
  roadMajor: string
  roadPath: string
  railway: string
  boundary: string
  labelPrimary: string
  labelSecondary: string
  labelRoad: string
  labelHalo: string
  waterLabel: string
}>

export const MAP_PALETTES: Readonly<Record<'light' | 'dark', MapPalette>> = {
  light: {
    bg: '#fafafa',
    park: '#e8eee8',
    water: '#cadce5',
    waterway: '#bed3de',
    landuse: '#f0f0ee',
    wood: '#dce7dc',
    buildingOutline: '#dededb',
    roadMinor: '#ffffff',
    roadCasing: '#e1e1de',
    roadMajor: '#ffffff',
    roadPath: '#e6e6e2',
    railway: '#c9c9c6',
    boundary: '#bbbcb8',
    labelPrimary: '#303432',
    labelSecondary: '#626762',
    labelRoad: '#737872',
    labelHalo: '#ffffff',
    waterLabel: '#587989',
  },
  dark: {
    bg: '#202124',
    park: '#2a2c2e',
    water: '#1a1c20',
    waterway: '#1a1c20',
    landuse: '#232528',
    wood: '#2a2c2e',
    buildingOutline: '#2e3032',
    roadMinor: '#2c2e30',
    roadCasing: '#484a4e',
    roadMajor: '#262828',
    roadPath: '#2a2c2e',
    railway: '#303234',
    boundary: '#484a4e',
    labelPrimary: '#c1c6cc',
    labelSecondary: '#9aa0a6',
    labelRoad: '#808488',
    labelHalo: '#18191b',
    waterLabel: '#849aaa',
  },
}

/** Resolve scoped CSS tokens, then apply explicit palette overrides. Use hex/rgb values. */
export const readMapPalette = (
  element: HTMLElement,
  theme: 'light' | 'dark',
  overrides: Partial<MapPalette> = {},
): MapPalette => {
  const css = getComputedStyle(element)
  return Object.fromEntries(
    Object.entries(MAP_PALETTES[theme]).map(([key, fallback]) => [
      key,
      overrides[key as keyof MapPalette] ??
        (css
          .getPropertyValue(
            `--map-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
          )
          .trim() ||
          fallback),
    ]),
  ) as MapPalette
}

/** Translate name lookups without removing other parts of a label expression. */
export const localizeMapLabel = (value: unknown, language: string): unknown => {
  if (language === 'native') return value
  const code = language.split('-')[0]
  const isName = (field: unknown) =>
    typeof field === 'string' && /^name(?::[\w-]+|_[\w-]+)?$/.test(field)
  const name: ExpressionSpecification = [
    'coalesce',
    ['get', `name:${code}`],
    ['get', `name_${code}`],
    ['get', 'name'],
    ['get', 'name:latin'],
    ['get', 'name_en'],
    ['get', 'name:en'],
    '',
  ]
  if (typeof value === 'string') {
    if (!/\{name(?::[\w-]+|_[\w-]+)?\}/.test(value)) return value
    const parts = value
      .split(/(\{[^}]+\})/)
      .filter(Boolean)
      .map(part => {
        if (!part.startsWith('{')) return part
        const field = part.slice(1, -1)
        return isName(field) ? name : ['to-string', ['get', field]]
      })
    return parts.length === 1 ? parts[0] : ['concat', ...parts]
  }
  if (!Array.isArray(value)) return value
  if (value[0] === 'literal') return value
  if (value[0] === 'get' && typeof value[1] === 'string' && isName(value[1]))
    return name
  // An existing coalesce of names is replaced as a unit so its earlier fallback cannot win.
  if (
    value[0] === 'coalesce' &&
    value
      .slice(1)
      .every(
        part => Array.isArray(part) && part[0] === 'get' && isName(part[1]),
      )
  )
    return name
  // OpenFreeMap uses a script-selection case around name:latin / name:nonlatin.
  if (
    value[0] === 'case' &&
    Array.isArray(value[1]) &&
    value[1][0] === 'has' &&
    isName(value[1][1])
  )
    return name
  return value.map(part => localizeMapLabel(part, language))
}

/** Clone a basemap; application sources and the caller's original JSON stay untouched. */
export const createMapStyle = (
  base: StyleSpecification,
  options: Readonly<{ palette?: MapPalette; language?: string }> = {},
): StyleSpecification => {
  const style = structuredClone(base)
  for (const layer of style.layers) {
    const id = layer.id.toLowerCase()
    const p = options.palette
    if (p !== undefined) {
      if (layer.type === 'background')
        layer.paint = { ...layer.paint, 'background-color': p.bg }
      if (layer.type === 'fill') {
        const color = id.includes('water')
          ? p.water
          : id.includes('park')
            ? p.park
            : id.includes('wood') || id.includes('forest')
              ? p.wood
              : id.includes('aeroway')
                ? p.roadMajor
                : p.landuse
        layer.paint = {
          ...layer.paint,
          'fill-color': color,
          ...(id.includes('building')
            ? { 'fill-outline-color': p.buildingOutline }
            : {}),
        }
      }
      if (layer.type === 'fill-extrusion')
        layer.paint = { ...layer.paint, 'fill-extrusion-color': p.landuse }
      if (layer.type === 'line') {
        const color = id.includes('water')
          ? p.waterway
          : id.includes('boundary')
            ? p.boundary
            : id.includes('rail')
              ? p.railway
              : id.includes('casing')
                ? p.roadCasing
                : id.includes('path') || id.includes('track')
                  ? p.roadPath
                  : id.includes('major') ||
                      id.includes('motorway') ||
                      id.includes('primary') ||
                      id.includes('trunk')
                    ? p.roadMajor
                    : p.roadMinor
        layer.paint = { ...layer.paint, 'line-color': color }
      }
      if (
        layer.type === 'symbol' &&
        layer.layout?.['text-field'] !== undefined
      ) {
        const color = id.includes('water')
          ? p.waterLabel
          : id.includes('road') || id.includes('highway')
            ? p.labelRoad
            : id.includes('city') ||
                id.includes('country') ||
                id.includes('state')
              ? p.labelPrimary
              : p.labelSecondary
        layer.paint = {
          ...layer.paint,
          'text-color': color,
          'text-halo-color': p.labelHalo,
        }
      }
      if (layer.type === 'raster')
        layer.layout = { ...layer.layout, visibility: 'none' }
    }
    if (
      layer.type === 'symbol' &&
      options.language &&
      layer.layout?.['text-field'] !== undefined
    ) {
      const field = layer.layout['text-field']
      // Legacy token strings become expressions to retain a native-name fallback.
      const expression =
        typeof field === 'string' && /^\{name(?::[\w-]+)?\}$/.test(field)
          ? ['get', 'name']
          : field
      layer.layout = {
        ...layer.layout,
        'text-field': localizeMapLabel(
          expression,
          options.language,
        ) as ExpressionSpecification,
      }
    }
  }
  return style
}

export type MapTranslations = Readonly<{
  controls: string
  attribution: string
  zoomIn: string
  zoomOut: string
  resetBearing: string
  locate: string
  fullscreen: string
  close: string
  loading: string
  error: string
  retry: string
}>

export const MAP_TRANSLATIONS: Readonly<
  Record<'en' | 'de' | 'fr', MapTranslations>
> = {
  en: {
    controls: 'Map controls',
    attribution: 'Toggle attribution',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetBearing: 'Reset north',
    locate: 'Use my location',
    fullscreen: 'Toggle fullscreen',
    close: 'Close popup',
    loading: 'Loading map…',
    error: 'Map could not be loaded.',
    retry: 'Retry',
  },
  de: {
    controls: 'Kartensteuerung',
    attribution: 'Quellenangaben anzeigen',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    resetBearing: 'Nach Norden ausrichten',
    locate: 'Meinen Standort verwenden',
    fullscreen: 'Vollbild umschalten',
    close: 'Popup schließen',
    loading: 'Karte wird geladen…',
    error: 'Die Karte konnte nicht geladen werden.',
    retry: 'Erneut versuchen',
  },
  fr: {
    controls: 'Commandes de la carte',
    attribution: 'Afficher les attributions',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    resetBearing: 'Orienter vers le nord',
    locate: 'Utiliser ma position',
    fullscreen: 'Basculer en plein écran',
    close: 'Fermer la fenêtre',
    loading: 'Chargement de la carte…',
    error: 'Impossible de charger la carte.',
    retry: 'Réessayer',
  },
}

export const mapTranslations = (
  language = 'en',
  overrides: Partial<MapTranslations> = {},
): MapTranslations => ({
  ...(MAP_TRANSLATIONS[
    language.split('-')[0] as keyof typeof MAP_TRANSLATIONS
  ] ?? MAP_TRANSLATIONS.en),
  ...overrides,
})
