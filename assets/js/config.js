/* ═══════════════════════════════════════════════════════════════
   AgricWorld — public configuration
   Everything in this file is safe to publish. Secret keys (Paystack
   SECRET key, Supabase SERVICE ROLE key) go ONLY into Vercel
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
