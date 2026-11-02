// AniList-Abgleich (beide Richtungen) auf dem Geraet. Loescht NIE etwas: weder auf AniList noch lokal.
//  - Pull: AniList -> lokal (neue Eintraege + aktuellere Staende), ueber POST /sync/apply
//  - Push: lokal -> AniList (neue Eintraege + aktuellere Staende), nur SaveMediaListEntry (nie DeleteMediaListEntry)
// Der Token bleibt nur auf diesem Geraet (localStorage), er steht weder im Export noch im Katalog.
import { api } from '../api'
import { alHttp } from './anilist'

const API = 'https://graphql.anilist.co'
const LS = 'orbitlist.anilist'

const TO_AL: Record<string, string> = {
  watching: 'CURRENT', planning: 'PLANNING', completed: 'COMPLETED', dropped: 'DROPPED', paused: 'PAUSED', rewatching: 'REPEATING',
}
const FROM_AL: Record<string, string> = Object.fromEntries(Object.entries(TO_AL).map(([k, v]) => [v, k]))

export type Auth = { token?: string; username?: string; clientId?: string }
export type Local = {
  anilist_id: number | null; mal_id: number | null; title_romaji: string; watch_status: string
  rating: number | null; progress: number | null; updated_at: string | null
}
export type Remote = {
  mediaId: number; malId: number | null; title: string; status: string; score: number; progress: number
  repeat: number; updatedAt: number; started: string | null; completed: string | null
}
export type Plan = {
  pullNew: Remote[]; pullUpd: Remote[]; push: { l: Local; r: Remote | null }[]; same: number
  favorites: number[]; remoteCount: number; localCount: number
}

export function loadAuth(): Auth {
  try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} }
}
export function saveAuth(a: Auth) {
  try { localStorage.setItem(LS, JSON.stringify(a)) } catch {}
}
export function clearToken() {
  const a = loadAuth()
  delete a.token
  saveAuth(a)
}

/** Adresse, unter der man bei AniList einen Token abholt (Implicit Grant, Redirect = AniList-Pin-Seite). */
export const authorizeUrl = (clientId: string) =>
  `https://anilist.co/api/v2/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token`

let lastCall = 0
async function gql(query: string, variables: Record<string, unknown> = {}, token?: string): Promise<any> {
  // hoechstens ~40 Anfragen pro Minute (AniList erlaubt 90)
  const wait = lastCall + 1500 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const r = await alHttp()(API, { method: 'POST', headers, body: JSON.stringify({ query, variables }) })
  if (r.status === 429) throw new Error('AniList: zu viele Anfragen — bitte in einer Minute erneut versuchen.')
  const d: any = await r.json().catch(() => ({}))
  if (r.status === 401 || d?.errors?.some((e: any) => e.status === 401)) throw new Error('AniList: Token ungültig oder abgelaufen.')
  if (d?.errors?.length) throw new Error('AniList: ' + (d.errors[0].message || 'Fehler'))
  if (r.status >= 400) throw new Error(`AniList antwortet mit Status ${r.status}.`)
  return d.data
}

/** Token pruefen: gibt den AniList-Benutzernamen zurueck. */
export async function verifyToken(token: string): Promise<{ id: number; name: string }> {
  const d = await gql('{ Viewer { id name } }', {}, token)
  if (!d?.Viewer) throw new Error('AniList: Token ungültig.')
  return d.Viewer
}

const LIST_Q = `query ($userId: Int, $userName: String) {
  MediaListCollection(userId: $userId, userName: $userName, type: ANIME) { lists { entries {
    mediaId status progress repeat updatedAt score(format: POINT_100)
    startedAt { year month day } completedAt { year month day }
    media { idMal title { romaji } } } } } }`
const FAV_Q = `query ($userId: Int, $userName: String, $p: Int) {
  User(id: $userId, name: $userName) { favourites { anime(page: $p, perPage: 25) { pageInfo { hasNextPage } nodes { id } } } } }`

const dstr = (d: any): string | null => (d?.year ? `${String(d.year).padStart(4, '0')}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}` : null)

export async function fetchRemote(auth: Auth, userId?: number): Promise<{ entries: Remote[]; favorites: number[] }> {
  const who = userId ? { userId } : { userName: auth.username }
  if (!userId && !auth.username) throw new Error('Bitte AniList-Benutzername oder Token angeben.')
  const d = await gql(LIST_Q, who, auth.token)
  const seen = new Map<number, Remote>()
  for (const l of d?.MediaListCollection?.lists ?? []) {
    for (const e of l.entries ?? []) {
      if (seen.has(e.mediaId)) continue
      seen.set(e.mediaId, {
        mediaId: e.mediaId, malId: e.media?.idMal ?? null, title: e.media?.title?.romaji ?? String(e.mediaId),
        status: FROM_AL[e.status] ?? 'none', score: e.score || 0, progress: e.progress || 0, repeat: e.repeat || 0,
        updatedAt: e.updatedAt || 0, started: dstr(e.startedAt), completed: dstr(e.completedAt),
      })
    }
  }
  const favorites: number[] = []
  try {
    for (let p = 1; p < 40; p++) {
      const f = await gql(FAV_Q, { ...who, p }, auth.token)
      const a = f?.User?.favourites?.anime
      favorites.push(...(a?.nodes ?? []).map((n: any) => n.id))
      if (!a?.pageInfo?.hasNextPage) break
    }
  } catch {} // Favoriten sind optional
  return { entries: [...seen.values()], favorites }
}

