/* ═══════════════════════════════════════════════════════════════
   AgricWorld — confirm a Stripe Checkout Session (Vercel serverless)
   POST /api/stripe-verify  { session_id, order_id }

   Called by the browser when Stripe redirects the buyer back. The server
   retrieves the session with the SECRET key, checks it is paid for exactly
   this order/amount/currency and only then marks the order paid.
   (The webhook does the same independently, so an order is settled even if
   the buyer closes the tab before returning.)
   ═══════════════════════════════════════════════════════════════ */
var L = require('./_lib/orders.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!process.env.STRIPE_SECRET_KEY || !L.dbReady()) { res.status(503).json({ ok: false, error: 'Payment verification is not configured on the server yet.' }); return; }
  var body = L.readBody(req), sid = String(body.session_id || '').trim(), orderId = parseInt(body.order_id, 10);
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid) || !orderId) { res.status(400).json({ ok: false, error: 'session_id and order_id are required' }); return; }
  try {
    var session = await L.stripe('GET', '/checkout/sessions/' + encodeURIComponent(sid));
    var out = await L.settleStripeSession(session, orderId);
    res.status(200).json(out);
  } catch (e) {
    res.status(e.status && e.status < 500 ? e.status : 500).json({ ok: false, error: (e && e.message) || 'Verification error' });
  }
};
