import type { CmmsSnapshot, HighWater } from './types'
import { README_SHEET_TO_KIND } from './schema'

export type IdKind = keyof HighWater

const SPECS: Record<IdKind, { prefix: string; width: number }> = {
  asset: { prefix: 'AST', width: 4 },
  workOrder: { prefix: 'WO', width: 6 },
  pm: { prefix: 'PM', width: 4 },
  part: { prefix: 'PRT', width: 4 },
  technician: { prefix: 'TECH', width: 3 },
  location: { prefix: 'LOC', width: 4 },
}

export function formatId(kind: IdKind, n: number): string {
  const spec = SPECS[kind]
  return `${spec.prefix}-${String(n).padStart(spec.width, '0')}`
}

export function parseId(kind: IdKind, value: string | null | undefined): number | null {
  if (!value) return null
  const spec = SPECS[kind]
  const match = new RegExp(`^${spec.prefix}-(\\d+)$`, 'i').exec(value.trim())
  if (!match) return null
  return Number(match[1])
}

export function maxIdIn(kind: IdKind, ids: Array<string | null | undefined>): number {
  let max = 0
  for (const id of ids) {
    const n = parseId(kind, id)
    if (n != null && n > max) max = n
  }
  return max
}

export function emptyHighWater(): HighWater {
  return { asset: 0, workOrder: 0, pm: 0, part: 0, technician: 0, location: 0 }
}

export function raiseHighWater(base: HighWater, extra: HighWater): HighWater {
  const next = { ...base }
  for (const kind of Object.keys(SPECS) as IdKind[]) {
    next[kind] = Math.max(base[kind], extra[kind])
  }
  return next
}

/** Highest issued number from the records and the README "Next ID" column. Never lower than `floor`. */
export function computeHighWater(
  snap: Pick<
    CmmsSnapshot,
    | 'assets'
    | 'workOrders'
    | 'pmSchedules'
    | 'parts'
    | 'technicians'
    | 'locations'
    | 'readmeRows'
  >,
  floor: HighWater = emptyHighWater(),
): HighWater {
  const high = { ...floor }
  high.asset = Math.max(high.asset, maxIdIn('asset', snap.assets.map((row) => row.asset_id)))
  high.workOrder = Math.max(high.workOrder, maxIdIn('workOrder', snap.workOrders.map((row) => row.wo_id)))
  high.pm = Math.max(high.pm, maxIdIn('pm', snap.pmSchedules.map((row) => row.pm_id)))
  high.part = Math.max(high.part, maxIdIn('part', snap.parts.map((row) => row.part_id)))
  high.technician = Math.max(high.technician, maxIdIn('technician', snap.technicians.map((row) => row.tech_id)))
  high.location = Math.max(high.location, maxIdIn('location', snap.locations.map((row) => row.location_id)))

  for (const row of snap.readmeRows) {
    const sheet = row[1]
    const nextCell = row[4]
    if (typeof sheet !== 'string' || typeof nextCell !== 'string') continue
    const kind = README_SHEET_TO_KIND[sheet as keyof typeof README_SHEET_TO_KIND]
    if (!kind) continue
    const next = parseId(kind, nextCell)
    if (next != null) high[kind] = Math.max(high[kind], next - 1)
  }
  return high
}

export function allocate(kind: IdKind, highWater: HighWater, existingIds: Array<string | null | undefined>): {
  id: string
  highWater: HighWater
} {
  const n = Math.max(highWater[kind], maxIdIn(kind, existingIds)) + 1
  return { id: formatId(kind, n), highWater: { ...highWater, [kind]: n } }
}

export function readmeWithNextIds(rows: (string | null)[][], highWater: HighWater): (string | null)[][] {
  return rows.map((row) => {
    const sheet = row[1]
    if (typeof sheet !== 'string') return row.slice()
    const kind = README_SHEET_TO_KIND[sheet as keyof typeof README_SHEET_TO_KIND]
    if (!kind) return row.slice()
    const copy = row.slice()
    copy[4] = formatId(kind, highWater[kind] + 1)
    return copy
  })
}
