// Gemeinsamer Orbit-Plugin-Wrapper fuer beide Varianten (Dialog-only / vorbelegte Adresse).
// Baut NICHT standalone: `@core` wird im Orbit-Build gegen globalThis.Orbit gebunden (vite.orbit.config.ts).
import { mount, unmount } from 'svelte'
// @ts-expect-error — @core wird erst im Orbit-Build aufgelöst (globalThis.Orbit-Shim)
import { Plugin, View } from '@core'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import App from '../src/App.svelte'
import themeCss from '../src/theme.css?inline'
import { configure, type Http } from '../src/lib/conn.svelte'
import { setHost } from '../src/lib/host'
import { embeddedHttp, setNet } from '../src/lib/embedded.svelte'

// Auf dem Handy (nativ) geht jede Backend-Anfrage ueber CapacitorHttp: umgeht CORS und die
// Mixed-Content-Sperre (die App laeuft unter https, das Heim-Backend meist unter http://IP:Port).
const http: Http = async (url, init) => {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({
      url, method: init.method || 'GET', headers: init.headers,
      data: init.body ? JSON.parse(init.body) : undefined, connectTimeout: 8000, readTimeout: 60000,
    })
    const asText = typeof r.data === 'string' ? r.data : JSON.stringify(r.data)
    return { status: r.status, json: async () => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data), text: async () => asText }
  }
  return fetch(url, init)
}

// Binaerer Download (Katalog): nativ ueber CapacitorHttp (CORS/Mixed Content), sonst fetch.
const netGet = async (url: string): Promise<Uint8Array> => {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({ url, method: 'GET', responseType: 'blob', connectTimeout: 15000, readTimeout: 120000 })
    if (r.status !== 200) throw new Error(`Katalog-Quelle antwortet mit Status ${r.status}.`)
    const bin = atob(r.data as string)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Katalog-Quelle antwortet mit Status ${r.status}.`)
  return new Uint8Array(await r.arrayBuffer())
}

// Dateigroesse per HEAD (Pruefung auf neue Katalog-Fassung ohne Download)
const netSize = async (url: string): Promise<number | null> => {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({ url, method: 'HEAD', connectTimeout: 10000, readTimeout: 15000 })
    const h = Object.entries(r.headers || {}).find(([k]) => k.toLowerCase() === 'content-length')
    return h ? Number(h[1]) : null
  }
  const l = (await fetch(url, { method: 'HEAD' })).headers.get('content-length')
  return l ? Number(l) : null
}

export function makePlugin(id: string, name: string, opts: { defaultServer?: string; embedded?: boolean } = {}) {
  class AnimeView extends View {
    private component: any
    private box?: HTMLElement
    private style?: HTMLStyleElement
    getViewType() { return id }
    getDisplayName() { return name }
    getIcon() { return 'film' }
    onOpen() {
      // containerEl wird evtl. erst im naechsten Tick gesetzt (ViewHost) — rAF-Retry
      requestAnimationFrame(() => {
        const box = document.createElement('div')
        box.className = 'ol-root'
        box.style.cssText = 'height:100%;overflow:auto'
        this.containerEl.appendChild(box)
        const style = document.createElement('style')
        style.textContent = themeCss
        document.head.appendChild(style)
        this.box = box
        this.style = style
        setHost(box)
        if (opts.embedded) {
          setNet(netGet, netSize)
          configure({ embedded: true, defaultServer: opts.defaultServer, http: embeddedHttp, storageKey: `orbitlist.conn.${id}` })
        } else {
          configure({ plugin: true, defaultServer: opts.defaultServer, http, storageKey: `orbitlist.conn.${id}` })
        }
        this.component = mount(App, { target: box })
      })
    }
    onClose() {
      if (this.component) unmount(this.component)
      this.box?.remove()
      this.style?.remove()
      setHost(null)
    }
  }

  return class extends Plugin {
    onload() {
      this.registerView(id, () => new AnimeView(this.app))
      this.addNavigationItem({ id, name, icon: 'film' })
      this.addCommand({ id: `${id}:open`, name: `${name} öffnen`, callback: () => this.app.workspace?.openView?.(id) })
    }
  }
}
