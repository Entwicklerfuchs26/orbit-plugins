<script lang="ts">
  let { filters, meta, genres }: { filters: any; meta: any; genres: string[] } = $props()

  const FORMAT_LABEL: Record<string, string> = {
    TV: 'TV', TV_SHORT: 'TV Kurz', MOVIE: 'Film', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Musik',
  }
  const STATUS_LABEL: Record<string, string> = {
    RELEASING: 'Läuft', FINISHED: 'Abgeschlossen', NOT_YET_RELEASED: 'Angekündigt', CANCELLED: 'Abgebrochen', HIATUS: 'Pausiert',
  }
  const LANGS: [string, string][] = [
    ['german', 'Deutsch'], ['english', 'Englisch'], ['japanese', 'Japanisch'], ['spanish', 'Spanisch'],
    ['french', 'Französisch'], ['italian', 'Italienisch'], ['portuguese', 'Portug.'], ['korean', 'Koreanisch'], ['chinese', 'Chinesisch'],
  ]

  function toggle(arr: string[], v: string) {
    const i = arr.indexOf(v)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(v)
  }
  const SEEN: [string, string][] = [['all', 'Alle'], ['yes', 'Gesehen'], ['no', 'Nicht gesehen']]
  function reset() {
    filters.genres = []; filters.format = []; filters.status = []
    filters.yearMin = null; filters.yearMax = null; filters.dub = false; filters.dubLang = ''; filters.seen = 'all'; filters.sort = 'popularity'
  }
</script>

<div class="panel">
  <div class="hd"><span>Filter</span><button class="reset" onclick={reset}>Zurücksetzen</button></div>

  <div class="grp">
    <label>Gesehen</label>
    <div class="chips">
      {#each SEEN as [v, l]}
        <button class="chip" class:on={filters.seen === v} onclick={() => (filters.seen = v)}>{l}</button>
      {/each}
    </div>
  </div>

  <div class="grp">
    <label>Genres</label>
    <div class="chips">
      {#each genres as g}
        <button class="chip" class:on={filters.genres.includes(g)} onclick={() => toggle(filters.genres, g)}>{g}</button>
      {/each}
    </div>
  </div>

  <div class="grp">
    <label>Synchro-Sprache</label>
    <div class="chips">
      {#each LANGS as [v, l]}
        <button class="chip" class:on={filters.dubLang === v} onclick={() => (filters.dubLang = filters.dubLang === v ? '' : v)}>{l}</button>
      {/each}
    </div>
  </div>

  <div class="cols">
    <div class="grp">
      <label>Format</label>
      <div class="chips">
        {#each meta.formats ?? [] as f}
          <button class="chip" class:on={filters.format.includes(f)} onclick={() => toggle(filters.format, f)}>{FORMAT_LABEL[f] ?? f}</button>
        {/each}
      </div>
    </div>
    <div class="grp">
      <label>Freigabe-Status</label>
      <div class="chips">
        {#each meta.statuses ?? [] as s}
          <button class="chip" class:on={filters.status.includes(s)} onclick={() => toggle(filters.status, s)}>{STATUS_LABEL[s] ?? s}</button>
        {/each}
      </div>
    </div>
  </div>

  <div class="cols">
    <div class="grp">
      <label>Jahr</label>
      <div class="years">
        <input type="number" min={meta.year_min} max={meta.year_max} placeholder={String(meta.year_min ?? 'von')} bind:value={filters.yearMin} />
        <span>–</span>
        <input type="number" min={meta.year_min} max={meta.year_max} placeholder={String(meta.year_max ?? 'bis')} bind:value={filters.yearMax} />
      </div>
    </div>
    <div class="grp">
      <label>Sortierung</label>
      <select bind:value={filters.sort}>
        <option value="popularity">Beliebtheit</option>
          <option value="date_desc">Erscheinungsdatum (neueste zuerst)</option>
          <option value="date_asc">Erscheinungsdatum (älteste zuerst)</option>
        <option value="score">Wertung</option>
        <option value="title">Titel A–Z</option>
        <option value="recent">Zuletzt aktualisiert</option>
      </select>
    </div>
    <div class="grp">
      <label>Synchro</label>
      <button class="chip" class:on={filters.dub} onclick={() => (filters.dub = !filters.dub)}>nur mit dt. Dub</button>
    </div>
  </div>
</div>

<style>
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; margin: 0 0 20px; }
  .hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .hd span { font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .reset { background: none; border: 0; color: var(--text-muted); cursor: pointer; font-size: 0.78rem; padding: 0; }
  .reset:hover { color: var(--accent); }
  .grp { margin-bottom: 16px; }
  .grp:last-child { margin-bottom: 0; }
  .grp label { display: block; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0 22px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 6px 12px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--surface-2); color: var(--text); cursor: pointer;
    font-size: 0.8rem; font-weight: 500; line-height: 1.2; white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .chip:hover { border-color: var(--accent); color: var(--accent); }
  .chip.on { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .chip.on:hover { color: var(--bg); }
  .years { display: flex; align-items: center; gap: 8px; }
  .years input { width: 100%; min-width: 0; }
  .years span { color: var(--text-muted); }
  input, select {
    padding: 8px 10px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--surface-2); color: var(--text); font-size: 0.82rem; font-family: inherit;
  }
  input:focus, select:focus { outline: none; border-color: var(--accent); }
  select { width: 100%; cursor: pointer; }
</style>
