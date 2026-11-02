<script lang="ts">
  import { aiState, refreshAi } from './ai.svelte'
  $effect(() => { if (!aiState.loaded) refreshAi() })
  import Card from './Card.svelte'
  import Cover from './Cover.svelte'
  import type { Media } from '../api'
  import { DUB_LANGS } from './i18n'

  type MediaTypeConfig = { slug: string; name: string; space: 'normal' | 'h'; media_type: string; hidden: number }

  let {
    api,
    activeType,
    hToken = null,
    onopen,
  }: {
    api: any
    activeType: MediaTypeConfig
    hToken?: string | null
    onopen: (m: Media) => void
  } = $props()

  // ── Deutsche Labels (AniList-Deutsch) ──────────────────────────────
  const STATUS_LABEL: Record<string, string> = {
    watching: 'Beobachten',
    rewatching: 'Wiederanschauen',
    completed: 'Abgeschlossen',
    paused: 'Pausiert',
    dropped: 'Fallen Gelassen',
    planning: 'Planung',
  }
  // Reihenfolge der Abschnitte bei „Alle"
  const STATUS_ORDER = ['watching', 'rewatching', 'completed', 'paused', 'dropped', 'planning']
  // „aktiv" = grüner Punkt
  const ACTIVE = new Set(['watching', 'rewatching'])

  const FORMAT_LABEL: Record<string, string> = {
    TV: 'Fernseher',
    TV_SHORT: 'TV-Kurzfilm',
    MOVIE: 'Film',
    SPECIAL: 'Spezial',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Musik',
  }
  const fmtType = (f?: string) => (f ? (FORMAT_LABEL[f] ?? f) : '–')
  const fmtScore = (r?: number) => (r ? String(r).replace('.', ',') : '')
  const fmtProgress = (m: Media) => {
    const p = m.progress ?? 0
    const e = m.episodes
    return e ? `${p}/${e}` : (p ? String(p) : '–')
  }

  // ── Zustand ────────────────────────────────────────────────────────
  let selectedList = $state<string>('all') // 'all' | status
  let viewMode = $state<'table' | 'compact' | 'cards'>('table')
  let search = $state('')
  let filters = $state({
    format: [] as string[],
    genres: [] as string[],
    yearMin: null as number | null,
    yearMax: null as number | null,
    dubLang: '',
    rating: '',
    sort: 'title',
  })
  let filtersOpen = $state(false) // nur mobil relevant: Filter einklappbar
  let ai = $state(false) // KI-/Semantik-Suche im Suchfeld

  let counts = $state<Record<string, number>>({})
  let meta = $state<any>({ formats: [], genres: [], statuses: [], year_min: null, year_max: null })

  type Section = { status: string; items: Media[] }
  let sections = $state<Section[]>([]) // bei „Alle": je Kategorie ein Abschnitt; sonst 1 Abschnitt
  // Wo schaubar (gespeicherte Treffer der Verfuegbarkeits-Pruefung) – fuer die Wunschliste: welche Titel auf welchem Dienst
  let streams = $state<Record<string, { service: string }[]>>({})
  $effect(() => {
    const ids = sections.flatMap((x) => x.items.map((i: any) => i.id)).slice(0, 500)
    if (!ids.length) return
    api.streamingMap(ids).then((r: any) => { streams = r ?? {} }).catch(() => {})
  })
  let loading = $state(false)

  // ── Zähler (unfiltert, wie AniList) ─────────────────────────────────
  function refreshCounts() {
    api
      .profileStats()
      .then((s: any) => (counts = { all: s.total ?? 0, ...(s.by_status ?? {}) }))
      .catch(() => {})
  }

  // ── Filter-Metadaten pro Config ─────────────────────────────────────
  $effect(() => {
    const mt = activeType.media_type
    const sp = activeType.space
    const tok = sp === 'h' ? hToken : null
    api
      .metaFilters({ space: sp, media_type: mt }, tok)
      .then((m: any) => (meta = m))
      .catch(() => {})
  })

  $effect(() => {
    // bei Config-Wechsel Zähler neu holen
    void activeType
    void hToken
    refreshCounts()
  })


  // ── Daten laden ─────────────────────────────────────────────────────
  function buildQuery(status: string): Record<string, unknown> {
    const q: Record<string, unknown> = { media_type: activeType.media_type, limit: 1000, sort: filters.sort }
    if (status !== 'all' && status !== 'fav') q.watch_status = status
    if (status === 'fav') q.favorite = 1
    if (filters.format.length) q.format = filters.format.join(',')
    if (filters.genres.length) q.genres = filters.genres.join(',')
    if (filters.yearMin) q.year_min = filters.yearMin
    if (filters.yearMax) q.year_max = filters.yearMax
    if (filters.dubLang) q.dub_lang = filters.dubLang
    if (filters.rating) q.rating = filters.rating
    if (!ai && search.trim()) q.q = search.trim()
    return q
  }

  async function fetchList(status: string): Promise<Media[]> {
    const q = buildQuery(status)
    const tok = activeType.space === 'h' ? hToken : null
    let d: any
    if (ai && search.trim()) {
      // KI-/Semantik-Suche GLEICHZEITIG mit den Listen-Filtern
      d = await api.aiSearch({ q: search.trim(), space: activeType.space, ...q, limit: 40 }, tok)
      return (d?.results ?? []) as Media[]
    }
    if (activeType.space === 'h') {
      if (!hToken) return []
      d = await api.h(hToken, q)
    } else {
      d = await api.anime(q)
    }
    return (d?.items ?? []) as Media[]
  }

  let reqId = 0
  async function load() {
    const my = ++reqId
    loading = true
    try {
      if (selectedList === 'all') {
        // Jede (laut Zähler) nicht-leere Kategorie als eigener Abschnitt.
        // Ohne Zähler: alle versuchen; leere Ergebnisse werden ausgeblendet.
        const wanted = STATUS_ORDER.filter((s) => (counts[s] ?? 1) > 0)
        const results = await Promise.all(wanted.map((s) => fetchList(s).then((items) => ({ status: s, items }))))
        if (my !== reqId) return
        sections = results.filter((r) => r.items.length > 0)
      } else {
        const items = await fetchList(selectedList)
        if (my !== reqId) return
        sections = [{ status: selectedList, items }]
      }
    } catch (e) {
      if (my === reqId) sections = []
      console.error('AnimeList load failed', e)
    } finally {
      if (my === reqId) loading = false
    }
  }

  let timer: any
  $effect(() => {
    // Abhängigkeiten anfassen → Reload (mit kleinem Debounce fürs Suchfeld)
    void selectedList
    void search
    void ai
    JSON.stringify(filters)
    void activeType
    void hToken
    void counts // „Alle" braucht die Zählerliste, um Kategorien zu bestimmen
    clearTimeout(timer)
    timer = setTimeout(load, 180)
  })

  // ── Filter-Helfer ───────────────────────────────────────────────────
  function toggle(arr: string[], v: string) {
    const i = arr.indexOf(v)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(v)
  }
  function resetFilters() {
    filters.format = []
    filters.genres = []
    filters.yearMin = null
    filters.yearMax = null
    filters.dubLang = ''
    filters.rating = ''
    filters.sort = 'title'
    search = ''
  }
  let filterCount = $derived(
    filters.format.length + filters.genres.length + (filters.yearMin || filters.yearMax ? 1 : 0) +
      (filters.dubLang ? 1 : 0) + (filters.rating ? 1 : 0),
  )

  const VIEW_MODES: [typeof viewMode, string, string][] = [
    ['table', '▤', 'Tabelle'],
    ['compact', '≣', 'Kompakte Zeilen'],
    ['cards', '▦', 'Karten'],
  ]
