/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Admin gate (in-site)
   Protects the #/admin route. The console only renders after the owner's
   email + password are verified against a salted PBKDF2-SHA256 hash
   (assets/js/admin-config.js) using WebCrypto. Regular sign-up / sign-in
   can never produce an admin account.
   ═══════════════════════════════════════════════════════════════ */
(function (A) {
  'use strict';
  var CFG = window.AW_ADMIN || {};
  var SESSION_KEY = 'aw_admin_session';
  var $ = A.$, ic = A.ic;

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
  A.isAdmin = function () { return !!session(); };

  var attempts = 0, lockedUntil = 0;

  function gatePage(pg, msg) {
    pg.setAttribute('data-title', 'Admin sign-in'); pg.classList.add('gate-page');
    pg.innerHTML =
      '<div class="gate"><div class="gate-card glass">' +
      '<div class="gate-logo"><span class="brand-mark">' + ic('lock') + '</span></div>' +
      '<h1>Admin console</h1><p>Restricted area. Sign in with the owner email and password.</p>' +
      '<form id="gateForm" class="form" autocomplete="off">' +
      '<div class="fld full"><label>Email</label><input id="gEmail" type="email" required autocomplete="username" placeholder="owner@gmail.com"></div>' +
      '<div class="fld full"><label>Password</label><input id="gPass" type="password" required autocomplete="current-password" placeholder="Your password"></div>' +
      '<div class="gate-err" id="gateErr">' + (msg || '') + '</div>' +
      '<button class="btn btn-p btn-block" id="gateBtn" type="submit">' + ic('lock') + ' Unlock console</button>' +
      '</form>' +
      '<details class="gate-tools"><summary>Owner tools: change password</summary><p>Type a new password, copy the generated <code>salt</code> and <code>hash</code> into <code>assets/js/admin-config.js</code>, commit &amp; push. The old password stops working immediately.</p><input id="newPass" type="text" placeholder="New password (min 8 chars)"><button type="button" class="btn btn-ghost btn-sm" id="genBtn">Generate</button><pre id="genOut"></pre></details>' +
      '<a href="#/" class="gate-back">← Back to AgricWorld</a>' +
      '</div></div>';
    $('#gateForm', pg).addEventListener('submit', onSubmit);
    $('#genBtn', pg).addEventListener('click', function () {
      var p = $('#newPass').value; if (p.length < 8) { $('#genOut').textContent = 'Use at least 8 characters.'; return; }
      var salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      pbkdf2(p, salt, CFG.iterations || 120000).then(function (h) { $('#genOut').textContent = "salt: '" + salt + "',\nhash: '" + h + "',"; });
    });
    setTimeout(function () { var e = $('#gEmail'); if (e) e.focus(); }, 60);
  }

  function onSubmit(e) {
    e.preventDefault();
    var err = $('#gateErr'), btn = $('#gateBtn');
    if (!window.isSecureContext) { err.textContent = 'Admin sign-in requires HTTPS.'; return; }
    if (Date.now() < lockedUntil) { err.textContent = 'Too many attempts. Try again in ' + Math.ceil((lockedUntil - Date.now()) / 1000) + 's.'; return; }
    var email = $('#gEmail').value.trim().toLowerCase(), pass = $('#gPass').value;
    btn.disabled = true; btn.innerHTML = 'Verifying…';
    pbkdf2(pass, CFG.salt || '', CFG.iterations || 120000).then(function (h) {
      var ok = email === String(CFG.email || '').toLowerCase() && constantEq(h, CFG.hash || '');
      if (ok) { setSession(); attempts = 0; closeGateModal(); A.toast('Welcome back, owner — full admin controls unlocked', 'shield-check'); A.render(); return; }
      attempts++; if (attempts >= 5) { lockedUntil = Date.now() + 30000; attempts = 0; }
      err.textContent = 'Incorrect email or password.'; btn.disabled = false; btn.innerHTML = ic('lock') + ' Unlock console';
      $('#gPass').value = ''; $('#gPass').focus();
      var card = $('.gate-card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    });
  }

  /* The admin route is PUBLIC in read-only preview mode. Any action inside the console calls
     A.requireAdmin(); if the owner is not signed in, the sign-in card opens as a modal. */
  A.requireAdmin = function (fn) {
    if (session()) { if (fn) fn(); return true; }
    openGateModal(); return false;
  };
  A.openAdminLogin = function () { openGateModal(); };
  function openGateModal() {
    var ov = document.getElementById('gateOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'gateOv'; ov.className = 'modal-ov gate-ov'; document.body.appendChild(ov); ov.addEventListener('click', function (e) { if (e.target === ov) closeGateModal(); }); }
    var box = document.createElement('div'); ov.innerHTML = ''; ov.appendChild(box);
    gatePage(box, (!CFG.hash || !CFG.salt) ? 'Admin password is not configured.' : '');
    box.querySelector('.gate').classList.add('in-modal');
    var back = box.querySelector('.gate-back'); back.textContent = 'Cancel'; back.removeAttribute('href'); back.style.cursor = 'pointer'; back.onclick = closeGateModal;
    requestAnimationFrame(function () { ov.classList.add('open'); }); document.body.style.overflow = 'hidden';
  }
  function closeGateModal() { var ov = document.getElementById('gateOv'); if (ov) ov.classList.remove('open'); document.body.style.overflow = ''; }
  A.closeAdminLogin = closeGateModal;
  window.AW_GUARD = null;

  /* Owner sign-out from the admin sidebar */
  A.adminLogout = function () { clearSession(); A.toast('Signed out — console is now read-only', 'log-out', 'warn'); A.render(); };
})(window.AW);
