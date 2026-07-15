export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function toTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function getTimeGreeting(): { icon: string; text: string } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { icon: 'sunrise', text: 'Good Morning' }
  if (hour >= 12 && hour < 17) return { icon: 'sun', text: 'Good Afternoon' }
  if (hour >= 17 && hour < 21) return { icon: 'sunset', text: 'Good Evening' }
  return { icon: 'moon', text: 'Good Night' }
}
