const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatLaunchDate(iso: string | null): string {
  if (!iso) return 'Date unavailable'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${MONTHS[date.getUTCMonth()]} ${day} ${date.getUTCFullYear()}`
}
