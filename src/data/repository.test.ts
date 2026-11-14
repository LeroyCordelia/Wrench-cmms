import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WORK_ORDER_HEADERS } from '../domain/schema'
import type { WorkOrderInput } from '../domain/types'
import * as XLSX from 'xlsx'
import { snapshotFromWorkbook } from './excel'
import { createMemoryRepository } from './memory'

function newJob(overrides: Partial<WorkOrderInput> = {}): WorkOrderInput {
  return {
    wo_id: '',
    asset_id: 'AST-0002',
    type: 'corrective',
    priority: '3 — Normal',
    status: 'open',
    requested_by: 'LeRoy Werstler',
    assigned_to: 'LeRoy Werstler',
    created: null,
    due: '11/20/2026 16:00',
    completed: null,
    problem: 'Test leak at the filler bowl.',
    action_taken: null,
    labor_hours: null,
    downtime_minutes: null,
    pm_id: null,
    notes: null,
    data_flag: 'REAL',
    ...overrides,
  }
}

describe('repository', () => {
  it('creates and edits a work order without reusing ids, then exports it', async () => {
    const repo = createMemoryRepository()
    const created = await repo.saveWorkOrder(newJob(), [
      { part_id: 'PRT-0001', qty: 1, cost: 286.5, notes: null, data_flag: 'REAL' },
    ])
    expect(created.workOrder.wo_id).toBe('WO-000006')
    expect(created.workOrder.qr_url).toBe('https://cmms.local/w/WO-000006')

    const edited = await repo.saveWorkOrder(
      {
        ...created.workOrder,
        status: 'in progress',
        action_taken: 'Tightened the bowl clamp.',
        labor_hours: 0.5,
        downtime_minutes: 15,
      },
      [{ part_id: 'PRT-0001', qty: 1, cost: 286.5, notes: 'Staged', data_flag: 'REAL' }],
    )
    expect(edited.workOrder.wo_id).toBe('WO-000006')
    expect(edited.snapshot.workOrders.filter((row) => row.wo_id === 'WO-000006')).toHaveLength(1)
    expect(edited.snapshot.woParts.filter((row) => row.wo_id === 'WO-000006').map((row) => row.notes)).toEqual(['Staged'])

    const completed = await repo.saveWorkOrder(
      { ...edited.workOrder, status: 'complete', action_taken: 'Replaced the clamp and dry-tested at 45 psi.' },
      edited.snapshot.woParts.filter((row) => row.wo_id === 'WO-000006'),
    )
    expect(completed.workOrder.status).toBe('complete')
    expect(completed.workOrder.completed).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

    const next = await repo.saveWorkOrder(newJob({ problem: 'Second job' }), [])
    expect(next.workOrder.wo_id).toBe('WO-000007')

    const blob = await repo.exportWorkbook()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const imported = snapshotFromWorkbook(bytes)
    expect(imported.snapshot.workOrders.map((row) => row.wo_id)).toContain('WO-000006')
    const book = XLSX.read(bytes, { type: 'array' })
    const readme = XLSX.utils.sheet_to_json<string[]>(book.Sheets.README, { header: 1, raw: false })
    const nextRow = readme.find((row) => row[1] === 'WorkOrders')
    expect(nextRow?.[4]).toBe('WO-000008')
    const headers = XLSX.utils.sheet_to_json<string[]>(book.Sheets.WorkOrders, { header: 1 })[0]
    expect(headers).toEqual([...WORK_ORDER_HEADERS])
  })

  it('keeps a retired id retired when an older workbook is loaded', async () => {
    const repo = createMemoryRepository()
    await repo.saveWorkOrder(newJob(), [])
    const template = readFileSync(new URL('../../public/CMMS_Data_Template.xlsx', import.meta.url))
    await repo.importWorkbook(template)
    const next = await repo.saveWorkOrder(newJob({ problem: 'After the import.' }), [])
    expect(next.workOrder.wo_id).toBe('WO-000007')
    expect(next.snapshot.workOrders.some((row) => row.wo_id === 'WO-000006')).toBe(false)
  })

  it('refuses to complete a job with no action taken', async () => {
    const repo = createMemoryRepository()
    await expect(repo.saveWorkOrder(newJob({ status: 'complete', action_taken: '   ' }), [])).rejects.toThrow(
      /what you did/i,
    )
  })
})
