# AgricWorld — Everything Agriculture. One Powerful Marketplace.

A premium, animated, fully responsive agricultural marketplace and digital ecosystem for Nigeria / Africa.
Zero dependencies — pure HTML, CSS and vanilla JavaScript. Deploys to GitHub Pages automatically.

## Highlights
- **Cinematic homepage** – Ken-Burns hero, parallax, particles, animated gradient light, floating glass info cards, animated headline, live market ticker.
- **22 sectors** – Poultry, Livestock, Fisheries, Crops, Seeds, Agrochemicals, Veterinary, Equipment, Machinery, Fertilizers, Animal Feed, Fruits & Vegetables, Farm Produce, Processing, Storage, Irrigation, Greenhouse, Agri-Tech, Logistics, Transportation, Advisory, Services — each with its own colour, icon, photography, sub-categories and themed sector page.
- **Marketplace** – 128 curated products with real photography, sector/price/rating/stock/verified filters, sort, grid/list view, pagination, wishlist, quick-view, cart drawer, checkout with escrow flow.
- **Company directory** – verified agribusiness profiles with products, services, followers, follow & contact.
- **Three dashboards** – Buyer, Seller (14 sections) and Admin console (15 sections) with glass KPI cards, count-up statistics, animated SVG line/bar/donut charts, tables, chat, wallet/earnings, verification queue and settings.
- **Light & dark theme** with animated transition, leaf loading animation, page transitions, scroll-reveal, micro-interactions, ripple buttons, toast notifications.
- **Mobile-first** – bottom navigation, slide-in drawer, swipeable card rows, mobile dashboard tabs.
- **Performance & accessibility** – lazy images, GPU-friendly transforms, local self-hosted fonts, `prefers-reduced-motion` respected, keyboard-friendly.

## Structure
```
index.html                 app shell
assets/css/app.css         design system, components, themes, responsive rules
assets/js/icons.js         inline SVG icon set (Lucide)
assets/js/data.js          sectors, companies, products, orders, messages (demo data)
assets/js/app.js           core: state, router, theme, cart, auth, shell, shared cards
assets/js/pages.js         public pages (home, sectors, marketplace, product, companies, checkout…)
assets/js/config.js        public config (Stripe publishable key / payment link)
assets/js/dashboards.js    buyer / seller dashboards + SVG charts
assets/js/admin.js         admin console (loaded only by /admin/)
admin/                     owner-only admin entry: gate.js (passphrase check), config.js (hash)
server/                    optional Stripe Checkout serverless function (secret key lives here)
assets/img/                optimised photography (sectors, heroes, backgrounds)
assets/fonts/              Plus Jakarta Sans, Manrope (woff2)
.github/workflows/         GitHub Pages deployment
```

## Run locally
Any static server works:
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Accounts
Customers sign in with any name/email (demo mode). Picking the “Seller / Company” role opens the Seller dashboard.
Customers never see or load the admin console.

## Admin console (owner only)
The admin console lives at **`/admin/`** (e.g. `https://<you>.github.io/AgricWorld-/admin/`) and is not linked anywhere on the public site.
It is protected by a passphrase: only a salted **PBKDF2-SHA256 hash** is stored in `admin/config.js`, verified in-browser with WebCrypto.
Sessions last 8 hours; 5 wrong attempts trigger a 30-second lock.

**Change the passphrase:** open `/admin/` → *Generate new passphrase hash* → paste the `salt`/`hash` into `admin/config.js` → commit.

## Stripe payments
Configure in `assets/js/config.js` (safe, public values only):
- `stripePaymentLink` – a Stripe Payment Link; card checkout redirects to Stripe hosted checkout. No server needed.
- `stripePublishableKey` – your `pk_…` key (publishable keys are meant to be public).
- `checkoutEndpoint` – optional URL of `server/stripe-checkout.js` deployed as a serverless function; this is the **only** place your `sk_…` secret key may exist (as an environment variable). See `server/README.md`.

> Never commit a Stripe **secret** key. A static GitHub Pages site cannot keep secrets — anything in the repo is public.

## Deploy
Push to `main` — the included workflow publishes the site to GitHub Pages (enable *Settings → Pages → Source: GitHub Actions*).
