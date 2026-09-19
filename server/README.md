# Stripe backend (optional)

The static site can take card payments two ways:

1. **Payment Link (no server)** – create a link in Stripe Dashboard → *Payment Links*, paste it into
   `assets/js/config.js` → `stripePaymentLink`. Simplest option.
2. **Checkout Sessions (dynamic cart totals)** – deploy `stripe-checkout.js` as a serverless function
   (Vercel: put it in `api/`, Netlify: `netlify/functions/`) with env var `STRIPE_SECRET_KEY`,
   then set `checkoutEndpoint` in `assets/js/config.js` to the function URL.

Only the **publishable** key (`pk_…`) may appear in `assets/js/config.js`.
The **secret** key (`sk_…`) must only ever be an environment variable on the server.
