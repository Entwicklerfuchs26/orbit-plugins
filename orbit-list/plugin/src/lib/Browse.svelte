<script lang="ts">
  import { aiState, refreshAi } from './ai.svelte'
  $effect(() => { if (!aiState.loaded) refreshAi() })
  import Card from './Card.svelte'
  import type { Media } from '../api'
  import { DUB_LANGS } from './i18n'

  // Props: spec = { api, activeType, hToken, onopen }.
  // App.svelte reicht aktuell mediaType/space/onViewAll einzeln durch (App NICHT editierbar),
  // darum beide Formen akzeptieren und daraus ableiten — Build bleibt sauber.
  let {
    api,
    onopen,
    activeType = undefined,
    mediaType = undefined,
    space = undefined,
    hToken = null,
    onViewAll = undefined,
  }: {
    api: any
    onopen: (m: Media) => void
    activeType?: { slug: string; name: string; space: 'normal' | 'h'; media_type: string; hidden?: number }
    mediaType?: string
    space?: 'normal' | 'h'
    hToken?: string | null
    onViewAll?: (sort: string) => void
  } = $props()

  const mt = $derived(activeType?.media_type ?? mediaType ?? 'anime')
  const sp = $derived((activeType?.space ?? space ?? 'normal') as 'normal' | 'h')

  // ---- deutsche Labels -------------------------------------------------
  const FORMAT_DE: Record<string, string> = {
    TV: 'Fernseher',
    TV_SHORT: 'TV-Kurzfilm',
    MOVIE: 'Film',
    SPECIAL: 'Spezial',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Musik',
  }
  const fmtLabel = (k: string) => FORMAT_DE[k] ?? k

  const SORTS: { key: string; label: string }[] = [
    { key: 'popularity', label: 'Beliebtheit' },
    { key: 'score', label: 'Wertung' },
    { key: 'date_desc', label: 'Erscheinungsdatum (neueste zuerst)' },
    { key: 'date_asc', label: 'Erscheinungsdatum (älteste zuerst)' },
    { key: 'title', label: 'Titel' },
    { key: 'recent', label: 'Zuletzt hinzugefügt' },
  ]
  const sortLabel = (k: string) => SORTS.find((s) => s.key === k)?.label ?? k

  // ---- Entdecken-Reihen ------------------------------------------------
  type Row = { key: string; title: string; sort: string; limit: number; items: Media[] }
  const DEFS: { key: string; title: string; sort: string; limit: number }[] = [
    { key: 'trending', title: 'Trending Now', sort: 'popularity', limit: 6 },
    { key: 'popular', title: 'Beliebt', sort: 'score', limit: 6 },
    { key: 'recent', title: 'Zuletzt hinzugefügt', sort: 'recent', limit: 6 },
    { key: 'top', title: 'Top 100', sort: 'score', limit: 24 },
  ]
  let rows = $state<Row[]>([])
  let rowsLoading = $state(false)

  // ---- Filter-Metadaten (Genres/Formate/Jahre pro Config) --------------
  let meta = $state<{ genres: string[]; tags: string[]; formats: string[]; year_min: number; year_max: number }>({
    genres: [],
    tags: [],
    formats: [],
    year_min: 1960,
    year_max: new Date().getFullYear() + 1,
  })

  // ---- Filterzustand ---------------------------------------------------
  let search = $state('')
  let ai = $state(false) // KI-/Semantik-Suche
  let selGenres = $state<string[]>([])
  let selTags = $state<string[]>([])
  let selSeason = $state('')
  let selYear = $state('')
  let selFormat = $state('')
  let selDubLang = $state('')
  let selSeen = $state('')
  let selSort = $state('popularity')
  let forceGrid = $state(false)
  let openDrop = $state('')

  const SEENS: { key: string; label: string }[] = [
    { key: '', label: 'Alle' }, { key: 'yes', label: 'Gesehen' }, { key: 'no', label: 'Nicht gesehen' },
  ]
  const seenLabel = (k: string) => SEENS.find((s) => s.key === k)?.label ?? 'Alle'

  const active = $derived(
    !!(search.trim() || selGenres.length || selTags.length || selSeason || selYear || selFormat || selDubLang || selSeen || forceGrid),
  )

  const years = $derived.by(() => {
    const out: number[] = []
    for (let y = meta.year_max; y >= meta.year_min; y--) out.push(y)
    return out
  })

  // ---- Datenschicht ----------------------------------------------------
  async function fetchList(q: Record<string, unknown>): Promise<{ total: number; items: Media[] }> {
    const base = { media_type: mt, ...q }
    if (sp === 'h') {
      if (!hToken) return { total: 0, items: [] }
      const d = await api.h(hToken, base)
      return { total: d?.total ?? 0, items: d?.items ?? [] }
    }
    const d = await api.anime(base)
    return { total: d?.total ?? 0, items: d?.items ?? [] }
  }

  async function loadMeta() {
    try {
      const m = await api.metaFilters({ space: sp, media_type: mt }, hToken)
      meta = {
        genres: m?.genres ?? [],
        tags: m?.tags ?? [],
        formats: m?.formats ?? [],
        year_min: m?.year_min ?? 1960,
        year_max: m?.year_max ?? new Date().getFullYear() + 1,
      }
    } catch (e) {
      console.error('Browse metaFilters failed:', e)
    }
  }

  async function loadRows() {
    rowsLoading = true
    try {
      const results = await Promise.all(
        DEFS.map(async (def) => {
          try {
            const { items } = await fetchList({ sort: def.sort, limit: def.limit })
            if (!items.length) return null
            return { ...def, items } as Row
          } catch (e) {
            console.error('Browse row failed:', def.key, e)
            return null
          }
        }),
      )
      rows = results.filter((r): r is Row => r !== null)
    } finally {
      rowsLoading = false
    }
  }

  // ---- Ergebnis-Raster -------------------------------------------------
  let gridItems = $state<Media[]>([])
  let gridTotal = $state(0)
  let gridLoading = $state(false)
  let gridReq = 0

  const PAGE = 60
  let gridMore = $state(false) // weitere Seite wird nachgeladen
  let sentinel = $state<HTMLElement>()

  function gridQuery(): Record<string, unknown> {
    const q: Record<string, unknown> = { sort: selSort, limit: PAGE }
    if (selGenres.length) q.genres = selGenres.join(',')
    if (selTags.length) q.tags = selTags.join(',')
    if (selSeason) q.season = selSeason
    if (selYear) {
      q.year_min = selYear
      q.year_max = selYear
    }
    if (selFormat) q.format = selFormat
    if (selDubLang) q.dub_lang = selDubLang
    if (selSeen) q.seen = selSeen
    if (search.trim()) q.q = search.trim()
    return q
  }

  /** Naechste Seite anhaengen (Endlos-Scrollen / „Mehr laden"). Die KI-Suche liefert nur die besten Treffer, ohne Seiten. */
  async function loadMore() {
    if (gridMore || gridLoading || (ai && search.trim()) || gridItems.length >= gridTotal) return
    const req = gridReq
    gridMore = true
    try {
      const { items } = await fetchList({ ...gridQuery(), offset: gridItems.length })
      if (req !== gridReq) return
      const have = new Set(gridItems.map((m) => m.id))
      const fresh = items.filter((m) => !have.has(m.id))
      if (!fresh.length) gridTotal = gridItems.length // nichts Neues: Ende erreicht
      gridItems = [...gridItems, ...fresh]
    } catch (e) {
      console.error('Browse mehr laden fehlgeschlagen:', e)
    } finally {
      gridMore = false
    }
  }

  // Sentinel am Ende des Rasters: kommt es in die Naehe des Sichtbereichs, wird nachgeladen
  $effect(() => {
    const el = sentinel
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) loadMore() }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  })

  async function loadGrid() {
    const req = ++gridReq
    gridLoading = true
    try {
      const q: Record<string, unknown> = { sort: selSort, limit: 60 }
      if (selGenres.length) q.genres = selGenres.join(',')
      if (selTags.length) q.tags = selTags.join(',')
      if (selSeason) q.season = selSeason
      if (selYear) {
        q.year_min = selYear
        q.year_max = selYear
      }
      if (selFormat) q.format = selFormat
      if (selDubLang) q.dub_lang = selDubLang
      if (selSeen) q.seen = selSeen
      let total: number, items: Media[]
      if (ai && search.trim()) {
        // KI-Suche GLEICHZEITIG mit den Filtern
        const tok = sp === 'h' ? hToken : null
        const d = await api.aiSearch({ q: search.trim(), space: sp, media_type: mt, ...q, limit: 40 }, tok)
        items = (d?.results ?? []) as Media[]
        total = items.length
      } else {
        if (search.trim()) q.q = search.trim()
        ;({ total, items } = await fetchList(q))
      }
      if (req !== gridReq) return
      gridItems = items
      gridTotal = total
    } catch (e) {
      if (req !== gridReq) return
      console.error('Browse grid failed:', e)
      gridItems = []
      gridTotal = 0
    } finally {
      if (req === gridReq) gridLoading = false
    }
  }

  // ---- Effekte ---------------------------------------------------------
  $effect(() => {
    // Config-Wechsel → Reihen + Meta neu laden, Filter zurücksetzen
    void mt
    void sp
    void hToken
    search = ''
    ai = false
    selGenres = []
    selTags = []
    selSeason = ''
    selYear = ''
    selFormat = ''
    selDubLang = ''
    selSeen = ''
    selSort = 'popularity'
    forceGrid = false
    loadMeta()
    loadRows()
  })

  $effect(() => {
    // Reagiert auf jede Filteränderung
    void search
    void ai
    void selGenres
    void selTags
    void selSeason
    void selYear
    void selFormat
    void selDubLang
    void selSeen
    void selSort
    void forceGrid
    void mt
    void sp
    if (active) loadGrid()
  })

  // ---- Aktionen --------------------------------------------------------
  function toggleTag(t: string) {
    selTags = selTags.includes(t) ? selTags.filter((x) => x !== t) : [...selTags, t]
  }
  const SEASONS: [string, string][] = [['WINTER', 'Winter'], ['SPRING', 'Frühling'], ['SUMMER', 'Sommer'], ['FALL', 'Herbst']]

  function toggleGenre(g: string) {
    selGenres = selGenres.includes(g) ? selGenres.filter((x) => x !== g) : [...selGenres, g]
  }

  function viewAll(sort: string) {
    if (onViewAll) {
      onViewAll(sort)
    } else {
      selSort = sort
      forceGrid = true
    }
  }

  function clearAll() {
    search = ''
    ai = false
    selGenres = []
    selTags = []
    selSeason = ''
    selYear = ''
    selFormat = ''
    selDubLang = ''
    selSeen = ''
    selSort = 'popularity'
    forceGrid = false
    openDrop = ''
  }

  function toggle(id: string, e: Event) {
    e.stopPropagation()
    openDrop = openDrop === id ? '' : id
  }
  function stop(e: Event) {
    e.stopPropagation()
  }
