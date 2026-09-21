# Serverless functions (deployed automatically by Vercel)

| File | Purpose |
|---|---|
| `paystack-verify.js` | Verifies a Paystack transaction with the **secret** key and marks the matching order `paid` in Supabase using the **service-role** key. Rejects anything that is not a successful charge for the exact order total. |

Required environment variables (Vercel → Project → Settings → Environment Variables):

```
PAYSTACK_SECRET_KEY        = sk_test_… or sk_live_…
SUPABASE_URL               = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY  = eyJ…  (Project Settings → API → service_role)
```

None of these ever appear in the browser. Without them the endpoint returns `503` and checkout shows a clear "payments not configured" message instead of a fake confirmation.
