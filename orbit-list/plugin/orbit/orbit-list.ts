import { makePlugin } from './common'

// Standard-Plugin: Backend ist eingebaut (laeuft per Pyodide im Plugin), kein Server, kein Dialog.
export const manifest = {
  id: 'orbit-list',
  name: 'Orbit-List (Test)',
  version: '0.4.1',
  description: 'Anime-Tracker mit eigener offener Datenbank. Das Backend ist eingebaut und läuft auf dem Gerät — kein Server, keine Einrichtung. Beim ersten Start wird der Katalog geladen.',
  author: 'Entwicklerfuchs',
  main: 'main.js',
  type: 'gui',
  platforms: ['desktop', 'mobile', 'web'],
}

// Katalog (Anime ohne Nutzerdaten) kommt als Release-Datei der offenen Datenbank orbit-anime-db (HTTPS).
export default makePlugin(manifest.id, 'Orbit-List', { embedded: true, defaultServer: 'https://github.com/Entwicklerfuchs26/orbit-plugins/releases/download/orbit-list-catalog/catalog.db.gz' })
