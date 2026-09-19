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
assets/js/dashboards.js    buyer / seller / admin dashboards + SVG charts
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

## Demo accounts
Sign in with any name/email. Use an email starting with `admin@` to open the Admin console; pick the “Seller / Company” role to open the Seller dashboard.

## Deploy
Push to `main` — the included workflow publishes the site to GitHub Pages (enable *Settings → Pages → Source: GitHub Actions*).
