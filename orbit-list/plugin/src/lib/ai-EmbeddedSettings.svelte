<script lang="ts">
  // KI-Einstellungen im eingebetteten Backend: Modell auf dem Geraet (Hugging Face) oder externer Endpunkt im Heimnetz.
  import { onDestroy, onMount } from 'svelte'
  import { api } from '../api'
  import { request } from './conn.svelte'
  import { SUGGESTIONS } from './ai-core'
  import { refreshAi } from './ai.svelte'

  let ai = $state<any>(null)
  let st = $state<any>(null)
  let msg = $state('')
  let busy = $state(false)
  let key = $state('')
  let hf = $state('')
  let timer: any = null

  async function reload() {
    try {
      ai = await api.aiConfig()
      st = await api.aiStatus()
      if (!hf) hf = ai.hf_model || ''
    } catch { msg = 'KI-Konfiguration nicht erreichbar.' }
  }
  async function poll() {
    try { st = await api.aiStatus() } catch {}
  }
  onMount(() => { reload(); timer = setInterval(poll, 700) })
  onDestroy(() => clearInterval(timer))

  async function save(patch: Record<string, unknown>) {
    msg = ''
    try { ai = await api.aiConfigSet(patch); await poll(); await refreshAi() } catch { msg = 'Speichern fehlgeschlagen.' }
  }
  async function saveDevice() {
    if (!hf.trim()) { msg = 'Bitte einen Modellnamen eintragen.'; return }
    await save({ mode: 'device', hf_model: hf.trim() })
    msg = `Modell „${hf.trim()}“ gespeichert. Mit „Modell laden & Index aufbauen“ geht es los.`
  }
  async function saveExternal() {
    const p: Record<string, unknown> = { mode: 'external', ext_kind: ai.ext_kind, ext_url: ai.ext_url, ext_model: ai.ext_model }
    if (key) p.ext_key = key
    await save(p); key = ''
  }
  async function test() {
    busy = true; msg = ''
    const r = await api.aiTest().catch(() => ({ ok: false, error: 'nicht erreichbar' }))
    msg = r.ok ? `Modell läuft — liefert ${r.dim} Dimensionen.` : `Fehlgeschlagen: ${r.error}`
    busy = false; await poll()
  }
  async function start(rebuild: boolean) {
    msg = ''
    if (rebuild && !confirm('Den Index dieses Modells komplett neu aufbauen? Das kann lange dauern.')) return
    const r = await api.aiIndex(rebuild).catch(() => null)
    if (!r) msg = 'Index konnte nicht gestartet werden.'
    await poll(); await reload(); await refreshAi()
  }
  async function pause() { await request('/ai/stop', { method: 'POST' }); msg = 'Pausiert …' }
  async function wipe() {
    if (!confirm('Den Index dieses Modells löschen?')) return
    const r = await request('/ai/index', { method: 'DELETE' })
    msg = r.status === 200 ? 'Index dieses Modells gelöscht.' : ((await r.json().catch(() => ({}))).detail || 'Löschen fehlgeschlagen.')
    await reload()
  }

  let running = $derived(!!st?.indexing?.running)
  let loading = $derived(st?.local?.phase === 'loading')
  let pct = $derived(Math.max(0, Math.min(100, st?.local?.pct ?? 0)))
  let hasIndex = $derived((st?.embedded ?? 0) > 0)
  let rec = $derived(ai?.recommended)
</script>

