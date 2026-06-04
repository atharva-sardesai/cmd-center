const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

export function formatClockTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return TIME_FORMATTER.format(date);
}
