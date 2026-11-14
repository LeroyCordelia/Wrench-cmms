import * as XLSX from 'xlsx'
import {
  ASSET_HEADERS,
  DATETIME_FIELDS,
  DATE_ONLY_FIELDS,
  LOCATION_HEADERS,
  METER_HEADERS,
  NUMBER_FIELDS,
  PART_HEADERS,
  PM_HEADERS,
  SHEET_NAMES,
  TECH_HEADERS,
  WO_PART_HEADERS,
  WORK_ORDER_HEADERS,
} from '../domain/schema'
import { formatExcelDate, formatExcelSerial, usToExcelSerial } from '../domain/dates'
import { computeHighWater, readmeWithNextIds } from '../domain/ids'
import { assetUrl, workOrderUrl } from '../domain/qr'
import type {
  Asset,
  CmmsSnapshot,
  ListsBundle,
  Location,
  MeterReading,
  Part,
  PmSchedule,
  Technician,
  WoPart,
  WorkOrder,
} from '../domain/types'

export interface WorkbookRead {
  snapshot: CmmsSnapshot
  warnings: string[]
}

type Row = unknown[]

function sheetRows(book: XLSX.WorkBook, name: string): Row[] {
  const sheet = book.Sheets[name]
  if (!sheet) {
    throw new Error(`This workbook is missing the ${name} sheet.`)
  }
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  })
}

function headerIndex(rows: Row[], sheetName: string, expected: readonly string[]): Map<string, number> {
  const header = (rows[0] ?? []).map((cell) => (cell == null ? '' : String(cell).trim()))
  const missing = expected.filter((name) => !header.includes(name))
  if (missing.length) {
    throw new Error(
      `The ${sheetName} sheet is missing ${missing.join(', ')}. Leave the original column names in place.`,
    )
  }
  return new Map(header.map((name, index) => [name, index]))
}

function cell(row: Row, index: Map<string, number>, header: string): unknown {
  const at = index.get(header)
  if (at == null) return null
  return row[at] ?? null
}

function asText(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) return null
  const text = String(value).trim()
  return text ? text : null
}

function asNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function asDate(value: unknown, withTime: boolean): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatExcelDate(value, withTime)
  if (typeof value === 'number' && Number.isFinite(value)) return formatExcelSerial(value, withTime)
  const text = asText(value)
  if (!text) return null
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!match) return text
  const month = match[1].padStart(2, '0')
  const day = match[2].padStart(2, '0')
  const date = `${month}/${day}/${match[3]}`
  if (!withTime || !match[4]) return date
  return `${date} ${match[4].padStart(2, '0')}:${match[5]}`
}

function field(row: Row, index: Map<string, number>, header: string): string | number | null {
  const value = cell(row, index, header)
  if (DATE_ONLY_FIELDS.has(header)) return asDate(value, false)
  if (DATETIME_FIELDS.has(header)) return asDate(value, true)
  if (NUMBER_FIELDS.has(header)) return asNumber(value)
  return asText(value)
}

function isBlank(row: Row): boolean {
  return row.every((value) => value == null || String(value).trim() === '')
}

function readRecords<T>(
  book: XLSX.WorkBook,
  sheetName: string,
  headers: readonly string[],
  idHeader: string,
  warnings: string[],
  build: (values: Record<string, string | number | null>) => T,
): T[] {
  const rows = sheetRows(book, sheetName)
  const index = headerIndex(rows, sheetName, headers)
  const seen = new Set<string>()
  const records: T[] = []
  for (const row of rows.slice(1)) {
    if (isBlank(row)) continue
    const values: Record<string, string | number | null> = {}
    for (const header of headers) values[header] = field(row, index, header)
    const id = values[idHeader]
    if (typeof id !== 'string') continue
    if (seen.has(id)) {
      warnings.push(`${sheetName} lists ${id} more than once. Kept the first row.`)
      continue
    }
    seen.add(id)
    records.push(build(values))
  }
  return records
}

function str(values: Record<string, string | number | null>, key: string): string | null {
  const value = values[key]
  return typeof value === 'string' ? value : null
}

