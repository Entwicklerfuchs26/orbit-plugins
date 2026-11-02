// API-Client. Im Dev (vite) gegen das Backend auf :8787 (CORS offen);
// im Build (vom Backend unter /app serviert) same-origin.
import { request } from './lib/conn.svelte'

function qs(q: Record<string, unknown>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? '?' + s : ''
}

async function j(path: string, opts: RequestInit = {}): Promise<any> {
  const r = await request(path, opts as any)
  if (r.status < 200 || r.status >= 300) throw Object.assign(new Error(`${path} → ${r.status}`), { status: r.status })
  return r.json()
}

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export type Media = {
  id: number
  title: string
  title_romaji?: string
  title_english?: string
  title_native?: string
  title_de?: string
  synonyms?: string[]
  description?: string
  genres?: string[]
  format?: string
  episodes?: number
  season_year?: number
  average_score?: number
  popularity?: number
  cover_url?: string
  banner_url?: string
  color?: string
  dub_de?: number
  dub_tier?: string
  info_links?: Record<string, string>
  rating?: number
  note?: string
  watch_status?: string
  collection?: string
  lent_to?: string
}

/** Export als Datei laden (Anfrage mit Zugangsschluessel, dann lokaler Download). */
export async function downloadExport(kind: 'mal' | 'json') {
  const r = await request('/export/' + kind)
  if (r.status !== 200) throw new Error(`Export fehlgeschlagen (${r.status})`)
  const text = await r.text()
  const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'application/xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = kind === 'json' ? 'orbitlist-backup.json' : 'orbitlist-mal.xml'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/** Nutzerdaten importieren (Orbitlist-JSON oder MAL-XML). */
export async function importUserData(file: File): Promise<{ matched: number; not_in_catalog: number }> {
  const r = await request('/import', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: await file.text() })
  const d = await r.json().catch(() => ({}))
  if (r.status !== 200) throw new Error(d.detail || `Import fehlgeschlagen (${r.status})`)
  return d
}

export const api = {
  health: () => j('/health'),
  stats: () => j('/stats'),
  anime: (q: Record<string, unknown> = {}) => j('/anime' + qs(q)),
  get: (id: number) => j('/anime/' + id),
  patchEntry: (id: number, patch: Record<string, unknown>) =>
    j(`/media/${id}/entry`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }),
  reorderFavorites: (ids: number[]) => j('/favorites/reorder', jsonBody({ ids })),
  services: (config = 'anime') => j('/services' + qs({ config })),
  addService: (body: Record<string, unknown>) => j('/services', jsonBody(body)),
  deleteService: (id: number) => j('/services/' + id, { method: 'DELETE' }),
  aiSearch: (opts: Record<string, unknown>, token?: string | null) =>
    j('/ai/search' + qs(opts), token ? { headers: { 'x-h-password': token } } : {}),
  profileStats: () => j('/profile/stats'),
  statsGenres: () => j('/stats/genres'),
  statsTags: () => j('/stats/tags'),
  statsDistributions: () => j('/stats/distributions'),
  // Filter-Metadaten pro Config (eigene Genres/Formate je Config; H braucht Token)
  metaFilters: (opts: Record<string, unknown> = {}, token?: string | null) =>
    j('/meta/filters' + qs(opts), token ? { headers: { 'x-h-password': token } } : {}),
  availability: (id: number) => j(`/media/${id}/availability`),
  // Medientyp-Configs (Dropdown-Umschalter). token nötig, damit versteckte (H) mitkommen.
  mediaTypes: (token?: string | null) =>
    j('/media-types', token ? { headers: { 'x-h-password': token } } : {}),
  addMediaType: (body: Record<string, unknown>) => j('/media-types', jsonBody(body)),
  deleteMediaType: (slug: string) => j('/media-types/' + encodeURIComponent(slug), { method: 'DELETE' }),
  activeMediaType: () => j('/media-types/active'),
  setActiveMediaType: (slug: string) =>
    j('/media-types/active', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) }),
  // H-Gate
  hStatus: () => j('/h/status'),
  hSetPassword: (password: string) => j('/h/password', jsonBody({ password })),
  hUnlock: (password: string) => j('/h/unlock', jsonBody({ password })),
  aiConfig: () => j('/ai/config'),
  aiConfigSet: (body: Record<string, unknown>) => j('/ai/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  aiTest: () => j('/ai/test', { method: 'POST' }),
  aiStatus: () => j('/ai/status'),
  aiIndex: (rebuild = false) => j('/ai/index' + (rebuild ? '?rebuild=true' : ''), { method: 'POST' }),
  anilistImport: (username: string) => j('/sync/anilist/import', jsonBody({ username })),
  anilistUsername: () => j('/sync/anilist/username'),
  statsStudios: () => j('/stats/studios'),
  syncPreview: () => j('/sync/anilist/preview'),
  syncRun: () => j('/sync/anilist/run', { method: 'POST' }),
  pairInfo: () => j('/pair/info'),
  hReset: () => j('/h/reset', { method: 'POST' }),
  h: (token: string, q: Record<string, unknown> = {}) => j('/h' + qs(q), { headers: { 'x-h-password': token } }),
}
