import { describe, expect, it } from 'vitest'
import { assetUrl, parseScan, workOrderUrl } from './qr'

describe('qr', () => {
  it('builds stable /a and /w paths', () => {
    expect(assetUrl('https://cmms.local/', 'AST-0001')).toBe('https://cmms.local/a/AST-0001')
    expect(workOrderUrl('https://leroycordelia.github.io/Wrench-cmms', 'WO-000001')).toBe(
      'https://leroycordelia.github.io/Wrench-cmms/w/WO-000001',
    )
  })

  it('reads labels, bare ids, and GitHub Pages urls', () => {
    expect(parseScan('https://cmms.local/a/AST-0002')).toEqual({ kind: 'asset', id: 'AST-0002' })
    expect(parseScan('https://leroycordelia.github.io/Wrench-cmms/w/WO-000001?x=1')).toEqual({
      kind: 'work',
      id: 'WO-000001',
    })
    expect(parseScan('ast-0001')).toEqual({ kind: 'asset', id: 'AST-0001' })
    expect(parseScan('WO-000004')).toEqual({ kind: 'work', id: 'WO-000004' })
    expect(parseScan('https://example.com/about')).toBeNull()
    expect(parseScan('not a label')).toBeNull()
  })
})
