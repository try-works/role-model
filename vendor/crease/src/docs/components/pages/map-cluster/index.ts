import { authoredPage } from '@/docs/components/pages/authored-page'
import { mapPreviewProgram } from '@/docs/components/pages/map/preview'
import { mapClusterExamples } from '@/docs/components/pages/map-cluster/shared'
export const mapClusterPage = authoredPage({
  slug: 'map-cluster',
  title: 'Map Cluster',
  kind: 'recipe',
  previewProgram: mapPreviewProgram('map-cluster'),
  definition: {
    kind: 'recipe',
    description:
      'Group nearby point features with MapLibre clustering and click-to-expand.',
    usage: `import { mapClusterLayer } from '@/ui/map-cluster'

mapClusterLayer({ id: 'locations', data: '/data/locations.geojson', clusterRadius: 50 }, h)`,
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
    examples: mapClusterExamples('tailwind'),
    stylexExamples: mapClusterExamples('stylex'),
    pleatExamples: mapClusterExamples('pleat'),
  },
})
