<script lang="ts">
  // Cover mit Platzhalter: nimmt cover_url aus dem Katalog/Backend, sonst das Bild von AniList
  // (Laufzeit-Abruf, sobald das Element sichtbar ist).
  import type { Media } from '../api'
  import { lightOf, visible, lightKey } from './anilist.svelte'
  let { media, lazy = true }: { media: Pick<Media, 'title' | 'cover_url' | 'anilist_id' | 'mal_id' | 'color'>; lazy?: boolean } = $props()
  const key = $derived(lightKey(media))
  const art = $derived(lightOf(key))
  const src = $derived(media.cover_url || art?.cover)
  const bg = $derived(media.color || art?.color)
</script>

<div class="c" use:visible={media.cover_url ? null : key} style={!src && bg ? `background:${bg}22` : ''}>
  {#if src}
    <img {src} alt="" loading={lazy ? 'lazy' : 'eager'} onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
  {:else}
    <div class="ph">{media.title?.[0] ?? '?'}</div>
  {/if}
</div>

<style>
  .c { position: absolute; inset: 0; }
  img { width: 100%; height: 100%; object-fit: cover; display: block; transition: filter 0.18s ease; }
  .ph { width: 100%; height: 100%; display: grid; place-items: center; font-size: 2rem; font-weight: 600; color: var(--text-muted); }
</style>
