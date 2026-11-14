import type { Location, Part, PmSchedule } from './types'
import { isBeforeDay, isPast } from './dates'

export function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function trimNum(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function locationLabel(locations: Location[], id: string | null | undefined): string {
  if (!id) return '—'
  const location = locations.find((row) => row.location_id === id)
  if (!location) return id
  return location.area_line ? `${location.name} · ${location.area_line}` : location.name
}

export function priorityRank(priority: string): number {
  const n = Number.parseInt(priority, 10)
  return Number.isFinite(n) ? n : 9
}

export function priorityLabel(priority: string): string {
  const parts = priority.split('—')
  return (parts[1] ?? priority).trim()
}

export function isSafetyWork(type: string, priority: string): boolean {
  return type === 'safety' || priorityRank(priority) === 1
}

export function isClosedStatus(status: string): boolean {
  return status === 'complete' || status === 'canceled'
}

export function frequencyLabel(pm: PmSchedule): string {
  if (pm.interval == null || !pm.unit) return pm.frequency_type || '—'
  const unit = pm.interval === 1 && pm.unit.endsWith('s') ? pm.unit.slice(0, -1) : pm.unit
  return `Every ${trimNum(pm.interval)} ${unit}`
}

export function isLowStock(part: Part): boolean {
  if (part.qty_on_hand == null || part.min_qty == null) return false
  return part.qty_on_hand <= part.min_qty
}

export function duePhrase(due: string | null, now: string): { text: string; overdue: boolean } {
  if (!due) return { text: 'No due date', overdue: false }
  const overdue = isPast(due, now)
  const sameDay = due.slice(0, 10) === now.slice(0, 10)
  if (overdue) return { text: `Overdue · ${due}`, overdue: true }
  if (sameDay) return { text: `Due today · ${due}`, overdue: false }
  return { text: `Due ${due}`, overdue: false }
}

export function pmOverdue(pm: PmSchedule, today: string): boolean {
  if (!pm.next_due) return false
  return isBeforeDay(pm.next_due, today)
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function listValues(headers: string[], rows: (string | null)[][], header: string): string[] {
  const index = headers.indexOf(header)
  if (index < 0) return []
  const seen = new Set<string>()
  const values: string[] = []
  for (const row of rows) {
    const value = row[index]
    if (!value || seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }
  return values
}

export function assetIdList(usedOn: string | null | undefined): string[] {
  if (!usedOn) return []
  return usedOn
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function withCurrentOption(options: string[], current: string | null | undefined): string[] {
  if (!current || options.includes(current)) return options
  return [current, ...options]
}
