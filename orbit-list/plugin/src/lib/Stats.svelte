<script lang="ts">
  import { api as defaultApi } from '../api'

  let { api = defaultApi }: { api?: typeof defaultApi } = $props()

  type Page = 'overview' | 'genres' | 'tags' | 'studios'
  let page = $state<Page>('overview')
  let stats = $state<any>(null)
  let uname = $state('')
  api.anilistUsername().then((d) => { if (d?.username) uname = d.username }).catch(() => {})
  let dist = $state<any>(null)
  let genres = $state<any[]>([])
  let tags = $state<any[]>([])
  let studios = $state<any[]>([])
  let scoreMode = $state<'count' | 'hours'>('count')
  let rankBy = $state<'count' | 'mean_score' | 'hours'>('count')

  $effect(() => { api.profileStats().then((s) => (stats = s)).catch(() => {}) })
  $effect(() => { api.statsDistributions().then((d) => (dist = d)).catch(() => {}) })
  $effect(() => {
    if (page === 'genres' && !genres.length) api.statsGenres().then((d) => (genres = d.items)).catch(() => {})
    if (page === 'studios' && !studios.length) api.statsStudios().then((d) => (studios = d.items)).catch(() => {})
    if (page === 'tags' && !tags.length) api.statsTags().then((d) => (tags = d.items)).catch(() => {})
  })

  // Sidebar: aktive Punkte + deaktivierte 🔒 (brauchen zusätzlichen Sync)
  const SIDE: { id: Page; label: string }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'genres', label: 'Genres' },
    { id: 'tags', label: 'Tags' },
    { id: 'studios', label: 'Studios' },
  ]
  const SIDE_LOCKED = ['Voice Actors', 'Staff']
  const RANK: [typeof rankBy, string][] = [['count', 'Anzahl'], ['mean_score', 'Ø Wertung'], ['hours', 'Stunden']]

  const FORMAT: Record<string, string> = {
    TV: 'Fernseher', TV_SHORT: 'TV-Kurzfilm', MOVIE: 'Film', SPECIAL: 'Spezial',
    OVA: 'OVA', ONA: 'ONA', MUSIC: 'Musik',
  }
  const STATUS: Record<string, string> = {
    watching: 'Beobachten', rewatching: 'Wiederanschauen', completed: 'Abgeschlossen',
    paused: 'Pausiert', dropped: 'Fallen Gelassen', planning: 'Planung',
  }

  const nf = new Intl.NumberFormat('de-DE')
  const num = (n: number) => nf.format(n)

  // ── Score-Chart ──────────────────────────────────────────────
  let scoreData = $derived.by(() => {
    const src = scoreMode === 'count' ? (stats?.score_dist ?? {}) : (stats?.hours_by_score ?? {})
    return Array.from({ length: 10 }, (_, i) => ({ s: i + 1, v: src[String(i + 1)] ?? 0 }))
  })
  let maxScore = $derived(Math.max(1, ...scoreData.map((d) => d.v)))

  // ── Folgen-Umfang ────────────────────────────────────────────
  let epi = $derived(Object.entries(stats?.episode_dist ?? {}) as [string, number][])
  let maxEpi = $derived(Math.max(1, ...epi.map(([, v]) => v)))

  // ── Donut-Helfer ─────────────────────────────────────────────
  // Akzent-getriebene Schattierungen (bleiben theme-aware über Tokens)
  const SHADES = [85, 68, 52, 38, 26, 16]
  function shade(i: number): string {
    const p = SHADES[i % SHADES.length]
    return `color-mix(in srgb, var(--accent) ${p}%, var(--surface-2))`
  }
  type Seg = { label: string; count: number; pct: number; color: string; dash: number; offset: number }
  function toDonut(raw: any[], labelMap?: Record<string, string>): Seg[] {
    const items = (raw ?? [])
      .map((r) => ({ key: String(r.key), count: Number(r.count) || 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
    const total = items.reduce((s, r) => s + r.count, 0) || 1
    const C = 100 // Umfang in SVG-Einheiten (r so gewählt)
    let acc = 0
    return items.map((r, i) => {
      const pct = (r.count / total) * 100
      const dash = (r.count / total) * C
      const seg: Seg = {
        label: labelMap?.[r.key] ?? r.key,
        count: r.count,
        pct,
        color: shade(i),
        dash,
        offset: -acc,
      }
      acc += dash
      return seg
    })
  }
  let statusDonut = $derived(toDonut(dist?.by_status, STATUS))
  let formatDonut = $derived(toDonut(dist?.by_format, FORMAT))

  // ── Release-Year-Linie ───────────────────────────────────────
  let years = $derived.by(() => {
    const raw = (dist?.by_year ?? [])
      .map((r: any) => ({ year: Number(r.key), count: Number(r.count) || 0 }))
      .filter((r: { year: number }) => Number.isFinite(r.year))
      .sort((a: any, b: any) => a.year - b.year)
    return raw as { year: number; count: number }[]
  })
  const LW = 600, LH = 160, LPX = 8, LPY = 14
  let yearMax = $derived(Math.max(1, ...years.map((y) => y.count)))
  let yearPts = $derived.by(() => {
    const n = years.length
    if (!n) return [] as { x: number; y: number; year: number; count: number }[]
    return years.map((y, i) => ({
      x: LPX + (n === 1 ? (LW - 2 * LPX) / 2 : (i / (n - 1)) * (LW - 2 * LPX)),
      y: LH - LPY - (y.count / yearMax) * (LH - 2 * LPY),
      year: y.year,
      count: y.count,
    }))
  })
  let yearLine = $derived(yearPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
  let yearArea = $derived(
    yearPts.length
      ? `${yearPts[0].x.toFixed(1)},${(LH - LPY).toFixed(1)} ${yearLine} ${yearPts[yearPts.length - 1].x.toFixed(1)},${(LH - LPY).toFixed(1)}`
      : '',
  )

  // ── Genres / Tags Karten-Grid ────────────────────────────────
  function ranked(list: any[]) {
    return [...list].sort((a, b) => (b[rankBy] ?? 0) - (a[rankBy] ?? 0))
  }
  const rankLabel = (x: any, k: typeof rankBy) =>
    k === 'mean_score'
      ? (x.mean_score != null ? num(x.mean_score) : '–')
      : k === 'hours'
        ? num(x.hours ?? 0) + ' Std'
        : num(x.count ?? 0)
</script>

{#if stats}
  <div class="profile-head">
    <div class="pavatar">EF</div>
    <div class="pmeta">
      <h1>{uname || 'Mein Profil'}</h1>
      <p>{stats.total} Titel in der Liste</p>
    </div>
  </div>
{/if}

<div class="stats">
  <aside class="side">
    <div class="side-head">Anime-Statistik</div>
    {#each SIDE as { id, label }}
      <button class:on={page === id} onclick={() => (page = id)}>{label}</button>
    {/each}
    {#each SIDE_LOCKED as label}
      <button class="locked" disabled title="Braucht zusätzlichen Sync">
        <span>{label}</span><span class="lock">🔒</span>
      </button>
    {/each}
  </aside>

  <section class="content">
    {#if !stats}
      <div class="loading">lädt Statistik…</div>

    <!-- ══════════════ ÜBERSICHT ══════════════ -->
    {:else if page === 'overview'}
      <div class="tiles">
        <div class="tile"><span class="n">{num(stats.total)}</span><span class="l">Titel gesamt</span></div>
        <div class="tile"><span class="n">{num(stats.episodes)}</span><span class="l">Folgen gesehen</span></div>
        <div class="tile"><span class="n">{num(stats.days_watched)}</span><span class="l">Tage geschaut</span></div>
        <div class="tile"><span class="n">{num(stats.days_planned)}</span><span class="l">Tage geplant</span></div>
        <div class="tile"><span class="n">{stats.mean_score != null ? num(stats.mean_score) : '–'}</span><span class="l">Ø Wertung</span></div>
        <div class="tile"><span class="n">{stats.std_dev != null ? num(stats.std_dev) : '–'}</span><span class="l">Std-Abweichung</span></div>
      </div>

      <!-- Wertungs-Säulen -->
      <section class="block">
        <div class="bhead">
          <h2>Wertungen</h2>
          <div class="toggle">
            <button class:on={scoreMode === 'count'} onclick={() => (scoreMode = 'count')}>Titel</button>
            <button class:on={scoreMode === 'hours'} onclick={() => (scoreMode = 'hours')}>Stunden</button>
          </div>
        </div>
        <div class="chart">
          {#each scoreData as d}
            <div class="col">
              <div class="colbar" style="height:{(d.v / maxScore) * 100}%" title="{d.s}: {num(d.v)}"></div>
              <span>{d.s}</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Folgen-Umfang -->
      <section class="block">
        <h2>Folgen-Umfang</h2>
        {#if epi.length === 0}
          <div class="empty inline">Noch keine Daten.</div>
        {:else}
          <div class="bars">
            {#each epi as [label, v]}
              <div class="bar">
                <span class="bl">{label}</span>
                <div class="track"><div class="fill" style="width:{(v / maxEpi) * 100}%"></div></div>
                <span class="bc">{num(v)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Donuts: Status + Format -->
      <div class="duo">
        <section class="block">
          <h2>Status-Verteilung</h2>
          {#if statusDonut.length === 0}
            <div class="empty inline">Noch keine Daten.</div>
          {:else}
            <div class="donut-wrap">
              <svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Status-Verteilung">
                <circle class="donut-bg" cx="21" cy="21" r="15.915" />
                {#each statusDonut as s}
                  <circle
                    class="donut-seg"
                    cx="21" cy="21" r="15.915"
                    style="stroke:{s.color}"
                    stroke-dasharray="{s.dash} {100 - s.dash}"
                    stroke-dashoffset={s.offset}
                  >
                    <title>{s.label}: {num(s.count)} ({num(Math.round(s.pct * 10) / 10)}%)</title>
                  </circle>
                {/each}
              </svg>
              <ul class="legend">
                {#each statusDonut as s}
                  <li>
                    <span class="dot" style="background:{s.color}"></span>
                    <span class="lg-label">{s.label}</span>
                    <span class="lg-pct">{num(Math.round(s.pct * 10) / 10)}%</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </section>

        <section class="block">
          <h2>Format-Verteilung</h2>
          {#if formatDonut.length === 0}
            <div class="empty inline">Noch keine Daten.</div>
          {:else}
            <div class="donut-wrap">
              <svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Format-Verteilung">
                <circle class="donut-bg" cx="21" cy="21" r="15.915" />
                {#each formatDonut as s}
                  <circle
                    class="donut-seg"
                    cx="21" cy="21" r="15.915"
                    style="stroke:{s.color}"
                    stroke-dasharray="{s.dash} {100 - s.dash}"
                    stroke-dashoffset={s.offset}
                  >
                    <title>{s.label}: {num(s.count)} ({num(Math.round(s.pct * 10) / 10)}%)</title>
                  </circle>
                {/each}
              </svg>
              <ul class="legend">
                {#each formatDonut as s}
                  <li>
                    <span class="dot" style="background:{s.color}"></span>
                    <span class="lg-label">{s.label}</span>
                    <span class="lg-pct">{num(Math.round(s.pct * 10) / 10)}%</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </section>
      </div>

      <!-- Release-Year-Linie -->
      <section class="block">
        <h2>Erscheinungsjahre</h2>
        {#if years.length === 0}
          <div class="empty inline">Noch keine Daten.</div>
        {:else}
          <div class="line-wrap">
            <svg viewBox="0 0 {LW} {LH}" preserveAspectRatio="none" class="line" role="img" aria-label="Erscheinungsjahre">
              <polygon class="line-area" points={yearArea} />
              <polyline class="line-stroke" points={yearLine} />
              {#each yearPts as p}
                <circle class="line-pt" cx={p.x} cy={p.y} r="3"><title>{p.year}: {num(p.count)}</title></circle>
              {/each}
            </svg>
            <div class="line-x">
              {#each yearPts as p, i}
                {#if years.length <= 14 || i === 0 || i === yearPts.length - 1 || i % Math.ceil(years.length / 10) === 0}
                  <span style="left:{(p.x / LW) * 100}%">{p.year}</span>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </section>

    <!-- ══════════════ GENRES / TAGS ══════════════ -->
    {:else}
      {@const list = page === 'genres' ? genres : page === 'studios' ? studios : tags}
      <div class="bhead card-head">
        <h2>{page === 'genres' ? 'Genres' : page === 'studios' ? 'Studios' : 'Tags'}</h2>
        <div class="toggle">
          {#each RANK as [id, label]}<button class:on={rankBy === id} onclick={() => (rankBy = id)}>{label}</button>{/each}
        </div>
      </div>

      {#if list.length === 0}
        <div class="empty">
          {page === 'tags' || page === 'studios' ? 'Noch nicht importiert — Einstellungen → Import → „Von AniList importieren“.' : 'Noch keine Daten.'}
        </div>
      {:else}
        <div class="grid">
          {#each ranked(list) as x, i}
            <div class="gcard">
              <div class="gtop">
                <span class="rank">#{i + 1}</span>
                <span class="gname" title={x.name}>{x.name}</span>
              </div>
              <div class="gstats">
                <div class="gstat"><span class="gv">{num(x.count ?? 0)}</span><span class="gl">Anzahl</span></div>
                <div class="gstat"><span class="gv">{x.mean_score != null ? num(x.mean_score) : '–'}</span><span class="gl">Ø Wertung</span></div>
                <div class="gstat"><span class="gv">{num(x.hours ?? 0)}</span><span class="gl">Std</span></div>
              </div>
              <div class="gbar">
                <div
                  class="gbar-fill"
                  style="width:{rankBy === 'mean_score'
                    ? ((x.mean_score ?? 0) / 100) * 100
                    : ((x[rankBy] ?? 0) / Math.max(1, ...list.map((y) => y[rankBy] ?? 0))) * 100}%"
                ></div>
              </div>
              <div class="gfoot">{rankLabel(x, rankBy)}</div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </section>
</div>

<style>
  .profile-head { max-width: var(--maxw); margin: 0 auto; padding: 28px 20px 0; display: flex; align-items: center; gap: 16px; }
  .pavatar { width: 64px; height: 64px; border-radius: var(--radius); background: linear-gradient(135deg, var(--accent), var(--accent-dim)); display: grid; place-items: center; font-weight: 800; font-size: 1.3rem; color: var(--on-accent); }
  .pmeta h1 { margin: 0; font-size: 1.4rem; font-weight: 600; color: var(--text-strong); }
  .pmeta p { margin: 2px 0 0; color: var(--text-muted); font-size: 0.85rem; }
  .stats { max-width: var(--maxw); margin: 0 auto; padding: 24px 20px 60px; display: grid; grid-template-columns: 220px 1fr; gap: 30px; }

  /* Sidebar — AniList Stats-Seitennav */
  .side { display: flex; flex-direction: column; gap: 2px; position: sticky; top: 90px; align-self: start; }
  .side-head { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; padding: 4px 14px 8px; }
  .side button { text-align: left; padding: 10px 14px; border-radius: var(--radius); border: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-weight: 600; font-size: 0.86rem; transition: background 0.15s, color 0.15s; }
  .side button:hover:not(:disabled) { color: var(--text); background: var(--surface-2); }
  .side button.on { background: var(--accent); color: var(--on-accent); }
  .side button.locked { display: flex; align-items: center; justify-content: space-between; opacity: 0.45; cursor: not-allowed; }
  .side button.locked .lock { font-size: 0.78rem; }

  .content { min-width: 0; }
  .loading, .empty { text-align: center; color: var(--text-muted); padding: 50px; background: var(--surface); border-radius: var(--radius); }
  .empty.inline { padding: 24px; background: transparent; }

  /* Stat-Tiles */
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .tile { background: var(--surface); border-radius: var(--radius); padding: 20px 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm); }
  .tile .n { font-size: 2rem; font-weight: 700; color: var(--accent); line-height: 1; }
  .tile .l { font-size: 0.78rem; color: var(--text-muted); }

  /* Karten-Blöcke */
  .block { background: var(--surface); border-radius: var(--radius); padding: 22px 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
  .bhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
  .card-head { margin-bottom: 20px; }
  h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 600; margin: 0 0 18px; }
  .bhead h2 { margin: 0; }

  /* Flache Segment-Toggles */
  .toggle { display: inline-flex; gap: 2px; background: var(--surface-2); border-radius: var(--radius); padding: 2px; }
  .toggle button { padding: 6px 13px; border: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.78rem; font-weight: 600; border-radius: var(--radius-sm); transition: background 0.15s, color 0.15s; }
  .toggle button:hover { color: var(--text); }
  .toggle button.on { background: var(--accent); color: var(--on-accent); }

  /* Säulendiagramm Wertungen */
  .chart { display: flex; align-items: flex-end; gap: 10px; height: 170px; }
  .col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 8px; }
  .colbar { width: 100%; min-height: 3px; background: var(--accent); border-radius: var(--radius) var(--radius) 0 0; transition: height 0.3s; }
  .col span { font-size: 0.72rem; color: var(--text-muted); }

  /* Balken */
  .bars { display: flex; flex-direction: column; gap: 10px; }
  .bar { display: grid; grid-template-columns: 160px 1fr 64px; align-items: center; gap: 12px; font-size: 0.82rem; }
  .bl { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .track { background: var(--surface-2); border-radius: var(--radius); height: 8px; overflow: hidden; }
  .fill { height: 100%; background: var(--accent); border-radius: var(--radius); transition: width 0.3s; }
  .bc { text-align: right; color: var(--text-strong); font-weight: 600; }

  /* Donuts */
  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .duo .block { margin-bottom: 24px; }
  .donut-wrap { display: flex; align-items: center; gap: 22px; }
  .donut { width: 128px; height: 128px; flex: 0 0 auto; transform: rotate(-90deg); }
  .donut-bg { fill: none; stroke: var(--surface-2); stroke-width: 4; }
  .donut-seg { fill: none; stroke-width: 4; transition: stroke-dasharray 0.3s; }
  .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; min-width: 0; flex: 1; }
  .legend li { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
  .dot { width: 11px; height: 11px; border-radius: 3px; flex: 0 0 auto; }
  .lg-label { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .lg-pct { color: var(--text-strong); font-weight: 600; margin-left: auto; }

  /* Linie */
  .line-wrap { position: relative; }
  .line { width: 100%; height: 160px; display: block; overflow: visible; }
  .line-area { fill: color-mix(in srgb, var(--accent) 14%, transparent); stroke: none; }
  .line-stroke { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  .line-pt { fill: var(--surface); stroke: var(--accent); stroke-width: 2; }
  .line-x { position: relative; height: 16px; margin-top: 4px; }
  .line-x span { position: absolute; transform: translateX(-50%); font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; }

  /* Genres/Tags Karten-Grid */
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .gcard { background: var(--surface); border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; }
  .gtop { display: flex; align-items: baseline; gap: 8px; }
  .rank { color: var(--accent); font-weight: 700; font-size: 0.9rem; flex: 0 0 auto; }
  .gname { color: var(--text-strong); font-weight: 600; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gstats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .gstat { display: flex; flex-direction: column; gap: 2px; }
  .gv { color: var(--text-strong); font-weight: 700; font-size: 0.95rem; }
  .gl { color: var(--text-muted); font-size: 0.68rem; }
  .gbar { background: var(--surface-2); border-radius: var(--radius); height: 6px; overflow: hidden; }
  .gbar-fill { height: 100%; background: var(--accent); border-radius: var(--radius); transition: width 0.3s; }
  .gfoot { font-size: 0.72rem; color: var(--text-muted); text-align: right; }

  @media (max-width: 860px) {
    .duo { grid-template-columns: 1fr; }
    .grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 680px) {
    .stats { grid-template-columns: 1fr; gap: 20px; }
    .side { flex-direction: row; flex-wrap: wrap; position: static; gap: 4px; }
    .side-head { width: 100%; padding: 0 4px 2px; }
    .grid { grid-template-columns: 1fr; }
    .bar { grid-template-columns: 110px 1fr 54px; }
    .donut-wrap { flex-direction: column; align-items: flex-start; }
  }
</style>
