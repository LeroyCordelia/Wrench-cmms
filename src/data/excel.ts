import * as XLSX from 'xlsx'
import {
  ASSET_EXTENDED,
  ASSET_HEADERS,
  ATTRIBUTE_HEADERS,
  DATETIME_FIELDS,
  DATE_ONLY_FIELDS,
  LOCATION_HEADERS,
  METER_HEADERS,
  NUMBER_FIELDS,
  OPTIONAL_SHEETS,
  PART_HEADERS,
  PM_EXTENDED,
  PM_HEADERS,
  PM_TASK_HEADERS,
  SHEET_NAMES,
  TECH_HEADERS,
  WO_PART_HEADERS,
  WO_TASK_HEADERS,
  WORK_ORDER_EXTENDED,
  WORK_ORDER_HEADERS,
} from '../domain/schema'
import { formatExcelDate, formatExcelSerial, usToExcelSerial } from '../domain/dates'
import { computeHighWater, readmeWithNextIds } from '../domain/ids'
import { assetUrl, workOrderUrl } from '../domain/qr'
import type {
  Asset,
  AssetAttribute,
  Cell,
  CmmsSnapshot,
  ListsBundle,
  Location,
  MeterReading,
  Part,
  PmSchedule,
  PmTask,
  Technician,
  WoPart,
  WoTask,
  WorkOrder,
} from '../domain/types'

export interface WorkbookRead {
  snapshot: CmmsSnapshot
  warnings: string[]
}

type Row = unknown[]
type Table = { headers: string[]; rows: Record<string, Cell>[] }

const KNOWN = new Set<string>([
  ...ASSET_HEADERS,
  ...ASSET_EXTENDED,
  ...WORK_ORDER_HEADERS,
  ...WORK_ORDER_EXTENDED,
  ...PM_HEADERS,
  ...PM_EXTENDED,
  ...PART_HEADERS,
  ...WO_PART_HEADERS,
  ...METER_HEADERS,
  ...TECH_HEADERS,
  ...LOCATION_HEADERS,
  ...PM_TASK_HEADERS,
  ...WO_TASK_HEADERS,
  ...ATTRIBUTE_HEADERS,
])

function sheetRows(book: XLSX.WorkBook, name: string, blankrows: boolean): Row[] | null {
  const sheet = book.Sheets[name]
  if (!sheet) return null
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows,
  })
}

function isBlank(row: Row): boolean {
  return row.every((value) => value == null || String(value).trim() === '')
}

function rawCell(value: unknown): Cell {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const withTime = value.getHours() !== 0 || value.getMinutes() !== 0
    return formatExcelDate(value, withTime)
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value).trim()
  return text ? text : null
}

function asText(value: Cell | undefined): string | null {
  if (value == null || value === '') return null
  return typeof value === 'string' ? value : String(value)
}

