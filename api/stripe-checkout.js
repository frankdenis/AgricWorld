/* ═══════════════════════════════════════════════════════════════
   AgricWorld — create a Stripe Checkout Session (Vercel serverless)
   POST /api/stripe-checkout  { order_id }

   The order must already exist (created by the browser through Supabase,
   status pending_payment). The amount is read from the DATABASE, never
   from the browser. Returns { url } → the buyer is redirected to Stripe's
   hosted, PCI-compliant payment page.

   Environment variables (Vercel → Settings → Environment Variables):
     STRIPE_SECRET_KEY          sk_test_… / sk_live_…
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ═══════════════════════════════════════════════════════════════ */
var L = require('./_lib/orders.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!process.env.STRIPE_SECRET_KEY || !L.dbReady()) { res.status(503).json({ ok: false, error: 'Card payments (Stripe) are not configured on the server yet.' }); return; }
  var body = L.readBody(req), orderId = parseInt(body.order_id, 10);
  if (!orderId) { res.status(400).json({ ok: false, error: 'order_id is required' }); return; }
  try {
    var order = await L.getOrder(orderId);
    if (!order) { res.status(404).json({ ok: false, error: 'Order not found' }); return; }
    if (order.status === 'paid') { res.status(409).json({ ok: false, error: 'This order is already paid' }); return; }
    if (order.status !== 'pending_payment') { res.status(409).json({ ok: false, error: 'This order is not awaiting payment (' + order.status + ')' }); return; }
    var items = await L.getItems(orderId);
    var cur = String(order.currency || 'NGN').toLowerCase();
    var proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0], host = req.headers['x-forwarded-host'] || req.headers.host;
    var origin = proto + '://' + host;
    var lineItems = {};
    var sumItems = 0;
    items.forEach(function (it, i) {
      var unit = L.minorUnits(it.price, cur); sumItems += unit * it.qty;
      lineItems[i] = { quantity: it.qty, price_data: { currency: cur, unit_amount: unit, product_data: { name: it.name.slice(0, 120) + (it.unit ? ' (' + it.unit.replace(/^\//, 'per ') + ')' : ''), images: it.img && /^https?:\/\//.test(it.img) ? { 0: it.img } : undefined } } };
    });
    var totalMinor = L.minorUnits(order.total, cur);
    if (totalMinor > sumItems) lineItems[items.length] = { quantity: 1, price_data: { currency: cur, unit_amount: totalMinor - sumItems, product_data: { name: 'Service fee' } } };
    if (!items.length) lineItems[0] = { quantity: 1, price_data: { currency: cur, unit_amount: totalMinor, product_data: { name: 'AgricWorld order ' + order.ref } } };

    var session = await L.stripe('POST', '/checkout/sessions', {
      mode: 'payment',
      client_reference_id: String(order.id),
      customer_email: order.buyer_email || undefined,
      line_items: lineItems,
      metadata: { order_id: String(order.id), order_ref: order.ref },
      payment_intent_data: { metadata: { order_id: String(order.id), order_ref: order.ref }, description: 'AgricWorld order ' + order.ref },
      success_url: origin + '/?pay=stripe&order=' + order.id + '&session={CHECKOUT_SESSION_ID}#/pay/return',
      cancel_url: origin + '/?pay=cancel&order=' + order.id + '#/checkout',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60
    }, 'aw-' + order.id + '-' + order.ref);
    res.status(200).json({ ok: true, url: session.url, session_id: session.id });
  } catch (e) {
    res.status(e.status && e.status < 500 ? e.status : 500).json({ ok: false, error: (e && e.message) || 'Could not start Stripe checkout' });
  }
};
