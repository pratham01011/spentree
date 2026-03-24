const path = require('path');
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Day = require('./models/Day');
const auth = require('./middleware/auth');
const { computeStreaksFromDays, weekBoundsLocal } = require('./lib/streaks');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3001/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value.toLowerCase();
    let user = await User.findOne({ email });

    if (user) {
      // existing user — attach googleId if not already
      if (!user.googleId) { user.googleId = profile.id; await user.save(); }
    } else {
      // new user via Google
      user = await User.create({
        username: profile.displayName,
        email,
        googleId: profile.id,
        passwordHash: null
      });
    }
    return done(null, user);
  } catch (e) {
    return done(e, null);
  }
}));
const frontEndDir = path.join(__dirname, '..');

// ─── Rank Helper ─────────────────────────────────────────────────────────────
const RANKS = [
  { name: 'Novice Sprout', requiredXP: 0 },
  { name: 'Apprentice Sapling', requiredXP: 3 },
  { name: 'Forest Guardian', requiredXP: 7 },
  { name: 'Elder Ent', requiredXP: 15 },
  { name: 'Nature Deity', requiredXP: 30 }
];

function rankForXP(xp) {
  let current = RANKS[0];
  for (const r of RANKS) { if (xp >= r.requiredXP) current = r; }
  return current.name;
}

// ─── API Routes ──────────────────────────────────────────────────────────────
const api = express.Router();

// ── Auth: Register ─────────────────────────────────────────────────────────
api.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || typeof username !== 'string') return res.status(400).json({ message: 'username is required.' });
    if (!email || typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ message: 'Valid email is required.' });
    if (!password || typeof password !== 'string' || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(409).json({ message: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: username.trim(), email: normalizedEmail, passwordHash });

    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'JWT_SECRET not configured.' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: { userId: user._id, username: user.username, email: user.email }
    });
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ message: 'Failed to register.' });
  }
});

// ── Auth: Login ───────────────────────────────────────────────────────────
api.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ message: 'Valid email is required.' });
    if (!password || typeof password !== 'string') return res.status(400).json({ message: 'Password is required.' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });

    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'JWT_SECRET not configured.' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: { userId: user._id, username: user.username, email: user.email }
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ message: 'Failed to login.' });
  }
});

api.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

api.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth.html' }),
  (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const username = encodeURIComponent(req.user.username);
    res.redirect(`/auth.html?token=${token}&username=${username}`);
  }
);

// ── User profile ───────────────────────────────────────────────────────────
api.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('username email avatarDataUrl notificationPrefs');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const prefs = user.notificationPrefs || {};
  return res.json({
    userId: user._id,
    username: user.username,
    email: user.email,
    avatarDataUrl: user.avatarDataUrl || null,
    notificationPrefs: {
      dailyReminder: Boolean(prefs.dailyReminder),
      dailyReminderHour: typeof prefs.dailyReminderHour === 'number' ? prefs.dailyReminderHour : 9
    }
  });
});

api.patch('/me/notifications', auth, async (req, res) => {
  const { dailyReminder, dailyReminderHour } = req.body || {};
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (!user.notificationPrefs) user.notificationPrefs = {};
  if (typeof dailyReminder === 'boolean') user.notificationPrefs.dailyReminder = dailyReminder;
  if (typeof dailyReminderHour === 'number' && dailyReminderHour >= 0 && dailyReminderHour <= 23) {
    user.notificationPrefs.dailyReminderHour = dailyReminderHour;
  }
  await user.save();
  return res.json({
    ok: true,
    notificationPrefs: {
      dailyReminder: Boolean(user.notificationPrefs.dailyReminder),
      dailyReminderHour: user.notificationPrefs.dailyReminderHour
    }
  });
});

api.patch('/profile', auth, async (req, res) => {
  const { username, avatarDataUrl } = req.body || {};
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (username !== undefined) {
    if (!username || typeof username !== 'string') return res.status(400).json({ message: 'username is required when provided.' });
    user.username = username.trim();
  }
  if (avatarDataUrl !== undefined) {
    if (avatarDataUrl === null || avatarDataUrl === '') {
      user.avatarDataUrl = null;
    } else if (typeof avatarDataUrl === 'string') {
      if (avatarDataUrl.length > 180000) return res.status(400).json({ message: 'Avatar image is too large.' });
      if (!avatarDataUrl.startsWith('data:image/')) return res.status(400).json({ message: 'Avatar must be a data URL image.' });
      user.avatarDataUrl = avatarDataUrl;
    }
  }

  if (username === undefined && avatarDataUrl === undefined) {
    return res.status(400).json({ message: 'Nothing to update.' });
  }

  await user.save();
  return res.json({
    ok: true,
    user: {
      userId: user._id,
      username: user.username,
      email: user.email,
      avatarDataUrl: user.avatarDataUrl || null
    }
  });
});