</script>

<div class="list-view">
  <!-- ── LINKE SIDEBAR ───────────────────────────────────────── -->
  <aside class="sidebar">
    <nav class="lists">
      <button class="list-item" class:on={selectedList === 'all'} onclick={() => (selectedList = 'all')}>
        <span>Alle</span><i>{counts.all ?? ''}</i>
      </button>
      {#each STATUS_ORDER as s}
        <button class="list-item" class:on={selectedList === s} onclick={() => (selectedList = s)}>
          <span>{STATUS_LABEL[s]}</span><i>{counts[s] ?? ''}</i>
        </button>
      {/each}
    </nav>

    <div class="filterbox">
      <div class="search" class:ai>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input placeholder={ai ? 'KI: Story/Thema…' : 'Filter'} bind:value={search} />
        {#if aiState.enabled}<button class="ki" class:on={ai} onclick={() => (ai = !ai)} title="KI-Suche über den Inhalt">KI</button>{/if}
        <button class="ftoggle" class:on={filtersOpen} onclick={() => (filtersOpen = !filtersOpen)} aria-label="Filter ein-/ausklappen" aria-expanded={filtersOpen}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18l-7 8v6l-4-2v-4z" /></svg>
        </button>
      </div>

      <div class="fbody" class:closed={!filtersOpen}>
      <div class="fhd">
        <span>Filter</span>
        {#if filterCount > 0 || search}<button class="reset" onclick={resetFilters}>Zurücksetzen</button>{/if}
      </div>

      {#if (meta.formats ?? []).length}
        <div class="grp">
          <span class="glabel">Format</span>
          <div class="chips">
            {#each meta.formats as f}
              <button class="chip" class:on={filters.format.includes(f)} onclick={() => toggle(filters.format, f)}>{fmtType(f)}</button>
            {/each}
          </div>
        </div>
      {/if}

      {#if (meta.genres ?? []).length}
        <div class="grp">
          <span class="glabel">Genres</span>
          <div class="chips">
            {#each meta.genres as g}
              <button class="chip" class:on={filters.genres.includes(g)} onclick={() => toggle(filters.genres, g)}>{g}</button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="grp">
        <span class="glabel">Synchro-Sprache</span>
        <div class="chips">
          {#each DUB_LANGS as [v, l]}
            <button class="chip" class:on={filters.dubLang === v} onclick={() => (filters.dubLang = filters.dubLang === v ? '' : v)}>{l}</button>
          {/each}
        </div>
      </div>

      <div class="grp">
        <span class="glabel">Punktzahl</span>
        <select bind:value={filters.rating}>
          <option value="">Alle Punkte</option>
          {#each [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as r}<option value={String(r)}>{r}</option>{/each}
        </select>
      </div>

      <div class="grp">
        <span class="glabel">Jahr</span>
        <div class="years">
          <input type="number" placeholder={String(meta.year_min ?? 'von')} bind:value={filters.yearMin} />
          <span class="dash">–</span>
          <input type="number" placeholder={String(meta.year_max ?? 'bis')} bind:value={filters.yearMax} />
        </div>
      </div>

      <div class="grp">
        <span class="glabel">Sortieren</span>
        <select bind:value={filters.sort}>
          <option value="title">Titel A–Z</option>
          <option value="score">Wertung</option>
          <option value="popularity">Beliebtheit</option>
          <option value="date_desc">Erscheinungsdatum (neueste zuerst)</option>
          <option value="date_asc">Erscheinungsdatum (älteste zuerst)</option>
          <option value="recent">Zuletzt aktualisiert</option>
        </select>
      </div>
      </div>
    </div>
  </aside>

  <!-- ── HAUPTBEREICH ────────────────────────────────────────── -->
  <section class="main">
    <div class="toolbar">
      <div class="view-toggle">
        {#each VIEW_MODES as [mode, icon, label]}
          <button class:on={viewMode === mode} title={label} aria-label={label} onclick={() => (viewMode = mode)}>{icon}</button>
        {/each}
      </div>
    </div>

    {#if loading && sections.length === 0}
      <div class="placeholder">lädt Liste…</div>
    {:else if sections.length === 0}
      <div class="placeholder">Noch keine Einträge in dieser Liste.</div>
    {:else}
      {#each sections as sec (sec.status)}
        <div class="section">
          {#if selectedList === 'all'}
            <div class="sec-head">
              <h2>{STATUS_LABEL[sec.status]}</h2>
              <span class="sec-count">{sec.items.length}</span>
            </div>
          {/if}

          {#if viewMode === 'cards'}
            <div class="cards">
              {#each sec.items as m (m.id)}
                <Card media={m} {onopen} />
              {/each}
            </div>
          {:else}
            <div class="table" class:compact={viewMode === 'compact'}>
              {#if viewMode === 'table'}
                <div class="row head">
                  <span class="c-title">Titel</span>
                  <span class="c-score">Punktzahl</span>
                  <span class="c-prog">Fortschritt</span>
                  <span class="c-type">Typ</span>
                </div>
              {/if}
              {#each sec.items as m (m.id)}
                <button class="row" onclick={() => onopen(m)}>
                  <span class="c-title">
                    {#if viewMode === 'table'}
                      <span class="cover">
                        <Cover media={m} />
                      </span>
                    {/if}
                    {#if ACTIVE.has(m.watch_status ?? '')}<span class="dot" title={STATUS_LABEL[m.watch_status ?? '']}></span>{/if}
                    <span class="tname">{m.title}</span>
                    {#each streams[m.id] ?? [] as h}<span class="svcchip">{h.service}</span>{/each}
                  </span>
                  <span class="c-score">{fmtScore(m.rating) || '–'}</span>
                  <span class="c-prog">{fmtProgress(m)}</span>
                  <span class="c-type">{fmtType(m.format)}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </section>
</div>

<style>
  .list-view {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 24px 20px 60px;
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 24px;
    align-items: start;
  }

  /* ── Sidebar ── */
  .sidebar {
    position: sticky;
    top: 70px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    /* Kategorien (oben) bleiben IMMER sichtbar; nur die Filterbox scrollt intern. */
    max-height: calc(100vh - 86px);
  }
  .lists { flex: 0 0 auto; }
  .filterbox { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .filterbox::-webkit-scrollbar { width: 8px; }
  .lists {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 14px;
    border: 0;
    background: none;
    color: var(--text);
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 500;
    text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .list-item:hover { background: var(--surface-2); }
  .list-item.on { background: var(--surface-2); color: var(--accent); font-weight: 600; }
  .list-item i { font-style: normal; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
  .list-item.on i { color: var(--accent); }

  .filterbox {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    padding: 14px 15px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0 10px;
    margin-bottom: 14px;
  }
  .search.ai { border-color: var(--accent); }
  .search svg { width: 15px; height: 15px; color: var(--text-muted); flex: 0 0 auto; }
  .search input { flex: 1; min-width: 0; border: 0; background: none; color: var(--text); padding: 8px 0; outline: none; font-size: 0.84rem; }
  .search .ki { flex: 0 0 auto; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); border-radius: var(--radius-sm); padding: 3px 8px; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
  .search .ki.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .fav-item.on { color: var(--accent); }

  .fhd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .fhd span { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; color: var(--text-muted); }
  .reset { background: none; border: 0; color: var(--text-muted); cursor: pointer; font-size: 0.74rem; padding: 0; }
  .reset:hover { color: var(--accent); }

  .grp { margin-bottom: 14px; }
  .grp:last-child { margin-bottom: 0; }
  .glabel { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: var(--text-muted); margin-bottom: 7px; }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    padding: 5px 10px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    font-size: 0.76rem;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .chip:hover { border-color: var(--accent); color: var(--accent); }
  .chip.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .chip.on:hover { color: var(--on-accent); }

  .years { display: flex; align-items: center; gap: 7px; }
  .years input { width: 100%; min-width: 0; }
  .dash { color: var(--text-muted); }
  input[type='number'], select {
    padding: 7px 9px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-size: 0.8rem;
    font-family: inherit;
  }
  input[type='number']:focus, select:focus { outline: none; border-color: var(--accent); }
  select { width: 100%; cursor: pointer; }

  /* ── Hauptbereich ── */
  .main { min-width: 0; }
  .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .view-toggle { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 3px; }
  .view-toggle button {
    width: 32px; height: 30px;
    border: 0; border-radius: var(--radius-sm);
    background: none; color: var(--text-muted);
    cursor: pointer; font-size: 1rem; line-height: 1;
    display: grid; place-items: center;
    transition: background 0.12s, color 0.12s;
  }
  .view-toggle button:hover { color: var(--text); }
  .view-toggle button.on { background: var(--accent); color: var(--on-accent); }

  .section { margin-bottom: 28px; }
  .sec-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
  .sec-head h2 { margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-strong); }
  .sec-count { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }

  /* ── Tabelle ── */
  .table { display: flex; flex-direction: column; gap: 8px; }
  .row {
    display: grid;
    grid-template-columns: 1fr 90px 100px 110px;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    padding: 8px 14px;
    color: var(--text);
    cursor: pointer;
    font: inherit;
    transition: background 0.12s, transform 0.12s;
  }
  .row:hover { background: var(--surface-2); }
  .row.head {
    background: none;
    border: 0;
    box-shadow: none;
    padding: 0 14px 4px;
    cursor: default;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    color: var(--text-muted);
  }
  .c-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .svcchip { flex: 0 0 auto; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 0.68rem; background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border); white-space: nowrap; }
  .cover {
    position: relative;
    flex: 0 0 auto;
    width: 40px;
    aspect-ratio: 185 / 265;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--surface-2);
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover .ph { width: 100%; height: 100%; display: grid; place-items: center; font-weight: 600; color: var(--text-muted); font-size: 0.9rem; }
  .dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: var(--good); box-shadow: 0 0 0 2px color-mix(in srgb, var(--good) 30%, transparent); }
  .tname {
    min-width: 0;
    font-size: 0.88rem;
    font-weight: 500;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row:hover .tname { color: var(--accent); }
  .c-score { color: var(--good); font-weight: 600; font-size: 0.86rem; text-align: center; }
  .c-prog { color: var(--text); font-size: 0.84rem; text-align: center; }
  .c-type { color: var(--text-muted); font-size: 0.82rem; text-align: center; }

  /* Kompakte Zeilen: ohne Cover, dichter, einzeilige Pillen */
  .table.compact { gap: 3px; }
  .table.compact .row {
    grid-template-columns: 1fr 70px 90px 100px;
    padding: 7px 14px;
    box-shadow: none;
    border-color: transparent;
    border-radius: var(--radius-sm);
    background: none;
  }
  .table.compact .row:nth-child(odd) { background: var(--surface); }
  .table.compact .row:hover { background: var(--surface-2); }

  /* ── Karten ── */
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 18px; }

  .placeholder { text-align: center; color: var(--text-muted); padding: 60px 0; font-size: 0.9rem; }

  .ftoggle { display: none; }
  @media (max-width: 760px) {
    .ftoggle { display: grid; place-items: center; width: 30px; height: 28px; border: 0; background: none; color: var(--text-muted); cursor: pointer; }
    .ftoggle svg { width: 17px; height: 17px; }
    .ftoggle.on { color: var(--accent); }
    .fbody.closed { display: none; }
    .list-view { grid-template-columns: 1fr; gap: 16px; }
    .sidebar { position: static; }
    .lists { flex-direction: row; flex-wrap: wrap; }
    .list-item { flex: 1 0 auto; }
    .row, .table.compact .row { grid-template-columns: 1fr 44px 58px; gap: 8px; padding: 8px 10px; }
    .row.head { font-size: 0.6rem; letter-spacing: 0; padding: 0 10px 4px; }
    .row.head .c-score, .row.head .c-prog { font-size: 0; }
    .row.head .c-score::after { content: '★'; font-size: 0.75rem; }
    .row.head .c-prog::after { content: 'Ep.'; font-size: 0.6rem; }
    .tname { white-space: normal !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .filterbox { padding: 8px 10px; }
    .fbody:not(.closed) { margin-top: 10px; }
    .c-type { display: none; }
    .row.head .c-type { display: none; }
    .cards { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
  }
</style>
