import { makePlugin } from './common'

export const manifest = {
  id: 'orbit-list-connect',
  name: 'Orbit-List Connect (Test)',
  version: '0.6.1',
  description: 'Reines Frontend für mehrere Geräte: verbindet sich mit einem eigenen Orbit-List-Backend (Adresse:Port + Passwort). Das Backend kannst du selbst betreiben.',
  author: 'Entwicklerfuchs',
  main: 'main.js',
  type: 'gui',
  platforms: ['desktop', 'mobile', 'web'],
}

export default makePlugin(manifest.id, 'Orbit-List Connect')
