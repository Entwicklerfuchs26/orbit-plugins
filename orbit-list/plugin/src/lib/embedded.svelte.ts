// Eingebettetes Backend: das Python-Backend laeuft per Pyodide direkt im Plugin (Handy/Desktop),
// ohne Server. API-Anfragen gehen nicht ueber das Netz, sondern direkt als ASGI-Aufruf.
// Katalog (einmal geladen) und Nutzerdaten liegen getrennt im Browser-Speicher (IndexedDB, /data):
//   /data/catalog.db  – nur Anime, wird nie veraendert;  /data/user.json – Liste + Einstellungen im Export-Format.
// Die Arbeitsdatenbank /work/anime.db (Katalog + Nutzerdaten, fuer die Abfragen) lebt nur im Arbeitsspeicher.
import type { Http, HttpRes } from './conn.svelte'
import { createAi } from './ai-embedded'

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
const PIP = ['fastapi==0.115.6', 'starlette==0.41.3']
const PKGS = ['micropip', 'pydantic', 'sqlite3', 'ssl']
const LS = 'orbitlist.embedded'

// Backend-Quellen werden beim Bauen eingebettet.
const SOURCES = import.meta.glob('../../../backend/app/**/*.py', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const HOST = Object.values(
  import.meta.glob('../../../backend/embedded/host.py', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
)[0]

export type NetGet = (url: string) => Promise<Uint8Array>
/** Groesse der Katalog-Datei in Bytes (HEAD), null wenn nicht ermittelbar. */
export type NetSize = (url: string) => Promise<number | null>

export const emb = $state({
  phase: 'idle' as 'idle' | 'runtime' | 'catalog' | 'ready' | 'error',
  msg: '',
  pct: 0,
  catalogUrl: '',
  needCatalogUrl: false,
})

let py: any = null
let host: any = null
let netGet: NetGet = async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())
let netSize: NetSize = async (u) => { const l = (await fetch(u, { method: 'HEAD' })).headers.get('content-length'); return l ? Number(l) : null }
let booting: Promise<void> | null = null

export function setNet(g: NetGet, size?: NetSize) { netGet = g; if (size) netSize = size }

function readPrefs(): any {
  try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} }
}
function savePrefs(patch: Record<string, unknown>) {
  try { localStorage.setItem(LS, JSON.stringify({ ...readPrefs(), ...patch })) } catch {}
}

function loadPrefs(defaultCatalog: string) {
  const s = readPrefs()
  // Nur eine bewusst geaenderte Adresse behalten; alte Klartext-HTTP-Adressen im Heimnetz verfallen (Android sperrt sie).
  const saved = typeof s.catalogUrl === 'string' && !/^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(s.catalogUrl) ? s.catalogUrl : ''
  emb.catalogUrl = saved || defaultCatalog
}
export function saveCatalogUrl(u: string) {
  emb.catalogUrl = u.trim()
  savePrefs({ catalogUrl: emb.catalogUrl })
}

function syncFs(populate: boolean): Promise<void> {
  return new Promise((res, rej) => py.FS.syncfs(populate, (e: any) => (e ? rej(e) : res())))
}

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip')
  const w = ds.writable.getWriter()
  w.write(data as any); w.close()
  return new Uint8Array(await new Response(ds.readable).arrayBuffer())
}

export function boot(defaultCatalog: string): Promise<void> {
  loadPrefs(defaultCatalog)
  if (!booting) {
    booting = run().catch((e) => {
      booting = null
      emb.phase = 'error'
      emb.msg = String(e?.message || e)
      throw e
    })
  }
  return booting
}

async function run() {
  emb.phase = 'runtime'; emb.pct = 0
  emb.msg = 'Backend wird vorbereitet (einmalig, braucht Internet) …'
  const mod = await import(/* @vite-ignore */ PYODIDE + 'pyodide.mjs')
  py = await mod.loadPyodide({ indexURL: PYODIDE })
  emb.pct = 25
  await py.loadPackage(PKGS)
  emb.pct = 55
  await py.runPythonAsync(`import micropip\nawait micropip.install(${JSON.stringify(PIP)})`)
  emb.pct = 80

  py.FS.mkdirTree('/data')
  py.FS.mount(py.FS.filesystems.IDBFS, {}, '/data')
  await syncFs(true)

  if (py.FS.analyzePath('/data/anime.db').exists) py.FS.unlink('/data/anime.db') // alte Testversion (Daten + Katalog in einer Datei)
  if (!py.FS.analyzePath('/data/catalog.db').exists) {
    if (!emb.catalogUrl) { emb.needCatalogUrl = true; throw new Error('Katalog-Quelle fehlt.') }
    emb.phase = 'catalog'; emb.pct = 0
    emb.msg = 'Katalog wird geladen (ca. 13 MB, einmalig) …'
    const gz = await netGet(emb.catalogUrl)
    emb.msg = 'Katalog wird entpackt …'
    const db = await gunzip(gz)
    py.FS.writeFile('/data/catalog.db', db)
    await syncFs(false)
    savePrefs({ catalogSig: String(gz.length), checkedAt: Date.now() })
  }
  py.FS.mkdirTree('/work')
  py.FS.writeFile('/work/anime.db', py.FS.readFile('/data/catalog.db'))

  py.FS.mkdirTree('/app/app')
  for (const [path, code] of Object.entries(SOURCES)) {
    const rel = path.split('/backend/app/')[1]
    if (!rel) continue
    const full = '/app/app/' + rel
    py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')))
    py.FS.writeFile(full, code)
  }
  py.FS.writeFile('/app/host.py', HOST)
  await py.runPythonAsync(`import sys\nsys.path.insert(0, '/app')\nimport host`)
  host = py.pyimport('host')
  if (py.FS.analyzePath('/data/user.json').exists) {
    const txt = py.FS.readFile('/data/user.json', { encoding: 'utf8' })
    await call('POST', '/import', {}, txt)
  }
  emb.phase = 'ready'; emb.msg = ''; emb.pct = 100
  // Katalog im Hintergrund auf eine neue Fassung pruefen (hoechstens alle 12 h; ohne bekannte Fassung sofort)
  checkCatalogUpdate(false).catch(() => {})
}

