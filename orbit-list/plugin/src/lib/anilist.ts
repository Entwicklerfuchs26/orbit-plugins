// AniList-Laufzeit-Client: holt Cover, Wertungen und Detaildaten erst auf dem Geraet des Nutzers
// per anilist_id (der Katalog selbst enthaelt keine AniList-Inhalte). Rahmen:
//  - Batching (id_in, bis 50 pro Anfrage) fuer die leichten Kartendaten
//  - Zwischenspeicher im Geraet (IndexedDB, sonst nur Arbeitsspeicher) mit Ablauf
//  - Ratenbegrenzung: Anfragen laufen einzeln hintereinander mit Mindestabstand; bei 429 Pause
//  - ohne anilist_id oder ohne Netz passiert nichts (Aufrufer zeigen dann Platzhalter)
// Framework-frei, damit es sich in Node testen laesst; die reaktive Huelle ist anilist.svelte.ts.

export type AlRes = { status: number; json(): Promise<any>; text(): Promise<string>; headers?: Record<string, string> }
export type AlHttp = (url: string, init: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<AlRes>

const ENDPOINT = 'https://graphql.anilist.co'

export type Light = {
  id: number
  cover?: string
  banner?: string
  color?: string
  score?: number
  popularity?: number
}
export type Person = { id: number; name: string; image?: string }
export type CharEdge = { role: string; char: Person; actors: (Person & { lang?: string })[] }
export type StaffEdge = { role: string; person: Person }
export type MediaRef = { id: number; title: string; cover?: string; format?: string; type?: string; status?: string; score?: number }
export type Relation = MediaRef & { relation: string }
export type Recommendation = MediaRef & { rating: number }
export type Stream = { site: string; url: string; color?: string; icon?: string; language?: string }
export type Detail = {
  id: number
  description?: string
  characters: CharEdge[]
  staff: StaffEdge[]
  statusDist: { status: string; amount: number }[]
  scoreDist: { score: number; amount: number }[]
  relations: Relation[]
  recommendations: Recommendation[]
  streaming: Stream[]
  nextAiring?: { episode: number; at: number }
}

// ---------------------------------------------------------------- Transport

let transport: AlHttp | null = null
/** Eigener Transport (z. B. CapacitorHttp). Ohne Aufruf: CapacitorHttp wenn nativ vorhanden, sonst fetch. */
export function setAnilistTransport(t: AlHttp | null) { transport = t }

const fetchHttp: AlHttp = async (url, init) => {
  const r = await fetch(url, init)
  const headers: Record<string, string> = {}
  r.headers.forEach((v, k) => (headers[k.toLowerCase()] = v))
  return { status: r.status, json: () => r.json(), text: () => r.text(), headers }
}

// Nativ (Android/iOS-WebView): CapacitorHttp umgeht CORS-Probleme des WebViews.
const makeNative = (): AlHttp | null => {
  try {
    const cap = (globalThis as any).Capacitor
    const plug = cap?.isNativePlatform?.() ? cap?.Plugins?.CapacitorHttp : null
    if (!plug) return null
    return async (url, init) => {
      const r = await plug.request({
        url, method: init.method || 'GET', headers: init.headers,
        data: init.body ? JSON.parse(init.body) : undefined, connectTimeout: 8000, readTimeout: 20000,
      })
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(r.headers || {})) headers[k.toLowerCase()] = String(v)
      return { status: r.status, json: async () => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data), text: async () => (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)), headers }
    }
  } catch { return null }
}

let nativeHttp: AlHttp | null | undefined
const http = (): AlHttp => {
  if (transport) return transport
  if (nativeHttp === undefined) nativeHttp = makeNative() // erst beim ersten Aufruf: Capacitor ist dann sicher da
  return nativeHttp || fetchHttp
}

// ---------------------------------------------------------------- Zwischenspeicher

const TTL_LIGHT = 7 * 864e5   // Cover/Wertung: eine Woche
const TTL_DETAIL = 3 * 864e5  // Detail: drei Tage
const IDB_NAME = 'orbitlist-anilist'
type Row = { k: string; at: number; v: any }

const mem = new Map<string, Row>()
let dbp: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbp) return dbp
  dbp = new Promise((res) => {
    try {
      if (typeof indexedDB === 'undefined') return res(null)
      const rq = indexedDB.open(IDB_NAME, 1)
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv', { keyPath: 'k' })
      rq.onsuccess = () => res(rq.result)
      rq.onerror = () => res(null)
      rq.onblocked = () => res(null)
    } catch { res(null) }
  })
  return dbp
}

