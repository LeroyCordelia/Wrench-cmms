import raw from './seed.json'
import type { AssetAttribute, CmmsSnapshot, PmTask, WoTask } from './types'

const seed = raw as CmmsSnapshot

const exampleTasks: WoTask[] = [
  {
    wo_id: 'WO-000001',
    step_no: 1,
    parent_step_no: null,
    level: 0,
    step_type: 'checkbox',
    instruction: 'Isolate filler heads 4 through 6 and lock out the drive.',
    options: null,
    response: '1',
    instruction_limble_original: null,
    limble_item_id: null,
    data_flag: 'EXAMPLE',
  },
  {
    wo_id: 'WO-000001',
    step_no: 2,
    parent_step_no: null,
    level: 0,
    step_type: 'checkbox',
    instruction: 'Fit the seal kit and wipe the starwheel.',
    options: null,
    response: '0',
    instruction_limble_original: null,
    limble_item_id: null,
    data_flag: 'EXAMPLE',
  },
  {
    wo_id: 'WO-000001',
    step_no: 3,
    parent_step_no: 2,
    level: 1,
    step_type: 'number',
    instruction: 'Leak-check pressure (psi).',
    options: null,
    response: null,
    instruction_limble_original: null,
    limble_item_id: null,
    data_flag: 'EXAMPLE',
  },
  {
    wo_id: 'WO-000001',
    step_no: 4,
    parent_step_no: null,
    level: 0,
    step_type: 'option list',
    instruction: 'Is the filler safe to run?',
    options: 'Yes | No',
    response: null,
    instruction_limble_original: null,
    limble_item_id: null,
    data_flag: 'EXAMPLE',
  },
]

const examplePmTasks: PmTask[] = [
  {
    pm_id: 'PM-0002',
    step_no: 1,
    parent_step_no: null,
    level: 0,
    step_type: 'note',
    instruction: 'Walk the filler before the run. This is a sample checklist, not a live SOP.',
    options: null,
    instruction_limble_original: null,
    limble_item_id: null,
    data_flag: 'EXAMPLE',
  },
  {
    pm_id: 'PM-0002',
    step_no: 2,
    parent_step_no: null,
    level: 0,
    step_type: 'checkbox',
    instruction: 'Check seals, the starwheel, and splash guards.',
    options: null,
    instruction_limble_original: null,
    limble_item_id: null,
    data_flag: 'EXAMPLE',
  },
]

const exampleAttributes: AssetAttribute[] = [
  {
    asset_id: 'AST-0002',
    asset_name: 'Rotary Filler',
    attribute: 'Product',
    value: 'Wine',
    unit: null,
    notes: 'EXAMPLE custom field.',
    data_flag: 'EXAMPLE',
  },
]

seed.pmTasks = examplePmTasks
seed.woTasks = exampleTasks
seed.assetAttributes = exampleAttributes

export const seedSnapshot = seed

export function normalizeSnapshot(snap: CmmsSnapshot): CmmsSnapshot {
  return {
    ...snap,
    pmTasks: snap.pmTasks ?? [],
    woTasks: snap.woTasks ?? [],
    assetAttributes: snap.assetAttributes ?? [],
  }
}

export function cloneSeed(): CmmsSnapshot {
  return normalizeSnapshot(structuredClone(seedSnapshot))
}
