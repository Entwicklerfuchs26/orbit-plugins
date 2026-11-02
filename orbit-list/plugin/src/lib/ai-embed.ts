// Embedding-Quellen fuer die KI-Suche im eingebetteten Backend:
//  - lokal: Transformers.js (ONNX Runtime Web), zur Laufzeit von jsDelivr geladen (wie Pyodide), Modell von Hugging Face
//  - extern: Ollama (/api/embed) oder OpenAI-kompatibel (/v1/embeddings) im Heimnetz / beim Anbieter
import { ProgressAgg, embedUrl, modelProfile, normalize, parseEmbedResponse, type AiCfg } from './ai-core'

export const TRANSFORMERS_VERSION = '3.8.1'
export const TRANSFORMERS_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`

export type Embedder = {
  dim: number
  /** kind: 'query' fuer Suchanfragen, 'doc' fuer Titeltexte (manche Modelle brauchen verschiedene Praefixe). */
  embed(texts: string[], kind: 'query' | 'doc'): Promise<Float32Array[]>
}

export type PostJson = (url: string, headers: Record<string, string>, body: unknown) => Promise<{ status: number; text: string }>

// ------------------------------------------------------------------ HTTP fuer externe Endpunkte
let postImpl: PostJson | null = null
export function setAiPost(p: PostJson) { postImpl = p }

/** Nativ (Handy) ueber CapacitorHttp — umgeht CORS; sonst fetch. */
export const defaultPost: PostJson = async (url, headers, body) => {
  if (postImpl) return postImpl(url, headers, body)
  const cap = (globalThis as any).Capacitor
  const nativeHttp = cap?.isNativePlatform?.() ? cap?.Plugins?.CapacitorHttp : null
  if (nativeHttp) {
    const r = await nativeHttp.request({ url, method: 'POST', headers: { 'content-type': 'application/json', ...headers }, data: body, connectTimeout: 10000, readTimeout: 180000 })
    return { status: r.status, text: typeof r.data === 'string' ? r.data : JSON.stringify(r.data) }
  }
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  return { status: r.status, text: await r.text() }
}

export function netHint(url: string): string {
  const plain = /^http:\/\//i.test(url)
  return plain
    ? 'Verbindung fehlgeschlagen. Android sperrt Klartext-HTTP — der Endpunkt braucht HTTPS (z. B. über einen Reverse-Proxy). Am Desktop: läuft der Dienst, und erlaubt er Anfragen von dieser App (bei Ollama OLLAMA_ORIGINS)?'
    : 'Verbindung fehlgeschlagen. Adresse, Netz/VPN und Zertifikat prüfen.'
}

export function externalEmbedder(cfg: AiCfg, post: PostJson = defaultPost, retryMs = 2000): Embedder {
  if (!cfg.ext_url || !cfg.ext_model) throw new Error('Adresse und Modellname des externen Endpunkts fehlen.')
  const url = embedUrl(cfg.ext_kind, cfg.ext_url)
  const headers: Record<string, string> = cfg.ext_key ? { Authorization: `Bearer ${cfg.ext_key}` } : {}
  const e: Embedder = {
    dim: 0,
    async embed(texts) {
      let r
      // Bei Rate-Limit (429) bzw. kurzem Ausfall (502/503) mit Pause wiederholen, statt den ganzen Lauf abzubrechen
      for (let versuch = 0; ; versuch++) {
        try {
          r = await post(url, headers, { model: cfg.ext_model, input: texts })
        } catch {
          throw new Error(netHint(url))
        }
        if ((r.status === 429 || r.status === 502 || r.status === 503) && versuch < 3) { await new Promise((res) => setTimeout(res, retryMs * (versuch + 1))); continue }
        break
      }
      let j: any
      try { j = JSON.parse(r.text) } catch { j = null }
      if (r.status < 200 || r.status >= 300) {
        const msg = j?.error?.message || (typeof j?.error === 'string' ? j.error : '') || r.text.slice(0, 160)
        throw new Error(`Endpunkt antwortet mit Status ${r.status}${msg ? ': ' + msg : ''}`)
      }
      const vs = parseEmbedResponse(cfg.ext_kind, j)
      if (vs.length !== texts.length) throw new Error('Der Endpunkt hat eine andere Anzahl Vektoren geliefert als angefragt.')
      const out = vs.map((v) => normalize(v))
      e.dim = out[0]?.length ?? e.dim
      return out
    },
  }
  return e
}

// ------------------------------------------------------------------ Lokales Modell (Transformers.js)
export type Loader = () => Promise<any>
export const cdnLoader: Loader = () => import(/* @vite-ignore */ TRANSFORMERS_URL)

export type LocalOpts = {
  loader?: Loader
  onProgress?: (pct: number | null, msg: string) => void
  device?: string // im Browser leer lassen (Auto: WebAssembly)
  maxTokens?: number
}

const MAX_TOKENS = 256

export async function localEmbedder(hfModel: string, o: LocalOpts = {}): Promise<Embedder> {
  const name = hfModel.trim()
  if (!/^[\w.-]+\/[\w.-]+$/.test(name) || name.split('/').some((x) => /^\.+$/.test(x))) throw new Error('Modellname bitte im Format „Autor/Modell“ eintragen, z. B. Xenova/multilingual-e5-small.')
  const prof = modelProfile(name)
  o.onProgress?.(null, 'Laufzeit (Transformers.js) wird geladen …')
  let tf: any
  try {
    tf = await (o.loader ?? cdnLoader)()
  } catch {
    throw new Error('Die Laufzeit konnte nicht geladen werden (jsDelivr). Internetverbindung prüfen.')
  }
  tf.env.allowLocalModels = false
  tf.env.useBrowserCache = typeof caches !== 'undefined' // im Browser: Modelldateien bleiben im Cache; ohne Cache-API (Node, unsichere Seite) wird bei jedem Start neu geladen
  const agg = new ProgressAgg()
  const cb = (e: any) => {
    const pct = agg.feed(e)
    if (pct !== null) o.onProgress?.(pct, `Modell wird heruntergeladen … ${pct} %`)
  }
  let pipe: any
  const mk = (dtype: string) => tf.pipeline('feature-extraction', name, { dtype, progress_callback: cb, ...(o.device ? { device: o.device } : {}) })
  o.onProgress?.(0, 'Modell wird heruntergeladen …')
  try {
    try {
      pipe = await mk('q8') // kleinste Variante (model_quantized.onnx)
    } catch (e1: any) {
      if (/40[134]|not found|Could not locate|Unauthorized/i.test(String(e1?.message))) {
        pipe = await mk('fp32') // manche Repos haben nur die volle Fassung
      } else throw e1
    }
  } catch (e: any) {
    const m = String(e?.message || e)
    if (/40[134]|not found|Could not locate|Unauthorized/i.test(m))
      throw new Error(`„${name}“ ist auf Hugging Face nicht als ONNX-Modell zu finden. Gesucht wird ein Repo mit onnx-Ordner (meist von „Xenova“ oder „onnx-community“).`)
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) throw new Error('Download fehlgeschlagen — Internetverbindung prüfen und erneut starten (Teile sind zwischengespeichert).')
    throw new Error('Modell konnte nicht gestartet werden: ' + m.slice(0, 200))
  }
  try { if (pipe.tokenizer) pipe.tokenizer.model_max_length = o.maxTokens ?? MAX_TOKENS } catch {}
  o.onProgress?.(100, 'Modell bereit.')

  const e: Embedder = {
    dim: 0,
    async embed(texts, kind) {
      const pre = kind === 'query' ? prof.queryPrefix : prof.docPrefix
      const out = await pipe(texts.map((t) => pre + t), { pooling: prof.pooling, normalize: true })
      const [n, d] = out.dims as number[]
      const data = out.data as Float32Array
      const res: Float32Array[] = []
      for (let i = 0; i < n; i++) res.push(normalize(data.subarray(i * d, (i + 1) * d)))
      e.dim = d
      return res
    },
  }
  return e
}
