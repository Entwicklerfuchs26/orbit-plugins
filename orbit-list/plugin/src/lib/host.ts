// Element, auf dem Theme/Akzent gesetzt werden: standalone <html>, als Orbit-Plugin der eigene Container.
let el: HTMLElement | null = null
export const setHost = (e: HTMLElement | null) => { el = e }
export const hostEl = (): HTMLElement => el ?? document.documentElement
