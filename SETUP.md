# AgricWorld — Go-live setup (≈ 15 minutes)

The site is a static front-end (Vercel) + **Supabase** (accounts, products, orders, messages) + **Paystack** (Nigerian payments) + **Stripe** (international cards). Three keys go in one public file, the secrets go in Vercel. Nothing else to install.

---

## 1 · Supabase (database & accounts) — free

1. Go to <https://supabase.com> → **New project**. Name: `agricworld`, region: closest to Nigeria (e.g. *West EU / London*). Save the database password somewhere safe.
2. Left menu → **SQL Editor** → **New query** → paste the whole of `supabase/schema.sql` → **Run**. (Creates all tables, security rules, storage bucket and the owner rule.)
3. *(Optional)* Same place, paste `supabase/seed.sql` → **Run** to launch with the full starter catalogue (200+ companies, 1,200+ listings across all 26 sectors, each with real photography). Skip it for an empty marketplace. If your database was created before the XXL catalogue, run `supabase/catalogue.sql` first (adds the sub-category column).
4. Left menu → **Authentication → Providers → Email**: keep *Enable email provider* ON.
   - For instant sign-ups without email confirmation, turn **Confirm email** OFF. (Turn it back on later for production.)
5. **Authentication → URL Configuration**: set *Site URL* to your live URL (e.g. `https://agricworld.vercel.app`) and add the same URL under *Redirect URLs*.
6. **Project Settings → API**: copy
   - **Project URL** → `supabaseUrl`
   - **anon public** key → `supabaseAnonKey`
   - **service_role** key → keep for step 3 (secret — never put it in the site).

## 2 · Paystack (payments) — free to start

1. <https://dashboard.paystack.com> → create/sign in to your business.
2. **Settings → API Keys & Webhooks**:
   - **Public key** (`pk_test_…` now, `pk_live_…` when you go live) → `paystackPublicKey`
   - **Secret key** (`sk_…`) → keep for step 3 (secret).
3. Test cards for `pk_test_`: `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.

## 2b · Stripe (international cards) — optional

Stripe lets buyers abroad pay with Visa/Mastercard/Amex, Apple Pay and Google Pay on Stripe's hosted page. Your Stripe account must be registered in a [Stripe-supported country](https://stripe.com/global) to receive payouts (Nigeria is not supported yet — test mode still works everywhere).

1. <https://dashboard.stripe.com> → **Developers → API keys** → copy the **Secret key** (`sk_test_…` / `sk_live_…`) → keep for step 3. *(The publishable key is not needed — the site uses Stripe Checkout redirect.)*
2. **Developers → Webhooks → Add endpoint**
   - Endpoint URL: `https://agric-world.vercel.app/api/stripe-webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
   - After saving, click **Reveal** under *Signing secret* → `whsec_…` → keep for step 3.
3. If your Supabase database was created **before** Stripe support was added, run `supabase/stripe.sql` once in the SQL editor.
4. **Verified Business Program:** run `supabase/verification.sql` once in the SQL editor. It creates the `verification_tiers`, `verification_applications` and `verification_payments` tables. Tier names, prices, application fees, durations and renewal prices are all edited by the owner in **Admin → Verification tiers** — nothing is hard-coded, and paying a fee never grants the badge automatically (the owner approves every application).
4. Test card for `sk_test_`: `4242 4242 4242 4242`, any future expiry, any CVC.
5. To hide the Stripe option, set `stripeEnabled: false` in `assets/js/config.js`. Charges are made in the order currency (`NGN`); if your Stripe account cannot present NGN, tell us and we switch the charge currency.

## 3 · Put the keys in place

**Public keys** → edit `assets/js/config.js`:

```js
supabaseUrl: 'https://xxxx.supabase.co',
supabaseAnonKey: 'eyJhbGciOi…',
paystackPublicKey: 'pk_test_…',
whatsapp: '2349126480004',
contactEmail: 'frankdenis607@gmail.com',
```

**Secret keys** → Vercel → your project → **Settings → Environment Variables** (all three, *Production* + *Preview*):

| Name | Value |
|---|---|
| `PAYSTACK_SECRET_KEY` | Paystack `sk_test_…` / `sk_live_…` |
| `STRIPE_SECRET_KEY` | Stripe `sk_test_51…` / `sk_live_51…` *(optional)* |
| `STRIPE_WEBHOOK_SECRET` | Stripe `whsec_…` *(optional, with the above)* |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the *service_role* key |

Redeploy after adding them (Deployments → ⋯ → Redeploy).

## 4 · Become the owner

Register on the site with **frankdenis607@gmail.com** (any password ≥ 8 characters). That email is listed in `schema.sql` → `owner_emails()`, so the account is created with the `admin` role automatically. The **Admin console** appears at `#/admin` and in your account menu. Nobody else can obtain admin rights except through your console (Users → role).

To add another owner email, edit `owner_emails()` in `schema.sql` and re-run just that function, or change the role in Admin → Users.

## 5 · Check it works

| Test | Expected |
|---|---|
| Register a buyer, sign out, sign in | Works; profile shows in *My Account* |
| Register a seller → set up storefront → add product with a photo | Product appears in the marketplace immediately |
| Buyer: add to cart → checkout → *Pay with Paystack* (test card) | Paystack window → success → **"Payment confirmed"** with reference; order shows *Paid* for buyer, seller and admin |
| Close the Paystack window without paying | Message says nothing was charged; order stays *Awaiting payment* |
| Buyer: checkout → *International card* (Stripe test card `4242…`) | Redirect to Stripe → back to **"Payment confirmed"**; order shows *Paid* with method *Stripe* |
| Click **←** / cancel on the Stripe page | Back at checkout with "Card payment was cancelled — nothing was charged" |
| Checkout → *Send order request* | Order appears as *Requested*; seller can Accept/Decline |
| Product page → write a review | Rating updates on cards |
| Contact form | Message lands in Admin → Contact inbox |

## Going live

- Switch `paystackPublicKey` to `pk_live_…` and `PAYSTACK_SECRET_KEY` to `sk_live_…`.
- Stripe: switch `STRIPE_SECRET_KEY` to `sk_live_…` and create the webhook again in **live** mode (new `whsec_…`).
- Turn **Confirm email** back on in Supabase Auth.
- Paystack settles card payments to the bank account on your Paystack business; pay sellers from there after fulfilment (the admin *Orders* screen shows what is paid and to whom it belongs).

## How payment confirmation stays honest

The browser never marks an order paid. After Paystack reports success, the site calls `/api/paystack-verify`, which asks Paystack's API (with your secret key) whether that reference is a **successful charge for exactly the order total in NGN**, and only then updates the order using the service-role key. A database trigger blocks any other path to `status = 'paid'`.

Stripe works the same way twice over: the amount is read from the database (never from the browser) when `/api/stripe-checkout` creates the hosted session; on return `/api/stripe-verify` retrieves the session with your secret key and checks *paid · same order · same amount · same currency*; and `/api/stripe-webhook` (signature-verified) settles the order even if the buyer never comes back.


## Optional: AgricWorld AI language model

The AI concierge works out of the box from the catalogue. To have a language model write its
replies, add to Vercel → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `AI_API_KEY` | your provider key (OpenAI `sk-…`, Groq `gsk_…`, OpenRouter, DeepSeek …) |
| `AI_MODEL` | optional, default `gpt-4o-mini` (e.g. `llama-3.3-70b-versatile` on Groq) |
| `AI_BASE_URL` | optional, default `https://api.openai.com/v1` (e.g. `https://api.groq.com/openai/v1`) |

Redeploy; the assistant header changes to “Language model + N live listings”.
