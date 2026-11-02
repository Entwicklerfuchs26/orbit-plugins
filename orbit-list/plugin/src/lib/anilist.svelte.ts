// Reaktive Huelle um anilist.ts: Karten melden ihre anilist_id erst an, wenn sie sichtbar werden;
// geladene Cover/Wertungen erscheinen dann automatisch (bis dahin Platzhalter).
import { getLight, cachedLight, type Light } from './anilist'

const store = $state<Record<number, Light>>({})
const asked = new Set<number>()

/** Bereits geladene leichte Daten (reaktiv) oder undefined. */
export function lightOf(id?: number | null): Light | undefined {
  return id ? store[id] : undefined
}

/** Daten fuer eine ID anfordern (einmal pro Sitzung; Zwischenspeicher zuerst, dann gebuendelt per Netz). */
export function want(id?: number | null) {
  if (!id || asked.has(id)) return
  asked.add(id)
  cachedLight(id).then((c) => { if (c) store[id] = c.v })
  getLight(id).then((v) => { if (v) store[id] = v }).catch(() => {})
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