{#if !ai}
  <p class="hint" style="margin-top:0">{msg || 'Lade …'}</p>
{:else}
  <div class="field">
    <div class="lab">KI-Funktionen</div>
    <div class="seg">
      <button class:on={ai.enabled} onclick={() => save({ enabled: true })}>Aktiv</button>
      <button class:on={!ai.enabled} onclick={() => save({ enabled: false })}>Aus</button>
    </div>
    <p class="hint">Schaltet die semantische Suche („KI"-Knopf in Entdecken und Meine Liste) ein. Du suchst damit nach Handlung und Thema statt nach Titeln, zusammen mit allen Filtern. Alles läuft in dieser App; Netz brauchen der Modell-Download, das Laden der Laufzeit (jsDelivr) und ein evtl. externes Modell.</p>
  </div>

  {#if ai.enabled}
    <div class="field last">
      <div class="lab">Wo läuft das Embedding-Modell?</div>
      <div class="opts">
        <label class="opt"><input type="radio" name="aimode" checked={ai.mode === 'device'} disabled={running} onchange={() => save({ mode: 'device' })} /> <span><b>Auf diesem Gerät</b> — Modell einmal von Hugging Face laden, danach läuft die Suche selbst</span></label>
        <label class="opt"><input type="radio" name="aimode" checked={ai.mode === 'external'} disabled={running} onchange={() => save({ mode: 'external' })} /> <span><b>Externes Modell</b> — z. B. Ollama im Heimnetz</span></label>
      </div>

      {#if ai.mode === 'device'}
        <input style="margin-top:12px" placeholder="Hugging-Face-Modellname, z. B. Xenova/multilingual-e5-small" bind:value={hf} disabled={running} autocapitalize="off" autocomplete="off" spellcheck="false" />
        <div class="sugg">
          {#each SUGGESTIONS as s}
            <button class="chip" class:on={hf.trim() === s.name} onclick={() => (hf = s.name)} disabled={running}>
              <b>{s.tier}</b> · {s.name.split('/')[1]} · ca. {s.mb} MB{rec?.name === s.name ? ' · empfohlen' : ''}
              <i>{s.note}</i>
            </button>
          {/each}
        </div>
        <p class="hint">{rec?.why} Das sind Richtwerte — ob ein Modell auf deinem Gerät flüssig läuft, zeigt erst der Versuch. Es geht jedes Hugging-Face-Modell mit ONNX-Dateien (meist von „Xenova“ oder „onnx-community“). Das Modell wird einmalig geladen und danach aus dem Browser-Speicher verwendet.</p>
        <button class="big" onclick={saveDevice} disabled={running}>Modell übernehmen</button>
      {:else}
        <div class="seg" style="margin-top:12px">
          <button class:on={ai.ext_kind === 'ollama'} onclick={() => (ai.ext_kind = 'ollama')}>Ollama</button>
          <button class:on={ai.ext_kind === 'openai'} onclick={() => (ai.ext_kind = 'openai')}>OpenAI-kompatibel</button>
        </div>
        <input style="margin-top:10px" placeholder={ai.ext_kind === 'ollama' ? 'Adresse, z. B. https://ollama.heimnetz.example' : 'Adresse, z. B. https://api.anbieter.de'} bind:value={ai.ext_url} disabled={running} autocapitalize="off" spellcheck="false" />
        <input placeholder={ai.ext_kind === 'ollama' ? 'Modellname, z. B. bge-m3' : 'Modellname, z. B. text-embedding-3-small'} bind:value={ai.ext_model} disabled={running} autocapitalize="off" spellcheck="false" />
        <input type="password" placeholder={ai.ext_key_set ? 'API-Schlüssel gespeichert (zum Ändern neu eingeben)' : 'API-Schlüssel (optional)'} bind:value={key} disabled={running} />
        <button class="big" onclick={saveExternal} disabled={running}>Speichern</button>
        <p class="hint">Android sperrt unverschlüsseltes HTTP: auf dem Handy braucht der Endpunkt <b>HTTPS</b> (z. B. über einen Reverse-Proxy im Heimnetz). Am Desktop geht auch <code>http://</code>, Ollama muss dann Anfragen dieser App erlauben (<code>OLLAMA_ORIGINS</code>). Der Schlüssel bleibt nur auf diesem Gerät. Zum Aufbau des Index gehen die Titeltexte an den eingetragenen Server.</p>
      {/if}

      <button class="big alt" onclick={test} disabled={busy || running}>{ai.mode === 'device' ? 'Modell laden & testen' : 'Verbindung testen'}</button>

      {#if loading}
        <div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><div style="width:{pct}%"></div></div>
        <p class="hint">{st.local.msg}</p>
      {/if}

      {#if st}
        <p class="hint">Index: {st.embedded} von {st.media} Titeln{#if st.problem && !running} · <b>{st.problem}</b>{/if}</p>
        {#if running || st.local?.phase === 'indexing'}
          {#if !loading}<div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><div style="width:{pct}%"></div></div>{/if}
          <p class="hint">{loading ? 'Danach wird der Index aufgebaut.' : `Index wird aufgebaut: ${st.indexing.done} / ${st.indexing.total} (${pct} %)${st.local?.eta ? ' · ' + st.local.eta : ''}`}</p>
          <button class="big alt" onclick={pause}>Pausieren</button>
        {:else}
          <button class="big" onclick={() => start(false)}>{hasIndex ? 'Index fortsetzen / neue Titel' : 'Modell laden & Index aufbauen'}</button>
          {#if hasIndex}<button class="link" onclick={() => start(true)}>Index komplett neu aufbauen</button> <button class="link" onclick={wipe}>Index dieses Modells löschen</button>{/if}
        {/if}
        {#if st.indexing?.error}<p class="msg">Fehler: {st.indexing.error}</p>{/if}
      {/if}
      <p class="hint">Jedes Modell hat seinen eigenen Index; beim Wechsel bleibt der alte gespeichert, bis du ihn löschst. Der Aufbau läuft im Hintergrund, solange die App offen ist, und macht beim nächsten Start dort weiter, wo er war. Die Suche funktioniert schon mit einem Teil-Index. Auf dem Handy kann der Aufbau je nach Modell lange dauern.</p>
    </div>
  {/if}
  {#if msg}<p class="msg">{msg}</p>{/if}
{/if}

<style>
  .field { margin-bottom: 24px; }
  .field.last { margin-bottom: 0; }
  .field > .lab { display: block; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.02em; color: var(--text-muted); margin-bottom: 10px; }
  .seg { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .seg button { padding: 8px 18px; border: 0; background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.85rem; }
  .seg button + button { border-left: 1px solid var(--border); }
  .seg button.on { background: var(--accent); color: #fff; font-weight: 600; }
  .opts { display: flex; flex-direction: column; gap: 8px; }
  .opt { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 0.84rem; color: var(--text); margin: 0; }
  .opt input { width: auto; margin: 3px 0 0; }
  input:not([type='radio']) { display: block; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); font-size: 0.88rem; }
  .big { display: block; width: 100%; margin-top: 12px; padding: 11px 14px; border: 0; border-radius: var(--radius); background: var(--accent); color: #fff; font-weight: 600; font-size: 0.88rem; cursor: pointer; }
  .big.alt { background: var(--surface-2); color: var(--text); }
  .big:disabled { opacity: 0.45; cursor: default; }
  .hint { font-size: 0.8rem; color: var(--text-muted); line-height: 1.6; margin: 10px 0 0; }
  .msg { color: var(--accent); font-size: 0.82rem; margin-top: 8px; }
  .link { background: none; border: 0; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; margin-top: 10px; text-decoration: underline; padding: 0; }
  .sugg { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
  .chip { text-align: left; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); font-size: 0.8rem; cursor: pointer; }
  .chip.on { border-color: var(--accent); }
  .chip i { display: block; color: var(--text-muted); font-style: normal; font-size: 0.75rem; margin-top: 2px; }
  .bar { height: 8px; border-radius: 4px; background: var(--surface-2); overflow: hidden; margin-top: 14px; }
  .bar > div { height: 100%; background: var(--accent); transition: width 0.3s; }
</style>
