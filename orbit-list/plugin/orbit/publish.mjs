/**
 * Baut die Orbitlist-Plugins und veroeffentlicht sie im Store-Repo (orbit-plugins) im TEST-Kanal
 * (nur der "Orbit Test"-Build sieht sie): Dateien unter test/<id>/, registry-Eintrag mit channel:test,
 * `main` auf den Commit-SHA gepinnt (unveraenderlich) — gleiche Logik wie skwd-wall-sync/scripts/publish-plugins.mjs.
 *
 *   node orbit/publish.mjs <clone-von-orbit-plugins> <id,id,...> [--remove=id,id] [--push]
 * Ohne --push wird nur lokal committet (Trockenlauf).
 */
import { execSync } from 'node:child_process'
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [clone, idList] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const PUSH = process.argv.includes('--push')
if (!clone || !idList) throw new Error('Usage: node orbit/publish.mjs <clone> <id,id> [--push]')
const IDS = idList.split(',')
const REMOVE = (process.argv.find((a) => a.startsWith('--remove=')) ?? '').replace('--remove=', '').split(',').filter(Boolean)
const REPO = 'Entwicklerfuchs26/orbit-plugins'
const git = (a) => execSync(`git -C "${clone}" ${a}`, { encoding: 'utf8' }).trim()
const ID = '-c user.name="Entwicklerfuchs26" -c user.email="Entwicklerfuchs26@users.noreply.github.com"'

globalThis.Orbit = { Plugin: class {}, View: class {} }
const manifests = {}
for (const id of IDS) {
  console.log(`▸ build ${id}`)
  execSync(`PLUGIN=${id} npx vite build --config vite.orbit.config.ts`, { cwd: root, stdio: 'inherit' })
  const built = resolve(root, `dist-orbit/${id}/main.js`)
  manifests[id] = (await import(pathToFileURL(built).href + `?t=${Date.now()}`)).manifest
  const dir = resolve(clone, `test/${id}`)
  mkdirSync(dir, { recursive: true })
  copyFileSync(built, resolve(dir, 'main.js'))
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify({ ...manifests[id], main: 'main.js' }, null, 2))
}
for (const id of REMOVE) { try { git(`rm -rq test/${id}`) } catch {} }
git('add -A')
try { git(`${ID} commit -q -m "build: orbit-list test bundles"`) } catch { console.log('(keine Plugin-Aenderung)') }
const sha = git('rev-parse HEAD')
const sha7 = sha.slice(0, 7)

const regPath = resolve(clone, 'registry.json')
const prev = existsSync(regPath) ? JSON.parse(readFileSync(regPath, 'utf8')).plugins ?? [] : []
const isTest = (e) => e.channel === 'test'
const preserved = prev.filter((e) => !((IDS.includes(e.id) || REMOVE.includes(e.id)) && isTest(e)))
const published = IDS.map((id) => {
  const m = manifests[id]
  const main = `https://raw.githubusercontent.com/${REPO}/${sha}/test/${id}/main.js`
  const old = prev.find((e) => e.id === id && isTest(e))
  const history = Array.isArray(old?.versions) ? old.versions : []
  const versions = history[0]?.main === main ? history : [{ label: `${m.version}+${sha7}`, version: m.version, built: sha7, main }, ...history].slice(0, 12)
  return { id: m.id, name: m.name, description: m.description, author: m.author, version: m.version, type: m.type, platforms: m.platforms, main, channel: 'test', versions }
})
writeFileSync(regPath, JSON.stringify({ plugins: [...preserved, ...published] }, null, 2))
git('add registry.json')
try { git(`${ID} commit -q -m "registry: pin ${sha7} (orbit-list test)"`) } catch { console.log('(registry unveraendert)') }
if (PUSH) { git('push -q origin main'); console.log(`✓ gepusht @ ${sha7}`) } else console.log(`Trockenlauf fertig (nicht gepusht) @ ${sha7}`)
