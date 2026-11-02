// KI-Suche auf dem Geraet: reine Funktionen (kein DOM, kein Netz) — Text je Titel, Modellprofile,
// Vektor-Speicherformat (Int8/Float32), Kosinus-Ranking, Antwort-Parser. Per Node testbar.

export type AiCfg = {
  enabled: boolean
  mode: 'device' | 'external'
  hf_model: string // offizieller Hugging-Face-Modellname, z. B. Xenova/multilingual-e5-small
  ext_kind: 'openai' | 'ollama'
  ext_url: string
  ext_model: string
  ext_key: string
}

export const DEFAULT_CFG: AiCfg = {
  enabled: false, mode: 'device', hf_model: '', ext_kind: 'ollama', ext_url: '', ext_model: '', ext_key: '',
}

/** Kennung des Index: ein Modell = ein eigener Index. */
export function modelId(c: AiCfg): string {
  if (c.mode === 'device') return c.hf_model ? `device:${c.hf_model.trim()}` : ''
  return c.ext_model ? `external:${c.ext_kind}:${c.ext_model.trim()}` : ''
}

// ------------------------------------------------------------------ Text je Titel
export type DocRow = {
  title_english?: string | null; title_romaji?: string | null; title_native?: string | null; title_de?: string | null
  synonyms?: string | null; genres?: string | null; studios?: string | null
  format?: string | null; season_year?: number | null
  description_de?: string | null; description_en?: string | null
}

function jsonList(s: unknown): string[] {
  if (Array.isArray(s)) return s.map(String)
  if (typeof s !== 'string' || !s) return []
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
}

export function stripHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\(\s*(Source|Quelle|Zeitsrc)[^)]*\)\s*$/i, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim()
}

/** Titel + Synonyme + Genres + Studios + Synopse (falls vorhanden) als ein Text. */
export function buildDoc(r: DocRow, maxDesc = 700): string {
  const titles: string[] = []
  for (const t of [r.title_de, r.title_english, r.title_romaji, r.title_native]) {
    const v = (t || '').trim()
    if (v && !titles.some((x) => x.toLowerCase() === v.toLowerCase())) titles.push(v)
  }
  const syn = jsonList(r.synonyms).filter((s) => !titles.includes(s)).slice(0, 6)
  const genres = jsonList(r.genres)
  const studios = jsonList(r.studios)
  const parts = [titles.join(' / ')]
  const meta = [r.format, r.season_year].filter(Boolean).join(' ')
  if (meta) parts.push(meta)
  if (syn.length) parts.push('Auch: ' + syn.join(', '))
  if (genres.length) parts.push('Genres: ' + genres.join(', '))
  if (studios.length) parts.push('Studio: ' + studios.join(', '))
  const desc = stripHtml(r.description_de) || stripHtml(r.description_en)
  if (desc) parts.push(desc.slice(0, maxDesc))
  return parts.filter(Boolean).join('. ')
}

// ------------------------------------------------------------------ Modellprofile / Vorschlaege
export type Profile = { queryPrefix: string; docPrefix: string; pooling: 'mean' | 'cls' }

/** Heuristik nach Modellname — passt fuer die gaengigen Familien (E5, BGE, GTE, MiniLM). */
export function modelProfile(name: string): Profile {
  const n = name.toLowerCase()
  if (/\be5\b|[-_/]e5[-_]/.test(n)) return { queryPrefix: 'query: ', docPrefix: 'passage: ', pooling: 'mean' }
  if (/bge/.test(n)) return { queryPrefix: '', docPrefix: '', pooling: 'cls' }
  return { queryPrefix: '', docPrefix: '', pooling: 'mean' }
}

export type Suggestion = { name: string; tier: 'sehr klein' | 'klein' | 'mittel' | 'groß'; mb: number; note: string }

