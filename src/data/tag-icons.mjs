// @unocss-include
// The directive above makes UnoCSS extract the `i-*` icon classes from this
// plain .mjs file (it is outside the default extraction pipeline).

import { eventPalette } from '../utils/eventPalette.mjs'

/** Shared defs so grouped tags (e.g. the AI family) dedupe to one card icon. */
const ai = /** @type {const} */ ({ icon: 'i-hugeicons-ai-brain-03', color: '#8b5cf6', tier: 2 })
const opensource = /** @type {const} */ ({ icon: 'i-simple-icons-opensourceinitiative', color: '#3da639', tier: 2 })
const printing3d = /** @type {const} */ ({ icon: 'i-mdi-printer-3d', color: '#f97316', tier: 2 })
const cloud = /** @type {const} */ ({ icon: 'i-carbon-cloud', color: '#0ea5e9', tier: 2 })
const robotics = /** @type {const} */ ({ icon: 'i-mdi-robot', color: '#64748b', tier: 2 })
const frontend = /** @type {const} */ ({ icon: 'i-carbon-application-web', color: '#0891b2', tier: 2 })
const startup = /** @type {const} */ ({ icon: 'i-mdi-rocket-launch', color: '#f43f5e', tier: 2 })
const academia = /** @type {const} */ ({ icon: 'i-mdi-school', color: '#92400e', tier: 2 })
const python = /** @type {const} */ ({ icon: 'i-simple-icons-python', color: '#3776ab', tier: 1 })
const google = /** @type {const} */ ({ icon: 'i-simple-icons-google', color: '#4285f4', tier: 1 })

export const tagIconSources = /** @type {const} */ ({
  // --- Tier 1: brand / tech logos (official brand colors) ---
  'vue': { icon: 'i-simple-icons-vuedotjs', color: '#42b883', tier: 1 },
  'vite': { icon: 'i-simple-icons-vite', color: '#646cff', tier: 1 },
  'javascript': { icon: 'i-simple-icons-javascript', color: '#b7a500', tier: 1 },
  'typescript': { icon: 'i-simple-icons-typescript', color: '#3178c6', tier: 1 },
  'python': python,
  'pycon': python,
  'pytorch': { icon: 'i-simple-icons-pytorch', color: '#ee4c2c', tier: 1 },
  'linux': { icon: 'i-simple-icons-linux', color: '#555555', tier: 1 },
  'ubuntu': { icon: 'i-simple-icons-ubuntu', color: '#e95420', tier: 1 },
  'kubernetes': { icon: 'i-simple-icons-kubernetes', color: '#326ce5', tier: 1 },
  'cncf': { icon: 'i-simple-icons-cncf', color: '#446ca9', tier: 1 },
  'aws': { icon: 'i-simple-icons-amazonwebservices', color: '#c77c02', tier: 1 },
  'alibabacloud': { icon: 'i-simple-icons-alibabacloud', color: '#ff6a00', tier: 1 },
  'huawei': { icon: 'i-simple-icons-huawei', color: '#cf0a2c', tier: 1 },
  'arm': { icon: 'i-simple-icons-arm', color: '#0091bd', tier: 1 },
  'kuaishou': { icon: 'i-simple-icons-kuaishou', color: '#ff4906', tier: 1 },
  'xiaohongshu': { icon: 'i-simple-icons-xiaohongshu', color: '#ff2442', tier: 1 },
  'android': { icon: 'i-simple-icons-android', color: '#2aa15f', tier: 1 },
  'kotlin': { icon: 'i-simple-icons-kotlin', color: '#7f52ff', tier: 1 },
  'apache': { icon: 'i-simple-icons-apache', color: '#d22128', tier: 1 },
  'zabbix': { icon: 'i-carbon-cloud-monitoring', color: '#d40000', tier: 1 },
  'openinfra': { icon: 'i-simple-icons-openstack', color: '#ed1944', tier: 1 },
  'gdg': google,
  'devfest': google,
  'moonbit': { icon: 'i-carbon-moon', color: '#b92381', tier: 1 },

  // --- Tier 2: domain concepts ---
  'ai': ai,
  'artificial-intelligence': ai,
  'llm': ai,
  'agentic-ai': ai,
  'opensource': opensource,
  'foss': opensource,
  '3dprinting': printing3d,
  'additive-manufacturing': printing3d,
  'cloud': cloud,
  'cloud-native': cloud,
  'robotics': robotics,
  'embodied-ai': robotics,
  'hardware': { icon: 'i-carbon-chip', color: '#6366f1', tier: 2 },
  'frontend': frontend,
  'web': frontend,
  'mobile': { icon: 'i-carbon-mobile', color: '#16a34a', tier: 2 },
  'hackathon': { icon: 'i-mdi-lightning-bolt', color: '#d97706', tier: 2 },
  'startup': startup,
  'demoday': startup,
  'indiehacker': startup,
  'academic': academia,
  'computer-science': academia,
  'student': academia,
  'youth': academia,
  'monitoring': { icon: 'i-carbon-dashboard', color: '#475569', tier: 2 },
  'compiler': { icon: 'i-carbon-code', color: '#374151', tier: 2 },

  // --- Tier 3: chip-only (neutral gray; never shown at card level) ---
  'conference': { icon: 'i-carbon-presentation-file', color: '#64748b', tier: 3 },
  'meetup': { icon: 'i-carbon-group', color: '#64748b', tier: 3 },
  'community': { icon: 'i-carbon-events', color: '#64748b', tier: 3 },
  'expo': { icon: 'i-carbon-building', color: '#64748b', tier: 3 },
  'enterprise': { icon: 'i-carbon-enterprise', color: '#64748b', tier: 3 },
  'maker': { icon: 'i-carbon-tools', color: '#64748b', tier: 3 },
})

/** Resolve once per shared definition so tag aliases keep their identity. */
const resolved = new Map()
export const tagIcons = Object.fromEntries(Object.entries(tagIconSources).map(([tag, def]) => {
  if (!resolved.has(def))
    resolved.set(def, { ...def, ...eventPalette(def.color) })
  return [tag, resolved.get(def)]
}))
