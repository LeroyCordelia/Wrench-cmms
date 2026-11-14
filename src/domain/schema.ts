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

export const ASSET_EXTENDED = ['limble_asset_id', 'location_detail', 'tree_level'] as const

export const WORK_ORDER_EXTENDED = [
  'title',
  'limble_task_id',
  'limble_type',
  'est_hours',
  'requestor_email',
  'scheduled_end',
  'total_cost_usd',
  'limble_history',
] as const

export const PM_EXTENDED = [
  'limble_pm_id',
  'description',
  'assigned_to',
  'schedule_rule',
  'schedule_anchor',
  'start_date',
] as const

export const PM_TASK_HEADERS = [
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
] as const

export const WO_TASK_HEADERS = [
  'wo_id',
  'step_no',
  'parent_step_no',
  'level',
  'step_type',
  'instruction',
  'options',
  'response',
  'instruction_limble_original',
  'limble_item_id',
  'data_flag',
] as const

export const ATTRIBUTE_HEADERS = [
  'asset_id',
  'asset_name',
  'attribute',
  'value',
  'unit',
  'notes',
  'data_flag',
  'limble_asset_id',
] as const

export const OPTIONAL_SHEETS = ['PM_Tasks', 'WO_Tasks', 'Asset_Attributes'] as const

export const DATE_ONLY_FIELDS = new Set(['install_date', 'last_done', 'next_due', 'start_date'])
export const DATETIME_FIELDS = new Set(['created', 'due', 'completed', 'timestamp', 'scheduled_end'])

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
  'tree_level',
  'limble_asset_id',
  'limble_task_id',
  'limble_pm_id',
  'limble_item_id',
  'total_cost_usd',
  'step_no',
  'parent_step_no',
  'level',
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
