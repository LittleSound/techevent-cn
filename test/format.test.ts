import { describe, expect, it } from 'vitest'
import { parseDay } from '~/utils/events'
import { formatDateRange } from '~/utils/format'

describe('formatDateRange', () => {
  it('retains both years for trips crossing a year boundary', () => {
    expect(formatDateRange(parseDay('2026-12-31'), parseDay('2027-01-02')))
      .toBe('2026年12月31日 – 2027年1月2日')
  })

  it('keeps single-day and same-month ranges compact', () => {
    expect(formatDateRange(parseDay('2026-09-22'), parseDay('2026-09-22'))).toBe('2026年9月22日')
    expect(formatDateRange(parseDay('2026-09-22'), parseDay('2026-09-24'))).toBe('2026年9月22日 – 24日')
  })
})