// ── Days API ────────────────────────────────────────────────────────────────
api.get('/days', auth, async (req, res) => {
  const userDays = await Day.find({ userId: req.userId }).sort({ dateKey: -1 }).select('dateKey displayDate budget spent health');
  return res.json(userDays.map(d => ({
    dateKey: d.dateKey,
    date: d.displayDate,
    displayDate: d.displayDate,
    budget: d.budget,
    spent: d.spent,
    health: d.health
  })));
});

api.get('/days/:dateKey', auth, async (req, res) => {
  const { dateKey } = req.params;
  const day = await Day.findOne({ userId: req.userId, dateKey });
  if (!day) return res.status(404).json({ message: 'Day not found.' });

  return res.json({
    dateKey: day.dateKey,
    date: day.displayDate,
    displayDate: day.displayDate,
    budget: day.budget,
    spent: day.spent,
    health: day.health,
    expenses: day.expenses || []
  });
});

api.post('/days', auth, async (req, res) => {
  const { dateKey, displayDate, budget, expenses } = req.body || {};
  if (!dateKey || !displayDate) return res.status(400).json({ message: 'dateKey and displayDate are required.' });
  if (typeof budget !== 'number' || budget <= 0) return res.status(400).json({ message: 'budget must be > 0.' });

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const normalizedExpenses = safeExpenses
    .filter(e => e && typeof e.amt === 'number' && Number(e.amt) >= 0)
    .map(e => ({ desc: String(e.desc || 'Uncategorized'), amt: Number(e.amt), time: String(e.time || '') }));

  const spent = normalizedExpenses.reduce((sum, e) => sum + e.amt, 0);
  const health = (budget - spent) / budget;

  await Day.findOneAndUpdate(
    { userId: req.userId, dateKey },
    {
      $set: {
        displayDate: String(displayDate),
        budget,
        spent,
        health,
        expenses: normalizedExpenses
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ ok: true, dateKey });
});

api.delete('/days', auth, async (req, res) => {
  await Day.deleteMany({ userId: req.userId });
  return res.json({ ok: true });
});

// ── Leaderboard ─────────────────────────────────────────────────────────────
api.get('/leaderboard', auth, async (req, res) => {
  const period = req.query.period === 'weekly' ? 'weekly' : 'all';
  const { start, end } = weekBoundsLocal();

  const users = await User.find({}, { username: 1 }).lean();
  const days = await Day.find({}, { userId: 1, health: 1, dateKey: 1 }).lean();

  const xpByUserId = new Map();
  for (const d of days) {
    if (typeof d.health !== 'number' || d.health < 0) continue;
    if (period === 'weekly' && (d.dateKey < start || d.dateKey > end)) continue;
    const key = String(d.userId);
    xpByUserId.set(key, (xpByUserId.get(key) || 0) + 1);
  }

  const players = users.map(u => {
    const xp = xpByUserId.get(String(u._id)) || 0;
    return {
      userId: u._id,
      name: u.username,
      xp,
      rankName: rankForXP(xp)
    };
  });

  players.sort((a, b) => b.xp - a.xp);

  const top = players.slice(0, 10).map((p, index) => ({
    ...p,
    position: index + 1
  }));

  const youId = String(req.userId);
  const youUser = players.find(p => String(p.userId) === youId);
  const youXP = xpByUserId.get(youId) || 0;
  const me = await User.findById(req.userId).select('username').lean();
  const you = youUser
    ? { userId: youUser.userId, name: youUser.name, xp: youXP, rankName: rankForXP(youXP) }
    : { userId: req.userId, name: me?.username || 'You', xp: youXP, rankName: rankForXP(youXP) };

  return res.json({
    top,
    you,
    period,
    weekStarts: start,
    weekEnds: end
  });
});

// ── Friends ─────────────────────────────────────────────────────────────────
async function streakBundleForUser(userId) {
  const days = await Day.find({ userId }).select('dateKey health').lean();
  const { currentStreak, longestStreak } = computeStreaksFromDays(days);
  const { start, end } = weekBoundsLocal();
  let weeklyXp = 0;
  for (const d of days) {
    if (typeof d.health === 'number' && d.health >= 0 && d.dateKey >= start && d.dateKey <= end) weeklyXp += 1;
  }
  return { currentStreak, longestStreak, weeklyXp };
}

api.post('/friends/request', auth, async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid friend email is required.' });
  }
  const normalized = email.trim().toLowerCase();
  const target = await User.findOne({ email: normalized });
  if (!target) return res.status(404).json({ message: 'No user with that email.' });
  if (String(target._id) === String(req.userId)) return res.status(400).json({ message: 'You cannot add yourself.' });

  const me = await User.findById(req.userId);
  if (!me) return res.status(404).json({ message: 'User not found.' });

  if (me.friends.some(id => String(id) === String(target._id))) {
    return res.status(409).json({ message: 'Already friends.' });
  }
  if (me.outgoingFriendRequests.some(id => String(id) === String(target._id))) {
    return res.status(409).json({ message: 'Request already sent.' });
  }
  if (me.incomingFriendRequests.some(id => String(id) === String(target._id))) {
    return res.status(409).json({ message: 'This user already sent you a request — accept it instead.' });
  }

  me.outgoingFriendRequests.addToSet(target._id);
  await me.save();
  target.incomingFriendRequests.addToSet(me._id);
  await target.save();

  return res.json({ ok: true });
});

