document.addEventListener('DOMContentLoaded', () => {
    // SPA Navigation Setup
    const pages = document.querySelectorAll('.page-section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const logoLink = document.querySelector('.logo');

    function navigateTo(targetId) {
        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.querySelector(targetId);
        if(targetPage) {
            targetPage.classList.add('active');
            window.scrollTo(0, 0);
        }

        navLinks.forEach(link => {
            if (link.getAttribute('href') === targetId) {
                link.style.color = 'var(--primary-color)';
            } else {
                link.style.color = 'var(--text-main)';
            }
        });
    }

    const initialHash = window.location.hash;
    if (initialHash && document.querySelector(initialHash)) {
        navigateTo(initialHash);
    }

    navLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                navigateTo(href);
            }
        });
    });

    navLinks.forEach(link => {
        if (link.getAttribute('href') === '#hero') {
            link.style.color = 'var(--primary-color)';
        }
    });

    if (logoLink) {
        logoLink.style.cursor = 'pointer';
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.querySelector('#hero')) navigateTo('#hero');
            else navigateTo('#app');
        });
    }

    const startBtn = document.querySelector('.btn[href="#app"]');
    if(startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo('#app');
        });
    }

    // DOM Elements
    const budgetInput = document.getElementById('dailyBudget');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const expenseSection = document.getElementById('expenseSection');
    const expenseAmountInput = document.getElementById('expenseAmount');
    const expenseDescInput = document.getElementById('expenseDesc');
    const addExpenseBtn = document.getElementById('addExpenseBtn');

    const totalSpentEl = document.getElementById('totalSpent');
    const totalRemainingEl = document.getElementById('totalRemaining');
    const expenseList = document.getElementById('expenseList');
    const treeStatusBadge = document.getElementById('statusBadge');
    const finishDayBtn = document.getElementById('finishDayBtn');
    const forestGrid = document.getElementById('forestGrid');
    const clearForestBtn = document.getElementById('clearForestBtn');
    const userRankSpan = document.querySelector('#userRank .rank-title');
    const xpBar = document.getElementById('xpBar');
    const leaderboardList = document.getElementById('leaderboardList');

    const leavesGroup = document.getElementById('leavesGroup');
    const logsHeader = document.getElementById('logsHeader');
    const backToTodayBtn = document.getElementById('backToTodayBtn');
    const defaultLogsHeaderText = logsHeader ? logsHeader.textContent : "Today's Logs";
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('spentree_token');
            localStorage.removeItem('spentree_user_name');
            window.location.href = 'auth.html';
        });
    }

    // State
    let viewingDay = false;
    let todayDraftSnapshot = null;

    let state = {
        budget: 0,
        spent: 0,
        logs: [],
        forest: [],
        leaves: [],
        userName: localStorage.getItem('spentree_user_name') || 'You',
        avatarDataUrl: null,
        notificationPrefs: { dailyReminder: false, dailyReminderHour: 9 }
    };

    let leaderboardPeriod = 'all';

    // Rank Data (kept for updateRank / renderLevels compatibility)
    const RANKS = [
        { name: 'Seed', requiredXP: 0 },
        { name: 'Sapling', requiredXP: 5 },
        { name: 'Young Tree', requiredXP: 10},
        { name: 'Forest Guardian', requiredXP: 20},
        { name: 'Nature Deity', requiredXP: 30 }
    ];

    // Tree constants
    const MAX_LEAVES = 60;
    const trunkTops = [
        {x: 140, y: 180},
        {x: 210, y: 160},
        {x: 260, y: 180},
        {x: 120, y: 215},
        {x: 200, y: 190}
    ];

    // Colors
    const COLORS = {
        healthy: '#2ecc71',
        healthyDark: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c'
    };

    // Backend helpers
    const API_BASE = '';

    async function apiFetch(path, options = {}) {
        const token = localStorage.getItem('spentree_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (token && !headers.Authorization) {
            headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });

        if (res.status === 401) {
            localStorage.removeItem('spentree_token');
            localStorage.removeItem('spentree_user_name');
            window.location.href = 'auth.html';
            throw new Error('Unauthorized');
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`API ${res.status}: ${text || res.statusText}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) return res.json();
        return res.text();
    }

    async function boot() {
        try {
            const me = await apiFetch('/api/me');
            if (me && me.username) {
                state.userName = me.username;
                localStorage.setItem('spentree_user_name', me.username);
            }
            if (me && me.notificationPrefs) {
                state.notificationPrefs = {
                    dailyReminder: Boolean(me.notificationPrefs.dailyReminder),
                    dailyReminderHour: typeof me.notificationPrefs.dailyReminderHour === 'number'
                        ? me.notificationPrefs.dailyReminderHour
                        : 9
                };
            }
            if (me && me.avatarDataUrl) state.avatarDataUrl = me.avatarDataUrl;
        } catch (e) {
            console.error('Failed to load profile:', e);
        }

        try {
            state.forest = await apiFetch('/api/days');
        } catch (e) {
            console.error('Failed to load days:', e);
            state.forest = [];
        }

        updateRank();
        updateProfile();
        renderForest();
        updateUI();

        // ── STREAK SYSTEM ──
        if (window.updateStreakSystem) window.updateStreakSystem(state.forest);

        if (window.SpentreeNotifications && typeof window.SpentreeNotifications.init === 'function') {
            window.SpentreeNotifications.init({
                getForest: () => state.forest,
                getBudget: () => ({ budget: state.budget, spent: state.spent }),
                getViewingDay: () => viewingDay,
                getHasBudgetSession: () => !viewingDay && state.budget > 0,
                getNotificationPrefs: () => state.notificationPrefs,
                saveNotificationPrefs: async (p) => {
                    await apiFetch('/api/me/notifications', {
                        method: 'PATCH',
                        body: JSON.stringify(p)
                    });
                    state.notificationPrefs = { ...state.notificationPrefs, ...p };
                }
            });
        }

        refreshSocial().catch(() => {});
    }

    boot().catch((e) => console.error('Boot error:', e));

    if (setBudgetBtn) setBudgetBtn.addEventListener('click', () => {
        const val = parseFloat(budgetInput.value);
        if (val > 0) {
            state.budget = val;
            state.spent = 0;
            state.logs = [];

            budgetInput.disabled = true;
            setBudgetBtn.textContent = 'Budget Planted 🌱';
            setBudgetBtn.disabled = true;
            expenseSection.classList.remove('disabled');
            finishDayBtn.disabled = false;

            expenseAmountInput.focus();

            updateUI();
            generateLeaves();
        }
    });

    if (addExpenseBtn) addExpenseBtn.addEventListener('click', processExpense);
    if (expenseAmountInput) expenseAmountInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') processExpense();
    });
    if (expenseDescInput) expenseDescInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') processExpense();
    });

    function processExpense() {
        if (viewingDay) return;
        if (!expenseAmountInput || !expenseDescInput) return;
        const amt = parseFloat(expenseAmountInput.value);
        const desc = expenseDescInput.value.trim() || 'Uncategorized';

        if (amt && amt > 0) {
            state.spent += amt;
            state.logs.unshift({ desc, amt, time: new Date().toLocaleTimeString() });

            expenseAmountInput.value = '';
            expenseDescInput.value = '';
            expenseAmountInput.focus();

            updateUI();
            updateTreeVisuals();

            const treeSvg = document.getElementById('dailyTree');
            if (treeSvg) {
                treeSvg.classList.remove('shake');
                void treeSvg.offsetWidth;
                treeSvg.classList.add('shake');
            }
        }
    }

    if (finishDayBtn) {
        finishDayBtn.addEventListener('click', async () => {
            if (viewingDay) return;
            if (state.budget > 0) {
                const now = new Date();
                const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const displayDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                finishDayBtn.disabled = true;
                setBudgetBtn && (setBudgetBtn.disabled = true);

                try {
                    await apiFetch('/api/days', {
                        method: 'POST',
                        body: JSON.stringify({
                            dateKey,
                            displayDate,
                            budget: state.budget,
                            expenses: state.logs
                        })
                    });
                } catch (e) {
                    console.error('Failed to save day:', e);
                    alert('Failed to save your day. Please try again.');
                    finishDayBtn.disabled = false;
                    setBudgetBtn && (setBudgetBtn.disabled = false);
                    return;
                }

                state.budget = 0;
                state.spent = 0;
                state.logs = [];

                budgetInput && (budgetInput.disabled = false);
                if (budgetInput) budgetInput.value = '';
                if (setBudgetBtn) {
                    setBudgetBtn.innerHTML = 'Plant Daily Budget';
                    setBudgetBtn.disabled = false;
                }
                expenseSection && expenseSection.classList.add('disabled');
                finishDayBtn.disabled = true;

                const currentLeaves = document.querySelectorAll('.leaf');
                currentLeaves.forEach(leaf => {
                    leaf.style.transform = `translate(${leaf.getAttribute('data-cx')}px, 600px) scale(0)`;
                    leaf.style.opacity = '0';
                });

                setTimeout(async () => {
                    if (leavesGroup) leavesGroup.innerHTML = '';
                    state.leaves = [];
                    updateUI();

                    try {
                        state.forest = await apiFetch('/api/days');
                    } catch (e) {
                        console.error('Failed to reload forest:', e);
                        state.forest = [];
                    }

                    renderForest();
                    updateRank();
                    updateProfile();

                    // ── STREAK SYSTEM ──
                    if (window.updateStreakSystem) window.updateStreakSystem(state.forest);

                    viewingDay = false;
                    todayDraftSnapshot = null;
                    navigateTo('#forest');
                }, 1000);
            }
        });
    }

    if (clearForestBtn) {
        clearForestBtn.addEventListener('click', async () => {
            if(confirm('Are you sure you want to clear your entire forest history?')) {
                try {
                    await apiFetch('/api/days', { method: 'DELETE' });
                    state.forest = [];
                    renderForest();
                    updateRank();
                    updateProfile();
                    // ── STREAK SYSTEM ──
                    if (window.updateStreakSystem) window.updateStreakSystem(state.forest);
                } catch (e) {
                    console.error('Failed to clear forest:', e);
                    alert('Failed to clear forest. Please try again.');
                }
            }
        });
    }

    function updateUI() {
        if (!treeStatusBadge || !expenseList) return;
        const remaining = state.budget - state.spent;

        animateValue(totalSpentEl, state.spent);
        animateValue(totalRemainingEl, remaining);

        if (state.logs.length === 0) {
            expenseList.innerHTML = '<li class="empty-state">No costs logged yet. Watch your tree grow!</li>';
        } else {
            expenseList.innerHTML = state.logs.map(log =>
                `<li>
                    <div>
                        <div style="font-weight:500">${log.desc}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted)">${log.time}</div>
                    </div>
                    <strong>₹${log.amt.toFixed(2)}</strong>
                </li>`
            ).join('');
        }

        if (state.budget === 0) {
            treeStatusBadge.textContent = 'Awaiting Seed 🌱';
            treeStatusBadge.style.background = 'rgba(255, 255, 255, 0.05)';
            treeStatusBadge.style.color = 'var(--text-muted)';
            treeStatusBadge.style.boxShadow = 'none';
        } else {
            const healthPct = remaining / state.budget;
            if (healthPct >= 0.5) {
                treeStatusBadge.textContent = 'Flourishing 🌿';
                treeStatusBadge.style.background = 'rgba(46, 204, 113, 0.15)';
                treeStatusBadge.style.color = COLORS.healthy;
            } else if (healthPct >= 0) {
                treeStatusBadge.textContent = 'Wilting 🍂';
                treeStatusBadge.style.background = 'rgba(243, 156, 18, 0.15)';
                treeStatusBadge.style.color = COLORS.warning;
            } else {
                treeStatusBadge.textContent = 'Overspent 🥀';
                treeStatusBadge.style.background = 'rgba(231, 76, 60, 0.15)';
                treeStatusBadge.style.color = COLORS.danger;
            }
        }

        if (window.SpentreeNotifications && typeof window.SpentreeNotifications.refresh === 'function') {
            window.SpentreeNotifications.refresh();
        }
    }

    function isEditingToday() {
        return Boolean(budgetInput && budgetInput.disabled && state.budget > 0);
    }

    function applySeedModeUI() {
        state.budget = 0;
        state.spent = 0;
        state.logs = [];

        if (budgetInput) {
            budgetInput.disabled = false;
            budgetInput.value = '';
        }
        if (setBudgetBtn) {
            setBudgetBtn.innerHTML = 'Plant Daily Budget';
            setBudgetBtn.disabled = false;
        }
        if (expenseSection) expenseSection.classList.add('disabled');
        if (finishDayBtn) finishDayBtn.disabled = true;
        if (backToTodayBtn) backToTodayBtn.style.display = 'none';

        updateUI();
    }

    function applyEditingModeUI() {
        if (budgetInput) budgetInput.disabled = true;
        if (setBudgetBtn) {
            setBudgetBtn.innerHTML = 'Budget Planted 🌱';
            setBudgetBtn.disabled = true;
        }
        if (expenseSection) expenseSection.classList.remove('disabled');
        if (finishDayBtn) finishDayBtn.disabled = false;
        if (backToTodayBtn) backToTodayBtn.style.display = 'inline-block';
        updateUI();
    }

    async function showDayExpenses(dateKey) {
        if (!dateKey) return;
        if (!logsHeader || !expenseList) return;

        if (!viewingDay) {
            if (isEditingToday()) {
                todayDraftSnapshot = {
                    budget: state.budget,
                    spent: state.spent,
                    logs: Array.isArray(state.logs) ? state.logs.slice() : []
                };
            } else {
                todayDraftSnapshot = null;
            }
        }

        viewingDay = true;

        if (budgetInput) budgetInput.disabled = true;
        if (setBudgetBtn) {
            setBudgetBtn.innerHTML = 'Viewing Day';
            setBudgetBtn.disabled = true;
        }
        if (expenseSection) expenseSection.classList.add('disabled');
        if (finishDayBtn) finishDayBtn.disabled = true;
        if (backToTodayBtn) backToTodayBtn.style.display = 'inline-block';

        try {
            const day = await apiFetch(`/api/days/${encodeURIComponent(dateKey)}`);
            state.budget = day.budget || 0;
            state.spent = day.spent || 0;
            state.logs = Array.isArray(day.expenses) ? day.expenses : [];

            logsHeader.textContent = `Expenses for ${day.displayDate || day.date || dateKey}`;
            updateUI();

            if (document.querySelector('#app')) navigateTo('#app');
        } catch (e) {
            console.error('Failed to load day details:', e);
            alert('Could not load expenses for that day.');
        }
    }

    function restoreTodayFromView() {
        if (!viewingDay) return;
        viewingDay = false;

        if (todayDraftSnapshot) {
            state.budget = todayDraftSnapshot.budget;
            state.spent = todayDraftSnapshot.spent;
            state.logs = todayDraftSnapshot.logs;
            applyEditingModeUI();
        } else {
            applySeedModeUI();
        }
        if (backToTodayBtn) backToTodayBtn.style.display = 'none';
        todayDraftSnapshot = null;
        if (logsHeader) logsHeader.textContent = defaultLogsHeaderText;
    }

    if (backToTodayBtn) {
        backToTodayBtn.addEventListener('click', restoreTodayFromView);
    }

    function animateValue(element, endValue) {
        if (!element) return;
        element.textContent = `₹${endValue.toFixed(2)}`;
        element.style.transform = 'scale(1.1)';
        element.style.color = endValue < 0 ? COLORS.danger : '';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    function generateLeaves() {
        if (!leavesGroup) return;
        leavesGroup.innerHTML = '';
        state.leaves = [];

        const health = state.budget - state.spent;
        let c = 'var(--primary-color)';
        if (health < 0) {
            c = 'var(--danger-color)';
        } else if (health < (state.budget * 0.2)) {
            c = 'var(--warning-color)';
        }

        let numLeaves = 0;
        if (state.budget > 0) {
            let percentage = state.spent / state.budget;
            if (percentage > 1) percentage = 1;
            numLeaves = Math.floor(MAX_LEAVES * Math.max(0.1, 1 - percentage));
            if (health < 0) numLeaves = 5;
        }

        for (let i = 0; i < numLeaves; i++) {
            const branch = trunkTops[Math.floor(Math.random() * trunkTops.length)];
            const cx = branch.x + (Math.random() - 0.5) * 120;
            const cy = branch.y + (Math.random() - 0.5) * 120;
            const size = 20 + Math.floor(Math.random() * 20);

            const color = Math.random() > 0.5 ? COLORS.healthy : COLORS.healthyDark;

            const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            leaf.setAttribute('x', '0');
            leaf.setAttribute('y', '0');
            leaf.setAttribute('width', size);
            leaf.setAttribute('height', size);
            leaf.setAttribute('fill', color);
            leaf.setAttribute('class', 'leaf');
            leaf.setAttribute('data-cx', cx);

            leaf.style.opacity = '0';
            leaf.style.transform = `translate(${cx}px, ${cy + 50}px) scale(0)`;

            leavesGroup.appendChild(leaf);
            state.leaves.push({ el: leaf, cx, cy, originalColor: color, size, isWithered: false, isFallen: false });

            setTimeout(() => {
                leaf.style.opacity = '0.9';
                leaf.style.transform = `translate(${cx}px, ${cy}px) scale(1)`;
            }, 100 + (Math.random() * 1500));
        }
    }

    function updateTreeVisuals() {
        if(state.budget <= 0) return;

        const healthPct = (state.budget - state.spent) / state.budget;

        state.leaves.forEach((leafData, index) => {
            const threshold = 0.8 * (index / MAX_LEAVES);

            if (healthPct < 0) {
                if(Math.random() > 0.2) {
                    leafData.el.setAttribute('fill', COLORS.danger);
                    if(!leafData.isFallen) {
                        const fallY = 480 + Math.random() * 40;
                        leafData.el.style.transform = `translate(${leafData.cx}px, ${fallY}px) rotate(45deg) scale(0.6)`;
                        leafData.isFallen = true;
                    }
                } else {
                    leafData.el.setAttribute('fill', '#c0392b');
                    leafData.el.style.transform = `translate(${leafData.cx}px, ${leafData.cy + 10}px) scale(0.8)`;
                }
            } else if (healthPct < threshold) {
                leafData.el.setAttribute('fill', COLORS.warning);
                leafData.el.style.transform = `translate(${leafData.cx}px, ${leafData.cy + 20}px) scale(0.8)`;
            } else {
                leafData.el.setAttribute('fill', leafData.originalColor);
                leafData.isFallen = false;
                leafData.el.style.transform = `translate(${leafData.cx}px, ${leafData.cy}px) scale(1)`;
            }
        });
    }

    function getPixelTreeHTML(health) {
        let leafColor = '#2ecc71';
        if (health < 0) leafColor = '#e74c3c';
        else if (health === 0) leafColor = '#f39c12';

        let html = `<svg viewBox="0 0 40 40" style="width: 100%; height: auto;" shape-rendering="crispEdges">
                        <rect x="18" y="24" width="4" height="12" fill="#8B5A2B"/>`;

        if (health < -2) {
            html += `<rect x="12" y="32" width="6" height="4" fill="${leafColor}"/>`;
        } else if (health < 0) {
            html += `<rect x="14" y="14" width="12" height="10" fill="${leafColor}"/>`;
        } else {
            html += `<rect x="10" y="16" width="20" height="8" fill="${leafColor}"/>
                     <rect x="14" y="10" width="12" height="6" fill="${leafColor}"/>
                     <rect x="16" y="6" width="8" height="4" fill="${leafColor}"/>`;
        }

        html += `</svg>`;
        return html;
    }

    // ── updateRank — kept for compatibility, streak-rank-system.js now owns the UI ──
    function updateRank() {
        // Nav rank badge + XP bar is now handled by streak-rank-system.js
        // This function kept so existing calls don't break
        if (!xpBar) return;
        const currentXP = state.forest.filter(day => day.health >= 0).length;

        let currentRank = RANKS[0];
        let nextRank = RANKS[1];
        for (let i = 0; i < RANKS.length; i++) {
            if (currentXP >= RANKS[i].requiredXP) {
                currentRank = RANKS[i];
                nextRank = RANKS[i + 1] || currentRank;
            }
        }

        // Only update the old rank badge text if streak-rank-system hasn't taken over
        if (!window.updateStreakSystem && userRankSpan) {
            userRankSpan.textContent = currentRank.name;
        }
        if (!window.updateStreakSystem) {
            if (currentRank.name === nextRank.name) {
                xpBar.style.width = '100%';
            } else {
                const xpIntoRank = currentXP - currentRank.requiredXP;
                const xpNeeded = nextRank.requiredXP - currentRank.requiredXP;
                xpBar.style.width = `${(xpIntoRank / xpNeeded) * 100}%`;
            }
        }

        updateLeaderboard();
    }

    async function updateLeaderboard() {
        if (!leaderboardList) return;

        try {
            const q = leaderboardPeriod === 'weekly' ? '?period=weekly' : '';
            const data = await apiFetch(`/api/leaderboard${q}`);
            const top = Array.isArray(data?.top) ? data.top : [];
            const you = data?.you;

            const hintEl = document.getElementById('leaderboardWeekHint');
            if (hintEl) {
                if (data?.period === 'weekly' && data.weekStarts && data.weekEnds) {
                    hintEl.style.display = 'block';
                    hintEl.textContent =
                        `This board resets every Monday. Current window: ${data.weekStarts} → ${data.weekEnds} (healthy days only).`;
                } else {
                    hintEl.style.display = 'none';
                }
            }

            const normalized = top.map((u) => ({
                userId: u.userId,
                name: u.name,
                xp: u.xp,
                rankName: u.rankName
            }));

            if (you && !normalized.some((u) => String(u.userId) === String(you.userId))) {
                normalized.push({
                    userId: you.userId,
                    name: you.name,
                    xp: you.xp,
                    rankName: you.rankName
                });
            }

            normalized.sort((a, b) => b.xp - a.xp);

            const xpLabel = leaderboardPeriod === 'weekly' ? 'XP (week)' : 'XP';
            leaderboardList.innerHTML = normalized.map((user, index) => {
                const isCurrent = you && String(user.userId) === String(you.userId);
                return `
                    <li class="leaderboard-item ${isCurrent ? 'current-user' : ''}">
                        <div class="leaderboard-rank-num">#${index + 1}</div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${user.name}</div>
                            <div class="leaderboard-stats">${user.rankName}</div>
                        </div>
                        <div class="leaderboard-score">${user.xp} ${xpLabel}</div>
                    </li>
                `;
            }).join('');
        } catch (e) {
            console.error('Leaderboard load failed:', e);
            leaderboardList.innerHTML = `<li class="empty-state">Leaderboard unavailable.</li>`;
        }
    }

    document.querySelectorAll('.lb-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            leaderboardPeriod = btn.dataset.period === 'weekly' ? 'weekly' : 'all';
            updateLeaderboard();
        });
    });

    const shareRankBtn = document.getElementById('shareRankBtn');
    if (shareRankBtn) {
        shareRankBtn.addEventListener('click', async () => {
            const xp = state.forest.filter(d => typeof d.health === 'number' && d.health >= 0).length;
            const rank = window.getRankForXP
                ? window.getRankForXP(xp)
                : { name: 'Seed', emoji: '🌱' };
            const text = `${rank.emoji} ${rank.name} on Spentree — ${xp} XP and growing! 🌿 #Spentree`;
            try {
                if (navigator.share) {
                    await navigator.share({ title: 'My Spentree rank', text });
                } else if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    alert('Rank copied to clipboard!');
                } else {
                    alert(text);
                }
            } catch (err) {
                if (err && err.name === 'AbortError') return;
                alert(text);
            }
        });
    }

    async function refreshSocial() {
        const incList = document.getElementById('incomingRequestsList');
        const frList = document.getElementById('friendsCompareList');
        const sendBtn = document.getElementById('sendFriendRequestBtn');
        const emailIn = document.getElementById('friendEmailInput');
        if (!incList || !frList) return;

        try {
            const [reqData, friendsData] = await Promise.all([
                apiFetch('/api/friends/requests'),
                apiFetch('/api/friends')
            ]);

            const incoming = Array.isArray(reqData?.incoming) ? reqData.incoming : [];
            if (incoming.length === 0) {
                incList.innerHTML = '<li class="empty-state">No pending requests.</li>';
            } else {
                incList.innerHTML = incoming.map(
                    u => `
                    <li class="friend-request-item">
                        <div>
                            <strong>${escapeHtml(u.username)}</strong>
                            <div class="friend-email">${escapeHtml(u.email)}</div>
                        </div>
                        <div class="friend-request-actions">
                            <button type="button" class="btn primary-btn btn-sm accept-req" data-user-id="${u.userId}">Accept</button>
                            <button type="button" class="btn secondary-btn btn-sm decline-req" data-user-id="${u.userId}">Decline</button>
                        </div>
                    </li>`
                ).join('');
                incList.querySelectorAll('.accept-req').forEach(b => {
                    b.addEventListener('click', async () => {
                        try {
                            await apiFetch('/api/friends/accept', {
                                method: 'POST',
                                body: JSON.stringify({ userId: b.getAttribute('data-user-id') })
                            });
                            await refreshSocial();
                        } catch (e) {
                            console.error(e);
                            alert('Could not accept request.');
                        }
                    });
                });
                incList.querySelectorAll('.decline-req').forEach(b => {
                    b.addEventListener('click', async () => {
                        try {
                            await apiFetch('/api/friends/decline', {
                                method: 'POST',
                                body: JSON.stringify({ userId: b.getAttribute('data-user-id') })
                            });
                            await refreshSocial();
                        } catch (e) {
                            console.error(e);
                            alert('Could not decline request.');
                        }
                    });
                });
            }

            const friends = Array.isArray(friendsData?.friends) ? friendsData.friends : [];
            const you = friendsData?.you || { currentStreak: 0, longestStreak: 0, weeklyXp: 0 };
            const youRow = `<li class="friend-you-row glass-highlight">
                        <span><strong>You</strong></span>
                        <span title="Current streak">🔥 ${you.currentStreak}</span>
                        <span title="Best streak">Best ${you.longestStreak}</span>
                        <span title="Healthy days this week">Week ${you.weeklyXp} XP</span>
                        <span></span>
                    </li>`;
            const emptyHint =
                friends.length === 0
                    ? '<li class="empty-state friend-empty-hint">No friends yet. Invite someone by email!</li>'
                    : '';
            frList.innerHTML =
                youRow +
                emptyHint +
                friends
                    .map(
                        f => `
                    <li class="friend-row" data-id="${f.userId}">
                        <span><strong>${escapeHtml(f.username)}</strong></span>
                        <span>🔥 ${f.currentStreak}</span>
                        <span>Best ${f.longestStreak}</span>
                        <span>Week ${f.weeklyXp} XP</span>
                        <button type="button" class="btn secondary-btn btn-sm remove-friend" data-user-id="${f.userId}">Remove</button>
                    </li>`
                    )
                    .join('');
            if (friends.length) {
                frList.querySelectorAll('.remove-friend').forEach(b => {
                    b.addEventListener('click', async () => {
                        if (!confirm('Remove this friend?')) return;
                        const id = b.getAttribute('data-user-id');
                        try {
                            await apiFetch(`/api/friends/${encodeURIComponent(id)}`, { method: 'DELETE' });
                            await refreshSocial();
                        } catch (e) {
                            console.error(e);
                            alert('Could not remove friend.');
                        }
                    });
                });
            }
        } catch (e) {
            console.error('Social load failed:', e);
            incList.innerHTML = '<li class="empty-state">Sign in to use friends.</li>';
            frList.innerHTML = '';
        }

        if (sendBtn && emailIn && !sendBtn.dataset.bound) {
            sendBtn.dataset.bound = '1';
            sendBtn.addEventListener('click', async () => {
                const email = emailIn.value.trim().toLowerCase();
                if (!email) return;
                try {
                    await apiFetch('/api/friends/request', {
                        method: 'POST',
                        body: JSON.stringify({ email })
                    });
                    emailIn.value = '';
                    alert('Friend request sent.');
                    await refreshSocial();
                } catch (e) {
                    console.error(e);
                    alert(e.message || 'Could not send request.');
                }
            });
        }
    }

    function escapeHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function updateProfile() {
        const currentXP = state.forest.filter(d => d.health >= 0).length;
        const rankUi = window.getRankForXP ? window.getRankForXP(currentXP) : null;
        const currentRank = rankUi || [...RANKS].reverse().find(r => currentXP >= r.requiredXP) || RANKS[0];
        const nextRankLegacy = RANKS.find(r => r.requiredXP > currentXP);

        const totalBudget = state.forest.reduce((sum, d) => sum + (d.budget || 0), 0);
        const totalSpent  = state.forest.reduce((sum, d) => sum + (d.spent  || 0), 0);
        const totalSavings = state.forest.reduce((sum, d) => {
            const b = Number(d.budget) || 0;
            const s = Number(d.spent) || 0;
            return sum + Math.max(0, b - s);
        }, 0);
        const streakInfo = window.computeStreaks ? window.computeStreaks(state.forest) : { longestStreak: 0 };

        const profileNameDisplay = document.getElementById('profileNameDisplay');
        if (profileNameDisplay) profileNameDisplay.textContent = state.userName;

        const profileRank = document.getElementById('profileRank');
        if (profileRank) {
            profileRank.textContent = rankUi ? `${rankUi.emoji} ${rankUi.name}` : currentRank.name;
        }

        const profileXP = document.getElementById('profileXP');
        if (profileXP) profileXP.textContent = currentXP;

        const profileDaysCompleted = document.getElementById('profileDaysCompleted');
        if (profileDaysCompleted) profileDaysCompleted.textContent = state.forest.length;

        const profileTotalBudget = document.getElementById('profileTotalBudget');
        if (profileTotalBudget) profileTotalBudget.textContent = `₹${totalBudget.toFixed(2)}`;

        const profileTotalSpent = document.getElementById('profileTotalSpent');
        if (profileTotalSpent) profileTotalSpent.textContent = `₹${totalSpent.toFixed(2)}`;

        const profileSavings = document.getElementById('profileTotalSavings');
        if (profileSavings) profileSavings.textContent = `₹${totalSavings.toFixed(2)}`;

        const profileBestStreak = document.getElementById('profileBestStreak');
        if (profileBestStreak) profileBestStreak.textContent = String(streakInfo.longestStreak || 0);

        const profileAvatarImg = document.getElementById('profileAvatarImg');
        const profileAvatarPh = document.getElementById('profileAvatarPlaceholder');
        if (profileAvatarImg && profileAvatarPh) {
            if (state.avatarDataUrl) {
                profileAvatarImg.src = state.avatarDataUrl;
                profileAvatarImg.style.display = 'block';
                profileAvatarPh.style.display = 'none';
            } else {
                profileAvatarImg.removeAttribute('src');
                profileAvatarImg.style.display = 'none';
                profileAvatarPh.style.display = 'flex';
            }
        }

        const profileLevelFill    = document.getElementById('profileLevelFill');
        const profileProgressText = document.getElementById('profileProgressText');

        if (rankUi && window.getNextRankForXP) {
            const nr = window.getNextRankForXP(currentXP);
            if (nr) {
                const xpIntoRank = currentXP - rankUi.requiredXP;
                const xpNeeded   = nr.requiredXP - rankUi.requiredXP;
                if (profileLevelFill && xpNeeded > 0) {
                    profileLevelFill.style.width = `${Math.min(100, (xpIntoRank / xpNeeded) * 100)}%`;
                }
                if (profileProgressText) {
                    profileProgressText.textContent = `${xpIntoRank}/${xpNeeded} XP to ${nr.name}`;
                }
            } else {
                if (profileLevelFill) profileLevelFill.style.width = '100%';
                if (profileProgressText) profileProgressText.textContent = 'Max rank reached!';
            }
        } else if (nextRankLegacy) {
            const xpIntoRank = currentXP - currentRank.requiredXP;
            const xpNeeded   = nextRankLegacy.requiredXP - currentRank.requiredXP;
            if (profileLevelFill) profileLevelFill.style.width = `${(xpIntoRank / xpNeeded) * 100}%`;
            if (profileProgressText) {
                profileProgressText.textContent = `${xpIntoRank}/${xpNeeded} XP to ${nextRankLegacy.name}`;
            }
        } else {
            if (profileLevelFill) profileLevelFill.style.width = '100%';
            if (profileProgressText) profileProgressText.textContent = 'Max rank reached!';
        }
    }

    // Profile name editing
    function setupProfileNameEditing() {
        const editNameBtn   = document.getElementById('editNameBtn');
        const editNameForm  = document.getElementById('editNameForm');
        const nameInput     = document.getElementById('nameInput');
        const saveNameBtn   = document.getElementById('saveNameBtn');
        const cancelNameBtn = document.getElementById('cancelNameBtn');

        if (!editNameBtn) return;

        editNameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            editNameForm.style.display = 'block';
            nameInput.value = state.userName;
            nameInput.focus();
        });

        saveNameBtn.addEventListener('click', async () => {
            const newName = nameInput.value.trim();
            if (newName) {
                try {
                    await apiFetch('/api/profile', {
                        method: 'PATCH',
                        body: JSON.stringify({ username: newName })
                    });
                    state.userName = newName;
                    localStorage.setItem('spentree_user_name', newName);
                    editNameForm.style.display = 'none';
                    updateProfile();
                } catch (e) {
                    console.error('Failed to save name:', e);
                    alert('Failed to save name. Please try again.');
                }
            }
        });

        cancelNameBtn.addEventListener('click', () => {
            editNameForm.style.display = 'none';
        });

        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveNameBtn.click();
        });
    }

    setupProfileNameEditing();

    function setupProfileAvatar() {
        const btn = document.getElementById('profileAvatarBtn');
        const input = document.getElementById('profileAvatarInput');
        if (!btn || !input) return;

        btn.addEventListener('click', () => input.click());

        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            input.value = '';
            if (!file || !file.type.startsWith('image/')) return;

            try {
                const dataUrl = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result);
                    r.onerror = reject;
                    r.readAsDataURL(file);
                });
                const img = new Image();
                await new Promise((res, rej) => {
                    img.onload = res;
                    img.onerror = rej;
                    img.src = dataUrl;
                });
                const c = document.createElement('canvas');
                const s = 160;
                c.width = s;
                c.height = s;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, s, s);
                const jpeg = c.toDataURL('image/jpeg', 0.85);
                if (jpeg.length > 170000) {
                    alert('Image is still too large after resize. Try a smaller photo.');
                    return;
                }
                await apiFetch('/api/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({ avatarDataUrl: jpeg })
                });
                state.avatarDataUrl = jpeg;
                updateProfile();
            } catch (e) {
                console.error(e);
                alert('Could not update photo.');
            }
        });
    }

    setupProfileAvatar();

    function getForestOrderedDays() {
        // Keep forest sequence stable: oldest day first (Day 1), newest last.
        return [...state.forest].sort((a, b) => {
            const aKey = String(a?.dateKey || a?.date_key || '');
            const bKey = String(b?.dateKey || b?.date_key || '');
            return aKey.localeCompare(bKey);
        });
    }

    function renderForest() {
        if (!forestGrid) return;
        if (state.forest.length === 0) {
            forestGrid.innerHTML = `
                <div class="empty-forest glass-card">
                    <h4 class="mb-2">The forest is empty</h4>
                    <p>Complete a daily budget to plant your first tree.</p>
                </div>
            `;
            return;
        }

        forestGrid.innerHTML = '';
        const orderedDays = getForestOrderedDays();
        orderedDays.forEach((day, i) => {
            const dateKey = day.dateKey || day.date_key;
            if (!dateKey) return;

            let treeStatusHTML = getPixelTreeHTML(day.budget > 0 ? (day.budget - day.spent) : 0);

            let color  = COLORS.healthy;
            let status = 'Flourishing';
            if (day.health < 0) {
                color  = COLORS.danger;
                status = 'Overspent';
            } else if (day.health < 0.5) {
                color  = COLORS.warning;
                status = 'Withered';
            }

            const card = document.createElement('div');
            card.className = 'tree-card fade-in-up';
            card.style.animationDelay = `${i * 0.1}s`;
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.style.cursor = 'pointer';

            card.innerHTML = `
                ${treeStatusHTML}
                <h4>Day ${i + 1}</h4>
                <div class="date">${day.displayDate || day.date || ''}</div>
                <div class="stats mb-2" style="color: ${color}">${status}</div>
                <div style="font-size: 0.9rem;">₹${day.spent.toFixed(2)} / ₹${day.budget.toFixed(2)}</div>
            `;

            card.addEventListener('click', () => showDayExpenses(dateKey));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') showDayExpenses(dateKey);
            });

            forestGrid.appendChild(card);
        });
    }
});