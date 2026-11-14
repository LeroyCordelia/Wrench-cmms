import { describe, expect, it } from 'vitest'
import { formatExcelSerial, isBeforeDay, isPast, nowPacific, todayPacific, usToExcelSerial } from './dates'

describe('dates', () => {
  it('formats Pacific wall time as US dates', () => {
    const morning = new Date('2026-11-14T16:05:00Z')
    expect(nowPacific(morning)).toBe('11/14/2026 08:05')
    expect(todayPacific(morning)).toBe('11/14/2026')
  })

  it('treats a prior calendar day as overdue and today as still due', () => {
    expect(isBeforeDay('11/13/2026', '11/14/2026')).toBe(true)
    expect(isBeforeDay('11/14/2026', '11/14/2026')).toBe(false)
    expect(isPast('11/14/2026 07:00', '11/14/2026 08:05')).toBe(true)
    expect(isPast('11/14/2026 16:00', '11/14/2026 08:05')).toBe(false)
  })

  it('round-trips an Excel serial without moving the calendar day', () => {
    const serial = usToExcelSerial('11/12/2026 07:40')
    expect(formatExcelSerial(serial, true)).toBe('11/12/2026 07:40')
    expect(formatExcelSerial(usToExcelSerial('04/15/2018'), false)).toBe('04/15/2018')
  })
})
