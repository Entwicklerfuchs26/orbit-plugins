// Anime-Liste Tracker — Content-Script.
// Liest NUR den bereits offenen Tab (URL/DOM + <video>-Status), scrapt keinen Fremdserver,
// und meldet die laufende Folge an das lokale Backend. Selektoren laut De-Risk (vor Produktiv
// an echten Tabs gegenprüfen — Crunchyroll-SPA-Markup ändert sich).
const BACKEND = 'http://127.0.0.1:8787/watch'

function titleCase(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function parse() {
  const url = location.href
  let m = url.match(/aniworld\.to\/anime\/stream\/([^/]+)\/staffel-(\d+)\/episode-(\d+)/)
  if (m) return { source: 'aniworld', serie: titleCase(m[1]), staffel: +m[2], folge: +m[3] }

  if (location.host.includes('crunchyroll')) {
    const serie =
      document.querySelector('.erc-current-media-info h1, a.show-title-link')?.textContent?.trim() ||
      document.querySelector('meta[property="og:title"]')?.content ||
      null
    const h4 = document.querySelector('.erc-current-media-info h4')?.textContent || document.title
    const em = h4.match(/S(\d+)\s*E(\d+)/i)
    if (serie) return { source: 'crunchyroll', serie, staffel: em ? +em[1] : null, folge: em ? +em[2] : null }
  }
  return null
}

let lastKey = ''
function tick() {
  const v = document.querySelector('video')
  const playing = !!(v && !v.paused && !v.ended && v.currentTime > 0)
  if (!playing) return
  const info = parse()
  if (!info || !info.folge) return
  const key = `${info.source}|${info.serie}|${info.staffel}|${info.folge}`
  if (key === lastKey) return
  lastKey = key
  fetch(BACKEND, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...info, position_sec: v.currentTime, playing: true }),
  }).catch(() => {})
}

setInterval(tick, 15000)
