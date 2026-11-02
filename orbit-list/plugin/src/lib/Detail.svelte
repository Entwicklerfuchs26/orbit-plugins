<script lang="ts">
  const SEASON_DE: Record<string, string> = { WINTER: 'Winter', SPRING: 'Frühling', SUMMER: 'Sommer', FALL: 'Herbst' }
  const SOURCE_DE: Record<string, string> = { MANGA: 'Manga', LIGHT_NOVEL: 'Light Novel', WEB_NOVEL: 'Web Novel', NOVEL: 'Roman', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual Novel', VIDEO_GAME: 'Videospiel', ANIME: 'Anime', GAME: 'Spiel', OTHER: 'Sonstiges', DOUJINSHI: 'Doujinshi', LIVE_ACTION: 'Realfilm', COMIC: 'Comic', MULTIMEDIA_PROJECT: 'Multimedia-Projekt', PICTURE_BOOK: 'Bilderbuch' }
  const COUNTRY_DE: Record<string, string> = { JP: 'Japan', CN: 'China', KR: 'Südkorea', TW: 'Taiwan' }
  import { api, type Media } from '../api'

  let {
    media,
    services = [],
    onclose,
    onchange,
  }: {
    media: Media
    services?: any[]
    onclose: () => void
    onchange?: (m: Media) => void
  } = $props()

  let m = $state({ ...media })

  const WATCH: [string, string][] = [
    ['none', '—'], ['watching', 'Beobachten'], ['rewatching', 'Wiederanschauen'], ['completed', 'Abgeschlossen'],
    ['paused', 'Pausiert'], ['dropped', 'Fallen Gelassen'], ['planning', 'Planung'],
  ]
  const COLL: [string, string][] = [['none', '—'], ['wish', 'Wunsch'], ['owned', 'Im Regal']]
  const FORMAT: Record<string, string> = {
    TV: 'Fernseher', TV_SHORT: 'TV-Kurzfilm', MOVIE: 'Film', SPECIAL: 'Spezial',
    OVA: 'OVA', ONA: 'ONA', MUSIC: 'Musik',
  }
  const LINK_LABEL: Record<string, string> = { anilist: 'AniList', mal: 'MyAnimeList', anisearch: 'aniSearch' }

  const fmtFormat = (f?: string) => (f ? FORMAT[f] ?? f : '')
  const watchLabel = (v?: string) => WATCH.find(([k]) => k === v)?.[1] ?? '—'

  const inList = $derived(!!m.watch_status && m.watch_status !== 'none')

  // Favorit (♥) — wird gespeichert und ist über den Favoriten-Filter ansehbar.
  let fav = $state(!!(media as any).favorite)
  function toggleFav() {
    fav = !fav
    patch({ favorite: fav ? 1 : 0 })
  }

  // --- Bearbeiten-Modal ---------------------------------------------------
  let editing = $state(false)
  // Formular-Spiegel (nur beim Öffnen befüllt)
  let fStatus = $state('none')
  let fScore = $state<number | null>(null)
  let fProgress = $state<number | null>(null)
  let fColl = $state('none')
  let fNote = $state('')
  let fLent = $state('')
  // Nur-UI Felder (werden NICHT gepatcht — keine Backend-Felder vorhanden)
  let fStart = $state('')
  let fEnd = $state('')
  let fRepeats = $state<number | null>(null)

  function openEdit() {
    fStatus = m.watch_status ?? 'none'
    fScore = m.rating ?? null
    fProgress = (m as any).progress ?? null
    fColl = m.collection ?? 'none'
    fNote = m.note ?? ''
    fLent = m.lent_to ?? ''
    editing = true
  }

  async function patch(p: Record<string, unknown>) {
    Object.assign(m, p)
    try {
      await api.patchEntry(m.id, p)
      onchange?.({ ...m })
    } catch (e) {
      console.error(e)
    }
  }

  async function saveEdit() {
    // Nur vorhandene Backend-Felder patchen
    const p: Record<string, unknown> = {
      watch_status: fStatus,
      rating: fScore,
      progress: fProgress,
      collection: fColl,
      note: fNote,
      lent_to: fColl === 'owned' ? fLent : '',
    }
    editing = false
    await patch(p)
  }

  function serviceUrl(schema: string) {
    const q = encodeURIComponent(m.title_romaji || m.title_english || m.title || '')
    return schema.replace('{q}', q).replace('{slug}', q)
  }

  // Reiter (nur „Übersicht" aktiv; Rest 🔒 bis Import)
  const TABS: { id: string; label: string; locked?: boolean }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'characters', label: 'Charaktere', locked: true },
    { id: 'staff', label: 'Mitwirkende', locked: true },
    { id: 'stats', label: 'Statistiken', locked: true },
  ]
  let tab = $state('overview')

  const alts = $derived(
    [m.title_romaji, m.title_english, m.title_native].filter((t) => t && t !== m.title) as string[],
  )
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={m.title}>
  <button class="close" onclick={onclose} aria-label="Schließen">✕</button>

  <!-- Voll-Banner -->
  <div
    class="banner"
    class:empty={!m.banner_url}
    style={m.banner_url ? `background-image:url(${m.banner_url})` : ''}
  >
    <div class="banner-fade"></div>
  </div>

  <!-- Kopfbereich (Surface-Streifen, Cover ragt in den Banner) -->
  <div class="headwrap">
    <div class="container head-grid">
      <div class="poster-col">
        <div class="cover">
          {#if m.cover_url}
            <img src={m.cover_url} alt="" />
          {:else}
            <div class="cover-ph">{m.title?.[0] ?? '?'}</div>
          {/if}
        </div>

        <div class="poster-actions">
          <button class="addbtn" onclick={openEdit}>
            {#if inList}
              <span class="dot"></span>{watchLabel(m.watch_status)}
            {:else}
              Zur Liste hinzufügen
            {/if}
          </button>
          <button
            class="fav"
            class:on={fav}
            onclick={toggleFav}
            aria-label="Favorit"
            title="Favorit"
          >♥</button>
        </div>
      </div>

      <div class="head-main">
        <h1>{m.title}</h1>
        {#if alts.length}
          <div class="alts">{alts.join(' · ')}</div>
        {/if}

        <div class="badges">
          {#if m.average_score}
            <span class="badge score"><span class="smile">☺</span> {m.average_score}%</span>
          {/if}
          {#if m.rating}
            <span class="badge mine">★ {m.rating}</span>
          {/if}
          {#if m.popularity}
            <span class="badge pop">Beliebtheit {m.popularity.toLocaleString('de-DE')}</span>
          {/if}
          {#if m.dub_de}
            <span class="badge dub">Deutscher Dub{m.dub_tier ? ` · ${m.dub_tier}` : ''}</span>
          {/if}
        </div>

        <div class="head-actions">
          <button class="edit" onclick={openEdit}>Bearbeiten</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Körper: Daten-Sidebar + Inhalt -->
  <div class="container body-grid">
    <aside class="sidebar">
      <dl class="data">
        {#if m.format}<div><dt>Format</dt><dd>{fmtFormat(m.format)}</dd></div>{/if}
        {#if m.episodes}<div><dt>Folgen</dt><dd>{m.episodes}</dd></div>{/if}
        {#if inList}<div><dt>Status</dt><dd>{watchLabel(m.watch_status)}</dd></div>{/if}
        {#if m.season_year}<div><dt>Saison</dt><dd>{m.season ? (SEASON_DE[m.season] ?? m.season) + ' ' : ''}{m.season_year}</dd></div>{/if}
        {#if m.studios?.length}<div><dt>Studios</dt><dd>{m.studios.join(', ')}</dd></div>{/if}
        {#if m.source}<div><dt>Quelle</dt><dd>{SOURCE_DE[m.source] ?? m.source}</dd></div>{/if}
        {#if m.country}<div><dt>Herkunftsland</dt><dd>{COUNTRY_DE[m.country] ?? m.country}</dd></div>{/if}
        {#if m.started_at}<div><dt>Begonnen</dt><dd>{m.started_at}</dd></div>{/if}
        {#if m.completed_at}<div><dt>Abgeschlossen</dt><dd>{m.completed_at}</dd></div>{/if}
        {#if m.rewatches}<div><dt>Wiederholt</dt><dd>{m.rewatches}×</dd></div>{/if}
        {#if m.next_airing_ep && m.next_airing_at}<div><dt>Nächste Folge</dt><dd>Ep. {m.next_airing_ep} · {new Date(m.next_airing_at * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</dd></div>{/if}
        {#if m.average_score}<div><dt>Ø Wertung</dt><dd class="score">{m.average_score}%</dd></div>{/if}
        {#if m.popularity}<div><dt>Beliebtheit</dt><dd>{m.popularity.toLocaleString('de-DE')}</dd></div>{/if}
        <div>
          <dt>Dub</dt>
          <dd>
            {#if m.dub_de}
              <span class="dubval">Deutsch{m.dub_tier ? ` (${m.dub_tier})` : ''}</span>
            {:else}
              <span class="muted">nicht erfasst</span>
            {/if}
          </dd>
        </div>
        {#if m.rating}<div><dt>Deine Wertung</dt><dd class="mine">★ {m.rating}/10</dd></div>{/if}
        {#if m.collection && m.collection !== 'none'}
          <div><dt>Sammlung</dt><dd>{COLL.find(([v]) => v === m.collection)?.[1]}</dd></div>
        {/if}
        {#if m.title_romaji}<div><dt>Romaji</dt><dd>{m.title_romaji}</dd></div>{/if}
        {#if m.title_english}<div><dt>Englisch</dt><dd>{m.title_english}</dd></div>{/if}
        {#if m.title_native}<div><dt>Nativ</dt><dd>{m.title_native}</dd></div>{/if}
      </dl>

      {#if m.genres?.length}
        <div class="side-block">
          <h4>Genres</h4>
          <div class="chips">{#each m.genres as g}<span class="chip">{g}</span>{/each}</div>
        </div>
      {/if}
      {#if m.tags?.length}
        <div class="side-block">
          <h4>Tags</h4>
          <div class="chips">{#each m.tags as t}<span class="chip">{t}</span>{/each}</div>
        </div>
      {/if}
    </aside>

    <main class="content">
      <nav class="tabs" aria-label="Reiter">
        {#each TABS as t}
          <button
            class="tab"
            class:active={tab === t.id}
            disabled={t.locked}
            title={t.locked ? 'Braucht Extra-Import' : ''}
            onclick={() => !t.locked && (tab = t.id)}
          >{t.label}{#if t.locked}<span class="lock">🔒</span>{/if}</button>
        {/each}
      </nav>

      {#if m.description}
        <section class="block">
          <p class="desc">{@html m.description}</p>
        </section>
      {/if}

      <!-- Wo schauen -->
      {#if services.length}
        <section class="block">
          <h3>Wo schauen</h3>
          <div class="btnrow">
            {#each services as s}
              <a class="svc" href={serviceUrl(s.url_schema)} target="_blank" rel="noopener">{s.name}</a>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Infoseiten -->
      {#if m.info_links && Object.keys(m.info_links).length}
        <section class="block">
          <h3>Infoseiten</h3>
          <div class="btnrow">
            {#each Object.entries(m.info_links) as [k, url]}
              <a class="svc ghost" href={url} target="_blank" rel="noopener">{LINK_LABEL[k] ?? k}</a>
            {/each}
          </div>
        </section>
      {/if}

      <!-- 🔒 Platzhalter: Status-/Score-Verteilung -->
      <section class="block">
        <h3>Status-Verteilung</h3>
        <div class="placeholder">Noch keine Community-Daten importiert.</div>
      </section>
      <section class="block">
        <h3>Wertungs-Verteilung</h3>
        <div class="placeholder">Noch keine Community-Daten importiert.</div>
      </section>

      <!-- 🔒 Platzhalter: Beziehungen / Charaktere / Mitwirkende / Empfehlungen -->
      <section class="block">
        <h3>Beziehungen</h3>
        <div class="placeholder">Noch nicht importiert.</div>
      </section>
      <section class="block">
        <h3>Charaktere</h3>
        <div class="placeholder">Noch nicht importiert.</div>
      </section>
      <section class="block">
        <h3>Empfehlungen</h3>
        <div class="placeholder">Noch nicht importiert.</div>
      </section>
    </main>
  </div>
</div>

<!-- =============================== Bearbeiten-Modal =============================== -->
{#if editing}
  <div class="modal-scrim" role="presentation" onclick={() => (editing = false)}></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Eintrag bearbeiten">
    <div class="modal-head">
      <h2>Eintrag bearbeiten</h2>
      <button class="close sm" onclick={() => (editing = false)} aria-label="Schließen">✕</button>
    </div>
    <div class="modal-title">{m.title}</div>

    <div class="modal-body">
      <div class="grid2">
        <div class="field">
          <label for="e-status">Status</label>
          <select id="e-status" bind:value={fStatus}>
            {#each WATCH as [v, l]}<option value={v}>{l}</option>{/each}
          </select>
        </div>
        <div class="field">
          <label for="e-score">Punktzahl (1–10)</label>
          <input id="e-score" type="number" min="0" max="10" step="1" placeholder="—"
            value={fScore ?? ''}
            oninput={(e) => {
              const v = e.currentTarget.value
              fScore = v === '' ? null : Math.max(0, Math.min(10, Number(v)))
            }} />
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label for="e-prog">Fortschritt {#if m.episodes}<span class="of">/ {m.episodes}</span>{/if}</label>
          <input id="e-prog" type="number" min="0" placeholder="0"
            value={fProgress ?? ''}
            oninput={(e) => {
              const v = e.currentTarget.value
              fProgress = v === '' ? null : Math.max(0, Number(v))
            }} />
        </div>
        <div class="field">
          <label for="e-reps">Wiederholungen</label>
          <input id="e-reps" type="number" min="0" placeholder="0"
            value={fRepeats ?? ''}
            oninput={(e) => {
              const v = e.currentTarget.value
              fRepeats = v === '' ? null : Math.max(0, Number(v))
            }} />
        </div>
      </div>

      <div class="field">
        <span class="fl">Sammlung</span>
        <div class="seg">
          {#each COLL as [v, l]}
            <button type="button" class:on={fColl === v} onclick={() => (fColl = v)}>{l}</button>
          {/each}
        </div>
      </div>

      {#if fColl === 'owned'}
        <div class="field">
          <label for="e-lent">Verliehen an (optional)</label>
          <input id="e-lent" placeholder="leer = im Regal" bind:value={fLent} />
        </div>
      {/if}

      <div class="grid2">
        <div class="field">
          <label for="e-start">Startdatum</label>
          <input id="e-start" type="date" bind:value={fStart} />
        </div>
        <div class="field">
          <label for="e-end">Enddatum</label>
          <input id="e-end" type="date" bind:value={fEnd} />
        </div>
      </div>

      <div class="field">
        <label for="e-note">Notiz</label>
        <textarea id="e-note" rows="3" placeholder="eigene Notiz…" bind:value={fNote}></textarea>
      </div>
    </div>

    <div class="modal-foot">
      <button class="btn ghost" onclick={() => (editing = false)}>Abbrechen</button>
      <button class="btn primary" onclick={saveEdit}>Speichern</button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 40;
    overflow-y: auto; overflow-x: hidden;
    background: var(--bg);
  }
  .close {
    position: fixed; top: 16px; right: 18px; z-index: 50;
    width: 36px; height: 36px; border-radius: 50%; border: 0; cursor: pointer;
    background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 1rem;
    backdrop-filter: blur(4px);
  }
  .close:hover { background: rgba(0, 0, 0, 0.7); }

  /* Voll-Banner */
  .banner {
    position: relative; width: 100%; height: 330px;
    background-size: cover; background-position: center 25%;
  }
  .banner.empty { background: linear-gradient(135deg, var(--accent), var(--accent-2)); }
  .banner-fade {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 40%, color-mix(in srgb, var(--surface) 55%, transparent) 100%);
  }

  .container { max-width: var(--maxw); margin: 0 auto; padding: 0 clamp(16px, 4vw, var(--pad)); }

  /* Kopf: Surface-Streifen hinter Titel + Buttons, Cover ragt hoch */
  .headwrap { background: var(--surface); box-shadow: var(--shadow-sm); }
  .head-grid {
    display: grid; grid-template-columns: 215px 1fr; gap: 30px;
    align-items: start;
  }

  .poster-col { margin-top: -180px; position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }
  .cover {
    width: 100%; aspect-ratio: 185 / 265; border-radius: var(--radius);
    overflow: hidden; background: var(--surface-2); box-shadow: var(--shadow);
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-ph { width: 100%; height: 100%; display: grid; place-items: center; font-size: 3rem; font-weight: 600; color: var(--text-muted); }

  .poster-actions { display: flex; gap: 8px; }
  .addbtn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 12px; border: 0; border-radius: var(--radius); cursor: pointer;
    background: var(--accent); color: var(--on-accent); font-weight: 600; font-size: 0.86rem;
  }
  .addbtn:hover { background: var(--accent-dim); }
  .addbtn .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--on-accent); }
  .fav {
    flex: none; width: 42px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-2); color: var(--text-muted); cursor: pointer; font-size: 1.05rem;
  }
  .fav:hover { color: var(--bad); }
  .fav.on { color: var(--bad); border-color: var(--bad); }

  .head-main { padding: 24px 0 20px; min-width: 0; }
  h1 { font-size: 1.7rem; line-height: 1.2; margin: 0 0 6px; color: var(--text-strong); font-weight: 600; }
  .alts { color: var(--text-muted); font-size: 0.86rem; margin-bottom: 14px; }

  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.78rem; font-weight: 600; padding: 4px 9px; border-radius: var(--radius);
    background: var(--surface-2); color: var(--text);
  }
  .badge.score { color: var(--good); }
  .badge.score .smile { font-size: 0.9rem; }
  .badge.mine { color: var(--gold); }
  .badge.dub { color: var(--accent); }

  .head-actions { display: flex; gap: 10px; }
  .edit {
    padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-2); color: var(--text); cursor: pointer; font-size: 0.84rem; font-weight: 600;
  }
  .edit:hover { border-color: var(--accent); color: var(--accent); }

  /* Körper */
  .body-grid {
    display: grid; grid-template-columns: 215px 1fr; gap: 30px;
    padding-top: 28px; padding-bottom: 60px;
  }
  .sidebar { display: flex; flex-direction: column; gap: 18px; }
  .data { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
  .data > div { min-width: 0; }
  .data dt { font-size: 0.7rem; color: var(--text-muted); margin: 0 0 2px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
  .data dd { margin: 0; font-size: 0.86rem; color: var(--text-strong); font-weight: 500; word-break: break-word; }
  .data dd.score { color: var(--good); }
  .data dd.mine { color: var(--gold); }
  .data .dubval { color: var(--accent); font-weight: 600; }
  .data .muted { color: var(--text-muted); font-weight: 400; }

  .side-block h4 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; margin: 0 0 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-size: 0.74rem; padding: 4px 10px; border-radius: var(--radius); background: var(--surface-2); color: var(--text); font-weight: 500; }

  /* Inhalt rechts */
  .content { min-width: 0; }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab {
    padding: 10px 14px; border: 0; background: none; cursor: pointer;
    color: var(--text-muted); font-size: 0.86rem; font-weight: 600;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .tab:hover:not(:disabled) { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab:disabled { cursor: not-allowed; opacity: 0.55; }
  .tab .lock { margin-left: 5px; font-size: 0.72rem; }

  .block { margin-bottom: 30px; }
  .block h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; margin: 0 0 12px; }
  .desc { margin: 0; color: var(--text); line-height: 1.65; font-size: 0.92rem; }

  .btnrow { display: flex; flex-wrap: wrap; gap: 8px; }
  .svc { padding: 8px 14px; border-radius: var(--radius); background: var(--accent); color: var(--on-accent); font-size: 0.82rem; font-weight: 600; }
  .svc:hover { background: var(--accent-dim); }
  .svc.ghost { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); }
  .svc.ghost:hover { border-color: var(--accent); color: var(--accent); }

  .placeholder {
    padding: 22px; border: 1px dashed var(--border); border-radius: var(--radius);
    background: var(--surface); color: var(--text-muted); font-size: 0.84rem; text-align: center;
  }

  /* ---------- Bearbeiten-Modal ---------- */
  .modal-scrim { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.6); }
  .modal {
    position: fixed; z-index: 61; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: min(520px, calc(100% - 32px)); max-height: calc(100% - 48px); overflow-y: auto;
    background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow);
    border: 1px solid var(--border);
  }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 0; }
  .modal-head h2 { margin: 0; font-size: 1.05rem; color: var(--text-strong); font-weight: 600; }
  .close.sm { position: static; width: 30px; height: 30px; background: var(--surface-2); color: var(--text-muted); backdrop-filter: none; }
  .close.sm:hover { color: var(--text); background: var(--surface-2); }
  .modal-title { padding: 2px 20px 0; color: var(--accent); font-size: 0.86rem; font-weight: 600; }
  .modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field { display: flex; flex-direction: column; min-width: 0; }
  .field label, .field .fl { font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
  .field .of { color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
  select, input, textarea {
    width: 100%; padding: 9px 11px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--surface-2); color: var(--text); font-size: 0.86rem; font-family: inherit;
  }
  select:focus, input:focus, textarea:focus { outline: none; border-color: var(--accent); }
  textarea { resize: vertical; line-height: 1.5; }
  .seg { display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .seg button { flex: 1; padding: 9px 4px; border: 0; background: var(--surface-2); color: var(--text-muted); cursor: pointer; font-size: 0.82rem; }
  .seg button:hover { color: var(--text); }
  .seg button.on { background: var(--accent); color: var(--on-accent); font-weight: 600; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }
  .btn { padding: 9px 18px; border-radius: var(--radius); border: 1px solid var(--border); cursor: pointer; font-size: 0.86rem; font-weight: 600; }
  .btn.ghost { background: var(--surface-2); color: var(--text); }
  .btn.ghost:hover { color: var(--text-strong); }
  .btn.primary { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .btn.primary:hover { background: var(--accent-dim); }

  /* ---------- Responsive ---------- */
  @media (max-width: 880px) {
    .head-grid, .body-grid { grid-template-columns: 150px 1fr; gap: 20px; }
    .poster-col { margin-top: -120px; }
    h1 { font-size: 1.4rem; }
  }
  @media (max-width: 620px) {
    .banner { height: 200px; }
    .head-grid { grid-template-columns: 110px 1fr; gap: 16px; }
    .poster-col { margin-top: -70px; min-width: 0; }
    .poster-actions { flex-direction: column; gap: 6px; }
    .poster-actions .addbtn, .poster-actions .fav { width: 100%; min-width: 0; font-size: 0.74rem; padding: 8px 4px; }
    .body-grid { grid-template-columns: 1fr; }
    .head-main { padding-top: 16px; }
    .grid2 { grid-template-columns: 1fr; }
  }
</style>
