// Gemeinsamer KI-Zustand: steuert, ob der „KI"-Knopf in Entdecken/Meine Liste erscheint.
import { api } from '../api'

export const aiState = $state({ enabled: false, loaded: false })

export async function refreshAi() {
  try {
    const c = await api.aiConfig()
    aiState.enabled = !!c?.enabled
  } catch {
    aiState.enabled = false
  }
  aiState.loaded = true
}
