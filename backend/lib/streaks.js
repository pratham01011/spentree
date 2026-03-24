/**
 * Streak + week helpers (mirrors client streak-rank-system.js logic).
 */

function computeStreaksFromDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sorted = [...days]
    .filter(d => d && d.dateKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const streaks = [];
  let run = [];

  for (const day of sorted) {
    const healthy = typeof day.health === 'number' ? day.health >= 0 : true;
    if (!healthy) {
      if (run.length) {
        streaks.push(run);
        run = [];
      }
      continue;
    }
    if (run.length === 0) {
      run = [day.dateKey];
    } else {
      const prev = new Date(run[run.length - 1] + 'T12:00:00');
      const curr = new Date(day.dateKey + 'T12:00:00');
      const diff = (curr - prev) / 86400000;
      if (diff === 1) run.push(day.dateKey);
      else {
        streaks.push(run);
        run = [day.dateKey];
      }
    }
  }
  if (run.length) streaks.push(run);

  const longestStreak = streaks.reduce((m, s) => Math.max(m, s.length), 0);

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yesterdayKey = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

  const last = streaks[streaks.length - 1] || [];
  const lastDay = last[last.length - 1];
  const isActive = lastDay === todayKey || lastDay === yesterdayKey;

  return { currentStreak: isActive ? last.length : 0, longestStreak };
}

/** Monday–Sunday date keys in the server's local timezone (matches typical client dateKey). */
function weekBoundsLocal(d = new Date()) {
  const day = (d.getDay() + 6) % 7;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const pad = n => String(n).padStart(2, '0');
  const key = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  return { start: key(mon), end: key(sun) };
}

module.exports = { computeStreaksFromDays, weekBoundsLocal };
