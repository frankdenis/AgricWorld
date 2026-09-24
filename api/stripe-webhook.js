/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Stripe webhook (Vercel serverless)
   POST /api/stripe-webhook   (configure in Stripe → Developers → Webhooks)

   Endpoint URL:  https://<your-domain>/api/stripe-webhook
   Events:        checkout.session.completed
                  checkout.session.async_payment_succeeded

   The signature is verified with STRIPE_WEBHOOK_SECRET (whsec_…) before
   anything is trusted. On a paid session the matching order is marked paid.
   ═══════════════════════════════════════════════════════════════ */
var crypto = require('crypto');
var L = require('./_lib/orders.js');

function verifySignature(payload, header, secret, toleranceSec) {
  if (!header) return false;
  var parts = {}; header.split(',').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) { var k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(); (parts[k] = parts[k] || []).push(v); } });
  var t = parts.t && parts.t[0], sigs = parts.v1 || [];
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > (toleranceSec || 300)) return false;
  var expected = crypto.createHmac('sha256', secret).update(t + '.' + payload, 'utf8').digest('hex');
  return sigs.some(function (s) { try { return s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s, 'hex'), Buffer.from(expected, 'hex')); } catch (e) { return false; } });
}

async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  var WH = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WH || !process.env.STRIPE_SECRET_KEY || !L.dbReady()) { res.status(503).send('Webhook not configured'); return; }
  var payload;
  try { payload = await L.rawBody(req); } catch (e) { res.status(400).send('Could not read body'); return; }
  if (!verifySignature(payload, req.headers['stripe-signature'], WH)) { res.status(400).send('Invalid signature'); return; }
  var event; try { event = JSON.parse(payload); } catch (e) { res.status(400).send('Invalid JSON'); return; }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      var session = event.data.object;
      var orderId = parseInt((session.metadata && session.metadata.order_id) || session.client_reference_id, 10);
      if (orderId && session.payment_status === 'paid') await L.settleStripeSession(session, orderId);
    }
    res.status(200).json({ received: true });
  } catch (e) {
    /* 4xx mismatches must not be retried by Stripe forever; 5xx (DB down) should be. */
    res.status(e.status && e.status < 500 ? 200 : 500).json({ received: true, note: e.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
