<script lang="ts">
  import { api } from '../api'

  let { startUnlocked = false, hToken = null, hConfigured = false, onclose, onpick, onUnlockH }: {
    startUnlocked?: boolean
    hToken?: string | null
    hConfigured?: boolean
    onclose: () => void
    onpick: (t: any) => void
    onUnlockH: (token: string) => void
  } = $props()

  let unlocked = $state(startUnlocked)
  let types = $state<any[]>([])
  let showPw = $state(false)
  let pw = $state('')
  let msg = $state('')
  let confirmDel = $state<string | null>(null)

  async function reload(token?: string | null) {
    try {
      types = await api.mediaTypes(token ?? (unlocked ? hToken : null))
    } catch {
      types = []
    }
  }
  $effect(() => { void unlocked; void hToken; reload() })

  async function submitPw() {
    msg = ''
    try {
      if (!hConfigured) { await api.hSetPassword(pw); hConfigured = true }
      await api.hUnlock(pw)
      onUnlockH(pw)
      unlocked = true
      showPw = false
      await reload(pw)
    } catch {
      msg = 'Falsches Passwort.'
    }
    pw = ''
  }

  async function del(slug: string, ev: MouseEvent) {
    ev.stopPropagation()
    if (confirmDel !== slug) { confirmDel = slug; return }
    try { await api.deleteMediaType(slug) } catch {}
    types = types.filter((t) => t.slug !== slug)
    confirmDel = null
  }
</script>

<div class="wrap">
  <header>
    <div>
      <div class="kicker">Medientyp</div>
      <h1>Was möchtest du tracken?</h1>
      <p>Jede Config ist ein eigener Bereich. Klick wählt sie aus — der Name oben wechselt mit.</p>
    </div>
    <div class="hd-actions">
      <button class="lock" class:on={unlocked} onclick={() => (showPw = !showPw)} title="Versteckte Kategorien" aria-label="Versteckte Kategorien">
        {#if unlocked}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        {/if}
      </button>
      <button class="close" onclick={onclose} aria-label="Schließen">✕</button>
    </div>
  </header>

  {#if showPw && !unlocked}
    <div class="pwbar">
      <input type="password" placeholder={hConfigured ? 'Passwort' : 'Passwort festlegen'} bind:value={pw} onkeydown={(e) => e.key === 'Enter' && submitPw()} />
      <button onclick={submitPw}>{hConfigured ? 'Entsperren' : 'Festlegen'}</button>
      {#if msg}<span class="err">{msg}</span>{/if}
    </div>
  {/if}

  <div class="grid">
    {#each types as t (t.slug)}
      <button class="card" class:hidden={t.hidden} onclick={() => onpick(t)}>
        <span class="icon">
          {#if t.slug === 'anime'}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 7c-9 0-15 6-15 16 0 7 4 12 9 15l6 3 6-3c5-3 9-8 9-15 0-10-6-16-15-16Z"/><path d="M17 23c1.5-2 4-2 5.5 0"/><path d="M25.5 23c1.5-2 4-2 5.5 0"/><path d="M20 33c2 1.5 6 1.5 8 0"/></svg>
          {:else if t.slug === 'manga'}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="9" width="32" height="30" rx="2"/><path d="M24 9v30"/><path d="M13 16h7M13 22h7M28 16h7M28 27h7"/></svg>
          {:else if t.slug === 'book'}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 12c-3-2.5-8-3-13-2v26c5-1 10-.5 13 2 3-2.5 8-3 13-2V10c-5-1-10-.5-13 2Z"/><path d="M24 12v26"/></svg>
          {:else if t.slug === 'film'}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="14" width="32" height="22" rx="2"/><path d="M8 20h32"/><path d="M14 14l-2 6M22 14l-2 6M30 14l-2 6M38 14l-2 6"/></svg>
          {:else if t.slug === 'series'}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="16" width="32" height="22" rx="2"/><path d="M18 16l6-6 6 6"/></svg>
          {:else if t.slug === 'audiobook'}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 28v-4a12 12 0 0 1 24 0v4"/><rect x="8" y="27" width="7" height="11" rx="2"/><rect x="33" y="27" width="7" height="11" rx="2"/></svg>
          {:else}
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8c-7 0-13 5-13 12 0 4 2 7 5 9l-1 7 7-4h2c7 0 13-5 13-12S31 8 24 8Z"/><circle cx="19" cy="20" r="1.5"/><circle cx="29" cy="20" r="1.5"/></svg>
          {/if}
        </span>
        <span class="txt">
          <span class="name">{t.name}</span>
          <span class="desc">{t.description}</span>
        </span>
        {#if t.deletable}
          <span class="del" class:confirm={confirmDel === t.slug} role="button" tabindex="0"
            onclick={(e) => del(t.slug, e)}
            onkeydown={(e) => { if (e.key === 'Enter') del(t.slug, e as any) }}
            title="Config löschen">{confirmDel === t.slug ? 'Löschen?' : '✕'}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .wrap { position: fixed; inset: 0; z-index: 60; overflow-y: auto; background: var(--bg); padding: calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 40px); }
  header { display: flex; justify-content: space-between; align-items: flex-start; max-width: 760px; margin: 0 auto 20px; gap: 16px; }
  .kicker { color: var(--accent); font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  h1 { font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 800; letter-spacing: -0.02em; margin: 4px 0 6px; }
  header p { color: var(--text-muted); margin: 0; }
  .hd-actions { display: flex; gap: 8px; flex: 0 0 auto; }
  .lock, .close { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; display: grid; place-items: center; }
  .lock svg { width: 18px; height: 18px; }
  .lock.on { color: var(--accent); border-color: var(--accent); }
  .pwbar { max-width: 760px; margin: 0 auto 18px; display: flex; gap: 8px; align-items: center; }
  .pwbar input { flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); }
  .pwbar button { padding: 10px 16px; border-radius: 8px; border: 0; background: var(--accent); color: #022; font-weight: 700; cursor: pointer; }
  .pwbar .err { color: #e0607e; font-size: 0.8rem; }
  .grid { max-width: 760px; margin: 0 auto; display: grid; gap: 12px; grid-template-columns: repeat(2, 1fr); }
  .card { position: relative; display: flex; align-items: center; gap: 14px; text-align: left; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
  .card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .card.hidden { border-color: color-mix(in srgb, var(--accent-2) 50%, var(--border)); }
  .card.hidden .icon { color: var(--accent-2); }
  .icon { flex: 0 0 auto; width: 44px; height: 44px; color: var(--accent); }
  .icon svg { width: 100%; height: 100%; }
  .txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .name { font-weight: 700; font-size: 1rem; }
  .desc { font-size: 0.8rem; color: var(--text-muted); }
  .del { position: absolute; top: 8px; right: 8px; font-size: 0.68rem; color: var(--text-muted); border: 1px solid var(--border); padding: 2px 7px; border-radius: 20px; background: var(--surface-2); line-height: 1.4; }
  .del:hover { color: #e0607e; border-color: #e0607e; }
  .del.confirm { color: #fff; background: #e0607e; border-color: #e0607e; font-weight: 700; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
</style>
