<script lang="ts">
  import type { Media } from '../api'
  let { media, list = false, onopen }: { media: Media; list?: boolean; onopen: (m: Media) => void } = $props()
</script>

<button class="card" class:list onclick={() => onopen(media)}>
  <div class="cover">
    {#if media.cover_url}
      <img src={media.cover_url} alt="" loading="lazy" />
    {:else}
      <div class="ph">{media.title?.[0] ?? '?'}</div>
    {/if}
    {#if media.dub_de}<span class="badge dub" title="Deutscher Dub vorhanden">DE</span>{/if}
    {#if media.rating}<span class="badge rat" title="Deine Wertung">★ {media.rating}</span>{/if}
    {#if media.collection === 'owned'}<span class="badge own" title="Im Regal">▣</span>{/if}
    {#if media.average_score}<span class="badge score" title="Durchschnitts-Wertung">{media.average_score}%</span>{/if}
  </div>
  <div class="meta">
    <div class="title">{media.title}</div>
    <div class="sub">
      {#if media.season_year}<span>{media.season_year}</span>{/if}
      {#if media.format}<span>{media.format}</span>{/if}
      {#if list && media.average_score}<span class="score-txt">{media.average_score}%</span>{/if}
    </div>
    {#if list && media.genres}<div class="genres">{media.genres.slice(0, 4).join(' · ')}</div>{/if}
  </div>
</button>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .cover {
    position: relative;
    aspect-ratio: 185 / 265;   /* AniList-Cover ~0.70 */
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface); /* Platzhalter-Fläche */
    box-shadow: var(--shadow-sm);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .card:hover .cover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: filter 0.18s ease;
  }
  .card:hover .cover img { filter: brightness(1.06); }
  .ph {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    font-size: 2rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .badge {
    position: absolute;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
    padding: 3px 6px;
    border-radius: var(--radius-sm);
    backdrop-filter: blur(4px);
  }
  .dub { top: 6px; left: 6px; background: var(--accent); color: var(--on-accent); }
  .rat { top: 6px; right: 6px; background: rgba(0, 0, 0, 0.6); color: var(--gold); }
  .own { top: 6px; left: 6px; background: var(--good); color: #04240f; }
  /* Score grün unten links, wie AniLists Wertungs-Badge */
  .score {
    bottom: 6px;
    left: 6px;
    background: rgba(0, 0, 0, 0.6);
    color: var(--good);
    font-weight: 600;
  }
  /* own + dub liegen beide links oben → dub nach rechts rutschen, falls beides */
  .card:has(.own) .dub { left: auto; right: 6px; }

  .title {
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.3;
    color: var(--text);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.15s ease;
  }
  .card:hover .title { color: var(--accent); }
  .sub {
    display: flex;
    gap: 8px;
    margin-top: 1px;
    font-size: 0.72rem;
    color: var(--text-muted);
  }
  .score-txt { color: var(--good); }
  .genres { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

  /* Listen-Ansicht: kompakte Zeile wie AniLists Listenzeile */
  .card.list {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    border-radius: var(--radius);
    transition: background 0.15s ease;
  }
  .card.list:hover { background: var(--surface-2); }
  .card.list .cover {
    width: 48px;
    aspect-ratio: 185 / 265;
    flex: 0 0 auto;
    border-radius: var(--radius-sm);
    box-shadow: none;
  }
  .card.list:hover .cover { transform: none; box-shadow: none; }
  .card.list .meta {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .card.list .title { -webkit-line-clamp: 1; font-weight: 500; }
  /* Score-Badge auf dem Mini-Cover wäre zu eng → in der Zeile nur als Text */
  .card.list .cover .score { display: none; }
</style>