/** Neuen Katalog laden und einsetzen; Liste und Einstellungen bleiben erhalten (Export -> neuer Katalog -> Import). */
async function updateCatalog(): Promise<void> {
  const keep = await call('GET', '/export/json', {}, '')
  emb.phase = 'catalog'; emb.pct = 0; emb.msg = 'Katalog wird aktualisiert …'
  try {
    const gz = await netGet(emb.catalogUrl)
    emb.msg = 'Katalog wird entpackt …'
    const db = await gunzip(gz)
    py.FS.writeFile('/data/catalog.db', db)
    py.FS.writeFile('/work/anime.db', db)
    if (keep.status === 200) await call('POST', '/import', {}, keep.body)
    await syncFs(false)
    savePrefs({ catalogSig: String(gz.length), checkedAt: Date.now() })
  } finally {
    emb.phase = 'ready'; emb.msg = ''
  }
}

/** 'updated' | 'current' | 'unreachable' | 'skipped'. force = Pruefung trotz kuerzlicher Pruefung (Knopf in den Einstellungen). */
export async function checkCatalogUpdate(force: boolean): Promise<'updated' | 'current' | 'unreachable' | 'skipped'> {
  if (!host || !emb.catalogUrl) return 'unreachable'
  const p = readPrefs()
  if (!force && p.catalogSig && Date.now() - (p.checkedAt || 0) < 12 * 3600 * 1000) return 'skipped'
  let size: number | null = null
  try { size = await netSize(emb.catalogUrl) } catch {}
  if (size == null) return p.catalogSig ? 'unreachable' : await replaceUnknown()
  if (String(size) === p.catalogSig) { savePrefs({ checkedAt: Date.now() }); return 'current' }
  await updateCatalog()
  return 'updated'
}

// Unbekannte Fassung (aeltere Installation) und Groesse nicht ermittelbar: einmal neu laden ist sicherer als veralten
async function replaceUnknown() {
  await updateCatalog()
  return 'updated' as const
}

async function call(method: string, url: string, headers: Record<string, string>, body: string) {
  return JSON.parse(await host.handle(method, url, JSON.stringify(headers), body))
}

// Nutzerdaten sichern: nur die kleine Export-Datei, nicht die ganze Datenbank.
let syncTimer: any = null
function scheduleSync() {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    try {
      const r = await call('GET', '/export/json', {}, '')
      if (r.status === 200) {
        py.FS.writeFile('/data/user.json', r.body)
        await syncFs(false)
      }
    } catch {}
  }, 1500)
}

// KI-Suche: /ai/* beantwortet das Plugin selbst (ai-embedded.ts); Python liefert nur Daten.
let aiCtl: ReturnType<typeof createAi> | null = null
function ai() {
  return (aiCtl ??= createAi({
    host: {
      count: async () => JSON.parse(await host.ai_count()),
      docs: async (after, limit) => JSON.parse(await host.ai_docs(after, limit)),
      allowed: async (space, newForMe, filters, hPassword) => JSON.parse(await host.ai_allowed(space, newForMe, JSON.stringify(filters), hPassword)),
      fetch: async (ids, dist) => JSON.parse(await host.ai_fetch(JSON.stringify(ids), JSON.stringify(dist))),
    },
  }))
}

/** Transport fuer conn.svelte.ts: statt Netzwerk direkt in das eingebettete Backend. */
export const embeddedHttp: Http = async (url, init) => {
  if (!host) throw new Error('Backend nicht bereit')
  const method = (init.method || 'GET').toUpperCase()
  const isAi = /^\/ai(\/|$)/.test(new URL(url, 'http://local').pathname)
  const out = isAi
    ? await ai().route(method, url, init.headers || {}, init.body || '')
    : await call(method, url, init.headers || {}, init.body || '')
  if (method !== 'GET' && !isAi) scheduleSync()
  const res: HttpRes = {
    status: out.status,
    json: async () => JSON.parse(out.body),
    text: async () => out.body,
  }
  return res
}
