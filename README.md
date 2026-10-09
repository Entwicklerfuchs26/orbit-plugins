# orbit-plugins

Der **Plugin-Store** für [Orbit](https://github.com/Entwicklerfuchs26/orbit).

Orbit selbst bringt keine Feature-Plugins mit — sie werden aus diesem Repo
nachgeladen. `registry.json` ist der Katalog (die App-Default-Quelle zeigt auf die
rohe Datei hier); pro Plugin liegt ein Ordner mit der gebauten `main.js` + `manifest.json`.

## Struktur

```
registry.json          # Katalog: { "plugins": [ { id, name, …, main } ] }
<plugin-id>/
  main.js              # eigenständiges ESM (bindet an globalThis.Orbit)
  manifest.json        # Metadaten + "main": "main.js"
```

`main`-Pfade in `registry.json` sind relativ und lösen gegen die registry-URL auf.

## Aktualisieren

Nicht von Hand bearbeiten — generiert aus dem Orbit-Quellcode:

```
# im orbit-Repo:
node scripts/assemble-registry.mjs
# → plugins-dist/registry/  (Inhalt hierher kopieren und pushen)
```

## Direkt-Link (ohne Katalog)

Im Orbit-Plugins-Bereich → Store → „Aus GitHub-Link laden" den rohen Link zu einer
`<plugin-id>/manifest.json` einfügen.