const rating10 = (score100: number) => Math.round(score100 / 10)
const utc = (s: string | null) => (s ? Date.parse(s.replace(' ', 'T') + 'Z') || 0 : 0)

/** Unterschiede ermitteln (ohne etwas zu veraendern). Bei Abweichung gewinnt die neuere Seite; Gleiches wird nicht angefasst. */
export function plan(remote: Remote[], local: Local[], favorites: number[]): Plan {
  const byAni = new Map<number, Local>()
  const byMal = new Map<number, Local>()
  for (const l of local) {
    if (l.anilist_id) byAni.set(l.anilist_id, l)
    if (l.mal_id) byMal.set(l.mal_id, l)
  }
  const matched = new Set<Local>()
  const out: Plan = { pullNew: [], pullUpd: [], push: [], same: 0, favorites, remoteCount: remote.length, localCount: local.length }
  for (const r of remote) {
    const l = byAni.get(r.mediaId) ?? (r.malId ? byMal.get(r.malId) : undefined)
    if (!l) { out.pullNew.push(r); continue }
    matched.add(l)
    const lr = l.rating || 0
    const sameScore = r.score === 0 || lr === 0 ? true : lr === rating10(r.score) // 85 und 9 gelten als gleich
    const same = l.watch_status === r.status && (l.progress || 0) === r.progress && sameScore
      && !(r.score > 0 && lr === 0) && !(lr > 0 && r.score === 0)
    if (same) { out.same++; continue }
    if (r.updatedAt * 1000 > utc(l.updated_at)) out.pullUpd.push(r)
    else out.push.push({ l, r })
  }
  for (const l of local) {
    if (matched.has(l) || !l.anilist_id || l.watch_status === 'none') continue
    out.push.push({ l, r: null }) // lokal vorhanden, bei AniList (noch) nicht
  }
  return out
}

export async function loadLocal(): Promise<Local[]> {
  const d = await api.syncLocal()
  return d?.entries ?? []
}

/** AniList -> lokal. Gibt Zahlen zurueck. */
export async function applyPull(p: Plan): Promise<{ updated: number; notInCatalog: number; favoritesAdded: number }> {
  const items = [...p.pullNew, ...p.pullUpd].map((r) => ({
    anilist_id: r.mediaId, mal_id: r.malId, watch_status: r.status === 'none' ? undefined : r.status,
    rating: r.score > 0 ? rating10(r.score) : undefined, progress: r.progress,
    started_at: r.started ?? undefined, completed_at: r.completed ?? undefined, rewatches: r.repeat,
    updated_at: r.updatedAt ? new Date(r.updatedAt * 1000).toISOString().slice(0, 19).replace('T', ' ') : undefined,
  }))
  let updated = 0, notInCatalog = 0, favoritesAdded = 0
  for (let i = 0; i < Math.max(items.length, 1); i += 200) {
    const r = await api.syncApply({ entries: items.slice(i, i + 200), favorites: i === 0 ? p.favorites : [] })
    updated += r.updated; notInCatalog += r.not_in_catalog; favoritesAdded += r.favorites_added
  }
  return { updated, notInCatalog, favoritesAdded }
}

/** lokal -> AniList (nur Anlegen/Aktualisieren; nie Loeschen). Braucht Token. */
export async function applyPush(p: Plan, token: string, progress?: (done: number, total: number) => void): Promise<{ sent: number; errors: string[] }> {
  let sent = 0
  const errors: string[] = []
  const rows = p.push.filter((x) => x.l.anilist_id && TO_AL[x.l.watch_status])
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10)
    const body = chunk.map(({ l, r }, k) => {
      const args = [`mediaId: ${Number(l.anilist_id)}`, `status: ${TO_AL[l.watch_status]}`, `progress: ${Math.max(0, Math.floor(l.progress || 0))}`]
      const lr = l.rating || 0
      // Wertung nur senden, wenn lokal vorhanden und (gerundet) anders als bei AniList: 85 bleibt 85, wenn lokal 9 steht
      if (lr > 0 && (!r || rating10(r.score) !== lr)) args.push(`scoreRaw: ${Math.min(100, lr * 10)}`)
      return `a${k}: SaveMediaListEntry(${args.join(', ')}) { id }`
    }).join('\n')
    try {
      await gql(`mutation {\n${body}\n}`, {}, token)
      sent += chunk.length
    } catch (e: any) {
      errors.push(e?.message || String(e))
      if (/Token|zu viele/.test(e?.message || '')) break
    }
    progress?.(Math.min(i + 10, rows.length), rows.length)
  }
  return { sent, errors }
}
