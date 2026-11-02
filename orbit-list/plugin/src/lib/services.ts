// Streaming-Dienste: Direktlink (Schema mit {slug}) mit Rueckfall auf die Suche des Dienstes (Schema mit {q}).
import type { Media } from '../api'

export type Service = { id?: number; name: string; url_schema: string; search_schema?: string | null }

/** Titel -> URL-Kurzform: "Scum's Wish" -> "scums-wish". */
export function slugify(title: string): string {
  return title
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type TitleSet = Pick<Media, 'title' | 'title_english' | 'title_romaji'>

function titles(m: TitleSet): string[] {
  return [...new Set([m.title_english, m.title_romaji, m.title].filter((t): t is string => !!t))]
}

export function fill(schema: string, title: string): string {
  return schema.replace(/\{slug\}/g, slugify(title)).replace(/\{q\}/g, encodeURIComponent(title))
}

/** Hat der Dienst ein Direkt-Schema (mit {slug}) UND eine Such-Zeile, ist url_schema der Direktlink. */
export function hasDirect(s: Service): boolean {
  return /\{slug\}/.test(s.url_schema)
}

/** Alle Direktlink-Kandidaten (englischer, romaji-Titel) samt Kurzform, ohne Doppelte. */
export function directCandidates(s: Service, m: TitleSet): { url: string; slug: string }[] {
  if (!hasDirect(s)) return []
  const out = new Map<string, { url: string; slug: string }>()
  for (const t of titles(m)) {
    const url = fill(s.url_schema, t)
    if (!out.has(url)) out.set(url, { url, slug: slugify(t) })
  }
  return [...out.values()]
}

/** Seiten leiten unbekannte Titel oft stillschweigend auf eine Uebersicht um (Status 200!). Treffer nur, wenn die
 *  Kurzform auch nach allen Weiterleitungen noch im Pfad steht. Ohne Endadresse (Browser) laesst sich das nicht pruefen. */
export function landedOn(finalUrl: string | undefined, slug: string): boolean {
  if (!finalUrl) return true
  try { return decodeURIComponent(new URL(finalUrl).pathname).toLowerCase().includes(slug.toLowerCase()) } catch { return true }
}

export function searchUrl(s: Service, m: TitleSet): string {
  const t = titles(m)[1] ?? titles(m)[0] ?? ''
  return fill(s.search_schema || (hasDirect(s) ? '' : s.url_schema), t)
}

function nativeGet(): ((url: string) => Promise<{ status: number; url?: string }>) | null {
  const cap = (globalThis as any).Capacitor
  const plug = cap?.isNativePlatform?.() ? cap?.Plugins?.CapacitorHttp : null
  if (!plug) return null
  return async (url) => {
    const r = await plug.request({ url, method: 'GET', connectTimeout: 6000, readTimeout: 8000 })
    return { status: r.status, url: r.url }
  }
}

/**
 * Oeffnet den Dienst: erst der Direktlink (wenn erreichbar), sonst die Suche.
 * Die Pruefung geht nur auf dem Handy (nativer Zugriff umgeht CORS); im Browser wird der Direktlink einfach geoeffnet.
 */
export async function openService(s: Service, m: TitleSet): Promise<void> {
  const search = searchUrl(s, m)
  const cands = directCandidates(s, m)
  if (!cands.length) return void window.open(search, '_blank', 'noopener')
  const get = nativeGet()
  if (!get) return void window.open(cands[0].url, '_blank', 'noopener')
  for (const c of cands) {
    try {
      const r = await get(c.url)
      if (r.status >= 200 && r.status < 400 && landedOn(r.url, c.slug)) return void window.open(c.url, '_blank', 'noopener')
    } catch {}
  }
  window.open(search || cands[0].url, '_blank', 'noopener')
}

/** Direktlinks aller Dienste mit Schema pruefen (nur auf dem Handy moeglich). Gibt null zurueck, wenn nicht pruefbar. */
export async function checkDirect(services: Service[], m: TitleSet): Promise<{ service: string; url: string; source: 'direct' }[] | null> {
  const get = nativeGet()
  const direct = services.filter(hasDirect)
  if (!get || !direct.length) return get ? [] : null
  const hits: { service: string; url: string; source: 'direct' }[] = []
  await Promise.all(direct.map(async (s) => {
    for (const c of directCandidates(s, m)) {
      try {
        const r = await get(c.url)
        if (r.status >= 200 && r.status < 400 && landedOn(r.url, c.slug)) { hits.push({ service: s.name, url: c.url, source: 'direct' }); return }
      } catch {}
    }
  }))
  return hits
}
