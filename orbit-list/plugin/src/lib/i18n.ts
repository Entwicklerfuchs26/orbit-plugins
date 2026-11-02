// EINE Sprachdatei für ALLE Oberflächen-Texte von Orbitlist.
// Für eine andere Sprache: diese Datei von einer KI übersetzen lassen und ersetzen.
// (Inhaltsdaten wie Beschreibungen bleiben in Originalsprache — nur UI-Texte stehen hier.)

export const t = {
  nav: {
    home: 'Heim',
    browse: 'Entdecken',
    list: 'Meine Liste',
    favorites: 'Favoriten',
    profile: 'Profil',
    settings: 'Einstellungen',
  },
  // Watch-Status (AniList-Deutsch)
  status: {
    none: '—',
    all: 'Alle',
    watching: 'Beobachten',
    rewatching: 'Wiederanschauen',
    completed: 'Abgeschlossen',
    paused: 'Pausiert',
    dropped: 'Fallen Gelassen',
    planning: 'Planung',
  } as Record<string, string>,
  // Media-Format (AniList-Werte → Deutsch)
  format: {
    TV: 'Fernseher',
    TV_SHORT: 'TV-Kurzfilm',
    MOVIE: 'Film',
    SPECIAL: 'Spezial',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Musik',
  } as Record<string, string>,
  // Freigabe-Status (airing)
  releaseStatus: {
    RELEASING: 'Läuft',
    FINISHED: 'Abgeschlossen',
    NOT_YET_RELEASED: 'Angekündigt',
    CANCELLED: 'Abgebrochen',
    HIATUS: 'Pausiert',
  } as Record<string, string>,
  collection: { none: '—', wish: 'Wunsch', owned: 'Im Regal' } as Record<string, string>,
  // Browse-Entdecken-Reihen
  rows: {
    trending: 'Trending',
    popular: 'Beliebt',
    recent: 'Neu hinzugefügt',
    top100: 'Top 100',
    inProgress: 'In Bearbeitung',
    airing: 'Demnächst',
    activity: 'Aktivität',
    recentlyUpdated: 'Zuletzt aktualisiert',
    viewAll: 'Alle ansehen',
  },
  // Filter + Suche
  filter: {
    title: 'Filter',
    reset: 'Zurücksetzen',
    search: 'Suche',
    searchPlaceholder: 'Suche (Titel, auch Synonyme)…',
    aiPlaceholder: 'Beschreibe Story/Thema…',
    ai: 'KI',
    seen: 'Gesehen',
    seenAll: 'Alle',
    seenYes: 'Gesehen',
    seenNo: 'Nicht gesehen',
    genres: 'Genres',
    format: 'Format',
    releaseStatus: 'Freigabe-Status',
    year: 'Jahr',
    sort: 'Sortieren',
    dub: 'Synchro',
    dubOnly: 'nur mit dt. Dub',
    dubLang: 'Synchro-Sprache',
    score: 'Punktzahl',
    scoreAny: 'Alle Punkte',
    favorites: 'Favoriten',
  },
  sort: {
    popularity: 'Beliebtheit',
    score: 'Wertung',
    title: 'Titel A–Z',
    recent: 'Zuletzt aktualisiert',
  } as Record<string, string>,
  // Listen-Tabellenspalten
  cols: { title: 'Titel', score: 'Punktzahl', progress: 'Fortschritt', type: 'Typ' },
  // Detail
  detail: {
    addToList: 'Zur Liste hinzufügen',
    edit: 'Bearbeiten',
    favorite: 'Favorit',
    yourScore: 'Deine Wertung',
    status: 'Status',
    collection: 'Sammlung',
    note: 'Notiz',
    whereToWatch: 'Wo schauen',
    infoPages: 'Infoseiten',
    description: 'Beschreibung',
    startDate: 'Startdatum',
    endDate: 'Enddatum',
    repeats: 'Wiederholungen',
  },
  common: {
    save: 'Speichern',
    close: 'Schließen',
    loading: 'lädt…',
    emptyList: 'Noch keine Einträge in dieser Liste.',
    nothingFound: 'Nichts gefunden.',
    titlesTotal: (n: number) => `${n} Titel`,
    comingWithSync: 'Kommt mit Sync',
    lockedNeedsSync: 'Braucht zusätzlichen Sync',
  },
  languages: {
    german: 'Deutsch', english: 'Englisch', japanese: 'Japanisch', spanish: 'Spanisch',
    french: 'Französisch', italian: 'Italienisch', portuguese: 'Portug.', korean: 'Koreanisch', chinese: 'Chinesisch',
  } as Record<string, string>,
}

export type Strings = typeof t
export const DUB_LANGS: [string, string][] = Object.entries(t.languages)
