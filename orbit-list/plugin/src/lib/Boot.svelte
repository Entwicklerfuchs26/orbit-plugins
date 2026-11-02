<script lang="ts">
  import { emb, boot, saveCatalogUrl } from './embedded.svelte'
  import { conn } from './conn.svelte'

  let url = $state(emb.catalogUrl)
  function retry() {
    saveCatalogUrl(url)
    emb.needCatalogUrl = false
    emb.phase = 'idle'
    boot(conn.defaultServer).catch(() => {})
  }
</script>

<div class="cwrap">
  <div class="card">
    <h1>Orbit-List startet</h1>
    {#if emb.phase === 'error'}
      <p class="err">{emb.msg}</p>
      <label for="cu">Katalog-Quelle (Adresse der .db.gz-Datei)</label>
      <input id="cu" bind:value={url} placeholder="https://github.com/Entwicklerfuchs26/orbit-plugins/releases/download/orbit-list-catalog/catalog.db.gz" autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="url" />
      <button class="go" onclick={retry}>Erneut versuchen</button>
      <p class="hint">Der Katalog wird nur beim ersten Start geladen (Internet nötig). Die Adresse kann auch ein eigenes Backend sein (…/catalog/slim.db.gz).</p>
    {:else}
      <p class="lead">{emb.msg || 'Einen Moment …'}</p>
      <div class="bar"><div style="width:{emb.pct}%"></div></div>
    {/if}
  </div>
</div>

<style>
  .cwrap { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 20px; background: var(--bg, #111); overflow: auto; }
  .card { width: min(420px, 100%); display: flex; flex-direction: column; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-sm); }
  h1 { margin: 0 0 4px; font-size: 1.25rem; color: var(--text); }
  .lead, .hint { margin: 0 0 8px; color: var(--text-muted); font-size: 0.88rem; line-height: 1.4; }
  label { font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; }
  input { padding: 11px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg, transparent); color: var(--text); font-size: 1rem; outline: none; }
  .err { margin: 6px 0 0; color: #e85d75; font-size: 0.86rem; word-break: break-word; }
  .go { margin-top: 12px; padding: 12px; border: 0; border-radius: var(--radius-sm); background: var(--accent); color: #022; font-weight: 700; font-size: 1rem; cursor: pointer; }
  .bar { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
  .bar div { height: 100%; background: var(--accent); transition: width 0.3s; }
</style>
