export const SHEET_NAMES = [
  'README',
  'Assets',
  'WorkOrders',
  'PM_Schedules',
  'Parts',
  'WO_Parts',
  'Meter_Readings',
  'Technicians',
  'Locations',
  'Lists',
] as const

export const ASSET_HEADERS = [
  'asset_id',
  'name',
  'category',
  'location_id',
  'parent_asset_id',
  'manufacturer',
  'model',
  'serial',
  'install_date',
  'criticality',
  'status',
  'hp',
  'voltage',
  'phase',
  'fla_amps',
  'rpm',
  'design_psi',
  'capacity_gal',
  'qr_url',
  'notes',
  'data_flag',
] as const

export const WORK_ORDER_HEADERS = [
  'wo_id',
  'asset_id',
  'type',
  'priority',
  'status',
  'requested_by',
  'assigned_to',
  'created',
  'due',
  'completed',
  'problem',
  'action_taken',
  'labor_hours',
  'downtime_minutes',
  'pm_id',
  'qr_url',
  'notes',
  'data_flag',
] as const

export const PM_HEADERS = [
  'pm_id',
  'asset_id',
  'task',
  'frequency_type',
  'interval',
  'unit',
  'last_done',
  'next_due',
  'est_hours',
  'sop_ref',
  'parts_kit',
  'notes',
  'data_flag',
] as const

export const PART_HEADERS = [
  'part_id',
  'description',
  'manufacturer',
  'mfr_part_no',
  'vendor',
  'vendor_part_no',
  'unit_cost_usd',
  'qty_on_hand',
  'min_qty',
  'reorder_qty',
  'bin_location',
  'used_on_asset_ids',
  'uom',
  'notes',
  'data_flag',
] as const

export const WO_PART_HEADERS = ['wo_id', 'part_id', 'qty', 'cost', 'notes', 'data_flag'] as const

export const METER_HEADERS = [
  'asset_id',
  'reading',
  'unit',
  'timestamp',
  'source',
  'notes',
  'data_flag',
] as const

export const TECH_HEADERS = [
  'tech_id',
  'name',
  'craft',
  'shift',
  'phone',
  'active',
  'notes',
  'data_flag',
] as const

export const LOCATION_HEADERS = ['location_id', 'name', 'area_line', 'notes', 'data_flag'] as const

export const DATE_ONLY_FIELDS = new Set(['install_date', 'last_done', 'next_due'])
export const DATETIME_FIELDS = new Set(['created', 'due', 'completed', 'timestamp'])

export const NUMBER_FIELDS = new Set([
  'hp',
  'voltage',
  'fla_amps',
  'rpm',
  'design_psi',
  'capacity_gal',
  'labor_hours',
  'downtime_minutes',
  'interval',
  'est_hours',
  'unit_cost_usd',
  'qty_on_hand',
  'min_qty',
  'reorder_qty',
  'qty',
  'cost',
  'reading',
])

/** README column "Sheet" → which counter the "Next ID" cell belongs to. */
export const README_SHEET_TO_KIND = {
  Assets: 'asset',
  WorkOrders: 'workOrder',
  PM_Schedules: 'pm',
  Parts: 'part',
  Technicians: 'technician',
  Locations: 'location',
} as const