function req(values: Record<string, string | number | null>, key: string, fallback: string): string {
  return str(values, key) ?? fallback
}

function num(values: Record<string, string | number | null>, key: string): number | null {
  const value = values[key]
  return typeof value === 'number' ? value : null
}

function readLists(book: XLSX.WorkBook): ListsBundle {
  const rows = sheetRows(book, 'Lists')
  const headers = (rows[0] ?? []).map((cellValue) => (cellValue == null ? '' : String(cellValue).trim()))
  const body = rows.slice(1).map((row) =>
    headers.map((_, column) => {
      const value = row[column]
      if (value == null || value === '') return null
      return String(value).trim() || null
    }),
  )
  return { headers, rows: body }
}

function readReadme(book: XLSX.WorkBook): (string | null)[][] {
  const sheet = book.Sheets.README
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    raw: false,
    defval: null,
    blankrows: false,
  })
  const trimmed: (string | null)[][] = []
  for (const row of rows) {
    const values = [0, 1, 2, 3, 4].map((column) => {
      const value = row[column]
      if (value == null || value === '') return null
      return String(value)
    })
    trimmed.push(values)
  }
  while (trimmed.length && trimmed[trimmed.length - 1].every((value) => value == null)) trimmed.pop()
  return trimmed
}

export function snapshotFromWorkbook(data: ArrayBuffer | Uint8Array): WorkbookRead {
  let book: XLSX.WorkBook
  try {
    book = XLSX.read(data, { type: 'array', cellDates: true })
  } catch {
    throw new Error('That file could not be read as an Excel workbook (.xlsx).')
  }
  const warnings: string[] = []
  const assets = readRecords(book, 'Assets', ASSET_HEADERS, 'asset_id', warnings, (values): Asset => ({
    asset_id: req(values, 'asset_id', ''),
    name: req(values, 'name', req(values, 'asset_id', 'Unnamed asset')),
    category: req(values, 'category', 'other'),
    location_id: req(values, 'location_id', ''),
    parent_asset_id: str(values, 'parent_asset_id'),
    manufacturer: str(values, 'manufacturer'),
    model: str(values, 'model'),
    serial: str(values, 'serial'),
    install_date: str(values, 'install_date'),
    criticality: req(values, 'criticality', 'C'),
    status: req(values, 'status', 'in service'),
    hp: num(values, 'hp'),
    voltage: num(values, 'voltage'),
    phase: str(values, 'phase'),
    fla_amps: num(values, 'fla_amps'),
    rpm: num(values, 'rpm'),
    design_psi: num(values, 'design_psi'),
    capacity_gal: num(values, 'capacity_gal'),
    qr_url: str(values, 'qr_url') ?? '',
    notes: str(values, 'notes'),
    data_flag: req(values, 'data_flag', 'REAL'),
  }))
  const workOrders = readRecords(book, 'WorkOrders', WORK_ORDER_HEADERS, 'wo_id', warnings, (values): WorkOrder => ({
    wo_id: req(values, 'wo_id', ''),
    asset_id: req(values, 'asset_id', ''),
    type: req(values, 'type', 'corrective'),
    priority: req(values, 'priority', '3 — Normal'),
    status: req(values, 'status', 'open'),
    requested_by: str(values, 'requested_by'),
    assigned_to: str(values, 'assigned_to'),
    created: str(values, 'created'),
    due: str(values, 'due'),
    completed: str(values, 'completed'),
    problem: req(values, 'problem', ''),
    action_taken: str(values, 'action_taken'),
    labor_hours: num(values, 'labor_hours'),
    downtime_minutes: num(values, 'downtime_minutes'),
    pm_id: str(values, 'pm_id'),
    qr_url: str(values, 'qr_url') ?? '',
    notes: str(values, 'notes'),
    data_flag: req(values, 'data_flag', 'REAL'),
  }))
  const pmSchedules = readRecords(book, 'PM_Schedules', PM_HEADERS, 'pm_id', warnings, (values): PmSchedule => ({
    pm_id: req(values, 'pm_id', ''),
    asset_id: req(values, 'asset_id', ''),
    task: req(values, 'task', ''),
    frequency_type: req(values, 'frequency_type', 'calendar'),
    interval: num(values, 'interval'),
    unit: str(values, 'unit'),
    last_done: str(values, 'last_done'),
    next_due: str(values, 'next_due'),
    est_hours: num(values, 'est_hours'),
    sop_ref: str(values, 'sop_ref'),
    parts_kit: str(values, 'parts_kit'),
    notes: str(values, 'notes'),
    data_flag: req(values, 'data_flag', 'REAL'),
  }))
  const parts = readRecords(book, 'Parts', PART_HEADERS, 'part_id', warnings, (values): Part => ({
    part_id: req(values, 'part_id', ''),
    description: req(values, 'description', req(values, 'part_id', 'Part')),
    manufacturer: str(values, 'manufacturer'),
    mfr_part_no: str(values, 'mfr_part_no'),
    vendor: str(values, 'vendor'),
    vendor_part_no: str(values, 'vendor_part_no'),
    unit_cost_usd: num(values, 'unit_cost_usd'),
    qty_on_hand: num(values, 'qty_on_hand'),
    min_qty: num(values, 'min_qty'),
    reorder_qty: num(values, 'reorder_qty'),
    bin_location: str(values, 'bin_location'),
    used_on_asset_ids: str(values, 'used_on_asset_ids'),
    uom: str(values, 'uom'),
    notes: str(values, 'notes'),
    data_flag: req(values, 'data_flag', 'REAL'),
  }))
  const meterReadings = readMeterRows(book)
  const technicians = readRecords(book, 'Technicians', TECH_HEADERS, 'tech_id', warnings, (values): Technician => ({
    tech_id: req(values, 'tech_id', ''),
    name: req(values, 'name', req(values, 'tech_id', 'Technician')),
    craft: str(values, 'craft'),
    shift: str(values, 'shift'),
    phone: str(values, 'phone'),
    active: str(values, 'active'),
    notes: str(values, 'notes'),
    data_flag: req(values, 'data_flag', 'REAL'),
  }))
  const locations = readRecords(book, 'Locations', LOCATION_HEADERS, 'location_id', warnings, (values): Location => ({
    location_id: req(values, 'location_id', ''),
    name: req(values, 'name', req(values, 'location_id', 'Location')),
    area_line: str(values, 'area_line'),
    notes: str(values, 'notes'),
    data_flag: req(values, 'data_flag', 'REAL'),
  }))
  const woParts = readPartLines(book)
  const lists = readLists(book)
  const readmeRows = readReadme(book)
  const partial = {
    assets,
    workOrders,
    pmSchedules,
    parts,
    woParts,
    meterReadings,
    technicians,
    locations,
    lists,
    readmeRows,
  }
  return {
    snapshot: { ...partial, highWater: computeHighWater(partial) },
    warnings,
  }
}