async function cacheGet(k: string): Promise<Row | null> {
  const hit = mem.get(k)
  if (hit) return hit
  const db = await openDb()
  if (!db) return null
  return new Promise((res) => {
    try {
      const rq = db.transaction('kv').objectStore('kv').get(k)
      rq.onsuccess = () => { const r = rq.result as Row | undefined; if (r) mem.set(k, r); res(r || null) }
      rq.onerror = () => res(null)
    } catch { res(null) }
  })
}

async function cachePut(k: string, v: any) {
  const row: Row = { k, at: Date.now(), v }
  mem.set(k, row)
  const db = await openDb()
  if (!db) return
  try { db.transaction('kv', 'readwrite').objectStore('kv').put(row) } catch {}
}

/** Zwischenspeicher leeren (Einstellungen / Tests). */
export async function clearAnilistCache() {
  mem.clear()
  const db = await openDb()
  if (!db) return
  try { db.transaction('kv', 'readwrite').objectStore('kv').clear() } catch {}
}

// ---------------------------------------------------------------- Ratenbegrenzung + Warteschlange

// AniList erlaubt aktuell 30 (frueher 90) Anfragen/min; wir bleiben deutlich darunter.
let gapMs = 2200
let blockedUntil = 0
let lastAt = 0
let chain: Promise<unknown> = Promise.resolve()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const alState = { blockedUntil: () => blockedUntil }

/** Eine GraphQL-Anfrage, seriell und mit Mindestabstand. Wirft bei Netz-/HTTP-Fehler. */
function gql(query: string, variables: Record<string, unknown>): Promise<any> {
  const run = async () => {
    // Laenger gesperrt (429): nicht in der Warteschlange haengen, sondern sofort scheitern
    if (blockedUntil - Date.now() > 15000) throw Object.assign(new Error('AniList: Anfragelimit erreicht'), { status: 429 })
    const wait = Math.max(blockedUntil, lastAt + gapMs) - Date.now()
    if (wait > 0) await sleep(wait)
    lastAt = Date.now()
    const r = await http()(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    const lim = Number(r.headers?.['x-ratelimit-limit'])
    if (lim > 0) gapMs = Math.max(700, Math.ceil(60000 / lim) + 200)
    if (r.status === 429) {
      const ra = Number(r.headers?.['retry-after'])
      blockedUntil = Date.now() + (ra > 0 ? ra * 1000 : 60000)
      throw Object.assign(new Error('AniList: Anfragelimit erreicht'), { status: 429 })
    }
    if (r.status < 200 || r.status >= 300) throw Object.assign(new Error(`AniList: Status ${r.status}`), { status: r.status })
    const d = await r.json()
    if (d?.errors?.length && !d.data) throw new Error('AniList: ' + (d.errors[0]?.message || 'Fehler'))
    return d.data
  }
  const p = chain.then(run, run)
  chain = p.catch(() => {})
  return p
}

// ---------------------------------------------------------------- Leichte Daten (Karten)

const Q_LIGHT = `query($ids:[Int],$n:Int){Page(perPage:$n){media(id_in:$ids,type:ANIME){id averageScore popularity bannerImage coverImage{large color}}}}`

function toLight(m: any): Light {
  return {
    id: m.id,
    cover: m.coverImage?.large || undefined,
    banner: m.bannerImage || undefined,
    color: hex(m.coverImage?.color),
    score: m.averageScore ?? undefined,
    popularity: m.popularity ?? undefined,
  }
}

/** Nur aus dem Zwischenspeicher (frisch oder abgelaufen), ohne Netz. */
export async function cachedLight(id: number): Promise<{ v: Light; fresh: boolean } | null> {
  const r = await cacheGet('l:' + id)
  return r ? { v: r.v, fresh: Date.now() - r.at < TTL_LIGHT } : null
}

const failedUntil = new Map<number, number>() // Fehlversuche nicht sofort wiederholen
let lightWaiters = new Map<number, ((v: Light | null) => void)[]>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

/** Leichte Daten fuer eine anilist_id; gebuendelt, gecacht, nie ohne ID. Liefert null wenn nicht verfuegbar. */
export async function getLight(id: number | null | undefined): Promise<Light | null> {
  if (!id || !Number.isFinite(id)) return null
  const c = await cachedLight(id)
  if (c?.fresh) return c.v
  if ((failedUntil.get(id) || 0) > Date.now()) return c?.v ?? null
  return new Promise((res) => {
    const l = lightWaiters.get(id)
    const done = (v: Light | null) => res(v ?? c?.v ?? null)
    if (l) l.push(done)
    else lightWaiters.set(id, [done])
    if (!flushTimer) flushTimer = setTimeout(flushLight, 80)
  })
}

async function flushLight() {
  flushTimer = null
  const waiters = lightWaiters
  lightWaiters = new Map()
  const ids = [...waiters.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50)
    let got = new Map<number, Light>()
    try {
      const d = await gql(Q_LIGHT, { ids: part, n: part.length })
      for (const m of d?.Page?.media || []) got.set(m.id, toLight(m))
      for (const id of part) {
        const v = got.get(id)
        if (v) await cachePut('l:' + id, v)
        else failedUntil.set(id, Date.now() + 6 * 3600e3) // AniList kennt die ID nicht
      }
    } catch (e: any) {
      const back = e?.status === 429 ? Math.max(30e3, blockedUntil - Date.now()) : 60e3
      for (const id of part) failedUntil.set(id, Date.now() + back)
    }
    for (const id of part) for (const w of waiters.get(id) || []) w(got.get(id) ?? null)
  }
}

