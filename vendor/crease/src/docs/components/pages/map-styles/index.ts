import { authoredPage } from '@/docs/components/pages/authored-page'
import { mapPreviewProgram } from '@/docs/components/pages/map/preview'
import { mapStylesExamples } from '@/docs/components/pages/map-styles/shared'
export const mapStylesPage = authoredPage({
  slug: 'map-styles',
  title: 'Map Styles',
  kind: 'recipe',
  previewProgram: mapPreviewProgram('map-styles'),
  definition: {
    kind: 'recipe',
    description:
      'OpenFreeMap presets, custom style URLs or JSON, and Crease UI palette tokens.',
    usage: `import { map } from '@/ui/map'
import { OPENFREEMAP_STYLES } from '@/ui/map-styles'

map({ ariaLabel: 'Custom map', toMessage: message => message, styles: { light: '/maps/custom-light.json', dark: '/maps/custom-dark.json' } }, h)

// Alternatively choose a hosted preset: styles: { light: OPENFREEMAP_STYLES.liberty }`,
    architecture:
      'The parent owns serializable configuration and interaction state. A Foldkit Mount owns the MapLibre resource, observers, requests, and DOM event listeners. Child helpers declare overlays that are restored after style changes.',
    apiHref: 'https://maplibre.org/maplibre-gl-js/docs/',
    apiDescription: 'MapLibre API',
    styling:
      'OpenFreeMap supplies the default light and dark basemaps. Pass styles.light and styles.dark as URLs or StyleSpecification JSON. Enable themed to read the Crease UI --map-* palette tokens from the map scope, or pass a palette object. Custom basemaps keep their own colors unless palette theming is enabled.',
    accessibility:
      'Name each map and marker. Controls are native buttons with visible focus and at least 40px hit targets. Pair geographic content with an accessible list or summary. Copyright attribution remains visible. Map tiles need WebGL 2 and a network connection; style failures expose a localized retry action.',
    keyboard: [
      ['Tab', 'Focus markers, popup actions, and controls.'],
      ['Enter / Space', 'Activate the focused button.'],
      ['Arrow keys / + / -', 'Pan or zoom when the map canvas is focused.'],
    ],
    sections: [
      {
        id: 'palette-tokens',
        title: 'Custom palette tokens',
        description:
          'Set these hex or rgb colors on a wrapping theme scope and pass themed: true. Crease UI provides 18 semantic map tokens for surfaces, roads, and labels. A palette prop overrides individual CSS tokens. Style URLs and JSON are also supported, including relative sprite, glyph, and tile URLs.',
        code: `.my-map-theme {
  --map-bg: #f0f4fa;
  --map-park: #e2eaf4;
  --map-water: #b0c4e0;
  --map-waterway: #a4b8d6;
  --map-landuse: #e8eef6;
  --map-wood: #d4dfe8;
  --map-building-outline: #c8d8ea;
  --map-road-minor: #d8e2ee;
  --map-road-casing: #bcc8d8;
  --map-road-major: #f8fbff;
  --map-road-path: #e0e8f2;
  --map-railway: #d0daea;
  --map-boundary: #8aa0c0;
  --map-label-primary: #141e2d;
  --map-label-secondary: #3c506e;
  --map-label-road: #5a6e8a;
  --map-label-halo: #f8fbff;
  --map-water-label: #3a5a8a;
}`,
      },
      {
        id: 'map-composition',
        title: 'Map composition',
        description:
          'Place mapControls, mapMarker, mapPopup, mapRoute, mapArc, mapGeoJSON, and mapClusterLayer inside the map children. Give each data layer a unique id within its map. Routes draw supplied coordinates; the application chooses its routing service.',
      },
      {
        id: 'localization',
        title: 'Localization',
        description:
          'English is the default language. Set language to select the name:<language> property with native name and English fallbacks. en, de, and fr also have built-in control and status translations. Pass translations for other languages or product-specific wording. Set language to native to retain local names.',
      },
    ],
    examples: mapStylesExamples('tailwind'),
    stylexExamples: mapStylesExamples('stylex'),
    pleatExamples: mapStylesExamples('pleat'),
  },
})
