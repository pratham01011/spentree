/**
 * In-app notifications + optional browser reminders (budget 80%, daily log, streak risk).
 * Depends on app.js calling refresh() after state changes; streak-rank-system.js for computeStreaks.
 */
(function () {
  const panel = document.getElementById('notifyPanel');
  const toggle = document.getElementById('notifyToggle');
  const dot = document.getElementById('notifyDot');
  const listEl = document.getElementById('notifyList');
  const dailyToggle = document.getElementById('notifyDailyToggle');
  const dailyHour = document.getElementById('notifyDailyHour');

  if (!toggle || !panel || !listEl) return;

  let getters = {
    getForest: () => [],
    getBudget: () => ({ budget: 0, spent: 0 }),
    getViewingDay: () => false,
    getHasBudgetSession: () => false,
    getNotificationPrefs: () => ({ dailyReminder: false, dailyReminderHour: 9 }),
    saveNotificationPrefs: async () => {}
  };

  function todayKey() {
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  }

  function forestHasToday(forest) {
    const k = todayKey();
    return Array.isArray(forest) && forest.some(d => d.dateKey === k);
  }

  function buildItems() {
    const forest = getters.getForest();
    const { budget, spent } = getters.getBudget();
    const viewing = getters.getViewingDay();
    const hasSession = getters.getHasBudgetSession();
    const streaks = window.computeStreaks ? window.computeStreaks(forest) : { currentStreak: 0, longestStreak: 0 };
    const hour = new Date().getHours();

    const items = [];

    if (!viewing && budget > 0 && spent / budget >= 0.8) {
      const dismiss = localStorage.getItem(`spentree_dismiss_budget80_${todayKey()}`);
      if (!dismiss) {
        items.push({
          id: 'budget80',
          type: 'warn',
          title: 'Budget 80% used',
          body: `You've used about ${Math.round((spent / budget) * 100)}% of today’s budget.`,
          dismissKey: `spentree_dismiss_budget80_${todayKey()}`
        });
      }
    }

    if (!viewing && !forestHasToday(forest) && !hasSession) {
      const dismiss = localStorage.getItem(`spentree_dismiss_daily_${todayKey()}`);
      if (!dismiss) {
        items.push({
          id: 'dailylog',
          type: 'info',
          title: 'Log today’s expenses',
          body: 'Plant your daily budget and record spending to grow your streak.',
          dismissKey: `spentree_dismiss_daily_${todayKey()}`
        });
      }
    }

    if (!viewing && streaks.currentStreak > 0 && !forestHasToday(forest) && hour >= 17) {
      const dismiss = localStorage.getItem(`spentree_dismiss_streak_${todayKey()}`);
      if (!dismiss) {
        items.push({
          id: 'streakrisk',
          type: 'urgent',
          title: 'Streak at risk',
          body: `You’re on a ${streaks.currentStreak}-day streak. Finish today before midnight!`,
          dismissKey: `spentree_dismiss_streak_${todayKey()}`
        });
      }
    }

    return items;
  }

  function renderList() {
    const items = buildItems();
    if (items.length === 0) {
      listEl.innerHTML = '<li class="notify-empty">You’re all caught up. 🌿</li>';
      if (dot) dot.hidden = true;
      return;
    }
    if (dot) dot.hidden = false;
    listEl.innerHTML = items.map(
      it => `
      <li class="notify-item notify-item--${it.type}" data-id="${it.id}">
        <div class="notify-item-body">
          <strong>${it.title}</strong>
          <p>${it.body}</p>
        </div>
        <button type="button" class="notify-dismiss" data-dismiss="${it.dismissKey}">Dismiss</button>
      </li>`
    ).join('');

    listEl.querySelectorAll('.notify-dismiss').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.setItem(btn.getAttribute('data-dismiss'), '1');
        renderList();
      });
    });
  }

  function syncDailyControls() {
    const p = getters.getNotificationPrefs();
    if (dailyToggle) dailyToggle.checked = Boolean(p.dailyReminder);
    if (dailyHour) dailyHour.value = String(typeof p.dailyReminderHour === 'number' ? p.dailyReminderHour : 9);
  }

  let minuteTimer;
  function maybeFireBrowserReminder() {
    const p = getters.getNotificationPrefs();
    if (!p.dailyReminder || !('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    const h = p.dailyReminderHour != null ? p.dailyReminderHour : 9;
    if (now.getHours() !== h || now.getMinutes() !== 0) return;

    const pingKey = `spentree_browser_remind_${todayKey()}`;
    if (localStorage.getItem(pingKey)) return;

    const forest = getters.getForest();
    if (forestHasToday(forest)) return;

    localStorage.setItem(pingKey, '1');
    try {
      new Notification('Spentree — log today', {
        body: 'Plant your budget and log expenses to keep your forest growing.',
        icon: '/images/logo (1).png'
      });
    } catch (_) {}
  }

  function startMinuteLoop() {
    if (minuteTimer) clearInterval(minuteTimer);
    minuteTimer = setInterval(maybeFireBrowserReminder, 30000);
  }

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    if (open) {
      renderList();
      syncDailyControls();
    }
  });

  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== toggle) {
      panel.hidden = true;
    }
  });

  if (dailyToggle && dailyHour) {
    const persistPrefs = async () => {
      const dailyReminder = dailyToggle.checked;
      const dailyReminderHour = Math.min(23, Math.max(0, parseInt(dailyHour.value, 10) || 9));
      await getters.saveNotificationPrefs({ dailyReminder, dailyReminderHour });
      if (dailyReminder && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      startMinuteLoop();
    };
    dailyToggle.addEventListener('change', persistPrefs);
    dailyHour.addEventListener('change', persistPrefs);
  }

  window.SpentreeNotifications = {
    init(opts) {
      getters = { ...getters, ...opts };
      syncDailyControls();
      renderList();
      startMinuteLoop();
    },
    refresh() {
      renderList();
    }
  };
})();
