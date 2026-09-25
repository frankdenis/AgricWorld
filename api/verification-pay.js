/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Verified Business Program payment confirmation (Vercel serverless)
   POST /api/verification-pay  { reference, payment_id }

   Confirms a Paystack charge for a verification_payments row and marks THAT
   PAYMENT paid. It never touches companies.ver: a paid fee only lets the
   application proceed to human review. Only an admin decision grants the badge.
   Env: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ═══════════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  var SK = process.env.PAYSTACK_SECRET_KEY, URL = process.env.SUPABASE_URL, SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SK || !URL || !SRK) { res.status(503).json({ ok: false, error: 'Payment confirmation is not configured on the server yet.' }); return; }
  var body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  var reference = String(body.reference || '').trim(), payId = parseInt(body.payment_id, 10);
  if (!reference || !payId) { res.status(400).json({ ok: false, error: 'reference and payment_id are required' }); return; }
  var h = { apikey: SRK, Authorization: 'Bearer ' + SRK, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  try {
    var rows = await (await fetch(URL + '/rest/v1/verification_payments?id=eq.' + payId + '&select=id,amount,currency,status,reference,application_id', { headers: h })).json();
    var pay = Array.isArray(rows) && rows[0];
    if (!pay) { res.status(404).json({ ok: false, error: 'Payment record not found' }); return; }
    if (pay.status === 'paid') { res.status(200).json({ ok: true, status: 'paid', already: true }); return; }
    var p = await (await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), { headers: { Authorization: 'Bearer ' + SK } })).json();
    var tx = p && p.data;
    if (!p.status || !tx) { res.status(402).json({ ok: false, error: (p && p.message) || 'Paystack could not verify this reference' }); return; }
    if (tx.status !== 'success') { res.status(402).json({ ok: false, error: 'Payment not successful (' + tx.status + ')' }); return; }
    if (Number(tx.amount) < Math.round(Number(pay.amount) * 100)) { res.status(402).json({ ok: false, error: 'Paid amount does not match the fee' }); return; }
    if (String(tx.currency).toUpperCase() !== String(pay.currency || 'NGN').toUpperCase()) { res.status(402).json({ ok: false, error: 'Currency mismatch' }); return; }
    var meta = tx.metadata || {};
    if (meta.payment_id && parseInt(meta.payment_id, 10) !== payId) { res.status(402).json({ ok: false, error: 'This payment belongs to a different record' }); return; }
    var u = await fetch(URL + '/rest/v1/verification_payments?id=eq.' + payId, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'paid', reference: reference, paid_at: new Date(tx.paid_at || Date.now()).toISOString() }) });
    if (!u.ok) { res.status(500).json({ ok: false, error: 'Verified with Paystack but could not record the payment. Contact support with reference ' + reference }); return; }
    if (pay.application_id) {
      try { await fetch(URL + '/rest/v1/verification_history', { method: 'POST', headers: h, body: JSON.stringify({ application_id: pay.application_id, action: 'payment_received', note: reference + ' · ' + (tx.amount / 100) + ' ' + tx.currency }) }); } catch (e) { /* non-fatal */ }
    }
    res.status(200).json({ ok: true, status: 'paid', amount: tx.amount / 100, paid_at: tx.paid_at });
  } catch (e) { res.status(500).json({ ok: false, error: 'Confirmation error: ' + (e && e.message) }); }
};
