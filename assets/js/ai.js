/* ═══════════════════════════════════════════════════════════════
   AgricWorld AI — marketplace concierge (UNTHETICAL design language)
   • Answers from the REAL catalogue (products, companies, sectors, policies).
   • If /api/ai is configured (AI_API_KEY in Vercel) the reply text comes from a
     language model that is given the matching listings as context; results are
     always the live listings themselves.
   • Also ships the UNTHETICAL brand page (#/unthetical) with the story generator.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var A = window.AW; if (!A) return;
  var $ = A.$, ic = A.ic, esc = A.esc, money = A.money, C = window.AW_CONFIG || {};
  function D() { return A.D; }

  /* ── brand mark: an eye inside a broken circle ── */
  function eye(size, cls) {
    return '<span class="ut-eye ' + (cls || '') + '" style="width:' + (size || 40) + 'px;height:' + (size || 40) + 'px"><svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle class="ring" cx="32" cy="32" r="27" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="118 52" />' +
      '<path class="lid" d="M12 32c6-9 12.5-13.5 20-13.5S46 23 52 32c-6 9-12.5 13.5-20 13.5S18 41 12 32Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle class="iris" cx="32" cy="32" r="7" fill="currentColor"/><circle class="glint" cx="34.5" cy="29.5" r="2" fill="#0b0c14"/></svg></span>';
  }
  A.eyeLogo = eye;

  /* ───────────────── catalogue engine ───────────────── */
  var STATES = ['Lagos', 'Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti', 'Kwara', 'Kogi', 'Niger', 'Benue', 'Plateau', 'Nasarawa', 'FCT', 'Abuja', 'Kano', 'Kaduna', 'Katsina', 'Sokoto', 'Kebbi', 'Jigawa', 'Bauchi', 'Gombe', 'Adamawa', 'Borno', 'Yobe', 'Taraba', 'Enugu', 'Anambra', 'Abia', 'Imo', 'Ebonyi', 'Rivers', 'Delta', 'Edo', 'Cross River', 'Akwa Ibom', 'Bayelsa', 'Ibadan', 'Abeokuta', 'Jos', 'Makurdi', 'Onitsha', 'Aba', 'Owerri', 'Port Harcourt', 'Calabar', 'Uyo', 'Benin', 'Asaba', 'Akure', 'Ilorin', 'Zaria', 'Minna', 'Ikorodu', 'Epe'];
  var STOP = { the: 1, a: 1, an: 1, i: 1, want: 1, need: 1, to: 1, buy: 1, find: 1, show: 1, me: 1, some: 1, for: 1, of: 1, in: 1, at: 1, near: 1, please: 1, can: 1, you: 1, get: 1, is: 1, are: 1, there: 1, any: 1, do: 1, have: 1, looking: 1, price: 1, prices: 1, cost: 1, how: 1, much: 1, cheap: 1, cheapest: 1, best: 1, good: 1, quality: 1, under: 1, below: 1, less: 1, than: 1, and: 1, or: 1, with: 1, from: 1, sell: 1, sells: 1, selling: 1, seller: 1, sellers: 1, supplier: 1, suppliers: 1, company: 1, companies: 1, farm: 1, farms: 1, verified: 1, list: 1, listings: 1, products: 1, product: 1, what: 1, which: 1, where: 1, who: 1, my: 1, on: 1, agricworld: 1, ai: 1, hi: 1, hello: 1, hey: 1 };
  function tokens(s) { return s.toLowerCase().replace(/[^a-z0-9₦\s-]/g, ' ').split(/\s+/).filter(function (w) { return w && !STOP[w]; }); }
  function stem(w) { return w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '') : w; }
  var ALIAS = { poultry: 'chick chicks broiler broilers layer layers pullet pullets hen hens turkey turkeys duck ducks egg eggs hatchery brooder', livestock: 'cattle cow cows bull bulls goat goats sheep ram rams pig pigs piglet piglets rabbit rabbits snail snails grasscutter beef', fisheries: 'fish catfish tilapia fingerling fingerlings juvenile juveniles pond ponds smoked aquaculture hatchling', crops: 'maize corn rice cassava yam yams sorghum millet soybean soybeans soya beans cowpea groundnut groundnuts wheat grain grains sesame ginger', seeds: 'seed seeds seedling seedlings cuttings stems hybrid', agrochem: 'herbicide herbicides pesticide pesticides insecticide insecticides fungicide fungicides glyphosate weed chemicals', vet: 'vaccine vaccines vaccination antibiotic antibiotics dewormer drug drugs medicine veterinary vet syringe', equipment: 'sprayer sprayers knapsack incubator incubators pump pumps tools wheelbarrow cutlass hoe dryer', machinery: 'tractor tractors harvester harvesters combine plough ploughs planter thresher sheller mill milling', fertilizer: 'fertilizer fertilizers fertiliser npk urea manure compost potash dap organic', feed: 'feed feeds mash pellet pellets concentrate premix starter grower finisher maize-bran', fruits: 'tomato tomatoes pepper peppers onion onions vegetable vegetables fruit fruits plantain banana bananas orange oranges pineapple pineapples mango mangoes watermelon cucumber cabbage carrot', produce: 'palm-oil palm oil honey cashew cocoa cassava-flour garri gari shea kernel', processing: 'processing processor milling machine oil-press press packaging dryer', storage: 'storage silo silos cold-room cold room warehouse warehousing bags hermetic', irrigation: 'irrigation drip sprinkler borehole solar-pump water', greenhouse: 'greenhouse greenhouses hydroponic hydroponics screenhouse net shade', agtech: 'drone drones sensor sensors software app iot satellite', logistics: 'logistics cold-chain delivery courier freight refrigerated', transport: 'truck trucks transport haulage lorry trailer pickup', advisory: 'consultant consulting advisory agronomist training extension soil-test', services: 'hire rental rent service services installation land clearing' };
  var ALIAS_IDX = {}; Object.keys(ALIAS).forEach(function (k) { ALIAS[k].split(' ').forEach(function (w) { ALIAS_IDX[w] = k; }); });
  function parse(q) {
    var d = D(), lower = q.toLowerCase(), out = { q: q, sector: null, sub: null, state: null, max: null, verified: /verified|trusted/.test(lower), cheap: /cheap|cheapest|lowest|affordable|budget/.test(lower), intent: 'find' };
    d.sectors.forEach(function (s) { var names = [s.name, s.short].concat(s.subs || []); names.forEach(function (n) { if (n && lower.indexOf(n.toLowerCase()) > -1) { if (!out.sector || n.length > out.sector.hit.length) out.sector = { id: s.id, hit: n }; if ((s.subs || []).indexOf(n) > -1) out.sub = n; } }); });
    if (!out.sector) { var hitW = q.toLowerCase().replace(/[^a-z\- ]/g, ' ').split(/\s+/).map(function (w) { return ALIAS_IDX[w] || ALIAS_IDX[w.replace(/s$/, '')]; }).filter(function (k) { return k && d.secMap[k]; }); if (hitW.length) out.sector = { id: hitW[0], hit: '', alias: true }; }
    STATES.forEach(function (st) { if (new RegExp('\\b' + st.toLowerCase() + '\\b').test(lower)) out.state = st === 'Abuja' ? 'FCT' : st === 'Benin' ? 'Edo' : st; });
    var m = lower.match(/(?:under|below|less than|max|maximum|budget(?: of)?|not more than|<)\s*₦?\s*n?([\d,.]+)\s*(k|m|million|thousand)?/); if (m) { var v = parseFloat(m[1].replace(/,/g, '')); if (m[2] === 'k' || m[2] === 'thousand') v *= 1000; if (m[2] === 'm' || m[2] === 'million') v *= 1e6; out.max = v; }
    if (/^(hi|hello|hey|good (morning|afternoon|evening)|sannu|bawo|kedu)\b/.test(lower)) out.intent = 'greet';
    else if (/\b(most listings|how many (products|listings|sellers|companies)|per sector|biggest sector|statistics|stats)\b/.test(lower)) out.intent = 'stats';
    else if (/\b(without verification|unverified|not verified)\b/.test(lower)) out.intent = 'unverified';
    else if (/\b(get verified|verification|verify my|blue badge|verified badge)\b/.test(lower)) out.intent = 'verify';
    else if (/\b(tips?|sell faster|more sales|improve my listing|rank higher)\b/.test(lower)) out.intent = 'tips';
    else if (/\b(price|prices|cost|how much|rate|rates|₦)\b/.test(lower)) out.intent = 'price';
    else if (/\b(seller|sellers|supplier|suppliers|company|companies|farms?|vendor|hatchery|who sells)\b/.test(lower)) out.intent = 'companies';
    else if (/\b(sector|sectors|categories|category|what can i (buy|find)|what do you (sell|have))\b/.test(lower)) out.intent = 'sectors';
    else if (/\b(cart|checkout|pay|payment|paystack|stripe|card|transfer|ussd)\b/.test(lower)) out.intent = 'payment';
    else if (/\b(deliver|delivery|shipping|ship|transport|logistics|how long)\b/.test(lower) && !out.sector) out.intent = 'delivery';
    else if (/\b(sell on|become a seller|register|sign ?up|open (a )?store|list my|start selling|seller account)\b/.test(lower)) out.intent = 'sell';
    else if (/\b(refund|dispute|scam|fake|complain|problem|issue|return)\b/.test(lower)) out.intent = 'dispute';
    else if (/\b(contact|whatsapp|call|phone|email|support|human|agent)\b/.test(lower)) out.intent = 'contact';
    else if (/\b(order|orders|track|tracking|my account|dashboard|wishlist|favourites)\b/.test(lower)) out.intent = 'account';
    else if (/\b(unthetical|who (made|designed) you|what are you)\b/.test(lower)) out.intent = 'about';
    var stLow = (out.state || '').toLowerCase();
    out.label = tokens(q).filter(function (w) { return !/^[₦\d]/.test(w) && w !== stLow && w !== 'k' && w !== 'm' && !(out.sector && out.sector.hit && out.sector.hit.toLowerCase().indexOf(w) > -1); });
    out.words = out.label.filter(function (w) { return (!out.sector || !out.sector.hit || out.sector.hit.toLowerCase().indexOf(w) < 0) && !(out.sector && out.sector.alias && (ALIAS_IDX[w] === out.sector.id || ALIAS_IDX[w.replace(/s$/, '')] === out.sector.id)); }).map(stem);
    return out;
  }
  function score(p, P) {
    var hay = (p.name + ' ' + (p.sub || '') + ' ' + p.seller + ' ' + (p.desc || '') + ' ' + Object.keys(p.specs || {}).join(' ') + ' ' + Object.values(p.specs || {}).join(' ')).toLowerCase();
    var name = p.name.toLowerCase(), s = 0;
    P.words.forEach(function (w) { if (name.indexOf(w) > -1) s += 3; else if (hay.indexOf(w) > -1) s += 1; });
    if (P.sector && p.sec === P.sector.id) s += 2; if (P.sub && p.sub === P.sub) s += 3;
    if (P.state && (p.loc || '').indexOf(P.state) > -1) s += 2;
    if (P.verified && p.ver) s += 1;
    return s;
  }
  function search(P, n) {
    var d = D(), list = d.products.filter(function (p) {
      if (P.sector && p.sec !== P.sector.id) return false; if (P.sub && p.sub !== P.sub) return false;
      if (P.state && (p.loc || '').indexOf(P.state) < 0) return false; if (P.max && p.price > P.max) return false; if (P.verified && !p.ver) return false;
      return true;
    }).map(function (p) { return { p: p, s: score(p, P) }; });
    if (P.words.length) list = list.filter(function (x) { return x.s > (P.sector ? 2 : 0); });
    if (P.cheap) list.sort(function (a, b) { return a.p.price - b.p.price || b.s - a.s; }); else list.sort(function (a, b) { return b.s - a.s || (b.p.reviews || 0) - (a.p.reviews || 0) || a.p.price - b.p.price; });
    return list.slice(0, n || 4).map(function (x) { return x.p; });
  }
  function companies(P, n) {
    var d = D(); return d.companies.filter(function (c) { if (P.sector && c.sector !== P.sector.id) return false; if (P.state && c.loc.indexOf(P.state) < 0) return false; if (P.verified && !c.ver) return false; return true; })
      .map(function (c) { var t = (c.name + ' ' + c.desc + ' ' + (c.products || []).join(' ')).toLowerCase(); var s = P.words.reduce(function (a, w) { return a + (t.indexOf(w) > -1 ? 1 : 0); }, 0) + (c.ver ? .5 : 0); return { c: c, s: s }; })
      .filter(function (x) { return !P.words.length || x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, n || 3).map(function (x) { return x.c; });
  }
  function stats(list) { var ps = list.map(function (p) { return p.price; }).sort(function (a, b) { return a - b; }); return { min: ps[0], max: ps[ps.length - 1], med: ps[Math.floor(ps.length / 2)], n: ps.length }; }
  function link(h, t) { return '<a href="' + h + '">' + t + '</a>'; }
  function where(P) { return (P.state ? ' in ' + P.state : '') + (P.max ? ' under ' + money(P.max) : ''); }

  /* returns {text, products, companies, chips} — all from real data */
  function localAnswer(q) {
    var d = D(), P = parse(q), name = A.state.user ? A.state.user.name.split(' ')[0] : null, r = { text: '', products: [], companies: [], chips: [] };
    var wa = A.waLink(C.whatsapp, 'Hello AgricWorld, I need help with: ' + q);
    switch (P.intent) {
      case 'greet': r.text = (name ? 'Welcome back, ' + esc(name) + '. ' : 'Hello. ') + 'I know every one of the <b>' + d.products.length + ' listings</b> and <b>' + d.companies.length + ' sellers</b> on AgricWorld. Ask me for a product, a price, a seller in your state or how buying works.'; r.chips = ['Day-old chicks under ₦600', 'Price of NPK fertilizer', 'Verified fish farms in Lagos', 'How do I pay?']; return r;
      case 'sectors': r.text = 'AgricWorld covers <b>' + d.sectors.length + ' sectors</b>: ' + d.sectors.map(function (s) { return link('#/sector/' + s.id, s.short); }).join(' · ') + '. Tell me what you are looking for and I will narrow it down.'; r.chips = ['Cheapest tractors', 'Catfish juveniles in Ogun', 'Solar water pumps']; return r;
      case 'payment': r.text = 'You can pay with <b>Paystack</b> (Nigerian cards, bank transfer, USSD) or <b>Stripe</b> (international cards, Apple Pay / Google Pay). Add items to your cart, go to ' + link('#/checkout', 'checkout') + ', choose a gateway and you are redirected to the secure payment page — the order is only marked paid after the payment is verified on our server. You can also send an <b>order request</b> to the seller on WhatsApp and agree terms directly.'; r.chips = ['Open my cart', 'Is delivery included?', 'What if something goes wrong?']; return r;
      case 'delivery': r.text = 'Delivery is arranged with the seller: every listing shows its delivery window (e.g. “24–48 hrs”, “5–7 days”) and the seller\'s location, so you can pick the nearest supplier. For heavy goods use the ' + link('#/sector/transport', 'Transport') + ' and ' + link('#/sector/logistics', 'Logistics') + ' sectors — refrigerated trucks, livestock trucks and last-mile delivery are listed there.'; r.chips = ['Refrigerated trucks', 'Sellers in Kano', 'Livestock trucks']; return r;
      case 'sell': r.text = 'Selling takes about five minutes: create an account, open ' + link('#/sell', 'Sell on AgricWorld') + ', add your business profile, then publish listings with photos, price, unit and minimum order. Verified sellers (documents reviewed by our team) get the blue badge and rank higher. There is no listing fee' + (C.serviceFeePct ? '; a ' + C.serviceFeePct + '% service fee applies at checkout' : '') + '.'; r.chips = ['Open seller dashboard', 'How does verification work?']; return r;
      case 'dispute': r.text = 'Report any problem within <b>' + (C.disputeWindowHours || 48) + ' hours</b> of delivery from your ' + link('#/dashboard/orders', 'orders page') + ' and our team mediates with the seller. Pay through AgricWorld (Paystack/Stripe) rather than outside the platform so the payment record protects you. You can also reach a human on ' + link(wa, 'WhatsApp') + '.'; r.chips = ['Contact support', 'My orders']; return r;
      case 'contact': r.text = 'Talk to a human: ' + link(wa, 'WhatsApp ' + (C.phoneDisplay || '')) + ' · ' + link('mailto:' + C.contactEmail, C.contactEmail) + ' · ' + link('#/contact', 'contact form') + '. Support hours Mon–Sat.'; r.chips = ['How do I pay?', 'Become a seller']; return r;
      case 'account': r.text = A.state.user ? 'Your ' + link('#/dashboard', 'dashboard') + ' has your orders, favourites, messages and followed sellers.' : 'Sign in to see your orders, favourites and messages. ' + link('javascript:AW.openAuth(\'login\')', 'Sign in') + ' or create a free account.'; r.chips = ['My orders', 'Favourites']; return r;
      case 'stats': var bySec = d.sectors.map(function (s) { return { s: s, n: d.products.filter(function (p) { return p.sec === s.id; }).length }; }).sort(function (a, b) { return b.n - a.n; });
        r.text = '<b>' + d.products.length + '</b> live listings from <b>' + d.companies.length + '</b> sellers (' + d.companies.filter(function (c) { return c.ver; }).length + ' verified) across 22 sectors. Largest: ' + bySec.slice(0, 5).map(function (x) { return link('#/sector/' + x.s.id, x.s.short) + ' (' + x.n + ')'; }).join(', ') + '. Smallest: ' + bySec.slice(-3).map(function (x) { return x.s.short + ' (' + x.n + ')'; }).join(', ') + '.'; r.chips = ['Sellers without verification', 'Cheapest ' + bySec[0].s.short.toLowerCase(), 'What sectors do you have?']; return r;
      case 'unverified': var un = d.companies.filter(function (c) { return !c.ver; }); r.companies = un.slice(0, 3); r.text = '<b>' + un.length + '</b> of ' + d.companies.length + ' sellers are not verified yet' + (un.length ? '. Their listings still show, without the badge. First few:' : '.'); r.chips = ['How does verification work?', 'Platform statistics']; return r;
      case 'verify': r.text = 'Verification is free. From the ' + link('#/seller/verification', 'seller dashboard') + ' upload your CAC certificate (or a government ID for individual farmers), a utility bill or farm photos, and a phone number we can call. Our team reviews within 2 working days; approved sellers get the <b>blue badge</b>, rank higher in search and unlock the “verified only” filter buyers use.'; r.chips = ['Open seller dashboard', 'Tips to sell faster']; return r;
      case 'tips': r.text = 'What sells on AgricWorld: <b>real photos</b> of your own stock (3 per listing), a clear unit and minimum order, a price in line with the market (ask me “price of …”), a delivery window you can keep, fast replies on messages/WhatsApp, and verification. Update stock status weekly — buyers filter by “in stock”.'; r.chips = ['How do I get verified?', 'Price of day-old chicks', 'Open seller dashboard']; return r;
      case 'about': r.text = 'I am <b>AgricWorld AI</b> — the marketplace concierge. My design language is <b>UNTHETICAL</b> (“Reality has rules. We don\'t.”): midnight blue, silver and electric violet, an eye inside a broken circle. Unlike stories, everything I tell you here is real: live listings, real sellers, real prices. ' + link('#/unthetical', 'See the UNTHETICAL brand page') + '.'; r.chips = ['Show me the marketplace', 'Story generator']; return r;
    }
    var ps = search(P, 4), sec = P.sector ? d.secMap[P.sector.id] : null;
    if (P.intent === 'companies') {
      r.companies = companies(P, 3); r.products = ps.slice(0, 2); var relaxed = false;
      if (!r.companies.length && P.state) { r.companies = companies(Object.assign({}, P, { state: null }), 3); relaxed = r.companies.length > 0; }
      r.text = relaxed ? 'No ' + (sec ? sec.short.toLowerCase() + ' ' : '') + 'sellers registered in <b>' + P.state + '</b> yet — nearest options that deliver nationwide:' : r.companies.length ? 'Sellers' + (sec ? ' in ' + sec.short : '') + where(P) + ' — ' + r.companies.length + ' match' + (r.companies.length === 1 ? '' : 'es') + (P.verified ? ', verified' : '') + ':' : 'No seller matches that exactly. Browse the ' + link('#/companies', 'company directory') + ' or ask for a sector, e.g. “fish farms in Delta”.';
      r.chips = [sec ? 'Cheapest ' + sec.short.toLowerCase() : 'Verified sellers in Lagos', 'Sellers in Kano', 'How do I contact a seller?']; return r;
    }
    if (P.intent === 'price' && (ps.length || sec)) {
      var topSub = P.sub || (ps[0] && ps[0].sub), topSec = ps[0] ? ps[0].sec : sec.id;
      var pool = topSub ? d.products.filter(function (p) { return p.sub === topSub && p.sec === topSec && (!P.state || (p.loc || '').indexOf(P.state) > -1); }) : d.products.filter(function (p) { return p.sec === sec.id; });
      var unit = (ps[0] || pool[0] || {}).unit || ''; pool = pool.filter(function (p) { return p.unit === unit; }); var st = stats(pool.length ? pool : ps);
      r.products = ps.length ? ps : pool.slice(0, 4);
      r.text = 'Current prices for <b>' + esc(P.sub || (ps[0] && ps[0].sub) || sec.short) + '</b>' + where(P) + ': from <b>' + money(st.min) + '</b> to <b>' + money(st.max) + '</b>' + (unit ? ' ' + esc(unit) : '') + ' across ' + st.n + ' listing' + (st.n === 1 ? '' : 's') + ' (typical ' + money(st.med) + '). Lowest offers first:';
      var pl = P.sub || (ps[0] && ps[0].sub) || sec.short; r.chips = ['Verified ' + pl + ' sellers', 'Cheapest ' + pl + (P.state ? '' : ' in Lagos'), 'Show all ' + pl]; return r;
    }
    if (ps.length) {
      var lab = P.sub || (P.label.length ? P.label.join(' ') : sec ? sec.short : 'listings');
      var total = search(P, 500).length;
      r.products = ps; r.text = 'Found <b>' + total + '</b> listing' + (total === 1 ? '' : 's') + ' for <b>' + esc(lab) + '</b>' + where(P) + '. ' + (P.state ? '' : 'Add your state to see nearby sellers. ') + 'Top matches:';
      r.chips = ['Price of ' + lab, 'Verified sellers for ' + lab, total > 4 ? 'Show all ' + lab : 'Similar sectors']; return r;
    }
    if (P.state) { var P2 = Object.assign({}, P, { state: null }), ps2 = search(P2, 4); if (ps2.length) { r.products = ps2; r.text = 'Nothing matching in <b>' + P.state + '</b> right now — but these sellers ship there. ' + link('#/marketplace?q=' + encodeURIComponent(P.label.join(' ')), 'Search the marketplace') + ' for more.'; r.chips = ['Sellers in ' + P.state, 'Price of ' + (P.sub || P.label.join(' ')), 'What sectors do you have?']; return r; } }
    var near = sec ? d.products.filter(function (p) { return p.sec === sec.id; }).slice(0, 3) : [];
    r.products = near; r.text = 'I could not find that exact item' + where(P) + '. ' + (sec ? 'Here are popular ' + sec.short.toLowerCase() + ' listings instead, or browse ' + link('#/sector/' + sec.id, 'the full sector') + '.' : 'Try a product name (e.g. “point-of-lay pullets”, “urea 46%”), a sector or a state — or ' + link('#/marketplace?q=' + encodeURIComponent(q), 'search the marketplace') + '.');
    r.chips = ['What sectors do you have?', 'Cheapest maize', 'Sellers near me']; return r;
  }

  /* ───────────────── optional model backend ───────────────── */
  var remote = { checked: false, on: false };
  function checkRemote() { if (remote.checked || !C.aiEndpoint) return Promise.resolve(remote.on); remote.checked = true; return fetch(C.aiEndpoint, { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { remote.on = !!(j && j.configured); return remote.on; }).catch(function () { remote.on = false; return false; }); }
  function ctxFor(r) { return r.products.slice(0, 6).map(function (p) { return '- ' + p.name + ' | ' + money(p.price) + (p.unit || '') + ' | MOQ ' + p.moq + ' | ' + p.seller + (p.ver ? ' (verified)' : '') + ' | ' + p.loc + ' | delivery ' + p.delivery + ' | #/product/' + p.id; }).concat(r.companies.slice(0, 4).map(function (c) { return '- Seller: ' + c.name + ' | ' + c.loc + (c.ver ? ' | verified' : '') + ' | ' + (c.products || []).join(', ') + ' | #/company/' + c.id; })).join('\n'); }

  /* ───────────────── chat UI ───────────────── */
  var history = [], open = false, busy = false;
  function mount() {
    if ($('#aiLaunch')) return;
    var b = document.createElement('button'); b.id = 'aiLaunch'; b.className = 'ai-launch'; b.setAttribute('aria-label', 'Ask AgricWorld AI'); b.innerHTML = eye(30) + '<span class="ai-launch-t">Ask AI</span>'; b.onclick = function () { toggle(); }; document.body.appendChild(b);
    var p = document.createElement('div'); p.id = 'aiPanel'; p.className = 'ai-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'AgricWorld AI');
    p.innerHTML = '<div class="ai-head">' + eye(36, 'on') + '<div><b>AgricWorld AI</b><small id="aiMode">Answers from ' + D().products.length + ' live listings</small></div><button class="ai-x" onclick="AW.aiToggle(false)" aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="ai-body" id="aiBody"></div>' +
      '<form class="ai-form" id="aiForm"><input id="aiIn" autocomplete="off" placeholder="Ask for a product, price or seller…" maxlength="300"><button type="submit" aria-label="Send">' + ic('send') + '</button></form>';
    document.body.appendChild(p);
    $('#aiForm').addEventListener('submit', function (e) { e.preventDefault(); var v = $('#aiIn').value.trim(); if (v) { $('#aiIn').value = ''; ask(v); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
    p.addEventListener('click', function (e) { var l = e.target.closest('a[href^="#/"]'); if (l && window.innerWidth < 900) toggle(false); });
    window.addEventListener('hashchange', function () { if (open && window.innerWidth < 900) toggle(false); });
    if (!history.length) bot(localAnswer('hello'), true);
    checkRemote().then(function (on) { var m = $('#aiMode'); if (m && on) m.textContent = 'Language model + ' + D().products.length + ' live listings'; });
  }
  function toggle(force, prefill) {
    mount(); open = typeof force === 'boolean' ? force : !open; $('#aiPanel').classList.toggle('open', open); $('#aiLaunch').classList.toggle('on', open); document.body.classList.toggle('ai-open', open);
    if (open) { setTimeout(function () { var i = $('#aiIn'); if (i) { if (prefill) i.value = prefill; i.focus(); } }, 60); }
  }
  A.aiToggle = toggle;
  A.aiAsk = function (q) { toggle(true); ask(q); };
  function bubble(html, who) { var b = $('#aiBody'); var el = document.createElement('div'); el.className = 'ai-msg ' + who; el.innerHTML = html; b.appendChild(el); b.scrollTop = b.scrollHeight; return el; }
  function bot(r, quiet) {
    var html = '<div class="ai-txt">' + r.text + '</div>';
    if (r.companies && r.companies.length) html += '<div class="ai-cards">' + r.companies.map(function (c) { return '<a class="ai-card" href="#/company/' + c.id + '"><img src="' + c.cover + '" alt="" loading="lazy" decoding="async"><span><b>' + esc(c.name) + (c.ver ? ' ' + ic('badge-check') : '') + '</b><small>' + esc(c.loc) + ' · ' + esc((c.products || []).slice(0, 2).join(', ')) + '</small></span></a>'; }).join('') + '</div>';
    if (r.products && r.products.length) html += '<div class="ai-cards">' + r.products.map(function (p) { return '<a class="ai-card" href="#/product/' + p.id + '"><img src="' + p.img + '" alt="" loading="lazy" decoding="async"><span><b>' + esc(p.name) + '</b><small>' + money(p.price) + ' <em>' + esc(p.unit || '') + '</em> · ' + esc((p.loc || '').split(', ').pop()) + (p.ver ? ' · ' + ic('badge-check') : '') + '</small></span></a>'; }).join('') + '</div>';
    if (r.chips && r.chips.length) html += '<div class="ai-chips">' + r.chips.filter(Boolean).map(function (c) { return '<button type="button" onclick="AW.aiAsk(this.textContent)">' + esc(c) + '</button>'; }).join('') + '</div>';
    var el = bubble(html, 'bot'); if (!quiet) history.push({ role: 'assistant', content: r.text.replace(/<[^>]+>/g, '') }); return el;
  }
  function ask(q) {
    if (busy) return; busy = true;
    bubble(esc(q), 'me'); history.push({ role: 'user', content: q });
    var r = localAnswer(q);
    if (/^(open my cart|open cart)$/i.test(q)) { A.openCart(); }
    else if (/^(open seller dashboard)$/i.test(q)) { A.go('#/seller'); }
    else if (/^(my orders)$/i.test(q)) { A.go('#/dashboard/orders'); }
    else if (/^(favourites)$/i.test(q)) { A.go('#/dashboard/wishlist'); }
    else if (/^show all /i.test(q)) { var P = parse(q); A.go('#/marketplace?' + (P.sector ? 'sec=' + P.sector.id : 'q=' + encodeURIComponent(q.replace(/^show all /i, ''))) + (P.sub ? '&sub=' + encodeURIComponent(P.sub) : '')); }
    else if (/^(show me the marketplace)$/i.test(q)) { A.go('#/marketplace'); }
    else if (/^(story generator)$/i.test(q)) { A.go('#/unthetical'); }
    var think = bubble('<span class="ai-think">' + eye(22, 'wink') + ' thinking</span>', 'bot');
    var done = function (text) { think.remove(); if (text) r.text = esc(text).replace(/\n/g, '<br>').replace(/#\/[a-z0-9\-\/?=&%.]+/gi, function (h) { return '<a href="' + h + '">' + h.replace('#/', '') + '</a>'; }); bot(r); busy = false; };
    if (remote.on && r.intent !== 'greet') {
      fetch(C.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-6), context: ctxFor(r) }) })
        .then(function (x) { return x.json(); }).then(function (j) { done(j && j.ok && j.reply ? j.reply : null); }).catch(function () { done(null); });
    } else setTimeout(function () { done(null); }, A.reduced ? 120 : 420);
  }

  /* ───────────────── home-page section + dashboard widget ───────────────── */
  var PROMPTS = ['Day-old broiler chicks under ₦600 in Oyo', 'Price of urea fertilizer', 'Verified catfish farms in Lagos', 'Tractor hire in Kaduna', 'Who sells cold room rental?', 'How do I pay with Stripe?'];
  A.aiHomeSection = function () {
    var d = D();
    return '<section class="ut-band" id="aiHome"><div class="wrap ut-grid"><div class="ut-copy rv">' +
      '<span class="eyebrow ut-eyebrow">' + eye(18) + ' AgricWorld AI</span><h2 class="h-lg">Ask the marketplace <em>anything.</em></h2>' +
      '<p>A concierge that knows all ' + d.products.length + ' listings, ' + d.companies.length + ' sellers and every price on AgricWorld — and only ever tells you what is real. Type a need, get live results.</p>' +
      '<form class="ut-ask" onsubmit="event.preventDefault();AW.aiAsk(this.q.value||this.q.placeholder)"><input name="q" id="utAskIn" placeholder="' + esc(PROMPTS[0]) + '" autocomplete="off"><button class="btn ut-btn">' + ic('send') + ' Ask</button></form>' +
      '<div class="ut-prompts">' + PROMPTS.slice(1, 4).map(function (p) { return '<button type="button" onclick="AW.aiAsk(this.textContent)">' + esc(p) + '</button>'; }).join('') + '</div>' +
      '<div class="ut-feats"><span>' + ic('search') + ' Natural-language search</span><span>' + ic('trending-up') + ' Live price ranges</span><span>' + ic('badge-check') + ' Verified-seller filter</span><span>' + ic('shield-check') + ' No invented data</span></div></div>' +
      '<div class="ut-visual rv" style="--d:120ms"><div class="ut-orb"></div>' + eye(140, 'xl') + '<div class="ut-ticker" id="utTicker"><span>' + esc(PROMPTS[0]) + '</span></div><div class="ut-sig">Designed in the <a href="#/unthetical">UNTHETICAL</a> language</div></div></div></section>';
  };
  function ticker() { var el = $('#utTicker'), inp = $('#utAskIn'); if (!el || el.dataset.on) return; el.dataset.on = 1; var i = 0; setInterval(function () { if (!document.body.contains(el)) return; i = (i + 1) % PROMPTS.length; el.classList.add('sw'); setTimeout(function () { el.innerHTML = '<span>' + esc(PROMPTS[i]) + '</span>'; if (inp && !inp.value) inp.placeholder = PROMPTS[i]; el.classList.remove('sw'); }, 380); }, 3200); }
  A.aiDashWidget = function (role) {
    var qs = role === 'seller' ? ['Tips to sell faster', 'How do I get verified?', 'Price of NPK fertilizer'] : role === 'admin' ? ['Which sector has most listings?', 'Sellers without verification', 'How many products per sector?'] : ['Track my orders', 'Cheapest day-old chicks', 'Verified sellers near me'];
    return '<div class="panel ut-dash"><div class="ut-dash-l">' + eye(44, 'on') + '<div><b>AgricWorld AI</b><small>Ask about listings, prices, sellers or how anything works.</small></div></div><form class="ut-dash-f" onsubmit="event.preventDefault();AW.aiAsk(this.q.value||this.q.placeholder)"><input name="q" placeholder="' + esc(qs[0]) + '" autocomplete="off"><button class="btn ut-btn btn-sm">' + ic('send') + '</button></form><div class="ai-chips">' + qs.map(function (q) { return '<button type="button" onclick="AW.aiAsk(this.textContent)">' + esc(q) + '</button>'; }).join('') + '</div></div>';
  };

  /* ───────────────── UNTHETICAL brand page ───────────────── */
  var OBJECTS = ['an old letter with today\'s date', 'a mirror that fogs on its own', 'a locked door in a hallway that isn\'t on the floor plan', 'a family photo with one extra person', 'a voicemail from my own number', 'a stranger who nods like he knows me', 'a map with a street that doesn\'t exist', 'a receipt from a shop that closed in 1998'];
  var HOOKS = ['I used a trending sound to reveal what happened at midnight…', 'I heard this sound in my dream three nights in a row.', 'This sound was trending, so I gave it a secret.', 'Don\'t play this sound after 11:59.', 'The sound picked me. I just pressed record.'];
  var REVEALS = ['When the beat drops the words rearrange: <b>“You’re not supposed to be watching this.”</b>', 'On the drop the room stays — but I am no longer in the reflection.', 'The beat hits and the door is open. It was never locked. It was waiting.', 'On the drop the extra person is gone from the photo — and standing behind me.', 'The beat drops and today\'s date appears, written in my handwriting.'];
  var ENDS = ['Would you have opened it?', 'Part 2?', 'Some sounds are warnings.', 'Reality has rules. We don’t.', 'Tell me you heard it too.'];
  function pick(arr, n) { return arr[n % arr.length]; }
  A.utStory = function (seed) {
    var n = typeof seed === 'number' ? seed : Math.floor(Math.random() * 9973);
    return { hook: pick(HOOKS, n), obj: pick(OBJECTS, n * 7 + 3), reveal: pick(REVEALS, n * 3 + 1), end: pick(ENDS, n * 5 + 2), n: n };
  };
  function storyHtml(s) {
    return '<div class="ut-story" id="utStory" data-n="' + s.n + '">' +
      '<div class="ut-step"><span>01 · Hook</span><p>“' + s.hook + '”</p></div>' +
      '<div class="ut-step"><span>02 · Build-up</span><p>Show something ordinary: ' + s.obj + '.</p></div>' +
      '<div class="ut-step"><span>03 · Reveal</span><p>' + s.reveal + '</p></div>' +
      '<div class="ut-step"><span>04 · Final text</span><p><b>“' + s.end + '”</b> — then the UNTHETICAL mark and <i>“Reality has rules. We don’t.”</i></p></div>' +
      '<div class="ut-caption"><small>Caption</small><p id="utCap">This sound was trending… so I gave it a secret.<br>What do you think happened next?<br><b>#UNTHETICAL #SoundAlchemy #MysteryTok #StoryTok #WaitForIt</b></p></div>' +
      '<div class="ut-actions"><button class="btn ut-btn" onclick="AW.utNew()">' + eye(16) + ' New story</button><button class="btn btn-ghost ut-ghost" onclick="AW.utCopy()">' + ic('copy') + ' Copy script</button><button class="btn btn-ghost ut-ghost" onclick="AW.utShare()">' + ic('share-2') + ' Share</button></div></div>';
  }
  A.utNew = function () { var el = $('#utStory'); if (!el) return; var s = A.utStory(); el.outerHTML = storyHtml(s); $('#utStory').classList.add('pop'); };
  function scriptText() { var el = $('#utStory'); if (!el) return ''; return Array.from(el.querySelectorAll('.ut-step')).map(function (st) { return st.querySelector('span').textContent + '\n' + st.querySelector('p').textContent; }).join('\n\n') + '\n\n' + $('#utCap').innerText; }
  A.utCopy = function () { var t = scriptText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { A.toast('Script copied', 'check'); }).catch(function () { A.toast('Select and copy the text manually', 'circle-alert'); }); };
  A.utShare = function () { var t = scriptText(); if (navigator.share) navigator.share({ title: 'UNTHETICAL — This Sound Chose Me', text: t, url: location.href }).catch(function () { }); else A.utCopy(); };

  var PLATFORMS = [['TikTok', 'music', 'Fast hook in the first second, dramatic reveal on the drop, end with comment bait (“Part 2?”).'], ['Instagram Reels', 'image', 'More cinematic frames, slower push-ins, aesthetic caption with the tagline.'], ['YouTube Shorts', 'play', 'Add a stronger story ending — a second reveal or a twist line.'], ['Facebook', 'message-square', 'Burn-in subtitles and give a slightly longer explanation in the post.'], ['Snapchat', 'camera', 'Behind-the-scenes version plus a poll: “Would you have opened it?”.'], ['X / Threads', 'share-2', 'Post the story as a short mystery thread with the video attached.']];
  A.route('unthetical', function (pg) {
    pg.setAttribute('data-title', 'UNTHETICAL'); var s = A.utStory(7);
    pg.innerHTML = '<div class="ut-page">' +
      '<section class="ut-hero"><div class="ut-stars"></div><div class="wrap ut-hero-in"><div class="rv">' + eye(120, 'xl') + '</div><span class="eyebrow ut-eyebrow rv">Stories reality tried to hide</span><h1 class="rv">UN<em>THETICAL</em></h1><p class="ut-lead rv">Make the impossible feel real. Take an ordinary moment, match it with a trending sound, and turn it into a tiny supernatural story.</p>' +
      '<div class="ut-hero-cta rv"><a href="#gen" class="btn ut-btn" onclick="event.preventDefault();document.getElementById(\'gen\').scrollIntoView({behavior:\'smooth\'})">' + ic('sparkles') + ' Generate a story</a><button class="btn btn-ghost ut-ghost" onclick="AW.aiAsk(\'unthetical\')">' + eye(16) + ' Meet AgricWorld AI</button></div><div class="ut-tag rv">Reality has rules. We don’t.</div></div></section>' +
      '<section class="ut-sec"><div class="wrap"><div class="ut-head rv"><span class="eyebrow ut-eyebrow">Core series</span><h2>“This Sound Chose Me”</h2><p>15–25 seconds. Four beats. One trending audio, taken straight from the platform\'s music library so every post stays licence-safe.</p></div>' +
      '<div class="ut-steps">' + [['01', 'Hook', '“I used a trending sound to reveal what happened at midnight…”'], ['02', 'Build-up', 'Something normal — a mirror, an old letter, a locked door, a photo, a stranger passing by.'], ['03', 'Magical reveal', 'On the drop the object changes, a message appears, the person disappears, the scene transforms.'], ['04', 'Final text', '“Would you have opened it?” · “Part 2?” · “Some sounds are warnings.”']].map(function (x, i) { return '<div class="ut-card rv" style="--d:' + i * 80 + 'ms"><span class="n">' + x[0] + '</span><b>' + x[1] + '</b><p>' + x[2] + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="ut-sec" id="gen"><div class="wrap ut-two"><div class="ut-head rv"><span class="eyebrow ut-eyebrow">Story generator</span><h2>Your next post, written in one tap.</h2><p>Hook, build-up, reveal, final line and caption — recombined from the UNTHETICAL playbook. Copy it, shoot it, post it with the trending sound from the platform library.</p><div class="ut-example"><small>Example post</small><p>“I heard this sound in my dream three nights in a row.” — find an old note with today\'s date. When the beat drops it now reads <b>“You’re not supposed to be watching this.”</b> End on the mark: <i>Reality has rules. We don’t.</i></p></div></div><div class="rv" style="--d:100ms">' + storyHtml(s) + '</div></div></section>' +
      '<section class="ut-sec"><div class="wrap"><div class="ut-head rv"><span class="eyebrow ut-eyebrow">Every platform</span><h2>Same story. Native everywhere.</h2></div><div class="ut-plat">' + PLATFORMS.map(function (p, i) { return '<div class="ut-card rv" style="--d:' + i * 60 + 'ms">' + ic(p[1]) + '<b>' + p[0] + '</b><p>' + p[2] + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="ut-sec"><div class="wrap ut-two"><div class="ut-head rv"><span class="eyebrow ut-eyebrow">Brand style</span><h2>Mysterious. Poetic. Slightly rebellious.</h2><p>An eye inside a broken circle. Black, midnight blue, silver and electric violet. Short lines that feel like they were found, not written.</p><div class="ut-pal">' + [['#0b0c14', 'Black'], ['#101a3a', 'Midnight blue'], ['#c9ced8', 'Silver'], ['#7c3aed', 'Electric violet']].map(function (c) { return '<span><i style="background:' + c[0] + '"></i>' + c[1] + '<small>' + c[0] + '</small></span>'; }).join('') + '</div></div><div class="ut-voice rv" style="--d:100ms"><div class="ut-card"><b>Voice</b><p>“Some sounds are warnings.”<br>“You’re not supposed to be watching this.”<br>“Tell me you heard it too.”</p></div><div class="ut-card"><b>Caption template</b><p>This sound was trending… so I gave it a secret.<br>What do you think happened next?<br><b>#UNTHETICAL #SoundAlchemy #MysteryTok #StoryTok #WaitForIt</b></p></div><div class="ut-card"><b>Licensing</b><p>Use the trending audio directly inside each platform\'s music library so posts stay safer for copyright.</p></div></div></div></section>' +
      '<section class="ut-foot"><div class="wrap">' + eye(56, 'xl') + '<h3>UNTHETICAL: Stories reality tried to hide.</h3><p>The same design language powers <a href="#/">AgricWorld AI</a> — where, for once, everything is real.</p></div></section></div>';
    setTimeout(function () { var el = $('#utStory'); if (el) el.classList.add('pop'); }, 50);
  });

  /* ───────────────── wiring ───────────────── */
  function onRoute() {
    var h = location.hash || '#/'; document.body.classList.toggle('ut-theme', h.indexOf('#/unthetical') === 0);
    if (h === '#/' || h === '' || h === '#') { ticker(); setTimeout(ticker, 700); }
  }
  window.addEventListener('hashchange', function () { setTimeout(onRoute, 250); });
  function boot() { mount(); setTimeout(onRoute, 400); }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
