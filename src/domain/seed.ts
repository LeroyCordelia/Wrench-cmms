import raw from './seed.json'
import type { CmmsSnapshot } from './types'

export const seedSnapshot = raw as CmmsSnapshot

export function cloneSeed(): CmmsSnapshot {
  return structuredClone(seedSnapshot)
}
