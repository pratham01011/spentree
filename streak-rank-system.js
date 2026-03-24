// ═══════════════════════════════════════════════════════════════
//  SPENTREE — STREAK + RANK + THEME SYSTEM  (streak-rank-system.js)
//  Load this AFTER app.js in index.html
// ═══════════════════════════════════════════════════════════════

// ─── THEMES ──────────────────────────────────────────────────────────────────
const SPENTREE_THEMES = [
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    unlockStreak: 0,
    description: 'The classic green grove',
    vars: {
      '--primary-color': '#2ecc71',
      '--primary-dark':  '#27ae60',
      '--accent-color':  '#1abc9c',
      '--accent':        '#1abc9c',
      '--bg-color':      '#0b110e',
      '--bg-main':       '#0b110e',
      '--bg-card':       'rgba(22,33,27,0.5)',
      '--text-main':     '#e8f0ec',
      '--text-muted':    '#94a39b',
    }
  },
  {
    id: 'cherry',
    name: 'Cherry Blossom',
    emoji: '🌸',
    unlockStreak: 3,
    description: 'Soft pink petals at dusk',
    vars: {
      '--primary-color': '#e91e8c',
      '--primary-dark':  '#c2185b',
      '--accent-color':  '#ff6bb3',
      '--accent':        '#ff6bb3',
      '--bg-color':      '#1a0d14',
      '--bg-main':       '#1a0d14',
      '--bg-card':       'rgba(37,16,32,0.5)',
      '--text-main':     '#fce4ec',
      '--text-muted':    '#ce93d8',
    }
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    emoji: '🌊',
    unlockStreak: 5,
    description: 'Bioluminescent depths',
    vars: {
      '--primary-color': '#00bcd4',
      '--primary-dark':  '#0097a7',
      '--accent-color':  '#00e5ff',
      '--accent':        '#00e5ff',
      '--bg-color':      '#020d18',
      '--bg-main':       '#020d18',
      '--bg-card':       'rgba(4,24,48,0.5)',
      '--text-main':     '#e0f7fa',
      '--text-muted':    '#4dd0e1',
    }
  },
  {
    id: 'ember',
    name: 'Ember Dusk',
    emoji: '🔥',
    unlockStreak: 10,
    description: 'Warm fire on dark nights',
    vars: {
      '--primary-color': '#ff6f00',
      '--primary-dark':  '#e65100',
      '--accent-color':  '#ffd740',
      '--accent':        '#ffd740',
      '--bg-color':      '#150800',
      '--bg-main':       '#150800',
      '--bg-card':       'rgba(30,14,0,0.5)',
      '--text-main':     '#fff8e1',
      '--text-muted':    '#ffcc80',
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '🌌',
    unlockStreak: 20,
    description: 'Northern lights at midnight',
    vars: {
      '--primary-color': '#7c4dff',
      '--primary-dark':  '#651fff',
      '--accent-color':  '#64ffda',
      '--accent':        '#64ffda',
      '--bg-color':      '#050012',
      '--bg-main':       '#050012',
      '--bg-card':       'rgba(13,0,32,0.5)',
      '--text-main':     '#e8eaf6',
      '--text-muted':    '#9fa8da',
    }
  }
];

// ─── RANKS ───────────────────────────────────────────────────────────────────
const SPENTREE_RANKS = [
  { name: 'Seed',          emoji: '🌱', requiredXP: 0  },
  { name: 'Sapling',       emoji: '🌿', requiredXP: 5  },
  { name: 'Young Tree',    emoji: '🌳', requiredXP: 10 },
  { name: 'Forest Guard',  emoji: '🛡️', requiredXP: 20 },
  { name: 'Ancient Oak',   emoji: '🪵', requiredXP: 35 },
  { name: 'Nature Deity',  emoji: '✨', requiredXP: 50 },
];

const STREAK_MILESTONES = [3, 5, 10, 20];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getRankForXP(xp) {
  let rank = SPENTREE_RANKS[0];
  for (const r of SPENTREE_RANKS) { if (xp >= r.requiredXP) rank = r; }
  return rank;
}
function getNextRankForXP(xp) {
  return SPENTREE_RANKS.find(r => r.requiredXP > xp) || null;
}

