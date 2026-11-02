<script lang="ts">
  // AniList-Abgleich: Vorschau, dann Uebernehmen (AniList -> hier) und/oder Senden (hier -> AniList). Loescht nie etwas.
  import { conn } from './conn.svelte'
  import {
    loadAuth, saveAuth, clearToken, verifyToken, authorizeUrl, fetchRemote, loadLocal, plan, applyPull, applyPush,
    type Plan,
  } from './anilist-sync'

  const auth0 = loadAuth()
  let username = $state(auth0.username ?? '')
  let token = $state('')
  let clientId = $state(auth0.clientId ?? '')
  let connected = $state(!!auth0.token)
  let userId = $state<number | undefined>(undefined)
  let busy = $state(false)
  let msg = $state('')
  let err = $state('')
  let p = $state<Plan | null>(null)

  const hasToken = $derived(connected)

  async function connect() {
    err = ''; msg = ''
    if (!token.trim()) return
    busy = true
    try {
      const v = await verifyToken(token.trim())
      saveAuth({ token: token.trim(), username: v.name, clientId })
      username = v.name; userId = v.id; connected = true; token = ''
      msg = `Verbunden als ${v.name}.`
    } catch (e: any) { err = e.message || String(e) }
    busy = false
  }
  function disconnect() {
    clearToken(); connected = false; p = null; msg = 'Token entfernt (nur auf diesem Gerät gespeichert gewesen).'
  }

  async function preview() {
    err = ''; msg = ''; p = null
    const a = loadAuth()
    if (!a.token && !username.trim()) { err = 'Bitte AniList-Benutzernamen (öffentliche Liste) oder einen Token angeben.'; return }
    busy = true
    try {
      if (!a.token) saveAuth({ ...a, username: username.trim() })
      const auth = { ...loadAuth(), username: a.token ? a.username : username.trim() }
      let uid = userId
      if (a.token && !uid) uid = (await verifyToken(a.token)).id
      const [remote, local] = await Promise.all([fetchRemote(auth, uid), loadLocal()])
      p = plan(remote.entries, local, remote.favorites)
      userId = uid
    } catch (e: any) { err = e.message || String(e) }
    busy = false
  }

  async function pull() {
    if (!p) return
    busy = true; err = ''
    try {
      const r = await applyPull(p)
      msg = `Übernommen: ${r.updated} Einträge${r.favoritesAdded ? `, ${r.favoritesAdded} neue Favoriten` : ''}${r.notInCatalog ? `. ${r.notInCatalog} nicht im Katalog (übersprungen).` : '.'}`
      p = null
      setTimeout(() => { conn.rev++ }, 1200)
    } catch (e: any) { err = e.message || String(e) }
    busy = false
  }

  async function push() {
    const a = loadAuth()
    if (!p || !a.token) return
    if (!confirm(`${p.push.length} Einträge zu AniList senden? Es wird nichts gelöscht, nur angelegt oder aktualisiert.`)) return
    busy = true; err = ''
    try {
      const r = await applyPush(p, a.token, (d, t) => (msg = `Sende … ${d} von ${t}`))
      msg = `${r.sent} Einträge zu AniList gesendet.${r.errors.length ? ' Fehler: ' + r.errors.slice(0, 2).join('; ') : ''}`
      p = null
    } catch (e: any) { err = e.message || String(e) }
    busy = false
  }
</script>

<div class="field">
  <label>AniList-Abgleich</label>
  <p class="hint" style="margin-top:0">
    Gleicht deine Liste mit AniList ab (Status, Wertung, Fortschritt, Favoriten). <b>Es wird nie etwas gelöscht</b> — weder bei AniList noch hier.
    Wo sich beide Seiten unterscheiden, gewinnt der neuere Stand. Der private Bereich (H) wird nie übertragen.
  </p>
  <input placeholder="AniList-Benutzername (öffentliche Liste, ohne Token)" bind:value={username} disabled={hasToken} autocapitalize="off" autocomplete="off" spellcheck="false" />
</div>

<div class="field">
  <label>Anmeldung mit Token (zum Senden und für private Listen)</label>
  {#if hasToken}
    <p class="hint" style="margin-top:0">Verbunden{username ? ` als ${username}` : ''}. Der Token liegt nur auf diesem Gerät.</p>
    <button class="big" onclick={disconnect}>Token entfernen</button>
  {:else}
    <p class="hint" style="margin-top:0">
      Einmalig: auf anilist.co → Einstellungen → Developer eine App anlegen, als „Redirect URL“ <code>https://anilist.co/api/v2/oauth/pin</code> eintragen, die Client-ID unten einfügen, „Bei AniList anmelden“ drücken und den angezeigten Token hier einfügen. Er gilt etwa ein Jahr.
    </p>
    <input placeholder="Client-ID der AniList-App" bind:value={clientId} inputmode="numeric" autocomplete="off" />
    {#if clientId.trim()}
      <a class="big" style="text-align:center;text-decoration:none;display:block" href={authorizeUrl(clientId.trim())} target="_blank" rel="noopener">Bei AniList anmelden</a>
    {/if}
    <input type="password" placeholder="Token einfügen" bind:value={token} autocomplete="off" />
    <button class="big" onclick={connect} disabled={busy || !token.trim()}>Token prüfen und speichern</button>
  {/if}
</div>

<div class="field last">
  <label>Abgleichen</label>
  <button class="big" onclick={preview} disabled={busy}>{busy && !p ? 'Lade …' : 'Vorschau laden'}</button>
  {#if p}
    <p class="hint">
      AniList: {p.remoteCount} Einträge · hier: {p.localCount} · unverändert: {p.same}<br />
      Von AniList übernehmen: <b>{p.pullNew.length + p.pullUpd.length}</b> ({p.pullNew.length} neu, {p.pullUpd.length} aktueller bei AniList)<br />
      Zu AniList senden: <b>{p.push.length}</b>{hasToken ? '' : ' (nur mit Token möglich)'}
    </p>
    {#if p.pullNew.length}
      <p class="hint">Neu bei AniList, z. B.: {p.pullNew.slice(0, 5).map((r) => r.title).join(', ')}{p.pullNew.length > 5 ? ' …' : ''}</p>
    {/if}
    {#if p.push.length}
      <p class="hint">Zu senden, z. B.: {p.push.slice(0, 5).map((x) => x.l.title_romaji).join(', ')}{p.push.length > 5 ? ' …' : ''}</p>
    {/if}
    <button class="big" onclick={pull} disabled={busy || !(p.pullNew.length + p.pullUpd.length)}>Von AniList übernehmen</button>
    <button class="big" onclick={push} disabled={busy || !hasToken || !p.push.length}>Zu AniList senden</button>
  {/if}
  {#if msg}<p class="msg">{msg}</p>{/if}
  {#if err}<p class="msg" style="color:#e85d75">{err}</p>{/if}
</div>
