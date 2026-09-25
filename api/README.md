# Serverless functions (deployed automatically by Vercel)

| File | Purpose |
|---|---|
| `paystack-verify.js` | Verifies a Paystack transaction with the **secret** key and marks the matching order `paid` in Supabase using the **service-role** key. Rejects anything that is not a successful charge for the exact order total. |
| `stripe-checkout.js` | Creates a Stripe Checkout Session for an existing `pending_payment` order. Amount/line items come from the database, not the browser. Returns the hosted page URL. |
| `stripe-verify.js` | On return from Stripe, retrieves the session with the secret key, checks paid / same order / same amount / same currency, then marks the order paid. |
| `stripe-webhook.js` | Verifies the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET` and settles the order on `checkout.session.completed` / `…async_payment_succeeded`. |
| `_lib/orders.js` | Shared helpers (underscore prefix → not deployed as a function). |

Required environment variables (Vercel → Project → Settings → Environment Variables):

```
PAYSTACK_SECRET_KEY        = sk_test_… or sk_live_…   (Paystack)
STRIPE_SECRET_KEY          = sk_test_51… or sk_live_51…   (Stripe, optional)
STRIPE_WEBHOOK_SECRET      = whsec_…   (Stripe webhook signing secret, optional)
SUPABASE_URL               = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY  = eyJ…  (Project Settings → API → service_role)
```

None of these ever appear in the browser. Without them the endpoint returns `503` and checkout shows a clear "payments not configured" message instead of a fake confirmation.


## `ai.js` — AgricWorld AI (optional language model)

`GET /api/ai` → `{ configured: true|false }` · `POST /api/ai { messages, context }` → `{ ok, reply }`

The assistant in the browser (`assets/js/ai.js`) always answers from the live catalogue. When
`AI_API_KEY` is set in Vercel (plus optional `AI_MODEL`, default `gpt-4o-mini`, and `AI_BASE_URL`
for any OpenAI-compatible provider such as OpenAI, Groq, Together, OpenRouter or DeepSeek) the reply
text is written by the model, which receives the matching listings as context and is instructed to
answer only from them. No key → `503` and the built-in engine keeps answering.
