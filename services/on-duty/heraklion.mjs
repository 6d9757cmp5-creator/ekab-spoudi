const TIME_ZONE = 'Europe/Athens';
const SCHEDULE_START = Date.UTC(2026, 1, 1);
const SCHEDULE_END = Date.UTC(2027, 0, 31);
const DAY_MS = 86_400_000;

const HOSPITALS = Object.freeze({
  venizeleio: Object.freeze({
    name: 'Βενιζέλειο – Πανάνειο',
    phone: '+302813408000',
    displayPhone: '2813 408000'
  }),
  pagni: Object.freeze({
    name: 'ΠΑΓΝΗ',
    phone: '+302813402111',
    displayPhone: '2813 402111'
  })
});

function athensClock(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour)
  };
}

function dayLabel(dayUtc) {
  return new Intl.DateTimeFormat('el-GR', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long'
  }).format(new Date(dayUtc));
}

/**
 * General hospital on duty, using the official 7th Health Region roster.
 * Shifts run 08:00–08:00 in Europe/Athens. The published alternating roster
 * is valid from 2026-02-01 through 2027-01-31; outside it, return unknown.
 */
export function heraklionOnDuty(now = new Date()) {
  const clock = athensClock(now);
  const localToday = Date.UTC(clock.year, clock.month - 1, clock.day);
  const dutyDay = localToday - (clock.hour < 8 ? DAY_MS : 0);
  if (dutyDay < SCHEDULE_START || dutyDay > SCHEDULE_END) return null;

  const offset = Math.floor((dutyDay - SCHEDULE_START) / DAY_MS);
  const hospital = HOSPITALS[offset % 2 === 0 ? 'venizeleio' : 'pagni'];
  const shiftEnd = dutyDay + DAY_MS;
  return Object.freeze({
    ...hospital,
    dutyDate: dayLabel(dutyDay),
    untilDate: dayLabel(shiftEnd),
    shiftLabel: `08:00 · ${dayLabel(dutyDay)} – 08:00 · ${dayLabel(shiftEnd)}`,
    periodEnd: shiftEnd,
    timeZone: TIME_ZONE
  });
}

export const HERAKLION_DUTY_SOURCES = Object.freeze({
  roster: 'https://www.7ype.gov.gr/wp-content/uploads/2025/12/2.-%CE%95%CE%A6%CE%97%CE%9C%CE%95%CE%A1%CE%99%CE%95%CE%A3-6%CE%A3%CE%926469%CE%972%CE%99-%CE%94%CE%94%CE%99.pdf',
  live: 'https://www.pagni.gr/index.php/eservices/efimeries'
});
