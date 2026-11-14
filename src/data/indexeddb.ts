import { openDB, type IDBPDatabase } from 'idb'
import { nowPacific } from '../domain/dates'
import { raiseHighWater } from '../domain/ids'
import { applyAsset, applyWorkOrder, replaceWoTasks } from '../domain/mutate'
import { defaultBaseUrl } from '../domain/qr'
import { cloneSeed, normalizeSnapshot } from '../domain/seed'
import type { AppSettings, CmmsSnapshot } from '../domain/types'
import { snapshotFromWorkbook, workbookFromSnapshot } from './excel'
import type { CmmsRepository } from './repository'

const DB_NAME = 'wrench-cmms'
const DB_VERSION = 1

interface WrenchDb {
  snapshot: { key: string; value: CmmsSnapshot }
  settings: { key: string; value: AppSettings }
}

function defaultSettings(): AppSettings {
  return {
    baseUrl: defaultBaseUrl(),
    techId: 'TECH-001',
    hideExampleNote: false,
  }
}

async function database(): Promise<IDBPDatabase<WrenchDb>> {
  return openDB<WrenchDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshot')) db.createObjectStore('snapshot')
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
    },
  })
}

/**
 * Phone copy of the workbook. Swap this factory for a Graph Excel or Postgres
 * repository later; keep `CmmsRepository` as the screen-facing API.
 */
export function createIndexedDbRepository(): CmmsRepository {
  return {
    async load() {
      const db = await database()
      const existing = await db.get('snapshot', 'current')
      if (existing) return normalizeSnapshot(existing)
      const seed = cloneSeed()
      await db.put('snapshot', seed, 'current')
      return seed
    },
    async getSettings() {
      const db = await database()
      const existing = await db.get('settings', 'current')
      if (existing) return existing
      const settings = defaultSettings()
      await db.put('settings', settings, 'current')
      return settings
    },
    async saveSettings(settings) {
      const db = await database()
      await db.put('settings', settings, 'current')
    },
    async saveAsset(input) {
      const db = await database()
      const snap = (await db.get('snapshot', 'current')) ?? cloneSeed()
      const settings = (await db.get('settings', 'current')) ?? defaultSettings()
      const result = applyAsset(snap, input, settings.baseUrl)
      await db.put('snapshot', result.snapshot, 'current')
      return result
    },
    async saveWorkOrder(input, lines) {
      const db = await database()
      const snap = normalizeSnapshot((await db.get('snapshot', 'current')) ?? cloneSeed())
      const settings = (await db.get('settings', 'current')) ?? defaultSettings()
      const result = applyWorkOrder(snap, input, lines, settings.baseUrl, nowPacific())
      await db.put('snapshot', result.snapshot, 'current')
      return result
    },
    async saveWoTasks(woId, tasks) {
      const db = await database()
      const snap = normalizeSnapshot((await db.get('snapshot', 'current')) ?? cloneSeed())
      const next = replaceWoTasks(snap, woId, tasks)
      await db.put('snapshot', next, 'current')
      return next
    },
    async importWorkbook(data) {
      const db = await database()
      const current = (await db.get('snapshot', 'current')) ?? cloneSeed()
      const read = snapshotFromWorkbook(data)
      read.snapshot.highWater = raiseHighWater(current.highWater, read.snapshot.highWater)
      await db.put('snapshot', read.snapshot, 'current')
      return read
    },
    async exportWorkbook() {
      const db = await database()
      const snap = (await db.get('snapshot', 'current')) ?? cloneSeed()
      const settings = (await db.get('settings', 'current')) ?? defaultSettings()
      const bytes = workbookFromSnapshot(snap, settings.baseUrl)
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return new Blob([copy], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    },
    async resetDemo() {
      const db = await database()
      const seed = cloneSeed()
      await db.put('snapshot', seed, 'current')
      return seed
    },
  }
}
