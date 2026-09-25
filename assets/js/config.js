/* ═══════════════════════════════════════════════════════════════
   AgricWorld — public configuration
   Everything in this file is safe to publish. Secret keys (Paystack SECRET key,
   Stripe SECRET key + webhook secret, Supabase SERVICE ROLE key) go ONLY into Vercel
   environment variables — see SETUP.md.
   ═══════════════════════════════════════════════════════════════ */
window.AW_CONFIG = {
  siteName: 'AgricWorld',
  currency: 'NGN',

  /* ── Supabase (database + accounts) ──
     Project Settings → API → Project URL and "anon public" key. */
  supabaseUrl: '',
  supabaseAnonKey: '',

  /* ── Paystack (payments) ──
     Settings → API Keys & Webhooks → PUBLIC key (pk_test_… / pk_live_…). */
  paystackPublicKey: '',

  /* Serverless endpoint that verifies a payment with Paystack before an order is marked paid.
     Deployed automatically with the site on Vercel (api/paystack-verify.js). */
  verifyEndpoint: '/api/paystack-verify',

  /* ── Stripe (international cards, Apple Pay / Google Pay) ──
     Nothing secret goes here: the buyer is redirected to Stripe's hosted page by
     api/stripe-checkout.js, which uses STRIPE_SECRET_KEY from Vercel env vars.
     Set to false to hide the Stripe option at checkout. */
  stripeEnabled: true,
  stripeCheckoutEndpoint: '/api/stripe-checkout',
  stripeVerifyEndpoint: '/api/stripe-verify',

  /* ── AgricWorld AI ──
     The assistant always answers from the live catalogue in the browser. To let a
     language model write the replies, add AI_API_KEY (and optionally AI_MODEL,
     AI_BASE_URL) to Vercel env vars — api/ai.js detects it automatically. */
  aiEndpoint: '/api/ai',

  /* ── Real contact channels (order requests, enquiries, support) ── */
  whatsapp: '2349126480004',          /* international format, digits only */
  phoneDisplay: '+234 912 648 0004',
  contactEmail: 'frankdenis607@gmail.com',
  address: 'Lagos, Nigeria',

  /* ── Commercial policy (shown to buyers exactly as configured) ── */
  serviceFeePct: 0,                   /* % added at checkout; 0 = none */
  freeDeliveryAbove: 500000,          /* ₦ — informational; delivery is arranged with the seller */
  disputeWindowHours: 48
};
