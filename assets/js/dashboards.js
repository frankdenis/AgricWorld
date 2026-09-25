/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Dashboards (buyer · seller · admin) on live data
   Every number shown comes from the database. Nothing is simulated.
   ═══════════════════════════════════════════════════════════════ */
(function (A) {
  'use strict';
  var D = A.D, ic = A.ic, money = A.money, esc = A.esc, $ = A.$, $$ = A.$$, IMG = D.IMG, DB = A.DB, C = A.C;

  /* ── SVG charts (no dependencies) ── */
  function lineChart(series, opts) {
    opts = opts || {}; var W = 600, H = opts.h || 220, padL = 46, padB = 26, padT = 12, padR = 10;
    var all = [].concat.apply([], series.map(function (s) { return s.data; })); var max = (Math.max.apply(null, all) || 1) * 1.1, n = series[0].data.length;
    if (n < 2) return '<div class="empty" style="padding:30px"><p>Not enough data yet — the chart appears after two months of activity.</p></div>';
    var x = function (i) { return padL + (i / (n - 1)) * (W - padL - padR); }, y = function (v) { return padT + (1 - v / max) * (H - padT - padB); };
    var h = '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '"><defs>' + series.map(function (s, i) { return '<linearGradient id="lg' + i + s.color.slice(1) + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.color + '" stop-opacity=".35"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>'; }).join('') + '</defs>';
    for (var g = 0; g <= 4; g++) { var gy = padT + (g / 4) * (H - padT - padB); h += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '" stroke="currentColor" stroke-opacity=".08"/><text x="' + (padL - 8) + '" y="' + (gy + 4) + '" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".5">' + (opts.fmt || A.moneyShort)(max * (1 - g / 4)) + '</text>'; }
    (opts.labels || []).slice(0, n).forEach(function (l, i) { h += '<text x="' + x(i) + '" y="' + (H - 6) + '" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity=".55">' + l + '</text>'; });
    series.forEach(function (s, si) {
      var pts = s.data.map(function (v, i) { return [x(i), y(v)]; });
      var d = pts.map(function (p, i) { if (!i) return 'M' + p[0] + ',' + p[1]; var prev = pts[i - 1]; var cx = (prev[0] + p[0]) / 2; return 'C' + cx + ',' + prev[1] + ' ' + cx + ',' + p[1] + ' ' + p[0] + ',' + p[1]; }).join('');
      h += '<path d="' + d + 'L' + pts[n - 1][0] + ',' + (H - padB) + 'L' + pts[0][0] + ',' + (H - padB) + 'Z" fill="url(#lg' + si + s.color.slice(1) + ')" style="opacity:0;animation:fadeIn 1s var(--ease) ' + (0.8 + si * .2) + 's forwards"/>';
      h += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.5" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;animation:sparkDraw 1.8s var(--ease) ' + si * .2 + 's forwards"/>';
      pts.forEach(function (p, i) { h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + s.color + '" stroke="var(--surface-solid)" stroke-width="2" style="opacity:0;animation:popIn .4s var(--ease) ' + (0.3 + i * .12 + si * .2) + 's forwards"><title>' + s.name + ': ' + (opts.fmt || A.moneyShort)(s.data[i]) + '</title></circle>'; });
    });
    return h + '</svg>';
  }
  function barChart(series, opts) {
    opts = opts || {}; var W = 600, H = opts.h || 220, padL = 40, padB = 26, padT = 12, padR = 6, n = series[0].data.length, labels = opts.labels || [];
    if (!n) return '<div class="empty" style="padding:30px"><p>No data yet.</p></div>';
    var all = [].concat.apply([], series.map(function (s) { return s.data; })); var max = (Math.max.apply(null, all) || 1) * 1.1;
    var gw = (W - padL - padR) / n, bw = Math.min(26, (gw * .7) / series.length);
    var h = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">';
    for (var g = 0; g <= 4; g++) { var gy = padT + (g / 4) * (H - padT - padB); h += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '" stroke="currentColor" stroke-opacity=".08"/><text x="' + (padL - 6) + '" y="' + (gy + 4) + '" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".5">' + (opts.fmt || function (v) { return Math.round(v); })(max * (1 - g / 4)) + '</text>'; }
    for (var i = 0; i < n; i++) {
      h += '<text x="' + (padL + gw * i + gw / 2) + '" y="' + (H - 6) + '" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity=".55">' + (labels[i] || '') + '</text>';
      series.forEach(function (s, si) { var bh = (s.data[i] / max) * (H - padT - padB); var bx = padL + gw * i + gw / 2 - (bw * series.length) / 2 + si * bw; h += '<rect x="' + (bx + 1) + '" y="' + (H - padB - bh) + '" width="' + (bw - 2) + '" height="' + bh + '" rx="5" fill="' + s.color + '" style="transform-origin:' + (bx + bw / 2) + 'px ' + (H - padB) + 'px;transform:scaleY(0);animation:barUp .9s var(--ease) ' + (i * .06 + si * .05) + 's forwards"><title>' + s.name + ' ' + (labels[i] || '') + ': ' + s.data[i].toLocaleString() + '</title></rect>'; });
    }
    return h + '</svg>';
  }
  function donut(parts, size) {
    size = size || 150; var r = 60, c = 2 * Math.PI * r, total = parts.reduce(function (a, p) { return a + p.v; }, 0) || 1, off = 0;
    var h = '<svg viewBox="0 0 150 150" style="width:' + size + 'px;height:' + size + 'px;transform:rotate(-90deg)">';
    parts.forEach(function (p, i) { var len = (p.v / total) * c; h += '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="16" stroke-dasharray="0 ' + c + '" stroke-dashoffset="' + (-off) + '" style="animation:donutIn 1.2s var(--ease) ' + i * .15 + 's forwards;--len:' + len + ';--c:' + c + '"><title>' + p.n + ': ' + Math.round(p.v / total * 100) + '%</title></circle>'; off += len; });
    return h + '</svg>';
  }
  var st = document.createElement('style'); st.textContent = '@keyframes barUp{to{transform:scaleY(1)}}@keyframes donutIn{to{stroke-dasharray:var(--len) var(--c)}}'; document.head.appendChild(st);
  function monthly(rows) { var labels = [], data = []; (rows || []).forEach(function (r) { var d = new Date(r.m + '-01'); labels.push(d.toLocaleDateString('en', { month: 'short' })); data.push(+r.v); }); return { labels: labels, data: data }; }

  /* ── shared dashboard shell ── */
  function shell(pg, cfg) {
    var u = cfg.user;
    var items = cfg.nav.map(function (n, i) { return '<a href="#/' + cfg.base + (n[0] ? '/' + n[0] : '') + '" class="' + ((cfg.sub || '') === n[0] ? 'active' : '') + '" style="--i:' + i + '">' + ic(n[1]) + n[2] + (n[3] ? '<span class="n">' + n[3] + '</span>' : '') + '</a>'; }).join('');
    if (cfg.cls) pg.classList.add(cfg.cls);
    pg.innerHTML = '<div class="dash ' + (cfg.cls || '') + '"><aside class="dash-side"><div class="dash-user"><span class="avatar" style="' + (cfg.avatarStyle || '') + '">' + A.initials(u.name || u.email || '?') + '</span><div><b>' + esc(u.name || u.email) + '</b><small>' + cfg.roleLabel + '</small></div></div><nav class="dash-nav">' + items + '<h6>Account</h6><a href="#/" style="--i:20">' + ic('store') + 'Back to marketplace</a>' + (cfg.guest ? (A.state.user ? '' : '<a onclick="AW.openAuth(\'login\')" style="--i:21;cursor:pointer">' + ic('log-in') + 'Owner sign in</a>') : '<a onclick="AW.logout()" style="--i:21;cursor:pointer">' + ic('log-out') + 'Sign out</a>') + '</nav></aside><div class="dash-main"><div class="dash-tabs-mobile">' + cfg.nav.map(function (n) { return '<a href="#/' + cfg.base + (n[0] ? '/' + n[0] : '') + '" class="' + ((cfg.sub || '') === n[0] ? 'active' : '') + '">' + ic(n[1]) + n[2] + '</a>'; }).join('') + '</div><div id="dashBody"><div class="skel" style="height:140px;margin-bottom:16px"></div><div class="skel" style="height:280px"></div></div></div></div>';
    return $('#dashBody', pg);
  }
  function kpi(label, val, icon, color, prefix, suffix, dec) {
    return '<div class="kpi glass rv" style="--c:' + color + '"><span class="ic">' + ic(icon) + '</span><small>' + label + '</small><b data-count="' + (val || 0) + '" data-prefix="' + (prefix || '') + '" data-suffix="' + (suffix || '') + '" ' + (dec ? 'data-dec="' + dec + '"' : '') + '>' + (prefix || '') + '0' + (suffix || '') + '</b></div>';
  }
  function withAI(html, role, sub) { if (sub || !A.aiDashWidget) return html; var w = A.aiDashWidget(role), i = html.indexOf('<div class="kpis">'); return i > -1 ? html.slice(0, i) + w + html.slice(i) : html + w; }
  function panel(title, body, extra, cls) { return '<div class="panel glass rv ' + (cls || '') + '"><div class="panel-h"><h3>' + title + '</h3>' + (extra || '') + '</div>' + body + '</div>'; }
  var STATUS = { pending_payment: ['pend', 'Awaiting payment'], requested: ['info', 'Requested'], paid: ['ok', 'Paid'], processing: ['info', 'Processing'], shipped: ['ship', 'Shipped'], delivered: ['ok', 'Delivered'], cancelled: ['bad', 'Cancelled'], refunded: ['bad', 'Refunded'] };
  function pill(s) { var m = STATUS[s] || ['info', s]; return '<span class="pill ' + m[0] + '">' + m[1] + '</span>'; }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function empty(icon, title, sub, cta) { return '<div class="empty">' + ic(icon) + '<h3>' + title + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + (cta || '') + '</div>'; }
  function gate(pg, title, why, role) {
    pg.innerHTML = '<div class="wrap" style="padding:70px 0"><div class="empty glass" style="max-width:560px;margin:0 auto">' + ic('lock') + '<h3>' + title + '</h3><p>' + why + '</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px"><button class="btn btn-p" onclick="AW.openAuth(\'login\')">' + ic('log-in') + ' Sign in</button><button class="btn btn-ghost" onclick="AW.openAuth(\'register\')">' + ic('user-plus') + ' Create ' + (role || 'an') + ' account</button></div></div></div>';
  }
  function notConfigured(pg, title) {
    pg.innerHTML = '<div class="wrap" style="padding:70px 0"><div class="empty glass" style="max-width:600px;margin:0 auto">' + ic('database') + '<h3>' + title + ' needs the database</h3><p>Accounts, orders and dashboards go live as soon as the Supabase keys are added to <code>assets/js/config.js</code>. Follow <b>SETUP.md</b> — it takes about ten minutes.</p><a href="#/" class="btn btn-p btn-sm" style="margin-top:14px">Back to marketplace</a></div></div>';
  }
  function fail(body, e) { body.innerHTML = '<div class="empty glass">' + ic('circle-alert') + '<h3>Could not load this page</h3><p>' + esc(A.errMsg(e)) + '</p><button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="AW.render()">Try again</button></div>'; }
  function orderItemsHtml(items) { return '<div style="display:grid;gap:6px">' + (items || []).map(function (it) { return '<div class="pt"><img src="' + esc(it.img || IMG + 'bg-farm-1.jpg') + '" alt=""><div><b>' + esc(it.name) + '</b><small>' + it.qty + ' × ' + money(it.price) + (it.unit || '') + '</small></div></div>'; }).join('') + '</div>'; }

  /* ════════ BUYER ACCOUNT ════════ */
  A.route('dashboard', function (pg, r) {
    var sub = r.param || '';
    pg.setAttribute('data-title', 'My Account');
    if (!DB.configured()) return notConfigured(pg, 'My Account');
    var u = A.state.user;
    if (!u) return gate(pg, 'Sign in to your account', 'Track orders, chat with sellers, manage favourites and your profile.', 'a buyer');
    if (u.role === 'admin' && !sub) { A.go('#/admin'); return; }
    var body = shell(pg, { base: 'dashboard', sub: sub, user: u, roleLabel: { buyer: 'Buyer account', seller: 'Seller account', company: 'Company account', admin: 'Platform owner' }[u.role] || 'Account', nav: [['', 'layout-dashboard', 'Overview'], ['orders', 'package', 'My orders'], ['wishlist', 'heart', 'Favourites', A.state.wish.length || null], ['messages', 'message-square', 'Messages'], ['following', 'users', 'Following'], ['profile', 'circle-user', 'Profile & security']].concat(u.role !== 'buyer' ? [['seller', 'store', u.role === 'admin' ? 'Admin console' : 'Seller dashboard']] : []) });
    if (sub === 'seller') { A.go(u.role === 'admin' ? '#/admin' : '#/seller'); return; }
    var views = {
      '': function () {
        return DB.myOrders().then(function (orders) {
          var paid = orders.filter(function (o) { return ['paid', 'processing', 'shipped', 'delivered'].indexOf(o.status) > -1; });
          var spent = paid.reduce(function (a, o) { return a + (+o.total); }, 0);
          var recent = A.state.recent.map(function (id) { return D.products.find(function (p) { return p.id === id; }); }).filter(Boolean);
          var bySec = {}; orders.forEach(function (o) { (o.order_items || []).forEach(function (it) { var p = D.products.find(function (x) { return x.id === it.product_id; }); var k = p ? D.secMap[p.sec].name : 'Other'; bySec[k] = (bySec[k] || 0) + it.price * it.qty; }); });
          var parts = Object.keys(bySec).map(function (k, i) { var s = D.sectors.find(function (x) { return x.name === k; }); return { n: k, v: bySec[k], c: s ? s.color : '#7c3aed' }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
          return '<div class="dash-top"><div><h1>Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening') + ', ' + esc((u.name || '').split(' ')[0]) + '</h1><p>Your orders, messages and saved products in one place.</p></div><div style="display:flex;gap:10px"><a href="#/marketplace" class="btn btn-p btn-sm">' + ic('store') + ' Shop</a>' + (u.role === 'buyer' ? '<a href="#/sell" class="btn btn-ghost btn-sm">' + ic('rocket') + ' Sell on AgricWorld</a>' : '') + '</div></div>' +
            '<div class="kpis">' + kpi('Total spent (paid orders)', spent, 'banknote', '#10b981', '₦') + kpi('Orders', orders.length, 'package', '#0284c7') + kpi('Favourites', A.state.wish.length, 'heart', '#e11d48') + kpi('Following', A.state.follow.length, 'users', '#f5b820') + '</div>' +
            '<div class="dgrid">' + panel('Recent orders', orders.length ? ordersTable(orders.slice(0, 5)) : empty('package', 'No orders yet', 'Products you order will appear here.', '<a href="#/marketplace" class="btn btn-p btn-sm" style="margin-top:12px">Browse marketplace</a>'), '<a href="#/dashboard/orders" class="link">All orders ' + ic('arrow-right') + '</a>') +
            panel('Spending by sector', parts.length ? '<div class="donut-wrap">' + donut(parts) + '<div class="legend" style="flex-direction:column;gap:8px">' + parts.map(function (l) { return '<span><i style="--c:' + l.c + '"></i>' + esc(l.n) + ' <b>' + money(l.v) + '</b></span>'; }).join('') + '</div></div>' : empty('chart-pie', 'Nothing to chart yet')) + '</div>' +
            (recent.length ? panel('Recently viewed', '<div class="mini-grid">' + recent.map(function (p) { return '<a href="#/product/' + p.id + '" class="mini-p"><img src="' + esc(p.img) + '" alt=""><div><b>' + esc(p.name) + '</b><small>' + money(p.price) + p.unit + '</small></div></a>'; }).join('') + '</div>') : '');
        });
      },
      orders: function () { return DB.myOrders().then(function (orders) { return '<div class="dash-top"><div><h1>My orders</h1><p>' + orders.length + ' order' + (orders.length === 1 ? '' : 's') + '</p></div></div>' + panel('All orders', orders.length ? ordersTable(orders, true) : empty('package', 'No orders yet', '', '<a href="#/marketplace" class="btn btn-p btn-sm" style="margin-top:12px">Start shopping</a>')); }); },
      wishlist: function () { var ps = D.products.filter(function (p) { return A.state.wish.indexOf(p.id) > -1; }); return Promise.resolve('<div class="dash-top"><div><h1>Favourites</h1><p>' + ps.length + ' saved products</p></div></div><div class="p-grid">' + (ps.length ? ps.map(function (p, i) { return A.productCard(p, i); }).join('') : '<div class="empty glass" style="grid-column:1/-1">' + ic('heart') + '<h3>Nothing saved yet</h3><a href="#/marketplace" class="btn btn-p btn-sm" style="margin-top:12px">Browse products</a></div>') + '</div>'); },
      messages: function () { return Promise.resolve('<div class="dash-top"><div><h1>Messages</h1><p>Conversations with sellers</p></div></div>' + chatShell()); },
      following: function () { var cs = D.companies.filter(function (c) { return A.state.follow.indexOf(c.id) > -1; }); return Promise.resolve('<div class="dash-top"><div><h1>Following</h1><p>' + cs.length + ' companies</p></div></div><div class="co-grid">' + (cs.length ? cs.map(function (c, i) { return A.companyCard(c, i); }).join('') : '<div class="empty glass" style="grid-column:1/-1">' + ic('users') + '<h3>You are not following anyone yet</h3><a href="#/companies" class="btn btn-p btn-sm" style="margin-top:12px">Explore companies</a></div>') + '</div>'); },
      profile: function () { return Promise.resolve(profileView(u)); }
    };
    function ordersTable(list, full) {
      return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>' + list.map(function (o, i) { return '<tr style="--i:' + i + '"><td><b>' + esc(o.ref) + '</b>' + (full ? '<br><small style="color:var(--text-3)">' + esc(o.ship_option || '') + '</small>' : '') + '</td><td>' + orderItemsHtml(o.order_items) + '</td><td><b>' + money(o.total) + '</b></td><td>' + (o.method === 'paystack' ? ic('credit-card') + ' Paystack' : o.method === 'stripe' ? ic('globe') + ' Stripe' : ic('hand-coins') + ' Direct') + '</td><td>' + pill(o.status) + '</td><td style="color:var(--text-3)">' + fmtDate(o.created_at) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    (views[sub] || views[''])().then(function (html) { body.innerHTML = withAI(html, 'buyer', sub); A.observe(body); if (sub === 'messages') initChat(body, { asSeller: null, co: r.q.co, p: r.q.p }); if (sub === 'profile') bindProfile(body, u); }).catch(function (e) { fail(body, e); });
  });

  function profileView(u) {
    return '<div class="dash-top"><div><h1>Profile & security</h1></div></div><div class="dgrid eq">' + panel('Personal information', '<form class="form" id="profForm"><div class="fld"><label>Full name</label><input name="name" value="' + esc(u.name || '') + '" required></div><div class="fld"><label>Email</label><input value="' + esc(u.email || '') + '" disabled></div><div class="fld"><label>Phone</label><input name="phone" value="' + esc(u.phone || '') + '" placeholder="+234"></div><div class="fld"><label>Account type</label><input value="' + esc(u.role) + '" disabled></div><div class="full"><button class="btn btn-p btn-sm">Save changes</button></div></form>') +
      panel('Change password', '<form class="form" id="pwForm"><div class="fld full"><label>New password</label><input name="pw" type="password" minlength="8" required placeholder="Minimum 8 characters"></div><div class="fld full"><label>Confirm new password</label><input name="pw2" type="password" minlength="8" required></div><div class="full"><button class="btn btn-ghost btn-sm">Update password</button></div></form><div class="setting" style="margin-top:14px"><div><b>Dark mode</b><small>Switch between light and dark themes</small></div><button type="button" class="toggle ' + (A.state.theme === 'dark' ? 'on' : '') + '" onclick="AW.toggleTheme();this.classList.toggle(\'on\')"></button></div>') + '</div>';
  }
  function bindProfile(body, u) {
    $('#profForm', body).addEventListener('submit', function (e) { e.preventDefault(); var f = this; DB.updateProfile({ name: f.name.value.trim(), phone: f.phone.value.trim() }).then(function (p) { A.state.user = p; A.toast('Profile saved', 'check'); A.render(); }).catch(function (er) { A.toast(A.errMsg(er), 'circle-alert', 'err'); }); });
    $('#pwForm', body).addEventListener('submit', function (e) { e.preventDefault(); var f = this; if (f.pw.value !== f.pw2.value) return A.toast('Passwords do not match', 'circle-alert', 'err'); DB.updatePassword(f.pw.value).then(function () { A.toast('Password updated', 'check'); f.reset(); }).catch(function (er) { A.toast(A.errMsg(er), 'circle-alert', 'err'); }); });
  }
  A.route('account', function (pg, r) {
    /* #/account/password — landing page from password-reset emails */
    pg.setAttribute('data-title', 'Set a new password');
    if (r.param !== 'password') return A.route404(pg);
    pg.innerHTML = '<div class="wrap" style="padding:60px 0"><div class="card" style="max-width:480px;margin:0 auto"><h3>Set a new password</h3><form class="form" id="pwForm" style="margin-top:12px"><div class="fld full"><label>New password</label><input name="pw" type="password" minlength="8" required></div><div class="fld full"><label>Confirm</label><input name="pw2" type="password" minlength="8" required></div><div class="full"><button class="btn btn-p">Save password</button></div></form></div></div>';
    $('#pwForm').addEventListener('submit', function (e) { e.preventDefault(); var f = this; if (f.pw.value !== f.pw2.value) return A.toast('Passwords do not match', 'circle-alert', 'err'); DB.updatePassword(f.pw.value).then(function () { A.toast('Password saved — you are signed in', 'check'); A.go('#/dashboard'); }).catch(function (er) { A.toast(A.errMsg(er), 'circle-alert', 'err'); }); });
  });

  /* ── real messaging ── */
  function chatShell() { return '<div class="chat"><div class="panel glass" style="padding:10px" id="threads"><div class="skel" style="height:60px"></div></div><div class="panel glass" style="padding:0;display:flex;flex-direction:column"><div class="panel-h" style="padding:14px 18px;border-bottom:1px solid var(--line);margin:0"><h3 id="chatWith">Select a conversation</h3></div><div class="bubbles" id="bubbles" style="flex:1"></div><form id="chatForm" style="display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)"><input class="field" name="m" placeholder="Type a message…" style="flex:1;height:44px;border-radius:12px;border:1px solid var(--line-2);background:var(--glass);padding:0 14px;outline:none;color:inherit" autocomplete="off" disabled><button class="btn btn-p btn-sm" disabled>' + ic('send') + '</button></form></div></div>'; }
  function initChat(body, ctx) {
    var me = A.state.user, cur = null, timer = null;
    var asSeller = ctx.asSeller; /* company id when the seller is viewing */
    function drawThreads() {
      return DB.threads(asSeller).then(function (list) {
        if (!asSeller && ctx.co && !list.some(function (t) { return t.company_id === ctx.co; })) list.unshift({ company_id: ctx.co, user_id: me.id, last: null, unread: 0, fresh: true });
        var box = $('#threads', body); if (!box) return;
        box.innerHTML = list.length ? list.map(function (t, i) { var c = D.coMap[t.company_id]; var title = asSeller ? (t.buyer_name || 'Buyer') : (c ? c.name : t.company_id); return '<div class="msg ' + (cur && cur.company_id === t.company_id && cur.user_id === t.user_id ? 'on' : '') + '" data-i="' + i + '"><span class="avatar">' + A.initials(title) + '</span><div style="min-width:0;flex:1"><b>' + esc(title) + '</b><small>' + esc(t.last ? t.last.body : 'Start the conversation') + '</small></div>' + (t.unread ? '<span class="un"></span>' : '') + '</div>'; }).join('') : empty('message-square', 'No conversations yet', asSeller ? 'Buyers who message you appear here.' : 'Use “Chat” on any product or company to message a seller.');
        $$('.msg', box).forEach(function (el) { el.addEventListener('click', function () { open(list[+el.getAttribute('data-i')]); }); });
        if (!cur && list.length) open(list[0]);
      });
    }
    function open(t) {
      cur = t; $$('#threads .msg', body).forEach(function (m) { m.classList.remove('on'); });
      var c = D.coMap[t.company_id]; $('#chatWith', body).textContent = asSeller ? (t.buyer_name || 'Buyer') : (c ? c.name : 'Seller');
      var f = $('#chatForm', body); f.m.disabled = false; f.querySelector('button').disabled = false;
      drawBubbles(); DB.markRead(t.company_id, t.user_id, asSeller ? 'buyer' : 'seller').catch(function () { });
      if (ctx.p && t.fresh) { var p = D.products.find(function (x) { return x.id === +ctx.p; }); if (p) f.m.value = 'Hello, I am interested in "' + p.name + '" (' + money(p.price) + p.unit + '). Is it available?'; }
    }
    function drawBubbles() {
      if (!cur) return;
      DB.thread(cur.company_id, cur.user_id).then(function (msgs) {
        var b = $('#bubbles', body); if (!b) return;
        var mine = asSeller ? 'seller' : 'buyer';
        b.innerHTML = msgs.length ? msgs.map(function (m, i) { return '<div class="bubble ' + (m.sender === mine ? 'me' : '') + '" style="--i:' + Math.min(i, 8) + '">' + esc(m.body) + '<time>' + new Date(m.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</time></div>'; }).join('') : '<div class="bubble" style="opacity:.7">No messages yet — say hello.</div>';
        b.scrollTop = 1e6;
      }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); });
    }
    $('#chatForm', body).addEventListener('submit', function (e) {
      e.preventDefault(); var v = this.m.value.trim(); if (!v || !cur) return; var f = this; f.m.value = '';
      DB.sendMessage(cur.company_id, cur.user_id, asSeller ? 'seller' : 'buyer', v).then(function () { cur.fresh = false; drawBubbles(); drawThreads(); }).catch(function (er) { f.m.value = v; A.toast(A.errMsg(er), 'circle-alert', 'err'); });
    });
    drawThreads().catch(function (e) { $('#threads', body).innerHTML = '<div class="empty"><p>' + esc(A.errMsg(e)) + '</p></div>'; });
    timer = setInterval(function () { if (!document.body.contains(body)) { clearInterval(timer); return; } drawBubbles(); }, 8000);
  }

  /* ════════ SELLER DASHBOARD ════════ */
  A.route('seller', function (pg, r) {
    var sub = r.param || '';
    pg.setAttribute('data-title', 'Seller Dashboard');
    if (!DB.configured()) return notConfigured(pg, 'The seller dashboard');
    var u = A.state.user;
    if (!u) return gate(pg, 'Seller sign-in', 'Sign in with a Seller / Farmer or Company account to manage your storefront.', 'a seller');
    if (u.role === 'buyer') { pg.innerHTML = '<div class="wrap" style="padding:70px 0"><div class="empty glass" style="max-width:560px;margin:0 auto">' + ic('store') + '<h3>This is a buyer account</h3><p>To sell on AgricWorld, create a separate Seller or Company account with a different email, or contact support to upgrade this one.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px"><a href="#/sell" class="btn btn-p">' + ic('rocket') + ' How selling works</a><a href="#/contact" class="btn btn-ghost">' + ic('headset') + ' Contact support</a></div></div></div>'; return; }
    DB.myCompany().then(function (co) {
      if (!co) return onboarding(pg, u);
      var s = D.secMap[co.sector] || D.sectors[0];
      var body = shell(pg, { base: 'seller', sub: sub, user: u, roleLabel: co.name, avatarStyle: 'background:linear-gradient(135deg,' + s.color + ',' + s.light + ')', nav: [['', 'layout-dashboard', 'Overview'], ['products', 'package', 'Products'], ['add', 'plus', 'Add product'], ['orders', 'clipboard-list', 'Orders'], ['messages', 'message-square', 'Messages'], ['reviews', 'star', 'Reviews'], ['analytics', 'chart-line', 'Analytics'], ['profile', 'building-2', 'Business profile'], ['verification', 'badge-check', 'Verification'], ['storefront', 'external-link', 'View storefront']] });
      if (sub === 'storefront') { A.go('#/company/' + co.id); return; }
      var views = {
        '': function () {
          return Promise.all([DB.sellerStats(co.id), DB.sellerOrders(co.id)]).then(function (res) {
            var st = res[0] || {}, items = res[1] || []; var m = monthly(st.monthly);
            var orders = {}; items.forEach(function (it) { if (it.orders) orders[it.order_id] = orders[it.order_id] || { o: it.orders, items: [] }; if (orders[it.order_id]) orders[it.order_id].items.push(it); });
            var list = Object.keys(orders).map(function (k) { return orders[k]; }).sort(function (a, b) { return (b.o.created_at || '').localeCompare(a.o.created_at || ''); });
            return '<div class="dash-top"><div><h1>' + esc(co.name) + ' ' + (co.ver ? '<span class="ver" style="font-size:.9rem">' + ic('badge-check') + ' Verified</span>' : '') + '</h1><p>' + s.name + ' · ' + esc(co.loc) + '</p></div><div style="display:flex;gap:10px"><a href="#/seller/add" class="btn btn-p btn-sm">' + ic('plus') + ' Add product</a><a href="#/company/' + co.id + '" class="btn btn-ghost btn-sm">' + ic('external-link') + ' Storefront</a></div></div>' +
              (!co.ver ? '<div class="note warn" style="margin-bottom:18px">' + ic('badge-check') + ' Your business is not verified yet. <a href="#/seller/verification" class="link">Submit your documents</a> to earn the verified badge buyers look for.</div>' : '') +
              '<div class="kpis">' + kpi('Revenue (paid orders)', +st.revenue || 0, 'banknote', '#10b981', '₦') + kpi('Orders', +st.orders || 0, 'clipboard-list', '#0284c7') + kpi('Active products', +st.products || 0, 'package', '#f5b820') + kpi('Followers', +st.followers || 0, 'users', '#7c3aed') + '</div>' +
              '<div class="dgrid">' + panel('Monthly revenue', lineChart([{ name: 'Revenue', data: m.data, color: s.color }], { labels: m.labels }), '<small>Paid orders, last 9 months</small>') + panel('Reputation', '<div class="plist">' + [['Average rating', st.reviews ? (+st.rating).toFixed(1) + ' ★ from ' + st.reviews + ' review' + (st.reviews == 1 ? '' : 's') : 'No reviews yet'], ['Customers', String(st.customers || 0)], ['Orders awaiting action', String(st.pending || 0)], ['Verification', co.ver ? 'Verified' : 'Not yet verified']].map(function (x) { return '<div class="row"><b>' + x[0] + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>') + '</div>' +
              panel('Recent orders', list.length ? sellerOrdersTable(list.slice(0, 6)) : empty('clipboard-list', 'No orders yet', 'Orders and order requests from buyers will appear here.'), '<a href="#/seller/orders" class="link">All orders ' + ic('arrow-right') + '</a>');
          });
        },
        products: function () {
          return DB.myProducts(co.id).then(function (ps) {
            return '<div class="dash-top"><div><h1>Products</h1><p>' + ps.length + ' listing' + (ps.length === 1 ? '' : 's') + '</p></div><a href="#/seller/add" class="btn btn-p btn-sm">' + ic('plus') + ' Add product</a></div>' + panel('Your listings', ps.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Min. order</th><th>Status</th><th></th></tr></thead><tbody>' + ps.map(function (p, i) { return '<tr style="--i:' + i + '"><td><div class="pt"><img src="' + esc(p.img || IMG + 'bg-farm-1.jpg') + '" alt=""><div><b>' + esc(p.name) + '</b><small>' + (D.secMap[p.sec] || {}).name + '</small></div></div></td><td><b>' + money(p.price) + '</b><small style="color:var(--text-3)">' + esc(p.unit) + '</small></td><td>' + (p.qty === null || p.qty === undefined ? '<span class="pill ok">Available</span>' : p.qty <= 0 ? '<span class="pill bad">Out</span>' : '<b>' + p.qty + '</b>') + '</td><td>' + p.moq + '</td><td>' + (p.active ? '<span class="pill ok">Live</span>' : '<span class="pill pend">Hidden</span>') + '</td><td><div style="display:flex;gap:6px;justify-content:flex-end"><a href="#/seller/add?id=' + p.id + '" class="btn btn-xs btn-ghost">' + ic('pencil') + ' Edit</a><button class="btn btn-xs btn-ghost" data-toggle="' + p.id + '">' + (p.active ? 'Hide' : 'Show') + '</button><button class="btn btn-xs btn-danger" data-del="' + p.id + '">' + ic('trash-2') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div>' : empty('package', 'No products yet', 'Add your first listing — it goes live immediately.', '<a href="#/seller/add" class="btn btn-p btn-sm" style="margin-top:12px">Add product</a>'));
          });
        },
        add: function () {
          var id = +r.q.id || 0;
          var p0 = id ? DB.myProducts(co.id).then(function (ps) { return ps.find(function (p) { return p.id === id; }); }) : Promise.resolve(null);
          return p0.then(function (p) {
            p = p || { sec: co.sector, name: '', price: '', unit: '/kg', old: '', img: '', gal: [], tag: '', qty: '', moq: 1, delivery: '', desc: '', specs: {}, active: true };
            var specs = Object.keys(p.specs || {}).map(function (k) { return k + ': ' + p.specs[k]; }).join('\n');
            return '<div class="dash-top"><div><h1>' + (id ? 'Edit product' : 'Add product') + '</h1><p>Clear photos and honest details sell faster.</p></div></div>' + panel(id ? esc(p.name) : 'New listing', '<form class="form" id="prodForm" novalidate>' +
              '<div class="fld full"><label>Product photos</label><div class="upload" id="upBox">' + ic('image') + '<div style="margin-top:8px"><b>Click to upload</b> or drag photos here</div><small>JPG/PNG, up to 5 MB each. First photo is the cover.</small><input type="file" id="upInput" accept="image/*" multiple class="sr"></div><div class="gal-edit" id="galEdit"></div></div>' +
              '<div class="fld full"><label>Product name</label><input name="name" required value="' + esc(p.name) + '" placeholder="e.g. Day-Old Broiler Chicks (Cobb 500)"></div>' +
              '<div class="fld"><label>Sector</label><select name="sec" onchange="AW.fillSubs(this)">' + D.sectors.map(function (s) { return '<option value="' + s.id + '" ' + (s.id === p.sec ? 'selected' : '') + '>' + s.name + '</option>'; }).join('') + '</select></div>' +
              '<div class="fld"><label>Sub-category</label><select name="sub">' + (D.secMap[p.sec] || D.sectors[0]).subs.map(function (x) { return '<option value="' + esc(x) + '" ' + (x === p.sub ? 'selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
              '<div class="fld"><label>Label (optional)</label><select name="tag"><option value="">None</option>' + [['new', 'New'], ['hot', 'Bestseller'], ['sale', 'Sale'], ['premium', 'Premium']].map(function (t) { return '<option value="' + t[0] + '" ' + (p.tag === t[0] ? 'selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' +
              '<div class="fld"><label>Price (₦)</label><input name="price" type="number" min="0" step="0.01" required value="' + (p.price || '') + '"></div>' +
              '<div class="fld"><label>Unit</label><input name="unit" value="' + esc(p.unit) + '" placeholder="/kg · /bag · /chick · /ton"></div>' +
              '<div class="fld"><label>Old price (₦, optional)</label><input name="old" type="number" min="0" step="0.01" value="' + (p.old || '') + '"></div>' +
              '<div class="fld"><label>Minimum order</label><input name="moq" type="number" min="1" value="' + (p.moq || 1) + '"></div>' +
              '<div class="fld"><label>Stock quantity (blank = always available)</label><input name="qty" type="number" min="0" value="' + (p.qty === null || p.qty === undefined ? '' : p.qty) + '"></div>' +
              '<div class="fld"><label>Delivery</label><input name="delivery" value="' + esc(p.delivery) + '" placeholder="e.g. 2–4 days nationwide · pickup in Ibadan"></div>' +
              '<div class="fld full"><label>Description</label><textarea name="desc" required placeholder="What it is, grade/breed, packaging, what buyers should know">' + esc(p.desc) + '</textarea></div>' +
              '<div class="fld full"><label>Specifications (one per line, “Name: value”)</label><textarea name="specs" placeholder="Breed: Cobb 500\nVaccination: Marek\'s + NDV">' + esc(specs) + '</textarea></div>' +
              '<div class="fld full"><label class="f-opt" style="border:0;padding:0"><input type="checkbox" name="active" ' + (p.active !== false ? 'checked' : '') + '> Visible in the marketplace</label></div>' +
              '<div class="auth-err full" id="prodErr"></div><div class="full" style="display:flex;gap:10px"><button class="btn btn-p" id="prodSave">' + ic('check') + ' ' + (id ? 'Save changes' : 'Publish listing') + '</button><a href="#/seller/products" class="btn btn-ghost">Cancel</a></div></form>', null, 'prod-panel');
          }).then(function (html) { return { html: html, id: id }; });
        },
        orders: function () {
          return DB.sellerOrders(co.id).then(function (items) {
            var orders = {}; items.forEach(function (it) { if (!it.orders) return; orders[it.order_id] = orders[it.order_id] || { o: it.orders, items: [] }; orders[it.order_id].items.push(it); });
            var list = Object.keys(orders).map(function (k) { return orders[k]; }).sort(function (a, b) { return (b.o.created_at || '').localeCompare(a.o.created_at || ''); });
            var counts = {}; list.forEach(function (x) { counts[x.o.status] = (counts[x.o.status] || 0) + 1; });
            return '<div class="dash-top"><div><h1>Orders</h1><p>' + list.length + ' total</p></div></div><div class="kpis">' + kpi('Requested', counts.requested || 0, 'hand-coins', '#f5b820') + kpi('Paid', counts.paid || 0, 'credit-card', '#10b981') + kpi('Shipped', counts.shipped || 0, 'truck', '#38bdf8') + kpi('Delivered', counts.delivered || 0, 'package-check', '#34d399') + '</div>' + panel('All orders', list.length ? sellerOrdersTable(list, true) : empty('clipboard-list', 'No orders yet'));
          });
        },
        messages: function () { return Promise.resolve('<div class="dash-top"><div><h1>Messages</h1><p>Buyers who contacted ' + esc(co.name) + '</p></div></div>' + chatShell()); },
        reviews: function () {
          return DB.myProducts(co.id).then(function (ps) { var ids = ps.map(function (p) { return p.id; }); if (!ids.length) return []; return Promise.all(ids.map(function (id) { return DB.reviews(id).then(function (rs) { return rs.map(function (x) { x.product = ps.find(function (p) { return p.id === id; }); return x; }); }); })).then(function (arrs) { return [].concat.apply([], arrs).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); }); }); }).then(function (rs) {
            var avg = rs.length ? rs.reduce(function (a, x) { return a + x.rating; }, 0) / rs.length : 0;
            return '<div class="dash-top"><div><h1>Reviews</h1><p>' + (rs.length ? avg.toFixed(1) + ' ★ average from ' + rs.length + ' review' + (rs.length === 1 ? '' : 's') : 'No reviews yet') + '</p></div></div>' + panel('What buyers say', rs.length ? rs.map(function (x) { return '<div class="review"><span class="av" style="background:linear-gradient(135deg,' + s.color + ',' + s.light + ')">' + A.initials(x.name || 'U') + '</span><div><b>' + esc(x.name) + '</b> <small style="color:var(--text-3)">on ' + esc(x.product ? x.product.name : '') + ' · ' + fmtDate(x.created_at) + '</small>' + A.stars(x.rating) + '<p>' + esc(x.body) + '</p></div></div>'; }).join('') : empty('star', 'No reviews yet', 'Reviews from verified buyers appear here.'));
          });
        },
        analytics: function () {
          return Promise.all([DB.sellerStats(co.id), DB.sellerOrders(co.id)]).then(function (res) {
            var st = res[0] || {}, items = res[1] || []; var m = monthly(st.monthly);
            var byP = {}; items.forEach(function (it) { if (!it.orders || ['paid', 'processing', 'shipped', 'delivered'].indexOf(it.orders.status) < 0) return; byP[it.name] = (byP[it.name] || 0) + it.price * it.qty; });
            var top = Object.keys(byP).map(function (k) { return [k, byP[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
            var byState = {}; items.forEach(function (it) { if (!it.orders) return; byState[it.orders.state || '—'] = (byState[it.orders.state || '—'] || 0) + 1; });
            var states = Object.keys(byState).map(function (k) { return [k, byState[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
            return '<div class="dash-top"><div><h1>Analytics</h1><p>Based on your real orders</p></div></div><div class="kpis">' + kpi('Revenue', +st.revenue || 0, 'banknote', '#10b981', '₦') + kpi('Orders', +st.orders || 0, 'clipboard-list', '#0284c7') + kpi('Customers', +st.customers || 0, 'users', '#f5b820') + kpi('Avg. rating', +st.rating || 0, 'star', '#7c3aed', '', '', 1) + '</div><div class="dgrid eq">' + panel('Revenue by month', lineChart([{ name: 'Revenue', data: m.data, color: s.color }], { labels: m.labels })) + panel('Top products (paid)', top.length ? '<div class="plist">' + top.map(function (t) { return '<div class="prog-wrap"><div class="row"><b>' + esc(t[0]) + '</b><span>' + money(t[1]) + '</span></div><div class="prog" style="--c:' + s.color + '"><i data-w="' + Math.round(t[1] / top[0][1] * 100) + '"></i></div></div>'; }).join('') + '</div>' : empty('chart-column', 'No paid orders yet')) + '</div>' + panel('Orders by state', barChart([{ name: 'Orders', data: states.map(function (x) { return x[1]; }), color: s.color }], { labels: states.map(function (x) { return x[0]; }) }));
          });
        },
        profile: function () { return Promise.resolve('<div class="dash-top"><div><h1>Business profile</h1><p>This is what buyers see on your storefront</p></div></div>' + panel(esc(co.name), companyForm(co))); },
        verification: function () { return A.VER.sellerView(co); },
        verification_legacy: function () {
          return DB.myVerification(co.id).then(function (v) {
            return '<div class="dash-top"><div><h1>Verification</h1><p>Earn the badge buyers trust</p></div></div><div class="dgrid eq">' + panel('Status', co.ver ? '<div class="note ok">' + ic('badge-check') + ' <b>' + esc(co.name) + ' is verified.</b> The badge shows on your storefront and every listing.</div>' : v ? '<div class="note ' + (v.status === 'rejected' ? 'warn' : '') + '">' + ic(v.status === 'rejected' ? 'circle-alert' : 'clock') + ' <b>' + (v.status === 'pending' ? 'Under review' : v.status === 'rejected' ? 'Not approved' : v.status) + '</b> — submitted ' + fmtDate(v.created_at) + (v.admin_note ? '<br>Note from AgricWorld: ' + esc(v.admin_note) : '') + '</div>' : '<p style="color:var(--text-3)">Not submitted yet. Verified businesses appear with a badge and rank higher in the directory.</p>') +
              (co.ver || (v && v.status === 'pending') ? '' : panel('Submit documents', '<form class="form" id="verForm" novalidate><div class="fld full"><label>CAC / business registration number (or NIN for individuals)</label><input name="reg" required placeholder="RC 1234567"></div><div class="fld full"><label>Upload documents (certificate, ID, farm photos)</label><div class="upload" id="verUp">' + ic('upload') + '<div style="margin-top:8px"><b>Click to upload</b></div><small>Images or PDF, up to 5 MB each</small><input type="file" id="verInput" accept="image/*,.pdf" multiple class="sr"></div><div id="verFiles" style="font-size:.82rem;color:var(--text-3);margin-top:8px"></div></div><div class="fld full"><label>Anything we should know</label><textarea name="note"></textarea></div><div class="auth-err full" id="verErr"></div><div class="full"><button class="btn btn-p">' + ic('send') + ' Submit for review</button></div></form>')) + '</div>';
          });
        }
      };
      function sellerOrdersTable(list, actions) {
        return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Your total</th><th>Status</th><th>Date</th>' + (actions ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map(function (x, i) { var o = x.o, mine = x.items.reduce(function (a, it) { return a + it.price * it.qty; }, 0); return '<tr style="--i:' + i + '"><td><b>' + esc(o.ref) + '</b><br><small style="color:var(--text-3)">' + (o.method === 'paystack' ? 'Paystack' : 'Direct payment') + '</small></td><td><b>' + esc(o.buyer_name) + '</b><br><small><a href="tel:' + esc(o.buyer_phone) + '">' + esc(o.buyer_phone) + '</a> · ' + esc(o.state) + '</small>' + (actions ? '<br><small style="color:var(--text-3)">' + esc(o.address) + (o.notes ? ' · “' + esc(o.notes) + '”' : '') + '</small>' : '') + '</td><td>' + orderItemsHtml(x.items) + '</td><td><b>' + money(mine) + '</b></td><td>' + pill(o.status) + '</td><td style="color:var(--text-3)">' + fmtDate(o.created_at) + '</td>' + (actions ? '<td><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + nextActions(o) + (o.buyer_phone ? '<a class="btn btn-xs btn-ghost" target="_blank" rel="noopener" href="' + A.waLink(o.buyer_phone, 'Hello ' + o.buyer_name + ', this is ' + co.name + ' about your AgricWorld order ' + o.ref) + '">' + ic('smartphone') + '</a>' : '') + '</div></td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
      }
      function nextActions(o) {
        var b = function (st, label, cls) { return '<button class="btn btn-xs ' + (cls || 'btn-p') + '" data-status="' + st + '" data-id="' + o.id + '">' + label + '</button>'; };
        if (o.status === 'requested') return b('processing', 'Accept') + b('cancelled', 'Decline', 'btn-ghost');
        if (o.status === 'paid') return b('processing', 'Start processing');
        if (o.status === 'processing') return b('shipped', 'Mark shipped');
        if (o.status === 'shipped') return b('delivered', 'Mark delivered');
        if (o.status === 'pending_payment') return '<small style="color:var(--text-3)">Waiting for buyer</small>';
        return '';
      }
      var vfn = views[sub] || views[''];
      vfn().then(function (res) {
        var html = typeof res === 'string' ? res : res.html;
        body.innerHTML = withAI(html, 'seller', sub); A.observe(body);
        if (sub === 'messages') initChat(body, { asSeller: co.id });
        if (sub === 'profile') bindCompanyForm(body, co, function () { A.render(); });
        if (sub === 'add') bindProductForm(body, co, res.id);
        if (sub === 'verification') A.VER.bindSeller(body, co);
        body.addEventListener('click', function (e) {
          var t = e.target.closest('[data-status]'); if (t) { t.disabled = true; DB.setOrderStatus(+t.getAttribute('data-id'), t.getAttribute('data-status')).then(function () { A.toast('Order updated', 'check'); A.render(); }).catch(function (er) { t.disabled = false; A.toast(A.errMsg(er), 'circle-alert', 'err'); }); }
          var d = e.target.closest('[data-del]'); if (d && confirm('Delete this product permanently?')) { DB.deleteProduct(+d.getAttribute('data-del')).then(function () { A.toast('Product deleted', 'trash-2', 'warn'); return DB.loadCatalogue(); }).then(function () { A.render(); }).catch(function (er) { A.toast(A.errMsg(er), 'circle-alert', 'err'); }); }
          var tg = e.target.closest('[data-toggle]'); if (tg) { var pid = +tg.getAttribute('data-toggle'); DB.myProducts(co.id).then(function (ps) { var p = ps.find(function (x) { return x.id === pid; }); p.active = !p.active; return DB.saveProduct(p); }).then(function () { return DB.loadCatalogue(); }).then(function () { A.toast('Listing updated', 'check'); A.render(); }).catch(function (er) { A.toast(A.errMsg(er), 'circle-alert', 'err'); }); }
        });
      }).catch(function (e) { fail(body, e); });
    }).catch(function (e) { pg.innerHTML = '<div class="wrap" style="padding:60px 0"><div class="empty glass"><h3>Could not load your seller account</h3><p>' + esc(A.errMsg(e)) + '</p></div></div>'; });
  });

  function onboarding(pg, u) {
    pg.innerHTML = '<div class="p-hero compact"><img class="bg" src="' + IMG + 'hero-market.jpg" alt=""><div class="wrap"><h1>Set up your <em>storefront</em></h1><p>Tell buyers who you are. You can edit everything later.</p></div></div><section><div class="wrap" style="max-width:860px"><div class="card">' + companyForm({ name: '', sector: 'crops', loc: '', desc: '', year: '', staff: '', products: [], services: [], cover: '', phone: u.phone || '', email: u.email, whatsapp: '' }, true) + '</div></div></section>';
    bindCompanyForm(pg, null, function () { A.toast('Storefront created — add your first product', 'sparkles'); A.go('#/seller/add'); });
  }
  function companyForm(co, isNew) {
    return '<form class="form" id="coForm" novalidate><div class="fld full"><label>Cover photo</label><div class="upload" id="coverUp">' + (co.cover ? '<img src="' + esc(co.cover) + '" alt="" style="max-height:160px;margin:0 auto 10px;border-radius:12px">' : ic('image')) + '<div style="margin-top:8px"><b>Click to upload</b> a wide photo of your farm or business</div><input type="file" id="coverInput" accept="image/*" class="sr"><input type="hidden" name="cover" value="' + esc(co.cover) + '"></div></div>' +
      '<div class="fld"><label>Business name</label><input name="name" required value="' + esc(co.name) + '" placeholder="Sunrise Hatchery"></div><div class="fld"><label>Main sector</label><select name="sector">' + D.sectors.map(function (s) { return '<option value="' + s.id + '" ' + (s.id === co.sector ? 'selected' : '') + '>' + s.name + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Location (town, state)</label><input name="loc" required value="' + esc(co.loc) + '" placeholder="Ibadan, Oyo"></div><div class="fld"><label>Year established (optional)</label><input name="year" type="number" min="1900" max="2100" value="' + esc(co.year) + '"></div>' +
      '<div class="fld"><label>Phone</label><input name="phone" type="tel" required value="' + esc(co.phone) + '" placeholder="+234 803 000 0000"></div><div class="fld"><label>WhatsApp number (digits, e.g. 2348030000000)</label><input name="whatsapp" value="' + esc(co.whatsapp) + '" placeholder="2348030000000"></div>' +
      '<div class="fld"><label>Business email</label><input name="email" type="email" value="' + esc(co.email) + '"></div><div class="fld"><label>Team size (optional)</label><input name="staff" value="' + esc(co.staff) + '" placeholder="1-10"></div>' +
      '<div class="fld"><label>Country</label><input name="country" value="' + esc(co.country || 'Nigeria') + '" placeholder="Nigeria"></div><div class="fld"><label>State / region</label><input name="state" value="' + esc(co.state || '') + '" placeholder="Oyo"></div>' +
      '<div class="fld"><label>City / town</label><input name="city" value="' + esc(co.city || '') + '" placeholder="Ibadan"></div><div class="fld"><label>Business type</label><select name="btype">' + ['', 'Farm', 'Cooperative', 'Agro-dealer / Input shop', 'Wholesaler / Aggregator', 'Processor', 'Manufacturer', 'Importer / Exporter', 'Service provider', 'Professional (vet, agronomist, consultant)', 'Logistics', 'Research / Training institution', 'AgTech company'].map(function (t) { return '<option value="' + t + '" ' + ((co.btype || '') === t ? 'selected' : '') + '>' + (t || 'Select…') + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld full"><label>Logo (optional, square)</label><div class="upload upload-sm" id="logoUp">' + (co.logo ? '<img src="' + esc(co.logo) + '" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:16px;margin:0 auto 8px">' : ic('image')) + '<div><b>Upload logo</b> <small>PNG or JPG, up to 2 MB</small></div><input type="file" id="logoInput" accept="image/*" class="sr"><input type="hidden" name="logo" value="' + esc(co.logo || '') + '"></div></div>' +
      '<div class="fld"><label>Website (optional)</label><input name="website" type="url" value="' + esc(co.website || '') + '" placeholder="https://"></div><div class="fld"><label>Facebook (optional)</label><input name="s_facebook" value="' + esc((co.socials || {}).facebook || '') + '" placeholder="https://facebook.com/yourpage"></div>' +
      '<div class="fld"><label>Instagram (optional)</label><input name="s_instagram" value="' + esc((co.socials || {}).instagram || '') + '" placeholder="https://instagram.com/yourpage"></div><div class="fld"><label>LinkedIn (optional)</label><input name="s_linkedin" value="' + esc((co.socials || {}).linkedin || '') + '" placeholder="https://linkedin.com/company/…"></div>' +
      '<div class="fld"><label>X / Twitter (optional)</label><input name="s_x" value="' + esc((co.socials || {}).x || '') + '" placeholder="https://x.com/…"></div><div class="fld"><label>YouTube or TikTok (optional)</label><input name="s_youtube" value="' + esc((co.socials || {}).youtube || '') + '" placeholder="https://youtube.com/@…"></div>' +
      '<div class="fld full"><label>About your business</label><textarea name="desc" required placeholder="What you produce or sell, where you deliver, what makes you reliable">' + esc(co.desc) + '</textarea></div>' +
      '<div class="fld"><label>Product lines (comma separated)</label><input name="products" value="' + esc((co.products || []).join(', ')) + '" placeholder="Day-old chicks, Point-of-lay"></div><div class="fld"><label>Services (comma separated)</label><input name="services" value="' + esc((co.services || []).join(', ')) + '" placeholder="Delivery, Farm setup"></div>' +
      '<div class="auth-err full" id="coErr"></div><div class="full"><button class="btn btn-p">' + ic('check') + ' ' + (isNew ? 'Create storefront' : 'Save profile') + '</button></div></form>';
  }
  function bindUpload(box, input, onFile) {
    if (!box || !input) return;
    box.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
    box.addEventListener('dragover', function (e) { e.preventDefault(); box.classList.add('drag'); }); box.addEventListener('dragleave', function () { box.classList.remove('drag'); });
    box.addEventListener('drop', function (e) { e.preventDefault(); box.classList.remove('drag'); Array.prototype.forEach.call(e.dataTransfer.files, onFile); });
    input.addEventListener('change', function () { Array.prototype.forEach.call(input.files, onFile); input.value = ''; });
  }
  function bindCompanyForm(root, co, done) {
    var f = $('#coForm', root);
    bindUpload($('#logoUp', root), $('#logoInput', root), function (file) { if (file.size > 2 * 1024 * 1024) return A.toast('Logo too large (max 2 MB)', 'circle-alert', 'err'); A.toast('Uploading logo…', 'upload'); DB.uploadImage(file, 'logos').then(function (url) { f.logo.value = url; var im = $('#logoUp img', root); if (!im) { im = document.createElement('img'); im.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:16px;margin:0 auto 8px'; $('#logoUp', root).prepend(im); } im.src = url; A.toast('Logo uploaded', 'check'); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); });
    bindUpload($('#coverUp', root), $('#coverInput', root), function (file) { A.toast('Uploading cover…', 'upload'); DB.uploadImage(file, 'covers').then(function (url) { f.cover.value = url; var im = $('#coverUp img', root); if (!im) { im = document.createElement('img'); im.style.cssText = 'max-height:160px;margin:0 auto 10px;border-radius:12px'; $('#coverUp', root).prepend(im); } im.src = url; A.toast('Cover uploaded', 'check'); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var err = $('#coErr', root); err.textContent = '';
      var v = { id: co ? co.id : null, name: f.name.value.trim(), sector: f.sector.value, loc: f.loc.value.trim(), year: f.year.value, phone: f.phone.value.trim(), whatsapp: f.whatsapp.value.replace(/\D/g, ''), email: f.email.value.trim(), staff: f.staff.value.trim(), desc: f.desc.value.trim(), cover: f.cover.value || (co && co.cover) || (D.secMap[f.sector.value] || {}).img || '', products: f.products.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), services: f.services.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), logo: f.logo.value || (co && co.logo) || '', website: f.website.value.trim(), country: f.country.value.trim() || 'Nigeria', state: f.state.value.trim(), city: f.city.value.trim(), btype: f.btype.value, socials: {} };
      ['facebook', 'instagram', 'linkedin', 'x', 'youtube'].forEach(function (k) { var val = (f['s_' + k].value || '').trim(); if (val) v.socials[k] = /^https?:/i.test(val) ? val : 'https://' + val.replace(/^@/, ''); });
      if (v.website && !/^https?:/i.test(v.website)) v.website = 'https://' + v.website;
      if (v.name.length < 2) return err.textContent = 'Enter your business name'; if (v.loc.length < 2) return err.textContent = 'Enter your location'; if (v.phone.length < 7) return err.textContent = 'Enter a phone number'; if (v.desc.length < 20) return err.textContent = 'Describe your business in at least 20 characters';
      var b = f.querySelector('button[type=submit], button:not([type])'); b.disabled = true;
      DB.saveCompany(v).then(function () { return DB.loadCatalogue(); }).then(function () { A.toast('Profile saved', 'check'); done(); }).catch(function (er) { b.disabled = false; err.textContent = A.errMsg(er); });
    });
  }
  function bindProductForm(root, co, id) {
    var f = $('#prodForm', root); if (!f) return;
    var gal = [];
    var existing = id ? DB.myProducts(co.id).then(function (ps) { var p = ps.find(function (x) { return x.id === id; }); gal = p ? p.gal.slice() : []; drawGal(); }) : Promise.resolve();
    function drawGal() { $('#galEdit', root).innerHTML = gal.map(function (g, i) { return '<div class="g"><img src="' + esc(g) + '" alt="">' + (i ? '' : '<span class="cover">Cover</span>') + '<button type="button" data-rm="' + i + '" aria-label="Remove">' + ic('x') + '</button></div>'; }).join(''); $$('#galEdit [data-rm]', root).forEach(function (b) { b.addEventListener('click', function () { gal.splice(+b.getAttribute('data-rm'), 1); drawGal(); }); }); }
    bindUpload($('#upBox', root), $('#upInput', root), function (file) { A.toast('Uploading ' + file.name + '…', 'upload'); DB.uploadImage(file, 'products').then(function (url) { gal.push(url); drawGal(); A.toast('Photo added', 'check'); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var err = $('#prodErr', root); err.textContent = '';
      var specs = {}; f.specs.value.split('\n').forEach(function (l) { var i = l.indexOf(':'); if (i > 0) specs[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
      var v = { id: id || null, co: co.id, sec: f.sec.value, sub: f.sub.value, name: f.name.value.trim(), price: f.price.value, unit: f.unit.value.trim(), old: f.old.value, tag: f.tag.value, qty: f.qty.value, moq: f.moq.value, delivery: f.delivery.value.trim(), desc: f.desc.value.trim(), specs: specs, active: f.active.checked, gal: gal, img: gal[0] || '' };
      if (v.name.length < 3) return err.textContent = 'Enter a product name'; if (!(+v.price > 0)) return err.textContent = 'Enter a price'; if (v.desc.length < 20) return err.textContent = 'Describe the product in at least 20 characters'; if (!gal.length) return err.textContent = 'Add at least one photo';
      var b = $('#prodSave', root); b.disabled = true; b.innerHTML = ic('refresh-cw') + ' Saving…';
      DB.saveProduct(v).then(function () { return DB.loadCatalogue(); }).then(function () { A.toast(id ? 'Product updated' : 'Listing published', 'check'); A.go('#/seller/products'); }).catch(function (er) { b.disabled = false; b.innerHTML = ic('check') + ' Save'; err.textContent = A.errMsg(er); });
    });
    existing.catch(function () { });
  }
  A.fillSubs = function (sel) { var s = D.secMap[sel.value]; var out = sel.form && sel.form.sub; if (!s || !out) return; out.innerHTML = s.subs.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join(''); };
  function bindVerification(root, co) {
    var f = $('#verForm', root); if (!f) return; var docs = [];
    bindUpload($('#verUp', root), $('#verInput', root), function (file) { if (file.size > 5 * 1024 * 1024) return A.toast('File too large (max 5 MB)', 'circle-alert', 'err'); A.toast('Uploading…', 'upload'); var up = /^image\//.test(file.type) ? DB.uploadImage(file, 'verification') : DB.uploadImage(new File([file], file.name, { type: 'image/pdf' }), 'verification'); up.then(function (url) { docs.push(url); $('#verFiles', root).innerHTML = docs.map(function (d, i) { return '<div>' + ic('file-text') + ' Document ' + (i + 1) + '</div>'; }).join(''); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var err = $('#verErr', root); err.textContent = '';
      if (f.reg.value.trim().length < 4) return err.textContent = 'Enter your registration or ID number'; if (!docs.length) return err.textContent = 'Upload at least one document';
      DB.requestVerification({ company_id: co.id, reg_number: f.reg.value.trim(), docs: docs, note: f.note.value.trim() }).then(function () { A.toast('Submitted — we review within 2 business days', 'badge-check'); A.render(); }).catch(function (er) { err.textContent = A.errMsg(er); });
    });
  }


  /* ── Public read-only preview of the admin console ──
     Anyone can look; nothing here can be changed and no private data
     (accounts, orders, inbox) is shown. Only the owner login unlocks actions. */
  function adminPreview(pg, sub) {
    var NAV = [['', 'layout-dashboard', 'Overview'], ['companies', 'building-2', 'Companies'], ['products', 'package', 'Products'], ['orders', 'receipt-text', 'Orders'], ['verification', 'badge-check', 'Verification'], ['tiers', 'award', 'Verification tiers'], ['verpayments', 'credit-card', 'Verification payments'], ['users', 'users', 'Users'], ['reviews', 'star', 'Reviews'], ['inbox', 'mail', 'Contact inbox'], ['subscribers', 'send', 'Subscribers']];
    var LOCKED = { orders: 'Orders, buyer details and payment references', verification: 'Verification applications and uploaded documents', verpayments: 'Verification payments', users: 'User accounts and roles', reviews: 'Review moderation', inbox: 'Contact messages', subscribers: 'Newsletter subscribers' };
    var body = shell(pg, { base: 'admin', sub: sub, user: { name: 'Read-only preview', email: '' }, cls: 'admin', roleLabel: 'Owner sign-in required to manage', avatarStyle: 'background:linear-gradient(135deg,#334155,#64748b)', nav: NAV, guest: true });
    var banner = '<div class="note warn" style="margin-bottom:18px">' + ic('eye') + '<div><b>Read-only preview.</b> You are viewing public catalogue figures only. Accounts, orders, payments and messages stay private, and no action here can change anything. ' + (A.state.user ? '' : '<button class="btn btn-xs btn-ghost" style="margin-left:6px" onclick="AW.openAuth(\'login\')">' + ic('log-in') + ' Owner sign in</button>') + '</div></div>';
    var cos = D.companies, ps = D.products.filter(function (p) { return p.active !== false; });
    var html;
    if (LOCKED[sub]) {
      html = banner + '<div class="dash-top"><div><h1>' + NAV.filter(function (n) { return n[0] === sub; })[0][2] + '</h1><p>Private area</p></div></div>' + panel('Owner only', empty('lock', LOCKED[sub] + ' are private', 'This section becomes available when the platform owner signs in.', A.state.user ? '' : '<button class="btn btn-p btn-sm" style="margin-top:12px" onclick="AW.openAuth(\'login\')">' + ic('log-in') + ' Owner sign in</button>'));
    } else if (sub === 'tiers') {
      body.innerHTML = withAI(banner + '<div class="dash-top"><div><h1>Verification tiers</h1><p>Public tier configuration (read-only)</p></div></div>' + panel('Tiers', '<div class="skel" style="height:120px"></div>'), 'admin', ''); A.observe(body);
      A.VER.adminTiers(true).then(function (h) { body.innerHTML = withAI(banner + h, 'admin', ''); A.observe(body); });
      return;
    } else if (sub === 'companies') {
      html = banner + '<div class="dash-top"><div><h1>Companies</h1><p>' + cos.length + ' listed publicly</p></div></div>' + panel('All companies', cos.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Sector</th><th>Location</th><th>Products</th><th>Verified</th></tr></thead><tbody>' + cos.map(function (c, i) { return '<tr style="--i:' + i + '"><td><a href="#/company/' + c.id + '" class="link"><b>' + esc(c.name) + '</b></a></td><td>' + esc((D.secMap[c.sector] || {}).name || c.sector) + '</td><td>' + esc(c.loc) + '</td><td>' + ps.filter(function (p) { return p.co === c.id; }).length + '</td><td>' + (c.ver ? '<span class="pill ok">Verified</span>' : '<span class="pill pend">Not yet</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('building-2', 'No companies yet'));
    } else if (sub === 'products') {
      html = banner + '<div class="dash-top"><div><h1>Products</h1><p>' + ps.length + ' live listings</p></div></div>' + panel('Live listings', ps.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th></tr></thead><tbody>' + ps.slice(0, 200).map(function (p, i) { var c = D.coMap[p.co]; return '<tr style="--i:' + Math.min(i, 30) + '"><td><div class="pt"><img src="' + esc(p.img || IMG + 'bg-farm-1.jpg') + '" alt="" loading="lazy"><div><a href="#/product/' + p.id + '" class="link"><b>' + esc(p.name) + '</b></a><small>' + esc((D.secMap[p.sec] || {}).name || p.sec) + '</small></div></div></td><td>' + esc(c ? c.name : p.co) + '</td><td><b>' + money(p.price) + '</b>' + esc(p.unit || '') + '</td><td>' + (p.qty != null ? p.qty : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('package', 'No products yet'));
    } else {
      var bySec = D.sectors.map(function (s) { return { name: s.name, c: s.color, v: ps.filter(function (p) { return p.sec === s.id; }).length }; }).filter(function (x) { return x.v; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
      var verified = cos.filter(function (c) { return c.ver; }).length;
      html = banner + '<div class="dash-top"><div><h1>Platform overview</h1><p>Public catalogue figures' + (DB.isLive() ? ' — live from the database' : '') + '</p></div></div>' +
        '<div class="kpis">' + kpi('Companies', cos.length, 'building-2', '#f5b820') + kpi('Verified companies', verified, 'badge-check', '#34d399') + kpi('Live products', ps.length, 'package', '#38bdf8') + kpi('Sectors', D.sectors.length, 'layout-grid', '#a78bfa') + '</div>' +
        '<div class="dgrid">' + panel('Listings by sector', bySec.length ? barChart([{ data: bySec.map(function (x) { return x.v; }), color: '#34d399' }], { labels: bySec.map(function (x) { return x.name.split(' ')[0]; }) }) : empty('package', 'No listings yet')) +
        panel('Private to the owner', '<div class="plist">' + [['badge-check', 'Verification requests'], ['receipt-text', 'Orders & payments'], ['users', 'Users & roles'], ['mail', 'Contact inbox']].map(function (q) { return '<div class="it glass" style="display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;opacity:.75"><span class="ic" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(148,163,184,.15);color:#94a3b8">' + ic(q[0]) + '</span><b style="flex:1">' + q[1] + '</b>' + ic('lock') + '</div>'; }).join('') + '</div>') + '</div>';
    }
    body.innerHTML = withAI(html, 'admin', ''); A.observe(body);
  }

  /* ════════ ADMIN CONSOLE (owner only) ════════ */
  A.route('admin', function (pg, r) {
    var sub = r.param || '';
    pg.setAttribute('data-title', 'Admin Console');
    var u = A.state.user;
    if (!u || u.role !== 'admin') return adminPreview(pg, sub);
    if (!DB.configured()) return notConfigured(pg, 'The admin console');
    var body = shell(pg, { base: 'admin', sub: sub, user: u, cls: 'admin', roleLabel: 'Platform owner', avatarStyle: 'background:linear-gradient(135deg,#0f5132,#34d399)', nav: [['', 'layout-dashboard', 'Overview'], ['orders', 'receipt-text', 'Orders'], ['verification', 'badge-check', 'Verification'], ['tiers', 'award', 'Verification tiers'], ['verpayments', 'credit-card', 'Verification payments'], ['companies', 'building-2', 'Companies'], ['products', 'package', 'Products'], ['users', 'users', 'Users'], ['reviews', 'star', 'Reviews'], ['inbox', 'mail', 'Contact inbox'], ['subscribers', 'send', 'Subscribers']] });
    var AD = DB.admin;
    var views = {
      '': function () {
        return DB.adminStats().then(function (st) {
          var m = monthly(st.monthly);
          return '<div class="dash-top"><div><h1>Platform overview</h1><p>Live figures from the database</p></div></div>' +
            '<div class="kpis">' + kpi('Users', st.users, 'users', '#38bdf8') + kpi('Companies', st.companies, 'building-2', '#f5b820') + kpi('Active products', st.products, 'package', '#34d399') + kpi('Paid GMV', +st.gmv || 0, 'banknote', '#a78bfa', '₦') + '</div>' +
            '<div class="kpis">' + kpi('Orders (all)', st.orders, 'receipt-text', '#0284c7') + kpi('Paid orders', st.paid_orders, 'credit-card', '#10b981') + kpi('Pending verifications', st.pending_ver, 'badge-check', '#f97316') + kpi('Unread contact messages', st.open_contact, 'mail', '#e11d48') + '</div>' +
            '<div class="dgrid">' + panel('Paid GMV by month', lineChart([{ name: 'GMV', data: m.data, color: '#34d399' }], { labels: m.labels })) + panel('Quick actions', '<div class="plist">' + [['#/admin/verification', 'badge-check', 'Review verification requests', st.pending_ver], ['#/admin/inbox', 'mail', 'Answer contact messages', st.open_contact], ['#/admin/orders', 'receipt-text', 'Check recent orders', st.orders], ['#/admin/users', 'users', 'Manage users & roles', st.users]].map(function (q) { return '<a href="' + q[0] + '" class="it glass" style="display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px"><span class="ic" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(52,211,153,.15);color:#34d399">' + ic(q[1]) + '</span><b style="flex:1">' + q[2] + '</b><span class="pill info">' + q[3] + '</span></a>'; }).join('') + '</div>') + '</div>';
        });
      },
      orders: function () { return AD.orders().then(function (list) { return '<div class="dash-top"><div><h1>Orders</h1><p>' + list.length + ' most recent</p></div></div>' + panel('All orders', list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>' + list.map(function (o, i) { return '<tr style="--i:' + i + '"><td><b>' + esc(o.ref) + '</b>' + (o.paystack_ref ? '<br><small style="color:var(--text-3)">' + esc(o.paystack_ref) + '</small>' : '') + '</td><td><b>' + esc(o.buyer_name) + '</b><br><small>' + esc(o.buyer_email) + ' · ' + esc(o.buyer_phone) + '</small></td><td>' + orderItemsHtml(o.order_items) + '</td><td><b>' + money(o.total) + '</b></td><td>' + (o.method === 'paystack' ? 'Paystack' : 'Direct') + '</td><td>' + pill(o.status) + '</td><td style="color:var(--text-3)">' + fmtDate(o.created_at) + '</td><td><select class="select" data-order="' + o.id + '" style="height:34px;font-size:.8rem">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '" ' + (k === o.status ? 'selected' : '') + (k === 'paid' && o.status !== 'paid' ? ' disabled' : '') + '>' + STATUS[k][1] + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div>' : empty('receipt-text', 'No orders yet')); }); },
      verification: function () { return A.VER.adminQueue(); },
      tiers: function () { return A.VER.adminTiers(); },
      verpayments: function () { return A.VER.adminPayments(); },
      verification_legacy: function () { return AD.verifications().then(function (list) { return '<div class="dash-top"><div><h1>Verification requests</h1><p>' + list.filter(function (v) { return v.status === 'pending'; }).length + ' pending</p></div></div>' + panel('Requests', list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Business</th><th>Applicant</th><th>Reg. no.</th><th>Documents</th><th>Note</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (v, i) { return '<tr style="--i:' + i + '"><td><b>' + esc(v.companies ? v.companies.name : v.company_id) + '</b><br><small>' + esc(v.companies ? (D.secMap[v.companies.sector] || {}).name + ' · ' + v.companies.loc : '') + '</small></td><td>' + (v.profiles ? esc(v.profiles.name) + '<br><small>' + esc(v.profiles.email) + '</small>' : '') + '</td><td>' + esc(v.reg_number) + '</td><td>' + (v.docs || []).map(function (d, j) { return '<a class="link" target="_blank" rel="noopener" href="' + esc(d) + '">' + ic('file-text') + ' Doc ' + (j + 1) + '</a><br>'; }).join('') + '</td><td><small>' + esc(v.note) + '</small></td><td><span class="pill ' + (v.status === 'approved' ? 'ok' : v.status === 'rejected' ? 'bad' : 'pend') + '">' + v.status + '</span></td><td>' + (v.status === 'pending' ? '<div style="display:flex;gap:6px"><button class="btn btn-xs btn-p" data-ver="' + v.id + '" data-co="' + esc(v.company_id) + '" data-ok="1">Approve</button><button class="btn btn-xs btn-danger" data-ver="' + v.id + '" data-co="' + esc(v.company_id) + '" data-ok="0">Reject</button></div>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('badge-check', 'No verification requests yet')); }); },
      companies: function () { return AD.companies().then(function (list) { return '<div class="dash-top"><div><h1>Companies</h1><p>' + list.length + ' registered</p></div></div>' + panel('All companies', list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Sector</th><th>Contact</th><th>Products</th><th>Verified</th><th></th></tr></thead><tbody>' + list.map(function (c, i) { return '<tr style="--i:' + i + '"><td><a href="#/company/' + c.id + '" class="link"><b>' + esc(c.name) + '</b></a><br><small>' + esc(c.loc) + '</small></td><td>' + esc((D.secMap[c.sector] || {}).name || c.sector) + '</td><td><small>' + esc(c.phone) + '<br>' + esc(c.email) + '</small></td><td>' + D.products.filter(function (p) { return p.co === c.id; }).length + '</td><td><button type="button" class="toggle ' + (c.ver ? 'on' : '') + '" data-verco="' + esc(c.id) + '"></button></td><td><div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn btn-xs btn-ghost" data-owner="' + esc(c.id) + '" title="Assign owner account">' + ic('user') + (c.owner_id ? '' : ' Assign owner') + '</button><button class="btn btn-xs btn-danger" data-delco="' + esc(c.id) + '">' + ic('trash-2') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div>' : empty('building-2', 'No companies yet')); }); },
      products: function () { return AD.products().then(function (list) { return '<div class="dash-top"><div><h1>Products</h1><p>' + list.length + ' listings (' + list.filter(function (p) { return p.active; }).length + ' live)</p></div></div>' + panel('All listings', list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Live</th><th></th></tr></thead><tbody>' + list.map(function (p, i) { var c = D.coMap[p.co]; return '<tr style="--i:' + i + '"><td><div class="pt"><img src="' + esc(p.img || IMG + 'bg-farm-1.jpg') + '" alt=""><div><a href="#/product/' + p.id + '" class="link"><b>' + esc(p.name) + '</b></a><small>' + esc((D.secMap[p.sec] || {}).name || p.sec) + '</small></div></div></td><td>' + esc(c ? c.name : p.co) + '</td><td><b>' + money(p.price) + '</b>' + esc(p.unit) + '</td><td><button type="button" class="toggle ' + (p.active ? 'on' : '') + '" data-act="' + p.id + '"></button></td><td><button class="btn btn-xs btn-danger" data-delp="' + p.id + '">' + ic('trash-2') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : empty('package', 'No products yet')); }); },
      users: function () { return AD.users().then(function (list) { return '<div class="dash-top"><div><h1>Users</h1><p>' + list.length + ' accounts</p></div></div>' + panel('All users', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead><tbody>' + list.map(function (p, i) { return '<tr style="--i:' + i + '"><td><div class="pt"><span class="avatar">' + A.initials(p.name || p.email) + '</span><b>' + esc(p.name) + '</b></div></td><td>' + esc(p.email) + '</td><td>' + esc(p.phone) + '</td><td>' + (p.id === u.id ? '<span class="pill ok">admin (you)</span>' : '<select class="select" data-role="' + p.id + '" style="height:34px;font-size:.8rem">' + ['buyer', 'seller', 'company', 'admin'].map(function (rl) { return '<option ' + (rl === p.role ? 'selected' : '') + '>' + rl + '</option>'; }).join('') + '</select>') + '</td><td style="color:var(--text-3)">' + fmtDate(p.created_at) + '</td></tr>'; }).join('') + '</tbody></table></div>'); }); },
      reviews: function () { return AD.reviews().then(function (list) { return '<div class="dash-top"><div><h1>Reviews</h1><p>' + list.length + ' most recent</p></div></div>' + panel('Moderation', list.length ? list.map(function (x) { return '<div class="review"><span class="av">' + A.initials(x.name || 'U') + '</span><div style="flex:1"><b>' + esc(x.name) + '</b> <small style="color:var(--text-3)">on ' + esc(x.products ? x.products.name : '') + ' · ' + fmtDate(x.created_at) + '</small>' + A.stars(x.rating) + '<p>' + esc(x.body) + '</p></div><button class="btn btn-xs btn-danger" data-delrev="' + x.id + '">' + ic('trash-2') + '</button></div>'; }).join('') : empty('star', 'No reviews yet')); }); },
      inbox: function () { return AD.contacts().then(function (list) { return '<div class="dash-top"><div><h1>Contact inbox</h1><p>' + list.filter(function (c) { return !c.handled; }).length + ' unread</p></div></div>' + panel('Messages', list.length ? list.map(function (c, i) { return '<div class="notif" style="--i:' + Math.min(i, 8) + ';--c:' + (c.handled ? '#64748b' : '#34d399') + '"><span class="ic">' + ic('mail') + '</span><div style="flex:1"><b>' + esc(c.subject || 'Enquiry') + ' — ' + esc(c.name) + '</b><small><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' + (c.phone ? ' · ' + esc(c.phone) : '') + ' · ' + fmtDate(c.created_at) + '</small><p style="margin-top:6px;font-size:.88rem">' + esc(c.body) + '</p></div><div style="display:flex;gap:6px;flex-direction:column"><a class="btn btn-xs btn-p" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent('Re: ' + (c.subject || 'Your AgricWorld enquiry')) + '">' + ic('send') + ' Reply</a>' + (c.handled ? '' : '<button class="btn btn-xs btn-ghost" data-handled="' + c.id + '">Mark handled</button>') + '</div></div>'; }).join('') : empty('mail', 'Inbox is empty')); }); },
      subscribers: function () { return AD.subscribers().then(function (list) { return '<div class="dash-top"><div><h1>Subscribers</h1><p>' + list.length + ' newsletter sign-ups</p></div><button class="btn btn-ghost btn-sm" id="csvBtn">' + ic('download') + ' Download CSV</button></div>' + panel('Emails', list.length ? '<div class="tbl-wrap"><table class="tbl"><tbody>' + list.map(function (s, i) { return '<tr style="--i:' + Math.min(i, 10) + '"><td>' + esc(s.email) + '</td><td style="color:var(--text-3);text-align:right">' + fmtDate(s.created_at) + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('send', 'No subscribers yet')); }); }
    };
    (views[sub] || views[''])().then(function (html) {
      body.innerHTML = withAI(html, 'admin', sub); A.observe(body);
      if (A.VER.bindAdmin) A.VER.bindAdmin(body, sub);
      var csv = $('#csvBtn', body); if (csv) csv.addEventListener('click', function () { AD.subscribers().then(function (list) { var blob = new Blob(['email,subscribed\n' + list.map(function (s) { return s.email + ',' + s.created_at; }).join('\n')], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'agricworld-subscribers.csv'; a.click(); }); });
      var act = function (p, msg) { p.then(function () { A.toast(msg, 'check'); return DB.loadCatalogue(); }).then(function () { A.render(); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); };
      body.addEventListener('click', function (e) {
        var t;
        if ((t = e.target.closest('[data-ver]'))) { var ok = t.getAttribute('data-ok') === '1'; var note = ok ? '' : (prompt('Reason for rejection (sent to the seller):') || ''); if (!ok && note === null) return; act(AD.decideVerification(+t.getAttribute('data-ver'), t.getAttribute('data-co'), ok, note), ok ? 'Business verified' : 'Request rejected'); }
        else if ((t = e.target.closest('[data-verco]'))) { var on = !t.classList.contains('on'); act(AD.setVerified(t.getAttribute('data-verco'), on), on ? 'Marked verified' : 'Verification removed'); }
        else if ((t = e.target.closest('[data-owner]'))) { var em = prompt('Email of the registered user who should manage this company:'); if (em) act(AD.assignOwner(t.getAttribute('data-owner'), em), 'Owner assigned'); }
        else if ((t = e.target.closest('[data-delco]'))) { if (confirm('Delete this company and all its products? This cannot be undone.')) act(AD.deleteCompany(t.getAttribute('data-delco')), 'Company deleted'); }
        else if ((t = e.target.closest('[data-act]'))) { var v = !t.classList.contains('on'); act(AD.setActive(+t.getAttribute('data-act'), v), v ? 'Listing is live' : 'Listing hidden'); }
        else if ((t = e.target.closest('[data-delp]'))) { if (confirm('Delete this product?')) act(AD.deleteProduct(+t.getAttribute('data-delp')), 'Product deleted'); }
        else if ((t = e.target.closest('[data-delrev]'))) { if (confirm('Delete this review?')) act(AD.deleteReview(+t.getAttribute('data-delrev')), 'Review removed'); }
        else if ((t = e.target.closest('[data-handled]'))) act(AD.handleContact(+t.getAttribute('data-handled')), 'Marked handled');
      });
      body.addEventListener('change', function (e) {
        var t = e.target;
        if (t.matches('[data-order]')) act(AD.setOrderStatus(+t.getAttribute('data-order'), t.value), 'Order status updated');
        if (t.matches('[data-role]')) { if (t.value === 'admin' && !confirm('Give this user full admin access?')) { A.render(); return; } act(AD.setRole(t.getAttribute('data-role'), t.value), 'Role updated'); }
      });
    }).catch(function (e) { fail(body, e); });
  });
})(window.AW);