api.get('/friends/requests', auth, async (req, res) => {
  const me = await User.findById(req.userId).populate('incomingFriendRequests', 'username email').lean();
  if (!me) return res.status(404).json({ message: 'User not found.' });
  const incoming = (me.incomingFriendRequests || []).map(u => ({
    userId: u._id,
    username: u.username,
    email: u.email
  }));
  return res.json({ incoming });
});

api.post('/friends/accept', auth, async (req, res) => {
  const { userId: fromId } = req.body || {};
  if (!fromId) return res.status(400).json({ message: 'userId is required.' });

  const me = await User.findById(req.userId);
  const other = await User.findById(fromId);
  if (!me || !other) return res.status(404).json({ message: 'User not found.' });

  const has = me.incomingFriendRequests.some(id => String(id) === String(fromId));
  if (!has) return res.status(400).json({ message: 'No pending request from that user.' });

  me.incomingFriendRequests.pull(fromId);
  me.friends.addToSet(other._id);
  other.outgoingFriendRequests.pull(me._id);
  other.friends.addToSet(me._id);

  await me.save();
  await other.save();

  return res.json({ ok: true });
});

api.post('/friends/decline', auth, async (req, res) => {
  const { userId: fromId } = req.body || {};
  if (!fromId) return res.status(400).json({ message: 'userId is required.' });

  await User.updateOne({ _id: req.userId }, { $pull: { incomingFriendRequests: fromId } });
  await User.updateOne({ _id: fromId }, { $pull: { outgoingFriendRequests: req.userId } });

  return res.json({ ok: true });
});

api.delete('/friends/:friendId', auth, async (req, res) => {
  const { friendId } = req.params;
  await User.updateOne({ _id: req.userId }, { $pull: { friends: friendId } });
  await User.updateOne({ _id: friendId }, { $pull: { friends: req.userId } });
  return res.json({ ok: true });
});

api.get('/friends', auth, async (req, res) => {
  const me = await User.findById(req.userId).populate('friends', 'username').lean();
  if (!me) return res.status(404).json({ message: 'User not found.' });

  const friends = [];
  for (const f of me.friends || []) {
    const stats = await streakBundleForUser(f._id);
    friends.push({
      userId: f._id,
      username: f.username,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      weeklyXp: stats.weeklyXp
    });
  }

  const youStats = await streakBundleForUser(req.userId);
  return res.json({ friends, you: youStats });
});

app.use('/api', api);

// Static front-end (files live in project root)
app.use(express.static(frontEndDir));

// SPA-like fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontEndDir, 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────
async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('\n  ✅ Connected to MongoDB Atlas/local\n');

  app.listen(PORT, () => {
    console.log(`\n  🌿 Spentree server running at http://localhost:${PORT}\n`);
  });
}

start().catch((e) => {
  console.error('Server start error:', e);
  process.exit(1);
});