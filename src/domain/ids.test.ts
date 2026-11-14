import { describe, expect, it } from 'vitest'
import { allocate, computeHighWater, formatId, parseId } from './ids'
import { cloneSeed } from './seed'

describe('ids', () => {
  it('pads the workbook conventions and never reuses a number', () => {
    expect(formatId('asset', 6)).toBe('AST-0006')
    expect(formatId('workOrder', 6)).toBe('WO-000006')
    expect(formatId('technician', 6)).toBe('TECH-006')
    const seed = cloneSeed()
    const first = allocate('workOrder', seed.highWater, seed.workOrders.map((row) => row.wo_id))
    const second = allocate('workOrder', first.highWater, [...seed.workOrders.map((row) => row.wo_id), first.id])
    expect(first.id).toBe('WO-000006')
    expect(second.id).toBe('WO-000007')
    expect(parseId('workOrder', 'WO-000001')).toBe(1)
  })

  it('keeps a retired id retired when the README next-id is ahead of the rows', () => {
    const seed = cloneSeed()
    const readmeRows = seed.readmeRows.map((row) => (row[1] === 'WorkOrders' ? [...row.slice(0, 4), 'WO-000010'] : row.slice()))
    const high = computeHighWater({ ...seed, workOrders: seed.workOrders.filter((row) => row.wo_id !== 'WO-000005'), readmeRows })
    expect(high.workOrder).toBe(9)
    expect(allocate('workOrder', high, []).id).toBe('WO-000010')
  })
})
