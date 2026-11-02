<script lang="ts">
  import { conn, tryConnect } from './conn.svelte'

  let server = $state(conn.server || conn.defaultServer)
  let password = $state('')
  let busy = $state(false)
  let error = $state(conn.message)
  const plugin = conn.mode === 'plugin'

  async function submit(e: Event) {
    e.preventDefault()
    busy = true
    error = ''
    try { await tryConnect(server, password) } catch (err: any) { error = err.message || String(err) }
    busy = false
  }
</script>

<div class="cwrap">
  <form class="card" onsubmit={submit}>
    <h1>Orbitlist verbinden</h1>
    {#if plugin}
      <p class="lead">Die Anime-Liste braucht ein Backend (deine eigene Datenbank). Trage dessen Adresse und das Passwort ein.</p>
      <label for="srv">Adresse mit Port</label>
      <input id="srv" bind:value={server} placeholder="192.168.1.20:8787" autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="url" />
    {:else}
      <p class="lead">Dieses Backend ist passwortgeschützt.</p>
    {/if}
    <label for="pw">Passwort</label>
    <input id="pw" type="password" bind:value={password} placeholder="Passwort des Backends" autocomplete="current-password" />
    {#if error || conn.message}<p class="err">{error || conn.message}</p>{/if}
    <button class="go" disabled={busy}>{busy ? 'Verbinde …' : 'Verbinden'}</button>
    {#if plugin}
      <p class="hint">Noch kein Backend? Anleitung zum Selbst-Installieren: github.com/Entwicklerfuchs26/orbit-plugins/tree/main/orbit-list</p>
    {/if}
  </form>
</div>

<style>
  .cwrap { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 20px; background: var(--bg, #111); overflow: auto; }
  .card { width: min(420px, 100%); display: flex; flex-direction: column; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-sm); }
  h1 { margin: 0 0 4px; font-size: 1.25rem; color: var(--text); }
  .lead, .hint { margin: 0 0 8px; color: var(--text-muted); font-size: 0.88rem; line-height: 1.4; }
  label { font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; }
  input { padding: 11px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg, transparent); color: var(--text); font-size: 1rem; outline: none; }
  input:focus { border-color: var(--accent); }
  .err { margin: 6px 0 0; color: #e85d75; font-size: 0.86rem; }
  .go { margin-top: 12px; padding: 12px; border: 0; border-radius: var(--radius-sm); background: var(--accent); color: #022; font-weight: 700; font-size: 1rem; cursor: pointer; }
  .go:disabled { opacity: 0.6; cursor: default; }
</style>
