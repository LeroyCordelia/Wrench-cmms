import { readFileSync } from 'node:fs'
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
    expect(book.SheetNames).toEqual([...SHEET_NAMES])
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
  })
})
