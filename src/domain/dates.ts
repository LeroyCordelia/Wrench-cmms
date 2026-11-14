/** Wall-clock US dates. Stored as MM/DD/YYYY or MM/DD/YYYY HH:mm (24-hour), Pacific plant time, never UTC-shifted. */

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatUsDate(year: number, month: number, day: number): string {
  return `${pad2(month)}/${pad2(day)}/${year}`
}

export function formatUsDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  return `${formatUsDate(year, month, day)} ${pad2(hour)}:${pad2(minute)}`
}

function partsInZone(date: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const out: Record<string, string> = {}
  for (const part of parts) out[part.type] = part.value
  if (out.hour === '24') out.hour = '00'
  return out
}

export function nowPacific(date = new Date()): string {
  const p = partsInZone(date, 'America/Los_Angeles')
  return formatUsDateTime(Number(p.year), Number(p.month), Number(p.day), Number(p.hour), Number(p.minute))
}

export function todayPacific(date = new Date()): string {
  return nowPacific(date).slice(0, 10)
}

export function dateOnlyUtc(value: string): number {
  const [month, day, year] = value.trim().split(/\s+/)[0].split('/').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Compare two stored wall-clock stamps. Date-only values are the start of that day. */
export function stampUtc(value: string): number {
  const [datePart, timePart] = value.trim().split(/\s+/)
  const [month, day, year] = datePart.split('/').map(Number)
  let hour = 0
  let minute = 0
  if (timePart) {
    const [h, m] = timePart.split(':').map(Number)
    hour = h
    minute = m
  }
  return Date.UTC(year, month - 1, day, hour, minute)
}

export function isBeforeDay(value: string, today: string): boolean {
  return dateOnlyUtc(value) < dateOnlyUtc(today)
}

export function isPast(value: string, now: string): boolean {
  if (!value.trim().includes(' ')) return isBeforeDay(value, now)
  return stampUtc(value) < stampUtc(now)
}

export function toDateInput(value: string | null): string {
  if (!value) return ''
  const [month, day, year] = value.split(/\s+/)[0].split('/')
  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

export function fromDateInput(value: string): string | null {
  if (!value) return null
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return null
  return `${month}/${day}/${year}`
}

export function toDatetimeInput(value: string | null): string {
  if (!value) return ''
  const [datePart, timePart] = value.trim().split(/\s+/)
  const date = toDateInput(datePart)
  if (!date) return ''
  return timePart ? `${date}T${timePart}` : date
}

export function fromDatetimeInput(value: string): string | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  const date = fromDateInput(datePart)
  if (!date) return null
  return timePart ? `${date} ${timePart.slice(0, 5)}` : date
}

/** Excel serial (1900 system) for a wall-clock US stamp. Timezone-naive. */
export function usToExcelSerial(value: string): number {
  const [datePart, timePart] = value.trim().split(/\s+/)
  const [month, day, year] = datePart.split('/').map(Number)
  let hour = 0
  let minute = 0
  if (timePart) {
    const [h, m] = timePart.split(':').map(Number)
    hour = h
    minute = m
  }
  return Date.UTC(year, month - 1, day, hour, minute) / 86400000 + 25569
}

export function formatExcelDate(value: Date, withTime: boolean): string {
  // Excel serial fractions sometimes land 1 ms under the minute (15:59:59.999).
  const rounded = new Date(Math.round(value.getTime() / 60000) * 60000)
  const year = rounded.getFullYear()
  const month = rounded.getMonth() + 1
  const day = rounded.getDate()
  if (!withTime) return formatUsDate(year, month, day)
  return formatUsDateTime(year, month, day, rounded.getHours(), rounded.getMinutes())
}

export function formatExcelSerial(serial: number, withTime: boolean): string {
  const ms = Math.round((serial - 25569) * 86400000)
  const value = new Date(ms)
  const year = value.getUTCFullYear()
  const month = value.getUTCMonth() + 1
  const day = value.getUTCDate()
  if (!withTime) return formatUsDate(year, month, day)
  return formatUsDateTime(year, month, day, value.getUTCHours(), value.getUTCMinutes())
}