function readMeterRows(book: XLSX.WorkBook): MeterReading[] {
  const rows = sheetRows(book, 'Meter_Readings')
  const index = headerIndex(rows, 'Meter_Readings', METER_HEADERS)
  const records: MeterReading[] = []
  for (const row of rows.slice(1)) {
    if (isBlank(row)) continue
    const values: Record<string, string | number | null> = {}
    for (const header of METER_HEADERS) values[header] = field(row, index, header)
    if (!str(values, 'asset_id')) continue
    records.push({
      asset_id: req(values, 'asset_id', ''),
      reading: num(values, 'reading'),
      unit: str(values, 'unit'),
      timestamp: str(values, 'timestamp'),
      source: str(values, 'source'),
      notes: str(values, 'notes'),
      data_flag: req(values, 'data_flag', 'REAL'),
    })
  }
  return records
}

function readPartLines(book: XLSX.WorkBook): WoPart[] {
  const rows = sheetRows(book, 'WO_Parts')
  const index = headerIndex(rows, 'WO_Parts', WO_PART_HEADERS)
  const records: WoPart[] = []
  for (const row of rows.slice(1)) {
    if (isBlank(row)) continue
    const values: Record<string, string | number | null> = {}
    for (const header of WO_PART_HEADERS) values[header] = field(row, index, header)
    if (!str(values, 'wo_id') || !str(values, 'part_id')) continue
    records.push({
      wo_id: req(values, 'wo_id', ''),
      part_id: req(values, 'part_id', ''),
      qty: num(values, 'qty'),
      cost: num(values, 'cost'),
      notes: str(values, 'notes'),
      data_flag: req(values, 'data_flag', 'REAL'),
    })
  }
  return records
}