</script>

<svelte:window onclick={() => (openDrop = '')} />

<div class="browse">
  <!-- Horizontale Filterleiste -->
  <div class="filterbar">
    <div class="field search">
      <label for="browse-search">Suche</label>
      <div class="searchbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input id="browse-search" type="text" placeholder={ai ? 'KI: Story/Thema…' : 'Titel suchen…'} bind:value={search} onclick={stop} />
        {#if aiState.enabled}<button class="ki" class:on={ai} onclick={(e) => { stop(e); ai = !ai }} title="KI-Suche über den Inhalt">KI</button>{/if}
      </div>
    </div>

    <!-- Genres (Mehrfachauswahl) -->
    <div class="field">
      <span class="lbl">Genres &amp; Tags</span>
      <button class="drop" class:filled={selGenres.length || selTags.length} onclick={(e) => toggle('genres', e)}>
        <span class="val">{selGenres.length || selTags.length ? [...selGenres, ...selTags].join(', ') : 'Alle'}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'genres'}
        <div class="panel scroll">
          {#if !meta.genres.length}
            <div class="panel-empty">Keine Genres</div>
          {:else}
            {#each meta.genres as g}
              <button class="opt" class:sel={selGenres.includes(g)} onclick={(e) => { stop(e); toggleGenre(g) }}>
                <span class="tick">{selGenres.includes(g) ? '✓' : ''}</span>{g}
              </button>
            {/each}
            {#if meta.tags.length}
              <div class="panel-empty">Tags</div>
              {#each meta.tags as t}
                <button class="opt" class:sel={selTags.includes(t)} onclick={(e) => { stop(e); toggleTag(t) }}>
                  <span class="tick">{selTags.includes(t) ? '✓' : ''}</span>{t}
                </button>
              {/each}
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Jahr -->
    <div class="field narrow">
      <span class="lbl">Jahr</span>
      <button class="drop" class:filled={selYear} onclick={(e) => toggle('year', e)}>
        <span class="val">{selYear || 'Alle'}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'year'}
        <div class="panel scroll">
          <button class="opt" class:sel={!selYear} onclick={() => { selYear = ''; openDrop = '' }}>
            <span class="tick">{!selYear ? '✓' : ''}</span>Alle
          </button>
          {#each years as y}
            <button class="opt" class:sel={selYear === String(y)} onclick={() => { selYear = String(y); openDrop = '' }}>
              <span class="tick">{selYear === String(y) ? '✓' : ''}</span>{y}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Saison -->
    <div class="field narrow">
      <span class="lbl">Saison</span>
      <button class="drop" class:filled={selSeason} onclick={(e) => toggle('season', e)}>
        <span class="val">{selSeason ? SEASONS.find(([k]) => k === selSeason)?.[1] : 'Alle'}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'season'}
        <div class="panel">
          <button class="opt" class:sel={!selSeason} onclick={() => { selSeason = ''; openDrop = '' }}>
            <span class="tick">{!selSeason ? '✓' : ''}</span>Alle
          </button>
          {#each SEASONS as [k, l]}
            <button class="opt" class:sel={selSeason === k} onclick={() => { selSeason = k; openDrop = '' }}>
              <span class="tick">{selSeason === k ? '✓' : ''}</span>{l}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Format -->
    <div class="field narrow">
      <span class="lbl">Format</span>
      <button class="drop" class:filled={selFormat} onclick={(e) => toggle('format', e)}>
        <span class="val">{selFormat ? fmtLabel(selFormat) : 'Alle'}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'format'}
        <div class="panel">
          <button class="opt" class:sel={!selFormat} onclick={() => { selFormat = ''; openDrop = '' }}>
            <span class="tick">{!selFormat ? '✓' : ''}</span>Alle
          </button>
          {#each meta.formats as f}
            <button class="opt" class:sel={selFormat === f} onclick={() => { selFormat = f; openDrop = '' }}>
              <span class="tick">{selFormat === f ? '✓' : ''}</span>{fmtLabel(f)}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Synchro-Sprache -->
    <div class="field narrow">
      <span class="lbl">Synchro-Sprache</span>
      <button class="drop" class:filled={selDubLang} onclick={(e) => toggle('dublang', e)}>
        <span class="val">{selDubLang ? (DUB_LANGS.find(([v]) => v === selDubLang)?.[1] ?? selDubLang) : 'Alle'}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'dublang'}
        <div class="panel scroll">
          <button class="opt" class:sel={!selDubLang} onclick={() => { selDubLang = ''; openDrop = '' }}>
            <span class="tick">{!selDubLang ? '✓' : ''}</span>Alle
          </button>
          {#each DUB_LANGS as [v, l]}
            <button class="opt" class:sel={selDubLang === v} onclick={() => { selDubLang = v; openDrop = '' }}>
              <span class="tick">{selDubLang === v ? '✓' : ''}</span>{l}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Gesehen / Nicht gesehen -->
    <div class="field narrow">
      <span class="lbl">Gesehen</span>
      <button class="drop" class:filled={selSeen} onclick={(e) => toggle('seen', e)}>
        <span class="val">{seenLabel(selSeen)}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'seen'}
        <div class="panel">
          {#each SEENS as s}
            <button class="opt" class:sel={selSeen === s.key} onclick={() => { selSeen = s.key; openDrop = '' }}>
              <span class="tick">{selSeen === s.key ? '✓' : ''}</span>{s.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Airing-Status (noch keine Daten) -->
    <div class="field narrow">
      <span class="lbl">Airing-Status</span>
      <button class="drop disabled" disabled title="Noch keine Daten importiert">
        <span class="val">🔒 Alle</span>
        <i class="arr">▾</i>
      </button>
    </div>

    <!-- Sortierung -->
    <div class="field narrow">
      <span class="lbl">Sortierung</span>
      <button class="drop" class:filled={selSort !== 'popularity'} onclick={(e) => toggle('sort', e)}>
        <span class="val">{sortLabel(selSort)}</span>
        <i class="arr">▾</i>
      </button>
      {#if openDrop === 'sort'}
        <div class="panel">
          {#each SORTS as s}
            <button class="opt" class:sel={selSort === s.key} onclick={() => { selSort = s.key; openDrop = '' }}>
              <span class="tick">{selSort === s.key ? '✓' : ''}</span>{s.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if active}
    <!-- Ergebnis-Raster -->
    <section class="result">
      <div class="result-head">
        <h2>Ergebnisse{#if !gridLoading} · {gridTotal}{/if}</h2>
        <button class="all" onclick={clearAll}>Filter zurücksetzen</button>
      </div>
      {#if gridLoading && gridItems.length === 0}
        <div class="state">lädt…</div>
      {:else if gridItems.length === 0}
        <div class="state">Nichts gefunden.</div>
      {:else}
        <div class="grid">
          {#each gridItems as media (media.id)}
            <Card {media} {onopen} />
          {/each}
        </div>
        {#if gridItems.length < gridTotal && !(ai && search.trim())}
          <div class="more" bind:this={sentinel}>
            <button class="all" onclick={loadMore} disabled={gridMore}>{gridMore ? 'lädt …' : `Mehr laden (${gridItems.length} von ${gridTotal})`}</button>
          </div>
        {/if}
      {/if}
    </section>
  {:else}
    <!-- Entdecken-Reihen (6-spaltiges Raster) -->
    {#if rowsLoading && rows.length === 0}
      <div class="state">lädt…</div>
    {:else if rows.length === 0}
      <div class="state">Noch nichts zu entdecken — importiere Titel über die Einstellungen.</div>
    {:else}
      {#each rows as row (row.key)}
        <section class="row">
          <div class="head">
            <h2>{row.title}</h2>
            <button class="all" onclick={() => viewAll(row.sort)}>Alle ansehen</button>
          </div>
          <div class="grid">
            {#each row.items as media (media.id)}
              <Card {media} {onopen} />
            {/each}
          </div>
        </section>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .more { display: flex; justify-content: center; padding: 18px 0 8px; }
  .browse {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 24px var(--pad) 48px;
    display: flex;
    flex-direction: column;
    gap: 34px;
  }

  /* ---- Filterleiste ---- */
  .filterbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 14px;
  }
  .field {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 130px;
  }
  .field.narrow { min-width: 110px; }
  .field.search { flex: 1 1 220px; min-width: 180px; }
  .field label,
  .lbl {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    padding-left: 2px;
  }

  .searchbox {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0 10px;
    height: 38px;
    transition: border-color 0.15s ease;
  }
  .searchbox:focus-within { border-color: var(--accent); }
  .searchbox svg { width: 16px; height: 16px; color: var(--text-muted); flex: 0 0 auto; }
  .searchbox input {
    border: 0;
    background: none;
    outline: none;
    color: var(--text-strong);
    font-family: inherit;
    font-size: 0.86rem;
    width: 100%;
  }
  .searchbox input::placeholder { color: var(--text-muted); }
  .searchbox .ki { flex: 0 0 auto; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); border-radius: var(--radius-sm); padding: 3px 9px; font-size: 0.74rem; font-weight: 700; cursor: pointer; }
  .searchbox .ki.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }

  .drop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 38px;
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0 10px;
    color: var(--text);
    font-size: 0.86rem;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .drop:hover:not(.disabled) { border-color: var(--accent); }
  .drop.filled { color: var(--text-strong); border-color: var(--accent); }
  .drop .val {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .drop .arr { font-style: normal; font-size: 0.7rem; color: var(--text-muted); flex: 0 0 auto; }
  .drop.disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 100%;
    max-width: 260px;
    z-index: 30;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .panel.scroll { max-height: 280px; overflow-y: auto; }
  .panel-empty { padding: 8px 10px; font-size: 0.8rem; color: var(--text-muted); }
  .opt {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    color: var(--text);
    font-size: 0.84rem;
    text-align: left;
    padding: 7px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .opt:hover { background: var(--surface-2); }
  .opt.sel { color: var(--accent); font-weight: 600; }
  .opt .tick { width: 12px; flex: 0 0 auto; color: var(--accent); font-size: 0.78rem; }

  /* ---- Reihen / Raster ---- */
  .row,
  .result { display: flex; flex-direction: column; gap: 14px; }
  .head,
  .result-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .head h2,
  .result-head h2 {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-strong);
  }
  .all {
    border: 0;
    background: none;
    color: var(--text-muted);
    font-size: 0.78rem;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s ease;
  }
  .all:hover { color: var(--accent); }

  .grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 20px 22px;
  }

  .state {
    padding: 48px 0;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  @media (max-width: 980px) {
    .browse { padding: 20px 24px 40px; }
    .grid { grid-template-columns: repeat(4, 1fr); }
  }
  @media (max-width: 640px) {
    .grid { grid-template-columns: repeat(3, 1fr); gap: 16px 14px; }
    .field.search { flex-basis: 100%; }
  }
</style>
