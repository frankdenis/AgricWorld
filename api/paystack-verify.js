/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Paystack payment verification (Vercel serverless)
   POST /api/paystack-verify  { reference, order_id }

   1. Looks the order up with the Supabase SERVICE ROLE key (server only).
   2. Asks Paystack (SECRET key, server only) whether `reference` is a
      successful charge for exactly that amount and currency.
   3. Only then marks the order paid. The browser can never mark an order
      paid by itself — the database trigger blocks it.

   Environment variables (Vercel → Settings → Environment Variables):
     PAYSTACK_SECRET_KEY        sk_test_… / sk_live_…
     SUPABASE_URL               https://xxxx.supabase.co
     SUPABASE_SERVICE_ROLE_KEY  service_role key (never expose to the browser)
   ═══════════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  var SK = process.env.PAYSTACK_SECRET_KEY, URL = process.env.SUPABASE_URL, SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SK || !URL || !SRK) { res.status(503).json({ ok: false, error: 'Payment verification is not configured on the server yet.' }); return; }

  var body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  var reference = String(body.reference || '').trim(), orderId = parseInt(body.order_id, 10);
  if (!reference || !orderId) { res.status(400).json({ ok: false, error: 'reference and order_id are required' }); return; }

  var sbHeaders = { apikey: SRK, Authorization: 'Bearer ' + SRK, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  try {
    /* 1. load the order */
    var oRes = await fetch(URL + '/rest/v1/orders?id=eq.' + orderId + '&select=id,ref,total,currency,status,paystack_ref', { headers: sbHeaders });
    var orders = await oRes.json();
    var order = Array.isArray(orders) && orders[0];
    if (!order) { res.status(404).json({ ok: false, error: 'Order not found' }); return; }
    if (order.status === 'paid' && order.paystack_ref === reference) { res.status(200).json({ ok: true, status: 'paid', ref: order.ref, already: true }); return; }

    /* 2. verify with Paystack */
    var pRes = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), { headers: { Authorization: 'Bearer ' + SK } });
    var p = await pRes.json();
    var tx = p && p.data;
    if (!p.status || !tx) { res.status(402).json({ ok: false, error: (p && p.message) || 'Paystack could not verify this reference' }); return; }
    if (tx.status !== 'success') { res.status(402).json({ ok: false, error: 'Payment not successful (' + tx.status + ')' }); return; }
    var expectedKobo = Math.round(Number(order.total) * 100);
    if (Number(tx.amount) < expectedKobo) { res.status(402).json({ ok: false, error: 'Paid amount does not match the order total' }); return; }
    if (String(tx.currency).toUpperCase() !== String(order.currency || 'NGN').toUpperCase()) { res.status(402).json({ ok: false, error: 'Currency mismatch' }); return; }
    var meta = tx.metadata || {};
    if (meta.order_id && parseInt(meta.order_id, 10) !== orderId) { res.status(402).json({ ok: false, error: 'This payment belongs to a different order' }); return; }

    /* 3. mark paid (service role bypasses the protection trigger) */
    var uRes = await fetch(URL + '/rest/v1/orders?id=eq.' + orderId, { method: 'PATCH', headers: sbHeaders, body: JSON.stringify({ status: 'paid', paystack_ref: reference, paid_at: new Date(tx.paid_at || Date.now()).toISOString() }) });
    if (!uRes.ok) { res.status(500).json({ ok: false, error: 'Verified with Paystack but could not update the order. Contact support with reference ' + reference }); return; }

    /* 4. reduce stock for tracked products (best effort) */
    try {
      var iRes = await fetch(URL + '/rest/v1/order_items?order_id=eq.' + orderId + '&select=product_id,qty', { headers: sbHeaders });
      var items = await iRes.json();
      for (var i = 0; i < items.length; i++) {
        if (!items[i].product_id) continue;
        var prRes = await fetch(URL + '/rest/v1/products?id=eq.' + items[i].product_id + '&select=qty', { headers: sbHeaders });
        var pr = (await prRes.json())[0];
        if (pr && pr.qty !== null && pr.qty !== undefined) await fetch(URL + '/rest/v1/products?id=eq.' + items[i].product_id, { method: 'PATCH', headers: sbHeaders, body: JSON.stringify({ qty: Math.max(0, pr.qty - items[i].qty) }) });
      }
    } catch (e) { /* non-fatal */ }

    res.status(200).json({ ok: true, status: 'paid', ref: order.ref, amount: tx.amount / 100, channel: tx.channel, paid_at: tx.paid_at });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Verification error: ' + (e && e.message) });
  }
};
