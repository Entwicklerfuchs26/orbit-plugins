<script lang="ts">
  import { api, type Media } from './api'
  import Card from './lib/Card.svelte'
  import Detail from './lib/Detail.svelte'
  import Settings from './lib/Settings.svelte'
  import MediaTypePicker from './lib/MediaTypePicker.svelte'
  import FilterPanel from './lib/FilterPanel.svelte'
  import Profile from './lib/Profile.svelte'
  import Stats from './lib/Stats.svelte'
  import Browse from './lib/Browse.svelte'
  import Home from './lib/Home.svelte'
  import AnimeList from './lib/AnimeList.svelte'
  import Favorites from './lib/Favorites.svelte'
  import { t } from './lib/i18n'
  import { hostEl } from './lib/host'

  const GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror', 'Mahou Shoujo',
    'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi',
    'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
  ]
  const LIST_TABS: [string, string][] = [
    ['all', 'Alle'], ['watching', 'Beobachten'], ['rewatching', 'Wiederanschauen'], ['completed', 'Abgeschlossen'],
    ['paused', 'Pausiert'], ['dropped', 'Fallen Gelassen'], ['planning', 'Planung'],
  ]

  type MediaTypeConfig = { slug: string; name: string; description?: string; space: 'normal' | 'h'; media_type: string; hidden: number; deletable?: number }

  let view = $state<'home' | 'browse' | 'liste' | 'fav' | 'profil' | 'stats'>('home')
  let gridView = $state<'grid' | 'list'>('grid')
  let activeType = $state<MediaTypeConfig>({ slug: 'anime', name: 'Anime', space: 'normal', media_type: 'anime', hidden: 0 })
  let q = $state('')
  let aiMode = $state(false)
  let newForMe = $state(false)
  let showFilters = $state(false)
  let listStatus = $state('all')
  let listCounts = $state<Record<string, number>>({})
  let filters = $state({ genres: [] as string[], format: [] as string[], status: [] as string[], yearMin: null as number | null, yearMax: null as number | null, dub: false, dubLang: '', seen: 'all', sort: 'popularity' })
  let meta = $state<any>({ formats: [], statuses: [], year_min: 1940, year_max: 2027 })

  let items = $state<Media[]>([])
  let total = $state(0)
  let loading = $state(false)
  let loadingMore = $state(false)
  let hasMore = $state(true)
  let offset = $state(0)
  const PAGE = 60

  let selected = $state<Media | null>(null)
  let showSettings = $state(false)
  let showPicker = $state(false)
  let services = $state<any[]>([])
  let health = $state<any>({})
  let theme = $state('light')
  let hToken = $state<string | null>(null)
  let hUnlocked = $state(false)
  let hConfigured = $state(false)

  $effect(() => { hostEl().setAttribute('data-theme', theme) })
  function setTheme(t: string) { theme = t; try { localStorage.setItem('ol-theme', t) } catch {} }

  // Akzentfarbe (AniList „Profile Color") — '' = Theme-Default (Rot)
  let accent = $state('')
  $effect(() => {
    if (accent) hostEl().style.setProperty('--accent', accent)
    else hostEl().style.removeProperty('--accent')
  })
  function setAccent(c: string) { accent = c; try { localStorage.setItem('ol-accent', c) } catch {} }

  async function load(reset = true) {
    if (view !== 'browse') return  // Home/Liste/Stats/Profil holen ihre Daten selbst
    const space = activeType.space
    if (reset) { offset = 0; loading = true }
    try {
      const off = reset ? 0 : offset
      let d: any
      // gemeinsame Filter — gelten für normale UND KI-Suche gleichzeitig
      const fp: Record<string, unknown> = { media_type: activeType.media_type }
      if (filters.genres.length) fp.genres = filters.genres.join(',')
      if (filters.format.length) fp.format = filters.format.join(',')
      if (filters.status.length) fp.status = filters.status.join(',')
      if (filters.yearMin) fp.year_min = filters.yearMin
      if (filters.yearMax) fp.year_max = filters.yearMax
      if (filters.dub) fp.dub = true
      if (filters.dubLang) fp.dub_lang = filters.dubLang
      if (filters.seen !== 'all') fp.seen = filters.seen
      if (view === 'liste') fp.watch_status = listStatus

      if (aiMode && q.trim()) {
        d = await api.aiSearch({ q, space, new_for_me: newForMe, limit: 40, ...fp }, space === 'h' ? hToken : null)
        items = d.results; total = d.results.length; hasMore = false; return
      }
      const p: Record<string, unknown> = { limit: PAGE, offset: off, sort: filters.sort, ...fp }
      if (q) p.q = q
      if (space === 'h') {
        if (!hToken) { items = []; total = 0; hasMore = false; return }
        d = await api.h(hToken, p)
      } else {
        d = await api.anime(p)
      }
      total = d.total
      items = reset ? d.items : [...items, ...d.items]
      offset = off + d.items.length
      hasMore = items.length < total
    } catch (e) {
      console.error(e); if (reset) items = []
    } finally {
      if (reset) loading = false
    }
  }

  async function loadMore() {
    if (loadingMore || loading || !hasMore || aiMode) return
    loadingMore = true; await load(false); loadingMore = false
  }
  function infinite(node: HTMLElement) {
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) loadMore() }, { rootMargin: '500px' })
    io.observe(node); return { destroy: () => io.disconnect() }
  }

  function refreshCounts() {
    api.profileStats().then((s) => (listCounts = { all: s.total, ...s.by_status })).catch(() => {})
  }

  $effect(() => {
    try { const t = localStorage.getItem('ol-theme'); if (t) theme = t } catch {}
    try { const a = localStorage.getItem('ol-accent'); if (a) accent = a } catch {}
    api.health().then((s) => (health = s)).catch(() => {})
    api.hStatus().then((s) => (hConfigured = s.configured)).catch(() => {})
    api.activeMediaType().then((t) => { if (t && t.slug) activeType = t }).catch(() => {})
    refreshCounts()
  })

  // Genres/Formate UND Dienste sind PRO CONFIG — neu laden bei Config-Wechsel (H bekommt eigene).
  $effect(() => {
    const mt = activeType.media_type, sp = activeType.space
    const tok = sp === 'h' ? hToken : null
    api.metaFilters({ space: sp, media_type: mt }, tok).then((m) => (meta = m)).catch(() => {})
    api.services(mt).then((s) => (services = s)).catch(() => {})
  })

  function selectType(cfg: MediaTypeConfig) {
    activeType = cfg
    go('browse')
    api.setActiveMediaType(cfg.slug).catch(() => {})
    showPicker = false
  }
  // Navigation + Browser-Zurück (History): Reiterwechsel/Detail legen einen History-Eintrag an.
  function go(v: typeof view) {
    if (v === view) { exploreAll = false; return }
    view = v
    try { history.pushState({ view: v }, '') } catch {}
  }
  function openDetail(m: Media) {
    selected = m
    try { history.pushState({ view, detail: m.id }, '') } catch {}
  }
  $effect(() => {
    try { history.replaceState({ view: 'home' }, '') } catch {}
    const onPop = (e: PopStateEvent) => {
      if (showPicker) { showPicker = false; return }
      if (showSettings) { showSettings = false; return }
      if (selected) { selected = null; return }
      view = (e.state && e.state.view) || 'home'
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  })
  function onUnlocked(token: string) { hToken = token; hUnlocked = true }
  function patchItem(m: Media) { items = items.map((it) => (it.id === m.id ? { ...it, ...m } : it)); refreshCounts() }

  let activeFilterCount = $derived(filters.genres.length + filters.format.length + filters.status.length + (filters.dub ? 1 : 0) + (filters.dubLang ? 1 : 0) + (filters.yearMin || filters.yearMax ? 1 : 0) + (filters.seen !== 'all' ? 1 : 0))

  // AniList-Entdecken: ohne Suche/Filter zeigt „Entdecken" die Reihen (Trending/Beliebt/…), sonst das Raster.
  let menuOpen = $state(false)
  function navTo(v: string) { menuOpen = false; go(v as any) }
  let exploreAll = $state(false)
  let showRows = $derived(view === 'browse' && !aiMode && !q.trim() && activeFilterCount === 0 && !exploreAll)
  function onViewAll(sort: string) { filters.sort = sort; exploreAll = true }
</script>

<header class="topbar">
  <div class="bar">
    <button class="brand" onclick={() => (showPicker = true)} title="Medientyp wählen">Orbit<span>list</span> <em>{activeType.name} ▾</em></button>
    <nav class="views">
      <button class:on={view === 'home'} onclick={() => go('home')}>{t.nav.home}</button>
      <button class:on={view === 'browse'} onclick={() => go('browse')}>{t.nav.browse}</button>
      <button class:on={view === 'liste'} onclick={() => go('liste')}>{t.nav.list}</button>
      <button class:on={view === 'fav'} onclick={() => go('fav')}>{t.nav.favorites}</button>
      <button class:on={view === 'profil'} onclick={() => go('profil')}>{t.nav.profile}</button>
    </nav>
    <div class="spacer"></div>
    <button onclick={() => (showSettings = true)} class="icon" title="Einstellungen" aria-label="Einstellungen">⚙</button>
  </div>

</header>

<!-- Mobil (wie AniList): Navigation nicht oben, sondern Hamburger-Button unten rechts -->
<div class="mnav">
  {#if menuOpen}
    <button class="mback" aria-label="Menü schließen" onclick={() => (menuOpen = false)}></button>
    <div class="mpanel" role="menu">
      <button class:on={view === 'home'} onclick={() => navTo('home')}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg>{t.nav.home}</button>
      <button class:on={view === 'browse'} onclick={() => navTo('browse')}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>{t.nav.browse}</button>
      <button class:on={view === 'liste'} onclick={() => navTo('liste')}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"/></svg>{t.nav.list}</button>
      <button class:on={view === 'fav'} onclick={() => navTo('fav')}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 3.6 12.9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 8.4 6.9z"/></svg>{t.nav.favorites}</button>
      <button class:on={view === 'profil'} onclick={() => navTo('profil')}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/></svg>{t.nav.profile}</button>
      <button onclick={() => { menuOpen = false; showSettings = true }}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>Einstellungen</button>
    </div>
  {:else}
    <button class="fab" onclick={() => (menuOpen = true)} aria-label="Menü öffnen">☰</button>
  {/if}
</div>

{#if view === 'home'}
  <Home {api} {activeType} {hToken} onopen={openDetail} />
{:else if view === 'liste'}
  <AnimeList {api} {activeType} {hToken} onopen={openDetail} />
{:else if view === 'fav'}
  <Favorites {api} {activeType} {hToken} onopen={openDetail} />
{:else if view === 'profil'}
  <Stats {api} />
{:else}
  <Browse {api} {activeType} {hToken} onopen={openDetail} />
{/if}

{#if selected}<Detail media={selected} {services} onclose={() => (selected = null)} onchange={patchItem} />{/if}
{#if showSettings}
  <Settings {theme} {setTheme} {accent} {setAccent} {services} activeConfig={activeType.media_type} configName={activeType.name} stats={health} {hConfigured} {onUnlocked}
    onOpenPicker={() => { showSettings = false; showPicker = true }} onclose={() => (showSettings = false)} />
{/if}
{#if showPicker}
  <MediaTypePicker {hConfigured} startUnlocked={hUnlocked} {hToken}
    onUnlockH={(t) => onUnlocked(t)}
    onpick={(t) => selectType(t)}
    onclose={() => (showPicker = false)} />
{/if}

<style>
  .topbar { position: sticky; top: 0; z-index: 20; background: var(--nav); border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); }
  .bar { max-width: var(--maxw); margin: 0 auto; display: flex; align-items: center; gap: 16px; padding: 10px 20px; }
  .brand { background: none; border: 0; color: var(--text-strong); font-weight: 800; font-size: 1.15rem; letter-spacing: -0.02em; cursor: pointer; }
  .brand span { color: var(--accent); }
  .brand em { font-style: normal; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-left: 4px; }
  .views { display: flex; gap: 2px; }
  .views button { padding: 7px 13px; border-radius: var(--radius); border: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: color 0.15s, background 0.15s; }
  .views button:hover { color: var(--text); }
  .views button.on { background: var(--surface-2); color: var(--accent); }
  .spacer { flex: 1; }
  .icon { position: relative; width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; display: grid; place-items: center; }
  .icon svg { width: 18px; height: 18px; }
  .icon i { position: absolute; top: -5px; right: -5px; background: var(--accent); color: #022; font-size: 0.64rem; font-weight: 700; border-radius: 10px; min-width: 15px; height: 15px; display: grid; place-items: center; font-style: normal; }
  .searchrow { max-width: var(--maxw); margin: 0 auto; display: flex; align-items: center; gap: 8px; padding: 0 20px 12px; }
  .search { flex: 1; display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 12px; }
  .search.ai { border-color: var(--accent); }
  .search .si { width: 16px; height: 16px; color: var(--text-muted); flex: 0 0 auto; }
  .search input { flex: 1; border: 0; background: none; color: var(--text); padding: 10px 0; outline: none; font-size: 0.9rem; }
  .aibtn { padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.82rem; white-space: nowrap; }
  .aibtn.on { background: var(--accent); color: #022; border-color: var(--accent); font-weight: 700; }
  .chip.nfm { padding: 8px 12px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.8rem; white-space: nowrap; }
  .chip.nfm.on { background: var(--accent-2); color: #fff; border-color: var(--accent-2); }
  .subtabs { max-width: var(--maxw); margin: 0 auto; display: flex; gap: 6px; padding: 0 20px 12px; overflow-x: auto; }
  .subtabs button { flex: 0 0 auto; padding: 6px 13px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.82rem; white-space: nowrap; }
  .subtabs button.on { background: var(--accent); color: #022; border-color: var(--accent); font-weight: 600; }
  .subtabs button i { font-style: normal; margin-left: 6px; font-size: 0.72rem; opacity: 0.7; font-weight: 700; }
  .wrap { max-width: var(--maxw); margin: 0 auto; padding: 18px 20px 60px; }
  .count { color: var(--text-muted); font-size: 0.82rem; margin-bottom: 14px; }
  .empty { text-align: center; color: var(--text-muted); padding: 60px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 18px; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .list :global(.card.list) { padding: 8px; border-radius: var(--radius); }
  .list :global(.card.list:hover) { background: var(--surface); }
  .sentinel { height: 1px; }
  .loadmore { text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 0.85rem; }
  .mnav { display: none; }
  @media (max-width: 768px) {
    .views, .topbar .icon { display: none; }
    .mnav { display: block; position: fixed; right: 16px; bottom: 16px; z-index: 60; }
    .fab { width: 52px; height: 52px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--accent); font-size: 1.6rem; cursor: pointer; box-shadow: var(--shadow-sm); }
    .mback { position: fixed; inset: 0; z-index: -1; background: rgba(0,0,0,.25); border: 0; cursor: default; }
    .mpanel svg { width: 30px; height: 30px; }
    .mpanel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; width: min(300px, calc(100vw - 32px)); padding: 10px; background: var(--surface); border: 0; border-radius: var(--radius); box-shadow: 0 6px 24px rgba(0,0,0,.4); }
    .mpanel button { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 4px 10px; border: 0; background: none; color: var(--text-muted); font-size: 0.78rem; font-weight: 600; cursor: pointer; border-radius: var(--radius); }
    .mpanel button b { font-size: 1.4rem; font-weight: 400; }
    .mpanel button.on { color: var(--accent); background: var(--surface-2); }
    .bar { flex-wrap: wrap; gap: 10px; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; }
  }
</style>
