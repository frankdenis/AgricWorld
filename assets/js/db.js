/* ═══════════════════════════════════════════════════════════════
   AgricWorld — data layer (Supabase)
   One module owns every read/write. Public pages read the catalogue
   (companies + products) which is loaded from the database at start-up;
   if the database is not configured yet the built-in catalogue is used
   read-only so the site still renders.
   ═══════════════════════════════════════════════════════════════ */
window.AW_DB = (function () {
  'use strict';
  var C = window.AW_CONFIG || {};
  var seed = window.AW_DATA;
  var sb = null;
  var ready = false;
  var session = null, profile = null;
  var listeners = [];

  function configured() { return !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase); }
  function client() { if (!sb && configured()) sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }); return sb; }
  function on(fn) { listeners.push(fn); }
  function emit(ev) { listeners.forEach(function (f) { try { f(ev); } catch (e) { console.error(e); } }); }
  function fail(msg) { var e = new Error(msg); e.userMessage = msg; return Promise.reject(e); }
  function need() { return configured() ? null : fail('The database is not connected yet. Add your Supabase keys in assets/js/config.js (see SETUP.md).'); }
  function q(promise) { return promise.then(function (r) { if (r.error) { var e = new Error(r.error.message || 'Database error'); e.userMessage = r.error.message; e.code = r.error.code; throw e; } return r.data; }); }

  /* ───────────── catalogue (read) ───────────── */
  function normCompany(c) {
    return { id: c.id, name: c.name, sector: c.sector, loc: c.loc || '', ver: !!c.ver, year: c.year || '', staff: c.staff || '', desc: c.descr || '', products: c.products || [], services: c.services || [], cover: c.cover || '', phone: c.phone || '', email: c.email || '', whatsapp: c.whatsapp || '', owner_id: c.owner_id || null, followers: 0, rating: 0, reviews: 0 };
  }
  function normProduct(p) {
    var gal = (p.gal && p.gal.length) ? p.gal : (p.img ? [p.img] : []);
    return { id: p.id, sec: p.sec, name: p.name, price: +p.price, unit: p.unit || '', old: p.old ? +p.old : null, co: p.co, img: p.img || gal[0] || '', gal: gal, tag: p.tag || null, qty: p.qty, stock: p.qty === null || p.qty === undefined ? 'in' : p.qty <= 0 ? 'out' : p.qty <= (p.moq || 1) * 5 ? 'low' : 'in', moq: p.moq || 1, delivery: p.delivery || 'Arranged with seller', desc: p.descr || '', specs: p.specs || {}, active: p.active !== false, created_at: p.created_at, rating: 0, reviews: 0 };
  }
  function link(D) {
    D.secMap = {}; D.sectors.forEach(function (s) { D.secMap[s.id] = s; });
    D.coMap = {}; D.companies.forEach(function (c) { D.coMap[c.id] = c; });
    D.products.forEach(function (p) { var c = D.coMap[p.co]; p.loc = c ? c.loc : ''; p.seller = c ? c.name : 'Seller'; p.ver = c ? c.ver : false; });
    D.sectors.forEach(function (s) { s.listings = D.products.filter(function (p) { return p.sec === s.id; }).length; });
  }

  var live = false;   /* true when the catalogue came from the database */
  function loadCatalogue() {
    var D = seed;
    if (!configured()) { seedFallback(D); link(D); ready = true; return Promise.resolve(D); }
    var c = client();
    return Promise.all([
      q(c.from('companies').select('*').order('name')),
      q(c.from('products').select('*').eq('active', true).order('created_at', { ascending: false })),
      q(c.from('product_stats').select('*')),
      q(c.from('company_stats').select('*'))
    ]).then(function (res) {
      D.companies = res[0].map(normCompany); D.products = res[1].map(normProduct);
      var ps = {}; res[2].forEach(function (r) { ps[r.product_id] = r; });
      var cs = {}; res[3].forEach(function (r) { cs[r.company_id] = r; });
      D.products.forEach(function (p) { var s = ps[p.id]; if (s) { p.rating = +s.rating; p.reviews = s.reviews; } });
      D.companies.forEach(function (c) { var s = cs[c.id]; if (s) c.followers = s.followers; var rs = D.products.filter(function (p) { return p.co === c.id && p.reviews; }); if (rs.length) { c.reviews = rs.reduce(function (a, p) { return a + p.reviews; }, 0); c.rating = +(rs.reduce(function (a, p) { return a + p.rating * p.reviews; }, 0) / c.reviews).toFixed(1); } });
      live = true; link(D); ready = true; return D;
    }).catch(function (e) { console.error('Catalogue load failed, using built-in catalogue:', e); seedFallback(D); link(D); ready = true; return D; });
  }
  function seedFallback(D) {
    /* built-in catalogue: no invented ratings, followers or stock figures */
    D.companies.forEach(function (c) { c.followers = 0; c.rating = 0; c.reviews = 0; c.owner_id = null; c.whatsapp = c.whatsapp || ''; });
    D.products.forEach(function (p) { p.rating = 0; p.reviews = 0; p.qty = null; p.stock = 'in'; p.active = true; });
  }

  /* ───────────── auth ───────────── */
  function loadProfile() {
    if (!session) { profile = null; return Promise.resolve(null); }
    return q(client().from('profiles').select('*').eq('id', session.user.id).maybeSingle()).then(function (p) {
      if (!p) { /* trigger may lag a moment on brand-new accounts */
        var m = session.user.user_metadata || {};
        p = { id: session.user.id, email: session.user.email, name: m.name || session.user.email.split('@')[0], phone: m.phone || '', role: m.role || 'buyer' };
      }
      profile = p; return p;
    });
  }
  function initAuth() {
    if (!configured()) return Promise.resolve(null);
    var c = client();
    c.auth.onAuthStateChange(function (ev, s) { session = s; loadProfile().then(function () { emit(ev); }); });
    return c.auth.getSession().then(function (r) { session = r.data.session; return loadProfile(); });
  }
  function user() { return profile; }
  function isAdmin() { return !!(profile && profile.role === 'admin'); }
  function signUp(o) {
    var e = need(); if (e) return e;
    var role = ['buyer', 'seller', 'company'].indexOf(o.role) > -1 ? o.role : 'buyer';
    return q(client().auth.signUp({ email: o.email, password: o.password, options: { data: { name: o.name, phone: o.phone || '', role: role }, emailRedirectTo: location.origin + location.pathname } }))
      .then(function (d) { session = d.session; return loadProfile().then(function () { return { needsConfirm: !d.session, user: profile }; }); });
  }
  function signIn(email, password) {
    var e = need(); if (e) return e;
    return q(client().auth.signInWithPassword({ email: email, password: password })).then(function (d) { session = d.session; return loadProfile(); });
  }
  function signOut() { if (!configured()) return Promise.resolve(); return client().auth.signOut().then(function () { session = null; profile = null; }); }
  function resetPassword(email) { var e = need(); if (e) return e; return q(client().auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#/account/password' })); }
  function updatePassword(pw) { var e = need(); if (e) return e; return q(client().auth.updateUser({ password: pw })); }
  function updateProfile(patch) { var e = need(); if (e) return e; if (!profile) return fail('Sign in first'); delete patch.role; return q(client().from('profiles').update(patch).eq('id', profile.id).select().single()).then(function (p) { profile = p; return p; }); }

  /* ───────────── companies / products (seller writes) ───────────── */
  function myCompany() { if (!configured() || !profile) return Promise.resolve(null); return q(client().from('companies').select('*').eq('owner_id', profile.id).order('created_at', { ascending: true }).limit(1).maybeSingle()).then(function (c) { return c ? normCompany(c) : null; }); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'co'; }
  function saveCompany(o) {
    var e = need(); if (e) return e; if (!profile) return fail('Sign in first');
    var row = { name: o.name, sector: o.sector, loc: o.loc || '', descr: o.desc || '', year: o.year ? +o.year : null, staff: o.staff || '', products: o.products || [], services: o.services || [], cover: o.cover || '', phone: o.phone || '', email: o.email || profile.email, whatsapp: o.whatsapp || '', owner_id: profile.id };
    if (o.id) return q(client().from('companies').update(row).eq('id', o.id).select().single()).then(normCompany);
    row.id = slug(o.name) + '-' + Math.random().toString(36).slice(2, 6);
    return q(client().from('companies').insert(row).select().single()).then(normCompany);
  }
  function myProducts(coId) { var e = need(); if (e) return e; return q(client().from('products').select('*').eq('co', coId).order('created_at', { ascending: false })).then(function (r) { return r.map(normProduct); }); }
  function saveProduct(o) {
    var e = need(); if (e) return e;
    var row = { co: o.co, sec: o.sec, name: o.name, price: +o.price, unit: o.unit || '', old: o.old ? +o.old : null, img: o.img || '', gal: o.gal || (o.img ? [o.img] : []), tag: o.tag || null, qty: (o.qty === '' || o.qty === null || o.qty === undefined) ? null : +o.qty, moq: +o.moq || 1, delivery: o.delivery || '', descr: o.desc || '', specs: o.specs || {}, active: o.active !== false };
    if (o.id) return q(client().from('products').update(row).eq('id', o.id).select().single()).then(normProduct);
    return q(client().from('products').insert(row).select().single()).then(normProduct);
  }
  function deleteProduct(id) { var e = need(); if (e) return e; return q(client().from('products').delete().eq('id', id)); }
  function uploadImage(file, folder) {
    var e = need(); if (e) return e; if (!profile) return fail('Sign in first');
    if (!/^image\//.test(file.type)) return fail('Please choose an image file');
    if (file.size > 5 * 1024 * 1024) return fail('Image must be under 5 MB');
    var path = (folder || 'products') + '/' + profile.id + '/' + Date.now() + '-' + file.name.replace(/[^\w.\-]+/g, '_');
    return q(client().storage.from('uploads').upload(path, file, { cacheControl: '31536000', upsert: false })).then(function () { return client().storage.from('uploads').getPublicUrl(path).data.publicUrl; });
  }

  /* ───────────── orders ───────────── */
  function ref() { var d = new Date(); return 'AW-' + d.getFullYear().toString().slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
  function createOrder(o, items) {
    var e = need(); if (e) return e;
    var row = { ref: ref(), buyer_id: profile ? profile.id : null, buyer_name: o.name, buyer_email: o.email, buyer_phone: o.phone || '', address: o.addr || '', state: o.state || '', ship_option: o.ship || '', notes: o.notes || '', subtotal: o.subtotal, shipping: o.shipping || 0, fee: o.fee || 0, total: o.total, method: o.method, status: o.method === 'request' ? 'requested' : 'pending_payment' };
    return q(client().from('orders').insert(row).select().single()).then(function (ord) {
      var rows = items.map(function (it) { return { order_id: ord.id, product_id: it.p.id, seller_co: it.p.co, name: it.p.name, price: it.p.price, qty: it.q, img: it.p.img, unit: it.p.unit }; });
      return q(client().from('order_items').insert(rows)).then(function () { return ord; });
    });
  }
  function myOrders() { if (!configured() || !profile) return Promise.resolve([]); return q(client().from('orders').select('*, order_items(*)').eq('buyer_id', profile.id).order('created_at', { ascending: false })); }
  function sellerOrders(coId) { var e = need(); if (e) return e; return q(client().from('order_items').select('*, orders(*)').eq('seller_co', coId).order('id', { ascending: false })); }
  function setOrderStatus(id, status) { var e = need(); if (e) return e; return q(client().from('orders').update({ status: status }).eq('id', id).select().single()); }
  function getOrder(id) { var e = need(); if (e) return e; return q(client().from('orders').select('*, order_items(*)').eq('id', id).single()); }

  /* Verify a Paystack payment server-side. The serverless function checks the transaction with
     Paystack's API using the SECRET key and marks the order paid with the service-role key. */
  function verifyPayment(reference, orderId) {
    return fetch(C.verifyEndpoint || '/api/paystack-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: reference, order_id: orderId }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) { var e = new Error(d.error || 'Verification failed'); e.userMessage = d.error; throw e; } return d; }); });
  }

  /* Stripe: the server creates a hosted Checkout Session from the order stored in the database
     and returns the URL to redirect to. Amounts are never taken from the browser. */
  function stripeCheckout(orderId) {
    return fetch(C.stripeCheckoutEndpoint || '/api/stripe-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok || !d.url) { var e = new Error(d.error || 'Could not start card payment'); e.userMessage = d.error; throw e; } return d; }); });
  }
  /* Stripe: confirm the session after the buyer is redirected back. */
  function verifyStripe(sessionId, orderId) {
    return fetch(C.stripeVerifyEndpoint || '/api/stripe-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, order_id: orderId }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) { var e = new Error(d.error || 'Verification failed'); e.userMessage = d.error; throw e; } return d; }); });
  }

  /* ───────────── reviews / follows / messages ───────────── */
  function reviews(productId) { if (!configured()) return Promise.resolve([]); return q(client().from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false }).limit(20)); }
  function addReview(productId, rating, body) { var e = need(); if (e) return e; if (!profile) return fail('Sign in to review'); return q(client().from('reviews').upsert({ product_id: productId, user_id: profile.id, name: profile.name, rating: rating, body: body }, { onConflict: 'product_id,user_id' }).select().single()); }
  function myFollows() { if (!configured() || !profile) return Promise.resolve([]); return q(client().from('follows').select('company_id').eq('user_id', profile.id)).then(function (r) { return r.map(function (x) { return x.company_id; }); }); }
  function follow(coId, on) { var e = need(); if (e) return e; if (!profile) return fail('Sign in to follow'); return on ? q(client().from('follows').upsert({ user_id: profile.id, company_id: coId })) : q(client().from('follows').delete().eq('user_id', profile.id).eq('company_id', coId)); }
  function threads(asSellerCo) {
    var e = need(); if (e) return e; if (!profile) return Promise.resolve([]);
    var qq = client().from('messages').select('*').order('created_at', { ascending: false }).limit(300);
    qq = asSellerCo ? qq.eq('company_id', asSellerCo) : qq.eq('user_id', profile.id);
    return q(qq).then(function (rows) {
      var map = {}; rows.forEach(function (m) { var k = m.company_id + '|' + m.user_id; if (!map[k]) map[k] = { company_id: m.company_id, user_id: m.user_id, last: m, unread: 0, buyer_name: '' }; if (!m.read && ((asSellerCo && m.sender === 'buyer') || (!asSellerCo && m.sender === 'seller'))) map[k].unread++; if (m.sender === 'buyer' && m.sender_name) map[k].buyer_name = m.sender_name; });
      return Object.keys(map).map(function (k) { return map[k]; });
    });
  }
  function thread(coId, userId) { var e = need(); if (e) return e; return q(client().from('messages').select('*').eq('company_id', coId).eq('user_id', userId).order('created_at')); }
  function sendMessage(coId, userId, sender, body) { var e = need(); if (e) return e; if (!profile) return fail('Sign in to message'); return q(client().from('messages').insert({ company_id: coId, user_id: userId, sender: sender, sender_name: profile.name, body: body }).select().single()); }
  function markRead(coId, userId, senderToMark) { if (!configured()) return Promise.resolve(); return q(client().from('messages').update({ read: true }).eq('company_id', coId).eq('user_id', userId).eq('sender', senderToMark).eq('read', false)); }

  /* ───────────── verification / contact / newsletter ───────────── */
  function requestVerification(o) { var e = need(); if (e) return e; if (!profile) return fail('Sign in first'); return q(client().from('verification_requests').insert({ company_id: o.company_id, user_id: profile.id, reg_number: o.reg_number || '', docs: o.docs || [], note: o.note || '' }).select().single()); }
  function myVerification(coId) { if (!configured() || !profile) return Promise.resolve(null); return q(client().from('verification_requests').select('*').eq('company_id', coId).order('created_at', { ascending: false }).limit(1).maybeSingle()); }
  function contact(o) { var e = need(); if (e) return e; return q(client().from('contact_messages').insert({ name: o.name, email: o.email, phone: o.phone || '', subject: o.subject || '', body: o.body })); }
  function subscribe(email) { var e = need(); if (e) return e; return q(client().from('subscribers').upsert({ email: email.toLowerCase() })); }

  /* ───────────── stats ───────────── */
  function sellerStats(coId) { var e = need(); if (e) return e; return q(client().rpc('seller_stats', { p_co: coId })); }
  function adminStats() { var e = need(); if (e) return e; return q(client().rpc('admin_stats')); }
  var admin = {
    users: function () { return q(client().from('profiles').select('*').order('created_at', { ascending: false }).limit(500)); },
    setRole: function (id, role) { return q(client().from('profiles').update({ role: role }).eq('id', id)); },
    companies: function () { return q(client().from('companies').select('*').order('created_at', { ascending: false })).then(function (r) { return r.map(normCompany); }); },
    setVerified: function (id, v) { return q(client().from('companies').update({ ver: v }).eq('id', id)); },
    deleteCompany: function (id) { return q(client().from('companies').delete().eq('id', id)); },
    assignOwner: function (coId, email) { return q(client().from('profiles').select('id, role').eq('email', String(email).trim().toLowerCase()).maybeSingle()).then(function (p) { if (!p) throw new Error('No user with that email has registered yet'); return q(client().from('companies').select('id, name').eq('owner_id', p.id).neq('id', coId).limit(1)).then(function (own) { if (own && own.length) throw new Error('That account already manages "' + own[0].name + '". One account manages one storefront.'); var chain = q(client().from('companies').update({ owner_id: p.id }).eq('id', coId)); if (p.role === 'buyer') chain = chain.then(function () { return q(client().from('profiles').update({ role: 'seller' }).eq('id', p.id)); }); return chain; }); }); },
    products: function () { return q(client().from('products').select('*').order('created_at', { ascending: false }).limit(1000)).then(function (r) { return r.map(normProduct); }); },
    setActive: function (id, v) { return q(client().from('products').update({ active: v }).eq('id', id)); },
    deleteProduct: deleteProduct,
    orders: function () { return q(client().from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(500)); },
    setOrderStatus: setOrderStatus,
    verifications: function () { return q(client().from('verification_requests').select('*, companies(name, sector, loc), profiles(name, email)').order('created_at', { ascending: false })); },
    decideVerification: function (id, coId, approve, note) { return q(client().from('verification_requests').update({ status: approve ? 'approved' : 'rejected', admin_note: note || '' }).eq('id', id)).then(function () { return approve ? q(client().from('companies').update({ ver: true }).eq('id', coId)) : null; }); },
    contacts: function () { return q(client().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(300)); },
    handleContact: function (id) { return q(client().from('contact_messages').update({ handled: true }).eq('id', id)); },
    subscribers: function () { return q(client().from('subscribers').select('*').order('created_at', { ascending: false })); },
    reviews: function () { return q(client().from('reviews').select('*, products(name)').order('created_at', { ascending: false }).limit(300)); },
    deleteReview: function (id) { return q(client().from('reviews').delete().eq('id', id)); }
  };

  return {
    configured: configured, isLive: function () { return live; }, isReady: function () { return ready; }, loadCatalogue: loadCatalogue, on: on,
    initAuth: initAuth, user: user, isAdmin: isAdmin, signUp: signUp, signIn: signIn, signOut: signOut, resetPassword: resetPassword, updatePassword: updatePassword, updateProfile: updateProfile,
    myCompany: myCompany, saveCompany: saveCompany, myProducts: myProducts, saveProduct: saveProduct, deleteProduct: deleteProduct, uploadImage: uploadImage,
    createOrder: createOrder, myOrders: myOrders, sellerOrders: sellerOrders, setOrderStatus: setOrderStatus, getOrder: getOrder, verifyPayment: verifyPayment, stripeCheckout: stripeCheckout, verifyStripe: verifyStripe,
    reviews: reviews, addReview: addReview, myFollows: myFollows, follow: follow, threads: threads, thread: thread, sendMessage: sendMessage, markRead: markRead,
    requestVerification: requestVerification, myVerification: myVerification, contact: contact, subscribe: subscribe,
    sellerStats: sellerStats, adminStats: adminStats, admin: admin
  };
})();
