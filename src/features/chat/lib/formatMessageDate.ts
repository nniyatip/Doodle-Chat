// Fixed English abbreviations: Intl output differs between browsers (e.g. "Sep" vs "Sept")
// and adds a comma before the time, which doesn't match the design.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Formats an ISO timestamp in the user's local time zone, e.g. "10 Mar 2018 9:55". */
export function formatMessageDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${date.getHours()}:${minutes}`
}
