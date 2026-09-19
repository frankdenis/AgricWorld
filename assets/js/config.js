/* AgricWorld public configuration — everything here is safe to be public.
   NEVER put a Stripe SECRET key (sk_live_/sk_test_) in this file or anywhere on the site. */
window.AW_CONFIG = {
  siteName: 'AgricWorld',
  currency: 'NGN',
  /* Stripe PUBLISHABLE key (pk_live_… or pk_test_…). Publishable keys are designed to be public. */
  stripePublishableKey: '',
  /* A Stripe Payment Link (https://buy.stripe.com/…). Lets customers pay by card without a server.
     Create one in Stripe Dashboard → Payment Links. Leave empty to keep the demo/escrow flow only. */
  stripePaymentLink: '',
  /* Optional: set to '/api/stripe-checkout' after adding STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables.
     The secret key lives only there — on the server, never in the browser. */
  checkoutEndpoint: ''
};