function computeStreaks(forest) {
  if (!Array.isArray(forest) || forest.length === 0)
    return { currentStreak: 0, longestStreak: 0 };

  const sorted = [...forest]
    .filter(d => d.dateKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  let streaks = [];
  let run = [];

  for (const day of sorted) {
    const healthy = typeof day.health === 'number' ? day.health >= 0 : true;
    if (!healthy) { if (run.length) { streaks.push(run); run = []; } continue; }
    if (run.length === 0) {
      run = [day.dateKey];
    } else {
      const prev = new Date(run[run.length - 1]);
      const curr = new Date(day.dateKey);
      const diff = (curr - prev) / 86400000;
      if (diff === 1) { run.push(day.dateKey); }
      else { streaks.push(run); run = [day.dateKey]; }
    }
  }
  if (run.length) streaks.push(run);

  const longestStreak = streaks.reduce((m, s) => Math.max(m, s.length), 0);

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const yesterdayKey = `${yest.getFullYear()}-${pad(yest.getMonth()+1)}-${pad(yest.getDate())}`;

  const last = streaks[streaks.length - 1] || [];
  const lastDay = last[last.length - 1];
  const isActive = lastDay === todayKey || lastDay === yesterdayKey;

  return { currentStreak: isActive ? last.length : 0, longestStreak };
}

// ─── THEME APPLICATION ───────────────────────────────────────────────────────
function applyTheme(themeId) {
  const theme = SPENTREE_THEMES.find(t => t.id === themeId) || SPENTREE_THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.style.backgroundColor = theme.vars['--bg-color'] || '';
  localStorage.setItem('spentree_theme', themeId);
  document.querySelectorAll('.theme-card').forEach(card => {
    const isActive = card.dataset.themeId === themeId;
    card.classList.toggle('theme-active', isActive);
    const badge = card.querySelector('.theme-active-badge');
    if (badge) badge.style.display = isActive ? 'flex' : 'none';
  });
}

function getActiveThemeId() {
  return localStorage.getItem('spentree_theme') || 'forest';
}

// ─── UNLOCK TOAST ────────────────────────────────────────────────────────────
function showUnlockToast(theme) {
  const toast = document.getElementById('unlockToast');
  const msg   = document.getElementById('unlockToastMsg');
  if (!toast) return;
  if (msg) msg.textContent = `${theme.name} — ${theme.description}`;
  toast.querySelector('.unlock-toast-icon').textContent = theme.emoji;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4500);
}

// ─── STREAK BANNER ───────────────────────────────────────────────────────────
function updateStreakBanner(currentStreak, longestStreak) {
  const flameEl = document.getElementById('streakFlame');
  const countEl = document.getElementById('streakCount');
  const bestEl  = document.getElementById('streakBest');
  const dotsEl  = document.getElementById('streakMilestones');

  if (flameEl) flameEl.textContent = currentStreak > 0 ? '🔥' : '🌱';
  if (countEl) countEl.textContent = currentStreak;
  if (bestEl)  bestEl.textContent  = `Best: ${longestStreak} days`;

  if (dotsEl) {
    dotsEl.innerHTML = STREAK_MILESTONES.map(m => {
      const reached = currentStreak >= m;
      const thm     = SPENTREE_THEMES.find(t => t.unlockStreak === m);
      const tip     = thm ? `🎨 Unlock ${thm.name}` : `${m}🔥 milestone`;
      return `
        <div class="streak-dot ${reached ? 'reached' : ''} ${thm ? 'is-theme' : ''}">
          <span class="streak-dot-num">${m}</span>
          <span class="streak-dot-icon">${thm ? '🎨' : '🔥'}</span>
          <span class="streak-dot-tip">${tip}</span>
        </div>`;
    }).join('');
  }

  const navNum = document.getElementById('navStreakNum');
  if (navNum) navNum.textContent = currentStreak;
}

// ─── NAV RANK BADGE ──────────────────────────────────────────────────────────
function updateNavRank(currentXP) {
  const rank     = getRankForXP(currentXP);
  const nextRank = getNextRankForXP(currentXP);
  const titleEl  = document.getElementById('navRankTitle');
  const barEl    = document.getElementById('xpBar');
  const xpLabel  = document.getElementById('navXpLabel');

  if (titleEl) titleEl.textContent = `${rank.emoji} ${rank.name}`;
  if (xpLabel) xpLabel.textContent = `${currentXP} XP`;
  if (barEl) {
    const xpInto   = nextRank ? currentXP - rank.requiredXP : 1;
    const xpNeeded = nextRank ? nextRank.requiredXP - rank.requiredXP : 1;
    barEl.style.width = `${Math.min(100, (xpInto / xpNeeded) * 100)}%`;
  }
}

// ─── RANK HERO CARD ──────────────────────────────────────────────────────────
function updateRankHeroCard(currentXP) {
  const rank     = getRankForXP(currentXP);
  const nextRank = getNextRankForXP(currentXP);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rankHeroEmoji',   rank.emoji);
  set('rankHeroName',    rank.name);
  set('rankHeroXP',      `${currentXP} XP`);
  set('rankHeroCurrent', rank.name);
  set('rankHeroNext',    nextRank ? `→ ${nextRank.name}` : '✨ Max!');
  set('rankHeroSub',     nextRank
    ? `${currentXP - rank.requiredXP}/${nextRank.requiredXP - rank.requiredXP} XP to next rank`
    : '✨ Maximum rank reached!');

  const fillEl = document.getElementById('rankHeroFill');
  if (fillEl) {
    const xpInto   = nextRank ? currentXP - rank.requiredXP : 1;
    const xpNeeded = nextRank ? nextRank.requiredXP - rank.requiredXP : 1;
    fillEl.style.width = `${Math.min(100, (xpInto / xpNeeded) * 100)}%`;
  }
}

