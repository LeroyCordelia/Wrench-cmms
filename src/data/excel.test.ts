import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SHEET_NAMES } from '../domain/schema'
import { cloneSeed } from '../domain/seed'
import { snapshotFromWorkbook, workbookFromSnapshot } from './excel'
import * as XLSX from 'xlsx'

const template = readFileSync(new URL('../../public/CMMS_Data_Template.xlsx', import.meta.url))

function headersOf(book: XLSX.WorkBook, name: string): string[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1 })
  return (rows[0] ?? []).map((cell) => String(cell))
}

describe('excel workbook contract', () => {
  it('loads the template example rows', () => {
    const { snapshot } = snapshotFromWorkbook(template)
    const seed = cloneSeed()
    expect(snapshot.assets).toEqual(seed.assets)
    expect(snapshot.workOrders).toEqual(seed.workOrders)
    expect(snapshot.pmSchedules).toEqual(seed.pmSchedules)
    expect(snapshot.parts).toEqual(seed.parts)
    expect(snapshot.woParts).toEqual(seed.woParts)
    expect(snapshot.meterReadings).toEqual(seed.meterReadings)
    expect(snapshot.technicians).toEqual(seed.technicians)
    expect(snapshot.locations).toEqual(seed.locations)
    expect(snapshot.lists).toEqual(seed.lists)
    expect(snapshot.highWater).toEqual(seed.highWater)
    expect(snapshot.assets.find((asset) => asset.asset_id === 'AST-0002')?.hp).toBe(7.5)
    expect(snapshot.workOrders.find((row) => row.wo_id === 'WO-000001')?.created).toBe('11/12/2026 07:40')
  })

  it('exports the same sheet names and headers, then imports the edit', () => {
    const seed = cloneSeed()
    const bytes = workbookFromSnapshot(seed, 'https://cmms.local')
    const book = XLSX.read(bytes, { type: 'array', cellDates: true })
    expect(book.SheetNames.slice(0, SHEET_NAMES.length)).toEqual([...SHEET_NAMES])
    expect(book.SheetNames).toEqual([...SHEET_NAMES, 'PM_Tasks', 'WO_Tasks', 'Asset_Attributes'])
    const original = XLSX.read(template, { type: 'buffer', cellDates: true })
    for (const name of SHEET_NAMES) {
      if (name === 'README') continue
      expect(headersOf(book, name)).toEqual(headersOf(original, name))
    }
    const roundTrip = snapshotFromWorkbook(bytes)
    expect(roundTrip.snapshot.workOrders.map((row) => row.wo_id)).toEqual(seed.workOrders.map((row) => row.wo_id))
    expect(roundTrip.snapshot.assets.find((asset) => asset.asset_id === 'AST-0002')).toMatchObject({
      name: 'Rotary Filler',
      install_date: '04/15/2018',
      design_psi: 45,
      qr_url: 'https://cmms.local/a/AST-0002',
    })
    expect(roundTrip.snapshot.workOrders.find((row) => row.wo_id === 'WO-000004')?.priority).toBe('1 — Emergency')
    expect(roundTrip.snapshot.woTasks.map((task) => task.instruction)).toEqual(seed.woTasks.map((task) => task.instruction))
  })

  it('keeps unknown columns and checklist sheets on a round trip', () => {
    const { snapshot } = snapshotFromWorkbook(template)
    const asset = snapshot.assets[0]
    asset.extra = { shop_note: 'mezzanine' }
    snapshot.sheetColumns = {
      ...snapshot.sheetColumns,
      Assets: [...(snapshot.sheetColumns?.Assets ?? []), 'shop_note'],
      PM_Tasks: [
        'pm_id',
        'step_no',
        'parent_step_no',
        'level',
        'step_type',
        'instruction',
        'options',
        'instruction_limble_original',
        'limble_item_id',
        'data_flag',
      ],
    }
    snapshot.sheetOrder = [...(snapshot.sheetOrder ?? []), 'PM_Tasks']
    snapshot.pmTasks = [
      {
        pm_id: 'PM-0001',
        step_no: 1,
        parent_step_no: null,
        level: 0,
        step_type: 'checkbox',
        instruction: 'Check the oil level.',
        options: null,
        instruction_limble_original: null,
        limble_item_id: null,
        data_flag: 'EXAMPLE',
      },
    ]
    const bytes = workbookFromSnapshot(snapshot, 'https://cmms.local')
    const again = snapshotFromWorkbook(bytes)
    expect(again.snapshot.sheetColumns?.Assets).toContain('shop_note')
    expect(again.snapshot.assets[0].extra?.shop_note).toBe('mezzanine')
    expect(again.snapshot.pmTasks[0]?.instruction).toBe('Check the oil level.')
    const book = XLSX.read(bytes, { type: 'array' })
    expect(headersOf(book, 'Assets')).toContain('shop_note')
    expect(headersOf(book, 'PM_Tasks')[0]).toBe('pm_id')
  })
})

const limblePath = process.env.LIMBLE_WORKBOOK
describe.skipIf(!limblePath || !existsSync(limblePath))('limble workbook', () => {
  it('imports and exports without dropping sheets, headers, or cells', () => {
    const file = readFileSync(limblePath!)
    const first = snapshotFromWorkbook(file)
    const again = snapshotFromWorkbook(workbookFromSnapshot(first.snapshot, 'https://leroycordelia.github.io/Wrench-cmms'))
    expect(again.snapshot.sheetOrder).toEqual(first.snapshot.sheetOrder)
    expect(again.snapshot.sheetColumns).toEqual(first.snapshot.sheetColumns)
    expect(again.snapshot.assets).toEqual(first.snapshot.assets)
    expect(again.snapshot.workOrders).toEqual(first.snapshot.workOrders)
    expect(again.snapshot.pmSchedules).toEqual(first.snapshot.pmSchedules)
    expect(again.snapshot.pmTasks).toEqual(first.snapshot.pmTasks)
    expect(again.snapshot.woTasks).toEqual(first.snapshot.woTasks)
    expect(again.snapshot.assetAttributes).toEqual(first.snapshot.assetAttributes)
    expect(again.snapshot.meterReadings).toEqual(first.snapshot.meterReadings)
    expect(again.snapshot.technicians).toEqual(first.snapshot.technicians)
    expect(again.snapshot.locations).toEqual(first.snapshot.locations)
    expect(again.snapshot.parts).toEqual(first.snapshot.parts)
    expect(again.snapshot.woParts).toEqual(first.snapshot.woParts)
    expect(again.snapshot.lists).toEqual(first.snapshot.lists)
    expect(first.snapshot.assets.length).toBeGreaterThan(100)
    expect(first.snapshot.pmTasks.length).toBeGreaterThan(1000)
  })
})
