// AUTH LOGIC
// Frontend auth uses backend endpoints at `/api/auth/*` (JWT-based).
// The JWT is stored in `localStorage` as `spentree_token`.

(function () {
  const cv = document.getElementById('bg'), cx = cv.getContext('2d');
  let W, H, t = 0;
  const pts = [], ff = [], lv = [], br = [];

  function resize() { W = cv.width = innerWidth || 1280; H = cv.height = innerHeight || 720; }
  resize(); addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) pts.push({ x: Math.random() * 1600, y: Math.random() * 1000, r: Math.random() * 1.6 + .4, vx: (Math.random() - .5) * .28, vy: -Math.random() * .42 - .1, a: Math.random() * Math.PI * 2, h: Math.random() > .7 ? '244,162,97' : '82,183,136' });
  for (let i = 0; i < 18; i++) ff.push({ x: Math.random() * 1600, y: Math.random() * 1000, r: Math.random() * 1.1 + .5, vx: (Math.random() - .5) * .55, vy: (Math.random() - .5) * .38, ph: Math.random() * Math.PI * 2 });
  for (let i = 0; i < 22; i++) lv.push({ x: Math.random() * 1600, y: Math.random() * 1000, s: Math.random() * 4.5 + 2.5, vx: (Math.random() - .5) * .7, vy: Math.random() * .55 + .28, rot: Math.random() * Math.PI * 2, vr: (Math.random() - .5) * .038, sw: Math.random() * Math.PI * 2, col: Math.random() > .5 ? '82,183,136' : '116,198,157' });
  [.07, .17, .27, .73, .83, .93].forEach(xf => br.push({ x: xf, h: .2 + Math.random() * .17, sw: Math.random() * Math.PI * 2 }));

  function bgTree(x, h, sw, t) {
    const bx = x * W, base = H, th = H * h;
    cx.save(); cx.globalAlpha = .09; cx.fillStyle = '#2d6a4f';
    cx.beginPath(); cx.moveTo(bx - 7, base); cx.lineTo(bx + 7, base); cx.lineTo(bx + 3, base - th); cx.lineTo(bx - 3, base - th); cx.closePath(); cx.fill();
    const s = Math.sin(t * .017 + sw) * 3.5;
    [[th, th * .43, '#1b4332'], [th * .73, th * .36, '#2d6a4f'], [th * .53, th * .28, '#40916c']].forEach(([dy, r, c]) => {
      cx.beginPath(); cx.arc(bx + s * .38, base - dy, r, 0, Math.PI * 2); cx.fillStyle = c; cx.fill();
    });
    cx.restore();
  }

  function leaf(x, y, s, r) {
    cx.save(); cx.translate(x, y); cx.rotate(r);
    cx.beginPath(); cx.moveTo(0, -s); cx.bezierCurveTo(s, -s * .5, s, s * .5, 0, s);
    cx.bezierCurveTo(-s, s * .5, -s, -s * .5, 0, -s); cx.closePath(); cx.fill(); cx.restore();
  }

  function frame() {
    if (!W || !H) { t++; requestAnimationFrame(frame); return; }
    cx.clearRect(0, 0, W, H);
    const bg = cx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#030a05'); bg.addColorStop(.45, '#0a1a0f'); bg.addColorStop(1, '#0d2218');
    cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    [.15, .32, .5].forEach((yf, i) => {
      const ax = W * .15 + Math.sin(t * .006 + i * 1.2) * W * .1, ay = H * yf + Math.sin(t * .01 + i * .8) * 26;
      const aw = W * .65 + Math.sin(t * .008 + i) * W * .12;
      const ag = cx.createRadialGradient(ax + aw / 2, ay, 0, ax + aw / 2, ay, aw * .5);
      const al = .036 + Math.sin(t * .012 + i) * .016;
      ag.addColorStop(0, `rgba(82,183,136,${al})`); ag.addColorStop(.5, `rgba(45,106,79,${al * .5})`); ag.addColorStop(1, 'transparent');
      cx.fillStyle = ag; cx.fillRect(0, 0, W, H);
    });
    [[W * .12, H * .18, 'rgba(82,183,136,.09)', 250], [W * .84, H * .5, 'rgba(244,162,97,.06)', 190], [W * .5, H * .88, 'rgba(45,106,79,.09)', 290]].forEach(([ox, oy, col, rad]) => {
      if (!isFinite(ox) || !isFinite(oy) || !isFinite(rad) || rad <= 0) return;
      const g = cx.createRadialGradient(ox, oy, 0, ox, oy, rad); g.addColorStop(0, col); g.addColorStop(1, 'transparent'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    });
    const mx = W * .88, my = H * .1;
    if (!isFinite(mx) || !isFinite(my)) return;
    const mg = cx.createRadialGradient(mx, my, 0, mx, my, 100);
    mg.addColorStop(0, 'rgba(200,255,220,.05)'); mg.addColorStop(1, 'transparent'); cx.fillStyle = mg; cx.fillRect(0, 0, W, H);
    cx.beginPath(); cx.arc(mx, my, 18, 0, Math.PI * 2); cx.fillStyle = 'rgba(200,240,210,.055)'; cx.fill();
    br.forEach(b => bgTree(b.x, b.h, b.sw, t));
    for (let i = 0; i < 4; i++) {
      const y = H * .58 + i * H * .1, gg = cx.createLinearGradient(0, y, W, y);
      gg.addColorStop(0, 'transparent'); gg.addColorStop(.35 + Math.sin(t * .005 + i) * .08, `rgba(82,183,136,${.018 - i * .003})`); gg.addColorStop(1, 'transparent');
      cx.fillStyle = gg; cx.fillRect(0, y - 4, W, 10);
    }
    pts.forEach(p => {
      cx.beginPath(); cx.arc(p.x % W, (p.y + H) % H, p.r, 0, Math.PI * 2);
      cx.fillStyle = `rgba(${p.h},${.2 + Math.sin(t * .04 + p.a) * .15})`; cx.fill();
      p.x += p.vx; p.y += p.vy; if (p.y < 0) p.y = H;
    });
    lv.forEach(l => {
      cx.globalAlpha = .3 + Math.sin(t * .03 + l.sw) * .12; cx.fillStyle = `rgba(${l.col},.9)`;
      leaf((l.x + W) % W, (l.y + H) % H, l.s, l.rot);
      l.x += l.vx + Math.sin(t * .02 + l.sw) * .45; l.y += l.vy; l.rot += l.vr;
      if (l.y > H + 8) { l.y = -8; l.x = Math.random() * W; }
    });
    cx.globalAlpha = 1;
    ff.forEach(f => {
      const g = .4 + Math.sin(t * .07 + f.ph) * .4, fx = (f.x + W) % W, fy = (f.y + H) % H;
      const hg = cx.createRadialGradient(fx, fy, 0, fx, fy, 10);
      hg.addColorStop(0, `rgba(190,240,130,${g * .35})`); hg.addColorStop(1, 'transparent');
      cx.fillStyle = hg; cx.fillRect(fx - 12, fy - 12, 24, 24);
      cx.beginPath(); cx.arc(fx, fy, f.r + .4, 0, Math.PI * 2); cx.fillStyle = `rgba(210,245,150,${g})`; cx.fill();
      f.x += f.vx + Math.sin(t * .02 + f.ph) * .45; f.y += f.vy + Math.cos(t * .025 + f.ph) * .35;
    });
    t++; requestAnimationFrame(frame);
  }
  frame();
})();