// ─── RANK LADDER ─────────────────────────────────────────────────────────────
function renderRankLadder(currentXP) {
  const grid = document.getElementById('levelsGrid');
  if (!grid) return;
  const currentRank = getRankForXP(currentXP);

  grid.innerHTML = SPENTREE_RANKS.map((rank, i) => {
    const isCurrent = rank.name === currentRank.name;
    const isLocked  = currentXP < rank.requiredXP;
    return `
      <li class="leaderboard-item rank-ladder-item ${isCurrent ? 'rank-current' : ''} ${isLocked ? 'rank-locked' : ''}">
        <div class="leaderboard-rank-num" style="width:auto;font-size:1.5rem;">${rank.emoji}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">
            ${rank.name}
            ${isCurrent ? '<span class="rank-you-tag">YOU</span>' : ''}
          </div>
          <div class="leaderboard-stats">Growth Stage ${i + 1} &bull; ${rank.requiredXP} XP required</div>
        </div>
        <div class="leaderboard-score">${isLocked ? '🔒' : (isCurrent ? '◀' : '✓')}</div>
      </li>`;
  }).join('');
}

// ─── THEME PICKER ────────────────────────────────────────────────────────────
function renderThemePicker(currentStreak, activeThemeId) {
  const grid = document.getElementById('themePickerGrid');
  if (!grid) return;

  grid.innerHTML = SPENTREE_THEMES.map(theme => {
    const unlocked = currentStreak >= theme.unlockStreak;
    const isActive = theme.id === activeThemeId;
    return `
      <div class="theme-card ${isActive ? 'theme-active' : ''} ${!unlocked ? 'theme-locked' : ''}"
           data-theme-id="${theme.id}">
        <span class="theme-card-emoji">${theme.emoji}</span>
        <div class="theme-card-name">${theme.name}</div>
        <div class="theme-card-desc">${theme.description}</div>
        <div class="theme-card-unlock ${unlocked ? 'unlocked' : ''}">
          ${unlocked
            ? (theme.unlockStreak === 0 ? 'Always available ✓' : `Unlocked at ${theme.unlockStreak}🔥`)
            : `🔒 Reach ${theme.unlockStreak}🔥 streak`}
        </div>
        ${isActive ? '<div class="theme-active-badge">✓</div>' : ''}
        ${!unlocked ? `
          <div class="theme-lock-overlay">
            <span class="theme-lock-overlay-icon">🔒</span>
            <span class="theme-lock-overlay-txt">${theme.unlockStreak}🔥</span>
          </div>` : ''}
      </div>`;
  }).join('');

  grid.querySelectorAll('.theme-card:not(.theme-locked)').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.themeId;
      applyTheme(id);
      renderThemePicker(currentStreak, id);
    });
  });
}

// ─── THEMES PAGE STREAK ROW ──────────────────────────────────────────────────
function updateThemesStreakRow(currentStreak, longestStreak) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('themesStreakCurrent', currentStreak);
  set('themesStreakBest',    longestStreak);
  const next = SPENTREE_THEMES.find(t => t.unlockStreak > currentStreak);
  set('themesNextUnlock', next ? `${next.emoji} at ${next.unlockStreak}🔥` : 'All unlocked! 🎉');
}

// ─── NEW UNLOCK DETECTION ────────────────────────────────────────────────────
let _lastKnownStreak = parseInt(localStorage.getItem('spentree_last_streak') || '0', 10);

function checkAndAnnounceUnlocks(newStreak) {
  SPENTREE_THEMES.forEach(theme => {
    if (theme.unlockStreak > 0 && _lastKnownStreak < theme.unlockStreak && newStreak >= theme.unlockStreak) {
      setTimeout(() => showUnlockToast(theme), 800);
    }
  });
  _lastKnownStreak = newStreak;
  localStorage.setItem('spentree_last_streak', newStreak);
}

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────
function updateStreakSystem(forest) {
  const { currentStreak, longestStreak } = computeStreaks(forest);
  const currentXP = (forest || []).filter(d =>
    typeof d.health === 'number' ? d.health >= 0 : true
  ).length;
  const activeThemeId = getActiveThemeId();

  checkAndAnnounceUnlocks(currentStreak);
  applyTheme(activeThemeId);
  updateStreakBanner(currentStreak, longestStreak);
  updateNavRank(currentXP);
  updateRankHeroCard(currentXP);
  renderRankLadder(currentXP);
  renderThemePicker(currentStreak, activeThemeId);
  updateThemesStreakRow(currentStreak, longestStreak);
}

// ─── EXPOSE GLOBALS ──────────────────────────────────────────────────────────
window.updateStreakSystem = updateStreakSystem;
window.applyTheme         = applyTheme;
window.SPENTREE_THEMES    = SPENTREE_THEMES;
window.SPENTREE_RANKS     = SPENTREE_RANKS;
window.computeStreaks     = computeStreaks;
window.getRankForXP       = getRankForXP;
window.getNextRankForXP   = getNextRankForXP;

// Apply saved theme immediately on load (before API data arrives)
applyTheme(getActiveThemeId());