const PAD2 = (n: number) => n.toString().padStart(2, "0");

function format_time(date: Date): string {
  return `${PAD2(date.getHours())}:${PAD2(date.getMinutes())}`;
}

function is_same_day(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calendar_days_ago(date: Date, now: Date): number {
  const nowMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dateMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((nowMidnight - dateMidnight) / MS_PER_DAY);
}

export function format_timestamp(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const time = format_time(date);

  if (is_same_day(date, now)) {
    return time;
  }

  const daysDiff = calendar_days_ago(date, now);

  if (daysDiff < 7) {
    return `${DAY_NAMES[date.getDay()]}, ${time}`;
  }

  const day = PAD2(date.getDate());
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}, ${time}`;
}

export function format_thinking_duration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 1 ? "less than a second" : `${seconds}s`;
}
