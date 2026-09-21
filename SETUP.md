# AgricWorld — Go-live setup (≈ 15 minutes)

The site is a static front-end (Vercel) + **Supabase** (accounts, products, orders, messages) + **Paystack** (payments). Three keys go in one public file, three secrets go in Vercel. Nothing else to install.

---

## 1 · Supabase (database & accounts) — free

1. Go to <https://supabase.com> → **New project**. Name: `agricworld`, region: closest to Nigeria (e.g. *West EU / London*). Save the database password somewhere safe.
2. Left menu → **SQL Editor** → **New query** → paste the whole of `supabase/schema.sql` → **Run**. (Creates all tables, security rules, storage bucket and the owner rule.)
3. *(Optional)* Same place, paste `supabase/seed.sql` → **Run** to launch with the 27 example companies and 128 listings. Skip it for an empty marketplace.
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
| `PAYSTACK_SECRET_KEY` | `sk_test_…` / `sk_live_…` |
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
| Checkout → *Send order request* | Order appears as *Requested*; seller can Accept/Decline |
| Product page → write a review | Rating updates on cards |
| Contact form | Message lands in Admin → Contact inbox |

## Going live

- Switch `paystackPublicKey` to `pk_live_…` and `PAYSTACK_SECRET_KEY` to `sk_live_…`.
- Turn **Confirm email** back on in Supabase Auth.
- Paystack settles card payments to the bank account on your Paystack business; pay sellers from there after fulfilment (the admin *Orders* screen shows what is paid and to whom it belongs).

## How payment confirmation stays honest

The browser never marks an order paid. After Paystack reports success, the site calls `/api/paystack-verify`, which asks Paystack's API (with your secret key) whether that reference is a **successful charge for exactly the order total in NGN**, and only then updates the order using the service-role key. A database trigger blocks any other path to `status = 'paid'`.