export const SUGGESTIONS: Suggestion[] = [
  { name: 'Xenova/all-MiniLM-L6-v2', tier: 'sehr klein', mb: 23, note: 'nur Englisch — für deutsche Suche schwach' },
  { name: 'Xenova/multilingual-e5-small', tier: 'klein', mb: 118, note: 'mehrsprachig, gut für Deutsch' },
  { name: 'Xenova/multilingual-e5-base', tier: 'mittel', mb: 279, note: 'mehrsprachig, genauer, langsamer' },
  { name: 'Xenova/bge-m3', tier: 'groß', mb: 570, note: 'sehr genau, aber schwer — eher Desktop/viel RAM' },
]

/** Empfehlung nach Geraete-RAM (navigator.deviceMemory, Browser melden max. 8 und runden). Nur Richtwert. */
export function recommend(memGb: number | undefined): { name: string; why: string } {
  if (memGb === undefined) return { name: 'Xenova/multilingual-e5-small', why: 'Arbeitsspeicher des Geräts nicht ermittelbar — vorsichtig mit dem kleinen Modell starten.' }
  if (memGb <= 2) return { name: 'Xenova/multilingual-e5-small', why: `Dein Gerät meldet ${memGb} GB RAM — das kleine Modell ist die vorsichtige Wahl.` }
  if (memGb < 8) return { name: 'Xenova/multilingual-e5-small', why: `Dein Gerät meldet ${memGb} GB RAM — das kleine Modell läuft sicher, das mittlere könnte gehen.` }
  return { name: 'Xenova/multilingual-e5-base', why: `Dein Gerät meldet ${memGb} GB RAM oder mehr — das mittlere Modell sollte gehen.` }
}

// ------------------------------------------------------------------ Vektoren: Speicherformat
export type Fmt = 'i8' | 'f32'

export function normalize(v: ArrayLike<number>): Float32Array {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i] * v[i]
  const n = Math.sqrt(s) || 1
  const o = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) o[i] = v[i] / n
  return o
}

export function quantize(v: Float32Array): Int8Array {
  const o = new Int8Array(v.length)
  for (let i = 0; i < v.length; i++) o[i] = Math.max(-127, Math.min(127, Math.round(v[i] * 127)))
  return o
}

export type Chunk = { n: number; ids: Int32Array; data: Int8Array | Float32Array }

export function newChunk(size: number, dim: number, fmt: Fmt): Chunk {
  return { n: 0, ids: new Int32Array(size), data: fmt === 'i8' ? new Int8Array(size * dim) : new Float32Array(size * dim) }
}

/** Haengt einen (normalisierten) Vektor an; false = Chunk voll. */
export function chunkAdd(c: Chunk, dim: number, fmt: Fmt, id: number, v: Float32Array): boolean {
  if (c.n >= c.ids.length) return false
  c.ids[c.n] = id
  const off = c.n * dim
  if (fmt === 'i8') (c.data as Int8Array).set(quantize(v), off)
  else (c.data as Float32Array).set(v, off)
  c.n++
  return true
}

/** Zum Speichern: nur den belegten Teil (kopiert, damit IndexedDB keinen grossen Puffer festhaelt). */
export function chunkPack(c: Chunk, dim: number): Chunk {
  return { n: c.n, ids: c.ids.slice(0, c.n), data: c.data.slice(0, c.n * dim) }
}

/** Gespeicherter (kleinerer) Chunk zurueck in einen wachsenden mit Platz fuer `size` Eintraege. */
export function chunkUnpack(p: Chunk, size: number, dim: number, fmt: Fmt): Chunk {
  const c = newChunk(Math.max(size, p.n), dim, fmt)
  c.ids.set(p.ids.subarray(0, p.n))
  c.data.set(p.data.subarray(0, p.n * dim))
  c.n = p.n
  return c
}

