// Speicher fuer die Vektoren: ein Index pro Modellname, in Bloecken (Chunks) zu je CHUNK Titeln,
// damit beim Indexieren nur der zuletzt geaenderte Block neu geschrieben wird. Das Speichermedium ist
// austauschbar (KV): im Browser IndexedDB, im Test eine Map.
import { newChunk, chunkAdd, chunkPack, chunkUnpack, type Chunk, type Fmt } from './ai-core'

export interface KV {
  get(key: string): Promise<any>
  put(key: string, val: any): Promise<void>
  del(key: string): Promise<void>
  keys(prefix: string): Promise<string[]>
}

export function memoryKV(): KV {
  const m = new Map<string, any>()
  return {
    get: async (k) => m.get(k),
    put: async (k, v) => { m.set(k, structuredClone(v)) },
    del: async (k) => { m.delete(k) },
    keys: async (p) => [...m.keys()].filter((k) => k.startsWith(p)),
  }
}

export function idbKV(dbName = 'orbitlist-ai'): KV {
  let db: Promise<IDBDatabase> | null = null
  const open = () => (db ??= new Promise((res, rej) => {
    const r = indexedDB.open(dbName, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('kv')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  }))
  const tx = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const d = await open()
    return new Promise((res, rej) => {
      const r = f(d.transaction('kv', mode).objectStore('kv'))
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
  }
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    put: async (k, v) => { await tx('readwrite', (s) => s.put(v, k)) },
    del: async (k) => { await tx('readwrite', (s) => s.delete(k)) },
    keys: async (p) => ((await tx('readonly', (s) => s.getAllKeys())) as string[]).filter((k) => String(k).startsWith(p)),
  }
}

export const CHUNK = 1024
const FMT: Fmt = 'i8'

type Meta = { modelId: string; dim: number; fmt: Fmt; chunks: number; count: number; updated: number }

export class Index {
  chunks: Chunk[] = []
  have = new Set<number>()
  constructor(public kv: KV, public modelId: string, public dim: number, public fmt: Fmt = FMT) {}

  get count() { return this.have.size }
  static key(modelId: string) { return { meta: `ai:meta:${modelId}`, chunk: (n: number) => `ai:chunk:${modelId}:${n}` } }

  /** Vorhandenen Index laden; null = fuer dieses Modell gibt es noch keinen. */
  static async load(kv: KV, modelId: string): Promise<Index | null> {
    const K = Index.key(modelId)
    const meta: Meta | undefined = await kv.get(K.meta)
    if (!meta) return null
    const ix = new Index(kv, modelId, meta.dim, meta.fmt)
    for (let n = 0; n < meta.chunks; n++) {
      const p: Chunk | undefined = await kv.get(K.chunk(n))
      if (!p) break
      const c = chunkUnpack(p, n === meta.chunks - 1 ? CHUNK : p.n, meta.dim, meta.fmt)
      ix.chunks.push(c)
      for (let i = 0; i < c.n; i++) ix.have.add(c.ids[i])
    }
    return ix
  }

  /** Haengt Vektoren an (bereits normalisiert) und schreibt nur den letzten Block + Meta. */
  async add(items: { id: number; vec: Float32Array }[]): Promise<void> {
    const K = Index.key(this.modelId)
    const touched = new Set<number>()
    for (const it of items) {
      if (this.have.has(it.id)) continue
      if (it.vec.length !== this.dim) throw new Error(`Vektor hat ${it.vec.length} statt ${this.dim} Dimensionen.`)
      let c = this.chunks[this.chunks.length - 1]
      if (!c || !chunkAdd(c, this.dim, this.fmt, it.id, it.vec)) {
        c = newChunk(CHUNK, this.dim, this.fmt)
        this.chunks.push(c)
        chunkAdd(c, this.dim, this.fmt, it.id, it.vec)
      }
      touched.add(this.chunks.length - 1)
      this.have.add(it.id)
    }
    for (const n of touched) await this.kv.put(K.chunk(n), chunkPack(this.chunks[n], this.dim))
    const meta: Meta = { modelId: this.modelId, dim: this.dim, fmt: this.fmt, chunks: this.chunks.length, count: this.have.size, updated: Date.now() }
    await this.kv.put(K.meta, meta)
  }

  async clear(): Promise<void> {
    const K = Index.key(this.modelId)
    for (let n = 0; n < this.chunks.length; n++) await this.kv.del(K.chunk(n))
    await this.kv.del(K.meta)
    this.chunks = []
    this.have = new Set()
  }

  /** Index eines Modells loeschen, auch wenn er nicht geladen ist. */
  static async remove(kv: KV, modelId: string): Promise<void> {
    const K = Index.key(modelId)
    const meta: Meta | undefined = await kv.get(K.meta)
    for (let n = 0; n < (meta?.chunks ?? 0); n++) await kv.del(K.chunk(n))
    await kv.del(K.meta)
  }
}
