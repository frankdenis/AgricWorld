# Stripe backend (optional)

The static site can take card payments two ways:

1. **Payment Link (no server)** – create a link in Stripe Dashboard → *Payment Links*, paste it into
   `assets/js/config.js` → `stripePaymentLink`. Simplest option.
2. **Checkout Sessions (dynamic cart totals)** – `api/stripe-checkout.js` deploys automatically on Vercel.
   In Vercel → Project → Settings → Environment Variables add `STRIPE_SECRET_KEY` (sk_…) and
   `ALLOWED_ORIGIN` (your site URL), redeploy, then set `checkoutEndpoint: '/api/stripe-checkout'`
   in `assets/js/config.js`.

Only the **publishable** key (`pk_…`) may appear in `assets/js/config.js`.
The **secret** key (`sk_…`) must only ever be an environment variable on the server.
