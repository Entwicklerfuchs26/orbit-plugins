// Beim Start im Hintergrund die Wertungen der bekanntesten Titel von AniList holen und im Katalog speichern,
// damit die Standard-Reihenfolge (nach Wertung) von Anfang an sinnvoll ist. Wenige, gebuendelte Anfragen, hoechstens alle 6 h.
import { api } from '../api'
import { getLight } from './anilist'

const KEY = 'orbitlist.warm'
const BATCH = 600

export async function warmScores(): Promise<void> {
  try {
    if (Date.now() - Number(localStorage.getItem(KEY) || 0) < 6 * 3600 * 1000) return
  } catch {}
  const ids: number[] = []
  for (let off = 0; ids.length < BATCH && off < 4000; off += 400) {
    const r = await api.anime({ sort: 'popularity', limit: 400, offset: off })
    for (const m of r.items ?? []) if (m.anilist_id && m.average_score == null) ids.push(m.anilist_id)
    if (!(r.items ?? []).length) break
  }
  const want = ids.slice(0, BATCH)
  if (!want.length) return
  const res = await Promise.all(want.map(async (id) => ({ id, l: await getLight(id).catch(() => null) })))
  const items = res.filter((x) => x.l?.score).map((x) => ({ anilist_id: x.id, score: x.l!.score as number }))
  for (let i = 0; i < items.length; i += 500) await api.putScores(items.slice(i, i + 500))
  try { localStorage.setItem(KEY, String(Date.now())) } catch {}
}
