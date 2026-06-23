function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function toIcsDate(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

export function generateIcs(params: {
  sessionId: string;
  title: string;
  description: string;
  startDate: Date;
  durationMinutes: number;
  meetingLink: string;
  organizerEmail: string;
  organizerName: string;
}): string {
  const endDate = new Date(params.startDate.getTime() + params.durationMinutes * 60 * 1000);
  const now = toIcsDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AECCI Global Deal Room//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.sessionId}@aecci-dealroom.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(params.startDate)}`,
    `DTEND:${toIcsDate(endDate)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, '\\n')} Join: ${params.meetingLink}`,
    `LOCATION:${params.meetingLink}`,
    `ORGANIZER;CN=${params.organizerName}:mailto:${params.organizerEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder - AECCI Deal Room Session in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}
