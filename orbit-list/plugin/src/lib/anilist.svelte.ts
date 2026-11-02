// Reaktive Huelle um anilist.ts: Karten melden ihre anilist_id erst an, wenn sie sichtbar werden;
// geladene Cover/Wertungen erscheinen dann automatisch (bis dahin Platzhalter).
import { getLight, cachedLight, type Light } from './anilist'
import { api } from '../api'

const store = $state<Record<number, Light>>({})
const asked = new Set<number>()

/** Schluessel fuer AniList-Abrufe: AniList-ID, sonst negative MAL-ID (z. B. viele H-Titel), sonst null. */
export const lightKey = (m: { anilist_id?: number | null; mal_id?: number | null }): number | null =>
  m.anilist_id ?? (m.mal_id ? -m.mal_id : null)

/** Bereits geladene leichte Daten (reaktiv) oder undefined. */
export function lightOf(id?: number | null): Light | undefined {
  return id ? store[id] : undefined
}

/** Daten fuer eine ID anfordern (einmal pro Sitzung; Zwischenspeicher zuerst, dann gebuendelt per Netz). */
// Geladene Wertungen im Katalog zwischenspeichern (Sortierung nach Wertung), gebuendelt
let pending: { anilist_id?: number; mal_id?: number; score: number }[] = []
let flushT: any = null
function queueScore(id: number, score?: number) {
  if (!score) return
  pending.push(id > 0 ? { anilist_id: id, score } : { mal_id: -id, score })
  clearTimeout(flushT)
  flushT = setTimeout(() => {
    const batch = pending.splice(0, 500)
    if (batch.length) api.putScores(batch).catch(() => {})
  }, 2000)
}

export function want(id?: number | null) {
  if (!id || asked.has(id)) return
  asked.add(id)
  cachedLight(id).then((c) => { if (c) store[id] = c.v })
  getLight(id).then((v) => { if (v) { store[id] = v; queueScore(id, v.score) } }).catch(() => {})
}

/** Svelte-Aktion: laedt erst, wenn das Element in (oder nahe) den sichtbaren Bereich kommt. */
export function visible(node: HTMLElement, id?: number | null) {
  if (!id) return {}
  if (typeof IntersectionObserver === 'undefined') { want(id); return {} }
  let cur = id
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { want(cur); io.disconnect() }
  }, { rootMargin: '200px' })
  io.observe(node)
  return {
    update(n?: number | null) { if (n && n !== cur) { cur = n; io.observe(node) } },
    destroy() { io.disconnect() },
  }
}
