<script lang="ts">
  import Card from './Card.svelte'
  import type { Media } from '../api'

  let {
    api,
    activeType,
    hToken = null,
    onopen,
  }: {
    api: any
    activeType: { slug: string; name: string; space: 'normal' | 'h'; media_type: string; hidden: number }
    hToken?: string | null
    onopen: (m: Media) => void
  } = $props()

  const STATUS_LABEL: Record<string, string> = {
    watching: 'Beobachten',
    rewatching: 'Wiederanschauen',
    completed: 'Abgeschlossen',
    paused: 'Pausiert',
    dropped: 'Fallen Gelassen',
    planning: 'Planung',
  }

  let activity = $state<Media[]>([])
  let inProgress = $state<Media[]>([])
  let trending = $state<Media[]>([])
  let newlyAdded = $state<Media[]>([])

  // Config-bewusst: H → api.h(token, …), sonst api.anime; media_type immer mitgeben.
  async function fetchList(q: Record<string, unknown>): Promise<Media[]> {
    const base = { ...q, media_type: activeType.media_type }
    try {
      if (activeType.space === 'h') {
        if (!hToken) return []
        const d = await api.h(hToken, base)
        return d?.items ?? []
      }
      const d = await api.anime(base)
      return d?.items ?? []
    } catch (e) {
      console.error('Home fetch failed:', q, e)
      return []
    }
  }

  async function loadAll() {
    const [act, ip, tr, na] = await Promise.all([
      fetchList({ watch_status: 'all', sort: 'recent', limit: 8 }),
      fetchList({ watch_status: 'watching', sort: 'recent', limit: 12 }),
      fetchList({ sort: 'popularity', limit: 12 }),
      fetchList({ sort: 'recent', limit: 12 }),
    ])
    activity = act
    inProgress = ip
    trending = tr
    newlyAdded = na
  }

  $effect(() => {
    // Abhängigkeiten anfassen → Reload bei Config-/Token-Wechsel
    void activeType.media_type
    void activeType.space
    void hToken
    loadAll()
  })

  // +1 Folge: lokal hochzählen + ans Backend schicken
  async function bump(m: Media, ev: MouseEvent) {
    ev.stopPropagation()
    const next = (m.progress ?? 0) + 1
    m.progress = next // $state-Proxy → reaktiv
    try {
      await api.patchEntry(m.id, { progress: next })
    } catch (e) {
      console.error('patchEntry failed:', m.id, e)
      m.progress = next - 1 // Rollback bei Fehler
    }
  }
</script>

