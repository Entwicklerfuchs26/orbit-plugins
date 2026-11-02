<script lang="ts">
  // Wurzel: Verbindung pruefen/aufbauen, dann die eigentliche App (Main) mounten.
  // Beim Verbinden (conn.rev) wird Main komplett neu aufgebaut und holt alle Daten frisch.
  import Main from './Main.svelte'
  import Connect from './lib/Connect.svelte'
  import Boot from './lib/Boot.svelte'
  import { conn } from './lib/conn.svelte'
  import { emb, boot } from './lib/embedded.svelte'
  if (conn.mode === 'embedded') boot(conn.defaultServer).catch(() => {})
  let warmed = false
  $effect(() => {
    if (conn.mode === 'embedded' && emb.phase === 'ready' && !warmed) {
      warmed = true
      setTimeout(() => import('./lib/warmup').then((m) => m.warmScores()).catch(() => {}), 4000)
    }
  })
</script>

{#if conn.mode === 'embedded' && emb.phase !== 'ready'}
  <Boot />
{:else if conn.needsSetup}
  <Connect />
{:else}
  {#key conn.rev}<Main />{/key}
{/if}
