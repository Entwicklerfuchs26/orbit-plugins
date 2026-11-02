<script lang="ts">
  import { api } from '../api'

  let stats = $state<any>(null)
  let uname = $state('')
  api.anilistUsername().then((d) => { if (d?.username) uname = d.username }).catch(() => {})
  $effect(() => {
    api.profileStats().then((s) => (stats = s)).catch(() => {})
  })

  const STATUS_LABEL: Record<string, string> = {
    watching: 'Beobachten', rewatching: 'Wiederanschauen', completed: 'Abgeschlossen', planning: 'Planung', paused: 'Pausiert', dropped: 'Fallen Gelassen',
  }
  const STATUS_COLOR: Record<string, string> = {
    watching: '#3db4f2', rewatching: '#5dc8f0', completed: '#7bd555', planning: '#8b5cf6', paused: '#f7a60c', dropped: '#e85d75',
  }

  const GENRE_COLORS = ['#4ac07a', '#3db4f2', '#8b5cf6', '#e0607e', '#f0a84a']
  let maxGenre = $derived(stats?.top_genres?.[0]?.[1] ?? 1)
  let maxScore = $derived(Math.max(1, ...Object.values(stats?.score_dist ?? { a: 1 }).map((v: any) => v)))
  let statusTotal = $derived(Object.values(stats?.by_status ?? {}).reduce((a: number, b: any) => a + b, 0) || 1)
</script>

<div class="wrap">
  {#if stats}
    <div class="head">
      <div class="av">EF</div>
      <div>
        <h1>{uname || 'Mein Profil'}</h1>
        <p>{stats.total} Titel in der Liste</p>
      </div>
    </div>

    <div class="tiles">
      <div class="tile"><span class="n">{stats.total}</span><span class="l">Titel gesamt</span></div>
      <div class="tile"><span class="n">{stats.episodes}</span><span class="l">Folgen gesehen</span></div>
      <div class="tile"><span class="n">{stats.days_watched}</span><span class="l">Tage geschaut</span></div>
      <div class="tile score">
        <span class="n">{stats.mean_score ?? '–'}</span>
        <span class="l">Ø Wertung</span>
        {#if stats.mean_score != null}
          {@const pct = Math.max(50, Math.min(100, Number(stats.mean_score) * 10))}
          <div class="scorebar"><div class="scorebar-fill" style="width:{((pct - 50) / 50) * 100}%"></div></div>
        {/if}
      </div>
    </div>

    <section class="card genreov">
      <h2>Genre-Überblick</h2>
      <div class="pills">
        {#each stats.top_genres.slice(0, 5) as [g, c], i}
          <div class="pill" style="background:{GENRE_COLORS[i]}"><b>{g}</b><span>{c} Einträge</span></div>
        {/each}
      </div>
      <div class="gradbar">
        {#each stats.top_genres.slice(0, 5) as [g, c], i}<div style="flex:{c};background:{GENRE_COLORS[i]}"></div>{/each}
      </div>
    </section>

    <section class="card">
      <h2>Status</h2>
      <div class="statusbar">
        {#each Object.entries(stats.by_status) as [k, v]}
          <div class="seg" style="width:{(v / statusTotal) * 100}%;background:{STATUS_COLOR[k] ?? '#888'}" title="{STATUS_LABEL[k] ?? k}: {v}"></div>
        {/each}
      </div>
      <div class="legend">
        {#each Object.entries(stats.by_status) as [k, v]}
          <span><i style="background:{STATUS_COLOR[k] ?? '#888'}"></i>{STATUS_LABEL[k] ?? k} <b>{v}</b></span>
        {/each}
      </div>
    </section>

    <div class="two">
      <section class="card">
        <h2>Top-Genres</h2>
        <div class="bars">
          {#each stats.top_genres as [g, c]}
            <div class="bar"><span class="bl">{g}</span><div class="track"><div class="fill" style="width:{(c / maxGenre) * 100}%"></div></div><span class="bc">{c}</span></div>
          {/each}
        </div>
      </section>

      <section class="card">
        <h2>Wertungs-Verteilung</h2>
        <div class="scoredist">
          {#each Array.from({ length: 10 }, (_, i) => i + 1) as s}
            <div class="sd">
              <div class="sdbar" style="height:{((stats.score_dist[s] ?? 0) / maxScore) * 100}%"></div>
              <span>{s}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {:else}
    <div class="loading">lädt Statistik…</div>
  {/if}
</div>

<style>
  .wrap { max-width: 920px; margin: 0 auto; padding: 30px 20px 60px; }
  .head { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .av { width: 72px; height: 72px; border-radius: var(--radius); background: linear-gradient(135deg, var(--accent), var(--accent-2)); display: grid; place-items: center; font-weight: 800; font-size: 1.4rem; color: #fff; }
  .head h1 { margin: 0; font-size: 1.5rem; font-weight: 500; color: var(--text-strong); }
  .head p { margin: 3px 0 0; color: var(--text-muted); font-size: 0.9rem; }

  /* Karten — gemeinsamer AniList-Stil: var(--surface), 4px radius, dezenter Rahmen+Schatten */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 20px 22px; margin-bottom: 20px; }

  h2 { font-size: 0.85rem; font-weight: 500; color: var(--text-muted); margin: 0 0 14px; }

  /* Stat-Kacheln */
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .tile { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; }
  .tile .n { font-size: 1.9rem; font-weight: 700; color: var(--accent); line-height: 1.1; }
  .tile .l { font-size: 0.78rem; color: var(--text-muted); }
  .tile.score .n { color: var(--good); }
  .scorebar { margin-top: 10px; height: 6px; border-radius: var(--radius-sm); background: var(--surface-2); overflow: hidden; }
  .scorebar-fill { height: 100%; background: var(--good); border-radius: var(--radius-sm); }

  /* Genre-Überblick */
  .genreov .pills { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
  .pill { display: flex; flex-direction: column; padding: 8px 14px; border-radius: var(--radius); color: #06121a; min-width: 92px; }
  .pill b { font-size: 0.9rem; font-weight: 600; }
  .pill span { font-size: 0.72rem; opacity: 0.85; }
  .gradbar { display: flex; height: 8px; border-radius: var(--radius-sm); overflow: hidden; }

  /* Status-Verteilung */
  .statusbar { display: flex; height: 14px; border-radius: var(--radius-sm); overflow: hidden; background: var(--surface-2); }
  .seg { height: 100%; }
  .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 0.82rem; color: var(--text-muted); }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: var(--radius-sm); margin-right: 6px; vertical-align: middle; }
  .legend b { color: var(--text); font-weight: 600; }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .two .card { margin-bottom: 0; }

  /* Top-Genres */
  .bars { display: flex; flex-direction: column; gap: 8px; }
  .bar { display: grid; grid-template-columns: 110px 1fr 36px; align-items: center; gap: 10px; font-size: 0.82rem; }
  .bl { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .track { background: var(--surface-2); border-radius: var(--radius-sm); height: 10px; overflow: hidden; }
  .fill { height: 100%; background: var(--accent); border-radius: var(--radius-sm); }
  .bc { text-align: right; color: var(--text-muted); }

  /* Wertungs-Histogramm */
  .scoredist { display: flex; align-items: flex-end; gap: 6px; height: 140px; }
  .sd { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
  .sdbar { width: 100%; min-height: 2px; background: var(--good); border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
  .sd span { font-size: 0.72rem; color: var(--text-muted); }

  .loading { text-align: center; color: var(--text-muted); padding: 60px; }
  @media (max-width: 640px) { .two { grid-template-columns: 1fr; } }
</style>
