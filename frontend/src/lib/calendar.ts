export type CalendarEvent = {
  title: string
  startDate: string
  startTime: string
  durationMinutes: number
  details?: string
  location?: string
}

function parseLocalDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function eventDates(event: CalendarEvent): { start: Date; end: Date } {
  const start = parseLocalDateTime(event.startDate, event.startTime)
  const end = new Date(start.getTime() + event.durationMinutes * 60_000)
  return { start, end }
}

export function createGoogleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = eventDates(event)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
  })

  if (event.details) params.set('details', event.details)
  if (event.location) params.set('location', event.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function createIcsContent(event: CalendarEvent): string {
  const { start, end } = eventDates(event)
  const now = new Date()
  const uid = `usecognia-${event.startDate}-${event.startTime.replace(':', '')}@usecognia`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UseCognia//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.details ? `DESCRIPTION:${escapeIcsText(event.details)}` : '',
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return `${lines.join('\r\n')}\r\n`
}
