<script lang="ts">
  import { api, downloadExport, importUserData } from '../api'
  import { conn, disconnect } from './conn.svelte'
  let importEl = $state<HTMLInputElement>()
  let importMsg = $state('')
  async function doImport(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    importMsg = 'Importiere …'
    try {
      const r = await importUserData(f)
      importMsg = `${r.matched} Einträge übernommen${r.not_in_catalog ? `, ${r.not_in_catalog} nicht im Katalog gefunden` : ''}. Seite wird neu geladen …`
      setTimeout(() => { conn.rev++ }, 900)
    } catch (err: any) { importMsg = err.message || String(err) }
    ;(e.target as HTMLInputElement).value = ''
  }
  import { aiState, refreshAi } from './ai.svelte'
  import AiEmbeddedSettings from './ai-EmbeddedSettings.svelte'

  let {
    theme = 'dark',
    setTheme,
    accent = '',
    setAccent,
    services = [],
    activeConfig = 'anime',
    configName = 'Anime',
    stats = {},
    hConfigured = false,
    onUnlocked,
    onOpenPicker,
    onclose,
  }: {
    theme?: string
    setTheme: (t: string) => void
    accent?: string
    setAccent: (c: string) => void
    services?: any[]
    activeConfig?: string
    configName?: string
    stats?: any
    hConfigured?: boolean
    onUnlocked: (token: string) => void
    onOpenPicker: () => void
    onclose: () => void
  } = $props()

  // AniList-Reiter: Profil · Anime & Manga · Listen · Import · Export · Apps · Privat · Über
  const CATS = [
    ['profil', 'Profil'], ['medien', 'Anime & Manga'], ['listen', 'Listen'], ['ki', 'KI'], ['import', 'Import'],
    ['export', 'Export'], ['apps', 'Apps'], ['privat', 'Privat'], ['ueber', 'Über'],
  ]
  let cat = $state('profil')

  // AniList „Profile Color" — Akzent-Presets. '' = Standard (Rot, aus theme.css).
  const COLORS: [string, string][] = [
    ['#e8503a', 'Rot'], ['#3db4f2', 'Blau'], ['#c063ff', 'Lila'], ['#4cca51', 'Grün'],
    ['#ef881a', 'Orange'], ['#ec4899', 'Pink'], ['#677b94', 'Grau'], ['#7e57ff', 'Verlauf'],
  ]
  let curAccent = $derived(accent || '#e8503a')

  // KI-Reiter: aktivieren + Modellquelle wählen (Gerät / Server / extern)
  let ai = $state<any>(null)
  let aiSt = $state<any>(null)
  let aiMsg = $state('')
  let aiKey = $state('')
  let aiBusy = $state(false)
  async function loadAi() {
    try { ai = await api.aiConfig(); aiSt = await api.aiStatus() } catch { aiMsg = 'KI-Konfiguration nicht erreichbar.' }
  }
  $effect(() => { if (cat === 'ki' && !ai) loadAi() })
  async function saveAi(patch: Record<string, unknown>) {
    aiMsg = ''
    try { ai = await api.aiConfigSet(patch); aiSt = await api.aiStatus(); await refreshAi() } catch { aiMsg = 'Speichern fehlgeschlagen.' }
  }
  async function saveExternal() {
    const p: Record<string, unknown> = { mode: 'external', ext_kind: ai.ext_kind, ext_url: ai.ext_url, ext_model: ai.ext_model }
    if (aiKey) p.ext_key = aiKey
    await saveAi(p); aiKey = ''
  }
  async function testAi() {
    aiBusy = true; aiMsg = ''
    const r = await api.aiTest().catch(() => ({ ok: false, error: 'nicht erreichbar' }))
    aiMsg = r.ok ? `Verbindung ok — Modell liefert ${r.dim} Dimensionen.` : `Fehlgeschlagen: ${r.error}`
    aiBusy = false
  }
  async function startIndex(rebuild: boolean) {
    aiMsg = ''
    try {
      await api.aiIndex(rebuild)
      aiMsg = 'Index wird im Hintergrund aufgebaut …'
      for (let i = 0; i < 600; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        aiSt = await api.aiStatus()
        if (!aiSt.indexing?.running) break
      }
      aiMsg = aiSt.indexing?.error ? `Fehler: ${aiSt.indexing.error}` : 'Index fertig.'
      ai = await api.aiConfig(); await refreshAi()
    } catch { aiMsg = 'Index konnte nicht gestartet werden (Modell erreichbar?).' }
  }

  // Import-Reiter: Upload der eigenen Liste zu AniList (Token-pflichtig, nur Vorschau ohne Token)
  let syncInfo = $state<any>(null)
  let syncMsg = $state('')
  let syncBusy = $state(false)
  async function loadPreview() {
    syncBusy = true; syncMsg = ''
    try { syncInfo = await api.syncPreview() } catch { syncMsg = 'Vorschau fehlgeschlagen.' }
    syncBusy = false
  }
  async function runSync() {
    syncBusy = true; syncMsg = ''
    try {
      const r = await api.syncRun()
      syncMsg = r.status === 'stub' ? `Kein AniList-Token hinterlegt — nichts gesendet (${r.would_sync} Einträge würden synchronisiert).`
        : `${r.synced} Einträge zu AniList übertragen.${r.errors?.length ? ' Fehler: ' + r.errors.join('; ') : ''}`
    } catch { syncMsg = 'Sync fehlgeschlagen.' }
    syncBusy = false
  }

  // AniList-Datenimport (öffentliches Profil, tokenfrei)
  let aniUser = $state('')
  let impMsg = $state('')
  let impBusy = $state(false)
  $effect(() => { if (cat === 'import' && !aniUser) api.anilistUsername().then((d) => { if (d?.username) aniUser = d.username }).catch(() => {}) })
  async function runImport() {
    if (!aniUser.trim()) return
    impBusy = true; impMsg = ''
    try {
      const r = await api.anilistImport(aniUser.trim())
      impMsg = `${r.enriched} Titel angereichert (Tags, Studios, Saison, Land, Quelle, Daten), ${r.favorites_added} neue Favoriten übernommen${r.not_in_catalog ? `, ${r.not_in_catalog} nicht im Katalog` : ''}.`
    } catch { impMsg = 'Import fehlgeschlagen (Benutzername prüfen / AniList erreichbar?).' }
    impBusy = false
  }

  // Apps-Reiter: Pairing-Token + MCP
  let pair = $state<any>(null)
  async function loadPair() { try { pair = await api.pairInfo() } catch { pair = { error: true } } }
  $effect(() => { if (cat === 'apps' && !pair) loadPair() })

  let hPw = $state('')
  let hMsg = $state('')
  async function handleH() {
    hMsg = ''
    try {
      if (!hConfigured) {
        await api.hSetPassword(hPw)
        hConfigured = true
        hMsg = 'Passwort gesetzt.'
      }
      await api.hUnlock(hPw)
      onUnlocked(hPw)
      hPw = ''
      onOpenPicker()  // Medientyp-Menü öffnen — Hentai erscheint dort jetzt als wählbare Config
      return
    } catch (e) {
      hMsg = 'Falsches Passwort.'
    }
    hPw = ''
  }

  async function handleReset() {
    try { await api.hReset() } catch {}
    hConfigured = false
    hPw = ''
    hMsg = 'Zurückgesetzt — jetzt ein neues Passwort festlegen.'
  }

  let svcs = $state<any[]>([...services])
  // Dienste sind pro Config → bei Config-Wechsel neu übernehmen.
  $effect(() => { svcs = [...services] })
  let newName = $state('')
  let newUrl = $state('')
  let newSearch = $state('')
  async function addSvc() {
    if (!newName.trim() || !newUrl.trim()) return
    const search = newSearch.trim() || null
    const r = await api.addService({ name: newName, url_schema: newUrl.trim(), search_schema: search, config: activeConfig })
    svcs = [...svcs, { id: r.id, name: newName, url_schema: newUrl.trim(), search_schema: search }]
    newName = ''; newUrl = ''; newSearch = ''
  }
  async function delSvc(id: number) {
    try { await api.deleteService(id) } catch {}
    svcs = svcs.filter((s) => s.id !== id)
  }
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<aside class="panel">
  <header>
    <h2>Einstellungen</h2>
    <button class="close" onclick={onclose} aria-label="Schließen">✕</button>
  </header>

  <nav>
    {#each CATS as [id, label]}
      <button class:on={cat === id} onclick={() => (cat = id)}>{label}</button>
    {/each}
  </nav>

  <div class="body">
    {#if cat === 'profil'}
      <section class="card">
        <div class="field">
          <label>Erscheinungsbild</label>
          <div class="seg">
            <button class:on={theme === 'dark'} onclick={() => setTheme('dark')}>Dunkel</button>
            <button class:on={theme === 'light'} onclick={() => setTheme('light')}>Hell</button>
          </div>
        </div>
        <div class="field last">
          <label>Profilfarbe</label>
          <div class="swatches">
            {#each COLORS as [hex, name]}
              <button class="swatch" class:on={curAccent === hex} style="background:{hex}"
                onclick={() => setAccent(hex)} title={name} aria-label={name}></button>
            {/each}
          </div>
          <p class="hint">Wie bei AniList — färbt die ganze App. Standard: Rot.</p>
        </div>
      </section>
    {:else if cat === 'medien'}
      <section class="card">
        <div class="field">
          <label>Medientypen</label>
          <button class="big" onclick={onOpenPicker}>Medientypen verwalten / Config wählen →</button>
          <p class="hint">Jede Config ist eigenständig (eigene Genres und Dienste). Anzeige auf Deutsch; Titel in allen Varianten durchsuchbar.</p>
        </div>
        <div class="field last">
          <label>Deutscher Dub — Konfidenz</label>
          <div class="seg"><button class="on">high</button><button>normal</button><button>low</button></div>
          <p class="hint">Quelle: {stats.attribution ?? 'MyDubList (CC BY 4.0)'}</p>
        </div>
      </section>
    {:else if cat === 'listen'}
      <section class="card">
        <div class="field last">
          <label>Streaming-Dienste für {configName} (eigener Satz je Config)</label>
          {#each svcs as s}
            <div class="svc-row"><span>{s.name}</span><code>{s.url_schema}{#if s.search_schema} · Suche: {s.search_schema}{/if}</code><button class="del" onclick={() => delSvc(s.id)} aria-label="Entfernen">✕</button></div>
          {/each}
          <div class="addsvc">
            <input placeholder="Name (z. B. Wakanim)" bind:value={newName} />
            <input placeholder={'Direktlink, z. B. https://dienst.de/anime/stream/{slug}/staffel-1'} bind:value={newUrl} />
            <input placeholder={'Suche (Rückfall), z. B. https://dienst.de/animes?q={q}'} bind:value={newSearch} />
            <button class="big" onclick={addSvc}>+ Dienst hinzufügen</button>
          </div>
          <p class="hint"><code>{'{slug}'}</code> = Titel als URL-Kurzform (<code>Scum's Wish</code> → <code>scums-wish</code>), <code>{'{q}'}</code> = Titel für eine Suche. Mit Direktlink + Suche öffnet die App erst die Serienseite und fällt bei „nicht gefunden“ auf die Suche zurück (die Prüfung geht nur auf dem Handy; im Browser öffnet immer der Direktlink). Nur ein Schema mit <code>{'{q}'}</code> funktioniert wie eine reine Suche.</p>
        </div>
      </section>
    {:else if cat === 'ki'}
      <section class="card">
        {#if conn.mode === 'embedded'}
          <AiEmbeddedSettings />
        {:else if !ai}
          <p class="hint" style="margin-top:0">{aiMsg || 'Lade …'}</p>
        {:else}
          <div class="field">
            <label>KI-Funktionen</label>
            <div class="seg">
              <button class:on={ai.enabled} onclick={() => saveAi({ enabled: true })}>Aktiv</button>
              <button class:on={!ai.enabled} onclick={() => saveAi({ enabled: false })}>Aus</button>
            </div>
            <p class="hint">Schaltet die semantische Suche („KI"-Knopf in Entdecken und Meine Liste) ein. Du suchst damit nach Handlung und Thema statt nach Titeln, zusammen mit allen Filtern.</p>
          </div>
          {#if ai.enabled}
            <div class="field last">
              <label>Wo läuft das Embedding-Modell?</label>
              <div class="opts">
                <label class="opt dis"><input type="radio" disabled /> <span><b>Auf diesem Gerät</b> (Handy) — ein kleines Modell wird geladen<br /><i>Kommt mit der Handy-Version, noch nicht verfügbar.</i></span></label>
                <label class="opt"><input type="radio" name="aimode" checked={ai.mode === 'server'} onchange={() => saveAi({ mode: 'server' })} /> <span><b>Server-Modell</b> — Ollama auf dem Backend-Rechner (bge-m3)</span></label>
                <label class="opt"><input type="radio" name="aimode" checked={ai.mode === 'external'} onchange={() => (ai.mode = 'external')} /> <span><b>Externes Modell</b> — eigener Endpunkt oder Anbieter</span></label>
              </div>
              {#if ai.mode === 'external'}
                <div class="seg" style="margin-top:12px">
                  <button class:on={ai.ext_kind === 'openai'} onclick={() => (ai.ext_kind = 'openai')}>OpenAI-kompatibel</button>
                  <button class:on={ai.ext_kind === 'ollama'} onclick={() => (ai.ext_kind = 'ollama')}>Ollama</button>
                </div>
                <input style="margin-top:10px" placeholder={ai.ext_kind === 'ollama' ? 'URL, z. B. http://localhost:11434' : 'URL, z. B. https://api.anbieter.de'} bind:value={ai.ext_url} />
                <input placeholder="Modellname, z. B. text-embedding-3-small" bind:value={ai.ext_model} />
                {#if ai.ext_kind === 'openai'}<input type="password" placeholder={ai.ext_key_set ? 'API-Schlüssel gespeichert (zum Ändern neu eingeben)' : 'API-Schlüssel (optional)'} bind:value={aiKey} />{/if}
                <button class="big" onclick={saveExternal}>Speichern</button>
                <p class="hint">Der Schlüssel liegt nur in der lokalen Datenbank dieses Backends und wird nie zurück an die Oberfläche gesendet. Bei einem Anbieter gehen die Titel-Texte zum Aufbau des Index an dessen Server.</p>
              {/if}
              <button class="big" style="background:var(--surface-2);color:var(--text)" onclick={testAi} disabled={aiBusy}>Verbindung testen</button>
              {#if aiSt}
                <p class="hint">Index: {aiSt.embedded} von {aiSt.media} Titeln{aiSt.problem ? ' · ' : ''}<b>{aiSt.problem ?? ''}</b>{#if aiSt.indexing?.running} · baut auf: {aiSt.indexing.done}/{aiSt.indexing.total}{/if}</p>
                <button class="big" onclick={() => startIndex(false)} disabled={aiSt.indexing?.running}>{aiSt.problem?.includes('Index passt') ? 'Index neu aufbauen' : 'Neue Titel nachindizieren'}</button>
                <button class="link" onclick={() => startIndex(true)}>Index komplett neu aufbauen</button>
              {/if}
              <p class="hint">Wechselst du das Modell, muss der Index neu aufgebaut werden, weil Vektoren verschiedener Modelle nicht zusammenpassen. Das dauert je nach Modell Minuten bis Stunden.</p>
            </div>
          {/if}
          {#if aiMsg}<p class="msg">{aiMsg}</p>{/if}
        {/if}
      </section>
    {:else if cat === 'import'}
      <section class="card">
        <div class="field">
          <label>Zu AniList hochsynchronisieren</label>
          <p class="hint" style="margin-top:0">Überträgt Status, Wertung und Fortschritt deiner Anime-Liste (nie H). Ohne hinterlegten AniList-Token wird nichts gesendet — die Vorschau zeigt, was übertragen würde.</p>
          <button class="big" onclick={loadPreview} disabled={syncBusy}>Vorschau laden</button>
          {#if syncInfo}<p class="hint">{syncInfo.count} Einträge würden synchronisiert.</p>{/if}
          <button class="big" onclick={runSync} disabled={syncBusy}>Jetzt synchronisieren</button>
          {#if syncMsg}<p class="msg">{syncMsg}</p>{/if}
        </div>
        <div class="field last">
          <label>Daten von AniList importieren</label>
          <p class="hint" style="margin-top:0">Liest dein <b>öffentliches</b> AniList-Profil (kein Token nötig) und ergänzt Tags, Studios, Saison, Land, Quelle, Start-/Enddatum, Rewatches und Favoriten. Status, Wertung und Fortschritt bleiben unverändert.</p>
          <input placeholder="AniList-Benutzername" bind:value={aniUser} onkeydown={(e) => e.key === 'Enter' && runImport()} />
          <button class="big" onclick={runImport} disabled={impBusy || !aniUser.trim()}>{impBusy ? 'Importiere …' : 'Von AniList importieren'}</button>
          {#if impMsg}<p class="msg">{impMsg}</p>{/if}
        </div>
      </section>
    {:else if cat === 'export'}
      <section class="card">
        <div class="field last">
          <label>Export / Backup</label>
          <button class="big" onclick={() => downloadExport('mal').catch((e) => alert(e.message))}>Als MAL-XML exportieren (Standard)</button>
          <button class="big" onclick={() => downloadExport('json').catch((e) => alert(e.message))}>Als JSON-Vollbackup exportieren</button>
          <input type="file" accept=".json,.xml" style="display:none" bind:this={importEl} onchange={doImport} />
          <button class="big" onclick={() => importEl?.click()}>Liste importieren (Orbitlist-JSON oder MAL-XML)</button>
          {#if importMsg}<p class="msg">{importMsg}</p>{/if}
          <p class="hint">MAL-XML importieren AniList/Kitsu/Simkl/MAL. JSON enthält zusätzlich Notizen, Regal &amp; Favoriten.</p>
        </div>
      </section>
    {:else if cat === 'apps'}
      <section class="card">
        <div class="field">
          <label>Verbindung (Developer)</label>
          {#if pair && !pair.error}
            <p class="hint" style="margin-top:0">API: <code>{pair.api_base}</code></p>
            <p class="hint">Pair-Token: <code>{pair.token}</code></p>
            <p class="hint">{pair.note}</p>
          {:else if pair?.error}
            <p class="hint" style="margin-top:0">Pairing-Info nicht erreichbar.</p>
          {:else}
            <p class="hint" style="margin-top:0">Lade …</p>
          {/if}
        </div>
        <div class="field last">
          <label>MCP-Server <code>fuchs-orbitlist</code></label>
          <p class="hint" style="margin-top:0">Für KI-Assistenten (Lesen &amp; Schreiben, inkl. KI-Suche mit Filtern). Start über <code>backend/mcp_server.py</code>; Einbindung in die MCP-Config des Assistenten (siehe README).</p>
        </div>
      </section>
    {:else if cat === 'privat'}
      <section class="card">
        <div class="field last">
          <label>Privater Bereich (H)</label>
          <p class="hint">Standardmäßig unsichtbar. {hConfigured ? 'Passwort eingeben zum Entsperren.' : 'Lege ein Passwort fest — danach erscheint „Hentai" im Medientyp-Menü (oben neben dem Logo). Verschwindet bei jedem Neuladen wieder.'}</p>
          <input type="password" placeholder={hConfigured ? 'Passwort' : 'Passwort festlegen'} bind:value={hPw} onkeydown={(e) => e.key === 'Enter' && handleH()} />
          <button class="big" onclick={handleH}>{hConfigured ? 'Entsperren' : 'Passwort setzen & entsperren'}</button>
          {#if hConfigured}<button class="link" onclick={handleReset}>Passwort vergessen? Zurücksetzen</button>{/if}
          {#if hMsg}<p class="msg">{hMsg}</p>{/if}
        </div>
      </section>
    {:else}
      <section class="card">
        <div class="field last">
          <label>Über</label>
          <p class="hint">Orbitlist — erweiterbarer Medien-Tracker.<br />
            Katalog: <a href="https://github.com/Entwicklerfuchs26/AnimeDB" target="_blank" rel="noopener">AnimeDB</a> (Wikidata CC0, Wikipedia CC BY-SA, anime-offline-database ODbL; Daten ODbL 1.0). Dub data © MyDubList – mydublist.com (CC BY 4.0). Bilder, Charaktere, Statistiken und Streaming-Verfügbarkeit: AniList (Abruf auf deinem Gerät).<br />
            {stats.anime ?? 0} Anime · {stats.h ?? 0} H · {stats.anime_dubbed ?? 0} dt. synchronisiert.</p>
        </div>
      </section>
      {#if conn.mode === 'embedded'}
        <section class="card">
          <div class="field last">
            <label>Backend</label>
            <p class="hint">Eingebaut: läuft in diesem Plugin auf dem Gerät, ohne Server. Deine Liste liegt nur auf diesem Gerät. Mehrere Geräte/Frontends: Plugin „Orbit-List Connect" mit einem eigenen Backend verbinden.</p>
          </div>
        </section>
      {:else if conn.mode === 'plugin' || conn.key}
        <section class="card">
          <div class="field last">
            <label>Verbindung</label>
            <p class="hint">{conn.mode === 'plugin' ? `Backend: ${conn.server}` : 'Dieses Backend ist passwortgeschützt.'}</p>
            <button class="big" onclick={() => { onclose(); disconnect() }}>{conn.mode === 'plugin' ? 'Verbindung ändern / trennen' : 'Abmelden'}</button>
          </div>
        </section>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 50; }
  .panel {
    position: fixed; top: 0; right: 0; z-index: 51; width: min(480px, 100%); height: 100%;
    overflow-y: auto; background: var(--bg); box-shadow: var(--shadow);
  }
  header { display: flex; justify-content: space-between; align-items: center; padding: 20px var(--pad) 16px; }
  @media (max-width: 560px) { header, nav, .body { padding-left: 20px; padding-right: 20px; } }
  header h2 { margin: 0; font-size: 1.15rem; font-weight: 500; color: var(--text-strong); }
  .close { width: 30px; height: 30px; border-radius: var(--radius); border: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; line-height: 1; transition: background 0.15s, color 0.15s; }
  .close:hover { background: var(--surface-2); color: var(--text); }

  nav { display: flex; gap: 4px; padding: 0 var(--pad); overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; border-bottom: 1px solid var(--border); }
  nav button {
    padding: 10px 14px; white-space: nowrap; flex: 0 0 auto; border: 0; border-bottom: 2px solid transparent; background: transparent;
    color: var(--text-muted); cursor: pointer; font-size: 0.85rem; font-weight: 500;
    margin-bottom: -1px; transition: color 0.15s, border-color 0.15s;
  }
  nav button:hover { color: var(--text); }
  nav button.on { color: var(--text-strong); border-bottom-color: var(--accent); }

  .body { padding: 24px var(--pad) 40px; }
  .card {
    background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-sm);
    padding: 22px 24px; margin-bottom: 16px;
  }
  .field { margin-bottom: 24px; }
  .field.last { margin-bottom: 0; }
  .field > label { display: block; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.02em; color: var(--text-muted); margin-bottom: 10px; }

  .seg { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .seg button { padding: 8px 18px; border: 0; background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.85rem; transition: background 0.15s, color 0.15s; }
  .seg button:hover { color: var(--text); }
  .seg button + button { border-left: 1px solid var(--border); }
  .seg button.on { background: var(--accent); color: #fff; font-weight: 600; }

  .swatches { display: flex; flex-wrap: wrap; gap: 10px; }
  .swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform 0.1s; }
  .swatch:hover { transform: scale(1.1); }
  .swatch.on { border-color: var(--text-strong); box-shadow: 0 0 0 2px var(--surface) inset; }

  a.big { display: block; text-align: center; text-decoration: none; }
  .big {
    width: 100%; padding: 11px 14px; border-radius: var(--radius); border: 0;
    background: var(--accent); color: #fff; cursor: pointer; font-size: 0.88rem;
    font-weight: 500; margin-top: 4px; transition: background 0.15s, opacity 0.15s;
  }
  .big:hover { background: var(--accent-dim); }
  .big:disabled { opacity: 0.45; cursor: default; background: var(--accent); }

  input {
    width: 100%; padding: 10px 12px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--bg); color: var(--text); margin-bottom: 8px; font-size: 0.88rem;
    transition: border-color 0.15s;
  }
  input:focus { outline: none; border-color: var(--accent); }
  input::placeholder { color: var(--text-muted); }

  .opts { display: flex; flex-direction: column; gap: 6px; }
  .opt { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 0.84rem; color: var(--text); margin: 0; letter-spacing: 0; }
  .opt input { width: auto; margin: 3px 0 0; }
  .opt.dis { opacity: 0.55; cursor: default; }
  .opt i { color: var(--text-muted); font-size: 0.78rem; }
  .hint { font-size: 0.8rem; color: var(--text-muted); line-height: 1.6; margin: 10px 0 0; }
  .msg { color: var(--accent); font-size: 0.82rem; margin-top: 8px; }
  .link { background: none; border: 0; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; margin-top: 10px; text-decoration: underline; padding: 0; }
  .link:hover { color: var(--text); }

  .svc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .svc-row span { color: var(--text-strong); font-weight: 500; }
  .svc-row .del { flex: 0 0 auto; width: 24px; height: 24px; border-radius: var(--radius); border: 0; background: transparent; color: var(--bad); cursor: pointer; transition: background 0.15s; }
  .svc-row .del:hover { background: var(--surface-2); }
  .svc-row code { color: var(--text-muted); font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%; }
  .addsvc { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
  code { background: var(--surface-2); padding: 1px 5px; border-radius: var(--radius-sm); font-size: 0.85em; }
</style>