function asNumber(value: Cell | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function coerce(header: string, value: unknown): Cell {
  if (header === 'value') return rawCell(value)
  if (value instanceof Date || (typeof value === 'number' && (DATE_ONLY_FIELDS.has(header) || DATETIME_FIELDS.has(header)))) {
    if (DATE_ONLY_FIELDS.has(header)) {
      if (value instanceof Date) return formatExcelDate(value, false)
      if (typeof value === 'number') return formatExcelSerial(value, false)
    }
    if (DATETIME_FIELDS.has(header)) {
      if (value instanceof Date) return formatExcelDate(value, true)
      if (typeof value === 'number') return formatExcelSerial(value, true)
    }
  }
  if (DATE_ONLY_FIELDS.has(header)) {
    const cell = rawCell(value)
    return typeof cell === 'string' ? cell.split(' ')[0] : cell
  }
  if (DATETIME_FIELDS.has(header)) return rawCell(value)
  if (NUMBER_FIELDS.has(header)) {
    const cell = rawCell(value)
    return asNumber(cell)
  }
  if (!KNOWN.has(header)) return rawCell(value)
  const cell = rawCell(value)
  return typeof cell === 'number' ? String(cell) : cell
}

function readTable(book: XLSX.WorkBook, name: string, required: readonly string[]): Table {
  const rows = sheetRows(book, name, false)
  if (!rows) throw new Error(`This workbook is missing the ${name} sheet.`)
  const headerRow = (rows[0] ?? []).map((cell) => (cell == null ? '' : String(cell).trim()))
  const missing = required.filter((header) => !headerRow.includes(header))
  if (missing.length) {
    throw new Error(`The ${name} sheet is missing ${missing.join(', ')}. Leave the original column names in place.`)
  }
  const headers: string[] = []
  const index = new Map<string, number>()
  headerRow.forEach((header, column) => {
    if (!header || index.has(header)) return
    index.set(header, column)
    headers.push(header)
  })
  const body: Record<string, Cell>[] = []
  for (const row of rows.slice(1)) {
    if (isBlank(row)) continue
    const record: Record<string, Cell> = {}
    for (const header of headers) record[header] = coerce(header, row[index.get(header)!])
    body.push(record)
  }
  return { headers, rows: body }
}

function optionalTable(book: XLSX.WorkBook, name: string, required: readonly string[]): Table | null {
  if (!book.Sheets[name]) return null
  return readTable(book, name, required)
}

function extras(row: Record<string, Cell>, headers: string[]): Record<string, Cell> | undefined {
  const extra: Record<string, Cell> = {}
  for (const header of headers) {
    if (!KNOWN.has(header) && row[header] != null) extra[header] = row[header]
  }
  return Object.keys(extra).length ? extra : undefined
}

function assign(target: object, row: Record<string, Cell>, headers: string[], keys: readonly string[]) {
  const record = target as Record<string, Cell>
  for (const key of keys) {
    if (!headers.includes(key)) continue
    record[key] = row[key] ?? null
  }
}

function text(row: Record<string, Cell>, key: string): string | null {
  return asText(row[key])
}

function num(row: Record<string, Cell>, key: string): number | null {
  return asNumber(row[key])
}

function readAssets(table: Table, warnings: string[]): Asset[] {
  const seen = new Set<string>()
  const assets: Asset[] = []
  for (const row of table.rows) {
    const assetId = text(row, 'asset_id')
    if (!assetId) continue
    if (seen.has(assetId)) {
      warnings.push(`Assets lists ${assetId} more than once. Kept the first row.`)
      continue
    }
    seen.add(assetId)
    const asset: Asset = {
      asset_id: assetId,
      name: text(row, 'name') ?? assetId,
      category: text(row, 'category') ?? '',
      location_id: text(row, 'location_id') ?? '',
      parent_asset_id: text(row, 'parent_asset_id'),
      manufacturer: text(row, 'manufacturer'),
      model: text(row, 'model'),
      serial: text(row, 'serial'),
      install_date: text(row, 'install_date'),
      criticality: text(row, 'criticality') ?? '',
      status: text(row, 'status') ?? '',
      hp: num(row, 'hp'),
      voltage: num(row, 'voltage'),
      phase: text(row, 'phase'),
      fla_amps: num(row, 'fla_amps'),
      rpm: num(row, 'rpm'),
      design_psi: num(row, 'design_psi'),
      capacity_gal: num(row, 'capacity_gal'),
      qr_url: text(row, 'qr_url') ?? '',
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    assign(asset, row, table.headers, ASSET_EXTENDED)
    const extra = extras(row, table.headers)
    if (extra) asset.extra = extra
    assets.push(asset)
  }
  return assets
}

function readWorkOrders(table: Table, warnings: string[]): WorkOrder[] {
  const seen = new Set<string>()
  const orders: WorkOrder[] = []
  for (const row of table.rows) {
    const woId = text(row, 'wo_id')
    if (!woId) continue
    if (seen.has(woId)) {
      warnings.push(`WorkOrders lists ${woId} more than once. Kept the first row.`)
      continue
    }
    seen.add(woId)
    const order: WorkOrder = {
      wo_id: woId,
      asset_id: text(row, 'asset_id') ?? '',
      type: text(row, 'type') ?? 'corrective',
      priority: text(row, 'priority') ?? '3 — Normal',
      status: text(row, 'status') ?? 'open',
      requested_by: text(row, 'requested_by'),
      assigned_to: text(row, 'assigned_to'),
      created: text(row, 'created'),
      due: text(row, 'due'),
      completed: text(row, 'completed'),
      problem: text(row, 'problem') ?? '',
      action_taken: text(row, 'action_taken'),
      labor_hours: num(row, 'labor_hours'),
      downtime_minutes: num(row, 'downtime_minutes'),
      pm_id: text(row, 'pm_id'),
      qr_url: text(row, 'qr_url') ?? '',
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    assign(order, row, table.headers, WORK_ORDER_EXTENDED)
    const extra = extras(row, table.headers)
    if (extra) order.extra = extra
    orders.push(order)
  }
  return orders
}

function readPms(table: Table, warnings: string[]): PmSchedule[] {
  const seen = new Set<string>()
  const schedules: PmSchedule[] = []
  for (const row of table.rows) {
    const pmId = text(row, 'pm_id')
    if (!pmId) continue
    if (seen.has(pmId)) {
      warnings.push(`PM_Schedules lists ${pmId} more than once. Kept the first row.`)
      continue
    }
    seen.add(pmId)
    const schedule: PmSchedule = {
      pm_id: pmId,
      asset_id: text(row, 'asset_id') ?? '',
      task: text(row, 'task') ?? '',
      frequency_type: text(row, 'frequency_type') ?? 'calendar',
      interval: num(row, 'interval'),
      unit: text(row, 'unit'),
      last_done: text(row, 'last_done'),
      next_due: text(row, 'next_due'),
      est_hours: num(row, 'est_hours'),
      sop_ref: text(row, 'sop_ref'),
      parts_kit: text(row, 'parts_kit'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    assign(schedule, row, table.headers, PM_EXTENDED)
    const extra = extras(row, table.headers)
    if (extra) schedule.extra = extra
    schedules.push(schedule)
  }
  return schedules
}

function readParts(table: Table, warnings: string[]): Part[] {
  const seen = new Set<string>()
  const parts: Part[] = []
  for (const row of table.rows) {
    const partId = text(row, 'part_id')
    if (!partId) continue
    if (seen.has(partId)) {
      warnings.push(`Parts lists ${partId} more than once. Kept the first row.`)
      continue
    }
    seen.add(partId)
    const part: Part = {
      part_id: partId,
      description: text(row, 'description') ?? partId,
      manufacturer: text(row, 'manufacturer'),
      mfr_part_no: text(row, 'mfr_part_no'),
      vendor: text(row, 'vendor'),
      vendor_part_no: text(row, 'vendor_part_no'),
      unit_cost_usd: num(row, 'unit_cost_usd'),
      qty_on_hand: num(row, 'qty_on_hand'),
      min_qty: num(row, 'min_qty'),
      reorder_qty: num(row, 'reorder_qty'),
      bin_location: text(row, 'bin_location'),
      used_on_asset_ids: text(row, 'used_on_asset_ids'),
      uom: text(row, 'uom'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) part.extra = extra
    parts.push(part)
  }
  return parts
}

function readWoParts(table: Table): WoPart[] {
  const lines: WoPart[] = []
  for (const row of table.rows) {
    const woId = text(row, 'wo_id')
    const partId = text(row, 'part_id')
    if (!woId || !partId) continue
    const line: WoPart = {
      wo_id: woId,
      part_id: partId,
      qty: num(row, 'qty'),
      cost: num(row, 'cost'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) line.extra = extra
    lines.push(line)
  }
  return lines
}

function readMeters(table: Table): MeterReading[] {
  const readings: MeterReading[] = []
  for (const row of table.rows) {
    const assetId = text(row, 'asset_id')
    if (!assetId) continue
    const reading: MeterReading = {
      asset_id: assetId,
      reading: num(row, 'reading'),
      unit: text(row, 'unit'),
      timestamp: text(row, 'timestamp'),
      source: text(row, 'source'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) reading.extra = extra
    readings.push(reading)
  }
  return readings
}

function readTechs(table: Table, warnings: string[]): Technician[] {
  const seen = new Set<string>()
  const people: Technician[] = []
  for (const row of table.rows) {
    const techId = text(row, 'tech_id')
    if (!techId) continue
    if (seen.has(techId)) {
      warnings.push(`Technicians lists ${techId} more than once. Kept the first row.`)
      continue
    }
    seen.add(techId)
    const tech: Technician = {
      tech_id: techId,
      name: text(row, 'name') ?? techId,
      craft: text(row, 'craft'),
      shift: text(row, 'shift'),
      phone: text(row, 'phone'),
      active: text(row, 'active'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) tech.extra = extra
    people.push(tech)
  }
  return people
}

function readLocations(table: Table, warnings: string[]): Location[] {
  const seen = new Set<string>()
  const locations: Location[] = []
  for (const row of table.rows) {
    const locationId = text(row, 'location_id')
    if (!locationId) continue
    if (seen.has(locationId)) {
      warnings.push(`Locations lists ${locationId} more than once. Kept the first row.`)
      continue
    }
    seen.add(locationId)
    const location: Location = {
      location_id: locationId,
      name: text(row, 'name') ?? locationId,
      area_line: text(row, 'area_line'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) location.extra = extra
    locations.push(location)
  }
  return locations
}

function readPmTasks(table: Table): PmTask[] {
  const tasks: PmTask[] = []
  for (const row of table.rows) {
    const pmId = text(row, 'pm_id')
    if (!pmId) continue
    const task: PmTask = {
      pm_id: pmId,
      step_no: num(row, 'step_no'),
      parent_step_no: num(row, 'parent_step_no'),
      level: num(row, 'level'),
      step_type: text(row, 'step_type'),
      instruction: text(row, 'instruction'),
      options: text(row, 'options'),
      instruction_limble_original: text(row, 'instruction_limble_original'),
      limble_item_id: num(row, 'limble_item_id'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) task.extra = extra
    tasks.push(task)
  }
  return tasks
}

function readWoTasks(table: Table): WoTask[] {
  const tasks: WoTask[] = []
  for (const row of table.rows) {
    const woId = text(row, 'wo_id')
    if (!woId) continue
    const task: WoTask = {
      wo_id: woId,
      step_no: num(row, 'step_no'),
      parent_step_no: num(row, 'parent_step_no'),
      level: num(row, 'level'),
      step_type: text(row, 'step_type'),
      instruction: text(row, 'instruction'),
      options: text(row, 'options'),
      response: text(row, 'response'),
      instruction_limble_original: text(row, 'instruction_limble_original'),
      limble_item_id: num(row, 'limble_item_id'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    const extra = extras(row, table.headers)
    if (extra) task.extra = extra
    tasks.push(task)
  }
  return tasks
}

function readAttributes(table: Table): AssetAttribute[] {
  const attributes: AssetAttribute[] = []
  for (const row of table.rows) {
    const assetId = text(row, 'asset_id')
    const attribute = text(row, 'attribute')
    if (!assetId || !attribute) continue
    const record: AssetAttribute = {
      asset_id: assetId,
      asset_name: text(row, 'asset_name'),
      attribute,
      value: row.value ?? null,
      unit: text(row, 'unit'),
      notes: text(row, 'notes'),
      data_flag: text(row, 'data_flag') ?? 'REAL',
    }
    assign(record, row, table.headers, ['limble_asset_id'])
    const extra = extras(row, table.headers)
    if (extra) record.extra = extra
    attributes.push(record)
  }
  return attributes
}

function readLists(book: XLSX.WorkBook): ListsBundle {
  const rows = sheetRows(book, 'Lists', false)
  if (!rows) return { headers: [], rows: [] }
  const headers = (rows[0] ?? []).map((cell) => (cell == null ? '' : String(cell).trim())).filter(Boolean)
  const body = rows.slice(1).filter((row) => !isBlank(row)).map((row) =>
    headers.map((_, column) => {
      const value = row[column]
      if (value == null || value === '') return null
      return String(value).trim() || null
    }),
  )
  return { headers, rows: body }
}

function readReadme(book: XLSX.WorkBook): (string | null)[][] {
  const rows = sheetRows(book, 'README', false)
  if (!rows) return []
  const trimmed = rows.map((row) =>
    [0, 1, 2, 3, 4].map((column) => {
      const value = row[column]
      if (value == null || value === '') return null
      return String(value)
    }),
  )
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
  const assetsTable = readTable(book, 'Assets', ASSET_HEADERS)
  const workTable = readTable(book, 'WorkOrders', WORK_ORDER_HEADERS)
  const pmTable = readTable(book, 'PM_Schedules', PM_HEADERS)
  const partTable = readTable(book, 'Parts', PART_HEADERS)
  const woPartTable = readTable(book, 'WO_Parts', WO_PART_HEADERS)
  const meterTable = readTable(book, 'Meter_Readings', METER_HEADERS)
  const techTable = readTable(book, 'Technicians', TECH_HEADERS)
  const locationTable = readTable(book, 'Locations', LOCATION_HEADERS)
  const pmTaskTable = optionalTable(book, 'PM_Tasks', PM_TASK_HEADERS)
  const woTaskTable = optionalTable(book, 'WO_Tasks', WO_TASK_HEADERS)
  const attributeTable = optionalTable(book, 'Asset_Attributes', ATTRIBUTE_HEADERS)
  const sheetColumns: Record<string, string[]> = {
    Assets: assetsTable.headers,
    WorkOrders: workTable.headers,
    PM_Schedules: pmTable.headers,
    Parts: partTable.headers,
    WO_Parts: woPartTable.headers,
    Meter_Readings: meterTable.headers,
    Technicians: techTable.headers,
    Locations: locationTable.headers,
  }
  if (pmTaskTable) sheetColumns.PM_Tasks = pmTaskTable.headers
  if (woTaskTable) sheetColumns.WO_Tasks = woTaskTable.headers
  if (attributeTable) sheetColumns.Asset_Attributes = attributeTable.headers
  const lists = readLists(book)
  if (lists.headers.length) sheetColumns.Lists = lists.headers
  const partial = {
    assets: readAssets(assetsTable, warnings),
    workOrders: readWorkOrders(workTable, warnings),
    pmSchedules: readPms(pmTable, warnings),
    parts: readParts(partTable, warnings),
    woParts: readWoParts(woPartTable),
    meterReadings: readMeters(meterTable),
    technicians: readTechs(techTable, warnings),
    locations: readLocations(locationTable, warnings),
    lists,
    readmeRows: readReadme(book),
    pmTasks: pmTaskTable ? readPmTasks(pmTaskTable) : [],
    woTasks: woTaskTable ? readWoTasks(woTaskTable) : [],
    assetAttributes: attributeTable ? readAttributes(attributeTable) : [],
    sheetColumns,
    sheetOrder: book.SheetNames.slice(),
  }
  return { snapshot: { ...partial, highWater: computeHighWater(partial) }, warnings }
}

function cellOf(record: object, header: string): Cell {
  const bag = record as Record<string, unknown>
  if (header !== 'extra' && Object.prototype.hasOwnProperty.call(bag, header)) {
    const value = bag[header]
    if (value == null) return null
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  const extra = bag.extra
  if (extra && typeof extra === 'object' && header in (extra as Record<string, Cell>)) {
    return (extra as Record<string, Cell>)[header] ?? null
  }
  return null
}

function wholeDate(value: string): 'date' | 'datetime' | null {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return 'date'
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(value)) return 'datetime'
  return null
}

function headersFor(snapshot: CmmsSnapshot, name: string, canonical: readonly string[], records: readonly object[]): string[] {
  const stored = snapshot.sheetColumns?.[name]
  if (stored?.length) {
    const have = new Set(stored)
    const added = canonical.filter((header) => !have.has(header) && records.some((record) => cellOf(record, header) != null))
    return [...stored, ...added]
  }
  const extra = new Set<string>()
  for (const record of records) {
    const bag = (record as { extra?: Record<string, Cell> }).extra
    if (!bag) continue
    for (const key of Object.keys(bag)) extra.add(key)
  }
  return [...canonical, ...extra]
}

function writeSheet(book: XLSX.WorkBook, name: string, headers: string[], records: readonly object[]) {
  const body = records.map((record) => headers.map((header) => cellOf(record, header)))
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body])
  headers.forEach((header, column) => {
    for (let rowIndex = 0; rowIndex < body.length; rowIndex += 1) {
      const value = body[rowIndex][column]
      if (typeof value !== 'string') continue
      const kind = DATE_ONLY_FIELDS.has(header)
        ? 'date'
        : DATETIME_FIELDS.has(header)
          ? 'datetime'
          : wholeDate(value)
      if (!kind) continue
      if (kind === 'date' && value.includes(' ')) continue
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: column })
      sheet[address] = {
        t: 'n',
        v: usToExcelSerial(value),
        z: kind === 'datetime' ? 'mm/dd/yyyy hh:mm' : 'mm/dd/yyyy',
      }
    }
  })
  sheet['!cols'] = headers.map((header, column) => {
    let width = header.length
    for (const row of body.slice(0, 40)) {
      const value = row[column]
      if (value != null) width = Math.max(width, String(value).length)
    }
    return { wch: Math.min(48, Math.max(12, width + 2)) }
  })
  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
  XLSX.utils.book_append_sheet(book, sheet, name)
}

function writeReadme(book: XLSX.WorkBook, rows: (string | null)[][]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 36 }, { wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(book, sheet, 'README')
}

function writeLists(book: XLSX.WorkBook, lists: ListsBundle) {
  const rows = lists.rows.map((row) => lists.headers.map((_, index) => row[index] ?? null))
  const sheet = XLSX.utils.aoa_to_sheet([lists.headers, ...rows])
  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
  XLSX.utils.book_append_sheet(book, sheet, 'Lists')
}

function recordsFor(snapshot: CmmsSnapshot, name: string): object[] {
  switch (name) {
    case 'Assets':
      return snapshot.assets.map((asset) => ({ ...asset, qr_url: asset.qr_url }))
    case 'WorkOrders':
      return snapshot.workOrders
    case 'PM_Schedules':
      return snapshot.pmSchedules
    case 'Parts':
      return snapshot.parts
    case 'WO_Parts':
      return snapshot.woParts
    case 'Meter_Readings':
      return snapshot.meterReadings
    case 'Technicians':
      return snapshot.technicians
    case 'Locations':
      return snapshot.locations
    case 'PM_Tasks':
      return snapshot.pmTasks ?? []
    case 'WO_Tasks':
      return snapshot.woTasks ?? []
    case 'Asset_Attributes':
      return snapshot.assetAttributes ?? []
    default:
      return []
  }
}

const CANONICAL: Record<string, readonly string[]> = {
  Assets: ASSET_HEADERS,
  WorkOrders: WORK_ORDER_HEADERS,
  PM_Schedules: PM_HEADERS,
  Parts: PART_HEADERS,
  WO_Parts: WO_PART_HEADERS,
  Meter_Readings: METER_HEADERS,
  Technicians: TECH_HEADERS,
  Locations: LOCATION_HEADERS,
  PM_Tasks: PM_TASK_HEADERS,
  WO_Tasks: WO_TASK_HEADERS,
  Asset_Attributes: ATTRIBUTE_HEADERS,
}

export function workbookFromSnapshot(snapshot: CmmsSnapshot, baseUrl: string): Uint8Array {
  const book = XLSX.utils.book_new()
  book.Props = { Title: 'CMMS Data', Subject: 'Winery and bottling plant maintenance' }
  const assets = snapshot.assets.map((asset) => ({ ...asset, qr_url: assetUrl(baseUrl, asset.asset_id) }))
  const workOrders = snapshot.workOrders.map((workOrder) => ({
    ...workOrder,
    qr_url: workOrderUrl(baseUrl, workOrder.wo_id),
  }))
  const withLinks: CmmsSnapshot = { ...snapshot, assets, workOrders }
  const optional = OPTIONAL_SHEETS.filter((name) => (recordsFor(withLinks, name).length > 0) || snapshot.sheetColumns?.[name])
  const order = snapshot.sheetOrder?.length ? snapshot.sheetOrder.slice() : [...SHEET_NAMES, ...optional]
  for (const name of SHEET_NAMES) if (!order.includes(name)) order.push(name)
  for (const name of optional) if (!order.includes(name)) order.push(name)
  for (const name of order) {
    if (name === 'README') {
      writeReadme(book, readmeWithNextIds(snapshot.readmeRows, snapshot.highWater))
      continue
    }
    if (name === 'Lists') {
      writeLists(book, snapshot.lists)
      continue
    }
    const canonical = CANONICAL[name]
    if (!canonical) continue
    const records = name === 'Assets' ? assets : name === 'WorkOrders' ? workOrders : recordsFor(withLinks, name)
    if (!snapshot.sheetColumns?.[name] && records.length === 0 && !SHEET_NAMES.includes(name as (typeof SHEET_NAMES)[number])) continue
    writeSheet(book, name, headersFor(withLinks, name, canonical, records), records)
  }
  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Uint8Array(out)
}