function exportValue(_header: string, value: string | number | null): string | number | null {
  if (value == null || value === '') return null
  return value
}

function writeSheet(
  book: XLSX.WorkBook,
  name: string,
  headers: readonly string[],
  records: ReadonlyArray<object>,
): void {
  const body = records.map((record) =>
    headers.map((header) => {
      const value = (record as Record<string, string | number | null | undefined>)[header]
      return exportValue(header, value ?? null)
    }),
  )
  const sheet = XLSX.utils.aoa_to_sheet([Array.from(headers), ...body])
  headers.forEach((header, column) => {
    if (!DATE_ONLY_FIELDS.has(header) && !DATETIME_FIELDS.has(header)) return
    const withTime = DATETIME_FIELDS.has(header)
    for (let rowIndex = 0; rowIndex < body.length; rowIndex += 1) {
      const value = body[rowIndex][column]
      if (typeof value !== 'string' || !value.includes('/')) continue
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: column })
      sheet[address] = {
        t: 'n',
        v: usToExcelSerial(value),
        z: withTime ? 'mm/dd/yyyy hh:mm' : 'mm/dd/yyyy',
      }
    }
  })
  sheet['!cols'] = headers.map((header, column) => {
    let width = header.length
    for (const row of body.slice(0, 30)) {
      const value = row[column]
      if (value != null) width = Math.max(width, String(value).length)
    }
    return { wch: Math.min(46, Math.max(12, width + 2)) }
  })
  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
  XLSX.utils.book_append_sheet(book, sheet, name)
}

function writeReadme(book: XLSX.WorkBook, rows: (string | null)[][]): void {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 36 }, { wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(book, sheet, 'README')
}

function writeLists(book: XLSX.WorkBook, lists: ListsBundle): void {
  const rows = lists.rows.map((row) => lists.headers.map((_, index) => row[index] ?? null))
  const sheet = XLSX.utils.aoa_to_sheet([lists.headers, ...rows])
  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
  XLSX.utils.book_append_sheet(book, sheet, 'Lists')
}

export function workbookFromSnapshot(snapshot: CmmsSnapshot, baseUrl: string): Uint8Array {
  const book = XLSX.utils.book_new()
  book.Props = {
    Title: 'CMMS Data',
    Subject: 'Winery and bottling plant maintenance',
  }
  const assets = snapshot.assets.map((asset) => ({
    ...asset,
    qr_url: assetUrl(baseUrl, asset.asset_id),
  }))
  const workOrders = snapshot.workOrders.map((workOrder) => ({
    ...workOrder,
    qr_url: workOrderUrl(baseUrl, workOrder.wo_id),
  }))
  writeReadme(book, readmeWithNextIds(snapshot.readmeRows, snapshot.highWater))
  writeSheet(book, 'Assets', ASSET_HEADERS, assets)
  writeSheet(book, 'WorkOrders', WORK_ORDER_HEADERS, workOrders)
  writeSheet(book, 'PM_Schedules', PM_HEADERS, snapshot.pmSchedules)
  writeSheet(book, 'Parts', PART_HEADERS, snapshot.parts)
  writeSheet(book, 'WO_Parts', WO_PART_HEADERS, snapshot.woParts)
  writeSheet(book, 'Meter_Readings', METER_HEADERS, snapshot.meterReadings)
  writeSheet(book, 'Technicians', TECH_HEADERS, snapshot.technicians)
  writeSheet(book, 'Locations', LOCATION_HEADERS, snapshot.locations)
  writeLists(book, snapshot.lists)
  const missing = SHEET_NAMES.filter((name) => !book.SheetNames.includes(name))
  if (missing.length) throw new Error(`Export is missing ${missing.join(', ')}.`)
  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Uint8Array(out)
}
