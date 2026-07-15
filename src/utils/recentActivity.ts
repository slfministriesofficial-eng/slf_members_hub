import type { ActivityItem, Member } from '../mock/types'

// Only "member added" events are derivable right now — there's no attendance/care
// log to source "flagged absent" or "follow-up completed" style entries from yet.
export function getRecentActivity(members: Member[], limit = 4): ActivityItem[] {
  return members
    .filter((m) => m.registrationDate)
    .slice()
    .sort((a, b) => (b.registrationDate ?? '').localeCompare(a.registrationDate ?? ''))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      text: `New member added — ${m.name}`,
      time: m.registrationDate ?? '',
    }))
}
