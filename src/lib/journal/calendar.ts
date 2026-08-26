/**
 * Calendar arithmetic, done on plain `YYYY-MM-DD` strings.
 *
 * Deliberately not `Date`: entries are stored as a Postgres `date`, which has
 * no time and no zone. Parsing "2026-08-26" into a Date makes it midnight UTC,
 * and a user east of UTC then sees it land on the 25th. Strings in, strings
 * out, and the bug cannot happen.
 */

export interface MonthCell {
  /** `YYYY-MM-DD`. */
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function todayIso(): string {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** `2026-08` → `{ year: 2026, month: 8 }`, falling back to the current month. */
export function parseMonth(value: string | undefined): {
  year: number;
  month: number;
} {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, by: number) {
  const total = year * 12 + (month - 1) + by;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** First and last day of the month, as ISO strings — the query bounds. */
export function monthBounds(year: number, month: number) {
  return {
    from: iso(year, month, 1),
    to: iso(year, month, daysInMonth(year, month)),
  };
}

/**
 * The 6×7 grid, Monday-first.
 *
 * Always six rows, even when five would do: a grid that changes height as you
 * page through months makes the whole page jump, and the controls move out
 * from under the cursor.
 */
export function monthGrid(year: number, month: number): MonthCell[] {
  const today = todayIso();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon = 0
  const total = daysInMonth(year, month);
  const prev = shiftMonth(year, month, -1);
  const prevTotal = daysInMonth(prev.year, prev.month);

  const cells: MonthCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevTotal - i;
    const date = iso(prev.year, prev.month, day);
    cells.push({ date, day, inMonth: false, isToday: date === today, isFuture: date > today });
  }

  for (let day = 1; day <= total; day++) {
    const date = iso(year, month, day);
    cells.push({ date, day, inMonth: true, isToday: date === today, isFuture: date > today });
  }

  const next = shiftMonth(year, month, 1);
  let day = 1;
  while (cells.length < 42) {
    const date = iso(next.year, next.month, day);
    cells.push({ date, day, inMonth: false, isToday: date === today, isFuture: date > today });
    day++;
  }

  return cells;
}