// ---------------------------------------------------------------- Detaildaten

const Q_DETAIL = `query($id:Int){Media(id:$id,type:ANIME){id description(asHtml:false)
nextAiringEpisode{episode airingAt}
externalLinks{site url type language color icon isDisabled}
stats{statusDistribution{status amount} scoreDistribution{score amount}}
characters(sort:[ROLE,RELEVANCE,ID],perPage:24){edges{role node{id name{userPreferred} image{medium}} voiceActors(language:JAPANESE,sort:RELEVANCE){id languageV2 name{userPreferred} image{medium}}}}
staff(sort:RELEVANCE,perPage:24){edges{role node{id name{userPreferred} image{medium}}}}
relations{edges{relationType(version:2) node{id type format status title{userPreferred} coverImage{large} averageScore}}}
recommendations(sort:RATING_DESC,perPage:12){nodes{rating mediaRecommendation{id type format averageScore title{userPreferred} coverImage{large}}}}}}`

const hex = (c: any): string | undefined => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c) ? c : undefined)
const person = (n: any): Person => ({ id: n.id, name: n.name?.userPreferred || '?', image: n.image?.medium || undefined })
const mref = (n: any): MediaRef => ({
  id: n.id, title: n.title?.userPreferred || '?', cover: n.coverImage?.large || undefined,
  format: n.format || undefined, type: n.type || undefined, status: n.status || undefined, score: n.averageScore ?? undefined,
})

export function toDetail(m: any): Detail {
  return {
    id: m.id,
    description: m.description || undefined,
    nextAiring: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt } : undefined,
    characters: (m.characters?.edges || []).map((e: any) => ({
      role: e.role, char: person(e.node),
      actors: (e.voiceActors || []).map((a: any) => ({ ...person(a), lang: a.languageV2 || undefined })),
    })),
    staff: (m.staff?.edges || []).map((e: any) => ({ role: e.role || '', person: person(e.node) })),
    statusDist: m.stats?.statusDistribution || [],
    scoreDist: m.stats?.scoreDistribution || [],
    relations: (m.relations?.edges || []).map((e: any) => ({ ...mref(e.node), relation: e.relationType })),
    recommendations: (m.recommendations?.nodes || []).filter((n: any) => n.mediaRecommendation).map((n: any) => ({ ...mref(n.mediaRecommendation), rating: n.rating ?? 0 })),
    streaming: streamingFrom(m.externalLinks || []),
  }
}

