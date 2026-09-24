/* ═══════════════════════════════════════════════════════════════
   AgricWorld — shared server helpers (Vercel serverless only).
   Files under api/_lib are NOT deployed as functions (underscore prefix).

   All order writes here use the Supabase SERVICE ROLE key, which is the
   only role allowed by the database trigger to mark an order paid.
   ═══════════════════════════════════════════════════════════════ */
var URL = process.env.SUPABASE_URL, SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() { return { apikey: SRK, Authorization: 'Bearer ' + SRK, 'Content-Type': 'application/json', Prefer: 'return=representation' }; }
function dbReady() { return !!(URL && SRK); }

async function getOrder(orderId) {
  var r = await fetch(URL + '/rest/v1/orders?id=eq.' + orderId + '&select=id,ref,total,currency,status,method,paystack_ref,buyer_email,buyer_name', { headers: sbHeaders() });
  var rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function getItems(orderId) {
  var r = await fetch(URL + '/rest/v1/order_items?order_id=eq.' + orderId + '&select=product_id,name,price,qty,unit,img', { headers: sbHeaders() });
  var rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

/* Mark an order paid and reduce stock. `ref` is the gateway reference
   (Paystack reference or Stripe payment_intent id). Idempotent. */
async function markPaid(orderId, ref, paidAtIso, method) {
  var patch = { status: 'paid', paystack_ref: ref, paid_at: paidAtIso || new Date().toISOString() };
  if (method) patch.method = method;
  var u = await fetch(URL + '/rest/v1/orders?id=eq.' + orderId, { method: 'PATCH', headers: sbHeaders(), body: JSON.stringify(patch) });
  if (!u.ok) throw new Error('Could not update order ' + orderId + ' (' + u.status + ')');
  try {
    var items = await getItems(orderId);
    for (var i = 0; i < items.length; i++) {
      if (!items[i].product_id) continue;
      var pr = await fetch(URL + '/rest/v1/products?id=eq.' + items[i].product_id + '&select=qty', { headers: sbHeaders() });
      var p = (await pr.json())[0];
      if (p && p.qty !== null && p.qty !== undefined) await fetch(URL + '/rest/v1/products?id=eq.' + items[i].product_id, { method: 'PATCH', headers: sbHeaders(), body: JSON.stringify({ qty: Math.max(0, p.qty - items[i].qty) }) });
    }
  } catch (e) { /* stock reduction is best-effort */ }
}

/* Stripe amounts are in the smallest unit; these currencies have no minor unit. */
var ZERO_DECIMAL = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
function minorUnits(amount, currency) { return ZERO_DECIMAL.indexOf(String(currency).toUpperCase()) > -1 ? Math.round(Number(amount)) : Math.round(Number(amount) * 100); }

/* Minimal Stripe REST client (form-encoded, no SDK needed). */
function formEncode(obj, prefix, out) {
  out = out || [];
  Object.keys(obj).forEach(function (k) {
    var v = obj[k]; if (v === undefined || v === null) return;
    var key = prefix ? prefix + '[' + k + ']' : k;
    if (typeof v === 'object') formEncode(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  });
  return out;
}
async function stripe(method, path, params, idemKey) {
  var SK = process.env.STRIPE_SECRET_KEY;
  var headers = { Authorization: 'Bearer ' + SK, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' };
  if (idemKey) headers['Idempotency-Key'] = idemKey;
  var r = await fetch('https://api.stripe.com/v1' + path, { method: method, headers: headers, body: method === 'GET' ? undefined : formEncode(params || {}).join('&') });
  var d = await r.json();
  if (!r.ok) { var e = new Error((d && d.error && d.error.message) || 'Stripe error ' + r.status); e.status = r.status; e.stripe = d && d.error; throw e; }
  return d;
}

function readBody(req) {
  var b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b;
}

/* Raw request body (needed for webhook signature verification). */
function rawBody(req) {
  return new Promise(function (resolve, reject) {
    if (typeof req.body === 'string') return resolve(req.body);
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
    var chunks = [];
    req.on('data', function (c) { chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)); });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

/* Validate a Stripe Checkout Session against an order and mark it paid.
   Returns { ok, already, ref, amount, currency }. Throws with .status on mismatch. */
async function settleStripeSession(session, orderId) {
  var order = await getOrder(orderId);
  if (!order) { var nf = new Error('Order not found'); nf.status = 404; throw nf; }
  var piId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent && session.payment_intent.id) || session.id;
  if (order.status === 'paid') return { ok: true, already: true, ref: order.ref, status: 'paid' };
  var fail = function (m) { var e = new Error(m); e.status = 402; throw e; };
  if (session.payment_status !== 'paid') fail('Payment not completed (' + session.payment_status + ')');
  if (session.metadata && session.metadata.order_id && parseInt(session.metadata.order_id, 10) !== order.id) fail('This payment belongs to a different order');
  if (session.client_reference_id && String(session.client_reference_id) !== String(order.id)) fail('This payment belongs to a different order');
  var cur = String(session.currency || '').toUpperCase(), want = String(order.currency || 'NGN').toUpperCase();
  if (cur !== want) fail('Currency mismatch (' + cur + ' vs ' + want + ')');
  if (Number(session.amount_total) < minorUnits(order.total, want)) fail('Paid amount does not match the order total');
  await markPaid(order.id, piId, new Date().toISOString(), 'stripe');
  return { ok: true, ref: order.ref, status: 'paid', amount: Number(session.amount_total) / (ZERO_DECIMAL.indexOf(cur) > -1 ? 1 : 100), currency: cur, payment_intent: piId };
}

module.exports = { dbReady: dbReady, getOrder: getOrder, getItems: getItems, markPaid: markPaid, minorUnits: minorUnits, stripe: stripe, readBody: readBody, rawBody: rawBody, settleStripeSession: settleStripeSession };
