const weekdayShortRu = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

export function formatRuDayMonthWeekday(d: Date) {
  const day = d.getDate();
  const month = d.toLocaleString("ru-RU", { month: "long" });
  const wd = weekdayShortRu[d.getDay()];
  return `${day} ${month}, ${wd}`;
}

export function commDateColor(d: Date, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((a.getTime() - b.getTime()) / 86400000);
  if (diffDays <= 0) return "#1a8f2e"; // today or future (future shouldn't happen)
  if (diffDays === 1) return "#8b8b8b"; // yesterday
  return "#c62828"; // 2+ days ago
}

