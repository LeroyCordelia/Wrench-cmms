/** A workbook cell. Dates are stored as US strings; everything else keeps its number or text. */
export type Cell = string | number | null

/**
 * Column-for-column records. Names match the Excel workbook and stay stable for a later database.
 * Fields added for the Limble import are optional so an older workbook still loads.
 * `extra` holds any column the app does not have a name for, so export does not drop it.
 */

export interface Asset {
  asset_id: string
  name: string
  category: string
  location_id: string
  parent_asset_id: string | null
  manufacturer: string | null
  model: string | null
  serial: string | null
  install_date: string | null
  criticality: string
  status: string
  hp: number | null
  voltage: number | null
  phase: string | null
  fla_amps: number | null
  rpm: number | null
  design_psi: number | null
  capacity_gal: number | null
  qr_url: string
  notes: string | null
  data_flag: string
  limble_asset_id?: number | null
  location_detail?: string | null
  tree_level?: number | null
  extra?: Record<string, Cell>
}

export interface WorkOrder {
  wo_id: string
  asset_id: string
  type: string
  priority: string
  status: string
  requested_by: string | null
  assigned_to: string | null
  created: string | null
  due: string | null
  completed: string | null
  problem: string
  action_taken: string | null
  labor_hours: number | null
  downtime_minutes: number | null
  pm_id: string | null
  qr_url: string
  notes: string | null
  data_flag: string
  title?: string | null
  limble_task_id?: number | null
  limble_type?: string | null
  est_hours?: number | null
  requestor_email?: string | null
  scheduled_end?: string | null
  total_cost_usd?: number | null
  limble_history?: string | null
  extra?: Record<string, Cell>
}

export interface PmSchedule {
  pm_id: string
  asset_id: string
  task: string
  frequency_type: string
  interval: number | null
  unit: string | null
  last_done: string | null
  next_due: string | null
  est_hours: number | null
  sop_ref: string | null
  parts_kit: string | null
  notes: string | null
  data_flag: string
  limble_pm_id?: number | null
  description?: string | null
  assigned_to?: string | null
  schedule_rule?: string | null
  schedule_anchor?: string | null
  start_date?: string | null
  extra?: Record<string, Cell>
}

export interface PmTask {
  pm_id: string
  step_no: number | null
  parent_step_no: number | null
  level: number | null
  step_type: string | null
  instruction: string | null
  options: string | null
  instruction_limble_original: string | null
  limble_item_id: number | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface WoTask {
  wo_id: string
  step_no: number | null
  parent_step_no: number | null
  level: number | null
  step_type: string | null
  instruction: string | null
  options: string | null
  response: string | null
  instruction_limble_original: string | null
  limble_item_id: number | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface AssetAttribute {
  asset_id: string
  asset_name: string | null
  attribute: string
  value: Cell
  unit: string | null
  notes: string | null
  data_flag: string
  limble_asset_id?: number | null
  extra?: Record<string, Cell>
}

export interface Part {
  part_id: string
  description: string
  manufacturer: string | null
  mfr_part_no: string | null
  vendor: string | null
  vendor_part_no: string | null
  unit_cost_usd: number | null
  qty_on_hand: number | null
  min_qty: number | null
  reorder_qty: number | null
  bin_location: string | null
  used_on_asset_ids: string | null
  uom: string | null
  notes: string | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface WoPart {
  wo_id: string
  part_id: string
  qty: number | null
  cost: number | null
  notes: string | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface MeterReading {
  asset_id: string
  reading: number | null
  unit: string | null
  timestamp: string | null
  source: string | null
  notes: string | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface Technician {
  tech_id: string
  name: string
  craft: string | null
  shift: string | null
  phone: string | null
  active: string | null
  notes: string | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface Location {
  location_id: string
  name: string
  area_line: string | null
  notes: string | null
  data_flag: string
  extra?: Record<string, Cell>
}

export interface ListsBundle {
  headers: string[]
  rows: (string | null)[][]
}

export interface HighWater {
  asset: number
  workOrder: number
  pm: number
  part: number
  technician: number
  location: number
}

export interface CmmsSnapshot {
  assets: Asset[]
  workOrders: WorkOrder[]
  pmSchedules: PmSchedule[]
  parts: Part[]
  woParts: WoPart[]
  meterReadings: MeterReading[]
  technicians: Technician[]
  locations: Location[]
  lists: ListsBundle
  readmeRows: (string | null)[][]
  highWater: HighWater
  pmTasks: PmTask[]
  woTasks: WoTask[]
  assetAttributes: AssetAttribute[]
  /** Header row, in order, for each sheet last imported. Missing means "use the original template headers". */
  sheetColumns?: Record<string, string[]>
  /** Sheet order last imported, including README. */
  sheetOrder?: string[]
}

/** Device-local preferences. Not part of the shared workbook. */
export interface AppSettings {
  baseUrl: string
  techId: string | null
  hideExampleNote: boolean
}

export type AssetInput = Omit<Asset, 'qr_url'>
export type WorkOrderInput = Omit<WorkOrder, 'qr_url'>
export type WoPartInput = Omit<WoPart, 'wo_id'>
