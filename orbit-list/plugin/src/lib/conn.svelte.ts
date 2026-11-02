// Verbindung zum Backend: Adresse + Zugangsschluessel, austauschbarer Transport.
// Standalone (Backend serviert /app): gleiche Origin, nur Passwort. Als Orbit-Plugin: Adresse
// (IP:Port) + Passwort werden im Verbinden-Dialog abgefragt und lokal gespeichert.
export type HttpInit = { method?: string; headers?: Record<string, string>; body?: string }
export type HttpRes = { status: number; json(): Promise<any>; text(): Promise<string> }
export type Http = (url: string, init: HttpInit) => Promise<HttpRes>

let LS = 'orbitlist.conn'

export const conn = $state({
  mode: 'same' as 'same' | 'plugin' | 'embedded',
  server: '',
  key: '',
  defaultServer: '',
  needsSetup: false,
  message: '',
  everOk: false,
  rev: 0,
})

let transport: Http = (url, init) => fetch(url, init)

export function configure(o: { plugin?: boolean; embedded?: boolean; defaultServer?: string; http?: Http; storageKey?: string }) {
  if (o.storageKey) LS = o.storageKey
  if (o.http) transport = o.http
  if (o.plugin) conn.mode = 'plugin'
  if (o.embedded) conn.mode = 'embedded'
  if (o.defaultServer) conn.defaultServer = o.defaultServer
  try {
    const s = JSON.parse(localStorage.getItem(LS) || '{}')
    conn.server = s.server || ''
    conn.key = s.key || ''
  } catch {}
  if (conn.mode === 'plugin' && !conn.server) conn.needsSetup = true
  if (conn.mode === 'embedded') conn.needsSetup = false
}

function save() {
  try { localStorage.setItem(LS, JSON.stringify({ server: conn.server, key: conn.key })) } catch {}
}

export function base(): string {
  if (conn.mode === 'plugin') return conn.server
  return import.meta.env.DEV ? 'http://127.0.0.1:8787' : ''
}

export function normalizeServer(input: string): string {
  let s = input.trim().replace(/\/+$/, '')
  if (!s) return ''
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s
  const hostport = s.replace(/^https?:\/\//i, '').split('/')[0]
  if (!/:\d+$/.test(hostport) && !/^https:/i.test(s)) s = s.replace(hostport, hostport + ':8787')
  return s
}

async function raw(server: string, path: string, key: string, init: HttpInit = {}): Promise<HttpRes> {
  const headers = { ...(init.headers || {}) }
  if (key) headers['X-Orbitlist-Key'] = key
  return transport(server + path, { ...init, headers })
}

/** Normale API-Anfrage; meldet fehlenden Zugang an den Dialog. */
export async function request(path: string, init: HttpInit = {}): Promise<HttpRes> {
  let r: HttpRes
  try {
    r = await raw(base(), path, conn.key, init)
  } catch (e) {
    if (conn.mode === 'plugin' && !conn.everOk) {
      conn.needsSetup = true
      conn.message = 'Server nicht erreichbar — Adresse und Netz prüfen.'
    }
    throw e
  }
  if (r.status === 401 || (r.status === 403 && !conn.key)) {
    conn.needsSetup = true
    conn.message = r.status === 401 ? 'Bitte Passwort eingeben.' : 'Das Backend hat noch kein Passwort — am Server `python -m app.auth` ausführen.'
  } else {
    conn.everOk = true
  }
  return r
}

export async function tryConnect(serverInput: string, password: string): Promise<void> {
  const server = conn.mode === 'plugin' ? normalizeServer(serverInput) : ''
  if (conn.mode === 'plugin' && !server) throw new Error('Bitte die Adresse des Backends eingeben (z. B. 192.168.1.20:8787).')
  let st: any
  try {
    st = await (await raw(server, '/auth/status', '')).json()
  } catch {
    throw new Error('Backend nicht erreichbar. Adresse, Port und Netzwerk prüfen (läuft das Backend? gleiches Netz/VPN?).')
  }
  let key = ''
  if (st.required) {
    if (!password) throw new Error('Das Backend ist passwortgeschützt — bitte Passwort eingeben.')
    const r = await raw(server, '/auth/login', '', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }),
    })
    if (r.status === 429) throw new Error((await r.json()).detail || 'Zu viele Versuche.')
    if (r.status !== 200) throw new Error('Passwort falsch.')
    key = (await r.json()).key
  }
  const chk = await raw(server, '/stats', key)
  if (chk.status === 403) throw new Error((await chk.json().catch(() => ({}))).detail || 'Zugriff gesperrt.')
  if (chk.status !== 200) throw new Error(`Backend antwortet mit Status ${chk.status}.`)
  conn.server = server
  conn.key = key
  conn.needsSetup = false
  conn.message = ''
  conn.everOk = true
  save()
  conn.rev++ // gesamte App neu aufbauen und Daten frisch laden
}

export function disconnect() {
  conn.key = ''
  if (conn.mode === 'plugin') conn.server = ''
  save()
  conn.everOk = false
  conn.needsSetup = true
  conn.message = ''
}