// ══════════════════════════════════════════
// PIXEL TREE ANIMATION
// ══════════════════════════════════════════
function miniTree(id) {
  const cv = document.getElementById(id); if (!cv) return;
  const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; let t = 0;

  function drawTree(oy) {
    const W = cv.width, H = cv.height, cx2 = W / 2;
    cx.clearRect(0, 0, W, H);
    if (isFinite(cx2) && isFinite(oy)) {
      const g = cx.createRadialGradient(cx2, oy + 30, 0, cx2, oy + 30, 85);
      g.addColorStop(0, 'rgba(46,204,113,0.22)'); g.addColorStop(1, 'transparent');
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    }
    const P = 9;
    [
      { w: 4, y: oy, light: '#5eff8a', mid: '#2ecc71', dark: '#1aab57' },
      { w: 6, y: oy + P * 1.5, light: '#4dff7c', mid: '#2ecc71', dark: '#18a050' },
      { w: 8, y: oy + P * 3.2, light: '#3de06a', mid: '#27ae60', dark: '#15904a' },
      { w: 10, y: oy + P * 5.2, light: '#2ecc71', mid: '#1f9b52', dark: '#116b37' },
    ].forEach(l => {
      const lx = Math.floor(cx2 - l.w / 2 * P), lh = Math.floor(P * 1.6);
      cx.fillStyle = l.dark; cx.fillRect(lx + P, l.y + lh - 2, l.w * P - P, 4);
      cx.fillStyle = l.mid; cx.fillRect(lx, l.y, l.w * P, lh);
      cx.fillStyle = l.light; cx.fillRect(lx + 2, l.y + 1, l.w * P - 4, 3);
      cx.fillStyle = 'rgba(255,255,255,0.12)'; cx.fillRect(lx, l.y, 3, lh);
    });
    const trunkX = Math.floor(cx2 - P), trunkY = oy + P * 7, trunkH = P * 4;
    cx.fillStyle = '#6b4226'; cx.fillRect(trunkX, trunkY, P * 2, trunkH);
    cx.fillStyle = '#4a3b2c'; cx.fillRect(trunkX + P, trunkY, P, trunkH);
    cx.fillStyle = 'rgba(255,255,255,0.1)'; cx.fillRect(trunkX, trunkY, 2, trunkH);
    const gY = trunkY + trunkH;
    cx.fillStyle = '#1a6b2a'; cx.beginPath(); cx.ellipse(cx2, gY + 4, 32, 9, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#2ecc71'; cx.beginPath(); cx.ellipse(cx2, gY, 30, 7, 0, 0, Math.PI * 2); cx.fill();
    [[cx2 - 22, gY - 3], [cx2 - 14, gY - 6], [cx2 - 6, gY - 7], [cx2 + 2, gY - 7], [cx2 + 10, gY - 6], [cx2 + 18, gY - 3]].forEach(([gx, gy]) => {
      cx.fillStyle = '#27ae60'; cx.fillRect(gx, gy, 3, 5); cx.fillRect(gx + 2, gy - 2, 2, 4);
    });
    [{ x: cx2 - 26, y: gY + 1, r: 4 }, { x: cx2 - 18, y: gY - 2, r: 4 }, { x: cx2 - 10, y: gY - 4, r: 4 }, { x: cx2 + 8, y: gY - 4, r: 4 }, { x: cx2 + 18, y: gY - 1, r: 4 }, { x: cx2 + 24, y: gY + 2, r: 3 }].forEach((c, i) => {
      const bob = Math.sin(t * 0.06 + i * 0.8) * 1.5;
      cx.fillStyle = '#b8860b'; cx.beginPath(); cx.ellipse(c.x, c.y + bob + 1, c.r, c.r * .45, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#f4c430'; cx.beginPath(); cx.ellipse(c.x, c.y + bob, c.r, c.r * .45, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#ffd700'; cx.beginPath(); cx.ellipse(c.x - 1, c.y + bob - 1, c.r * .5, c.r * .2, 0, 0, Math.PI * 2); cx.fill();
    });
    [{ x: cx2 + 40, y: oy + 5 }, { x: cx2 - 38, y: oy + 18 }, { x: cx2 + 50, y: oy + 35 }, { x: cx2 - 48, y: oy + 40 }].forEach((s, i) => {
      const sa = 0.3 + Math.sin(t * 0.09 + i * 1.5) * 0.7, ss = 2 + Math.sin(t * 0.07 + i) * 1;
      cx.fillStyle = `rgba(255,255,255,${sa})`;
      cx.fillRect(s.x - ss / 2, s.y - ss * 2, ss, ss * 4); cx.fillRect(s.x - ss * 2, s.y - ss / 2, ss * 4, ss);
    });
  }
  (function frame() { drawTree(40 + Math.sin(t * 0.025) * 4); t++; requestAnimationFrame(frame); })();
}
miniTree('lt1');
miniTree('lt2');

// ── Google Auth ─────────────────────────
window.loginWithGoogle = function () {
  window.location.href = '/api/auth/google';
};

const params = new URLSearchParams(window.location.search);
const googleToken = params.get('token');
const googleUsername = params.get('username');
if (googleToken) {
  localStorage.setItem('spentree_token', googleToken);
  if (googleUsername) localStorage.setItem('spentree_user_name', decodeURIComponent(googleUsername));
  window.location.href = 'index.html';
}

// ══════════════════════════════════════════
// AUTH LOGIC
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── Page Switching ─────────────────────
  window.switchTo = function (p) {
    document.getElementById('pg-login').classList.toggle('hidden', p !== 'login');
    document.getElementById('pg-register').classList.toggle('hidden', p !== 'register');
    document.querySelectorAll('#pg-' + p + ' .tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-page') === p);
    });
  };

  // ── Toast ──────────────────────────────
  function toast(msg, err = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (err ? ' err' : '');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ── Password Toggle ────────────────────
  window.tog = function (id, btn) {
    const i = document.getElementById(id);
    i.type = i.type === 'password' ? 'text' : 'password';
    btn.textContent = i.type === 'password' ? '👁' : '🙈';
  };

  // ── Password Strength ──────────────────
  window.strength = function (inp) {
    const bar = document.getElementById('sbar'), fill = document.getElementById('sfill');
    bar.style.display = 'block';
    const v = inp.value; let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    fill.style.width = ['0%', '28%', '52%', '78%', '100%'][s];
    fill.style.background = ['var(--danger-color)', 'var(--danger-color)', 'var(--warning-color)', 'var(--primary-color)', 'var(--accent-color)'][s];
  };

  // ── Input Label Focus ──────────────────
  document.querySelectorAll('.field input').forEach(inp => {
    inp.addEventListener('focus', () => {
      inp.parentElement.querySelector('label') &&
        (inp.parentElement.querySelector('label').style.color = 'var(--primary-color)');
    });
    inp.addEventListener('blur', () => {
      inp.parentElement.querySelector('label') &&
        (inp.parentElement.querySelector('label').style.color = '');
    });
  });

  // ── Tab Sync ───────────────────────────
  document.querySelectorAll('.tab').forEach(t => {
    t.setAttribute('data-page', t.textContent.trim().toLowerCase().includes('sign') ? 'login' : 'register');
  });

  // ── Login ──────────────────────────────
  window.doLogin = async function () {
    const e = document.getElementById('l-email').value.trim();
    const p = document.getElementById('l-pass').value;
    if (!e || !p) { toast('FILL IN ALL FIELDS', true); return; }
    if (!e.includes('@')) { toast('INVALID EMAIL ADDRESS', true); return; }
    const btn = document.querySelector('#pg-login .btn');
    btn.textContent = 'SIGNING IN...'; btn.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: p })
      });
      const data = await res.json().catch(() => ({}));
      btn.textContent = '🌿 Sign In to Your Forest'; btn.disabled = false;
      if (!res.ok) { toast(String(data?.message || 'LOGIN FAILED').toUpperCase(), true); return; }
      localStorage.setItem('spentree_token', data.token);
      if (data?.user?.username) localStorage.setItem('spentree_user_name', data.user.username);
      toast('🌱 WELCOME TO YOUR FOREST!');
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } catch (err) {
      btn.textContent = '🌿 Sign In to Your Forest'; btn.disabled = false;
      toast('NETWORK ERROR', true);
    }
  };

  document.getElementById('l-email').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('l-pass').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });

  // ── Register ───────────────────────────
  window.doRegister = async function () {
    const fn = document.getElementById('r-fn').value.trim();
    const ln = document.getElementById('r-ln').value.trim();
    const e = document.getElementById('r-email').value.trim();
    const p = document.getElementById('r-pass').value;
    const p2 = document.getElementById('r-pass2').value;
    const termsEl = document.getElementById('r-terms');
    const ok = termsEl ? termsEl.checked : false;
    if (!fn || !e || !p || !p2) { toast('FILL IN ALL FIELDS', true); return; }
    if (!e.includes('@')) { toast('INVALID EMAIL ADDRESS', true); return; }
    if (p !== p2) { toast('PASSWORDS DO NOT MATCH', true); return; }
    if (p.length < 6) { toast('MIN 6 CHARACTERS REQUIRED', true); return; }
    if (!ok) { toast('AGREE TO TERMS FIRST', true); return; }
    const btn = document.querySelector('#pg-register .btn');
    btn.textContent = 'CREATING...'; btn.disabled = true;
    try {
      const username = `${fn} ${ln}`.trim();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: e, password: p })
      });
      const data = await res.json().catch(() => ({}));
      btn.textContent = '🌱 Create My Forest'; btn.disabled = false;
      if (!res.ok) { toast(String(data?.message || 'REGISTER FAILED').toUpperCase(), true); return; }
      localStorage.setItem('spentree_token', data.token);
      if (data?.user?.username) localStorage.setItem('spentree_user_name', data.user.username);
      toast('🌱 WELCOME TO YOUR FOREST!');
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } catch (err) {
      btn.textContent = '🌱 Create My Forest'; btn.disabled = false;
      toast('NETWORK ERROR', true);
    }
  };

  ['r-fn', 'r-ln', 'r-email', 'r-budget', 'r-pass', 'r-pass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') doRegister(); });
  });

  // ── Social Login ──────────────────────────
  window.loginWith = async function (provider) {
    toast('SOCIAL LOGIN NOT SUPPORTED', true);
  };

  // ── Email OTP Modal ────────────────────
  let currentOTP = '';

  window.openEmailModal = function () {
    document.getElementById('email-modal').classList.add('show');
    showStep(1);
    document.getElementById('magic-email').value = '';
    setTimeout(() => document.getElementById('magic-email').focus(), 300);
  };
  window.closeEmailModal = function () {
    document.getElementById('email-modal').classList.remove('show');
  };
  document.getElementById('email-modal').addEventListener('click', function (e) {
    if (e.target === this) closeEmailModal();
  });

  function showStep(n) {
    [1, 2, 3].forEach(i =>
      document.getElementById('modal-step-' + i).style.display = i === n ? 'block' : 'none'
    );
  }

  document.getElementById('magic-email').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendOTP();
  });

  window.sendOTP = async function () {
    toast('OTP LOGIN NOT SUPPORTED', true);
  };

  window.resendOTP = async function () {
    toast('OTP LOGIN NOT SUPPORTED', true);
  };

  window.otpNext = function (i) {
    const val = document.getElementById('o' + i).value;
    if (val && i < 5) document.getElementById('o' + (i + 1)).focus();
    const full = Array.from({ length: 6 }, (_, j) => document.getElementById('o' + j).value).join('');
    if (full.length === 6) verifyOTP();
  };

  document.querySelectorAll('.otp-box').forEach((box, i) => {
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0)
        document.getElementById('o' + (i - 1)).focus();
    });
  });

  window.verifyOTP = async function () {
    toast('OTP LOGIN NOT SUPPORTED', true);
  };

});