/** Nur echte Streaming-Links (AniList-Typ STREAMING), ohne Duplikate je Plattform. */
export function streamingFrom(links: any[]): Stream[] {
  const seen = new Set<string>()
  const out: Stream[] = []
  for (const l of links) {
    if (l?.type !== 'STREAMING' || l.isDisabled || !/^https?:\/\//i.test(l.url || '')) continue
    const key = (l.site || '') + '|' + (l.language || '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ site: l.site, url: l.url, color: hex(l.color), icon: l.icon || undefined, language: l.language || undefined })
  }
  return out
}

const inflight = new Map<number, Promise<Detail | null>>()

/** Detaildaten fuer eine anilist_id (Cache bis 3 Tage; bei Fehler ggf. abgelaufener Stand; sonst null). */
export function getDetail(id: number | null | undefined): Promise<Detail | null> {
  if (!id || !Number.isFinite(id)) return Promise.resolve(null)
  let p = inflight.get(id)
  if (p) return p
  p = (async () => {
    const c = await cacheGet('d:' + id)
    if (c && Date.now() - c.at < TTL_DETAIL) return c.v as Detail
    try {
      const d = await gql(Q_DETAIL, { id })
      if (!d?.Media) return (c?.v as Detail) ?? null
      const v = toDetail(d.Media)
      await cachePut('d:' + id, v)
      return v
    } catch {
      return (c?.v as Detail) ?? null
    }
  })().finally(() => inflight.delete(id))
  inflight.set(id, p)
  return p
}

// ---------------------------------------------------------------- Ausstrahlung (Demnaechst)

const Q_AIRING = `query($ids:[Int],$n:Int){Page(perPage:$n){media(id_in:$ids,type:ANIME){id nextAiringEpisode{episode airingAt}}}}`
export type Airing = { id: number; episode: number; at: number }

/** Naechste Folge (Unix-Sekunden) fuer bis zu 50 IDs in einer Anfrage; 1 Stunde Zwischenspeicher. */
export async function getAiring(ids: (number | null | undefined)[]): Promise<Airing[]> {
  const list = [...new Set(ids.filter((x): x is number => !!x && Number.isFinite(x)))].slice(0, 50)
  const out: Airing[] = []
  const need: number[] = []
  for (const id of list) {
    const c = await cacheGet('a:' + id)
    if (c && Date.now() - c.at < 36e5) { if (c.v) out.push(c.v) } else need.push(id)
  }
  if (need.length) {
    try {
      const d = await gql(Q_AIRING, { ids: need, n: need.length })
      const got = new Map<number, Airing>()
      for (const m of d?.Page?.media || []) if (m.nextAiringEpisode) got.set(m.id, { id: m.id, episode: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt })
      for (const id of need) {
        const v = got.get(id) ?? null
        await cachePut('a:' + id, v)
        if (v) out.push(v)
      }
    } catch {}
  }
  return out.sort((a, b) => a.at - b.at)
}

// ---------------------------------------------------------------- Mitwirkende je Titel (Statistik)

const Q_CREDITS = `query($ids:[Int],$n:Int){Page(perPage:$n){media(id_in:$ids,type:ANIME){id
staff(sort:RELEVANCE,perPage:15){edges{role node{id name{userPreferred} image{medium}}}}
characters(sort:[ROLE,RELEVANCE],perPage:12){edges{node{id} voiceActors(language:JAPANESE,sort:RELEVANCE){id name{userPreferred} image{medium}}}}}}}`
export type Credits = { id: number; staff: StaffEdge[]; actors: Person[] }

/** Staff + japanische Sprecher fuer viele Titel (10 pro Anfrage, 7 Tage Zwischenspeicher). onProgress(fertig, gesamt). */
export async function getCredits(ids: number[], onProgress?: (done: number, total: number) => void): Promise<Credits[]> {
  const list = [...new Set(ids.filter((x) => !!x && Number.isFinite(x)))]
  const out: Credits[] = []
  const need: number[] = []
  for (const id of list) {
    const c = await cacheGet('s:' + id)
    if (c && Date.now() - c.at < TTL_LIGHT) out.push(c.v)
    else need.push(id)
  }
  let done = list.length - need.length
  onProgress?.(done, list.length)
  for (let i = 0; i < need.length; i += 10) {
    const part = need.slice(i, i + 10)
    try {
      const d = await gql(Q_CREDITS, { ids: part, n: part.length })
      for (const m of d?.Page?.media || []) {
        const seen = new Set<number>()
        const actors: Person[] = []
        for (const e of m.characters?.edges || []) for (const a of e.voiceActors || []) if (!seen.has(a.id)) { seen.add(a.id); actors.push(person(a)) }
        const v: Credits = { id: m.id, staff: (m.staff?.edges || []).map((e: any) => ({ role: e.role || '', person: person(e.node) })), actors }
        await cachePut('s:' + m.id, v)
        out.push(v)
      }
    } catch (e: any) {
      if (e?.status === 429) break // Limit erreicht: mit dem Bisherigen weiterarbeiten, spaeter erneut versuchen
    }
    done += part.length
    onProgress?.(Math.min(done, list.length), list.length)
  }
  return out
}

// ---------------------------------------------------------------- Hilfen

/** AniList-Beschreibung ist Text mit <br>/<i>/<b>; alles andere wird entschaerft. */
export function safeHtml(s: string | undefined | null): string {
  if (!s) return ''
  const esc = s.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-f]+|[a-z]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/&lt;(\/?)(br|i|b|em|strong|p)\s*\/?&gt;/gi, (_m, close, tag) => `<${close}${tag.toLowerCase()}>`)
}
