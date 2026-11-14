import { assetUrl, workOrderUrl } from './qr'
import { allocate } from './ids'
import { blankToNull } from './format'
import type {
  Asset,
  AssetInput,
  CmmsSnapshot,
  WoPart,
  WoPartInput,
  WorkOrder,
  WorkOrderInput,
} from './types'

function clean(value: string | null | undefined): string | null {
  return blankToNull(value ?? null)
}

function createsCycle(assets: Asset[], id: string, parentId: string): boolean {
  let cursor: string | null = parentId
  const seen = new Set<string>()
  while (cursor) {
    if (cursor === id || seen.has(cursor)) return true
    seen.add(cursor)
    const parent: string | null = assets.find((asset) => asset.asset_id === cursor)?.parent_asset_id ?? null
    cursor = parent
  }
  return false
}

export function applyAsset(
  snap: CmmsSnapshot,
  input: AssetInput,
  baseUrl: string,
): { snapshot: CmmsSnapshot; asset: Asset } {
  const name = input.name.trim()
  if (!name) throw new Error('Give the asset a name.')
  if (!input.location_id) throw new Error('Pick the location where this asset sits.')
  if (!snap.locations.some((location) => location.location_id === input.location_id)) {
    throw new Error('That location is not in the locations list.')
  }
  if (!input.category.trim()) throw new Error('Pick a category.')
  if (!input.criticality.trim()) throw new Error('Pick a criticality: A, B, or C.')
  if (!input.status.trim()) throw new Error('Pick a status.')

  let highWater = snap.highWater
  let assetId = input.asset_id.trim()
  const existing = assetId ? snap.assets.find((asset) => asset.asset_id === assetId) : undefined
  if (!assetId) {
    const allocated = allocate('asset', highWater, snap.assets.map((asset) => asset.asset_id))
    assetId = allocated.id
    highWater = allocated.highWater
  }

  const parentId = clean(input.parent_asset_id)
  if (parentId) {
    if (parentId === assetId) throw new Error('An asset cannot be its own parent.')
    if (!snap.assets.some((asset) => asset.asset_id === parentId)) {
      throw new Error('The parent asset was not found.')
    }
    if (createsCycle(snap.assets, assetId, parentId)) {
      throw new Error('That parent would make a loop in the equipment tree.')
    }
  }

  const asset: Asset = {
    asset_id: assetId,
    name,
    category: input.category.trim(),
    location_id: input.location_id,
    parent_asset_id: parentId,
    manufacturer: clean(input.manufacturer),
    model: clean(input.model),
    serial: clean(input.serial),
    install_date: clean(input.install_date),
    criticality: input.criticality.trim(),
    status: input.status.trim(),
    hp: input.hp,
    voltage: input.voltage,
    phase: clean(input.phase),
    fla_amps: input.fla_amps,
    rpm: input.rpm,
    design_psi: input.design_psi,
    capacity_gal: input.capacity_gal,
    qr_url: assetUrl(baseUrl, assetId),
    notes: clean(input.notes),
    data_flag: clean(input.data_flag) || existing?.data_flag || 'REAL',
  }

  const assets = existing
    ? snap.assets.map((row) => (row.asset_id === assetId ? asset : row))
    : [...snap.assets, asset]

  return { snapshot: { ...snap, assets, highWater }, asset }
}

export function applyWorkOrder(
  snap: CmmsSnapshot,
  input: WorkOrderInput,
  lines: WoPartInput[],
  baseUrl: string,
  now: string,
): { snapshot: CmmsSnapshot; workOrder: WorkOrder } {
  if (!input.asset_id) throw new Error('Pick the asset this job is for.')
  if (!snap.assets.some((asset) => asset.asset_id === input.asset_id)) {
    throw new Error('That asset was not found.')
  }
  if (!input.type.trim()) throw new Error('Pick a work order type.')
  if (!input.priority.trim()) throw new Error('Pick a priority.')
  if (!input.status.trim()) throw new Error('Pick a status.')
  const problem = input.problem.trim()
  if (!problem) throw new Error('Describe the problem in plain language.')
  if (input.labor_hours != null && input.labor_hours < 0) throw new Error('Labor hours cannot be negative.')
  if (input.downtime_minutes != null && input.downtime_minutes < 0) {
    throw new Error('Downtime minutes cannot be negative.')
  }
  if (input.status === 'complete' && !clean(input.action_taken)) {
    throw new Error('Write what you did before completing the job.')
  }

  let highWater = snap.highWater
  let woId = input.wo_id.trim()
  const existing = woId ? snap.workOrders.find((row) => row.wo_id === woId) : undefined
  if (!woId) {
    const allocated = allocate('workOrder', highWater, snap.workOrders.map((row) => row.wo_id))
    woId = allocated.id
    highWater = allocated.highWater
  }

  let completed = clean(input.completed)
  if (input.status === 'complete') {
    completed = completed || existing?.completed || now
  } else {
    completed = null
  }

  const dataFlag = clean(input.data_flag) || existing?.data_flag || 'REAL'
  const workOrder: WorkOrder = {
    wo_id: woId,
    asset_id: input.asset_id,
    type: input.type.trim(),
    priority: input.priority.trim(),
    status: input.status.trim(),
    requested_by: clean(input.requested_by),
    assigned_to: clean(input.assigned_to),
    created: clean(input.created) || existing?.created || now,
    due: clean(input.due),
    completed,
    problem,
    action_taken: clean(input.action_taken),
    labor_hours: input.labor_hours,
    downtime_minutes: input.downtime_minutes,
    pm_id: clean(input.pm_id),
    qr_url: workOrderUrl(baseUrl, woId),
    notes: clean(input.notes),
    data_flag: dataFlag,
  }

  const parts: WoPart[] = lines
    .filter((line) => line.part_id.trim())
    .map((line) => {
      if (!snap.parts.some((part) => part.part_id === line.part_id)) {
        throw new Error(`Part ${line.part_id} is not in the parts list.`)
      }
      if (line.qty != null && line.qty < 0) throw new Error('Part quantity cannot be negative.')
      if (line.cost != null && line.cost < 0) throw new Error('Part cost cannot be negative.')
      return {
        wo_id: woId,
        part_id: line.part_id.trim(),
        qty: line.qty,
        cost: line.cost,
        notes: clean(line.notes),
        data_flag: clean(line.data_flag) || dataFlag,
      }
    })

  const workOrders = existing
    ? snap.workOrders.map((row) => (row.wo_id === woId ? workOrder : row))
    : [...snap.workOrders, workOrder]
  const woParts = [...snap.woParts.filter((row) => row.wo_id !== woId), ...parts]

  return { snapshot: { ...snap, workOrders, woParts, highWater }, workOrder }
}
