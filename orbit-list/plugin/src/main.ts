import { mount } from 'svelte'
import './theme.css'
import App from './App.svelte'
import { configure } from './lib/conn.svelte'

// Standalone-Einstieg. Orbit nutzt stattdessen orbit/index.ts und mountet App in seine View.
configure({})
const app = mount(App, { target: document.getElementById('app')! })
export default app
