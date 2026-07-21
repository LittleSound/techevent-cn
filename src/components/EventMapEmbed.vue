<script setup lang="ts">
const { coordinates, label } = defineProps<{
  /** WGS-84 [lng, lat] — flipped to Leaflet's [lat, lng] internally. */
  coordinates: [number, number]
  label: string
}>()

const container = shallowRef<HTMLElement>()

/**
 * Leaflet touches `window` at import time, so it is loaded dynamically inside
 * onMounted — this never runs during SSG rendering, and if OSM tiles are
 * unreachable (expected in mainland China) the block simply stays blank while
 * the deep-link buttons next to it keep working.
 */
onMounted(async () => {
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  if (!container.value)
    return
  const [lng, lat] = coordinates
  const map = L.map(container.value, { scrollWheelZoom: false, attributionControl: true })
    .setView([lat, lng], 14)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)
  L.circleMarker([lat, lng], { radius: 9, color: '#0d9488', fillColor: '#14b8a6', fillOpacity: 0.9 })
    .addTo(map)
    .bindTooltip(label)
})
</script>

<template>
  <div ref="container" border border-gray-200 rounded-lg h-52 overflow-hidden dark:border-gray-800 />
</template>
