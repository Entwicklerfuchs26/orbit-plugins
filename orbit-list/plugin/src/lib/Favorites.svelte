<script lang="ts">
  import type { Media } from '../api'
  import Cover from './Cover.svelte'

  let { api, activeType, hToken = null, onopen }: {
    api: any
    activeType: { slug: string; name: string; space: 'normal' | 'h'; media_type: string }
    hToken?: string | null
    onopen: (m: Media) => void
  } = $props()

  let items = $state<Media[]>([])
  let loading = $state(true)
  let dragI = $state<number | null>(null)

  async function loadFav() {
    loading = true
    try {
      const q = { favorite: 1, sort: 'favorite', limit: 500, media_type: activeType.media_type }
      const d = activeType.space === 'h'
        ? (hToken ? await api.h(hToken, q) : { items: [] })
        : await api.anime(q)
      items = (d?.items ?? []) as Media[]
    } catch {
      items = []
    } finally {
      loading = false
    }
  }
  $effect(() => { void activeType; void hToken; loadFav() })

  function persist() {
    api.reorderFavorites(items.map((m) => m.id)).catch(() => {})
  }
  function onDragStart(i: number) { dragI = i }
  function onDragOver(e: DragEvent, i: number) {
    e.preventDefault()
    if (dragI === null || dragI === i) return
    const arr = [...items]
    const [m] = arr.splice(dragI, 1)
    arr.splice(i, 0, m)
    items = arr
    dragI = i
  }
  function onDrop() { if (dragI !== null) { dragI = null; persist() } }

  async function unfav(m: Media, e: MouseEvent) {
    e.stopPropagation()
    try { await api.patchEntry(m.id, { favorite: 0 }) } catch {}
    items = items.filter((x) => x.id !== m.id)
    persist()
  }
</script>

<div class="favview">
  <header class="fhead">
    <h1>Favoriten</h1>
    <p>Zieh die Einträge, um deine Rangliste zu ordnen — Platz 1 oben links.</p>
  </header>

  {#if loading}
    <div class="ph">lädt…</div>
  {:else if items.length === 0}
    <div class="ph">Noch keine Favoriten. Öffne einen Titel und tippe auf das ♥.</div>
  {:else}
    <div class="grid">
      {#each items as m, i (m.id)}
        <div
          class="fav"
          class:dragging={dragI === i}
          draggable="true"
          role="button"
          tabindex="0"
          ondragstart={() => onDragStart(i)}
          ondragover={(e) => onDragOver(e, i)}
          ondrop={onDrop}
          ondragend={onDrop}
          onclick={() => onopen(m)}
          onkeydown={(e) => { if (e.key === 'Enter') onopen(m) }}
        >
          <span class="rank">{i + 1}</span>
          <div class="cover">
            <Cover media={m} />
          </div>
          <span class="title">{m.title}</span>
          <button class="heart" onclick={(e) => unfav(m, e)} title="Aus Favoriten entfernen" aria-label="Entfernen">♥</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .favview { max-width: var(--maxw); margin: 0 auto; padding: 28px 20px 60px; }
  .fhead h1 { margin: 0; font-size: 1.5rem; font-weight: 600; color: var(--text-strong); }
  .fhead p { margin: 4px 0 24px; color: var(--text-muted); font-size: 0.88rem; }
  .ph { text-align: center; color: var(--text-muted); padding: 60px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 18px; }
  .fav { position: relative; cursor: grab; display: flex; flex-direction: column; gap: 6px; }
  .fav:active { cursor: grabbing; }
  .fav.dragging { opacity: 0.45; }
  .rank { position: absolute; top: 6px; left: 6px; z-index: 2; background: var(--accent); color: var(--on-accent); font-weight: 800; font-size: 0.82rem; min-width: 22px; height: 22px; padding: 0 5px; border-radius: var(--radius-sm); display: grid; place-items: center; box-shadow: var(--shadow-sm); }
  .cover { position: relative; aspect-ratio: 185 / 265; border-radius: var(--radius); overflow: hidden; background: var(--surface); box-shadow: var(--shadow-sm); }
  .cover img { width: 100%; height: 100%; object-fit: cover; }
  .ph2 { width: 100%; height: 100%; display: grid; place-items: center; color: var(--text-muted); font-weight: 600; }
  .title { font-size: 0.85rem; font-weight: 500; color: var(--text); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .heart { position: absolute; top: 6px; right: 6px; z-index: 2; width: 26px; height: 26px; border: 0; border-radius: 50%; background: rgba(0, 0, 0, 0.55); color: var(--accent); cursor: pointer; font-size: 0.9rem; line-height: 1; }
</style>
