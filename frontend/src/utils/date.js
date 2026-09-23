// Two different clocks on purpose: dates coming from the API are calendar
// dates stored as midnight UTC (see backend/CLAUDE.md), so they're read in
// UTC; "today" is the user's own calendar day, so it's read in local time.
// toISOString() is UTC too — after 21h in Brasília it's already tomorrow (#82).

const displayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export function formatDate(isoDate) {
  return displayFormatter.format(new Date(isoDate));
}

export function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function toDateInputValue(isoDate) {
  return isoDate ? isoDate.slice(0, 10) : todayInputValue();
}