export function chunkVector(c: Chunk, dim: number, fmt: Fmt, i: number): Float32Array {
  const o = new Float32Array(dim)
  const off = i * dim
  if (fmt === 'i8') for (let k = 0; k < dim; k++) o[k] = (c.data as Int8Array)[off + k] / 127
  else for (let k = 0; k < dim; k++) o[k] = (c.data as Float32Array)[off + k]
  return o
}

// ------------------------------------------------------------------ Suche: Kosinus brute-force
export type Hit = { id: number; score: number }

/** q muss normalisiert sein. allowed=null: alles. Liefert die k besten, absteigend nach Kosinus. */
export function rankCosine(q: Float32Array, chunks: Chunk[], dim: number, fmt: Fmt, allowed: Set<number> | null, k: number): Hit[] {
  const best: Hit[] = []
  let worst = -Infinity
  const scale = fmt === 'i8' ? 1 / 127 : 1
  for (const c of chunks) {
    for (let i = 0; i < c.n; i++) {
      const id = c.ids[i]
      if (allowed && !allowed.has(id)) continue
      const off = i * dim
      let s = 0
      for (let d = 0; d < dim; d++) s += q[d] * c.data[off + d]
      s *= scale
      if (best.length < k || s > worst) {
        // einsortieren (k klein, daher lineares Einfuegen)
        let p = best.length
        while (p > 0 && best[p - 1].score < s) p--
        best.splice(p, 0, { id, score: s })
        if (best.length > k) best.pop()
        worst = best.length >= k ? best[best.length - 1].score : -Infinity
      }
    }
  }
  return best
}

// ------------------------------------------------------------------ Antworten externer Endpunkte
/** Ollama: {embeddings:[[…]]} (auch altes {embedding:[…]}); OpenAI: {data:[{index,embedding}]}. */
export function parseEmbedResponse(kind: 'openai' | 'ollama', j: any): number[][] {
  if (kind === 'ollama') {
    if (Array.isArray(j?.embeddings)) return j.embeddings
    if (Array.isArray(j?.embedding)) return [j.embedding]
    throw new Error(j?.error ? String(j.error) : 'Unerwartete Antwort des Ollama-Endpunkts.')
  }
  if (Array.isArray(j?.data)) return [...j.data].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)).map((d: any) => d.embedding)
  const msg = j?.error?.message || j?.error
  throw new Error(msg ? String(msg) : 'Unerwartete Antwort des OpenAI-kompatiblen Endpunkts.')
}

export function embedUrl(kind: 'openai' | 'ollama', base: string): string {
  const b = base.trim().replace(/\/+$/, '')
  return kind === 'ollama' ? `${b}/api/embed` : `${b}/v1/embeddings`
}

// ------------------------------------------------------------------ Download-Fortschritt (mehrere Dateien)
export class ProgressAgg {
  private files = new Map<string, { loaded: number; total: number; done: boolean }>()
  /** Ereignis von Transformers.js (progress_callback). Liefert Gesamtprozent 0..100 oder null. */
  feed(e: any): number | null {
    if (!e || !e.file) return null
    const f = this.files.get(e.file) || { loaded: 0, total: 0, done: false }
    if (e.status === 'progress' || e.status === 'download') {
      if (typeof e.total === 'number' && e.total > 0) f.total = e.total
      if (typeof e.loaded === 'number') f.loaded = e.loaded
    } else if (e.status === 'done') {
      f.done = true
      if (f.total) f.loaded = f.total
    }
    this.files.set(e.file, f)
    let L = 0, T = 0
    for (const v of this.files.values()) { L += v.loaded; T += v.total }
    return T > 0 ? Math.min(100, Math.round((L / T) * 100)) : null
  }
}

export function etaText(secs: number): string {
  if (!isFinite(secs) || secs < 0) return ''
  if (secs < 90) return `noch ca. ${Math.max(1, Math.round(secs))} s`
  if (secs < 5400) return `noch ca. ${Math.round(secs / 60)} min`
  return `noch ca. ${(secs / 3600).toFixed(1).replace('.', ',')} h`
}