<div class="home">
  <!-- LINKS: Aktivität (Platzhalter) + Ersatz: zuletzt aktualisierte Einträge -->
  <aside class="left">
    <h2>Aktivität</h2>
    <div class="locked">
      <span class="lockico">🔒</span>
      <div>
        <b>Aktivitäts-Feed</b>
        <p>kommt mit Sync</p>
      </div>
    </div>

    <h3>Zuletzt aktualisiert</h3>
    {#if activity.length}
      <ul class="feed">
        {#each activity as m (m.id)}
          <li>
            <button class="feedrow" onclick={() => onopen(m)}>
              <span class="fstatus">{STATUS_LABEL[m.watch_status ?? ''] ?? 'Aktualisiert'}</span>
              <span class="ftitle">{m.title}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">Noch keine Einträge.</p>
    {/if}
  </aside>

  <!-- RECHTS: In Progress · Airing (Platzhalter) · Trending · Newly Added -->
  <div class="right">
    <section class="block">
      <div class="head"><h2>In Bearbeitung</h2></div>
      {#if inProgress.length}
        <div class="ipgrid">
          {#each inProgress as m (m.id)}
            <div class="ip">
              <button class="ipcover" onclick={() => onopen(m)} title={m.title}>
                {#if m.cover_url}
                  <img src={m.cover_url} alt="" loading="lazy" />
                {:else}
                  <div class="ph">{m.title?.[0] ?? '?'}</div>
                {/if}
                <div class="ipfoot">
                  <span class="prog">{m.progress ?? 0}{#if m.episodes} / {m.episodes}{/if}</span>
                </div>
              </button>
              <button class="plus" title="Eine Folge weiter" onclick={(e) => bump(m, e)}>+</button>
              <div class="iptitle">{m.title}</div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty">Nichts in Bearbeitung.</p>
      {/if}
    </section>

    <section class="block">
      <div class="head"><h2>Demnächst</h2></div>
      <div class="locked wide">
        <span class="lockico">🔒</span>
        <div>
          <b>Ausstrahlungs-Countdown</b>
          <p>kommt mit Sync</p>
        </div>
      </div>
    </section>

    {#if trending.length}
      <section class="block">
        <div class="head"><h2>Trending</h2></div>
        <div class="strip">
          {#each trending as m (m.id)}
            <div class="cell"><Card media={m} {onopen} /></div>
          {/each}
        </div>
      </section>
    {/if}

    {#if newlyAdded.length}
      <section class="block">
        <div class="head"><h2>Neu hinzugefügt</h2></div>
        <div class="strip">
          {#each newlyAdded as m (m.id)}
            <div class="cell"><Card media={m} {onopen} /></div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .home {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 24px var(--pad) 60px;
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 30px;
    align-items: start;
  }

  h2 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
  }
  h3 {
    margin: 22px 0 10px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  /* Linke Spalte */
  .left { min-width: 0; }
  .left h2 { margin-bottom: 10px; }

  .locked {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    color: var(--text-muted);
  }
  .locked.wide { padding: 22px 20px; }
  .lockico { font-size: 1.2rem; opacity: 0.8; }
  .locked b { color: var(--text); font-size: 0.86rem; font-weight: 600; }
  .locked p { margin: 2px 0 0; font-size: 0.76rem; }

  .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .feedrow {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 8px 10px;
    border-radius: var(--radius);
    transition: background 0.15s ease;
  }
  .feedrow:hover { background: var(--surface-2); }
  .fstatus { font-size: 0.72rem; font-weight: 600; color: var(--accent); }
  .ftitle {
    font-size: 0.84rem;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty { color: var(--text-muted); font-size: 0.82rem; padding: 4px 2px; }

  /* Rechte Spalte */
  .right { min-width: 0; display: flex; flex-direction: column; gap: 34px; }
  .block { display: flex; flex-direction: column; gap: 12px; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }

  /* In-Bearbeitung-Raster mit +1-Button */
  .ipgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 20px 16px;
  }
  .ip { display: flex; flex-direction: column; gap: 7px; position: relative; min-width: 0; }
  .ipcover {
    position: relative;
    width: 100%;
    aspect-ratio: 185 / 265;
    border-radius: var(--radius);
    overflow: hidden;
    border: 0;
    padding: 0;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .ip:hover .ipcover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .ipcover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ph { width: 100%; height: 100%; display: grid; place-items: center; font-size: 2rem; font-weight: 600; color: var(--text-muted); }
  .ipfoot {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    padding: 5px 7px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0));
    display: flex;
    justify-content: flex-start;
  }
  .prog { font-size: 0.72rem; font-weight: 600; color: #fff; }
  .plus {
    position: absolute;
    top: 6px; right: 6px;
    width: 26px; height: 26px;
    border-radius: var(--radius-sm);
    border: 0;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 1.05rem;
    line-height: 1;
    font-weight: 700;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, filter 0.15s ease;
  }
  .ip:hover .plus { opacity: 1; }
  .plus:hover { filter: brightness(1.1); }
  .iptitle {
    font-size: 0.8rem;
    line-height: 1.3;
    color: var(--text);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Trending / Neu — Cover-Streifen */
  .strip {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 6px;
    scroll-snap-type: x proximity;
    scrollbar-width: thin;
  }
  .cell { flex: 0 0 auto; width: 140px; scroll-snap-align: start; }

  @media (max-width: 860px) {
    .home { grid-template-columns: 1fr; gap: 24px; }
  }
  @media (max-width: 760px) {
    .home { padding: 20px 20px 50px; }
    .cell { width: 120px; }
  }
  /* Touch-Geräte: +1 immer sichtbar (kein Hover) */
  @media (hover: none) {
    .plus { opacity: 1; }
  }
</style>
