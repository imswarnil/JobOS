/**
 * Calendar arithmetic, done on plain `YYYY-MM-DD` strings.
 *
 * Deliberately not `Date`: entries are stored as a Postgres `date`, which has
 * no time and no zone. Parsing "2026-08-26" into a Date makes it midnight UTC,
 * and a user east of UTC then sees it land on the 25th. Strings in, strings
 * out, and the bug cannot happen.
 */

export interface DayCell {
  /** `YYYY-MM-DD`. */
  date: string;
  day: number;
  isToday: boolean;
  isFuture: boolean;
}

/** A day in a month grid, which also has to say whether it is a spill day. */
export interface MonthCell extends DayCell {
  inMonth: boolean;
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

/* ── Days ────────────────────────────────────────────────────────────────── */

/**
 * A `Date` for a stored day, built from numeric components.
 *
 * The distinction this file rests on: `new Date("2026-08-26")` is parsed as
 * midnight *UTC* and shifts west of Greenwich, while `new Date(2026, 7, 26)`
 * is local midnight and cannot. Only the second form appears here.
 */
function dateOf(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Day arithmetic. `Date` normalises overflow, so month and year ends work. */
export function addDays(date: string, by: number): string {
  const t = dateOf(date);
  t.setDate(t.getDate() + by);
  return iso(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

function cellFor(date: string, today: string): DayCell {
  return {
    date,
    day: Number(date.slice(8, 10)),
    isToday: date === today,
    isFuture: date > today,
  };
}

/* ── Weeks ───────────────────────────────────────────────────────────────── */

/** The Monday on or before `date`. Weeks are Monday-first throughout. */
export function mondayOf(date: string): string {
  return addDays(date, -((dateOf(date).getDay() + 6) % 7));
}

/**
 * Any day in a week identifies the week; the Monday is the canonical form.
 *
 * Normalising on read means a link to any day lands on the right week, and
 * the URL rewrites itself to the Monday — so two people sharing "that week"
 * end up with the same address.
 */
export function parseWeek(value: string | undefined): string {
  return mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : todayIso());
}

export function shiftWeek(monday: string, by: number): string {
  return addDays(monday, by * 7);
}

/** Inclusive query bounds for the week. */
export function weekBounds(monday: string) {
  return { from: monday, to: addDays(monday, 6) };
}

/** `24 – 30 Aug 2026`, collapsing the month when the week does not cross one. */
export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const a = dateOf(monday);
  const b = dateOf(sunday);
  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const from = a.toLocaleDateString(
    "en-GB",
    sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" },
  );
  const to = b.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${from} – ${to}`;
}

/** The seven days, Monday first. */
export function weekGrid(monday: string): DayCell[] {
  const today = todayIso();
  return Array.from({ length: 7 }, (_, i) => cellFor(addDays(monday, i), today));
}

/* ── Years ───────────────────────────────────────────────────────────────── */

export function parseYear(value: string | undefined): number {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1970 && year <= 2999
    ? year
    : new Date().getFullYear();
}

export function yearBounds(year: number) {
  return { from: iso(year, 1, 1), to: iso(year, 12, 31) };
}

/** A column of the year heatmap: seven slots, null outside the year. */
export interface YearWeek {
  /** The Monday, which is also the React key. */
  key: string;
  days: (DayCell | null)[];
}

/**
 * The year as week-columns, the shape a contribution heatmap wants.
 *
 * Padded with nulls rather than with neighbouring years' days: a month grid
 * shows spill days because the week is the unit and cutting it looks broken,
 * but a year is bounded by January and December and showing last December
 * inside it would be a lie about which year you are reading.
 */
export function yearGrid(year: number): YearWeek[] {
  const today = todayIso();
  const { from, to } = yearBounds(year);
  const weeks: YearWeek[] = [];

  for (let cursor = mondayOf(from); cursor <= to; cursor = addDays(cursor, 7)) {
    weeks.push({
      key: cursor,
      days: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(cursor, i);
        return date < from || date > to ? null : cellFor(date, today);
      }),
    });
  }

  return weeks;
}

/** Where each month starts, for the axis above the heatmap. */
export function yearMonthLabels(
  weeks: YearWeek[],
): { label: string; index: number }[] {
  const labels: { label: string; index: number }[] = [];
  let seen = -1;

  weeks.forEach((week, index) => {
    const first = week.days.find(Boolean);
    if (!first) return;

    const month = Number(first.date.slice(5, 7));
    if (month === seen) return;

    seen = month;
    labels.push({
      label: dateOf(first.date).toLocaleDateString("en-GB", { month: "short" }),
      index,
    });
  });

  return labels;
}
