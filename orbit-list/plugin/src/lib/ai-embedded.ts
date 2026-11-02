// KI-Suche im eingebetteten Backend (Handy/Desktop-Plugin). Das Python-Backend kann das nicht (kein sqlite-vec,
// kein httpx) — daher faengt embeddedHttp alle /ai/*-Aufrufe ab und beantwortet sie hier mit derselben
// JSON-Form wie das Server-Backend. Python liefert nur Daten (Texte, Filter, Ergebniszeilen).
import { DEFAULT_CFG, buildDoc, etaText, modelId, normalize, rankCosine, recommend, type AiCfg, type DocRow } from './ai-core'
import { Index, idbKV, type KV } from './ai-store'
import { cdnLoader, defaultPost, externalEmbedder, localEmbedder, type Embedder, type Loader, type PostJson } from './ai-embed'

/** Datenzugriff auf das eingebettete Python-Backend (Implementierung in embedded.svelte.ts). */
export interface AiHost {
  count(): Promise<number>
  docs(after: number, limit: number): Promise<(DocRow & { id: number })[]>
  allowed(space: string, newForMe: boolean, filters: Record<string, unknown>, hPassword: string): Promise<{ forbidden: boolean; ids: number[] }>
  fetch(ids: number[], distances: number[]): Promise<any[]>
}

export type AiDeps = {
  host: AiHost
  kv?: KV
  loader?: Loader
  post?: PostJson
  device?: string
  storage?: { get(k: string): string | null; set(k: string, v: string): void }
  memGb?: () => number | undefined
}

type Res = { status: number; body: string }
const ok = (o: unknown): Res => ({ status: 200, body: JSON.stringify(o) })
const err = (status: number, detail: string): Res => ({ status, body: JSON.stringify({ detail }) })

const LS_KEY = 'orbitlist.ai'
const FILTER_KEYS = ['genre', 'genres', 'format', 'status', 'year_min', 'year_max', 'dub', 'dub_lang', 'media_type', 'watch_status', 'seen', 'favorite', 'rating', 'tags', 'season', 'country', 'source', 'studio']

