// Wo ist ein Titel schaubar? Pruefung auf dem Geraet, Treffer landen in der Datenbank (Detailansicht + Wunschliste).
//  - eigene Dienste mit Direktlink-Schema: Seite aufrufen, loest sie auf -> verfuegbar (nur auf dem Handy pruefbar)
//  - AniList-Streaming-Links: echte Plattformen pro Titel
import { api } from '../api'
import { getDetail, type Stream } from './anilist'
import { checkDirect, type Service } from './services'

export type Hit = { service: string; url: string | null; source: 'direct' | 'anilist' }

/** Alle Treffer berechnen. null = es konnte nichts geprueft werden (dann gespeicherte Treffer nicht anfassen). */
export async function computeHits(
  m: { title?: string; title_english?: string | null; title_romaji?: string | null },
  services: Service[],
  streams: Stream[] | null,
): Promise<Hit[] | null> {
  const direct = await checkDirect(services, m as any)
  if (direct === null && streams === null) return null
  const hits: Hit[] = []
  const seen = new Set<string>()
  for (const d of direct ?? []) { hits.push(d); seen.add(d.service.toLowerCase()) }
  for (const s of streams ?? []) {
    if (seen.has(s.site.toLowerCase())) continue
    seen.add(s.site.toLowerCase())
    hits.push({ service: s.site, url: s.url, source: 'anilist' })
  }
  return hits
}

/** Nach Tracking-Aenderungen (Status, Folge): Titel und Dienste laden, pruefen, speichern. Fehler sind unkritisch. */
export async function refreshStreaming(id: number): Promise<void> {
  try {
    const m = await api.get(id)
    const services = await api.services(m.space === 'h' ? 'h' : 'anime')
    let streams: Stream[] | null = null
    if (m.anilist_id) {
      const d = await getDetail(m.anilist_id)
      streams = d ? d.streaming : null
    }
    const hits = await computeHits(m, services, streams)
    if (hits) await api.putStreaming(id, hits)
  } catch {}
}
