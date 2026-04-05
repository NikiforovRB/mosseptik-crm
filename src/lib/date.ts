const weekdayShortRu = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

const MOSCOW_TZ = "Europe/Moscow";

/** MSK is UTC+3 (no DST). Wall clock in Moscow → UTC instant. */
export function moscowWallToUtc(y: number, month1to12: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(y, month1to12 - 1, day, hour - 3, minute, 0, 0));
}

/** Calendar day shown in Moscow for an instant (for date pickers). */
export function moscowWallDateToLocalCalendarDate(iso: Date): Date {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(iso);
  const [yy, mm, dd] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(yy, mm - 1, dd);
}

export function formatMoscowTime24(iso: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MOSCOW_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(iso);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/** «Апрель 2026» / month title in calendar (nominative month). */
export function formatRuMonthYearTitle(d: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
}

/** e.g. «5 апреля, вс» or «5 апреля, вс, 15:00» (Moscow). Day+month use one formatter for correct declension. */
export function formatRuDayMonthWeekdayMoscow(iso: Date, includeTime: boolean): string {
  const dm = new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "numeric",
    month: "long",
  }).format(iso);
  let wd = new Intl.DateTimeFormat("ru-RU", { timeZone: MOSCOW_TZ, weekday: "short" }).format(iso);
  if (wd.endsWith(".")) wd = wd.slice(0, -1);
  let out = `${dm}, ${wd}`;
  if (includeTime) {
    const t = formatMoscowTime24(iso);
    out += `, ${t}`;
  }
  return out;
}

export function buildDueIsoMoscow(
  calendarDate: Date,
  hasTime: boolean,
  timeHHmm: string
): { dueAt: string | null; dueHasTime: boolean } {
  const y = calendarDate.getFullYear();
  const mo = calendarDate.getMonth() + 1;
  const d = calendarDate.getDate();
  if (hasTime && timeHHmm && /^\d{1,2}:\d{2}$/.test(timeHHmm)) {
    const [hh, mm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
    return { dueAt: moscowWallToUtc(y, mo, d, hh, mm).toISOString(), dueHasTime: true };
  }
  return { dueAt: moscowWallToUtc(y, mo, d, 12, 0).toISOString(), dueHasTime: false };
}

export function formatRuDayMonthWeekday(d: Date) {
  const dm = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
  const wd = weekdayShortRu[d.getDay()];
  return `${dm}, ${wd}`;
}

/** Color for next-task due line on dashboard (by Moscow calendar day / time). */
export function nextTaskDueColor(dueAt: Date, dueHasTime: boolean, now = new Date()): string {
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: MOSCOW_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(x);
  const dueDay = fmt(dueAt);
  const today = fmt(now);
  if (dueDay < today) return "#c62828";
  if (dueDay > today) return "#1a8f2e";
  if (dueHasTime && dueAt.getTime() < now.getTime()) return "#c62828";
  return "#1a8f2e";
}

export function commDateColor(d: Date, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((a.getTime() - b.getTime()) / 86400000);
  if (diffDays <= 0) return "#1a8f2e"; // today or future (future shouldn't happen)
  if (diffDays === 1) return "#8b8b8b"; // yesterday
  return "#c62828"; // 2+ days ago
}

