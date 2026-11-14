import { nowPacific } from '../domain/dates'
import { raiseHighWater } from '../domain/ids'
import { applyAsset, applyWorkOrder } from '../domain/mutate'
import { cloneSeed } from '../domain/seed'
import type { AppSettings } from '../domain/types'
import { snapshotFromWorkbook, workbookFromSnapshot } from './excel'
import type { CmmsRepository } from './repository'

const DEFAULT_SETTINGS: AppSettings = {
  baseUrl: 'https://cmms.local',
  techId: 'TECH-001',
  hideExampleNote: false,
}

export function createMemoryRepository(
  initial = cloneSeed(),
  settings: AppSettings = DEFAULT_SETTINGS,
): CmmsRepository {
  let snap = initial
  let prefs = settings
  return {
    async load() {
      return structuredClone(snap)
    },
    async getSettings() {
      return structuredClone(prefs)
    },
    async saveSettings(next) {
      prefs = structuredClone(next)
    },
    async saveAsset(input) {
      const result = applyAsset(snap, input, prefs.baseUrl)
      snap = result.snapshot
      return { snapshot: structuredClone(snap), asset: result.asset }
    },
    async saveWorkOrder(input, lines) {
      const result = applyWorkOrder(snap, input, lines, prefs.baseUrl, nowPacific())
      snap = result.snapshot
      return { snapshot: structuredClone(snap), workOrder: result.workOrder }
    },
    async importWorkbook(data) {
      const read = snapshotFromWorkbook(data)
      read.snapshot.highWater = raiseHighWater(snap.highWater, read.snapshot.highWater)
      snap = read.snapshot
      return { snapshot: structuredClone(snap), warnings: read.warnings }
    },
    async exportWorkbook() {
      const bytes = workbookFromSnapshot(snap, prefs.baseUrl)
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return new Blob([copy], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    },
    async resetDemo() {
      snap = cloneSeed()
      return structuredClone(snap)
    },
  }
}
