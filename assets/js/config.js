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
  /* Optional: URL of your own backend/serverless function that creates Stripe Checkout Sessions
     (this is where the SECRET key lives — on the server, never in the browser). */
  checkoutEndpoint: ''
};
