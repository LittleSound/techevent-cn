import { startOfDay } from '~/utils/events'

const fmt = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' })
const fmtWithYear = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * Render a human date range. Single-day events collapse to one date; ranges
 * within the same month drop the redundant trailing month. The year is always
 * shown on the start date to avoid ambiguity across a multi-year calendar.
 */
export function formatDateRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime())
    return fmtWithYear.format(start)
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth())
    return `${fmtWithYear.format(start)} – ${end.getDate()}日`
  return `${fmtWithYear.format(start)} – ${fmt.format(end)}`
}

export function isPast(end: Date, now: Date = new Date()): boolean {
  return end < startOfDay(now)
}
