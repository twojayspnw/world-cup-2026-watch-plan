export function parseMinutes(t) {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Pacific Daylight Time kickoff -> UTC ISO (tournament is Jun–Jul, PDT = UTC-7). */
export function ptToUtcIso(ptDate, ptTime) {
  const [y, mo, d] = ptDate.split("-").map(Number);
  const mins = parseMinutes(ptTime);
  const h = Math.floor(mins / 60);
  const min = mins % 60;
  const utcH = h + 7;
  const dt = new Date(Date.UTC(y, mo - 1, d, utcH, min, 0));
  return dt.toISOString().replace(".000Z", "Z");
}

export function utcMinuteKey(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 16);
}

export function formatDate(iso) {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
