/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Admin gate
   Verifies the owner's passphrase against a salted PBKDF2-SHA256 hash
   (admin/config.js) using WebCrypto, then loads the admin console.
   The public site never links here and never loads admin.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var CFG = window.AW_ADMIN || {};
  var SESSION_KEY = 'aw_admin_session';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function fromHex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function pbkdf2(pass, saltHex, iterations) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: iterations, hash: 'SHA-256' }, key, 256);
    }).then(hex);
  }
  function constantEq(a, b) { if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

  function session() { try { var s = JSON.parse(sessionStorage.getItem(SESSION_KEY)); return s && s.exp > Date.now() && s.h === CFG.hash ? s : null; } catch (e) { return null; } }
  function setSession() { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ exp: Date.now() + (CFG.sessionHours || 8) * 3600e3, h: CFG.hash })); }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  /* ── throttle brute force: 5 attempts then 30 s lock (per browser) ── */
  var attempts = 0, lockedUntil = 0;

  var gateMsg = '';
  function gateRoute(pg) { showGate(gateMsg, pg); }
  function showGate(msg, pg) {
    var main = pg || $('#main'); document.body.classList.add('admin-locked');
    main.setAttribute('data-title', 'Admin sign-in');
    main.innerHTML =
      '<div class="gate"><div class="gate-card glass">' +
      '<div class="gate-logo"><span class="brand-mark"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span></span></div>' +
      '<h1>Admin console</h1><p>Restricted area. Sign in with the owner passphrase.</p>' +
      '<form id="gateForm" class="form" autocomplete="off">' +
      '<div class="fld full"><label>Email</label><input id="gEmail" type="email" required autocomplete="username" value="' + (CFG.email || '') + '"></div>' +
      '<div class="fld full"><label>Passphrase</label><input id="gPass" type="password" required autocomplete="current-password" placeholder="AW-xxxxx-xxxxx-xxxxx"></div>' +
      '<div class="gate-err" id="gateErr">' + (msg || '') + '</div>' +
      '<button class="btn btn-p btn-block" id="gateBtn" type="submit">Unlock console</button>' +
      '</form>' +
      '<details class="gate-tools"><summary>Generate new passphrase hash</summary><p>Type a new passphrase, copy the generated <code>salt</code> and <code>hash</code> into <code>admin/config.js</code>, commit, and the old passphrase stops working.</p><input id="newPass" type="text" placeholder="New passphrase (min 12 chars)"><button type="button" class="btn btn-ghost btn-sm" id="genBtn">Generate</button><pre id="genOut"></pre></details>' +
      '<a href="../" class="gate-back">← Back to AgricWorld</a>' +
      '</div></div>';
    $('#gateForm').addEventListener('submit', onSubmit);
    $('#genBtn').addEventListener('click', function () {
      var p = $('#newPass').value; if (p.length < 12) { $('#genOut').textContent = 'Use at least 12 characters.'; return; }
      var salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      pbkdf2(p, salt, CFG.iterations || 120000).then(function (h) { $('#genOut').textContent = "salt: '" + salt + "',\nhash: '" + h + "',"; });
    });
    setTimeout(function () { $('#gPass').focus(); }, 50);
  }

  function onSubmit(e) {
    e.preventDefault();
    var err = $('#gateErr'), btn = $('#gateBtn');
    if (Date.now() < lockedUntil) { err.textContent = 'Too many attempts. Try again in ' + Math.ceil((lockedUntil - Date.now()) / 1000) + 's.'; return; }
    var email = $('#gEmail').value.trim().toLowerCase(), pass = $('#gPass').value;
    btn.disabled = true; btn.textContent = 'Verifying…';
    pbkdf2(pass, CFG.salt || '', CFG.iterations || 120000).then(function (h) {
      var ok = email === String(CFG.email || '').toLowerCase() && constantEq(h, CFG.hash || '');
      if (ok) { setSession(); attempts = 0; unlock(); return; }
      attempts++; if (attempts >= 5) { lockedUntil = Date.now() + 30000; attempts = 0; }
      err.textContent = 'Incorrect email or passphrase.'; btn.disabled = false; btn.textContent = 'Unlock console';
      $('#gPass').value = ''; $('#gPass').focus();
      var card = $('.gate-card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    });
  }

  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  function unlock() {
    document.body.classList.remove('admin-locked');
    var A = window.AW;
    A.state.user = { name: 'Platform Owner', email: CFG.email, role: 'admin', joined: '2026' };
    A.logout = function () { clearSession(); A.state.user = null; location.href = location.pathname; };
    loadScript('../assets/js/admin.js').then(function () {
      if (!/^#\/admin/.test(location.hash)) location.hash = '#/admin'; else A.render();
      var btn = $('#userBtn'); if (btn) { btn.innerHTML = '<span class="avatar" style="background:linear-gradient(135deg,#0f5132,#34d399)">PO</span><span>Owner</span>'; btn.setAttribute('href', '#/admin'); btn.onclick = null; }
    });
    /* re-verify session on every route change; bounce to gate if expired */
    addEventListener('hashchange', function () { if (!session()) { clearSession(); location.reload(); } });
  }


  /* Router guard: while there is no valid admin session, EVERY route renders the gate.
     app.js consults window.AW_GUARD before running any route handler. */
  window.AW_GUARD = function () {
    if (!CFG.hash || !CFG.salt) { gateMsg = 'admin/config.js is missing a passphrase hash.'; return gateRoute; }
    if (!window.isSecureContext) { gateMsg = 'Admin sign-in requires HTTPS (or localhost).'; return gateRoute; }
    return session() ? null : gateRoute;
  };
  document.addEventListener('DOMContentLoaded', function () { if (session()) unlock(); });
})();
