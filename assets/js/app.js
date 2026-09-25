/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Core app: router, state, theme, cart, accounts, animations
   ═══════════════════════════════════════════════════════════════ */
window.AW = (function () {
  'use strict';
  var D = window.AW_DATA; var DB = window.AW_DB; var C = window.AW_CONFIG || {};
  var ICONS = window.AW_ICONS || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── helpers ── */
  function ic(name, cls) { return '<span class="i ' + (cls || '') + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS['leaf'] || '') + '</svg></span>'; }
  function money(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
  function moneyShort(n) { if (n >= 1e9) return '₦' + (n / 1e9).toFixed(1) + 'B'; if (n >= 1e6) return '₦' + (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return '₦' + (n / 1e3).toFixed(0) + 'K'; return '₦' + n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(r) { var h = '<span class="stars">'; for (var i = 1; i <= 5; i++) h += ic('star', i <= Math.round(r || 0) ? '' : 'off'); return h + '</span>'; }
  function ratingHtml(p, small) { return p.reviews ? '<div class="rating">' + stars(p.rating) + '<b>' + p.rating.toFixed(1) + '</b><small>(' + p.reviews.toLocaleString() + (small ? '' : ' reviews') + ')</small></div>' : '<div class="rating"><small>No reviews yet</small></div>'; }
  function errMsg(e) { return (e && (e.userMessage || e.message)) || 'Something went wrong'; }
  function waLink(number, text) { return 'https://wa.me/' + String(number || C.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text || ''); }
  function store(k, v) { try { if (v === undefined) { var x = localStorage.getItem(k); return x ? JSON.parse(x) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function initials(n) { return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function rand(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }

  /* ── state ── */
  var state = {
    cart: store('aw_cart') || [],
    wish: store('aw_wish') || [],
    follow: [],
    user: null,
    theme: store('aw_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    recent: store('aw_recent') || []
  };

  /* ── theme ── */
  function applyTheme(t, animate) {
    if (animate && !reduced) { document.documentElement.classList.add('theme-anim'); setTimeout(function () { document.documentElement.classList.remove('theme-anim'); }, 700); }
    document.documentElement.setAttribute('data-theme', t);
    state.theme = t; store('aw_theme', t);
    var b = $('#themeBtn'); if (b) b.innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
    var m = $('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#061410' : '#0f5132');
  }
  function toggleTheme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark', true); toast('Switched to ' + state.theme + ' mode', 'sun'); }

  /* ── toast ── */
  function toast(msg, icon, type) {
    var box = $('#toasts'); if (!box) return;
    var t = document.createElement('div'); t.className = 'toast ' + (type || '');
    t.innerHTML = '<span class="ic">' + ic(icon || 'check') + '</span><span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 3200);
  }

  /* ── ripple ── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.btn'); if (!b || reduced) return;
    var r = document.createElement('span'); r.className = 'rip';
    var rect = b.getBoundingClientRect(), s = Math.max(rect.width, rect.height);
    r.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - rect.left - s / 2) + 'px;top:' + (e.clientY - rect.top - s / 2) + 'px';
    b.appendChild(r); setTimeout(function () { r.remove(); }, 700);
  });

  /* ── scroll reveal + counters ── */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target; el.classList.add('in');
      if (el.hasAttribute('data-count')) countUp(el);
      if (el.classList.contains('chart-anim')) el.classList.add('go');
      $$('.prog i,.rbar .bar i', el).forEach(function (p) { p.style.width = p.getAttribute('data-w') + '%'; });
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  function observe(root) {
    $$('.rv,.rv-l,.rv-r,.rv-s,[data-count],.chart-anim,.prog-wrap', root || document).forEach(function (el) { if (io) io.observe(el); else { el.classList.add('in'); if (el.hasAttribute('data-count')) countUp(el); } });
  }
  function countUp(el) {
    if (el.__done) return; el.__done = true;
    var target = parseFloat(el.getAttribute('data-count')), prefix = el.getAttribute('data-prefix') || '', suffix = el.getAttribute('data-suffix') || '', dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var dur = reduced ? 1 : 1800, t0 = null;
    function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur); var e = 1 - Math.pow(1 - p, 4); var v = target * e; el.textContent = prefix + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suffix; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  /* ── particles ── */
  function particles() {
    var c = $('#particles'); if (!c || reduced) return;
    var ctx = c.getContext('2d'), pts = [], W, H, raf;
    function size() { W = c.width = innerWidth; H = c.height = innerHeight; }
    size(); addEventListener('resize', size);
    for (var i = 0; i < 46; i++) pts.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 1 + Math.random() * 2.2, vx: -.15 + Math.random() * .3, vy: -.25 - Math.random() * .35, a: .2 + Math.random() * .5, ph: Math.random() * 6.28 });
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var dark = state.theme === 'dark';
      pts.forEach(function (p) {
        p.x += p.vx + Math.sin(t / 1800 + p.ph) * .12; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = dark ? 'rgba(110,231,183,' + p.a * .7 + ')' : 'rgba(16,185,129,' + p.a * .45 + ')'; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', function () { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(draw); });
  }

  /* ── parallax + cursor glint on sector cards ── */
  function bindPointerFx(root) {
    $$('.sc-card', root).forEach(function (card) {
      card.addEventListener('pointermove', function (e) { var r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });
    });
  }
  var heroBg = null;
  addEventListener('scroll', function () {
    var y = scrollY;
    var h = $('#hdr'); if (h) h.classList.toggle('scrolled', y > 10);
    var btt = $('#btt'); if (btt) btt.classList.toggle('on', y > 600);
    if (heroBg && y < 900 && !reduced) heroBg.style.transform = 'translate3d(0,' + (y * .28) + 'px,0)';
  }, { passive: true });

  /* ── cart ── */
  function cartCount() { return state.cart.reduce(function (a, c) { return a + c.q; }, 0); }
  function cartTotal() { return state.cart.reduce(function (a, c) { var p = D.products.find(function (x) { return x.id === c.id; }); return a + (p ? p.price * c.q : 0); }, 0); }
  function saveCart() { store('aw_cart', state.cart); renderCartBadge(); renderCart(); }
  function addToCart(id, q, ev) {
    q = q || 1; var p = D.products.find(function (x) { return x.id === id; }); if (!p) return;
    if (p.stock === 'out') return toast('Out of stock', 'ban', 'err');
    var it = state.cart.find(function (c) { return c.id === id; }); var newQ = (it ? it.q : 0) + q;
    if (p.qty !== null && p.qty !== undefined && newQ > p.qty) return toast('Only ' + p.qty + ' available', 'circle-alert', 'warn');
    if (it) it.q = newQ; else state.cart.push({ id: id, q: Math.max(q, p.moq || 1) });
    saveCart(); toast(p.name + ' added to cart', 'shopping-cart');
    var badge = $('#cartDot'); if (badge) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
    // fly image
    if (ev && !reduced) {
      var src = ev.target.closest('.pc,.pd,.carousel-card,.mini-p'); var im = src ? $('img', src) : null; var target = $('#cartBtn') || $('#bnavCart');
      if (im && target) { var f = im.cloneNode(); f.className = 'fly'; var r = im.getBoundingClientRect(); f.style.left = r.left + r.width / 2 - 30 + 'px'; f.style.top = r.top + r.height / 2 - 30 + 'px'; document.body.appendChild(f); var tr = target.getBoundingClientRect(); requestAnimationFrame(function () { f.style.left = tr.left + tr.width / 2 - 10 + 'px'; f.style.top = tr.top + tr.height / 2 - 10 + 'px'; f.style.width = f.style.height = '20px'; f.style.opacity = '.2'; f.style.borderRadius = '50%'; }); setTimeout(function () { f.remove(); }, 850); }
    }
  }
  function setQty(id, q) { var it = state.cart.find(function (c) { return c.id === id; }); if (!it) return; var p = D.products.find(function (x) { return x.id === id; }); if (p && p.qty !== null && p.qty !== undefined && q > p.qty) return toast('Only ' + p.qty + ' available', 'circle-alert', 'warn'); it.q = q; if (it.q <= 0) state.cart = state.cart.filter(function (c) { return c.id !== id; }); saveCart(); }
  function removeFromCart(id) { state.cart = state.cart.filter(function (c) { return c.id !== id; }); saveCart(); }
  function renderCartBadge() { var n = cartCount(); ['#cartDot', '#bnavDot'].forEach(function (s) { var d = $(s); if (!d) return; d.textContent = n; d.classList.toggle('on', n > 0); if (s === '#bnavDot') d.style.display = n ? '' : 'none'; }); }
  function renderCart() {
    var list = $('#cartList'), foot = $('#cartFoot'); if (!list) return;
    if (!state.cart.length) { list.innerHTML = '<div class="cart-empty">' + ic('shopping-bag') + '<h3 style="margin:14px 0 6px">Your cart is empty</h3><p>Browse the marketplace to add products.</p><a href="#/marketplace" class="btn btn-p btn-sm" style="margin-top:16px" onclick="AW.closeCart()">' + ic('store') + ' Explore marketplace</a></div>'; foot.style.display = 'none'; return; }
    foot.style.display = '';
    list.innerHTML = state.cart.map(function (c) { var p = D.products.find(function (x) { return x.id === c.id; }); if (!p) return ''; return '<div class="ci"><img src="' + p.img + '" alt="" loading="lazy"><div><b>' + esc(p.name) + '</b><small>' + esc(p.seller) + ' · ' + money(p.price) + p.unit + '</small><div class="q"><button onclick="AW.setQty(' + p.id + ',' + (c.q - 1) + ')" aria-label="Decrease">' + ic('minus') + '</button><span>' + c.q + '</span><button onclick="AW.setQty(' + p.id + ',' + (c.q + 1) + ')" aria-label="Increase">' + ic('plus') + '</button></div></div><div><div class="pr">' + money(p.price * c.q) + '</div><button class="rm" onclick="AW.removeFromCart(' + p.id + ')" aria-label="Remove">' + ic('trash-2') + '</button></div></div>'; }).join('');
    var sub = cartTotal();
    $('#cartSub').textContent = money(sub); $('#cartShip').textContent = 'Arranged with seller'; $('#cartTot').textContent = money(sub);
  }
  function openCart() { $('#cartOv').classList.add('open'); $('#cartPnl').classList.add('open'); renderCart(); document.body.style.overflow = 'hidden'; }
  function closeCart() { $('#cartOv').classList.remove('open'); $('#cartPnl').classList.remove('open'); document.body.style.overflow = ''; }

  /* ── wishlist / follow ── */
  function toggleWish(id, btn) {
    var i = state.wish.indexOf(id); if (i > -1) { state.wish.splice(i, 1); toast('Removed from wishlist', 'heart', 'warn'); } else { state.wish.push(id); toast('Saved to wishlist', 'heart'); }
    store('aw_wish', state.wish);
    if (btn) btn.classList.toggle('on', state.wish.indexOf(id) > -1);
    $$('[data-wish="' + id + '"]').forEach(function (b) { b.classList.toggle('on', state.wish.indexOf(id) > -1); });
  }
  function toggleFollow(id, btn) {
    if (!state.user) { toast('Sign in to follow companies', 'log-in', 'warn'); openAuth('login'); return; }
    var i = state.follow.indexOf(id); var c = D.coMap[id]; var on = i < 0;
    if (on) state.follow.push(id); else state.follow.splice(i, 1);
    $$('[data-follow="' + id + '"]').forEach(function (b) { b.classList.toggle('on', on); b.innerHTML = ic(on ? 'check' : 'plus') + (on ? ' Following' : ' Follow'); });
    DB.follow(id, on).then(function () { toast((on ? 'Following ' : 'Unfollowed ') + c.name, 'users', on ? '' : 'warn'); if (c) c.followers = Math.max(0, (c.followers || 0) + (on ? 1 : -1)); })
      .catch(function (e) { if (on) state.follow.splice(state.follow.indexOf(id), 1); else state.follow.push(id); $$('[data-follow="' + id + '"]').forEach(function (b) { b.classList.toggle('on', !on); b.innerHTML = ic(!on ? 'check' : 'plus') + (!on ? ' Following' : ' Follow'); }); toast(errMsg(e), 'circle-alert', 'err'); });
  }
  function addRecent(id) { state.recent = [id].concat(state.recent.filter(function (x) { return x !== id; })).slice(0, 8); store('aw_recent', state.recent); }

  /* ── auth (Supabase) ── */
  var authMode = 'register', authRole = 'buyer', authBusy = false, afterAuth = null;
  function openAuth(mode, cb) { authMode = mode || 'register'; afterAuth = typeof cb === 'function' ? cb : null; renderAuth(); $('#authOv').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeAuth() { $('#authOv').classList.remove('open'); document.body.style.overflow = ''; }
  function renderAuth() {
    var reg = authMode === 'register', fp = authMode === 'forgot';
    $('#authTitle').textContent = reg ? 'Create your account' : fp ? 'Reset your password' : 'Welcome back';
    $('#authSub').textContent = reg ? 'Buy, sell and manage your agribusiness on AgricWorld' : fp ? 'We will email you a secure reset link' : 'Sign in to your AgricWorld account';
    $('#authBody').innerHTML =
      (!DB.configured() ? '<div class="note warn">' + ic('circle-alert') + ' Accounts are not connected yet — the site owner needs to add the Supabase keys (see SETUP.md).</div>' : '') +
      (reg ? '<div class="role-tg">' + [['buyer', 'shopping-bag', 'Buyer'], ['seller', 'store', 'Seller / Farmer'], ['company', 'building-2', 'Company']].map(function (r) { return '<button type="button" class="' + (authRole === r[0] ? 'on' : '') + '" onclick="AW.setRole(\'' + r[0] + '\',this)">' + ic(r[1]) + r[2] + '</button>'; }).join('') + '</div>' : '') +
      (reg ? '<div class="fld"><label>Full name</label><input id="aName" placeholder="Adaeze Okonkwo" autocomplete="name" required></div>' : '') +
      '<div class="fld"><label>Email address</label><input id="aEmail" type="email" placeholder="you@farm.ng" autocomplete="email" required></div>' +
      (reg ? '<div class="fld"><label>Phone</label><input id="aPhone" type="tel" placeholder="+234 803 000 0000" autocomplete="tel"></div>' : '') +
      (!fp ? '<div class="fld"><label>Password</label><input id="aPass" type="password" placeholder="Minimum 8 characters" minlength="8" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" required></div>' : '') +
      '<div class="auth-err" id="authErr"></div>' +
      '<button class="btn btn-p btn-block" id="authBtn" onclick="AW.submitAuth()">' + ic(reg ? 'user-plus' : fp ? 'mail' : 'log-in') + (reg ? ' Create account' : fp ? ' Send reset link' : ' Sign in') + '</button>' +
      (!reg && !fp ? '<div class="auth-sw" style="margin-top:8px"><a onclick="AW.switchAuth(\'forgot\')">Forgot password?</a></div>' : '') +
      '<div class="auth-sw">' + (reg ? 'Already have an account? <a onclick="AW.switchAuth(\'login\')">Sign in</a>' : 'New to AgricWorld? <a onclick="AW.switchAuth(\'register\')">Create account</a>') + '</div>' +
      (reg ? '<div class="auth-sw" style="font-size:.74rem">By continuing you agree to our terms of trade and privacy policy.</div>' : '');
    $$('#authBody input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitAuth(); } }); });
    var first = $('#authBody input'); if (first && !reduced) setTimeout(function () { first.focus(); }, 80);
  }
  function setRole(r, b) { authRole = r; $$('.role-tg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }
  function switchAuth(m) { authMode = m; renderAuth(); }
  function authError(msg) { var e = $('#authErr'); if (e) e.textContent = msg; }
  function submitAuth() {
    if (authBusy) return;
    var email = (($('#aEmail') || {}).value || '').trim().toLowerCase(), pass = ($('#aPass') || {}).value || '';
    authError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return authError('Enter a valid email address');
    if (authMode !== 'forgot' && pass.length < 8) return authError('Password must be at least 8 characters');
    var name = authMode === 'register' ? (($('#aName') || {}).value || '').trim() : '';
    if (authMode === 'register' && name.length < 2) return authError('Enter your full name');
    var btn = $('#authBtn'); authBusy = true; var label = btn.innerHTML; btn.disabled = true; btn.innerHTML = ic('refresh-cw') + ' Please wait…';
    var done = function () { authBusy = false; if (btn) { btn.disabled = false; btn.innerHTML = label; } };
    var p;
    if (authMode === 'register') p = DB.signUp({ email: email, password: pass, name: name, phone: (($('#aPhone') || {}).value || '').trim(), role: authRole }).then(function (r) {
      if (r.needsConfirm) { authBusy = false; $('#authBody').innerHTML = '<div class="note ok">' + ic('mail') + ' <b>Check your inbox.</b> We sent a confirmation link to <b>' + esc(email) + '</b>. Open it to activate your account, then sign in.</div><button class="btn btn-p btn-block" onclick="AW.switchAuth(\'login\')">' + ic('log-in') + ' Go to sign in</button>'; return; }
      onSignedIn(r.user, true);
    });
    else if (authMode === 'forgot') p = DB.resetPassword(email).then(function () { authBusy = false; $('#authBody').innerHTML = '<div class="note ok">' + ic('mail') + ' If an account exists for <b>' + esc(email) + '</b>, a reset link is on its way.</div><button class="btn btn-p btn-block" onclick="AW.switchAuth(\'login\')">Back to sign in</button>'; });
    else p = DB.signIn(email, pass).then(function (u) { onSignedIn(u, false); });
    p.catch(function (e) { done(); authError(errMsg(e).replace('Invalid login credentials', 'Incorrect email or password')); });
  }
  function onSignedIn(u, fresh) {
    authBusy = false; state.user = u; closeAuth(); renderUserBtn(); syncUserData();
    toast((fresh ? 'Welcome, ' : 'Welcome back, ') + (u.name || '').split(' ')[0] + '!', 'sparkles');
    if (afterAuth) { var cb = afterAuth; afterAuth = null; cb(u); return; }
    if (u.role === 'seller' || u.role === 'company') go('#/seller'); else if (u.role === 'admin') go('#/admin'); else render();
  }
  function syncUserData() {
    if (!state.user) { state.follow = []; return; }
    DB.myFollows().then(function (f) { state.follow = f; $$('[data-follow]').forEach(function (b) { var on = f.indexOf(b.getAttribute('data-follow')) > -1; b.classList.toggle('on', on); b.innerHTML = ic(on ? 'check' : 'plus') + (on ? ' Following' : ' Follow'); }); }).catch(function () { });
  }
  function logout() { DB.signOut().then(function () { state.user = null; state.follow = []; renderUserBtn(); toast('Signed out', 'log-out', 'warn'); go('#/'); }); }
  function renderUserBtn() {
    var b = $('#userBtn'); if (!b) return;
    if (state.user) { b.innerHTML = '<span class="avatar">' + initials(state.user.name || state.user.email) + '</span><span>' + esc((state.user.name || state.user.email).split(' ')[0]) + '</span>'; b.setAttribute('href', state.user.role === 'buyer' ? '#/dashboard' : state.user.role === 'admin' ? '#/admin' : '#/seller'); b.onclick = null; }
    else { b.innerHTML = '<span class="avatar">' + ic('user') + '</span><span>Sign in</span>'; b.removeAttribute('href'); b.onclick = function () { openAuth('login'); }; }
  }
  function requireUser(cb) {
    if (state.user) { if (cb) cb(state.user); return true; }
    openAuth('login', cb); return false;
  }

  /* ── drawer ── */
  function toggleDrawer(force) { var o = force !== undefined ? force : !$('#drawer').classList.contains('open'); $('#drawer').classList.toggle('open', o); $('#drawerOv').classList.toggle('open', o); document.body.style.overflow = o ? 'hidden' : ''; }

  /* ── search ── */
  var searchTimer;
  function bindSearch(input, box) {
    if (!input) return;
    input.addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(function () { suggest(input.value, box); }, 120); });
    input.addEventListener('focus', function () { if (input.value) suggest(input.value, box); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { box.classList.remove('open'); go('#/marketplace?q=' + encodeURIComponent(input.value)); input.blur(); } if (e.key === 'Escape') box.classList.remove('open'); });
    document.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== input) box.classList.remove('open'); });
  }
  function suggest(q, box) {
    q = q.trim().toLowerCase(); if (q.length < 2) { box.classList.remove('open'); return; }
    var ps = D.products.filter(function (p) { return (p.name + ' ' + p.seller + ' ' + D.secMap[p.sec].name).toLowerCase().indexOf(q) > -1; }).slice(0, 5);
    var ss = D.sectors.filter(function (s) { return s.name.toLowerCase().indexOf(q) > -1; }).slice(0, 3);
    var cs = D.companies.filter(function (c) { return c.name.toLowerCase().indexOf(q) > -1; }).slice(0, 3);
    if (!ps.length && !ss.length && !cs.length) { box.innerHTML = '<div class="suggest-h">No results for “' + esc(q) + '”</div>'; box.classList.add('open'); return; }
    var h = '';
    if (ss.length) h += '<div class="suggest-h">Sectors</div>' + ss.map(function (s, i) { return '<a href="#/sector/' + s.id + '" style="animation-delay:' + i * 40 + 'ms;--sc:' + s.color + '"><span class="sc-ic" style="width:38px;height:38px;border-radius:9px;background:' + s.color + ';display:grid;place-items:center;color:#fff">' + ic(s.icon) + '</span><div><div class="s-name">' + s.name + '</div><div class="s-sub">' + s.listings + ' listings</div></div></a>'; }).join('');
    if (ps.length) h += '<div class="suggest-h">Products</div>' + ps.map(function (p, i) { return '<a href="#/product/' + p.id + '" style="animation-delay:' + (i + 3) * 40 + 'ms"><img src="' + p.img + '" alt=""><div><div class="s-name">' + esc(p.name) + '</div><div class="s-sub">' + money(p.price) + p.unit + ' · ' + esc(p.seller) + '</div></div></a>'; }).join('');
    if (cs.length) h += '<div class="suggest-h">Companies</div>' + cs.map(function (c, i) { return '<a href="#/company/' + c.id + '" style="animation-delay:' + (i + 8) * 40 + 'ms"><span class="avatar" style="width:38px;height:38px;background:' + D.secMap[c.sector].color + '">' + initials(c.name) + '</span><div><div class="s-name">' + c.name + '</div><div class="s-sub">' + c.loc + '</div></div></a>'; }).join('');
    h += '<a href="#/marketplace?q=' + encodeURIComponent(q) + '" style="justify-content:center;color:var(--brand);font-weight:700">See all results ' + ic('arrow-right') + '</a>';
    box.innerHTML = h; box.classList.add('open');
    $$('a', box).forEach(function (a) { a.addEventListener('click', function () { box.classList.remove('open'); }); });
  }

  /* ── router ── */
  var routes = {};
  function route(pattern, fn) { routes[pattern] = fn; }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '') || ''; var q = {}; var qi = h.indexOf('?');
    if (qi > -1) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); }); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', param: parts[1], sub: parts[2], q: q, raw: h };
  }
  var current = null, navBusy = false;
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function jumpTop() { var h = document.documentElement, prev = h.style.scrollBehavior; h.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); requestAnimationFrame(function () { h.style.scrollBehavior = prev; }); }
  function render() {
    var r = parseHash(); var fn = routes[r.name] || routes['404'];
    var main = $('#main'); var old = $('.page', main);
    document.body.classList.remove('has-hero');
    closeCart(); toggleDrawer(false); heroBg = null;
    var doRender = function () {
      main.innerHTML = '';
      var pg = document.createElement('div'); pg.className = 'page'; main.appendChild(pg);
      try { fn(pg, r); } catch (e) { console.error(e); pg.innerHTML = '<div class="wrap" style="padding:80px 0"><div class="empty glass"><h3>Something went wrong</h3><p>' + esc(e.message) + '</p></div></div>'; }
      observe(pg); bindPointerFx(pg); jumpTop();
      setActiveNav(r.name); current = r;
      document.title = (pg.getAttribute('data-title') ? pg.getAttribute('data-title') + ' · ' : '') + 'AgricWorld — Premium Agricultural Marketplace';
    };
    if (old && !reduced) { old.classList.add('leaving'); setTimeout(doRender, 150); } else doRender();
  }
  function setActiveNav(name) {
    var map = { home: '#/', marketplace: '#/marketplace', sectors: '#/sectors', companies: '#/companies', dashboard: '#/dashboard', seller: '#/seller', admin: '#/admin', sell: '#/sell' };
    $$('.nav a,.bnav a').forEach(function (a) { var href = a.getAttribute('href'); a.classList.toggle('active', href === (map[name] || '#/' + name) || (name === 'sector' && href === '#/sectors') || (name === 'product' && href === '#/marketplace') || (name === 'company' && href === '#/companies')); });
  }

  /* ── shared components ── */
  function productCard(p, i) {
    var s = D.secMap[p.sec]; var wish = state.wish.indexOf(p.id) > -1;
    var tagL = { hot: 'Bestseller', new: 'New', sale: 'Sale', premium: 'Premium' }[p.tag];
    return '<article class="pc rv" style="--sc:' + s.color + ';--d:' + Math.min(i || 0, 8) * 60 + 'ms">' +
      '<div class="pc-media"><a href="#/product/' + p.id + '" class="pc-img"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" width="400" height="300" onerror="this.onerror=null;this.src=\'' + D.IMG + 'bg-farm-1.jpg\'">' + (tagL ? '<span class="pc-tag ' + p.tag + '">' + tagL + '</span>' : '') + '</a>' +
      '<button class="pc-fav ' + (wish ? 'on' : '') + '" data-wish="' + p.id + '" onclick="AW.toggleWish(' + p.id + ',this)" aria-label="Wishlist">' + ic('heart') + '</button>' +
      '<div class="pc-quick"><a href="#/product/' + p.id + '" class="btn btn-w">' + ic('eye') + ' View</a><button class="btn btn-gold" onclick="AW.buyNow(' + p.id + ')">' + ic('zap') + ' Buy now</button></div></div>' +
      '<div class="pc-body"><div class="pc-cat">' + ic(s.icon) + s.name + '</div><a href="#/product/' + p.id + '" class="pc-name">' + esc(p.name) + '</a>' +
      '<div class="pc-seller"><span class="mini">' + initials(p.seller) + '</span><span>' + esc(p.seller) + '</span>' + (p.ver ? '<span class="ver">' + ic('badge-check') + '</span>' : '') + '</div>' +
      '<div class="pc-loc">' + ic('map-pin') + esc(p.loc) + '</div>' +
      ratingHtml(p, true) +
      '<div class="pc-price"><b>' + money(p.price) + '</b><span>' + p.unit + '</span>' + (p.old ? '<s>' + money(p.old) + '</s>' : '') + '</div>' +
      '<div class="pc-meta"><span class="stock ' + p.stock + '">' + ({ in: 'In stock', low: 'Low stock', out: 'Out of stock' }[p.stock]) + '</span><span>' + ic('truck') + ' ' + esc(p.delivery) + '</span></div>' +
      '<div class="pc-actions"><button class="btn btn-p" onclick="AW.addToCart(' + p.id + ',' + p.moq + ',event)">' + ic('shopping-cart') + ' Add</button><button class="btn btn-ghost" onclick="AW.buyNow(' + p.id + ')">Buy now</button></div></div></article>';
  }
  function buyNow(id) { var it = state.cart.find(function (c) { return c.id === id; }); var p = D.products.find(function (x) { return x.id === id; }); if (p && p.stock === 'out') return toast('Out of stock', 'ban', 'err'); if (!it) { state.cart.push({ id: id, q: p ? p.moq : 1 }); saveCart(); } go('#/checkout'); }
  function sectorCard(s, i, cls) {
    return '<a href="#/sector/' + s.id + '" class="sc-card ' + (cls || 'rv') + '" style="--sc:' + s.color + ';--d:' + Math.min(i || 0, 10) * 45 + 'ms"><img src="' + s.img + '" alt="" loading="lazy" width="400" height="300"><span class="glint"></span><span class="sc-ic">' + ic(s.icon) + '</span><span class="sc-go">' + ic('arrow-up-right') + '</span><h3 style="color:' + s.light + '">' + s.name + '</h3><small>' + ic('layers') + (s.listings ? s.listings + ' listing' + (s.listings === 1 ? '' : 's') : 'Open for sellers') + '</small></a>';
  }
  function fmtCount(n) { n = n || 0; return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }
  function companyCard(c, i) {
    var s = D.secMap[c.sector]; var on = state.follow.indexOf(c.id) > -1;
    return '<article class="co card rv" style="--sc:' + s.color + ';--d:' + Math.min(i || 0, 8) * 60 + 'ms"><div class="co-cover"><img src="' + c.cover + '" alt="" loading="lazy"></div><div class="co-body"><div class="co-logo">' + initials(c.name) + '</div><div class="co-sector">' + ic(s.icon) + ' ' + s.name + '</div><h3 class="co-name">' + esc(c.name) + (c.ver ? '<span class="ver">' + ic('badge-check') + '</span>' : '') + '</h3><div class="pc-loc">' + ic('map-pin') + esc(c.loc) + (c.year ? ' · Est. ' + c.year : '') + '</div><p class="co-desc">' + esc(c.desc) + '</p><div class="co-stats"><div><b>' + fmtCount(c.followers) + '</b>Followers</div><div><b>' + (c.reviews ? c.rating.toFixed(1) + ' ★' : '—') + '</b>' + (c.reviews ? c.reviews + ' reviews' : 'No reviews') + '</div><div><b>' + D.products.filter(function (p) { return p.co === c.id; }).length + '</b>Products</div></div><div class="co-tags">' + c.products.slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div><div class="co-actions"><button class="btn btn-ghost btn-sm btn-follow ' + (on ? 'on' : '') + '" data-follow="' + c.id + '" onclick="AW.toggleFollow(\'' + c.id + '\',this)">' + ic(on ? 'check' : 'plus') + (on ? ' Following' : ' Follow') + '</button><a href="#/company/' + c.id + '" class="btn btn-p btn-sm">View profile ' + ic('arrow-right') + '</a></div></div></article>';
  }
  function sparkline(vals, color, w, h) {
    w = w || 96; h = h || 36; var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals); var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * w, h - ((v - min) / ((max - min) || 1)) * (h - 4) - 2]; });
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
    var id = 'sg' + Math.random().toString(36).slice(2, 7);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".45"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + 'L' + w + ',' + h + 'L0,' + h + 'Z" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;animation:sparkDraw 1.6s var(--ease) .3s forwards"/></svg>';
  }

  /* ── shell ── */
  function buildShell() {
    $('#nav').innerHTML = [['#/', 'Home'], ['#/marketplace', 'Marketplace'], ['#/sectors', 'Sectors'], ['#/companies', 'Companies'], ['#/sell', 'Sell'], ['#/dashboard', 'Account']].map(function (l) { return '<a href="' + l[0] + '">' + l[1] + '</a>'; }).join('');
    $('#drawer').innerHTML = '<div class="drawer-head"><div class="brand"><span class="brand-mark">' + ic('leaf') + '</span><div class="brand-txt"><span class="brand-name">AGRIC<em>WORLD</em></span><span class="brand-sub">Digital Agri Ecosystem</span></div></div><button class="icon-btn" onclick="AW.toggleDrawer(false)" aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="hdr-search" style="max-width:none;margin:0 0 10px"><span class="i lead">' + ic('search') + '</span><input class="field" id="drawerSearch" placeholder="Search products, sellers…"><div class="suggest" id="drawerSuggest"></div></div>' +
      '<h4>Navigate</h4>' + [['#/', 'home', 'Home'], ['#/marketplace', 'store', 'Marketplace'], ['#/companies', 'building-2', 'Company Directory'], ['#/wishlist', 'heart', 'Wishlist'], ['#/dashboard', 'layout-dashboard', 'My Account'], ['#/seller', 'chart-line', 'Seller Dashboard'], ['#/sell', 'rocket', 'Start selling'], ['#/contact', 'headset', 'Contact & support']].map(function (l) { return '<a href="' + l[0] + '">' + ic(l[1]) + l[2] + '</a>'; }).join('') +
      '<h4>Sectors</h4>' + D.sectors.map(function (s) { return '<a href="#/sector/' + s.id + '" class="sec-link" style="--sc:' + s.color + '">' + ic(s.icon) + s.name + '</a>'; }).join('');
    $('#drawer').addEventListener('click', function (e) { if (e.target.closest('a')) toggleDrawer(false); });
    $('#bnav').innerHTML = '<a href="#/">' + ic('home') + 'Home</a><a href="#/marketplace">' + ic('store') + 'Market</a><a href="#/sectors">' + ic('layout-grid') + 'Sectors</a><a href="#/cart" id="bnavCart" onclick="event.preventDefault();AW.openCart()">' + ic('shopping-bag') + 'Cart<span class="dot" id="bnavDot" style="display:none">0</span></a><a href="#/dashboard">' + ic('circle-user') + 'Account</a>';
    $('#footer').innerHTML = '<div class="wrap"><div class="f-grid"><div class="f-about"><div class="brand"><span class="brand-mark">' + ic('leaf') + '</span><div class="brand-txt"><span class="brand-name">AGRIC<em>WORLD</em></span><span class="brand-sub">Digital Agri Ecosystem</span></div></div><p>The digital marketplace connecting farmers, buyers, suppliers, processors, transporters and advisors across 22 agricultural sectors.</p><div class="socials"><a href="' + waLink(C.whatsapp, 'Hello AgricWorld') + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ic('message-square') + '</a><a href="mailto:' + C.contactEmail + '" aria-label="Email">' + ic('mail') + '</a><a href="tel:+' + C.whatsapp + '" aria-label="Call">' + ic('phone') + '</a></div></div>' +
      '<div><h5>Marketplace</h5>' + D.sectors.slice(0, 7).map(function (s) { return '<a href="#/sector/' + s.id + '">' + s.name + '</a>'; }).join('') + '</div>' +
      '<div><h5>More sectors</h5>' + D.sectors.slice(7, 14).map(function (s) { return '<a href="#/sector/' + s.id + '">' + s.name + '</a>'; }).join('') + '</div>' +
      '<div><h5>Platform</h5><a href="#/companies">Company Directory</a><a href="#/sell">Sell on AgricWorld</a><a href="#/dashboard">My Account</a><a href="#/seller">Seller Dashboard</a><a href="#/about">About AgricWorld</a><a href="#/contact">Contact & Support</a><a href="#/credits">Photo credits</a><a href="#/unthetical">UNTHETICAL</a><a onclick="AW.aiToggle(true)" style="cursor:pointer">Ask AgricWorld AI</a><a href="#/terms">Terms & Privacy</a></div>' +
      '<div><h5>Stay updated</h5><p style="font-size:.86rem;color:var(--text-3)">Weekly market prices, new sellers and agri-insights.</p><form class="newsletter" onsubmit="event.preventDefault();AW.subscribe(this)"><input type="email" name="e" required placeholder="you@farm.ng"><button class="btn btn-p btn-sm">' + ic('send') + '</button></form><div style="margin-top:16px;font-size:.84rem;color:var(--text-3)">' + ic('map-pin') + ' ' + esc(C.address || 'Lagos, Nigeria') + '<br>' + ic('phone') + ' ' + esc(C.phoneDisplay || '') + '<br>' + ic('mail') + ' ' + esc(C.contactEmail || '') + '</div></div></div>' +
      '<div class="f-bottom"><span>© ' + new Date().getFullYear() + ' AgricWorld. All rights reserved.</span><span>' + ic('lock') + ' Payments secured by Paystack · ' + ic('badge-check') + ' Verified sellers</span></div></div>';
    $('#cartPnl').innerHTML = '<div class="cart-h"><h3>' + ic('shopping-bag') + ' Your cart</h3><button class="icon-btn" onclick="AW.closeCart()" aria-label="Close">' + ic('x') + '</button></div><div class="cart-list" id="cartList"></div><div class="cart-f" id="cartFoot"><div class="tot"><span>Subtotal</span><span id="cartSub"></span></div><div class="tot"><span>Delivery</span><span id="cartShip" style="font-size:.8rem"></span></div><div class="tot big"><span>Total</span><span id="cartTot"></span></div><a href="#/checkout" class="btn btn-p btn-block" onclick="AW.closeCart()">' + ic('credit-card') + ' Proceed to checkout</a></div>';
    $('#authOv').innerHTML = '<div class="modal glass"><div class="modal-head"><button class="modal-x" onclick="AW.closeAuth()" aria-label="Close">' + ic('x') + '</button><h2 id="authTitle"></h2><p id="authSub"></p></div><div class="modal-body" id="authBody"></div></div>';
    $('#authOv').addEventListener('click', function (e) { if (e.target === $('#authOv')) closeAuth(); });
    $('#themeBtn').innerHTML = ic(state.theme === 'dark' ? 'sun' : 'moon');
    $('#menuBtn').innerHTML = ic('menu'); $('#cartBtn').innerHTML = ic('shopping-bag') + '<span class="dot" id="cartDot">0</span>'; $('#btt').innerHTML = ic('arrow-up');
    $('#hdrSearchIcon').innerHTML = ic('search');
    bindSearch($('#hdrSearch'), $('#hdrSuggest')); bindSearch($('#drawerSearch'), $('#drawerSuggest'));
    renderUserBtn(); renderCartBadge();
    /* header / overlay controls */
    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#cartBtn').addEventListener('click', openCart);
    $('#menuBtn').addEventListener('click', function () { toggleDrawer(); });
    $('#drawerOv').addEventListener('click', function () { toggleDrawer(false); });
    $('#cartOv').addEventListener('click', closeCart);
    $('#btt').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
    $('#userBtn').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#userBtn').click(); } });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); ($('#hdrSearch') || {}).focus && $('#hdrSearch').focus(); } if (e.key === 'Escape') { closeCart(); closeAuth(); toggleDrawer(false); } });
  }

  function subscribe(f) { var e = f.e.value.trim(); var b = f.querySelector('button'); b.disabled = true; DB.subscribe(e).then(function () { toast('Subscribed — welcome to AgricWorld', 'mail'); f.reset(); }).catch(function (er) { toast(errMsg(er), 'circle-alert', 'err'); }).then(function () { b.disabled = false; }); }
  /* ── service worker: instant reloads (cached shell + images), update toast ── */
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    if (location.hostname !== 'localhost' && location.protocol !== 'https:') return;
    var told = false;
    navigator.serviceWorker.addEventListener('message', function (ev) { if (ev.data && ev.data.type === 'aw-update' && !told) { told = true; toast('A newer version is ready — reload to update', 'refresh-cw'); } });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller && !told) { told = true; toast('A newer version is ready — reload to update', 'refresh-cw'); }
        });
      });
    }).catch(function () { });
  }
  var booted = false;
  /* Wikimedia CDN occasionally answers a cold thumbnail with a transient error — retry twice before any fallback runs */
  document.addEventListener('error', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !/wikimedia\.org\//.test(im.src || '')) return;
    var n = +(im.dataset.retry || 0); if (n >= 2) return;
    im.dataset.retry = n + 1; e.stopPropagation();
    var u = im.src; setTimeout(function () { im.src = ''; im.src = u; }, 1500 * (n + 1));
  }, true);
  function init() {
    applyTheme(state.theme, false);
    var st = document.createElement('style'); st.textContent = '@keyframes sparkDraw{to{stroke-dashoffset:0}}'; document.head.appendChild(st);
    var t0 = Date.now();
    Promise.all([DB.loadCatalogue(), DB.initAuth().catch(function (e) { console.error(e); return null; })]).then(function (r) {
      state.user = r[1] || null;
      buildShell(); particles(); syncUserData();
      DB.on(function (ev) { if (ev === 'SIGNED_OUT') { state.user = null; state.follow = []; renderUserBtn(); } else if (ev === 'PASSWORD_RECOVERY') { go('#/account/password'); } else if (DB.user()) { state.user = DB.user(); renderUserBtn(); } });
      if (!location.hash) location.hash = '#/';
      booted = true; render();
      addEventListener('hashchange', render);
      setTimeout(function () { $('#loader').classList.add('hide'); }, Math.max(0, (reduced ? 60 : (sessionStorage.getItem('aw_seen') ? 250 : 650)) - (Date.now() - t0))); try { sessionStorage.setItem('aw_seen', '1'); } catch (e) { }
      registerSW();
    });
  }
  document.addEventListener('DOMContentLoaded', init);

  return { $: $, $$: $$, ic: ic, money: money, moneyShort: moneyShort, esc: esc, stars: stars, initials: initials, rand: rand, state: state, D: D, route: route, go: go, render: render, observe: observe, toast: toast, toggleTheme: toggleTheme, addToCart: addToCart, setQty: setQty, removeFromCart: removeFromCart, openCart: openCart, closeCart: closeCart, cartTotal: cartTotal, cartCount: cartCount, saveCart: saveCart, toggleWish: toggleWish, toggleFollow: toggleFollow, addRecent: addRecent, openAuth: openAuth, closeAuth: closeAuth, submitAuth: submitAuth, switchAuth: switchAuth, setRole: setRole, logout: logout, requireUser: requireUser, toggleDrawer: toggleDrawer, productCard: productCard, sectorCard: sectorCard, companyCard: companyCard, sparkline: sparkline, buyNow: buyNow, setHeroBg: function (el) { heroBg = el; }, reduced: reduced, ratingHtml: ratingHtml, errMsg: errMsg, waLink: waLink, fmtCount: fmtCount, subscribe: subscribe, syncUserData: syncUserData, onSignedIn: onSignedIn, DB: DB, C: C };
})();
