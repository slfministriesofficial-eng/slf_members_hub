export function getFormattedDate(date = new Date()): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${weekday} · ${day} ${month} ${year}`
}
