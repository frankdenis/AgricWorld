/* AgricWorld — Stripe Checkout Session creator (server side).
   Deploy as a Vercel / Netlify / Cloudflare function and set AW_CONFIG.checkoutEndpoint to its URL.
   Your STRIPE SECRET KEY lives ONLY here, in an environment variable — never in the static site.

   Env vars:  STRIPE_SECRET_KEY=sk_live_…   ALLOWED_ORIGIN=https://<user>.github.io   */
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { items = [], shipping = 0, fee = 0, email, success_url, cancel_url } = req.body || {};
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
    const line_items = items.map(i => ({
      quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
      price_data: { currency: i.currency || 'ngn', unit_amount: Math.max(50, parseInt(i.unit_amount, 10)), product_data: { name: String(i.name).slice(0, 120) } }
    }));
    if (shipping > 0) line_items.push({ quantity: 1, price_data: { currency: 'ngn', unit_amount: shipping, product_data: { name: 'Delivery' } } });
    if (fee > 0) line_items.push({ quantity: 1, price_data: { currency: 'ngn', unit_amount: fee, product_data: { name: 'Escrow & protection fee' } } });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', line_items, customer_email: email || undefined,
      success_url: success_url || process.env.ALLOWED_ORIGIN, cancel_url: cancel_url || process.env.ALLOWED_ORIGIN
    });
    res.status(200).json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