export function createAi(d: AiDeps) {
  const kv = d.kv ?? idbKV()
  const post = d.post ?? defaultPost
  const storage = d.storage ?? { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} } }
  const memGb = d.memGb ?? (() => (globalThis as any).navigator?.deviceMemory as number | undefined)

  let cfg: AiCfg = { ...DEFAULT_CFG }
  try { cfg = { ...DEFAULT_CFG, ...JSON.parse(storage.get(LS_KEY) || '{}') } } catch {}
  const saveCfg = () => storage.set(LS_KEY, JSON.stringify(cfg))

  // Laufzeitzustand (wird ueber /ai/status gemeldet)
  const st = {
    phase: 'idle' as 'idle' | 'loading' | 'indexing' | 'ready' | 'error',
    pct: 0, msg: '', eta: '',
    running: false, done: 0, total: 0, error: null as string | null,
  }
  let emb: { id: string; e: Embedder } | null = null
  let embLoading: Promise<Embedder> | null = null
  let index: Index | null = null
  const loading = new Map<string, Promise<Index | null>>()
  let stop = false
  let job: Promise<void> | null = null

  async function getEmbedder(): Promise<Embedder> {
    const id = modelId(cfg)
    if (!id) throw new Error(cfg.mode === 'device' ? 'Noch kein Modell gewählt (Hugging-Face-Name eintragen).' : 'Adresse und Modellname des externen Endpunkts fehlen.')
    if (emb && emb.id === id) return emb.e
    if (embLoading) return embLoading
    const mine = (async () => {
      emb = null
      if (cfg.mode === 'external') {
        const e = externalEmbedder(cfg, post)
        emb = { id, e }
        return e
      }
      st.phase = 'loading'; st.pct = 0; st.msg = 'Modell wird vorbereitet …'
      try {
        const e = await localEmbedder(cfg.hf_model, {
          loader: d.loader ?? cdnLoader, device: d.device,
          onProgress: (p, m) => { if (p !== null) st.pct = p; st.msg = m },
        })
        emb = { id, e }
        return e
      } finally {
        if (st.phase === 'loading') st.phase = 'idle'
      }
    })()
    embLoading = mine
    try { return await mine } finally { embLoading = null }
  }

  async function getIndex(create: boolean, dim = 0): Promise<Index | null> {
    const id = modelId(cfg)
    if (!id) return null
    if (index && index.modelId === id) return index
    // Laden zusammenfassen: Status-Abfragen und Indexlauf duerfen nicht zwei getrennte Index-Objekte erzeugen
    // (sonst sucht die Suche in einem veralteten Abbild, waehrend der Lauf in ein anderes schreibt).
    let pending = loading.get(id)
    if (!pending) { pending = Index.load(kv, id).finally(() => loading.delete(id)); loading.set(id, pending) }
    const loaded = await pending
    if (index && index.modelId === id) return index
    index = loaded
    if (!index && create) index = new Index(kv, id, dim)
    return index
  }

  function problem(ix: Index | null): string | null {
    if (!cfg.enabled) return 'KI-Funktionen sind deaktiviert (Einstellungen → KI)'
    if (!modelId(cfg)) return cfg.mode === 'device' ? 'Noch kein Modell gewählt (Einstellungen → KI)' : 'Externer Endpunkt nicht vollständig eingetragen (Einstellungen → KI)'
    if (!ix || ix.count === 0) return 'Für dieses Modell ist noch kein Index aufgebaut — in den Einstellungen starten'
    return null
  }

  // ---------------------------------------------------------------- Indexieren
  async function runIndex(rebuild: boolean) {
    stop = false
    st.running = true; st.error = null; st.done = 0; st.total = 0; st.eta = ''
    try {
      const e = await getEmbedder()
      const probe = await e.embed([buildDoc({ title_english: 'Test' })], 'doc')
      const dim = probe[0].length
      let ix = await getIndex(true, dim)
      if (ix && rebuild) { await ix.clear(); ix = index = new Index(kv, modelId(cfg), dim) }
      if (ix && ix.dim !== dim) {
        throw new Error(`Das Modell liefert jetzt ${dim} statt ${ix.dim} Dimensionen — „Index komplett neu aufbauen“ wählen.`)
      }
      const index2 = ix!
      const media = await d.host.count()
      st.total = media; st.done = index2.count
      st.phase = 'indexing'; st.pct = media ? Math.round((st.done / media) * 100) : 100
      st.msg = 'Index wird aufgebaut …'
      const bs = cfg.mode === 'device' ? 8 : 32
      const t0 = Date.now(); const done0 = st.done
      let cursor = 0
      while (!stop) {
        const rows = await d.host.docs(cursor, 128)
        if (!rows.length) break
        cursor = rows[rows.length - 1].id
        const todo = rows.filter((r) => !index2.have.has(r.id))
        for (let i = 0; i < todo.length && !stop; i += bs) {
          const part = todo.slice(i, i + bs)
          const vecs = await e.embed(part.map((r) => buildDoc(r)), 'doc')
          await index2.add(part.map((r, k) => ({ id: r.id, vec: vecs[k] })))
          st.done = index2.count
          st.pct = media ? Math.min(100, Math.round((st.done / media) * 100)) : 100
          const secs = (Date.now() - t0) / 1000
          const rate = (st.done - done0) / Math.max(secs, 0.001)
          st.eta = rate > 0 ? etaText((media - st.done) / rate) : ''
          await new Promise((r) => setTimeout(r, 0)) // Oberflaeche atmen lassen
        }
      }
      st.phase = stop ? 'idle' : 'ready'
      st.msg = stop ? 'Pausiert — beim nächsten Start geht es dort weiter.' : 'Index fertig.'
      st.eta = ''
    } catch (ex: any) {
      st.phase = 'error'
      st.error = String(ex?.message || ex).slice(0, 300)
      st.msg = ''
    } finally {
      st.running = false
    }
  }

  // ---------------------------------------------------------------- Routen
  async function status(): Promise<Res> {
    const ix = await getIndex(false)
    const media = await d.host.count().catch(() => 0)
    const id = modelId(cfg)
    return ok({
      embed_model: cfg.mode === 'device' ? cfg.hf_model : cfg.ext_model,
      embed_ready: !!ix && ix.count > 0,
      translate_model: '', translate_ready: false,
      problem: problem(ix),
      indexing: { running: st.running, done: st.done, total: st.total, error: st.error },
      embedded: ix?.count ?? 0, media,
      local: { phase: st.phase, pct: st.pct, msg: st.msg, eta: st.eta, model_id: id, dim: ix?.dim ?? 0 },
    })
  }

  function cfgOut() {
    const id = modelId(cfg)
    return {
      enabled: cfg.enabled, mode: cfg.mode, hf_model: cfg.hf_model,
      ext_kind: cfg.ext_kind, ext_url: cfg.ext_url, ext_model: cfg.ext_model, ext_key_set: !!cfg.ext_key,
      index_model: index && index.modelId === id ? id : '', index_dim: index?.dim ?? 0,
      device_mem_gb: memGb() ?? null, recommended: recommend(memGb()),
    }
  }

  async function putConfig(p: any): Promise<Res> {
    const old = modelId(cfg)
    if (typeof p.enabled === 'boolean') cfg.enabled = p.enabled
    if (p.mode !== undefined) {
      if (p.mode === 'server') p.mode = 'device'
      if (p.mode !== 'device' && p.mode !== 'external') return err(400, 'mode ungueltig')
      cfg.mode = p.mode
    }
    if (typeof p.hf_model === 'string') cfg.hf_model = p.hf_model.trim()
    if (p.ext_kind === 'openai' || p.ext_kind === 'ollama') cfg.ext_kind = p.ext_kind
    if (typeof p.ext_url === 'string') cfg.ext_url = p.ext_url.trim().replace(/\/+$/, '')
    if (typeof p.ext_model === 'string') cfg.ext_model = p.ext_model.trim()
    if (typeof p.ext_key === 'string') cfg.ext_key = p.ext_key
    saveCfg()
    if (old !== modelId(cfg) || p.ext_url !== undefined || p.ext_key !== undefined) { emb = null; if (!st.running) { st.phase = 'idle'; st.error = null; st.msg = '' } }
    if (old !== modelId(cfg) && !st.running) index = null
    await getIndex(false)
    return ok(cfgOut())
  }

  async function test(): Promise<Res> {
    try {
      const e = await getEmbedder()
      const v = (await e.embed(['Test'], 'query'))[0]
      return ok({ ok: true, dim: v.length, model: modelId(cfg) })
    } catch (ex: any) {
      st.phase = 'error'; st.error = null
      return ok({ ok: false, error: String(ex?.message || ex).slice(0, 300) })
    }
  }

  async function search(q: URLSearchParams, headers: Record<string, string>): Promise<Res> {
    const query = (q.get('q') || '').trim()
    if (!query) return err(422, 'q fehlt')
    const space = q.get('space') || 'normal'
    const ix = await getIndex(false)
    const pr = problem(ix)
    if (pr) return err(503, pr)
    const limit = Math.min(50, Math.max(1, parseInt(q.get('limit') || '20', 10) || 20))
    const filters: Record<string, unknown> = {}
    for (const k of FILTER_KEYS) { const v = q.get(k); if (v !== null && v !== '') filters[k] = v }
    for (const k of ['dub']) if (k in filters) filters[k] = filters[k] === 'true' || filters[k] === '1'
    for (const k of ['year_min', 'year_max', 'rating']) if (k in filters) filters[k] = parseInt(String(filters[k]), 10)
    const hpw = headers['x-h-password'] || headers['X-H-Password'] || ''
    const newForMe = q.get('new_for_me') === 'true'
    let qv: Float32Array
    try {
      const e = await getEmbedder()
      qv = normalize((await e.embed([query], 'query'))[0])
    } catch (ex: any) {
      return err(503, String(ex?.message || ex).slice(0, 300))
    }
    if (qv.length !== ix!.dim) return err(503, 'Der Index passt nicht zum Modell — in den Einstellungen neu aufbauen')
    const al = await d.host.allowed(space, newForMe, filters, hpw)
    if (al.forbidden) return err(403, 'gesperrt')
    const hits = rankCosine(qv, ix!.chunks, ix!.dim, ix!.fmt, new Set(al.ids), limit)
    const rows = await d.host.fetch(hits.map((h) => h.id), hits.map((h) => 1 - h.score))
    return ok({ query, new_for_me: newForMe, results: rows, partial: st.running ? { done: ix!.count, total: st.total } : undefined })
  }

  async function route(method: string, url: string, headers: Record<string, string>, body: string): Promise<Res> {
    const u = new URL(url, 'http://local')
    const path = u.pathname.replace(/\/+$/, '')
    const m = method.toUpperCase()
    try {
      if (path === '/ai/status' && m === 'GET') return await status()
      if (path === '/ai/config' && m === 'GET') return ok(cfgOut())
      if (path === '/ai/config' && m === 'PUT') return await putConfig(JSON.parse(body || '{}'))
      if (path === '/ai/test' && m === 'POST') return await test()
      if (path === '/ai/index' && m === 'POST') {
        if (st.running) return ok({ started: false, running: true })
        if (!cfg.enabled) return err(503, 'KI-Funktionen sind deaktiviert')
        job = runIndex(u.searchParams.get('rebuild') === 'true')
        return ok({ started: true })
      }
      if (path === '/ai/index' && m === 'DELETE') {
        if (st.running) return err(409, 'Der Index wird gerade aufgebaut — erst pausieren.')
        const id = modelId(cfg)
        if (id) await Index.remove(kv, id)
        index = null
        st.done = 0
        return ok({ ok: true })
      }
      if (path === '/ai/stop' && m === 'POST') { stop = true; return ok({ ok: true }) }
      if (path === '/ai/search' && m === 'GET') return await search(u.searchParams, headers)
      return err(404, 'Unbekannte KI-Route')
    } catch (ex: any) {
      return err(500, String(ex?.message || ex).slice(0, 300))
    }
  }

  return { route, whenIdle: async () => { await job } }
}
