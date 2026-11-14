import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createIndexedDbRepository } from './indexeddb'

describe('indexeddb repository', () => {
  it('seeds demo data on first open and keeps an edit', async () => {
    const repo = createIndexedDbRepository()
    const first = await repo.load()
    expect(first.assets.map((asset) => asset.asset_id)).toContain('AST-0001')
    const saved = await repo.saveAsset({
      ...first.assets[0],
      notes: 'Checked during the demo.',
    })
    expect(saved.asset.notes).toBe('Checked during the demo.')
    const again = await repo.load()
    expect(again.assets[0].notes).toBe('Checked during the demo.')
    const settings = await repo.getSettings()
    expect(settings.baseUrl).toBe('https://cmms.local')
  })
})
