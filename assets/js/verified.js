/* ═══════════════════════════════════════════════════════════════
   AgricWorld Verified Business Program
   • premium badge helper used on cards, profiles, search and directory
   • public landing page  #/verified
   • seller application workflow (dashboard → Verification)
   • admin review queue, tier editor and payments (owner only)
   Payments never grant the badge. Only an admin decision (admin_decide_verification) does.
   ═══════════════════════════════════════════════════════════════ */
(function (A) {
  var $ = A.$, $$ = A.$$, ic = A.ic, esc = A.esc, money = A.money, D = A.D, DB = A.DB, C = A.C;
  var DEFAULT_TIERS = [
    { id: 'business', name: 'Verified Business', tagline: 'For registered farms, shops and agro-dealers', badge: 'green', placement: 1, sort: 1, duration_days: 365, price: null, application_fee: 0, renewal_price: null, featured: false, active: true, eligibility: ['Registered business or cooperative', 'Active AgricWorld storefront', 'Reachable phone, WhatsApp or email'], requirements: ['CAC / business registration certificate', 'Valid ID of the owner or director', 'Proof of business address'], benefits: ['Verified badge on profile, listings, search and directory', 'Verified filter in search and directory', 'Verification status shown to every buyer'] },
    { id: 'professional', name: 'Verified Professional', tagline: 'For vets, agronomists, consultants and service providers', badge: 'gold', placement: 2, sort: 2, duration_days: 365, price: null, application_fee: 0, renewal_price: null, featured: false, active: true, eligibility: ['Licensed or certified professional', 'Professional service listings on AgricWorld'], requirements: ['Professional licence or certificate', 'Valid ID', 'Proof of practice address'], benefits: ['Verified badge on profile, listings, search and directory', 'Verified filter in search and directory', 'Higher placement in directory results'] },
    { id: 'enterprise', name: 'Verified Enterprise', tagline: 'For processors, manufacturers, importers and large farms', badge: 'platinum', placement: 3, sort: 3, duration_days: 365, price: null, application_fee: 0, renewal_price: null, featured: true, active: true, eligibility: ['Registered company with staff and physical premises', 'Multiple product lines or facilities'], requirements: ['CAC certificate and TIN', 'Director ID', 'Proof of premises', 'Product or facility certifications where applicable'], benefits: ['Verified badge on profile, listings, search and directory', 'Verified filter in search and directory', 'Higher placement in directory results', 'Eligible for the Verified businesses section on the homepage'] },
    { id: 'global', name: 'Verified Global Business', tagline: 'For exporters, importers and international traders', badge: 'global', placement: 4, sort: 4, duration_days: 365, price: null, application_fee: 0, renewal_price: null, featured: true, active: true, eligibility: ['Export or import documentation', 'Registered company in its home country'], requirements: ['Company registration', 'Export / import licence or NEPC registration', 'Director ID', 'Proof of premises'], benefits: ['Verified badge on profile, listings, search and directory', 'Verified filter in search and directory', 'Top placement in directory results', 'Eligible for the Verified businesses section on the homepage'] }
  ];
  var tiers = DEFAULT_TIERS.slice(), tiersLoaded = false;
  function loadTiers(force) { return DB.verTiers(force).then(function (t) { if (t && t.length) { tiers = t.filter(function (x) { return x.active !== false; }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }); tiersLoaded = true; } return tiers; }); }
  function tierOf(id) { return tiers.filter(function (t) { return t.id === id; })[0] || null; }
  function tierName(id) { var t = tierOf(id); return t ? t.name : (id ? 'Verified' : 'Verified Business'); }
  function priceLabel(v, cur) { if (v === null || v === undefined || v === '') return 'Pricing confirmed at review'; if (+v === 0) return 'No charge'; return money(+v); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function lines(arr) { return (arr || []).map(function (x) { return '<li>' + ic('check') + '<span>' + esc(x) + '</span></li>'; }).join(''); }

  /* ── badge (premium, compact; never oversized) ── */
  function vbadge(co, size) {
    if (!co || !co.ver) return '';
    var t = tierOf(co.ver_tier) || {}; var style = t.badge || 'green'; var name = t.name || 'Verified Business';
    var title = name + (co.ver_until ? ' · valid until ' + fmtDate(co.ver_until) : '');
    if (size === 'dot') return '<span class="vbadge vb-' + style + ' vb-dot" title="' + esc(title) + '" aria-label="' + esc(name) + '">' + ic('badge-verified') + '</span>';
    return '<span class="vbadge vb-' + style + (size === 'lg' ? ' vb-lg' : '') + '" title="' + esc(title) + '">' + ic('badge-verified') + '<span>' + esc(size === 'lg' ? name : name.replace(/^Verified /, 'Verified · ').replace('Verified · ', size === 'short' ? '' : 'Verified · ')) + '</span></span>';
  }
  /* ── honest reputation label: only real signals ── */
  function repLabel(co) {
    if (!co) return '';
    if (co.ver_status === 'pending' && !co.ver) return { cls: 'pend', text: 'Verification pending' };
    if (co.ver) return { cls: 'ok', text: tierName(co.ver_tier) };
    var days = co.created_at ? (Date.now() - new Date(co.created_at).getTime()) / 864e5 : null;
    if (days !== null && days < 45) return { cls: 'info', text: 'Recently joined' };
    if (!co.reviews) return { cls: 'info', text: 'New seller · no reviews yet' };
    if (co.reviews < 3) return { cls: 'info', text: 'Not enough reviews yet' };
    return { cls: 'ok', text: (+co.rating).toFixed(1) + ' ★ · ' + co.reviews + ' reviews' };
  }
  function repPill(co) { var r = repLabel(co); return r ? '<span class="pill ' + r.cls + '">' + esc(r.text) + '</span>' : ''; }
  function statusPill(st) { var m = { unverified: ['info', 'Unverified'], pending: ['pend', 'Pending review'], verified: ['ok', 'Verified'], rejected: ['bad', 'Rejected'], expired: ['bad', 'Expired'], suspended: ['bad', 'Suspended'] }[st] || ['info', st || 'Unverified']; return '<span class="pill ' + m[0] + '">' + m[1] + '</span>'; }
  function socialLinks(co) {
    var s = co.socials || {}; var out = [];
    if (co.website) out.push(['globe', co.website, 'Website']);
    [['facebook', 'facebook', 'Facebook'], ['instagram', 'instagram', 'Instagram'], ['linkedin', 'linkedin', 'LinkedIn'], ['x', 'xsocial', 'X'], ['youtube', 'youtube', 'YouTube'], ['tiktok', 'tiktok', 'TikTok']].forEach(function (k) { if (s[k[0]]) out.push([k[1], s[k[0]], k[2]]); });
    if (!out.length) return '';
    return '<div class="socials">' + out.map(function (l) { return '<a class="soc" href="' + esc(l[1]) + '" target="_blank" rel="noopener nofollow" title="' + l[2] + '" aria-label="' + l[2] + '">' + ic(l[0]) + '</a>'; }).join('') + '</div>';
  }

  /* ── tier card (shared by landing + seller) ── */
  function tierCard(t, opts) {
    opts = opts || {};
    return '<div class="tier glass rv vb-' + (t.badge || 'green') + (opts.selected ? ' on' : '') + '" ' + (opts.selectable ? 'data-tier="' + esc(t.id) + '" role="button" tabindex="0"' : '') + '>' +
      '<div class="tier-h"><span class="vbadge vb-' + (t.badge || 'green') + ' vb-lg">' + ic('badge-verified') + '<span>' + esc(t.name) + '</span></span>' + (opts.selectable ? '<span class="tier-pick">' + ic(opts.selected ? 'check' : 'plus') + '</span>' : '') + '</div>' +
      '<p class="tier-tag">' + esc(t.tagline || '') + '</p>' +
      '<div class="tier-price' + (t.price === null || t.price === undefined || t.price === '' ? ' unset' : '') + '"><b>' + priceLabel(t.price) + '</b><small>' + (t.price === null || t.price === undefined || t.price === '' ? 'Pricing is set by AgricWorld and shown before you pay' : 'per ' + (t.duration_days >= 360 ? 'year' : t.duration_days + ' days')) + '</small></div>' +
      '<div class="tier-fees">' + (t.application_fee ? '<span>Application fee ' + money(+t.application_fee) + '</span>' : '<span>No application fee</span>') + (t.renewal_price !== null && t.renewal_price !== undefined && t.renewal_price !== '' ? '<span>Renewal ' + money(+t.renewal_price) + '</span>' : (t.price ? '<span>Renewal at the same price</span>' : '')) + '<span>Valid ' + (t.duration_days || 365) + ' days</span></div>' +
      '<h5>Who it is for</h5><ul class="tier-list">' + lines(t.eligibility) + '</ul>' +
      '<h5>What you get</h5><ul class="tier-list">' + lines(t.benefits) + '</ul>' +
      (opts.cta ? '<a class="btn btn-p" href="' + opts.cta + '" style="margin-top:14px;width:100%">' + ic('arrow-right') + ' Apply for ' + esc(t.name) + '</a>' : '') + '</div>';
  }

  /* ════════ PUBLIC LANDING  #/verified ════════ */
  A.route('verified', function (pg, r) {
    if (r && r.param === 'apply') return applyRedirect(r);
    pg.setAttribute('data-title', 'AgricWorld Verified Business Program');
    var steps = [['file-text', 'Apply', 'Complete the application with your legal name, registration, address, contacts, sectors and documents.'], ['search', 'Review', 'The AgricWorld team checks every document and may request more. Nothing is automatic.'], ['badge-verified', 'Decision', 'Approved businesses receive the badge for the tier period. Declined applications get a written reason.'], ['refresh-cw', 'Renew', 'Renew before expiry to keep the badge. Expired, suspended or revoked badges disappear immediately.']];
    var faq = [['Does paying make me verified?', 'No. Fees only cover the review. A human reviewer approves or declines every application; a payment can never grant the badge.'], ['How long does review take?', 'Most complete applications are reviewed within a few business days. Missing documents pause the clock until you upload them.'], ['What if my application is rejected?', 'You receive the reason in your dashboard and can re-apply once you have addressed it.'], ['Can verification be removed?', 'Yes. Verification can be suspended or revoked for fraud, repeated complaints or false documents, and it expires if not renewed.'], ['Who sees my documents?', 'Only the AgricWorld review team. Documents are never shown publicly.'], ['Which tier should I choose?', 'Pick the tier that matches your business type. If a tier is not yet priced, apply anyway — pricing is confirmed with you before any charge.']];
    pg.innerHTML = '<div class="p-hero ver-hero"><img class="bg" src="' + D.IMG + 'hero-market.jpg" alt=""><div class="wrap"><span class="eyebrow">' + ic('badge-verified') + ' AgricWorld Verified Business Program</span><h1>Trust you can <em>see</em> across the marketplace</h1><p>A verified badge tells buyers that AgricWorld has reviewed a business\'s registration, identity and address. Verification is earned through review — never bought.</p><div class="hero-cta"><a class="btn btn-gold btn-lg" href="#/verified/apply">' + ic('arrow-right') + ' Apply for verification</a><a class="btn btn-w btn-lg" href="#/directory?verified=1">' + ic('building-2') + ' Browse verified businesses</a></div></div></div>' +
      '<section><div class="wrap"><div class="ver-grid3">' + [['shield-check', 'What it means', 'A verified business has supplied valid registration documents, an owner or director ID and a proof of address that our team reviewed.'], ['eye', 'Where it shows', 'On the business profile, every product listing, seller cards, search results and the directory — plus a verified-only filter.'], ['lock', 'What it is not', 'Not a guarantee of product quality or a payment escrow. Reviews, order history and direct contact still matter.']].map(function (x, i) { return '<div class="card glass rv" style="--d:' + i * 80 + 'ms"><span class="ic-lg">' + ic(x[0]) + '</span><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section style="padding-top:0"><div class="wrap"><div class="sec-head rv"><div><span class="eyebrow">' + ic('award') + ' Tiers</span><h2 class="h-lg" style="margin-top:12px">Choose the tier that fits your business</h2><p class="lead">Tier names, pricing and durations are set by AgricWorld and may change. You are only charged what is shown at the time you apply.</p></div></div><div class="tiers" id="verTiers">' + tiers.map(function (t) { return tierCard(t, { cta: '#/verified/apply?tier=' + t.id }); }).join('') + '</div></div></section>' +
      '<section style="padding-top:0"><div class="wrap"><div class="sec-head rv"><div><span class="eyebrow">' + ic('sparkles') + ' Process</span><h2 class="h-lg" style="margin-top:12px">How verification works</h2></div></div><div class="steps">' + steps.map(function (s, i) { return '<div class="step glass rv" style="--c1:#0f5132;--c2:#f5b820;--d:' + i * 90 + 'ms"><span class="ic">' + ic(s[0]) + '</span><h4>' + s[1] + '</h4><p>' + s[2] + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section style="padding-top:0"><div class="wrap"><div class="ver-two"><div class="card glass rv"><h3>' + ic('file-text') + ' Documents you will need</h3><ul class="tier-list">' + lines(['Business registration (CAC BN/RC, cooperative certificate or professional licence)', 'Government-issued ID of the owner or a director', 'Proof of business address (utility bill, tenancy or bank statement)', 'Optional: TIN, export/import registration, facility or product certifications']) + '</ul></div><div class="card glass rv"><h3>' + ic('refresh-cw') + ' Renewal, expiry & removal</h3><ul class="tier-list">' + lines(['Each tier is valid for the period shown on the tier card', 'Renew from your dashboard before the expiry date', 'Expired badges are removed automatically', 'AgricWorld may suspend or revoke verification for false documents or fraud']) + '</ul></div></div></div></section>' +
      '<section style="padding-top:0"><div class="wrap" style="max-width:900px"><div class="sec-head rv"><div><span class="eyebrow">' + ic('info') + ' FAQ</span><h2 class="h-lg" style="margin-top:12px">Questions sellers ask</h2></div></div><div class="faq">' + faq.map(function (f) { return '<details class="glass rv"><summary>' + esc(f[0]) + ic('chevron-down') + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div><div class="ver-cta glass rv"><div><h3>Ready to apply?</h3><p>Sign in as a seller, complete your storefront, then submit your application from the dashboard.</p></div><a class="btn btn-gold btn-lg" href="#/verified/apply">' + ic('arrow-right') + ' Start application</a></div></div></section>';
    A.observe(pg);
    if (!tiersLoaded) loadTiers().then(function () { var box = $('#verTiers', pg); if (box) { box.innerHTML = tiers.map(function (t) { return tierCard(t, { cta: '#/verified/apply?tier=' + t.id }); }).join(''); A.observe(box); } });
  });
  function applyRedirect(r) {
    var tier = (r.q && r.q.tier) || '';
    if (tier) try { sessionStorage.setItem('aw_tier', tier); } catch (e) { /* ignore */ }
    if (!A.state.user) { A.go('#/verified'); return A.openAuth('signup', function () { A.go('#/seller/verification'); }); }
    A.go('#/seller/verification');
  }

  /* ════════ SELLER: application workflow ════════ */
  var payScriptP = null;
  function loadPaystack() { if (window.PaystackPop) return Promise.resolve(); if (payScriptP) return payScriptP; payScriptP = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = 'https://js.paystack.co/v1/inline.js'; sc.onload = res; sc.onerror = function () { payScriptP = null; rej(new Error('Could not load Paystack. Check your connection and try again.')); }; document.head.appendChild(sc); }); return payScriptP; }
  function panel(title, body, extra) { return '<div class="panel glass rv"><div class="panel-h"><h3>' + title + '</h3>' + (extra || '') + '</div>' + body + '</div>'; }

  function sellerView(co) {
    return Promise.all([loadTiers(), DB.myApplication(co.id), DB.myVerPayments(co.id), DB.verHistory(co.id)]).then(function (res) {
      var app = res[1], pays = res[2] || [], hist = res[3] || [];
      var st = co.ver ? 'verified' : app ? app.status : 'unverified';
      var t = app ? tierOf(app.tier_id) : null;
      var picked = (function () { try { return sessionStorage.getItem('aw_tier'); } catch (e) { return null; } })() || (t && t.id) || (tiers[0] && tiers[0].id);
      var status = '<div class="ver-status vb-' + ((t && t.badge) || 'green') + '"><div class="vs-l">' + (co.ver ? '<span class="vbadge vb-' + ((t && t.badge) || 'green') + ' vb-lg">' + ic('badge-verified') + '<span>' + esc(t ? t.name : 'Verified') + '</span></span>' : '<span class="ic-lg">' + ic(st === 'pending' ? 'clock' : st === 'rejected' || st === 'suspended' || st === 'expired' ? 'circle-alert' : 'shield-check') + '</span>') + '<div><small>Verification status</small><h2>' + { unverified: 'Unverified', pending: app && app.docs_requested ? 'Documents requested' : 'Pending review', verified: 'Verified', rejected: 'Not approved', expired: 'Expired', suspended: 'Suspended' }[st] + '</h2>' +
        (co.ver && co.ver_until ? '<p>Valid until <b>' + fmtDate(co.ver_until) + '</b>' + ((new Date(co.ver_until) - Date.now()) < 45 * 864e5 ? ' — renew soon to keep the badge.' : '') + '</p>' : '') +
        (st === 'pending' ? '<p>Submitted ' + fmtDate(app.created_at) + '. ' + (app.docs_requested ? '<b>AgricWorld asked for:</b> ' + esc(app.docs_requested) : 'Our team is reviewing your documents. Nothing here is automatic.') + '</p>' : '') +
        (st === 'rejected' || st === 'suspended' ? '<p>' + (app && app.admin_note ? 'Reason from AgricWorld: <b>' + esc(app.admin_note) + '</b>. ' : '') + 'You may address the issue and re-apply.</p>' : '') +
        (st === 'expired' ? '<p>Your verification expired on ' + fmtDate(app.expires_at) + '. Renew below to restore the badge.</p>' : '') +
        (st === 'unverified' ? '<p>Verified businesses show a premium badge on their profile, listings, search results and the directory.</p>' : '') + '</div></div>' + statusPill(st) + '</div>';
      var canApply = !co.ver && st !== 'pending';
      var tierPicker = '<div class="tiers compact" id="tierPick">' + tiers.map(function (x) { return tierCard(x, { selectable: true, selected: x.id === picked }); }).join('') + '</div>';
      var soc = (app && app.socials) || co.socials || {};
      var form = '<form class="form" id="vapp" novalidate><input type="hidden" name="tier_id" value="' + esc(picked || '') + '">' +
        '<div class="fld"><label>Legal business name</label><input name="legal_name" required value="' + esc((app && app.legal_name) || co.name) + '"></div><div class="fld"><label>Business type</label><select name="business_type">' + ['Farm', 'Cooperative', 'Agro-dealer / Input shop', 'Wholesaler / Aggregator', 'Processor', 'Manufacturer', 'Importer / Exporter', 'Service provider', 'Professional (vet, agronomist, consultant)', 'Logistics', 'Research / Training institution', 'AgTech company'].map(function (b) { return '<option ' + (((app && app.business_type) || co.btype) === b ? 'selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div>' +
        '<div class="fld"><label>Registration type</label><select name="reg_type">' + ['CAC Business Name (BN)', 'CAC Company (RC)', 'Cooperative society', 'Professional licence', 'Foreign company registration', 'Other'].map(function (b) { return '<option ' + ((app && app.reg_type) === b ? 'selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div><div class="fld"><label>Registration number</label><input name="reg_number" required value="' + esc((app && app.reg_number) || '') + '" placeholder="RC 1234567"></div>' +
        '<div class="fld"><label>Tax ID / TIN (optional)</label><input name="tax_id" value="' + esc((app && app.tax_id) || '') + '"></div><div class="fld"><label>Main category</label><input name="category" value="' + esc((app && app.category) || (D.secMap[co.sector] || {}).name || '') + '" placeholder="e.g. Poultry hatchery"></div>' +
        '<div class="fld full"><label>Sectors you operate in</label><div class="chips" id="vSectors">' + D.sectors.map(function (s) { var on = app ? (app.sectors || []).indexOf(s.id) > -1 : s.id === co.sector; return '<label class="chip ' + (on ? 'on' : '') + '"><input type="checkbox" name="sectors" value="' + s.id + '" ' + (on ? 'checked' : '') + '>' + ic(s.icon) + esc(s.short) + '</label>'; }).join('') + '</div></div>' +
        '<div class="fld full"><label>Registered business address</label><input name="address" required value="' + esc((app && app.address) || '') + '" placeholder="Street, area"></div>' +
        '<div class="fld"><label>Country</label><input name="country" value="' + esc((app && app.country) || co.country || 'Nigeria') + '"></div><div class="fld"><label>State / region</label><input name="state" required value="' + esc((app && app.state) || co.state || '') + '"></div><div class="fld"><label>City / town</label><input name="city" required value="' + esc((app && app.city) || co.city || '') + '"></div>' +
        '<div class="fld"><label>Contact person</label><input name="contact_name" required value="' + esc((app && app.contact_name) || A.state.user.name || '') + '"></div><div class="fld"><label>Contact phone</label><input name="contact_phone" required value="' + esc((app && app.contact_phone) || co.phone || '') + '"></div><div class="fld"><label>Contact email</label><input name="contact_email" type="email" required value="' + esc((app && app.contact_email) || co.email || A.state.user.email || '') + '"></div>' +
        '<div class="fld"><label>Website (optional)</label><input name="website" value="' + esc((app && app.website) || co.website || '') + '" placeholder="https://"></div><div class="fld"><label>Facebook (optional)</label><input name="s_facebook" value="' + esc(soc.facebook || '') + '"></div><div class="fld"><label>Instagram (optional)</label><input name="s_instagram" value="' + esc(soc.instagram || '') + '"></div><div class="fld"><label>LinkedIn (optional)</label><input name="s_linkedin" value="' + esc(soc.linkedin || '') + '"></div>' +
        '<div class="fld full"><label>Describe the business (what you produce or sell, facilities, customers)</label><textarea name="description" required>' + esc((app && app.description) || co.desc || '') + '</textarea></div>' +
        '<div class="fld full"><label>Documents</label><div class="upload" id="vUp">' + ic('upload') + '<div style="margin-top:8px"><b>Click to upload</b> registration certificate, ID and proof of address</div><small>Images or PDF, up to 5 MB each. Seen only by the AgricWorld review team.</small><input type="file" id="vInput" accept="image/*,.pdf" multiple class="sr"></div><div id="vFiles" class="vfiles"></div></div>' +
        '<div class="fld full"><label class="chk"><input type="checkbox" name="agree" required> I confirm these details are accurate and understand that payment of any fee does not grant verification; AgricWorld reviews every application and may decline it.</label></div>' +
        '<div class="auth-err full" id="vErr"></div><div class="full" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-p">' + ic('send') + ' ' + (app && (st === 'rejected' || st === 'expired' || st === 'suspended') ? 'Re-apply' : 'Submit application') + '</button><a class="btn btn-ghost" href="#/verified">' + ic('info') + ' Program details</a></div></form>';
      var docsPanel = app && st === 'pending' ? panel('Your documents', '<div class="vfiles" id="vFiles">' + (app.docs || []).map(function (d, i) { return '<a class="vfile" target="_blank" rel="noopener" href="' + esc(d.url || d) + '">' + ic('file-text') + esc(d.name || 'Document ' + (i + 1)) + '</a>'; }).join('') + '</div>' + '<div class="upload" id="vUp" style="margin-top:12px">' + ic('upload') + '<div style="margin-top:8px"><b>Add more documents</b>' + (app.docs_requested ? ' — requested: ' + esc(app.docs_requested) : '') + '</div><input type="file" id="vInput" accept="image/*,.pdf" multiple class="sr"></div>') : '';
      /* fees: only shown when the tier has configured pricing; payment never verifies */
      var feeT = t || tierOf(picked);
      var due = [];
      if (feeT && app && st !== 'rejected') {
        var paidKinds = pays.filter(function (p) { return p.status === 'paid'; }).map(function (p) { return p.kind; });
        if (+feeT.application_fee > 0 && paidKinds.indexOf('application_fee') < 0) due.push(['application_fee', 'Application fee', +feeT.application_fee]);
        if (feeT.price !== null && feeT.price !== undefined && +feeT.price > 0 && paidKinds.indexOf('tier') < 0 && st !== 'expired') due.push(['tier', feeT.name + ' fee (' + feeT.duration_days + ' days)', +feeT.price]);
        if (st === 'expired' || (co.ver && co.ver_until && (new Date(co.ver_until) - Date.now()) < 45 * 864e5)) { var rp = (feeT.renewal_price !== null && feeT.renewal_price !== undefined && feeT.renewal_price !== '') ? +feeT.renewal_price : +feeT.price; if (rp > 0) due.push(['renewal', 'Renewal (' + feeT.duration_days + ' days)', rp]); }
      }
      var feePanel = app ? panel('Fees & payments', (due.length ? '<div class="note" style="margin-bottom:12px">' + ic('info') + ' Fees cover the review. <b>Paying never grants the badge</b> — a reviewer still approves or declines your application.</div>' + due.map(function (d) { return '<div class="row fee-row"><div><b>' + esc(d[1]) + '</b><small>' + money(d[2]) + '</small></div>' + (C.paystackPublicKey ? '<button class="btn btn-sm btn-p" data-payfee="' + d[0] + '" data-amt="' + d[2] + '" data-tier="' + esc(feeT.id) + '">' + ic('lock') + ' Pay ' + money(d[2]) + '</button>' : '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + A.waLink(C.whatsapp, 'Verification fee payment for ' + co.name + ' (' + d[1] + ', ' + money(d[2]) + ')') + '">' + ic('message-square') + ' Arrange payment</a>') + '</div>'; }).join('') : '<p style="color:var(--text-3)">' + (feeT && (feeT.price === null || feeT.price === undefined) ? 'This tier is not priced yet. AgricWorld will confirm any fee with you before charging anything.' : 'No fees are due right now.') + '</p>') +
        (pays.length ? '<h5 style="margin:14px 0 6px">Payment history</h5><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Reference</th><th>Status</th></tr></thead><tbody>' + pays.map(function (p) { return '<tr><td>' + fmtDate(p.created_at) + '</td><td>' + { application_fee: 'Application fee', tier: 'Tier fee', renewal: 'Renewal' }[p.kind] + '</td><td>' + money(+p.amount) + '</td><td><small>' + esc(p.reference || '') + '</small></td><td><span class="pill ' + (p.status === 'paid' ? 'ok' : p.status === 'pending' ? 'pend' : 'bad') + '">' + p.status + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '')) : '';
      var histPanel = hist.length ? panel('History', '<ul class="timeline">' + hist.map(function (h) { return '<li><b>' + esc({ submitted: 'Application submitted', documents_requested: 'Documents requested', verified: 'Verified', rejected: 'Not approved', suspended: 'Suspended', expired: 'Expired', pending: 'Back in review', payment_received: 'Payment received' }[h.action] || h.action) + '</b><small>' + fmtDate(h.created_at) + (h.note ? ' · ' + esc(h.note) : '') + '</small></li>'; }).join('') + '</ul>') : '';
      return '<div class="dash-top"><div><h1>Verification</h1><p>AgricWorld Verified Business Program</p></div><a class="btn btn-ghost btn-sm" href="#/verified">' + ic('info') + ' How it works</a></div>' + status +
        (canApply ? '<h3 class="dash-h">1 · Choose a tier</h3>' + tierPicker + '<h3 class="dash-h">2 · Application</h3>' + panel('Business details', form) : '') +
        '<div class="dgrid eq">' + docsPanel + feePanel + histPanel + '</div>';
    });
  }
  function bindSeller(root, co) {
    var docs = [];
    var picker = $('#tierPick', root);
    if (picker) picker.addEventListener('click', function (e) { var c = e.target.closest('[data-tier]'); if (!c) return; $$('[data-tier]', picker).forEach(function (x) { x.classList.toggle('on', x === c); var pk = $('.tier-pick', x); if (pk) pk.innerHTML = ic(x === c ? 'check' : 'plus'); }); var f = $('#vapp', root); if (f) f.tier_id.value = c.getAttribute('data-tier'); try { sessionStorage.setItem('aw_tier', c.getAttribute('data-tier')); } catch (er) { /* ignore */ } });
    var chips = $('#vSectors', root); if (chips) chips.addEventListener('change', function (e) { var l = e.target.closest('.chip'); if (l) l.classList.toggle('on', e.target.checked); });
    var up = $('#vUp', root), inp = $('#vInput', root), files = $('#vFiles', root);
    if (up && inp) {
      up.addEventListener('click', function () { inp.click(); });
      inp.addEventListener('change', function () { Array.prototype.forEach.call(inp.files, function (file) { if (file.size > 5 * 1024 * 1024) return A.toast(file.name + ' is too large (max 5 MB)', 'circle-alert', 'err'); A.toast('Uploading ' + file.name + '…', 'upload'); DB.uploadImage(file, 'verification').then(function (url) { docs.push({ name: file.name, url: url, kind: /pdf/i.test(file.type) ? 'pdf' : 'image' }); files.insertAdjacentHTML('beforeend', '<span class="vfile">' + ic('file-text') + esc(file.name) + '</span>'); A.toast('Uploaded', 'check'); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); }); inp.value = ''; });
    }
    var f = $('#vapp', root);
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault(); var err = $('#vErr', root); err.textContent = '';
      var v = { company_id: co.id, tier_id: f.tier_id.value, legal_name: f.legal_name.value.trim(), business_type: f.business_type.value, reg_type: f.reg_type.value, reg_number: f.reg_number.value.trim(), tax_id: f.tax_id.value.trim(), category: f.category.value.trim(), sectors: $$('input[name=sectors]:checked', f).map(function (x) { return x.value; }), address: f.address.value.trim(), country: f.country.value.trim() || 'Nigeria', state: f.state.value.trim(), city: f.city.value.trim(), contact_name: f.contact_name.value.trim(), contact_phone: f.contact_phone.value.trim(), contact_email: f.contact_email.value.trim(), website: f.website.value.trim(), socials: {}, description: f.description.value.trim(), docs: docs };
      ['facebook', 'instagram', 'linkedin'].forEach(function (k) { var val = f['s_' + k].value.trim(); if (val) v.socials[k] = /^https?:/i.test(val) ? val : 'https://' + val; });
      if (!v.tier_id) return err.textContent = 'Choose a tier first';
      if (v.legal_name.length < 2) return err.textContent = 'Enter the legal business name'; if (v.reg_number.length < 3) return err.textContent = 'Enter the registration number'; if (v.address.length < 5) return err.textContent = 'Enter the registered address'; if (!v.state || !v.city) return err.textContent = 'Enter state and city'; if (v.contact_phone.length < 7) return err.textContent = 'Enter a contact phone'; if (v.description.length < 30) return err.textContent = 'Describe the business in at least 30 characters'; if (!docs.length) return err.textContent = 'Upload at least one document'; if (!f.agree.checked) return err.textContent = 'Please confirm the declaration';
      var b = f.querySelector('button:not([type=button])'); b.disabled = true;
      DB.applyVerification(v).then(function () { A.toast('Application submitted — our team will review it', 'badge-verified'); try { sessionStorage.removeItem('aw_tier'); } catch (er) { /* ignore */ } return DB.loadCatalogue(); }).then(function () { A.render(); }).catch(function (er) { b.disabled = false; err.textContent = A.errMsg(er); });
    });
    /* add documents to a pending application */
    if (!f && up) { var appId = null; DB.myApplication(co.id).then(function (a) { appId = a; }); var origPush = docs.push; docs.push = function (d) { origPush.call(docs, d); if (appId) DB.addApplicationDocs(appId.id, (appId.docs || []).concat(docs)).then(function (a) { appId = a; docs.length = 0; A.toast('Document added to your application', 'check'); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); }; }
    /* fee payments (Paystack inline → server confirmation; never verifies the business) */
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-payfee]'); if (!b) return;
      var kind = b.getAttribute('data-payfee'), amt = +b.getAttribute('data-amt'), tier = b.getAttribute('data-tier'); b.disabled = true;
      DB.myApplication(co.id).then(function (app) {
        var ref = 'AWV-' + co.id.slice(0, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
        return DB.createVerPayment({ application_id: app ? app.id : null, company_id: co.id, tier_id: tier, kind: kind, amount: amt, currency: C.currency || 'NGN', method: 'paystack', reference: ref }).then(function (pay) {
          return loadPaystack().then(function () {
            var h = window.PaystackPop.setup({ key: C.paystackPublicKey, email: A.state.user.email, amount: Math.round(amt * 100), currency: C.currency || 'NGN', ref: ref, metadata: { payment_id: pay.id, company_id: co.id, kind: kind },
              callback: function (resp) { A.toast('Confirming payment…', 'refresh-cw'); DB.verifyVerPayment(resp.reference, pay.id).then(function () { A.toast('Payment recorded. Your application stays in review.', 'check'); A.render(); }).catch(function (er) { A.toast(A.errMsg(er), 'circle-alert', 'err'); b.disabled = false; }); },
              onClose: function () { b.disabled = false; } });
            h.openIframe();
          });
        });
      }).catch(function (er) { b.disabled = false; A.toast(A.errMsg(er), 'circle-alert', 'err'); });
    });
  }

  /* ════════ ADMIN ════════ */
  function adminQueue() {
    return Promise.all([loadTiers(true), DB.admin.applications()]).then(function (res) {
      var list = res[1] || []; var counts = {}; list.forEach(function (a) { counts[a.status] = (counts[a.status] || 0) + 1; });
      var filters = ['pending', 'verified', 'rejected', 'expired', 'suspended'].map(function (s) { return '<button class="chip-f" data-vf="' + s + '">' + statusPill(s) + ' <b>' + (counts[s] || 0) + '</b></button>'; }).join('');
      return '<div class="dash-top"><div><h1>Verification applications</h1><p>' + (counts.pending || 0) + ' waiting for review</p></div><div class="chip-row">' + filters + '<button class="chip-f on" data-vf="">All <b>' + list.length + '</b></button></div></div>' +
        panel('Applications', list.length ? '<div class="tbl-wrap"><table class="tbl" id="vqTable"><thead><tr><th>Business</th><th>Tier</th><th>Applicant</th><th>Registration</th><th>Documents</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (a, i) {
          var t = tierOf(a.tier_id); var co = a.companies || {};
          return '<tr style="--i:' + Math.min(i, 20) + '" data-status="' + a.status + '"><td><a class="link" href="#/company/' + esc(a.company_id) + '"><b>' + esc(a.legal_name || co.name || a.company_id) + '</b></a><br><small>' + esc(co.name || '') + ' · ' + esc([a.city, a.state, a.country].filter(Boolean).join(', ')) + '</small><br><small>' + esc(a.business_type || '') + (a.sectors && a.sectors.length ? ' · ' + a.sectors.map(function (s) { return (D.secMap[s] || {}).short || s; }).join(', ') : '') + '</small></td>' +
            '<td>' + (t ? '<span class="vbadge vb-' + t.badge + '">' + ic('badge-verified') + '<span>' + esc(t.name) + '</span></span>' : '<small>' + esc(a.tier_id || '—') + '</small>') + '</td>' +
            '<td>' + (a.profiles ? esc(a.profiles.name) + '<br><small>' + esc(a.profiles.email) + '</small>' : '') + '<br><small>' + esc(a.contact_phone || '') + '</small></td>' +
            '<td><small>' + esc(a.reg_type || '') + '</small><br><b>' + esc(a.reg_number || '') + '</b>' + (a.tax_id ? '<br><small>TIN ' + esc(a.tax_id) + '</small>' : '') + (a.website ? '<br><a class="link" target="_blank" rel="noopener" href="' + esc(a.website) + '"><small>' + esc(a.website.replace(/^https?:\/\//, '')) + '</small></a>' : '') + '</td>' +
            '<td>' + (a.docs || []).map(function (d, j) { return '<a class="link" target="_blank" rel="noopener" href="' + esc(d.url || d) + '">' + ic('file-text') + ' ' + esc(d.name || 'Doc ' + (j + 1)) + '</a><br>'; }).join('') + (a.docs_requested ? '<small class="warn-t">Requested: ' + esc(a.docs_requested) + '</small>' : '') + '</td>' +
            '<td>' + statusPill(a.status) + '<br><small>' + fmtDate(a.created_at) + (a.expires_at ? '<br>until ' + fmtDate(a.expires_at) : '') + '</small>' + (a.admin_note ? '<br><small>' + esc(a.admin_note) + '</small>' : '') + '</td>' +
            '<td><div class="vq-actions">' + (a.status === 'pending' ? '<button class="btn btn-xs btn-p" data-vact="approve" data-id="' + a.id + '">Approve</button><button class="btn btn-xs btn-ghost" data-vact="request_docs" data-id="' + a.id + '">Request docs</button><button class="btn btn-xs btn-danger" data-vact="reject" data-id="' + a.id + '">Reject</button>' : '') +
            (a.status === 'verified' ? '<button class="btn btn-xs btn-ghost" data-vact="renew" data-id="' + a.id + '">Renew</button><button class="btn btn-xs btn-ghost" data-vact="suspend" data-id="' + a.id + '">Suspend</button><button class="btn btn-xs btn-danger" data-vact="revoke" data-id="' + a.id + '">Revoke</button>' : '') +
            (a.status === 'suspended' ? '<button class="btn btn-xs btn-p" data-vact="reinstate" data-id="' + a.id + '">Reinstate</button><button class="btn btn-xs btn-danger" data-vact="revoke" data-id="' + a.id + '">Revoke</button>' : '') +
            (a.status === 'expired' ? '<button class="btn btn-xs btn-p" data-vact="renew" data-id="' + a.id + '">Renew</button>' : '') +
            (a.status === 'rejected' ? '<button class="btn btn-xs btn-ghost" data-vact="approve" data-id="' + a.id + '">Approve anyway</button>' : '') + '</div><details class="vq-more"><summary>Details</summary><p>' + esc(a.description || '') + '</p><small>' + esc(a.address || '') + '<br>' + esc(a.contact_name || '') + ' · ' + esc(a.contact_email || '') + '</small></details></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('badge-verified') + '<h3>No applications yet</h3><p>Applications submitted from seller dashboards appear here.</p></div>');
    });
  }
  function tierForm(t) {
    var txt = function (a) { return esc((a || []).join('\n')); };
    return '<form class="form tier-form" data-tierform="' + esc(t.id) + '"><div class="fld"><label>Tier ID (slug, cannot change)</label><input name="id" value="' + esc(t.id) + '" ' + (t._new ? 'required placeholder="e.g. cooperative"' : 'readonly') + '></div><div class="fld"><label>Display name</label><input name="name" required value="' + esc(t.name) + '"></div>' +
      '<div class="fld full"><label>Tagline</label><input name="tagline" value="' + esc(t.tagline || '') + '"></div>' +
      '<div class="fld"><label>Price (₦) — leave blank for "not priced yet"</label><input name="price" type="number" min="0" step="1" value="' + (t.price === null || t.price === undefined ? '' : t.price) + '"></div><div class="fld"><label>Application fee (₦)</label><input name="application_fee" type="number" min="0" step="1" value="' + (+t.application_fee || 0) + '"></div>' +
      '<div class="fld"><label>Renewal price (₦) — blank = same as price</label><input name="renewal_price" type="number" min="0" step="1" value="' + (t.renewal_price === null || t.renewal_price === undefined ? '' : t.renewal_price) + '"></div><div class="fld"><label>Duration (days)</label><input name="duration_days" type="number" min="30" step="1" value="' + (t.duration_days || 365) + '"></div>' +
      '<div class="fld"><label>Badge style</label><select name="badge">' + ['green', 'gold', 'platinum', 'global'].map(function (b) { return '<option ' + (t.badge === b ? 'selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div><div class="fld"><label>Placement rank (higher = earlier in directory)</label><input name="placement" type="number" min="0" step="1" value="' + (t.placement || 0) + '"></div>' +
      '<div class="fld"><label>Sort order</label><input name="sort" type="number" step="1" value="' + (t.sort || 0) + '"></div><div class="fld"><label>Flags</label><div class="chips"><label class="chip ' + (t.featured ? 'on' : '') + '"><input type="checkbox" name="featured" ' + (t.featured ? 'checked' : '') + '>' + ic('star') + 'Eligible for homepage strip</label><label class="chip ' + (t.active !== false ? 'on' : '') + '"><input type="checkbox" name="active" ' + (t.active !== false ? 'checked' : '') + '>' + ic('check') + 'Active (visible to sellers)</label></div></div>' +
      '<div class="fld"><label>Eligibility (one per line)</label><textarea name="eligibility">' + txt(t.eligibility) + '</textarea></div><div class="fld"><label>Requirements (one per line)</label><textarea name="requirements">' + txt(t.requirements) + '</textarea></div><div class="fld full"><label>Benefits (one per line — list only benefits the platform really delivers)</label><textarea name="benefits">' + txt(t.benefits) + '</textarea></div>' +
      '<div class="full" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn btn-p btn-sm">' + ic('check') + ' Save tier</button>' + (t._new ? '' : '<button type="button" class="btn btn-ghost btn-sm btn-danger" data-deltier="' + esc(t.id) + '">' + ic('trash-2') + ' Delete</button>') + '<span class="vbadge vb-' + (t.badge || 'green') + ' vb-lg" style="margin-left:auto">' + ic('badge-verified') + '<span>' + esc(t.name || 'Preview') + '</span></span></div></form>';
  }
  function adminTiers(readonly) {
    return loadTiers(true).then(function () {
      var all = readonly ? tiers : tiers; /* active + inactive both come from DB for admins */
      return (readonly ? '' : '<div class="dash-top"><div><h1>Verification tiers</h1><p>Names, pricing, durations, benefits and badge styles — changes apply instantly across the site</p></div></div>') +
        (readonly ? '' : '<div class="note" style="margin-bottom:16px">' + ic('info') + ' Leave a price blank until you have decided it; sellers then see "Pricing confirmed at review" instead of a number. Fees never verify a business automatically.</div>') +
        all.map(function (t) { return readonly ? tierCard(t) : panel(esc(t.name) + ' <small style="font-weight:500;color:var(--text-3)">' + esc(t.id) + '</small>', tierForm(t)); }).join(readonly ? '' : '') +
        (readonly ? '' : panel('Add a tier', tierForm({ _new: true, id: '', name: '', tagline: '', price: null, application_fee: 0, renewal_price: null, duration_days: 365, badge: 'green', placement: 0, sort: (tiers.length + 1), featured: false, active: true, eligibility: [], requirements: [], benefits: [] })));
    }).then(function (h) { return readonly ? '<div class="dash-top"><div><h1>Verification tiers</h1><p>Public tier configuration (read-only)</p></div></div><div class="tiers">' + h + '</div>' : h; });
  }
  function adminPayments() {
    return DB.admin.verPayments().then(function (list) {
      list = list || []; var paid = list.filter(function (p) { return p.status === 'paid'; }).reduce(function (a, p) { return a + +p.amount; }, 0);
      return '<div class="dash-top"><div><h1>Verification payments</h1><p>' + money(paid) + ' received · ' + list.length + ' records</p></div></div>' + panel('Payments', list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Business</th><th>Item</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (p, i) { return '<tr style="--i:' + Math.min(i, 20) + '"><td>' + fmtDate(p.created_at) + '</td><td><a class="link" href="#/company/' + esc(p.company_id) + '">' + esc((p.companies || {}).name || p.company_id) + '</a><br><small>' + esc(p.tier_id || '') + '</small></td><td>' + { application_fee: 'Application fee', tier: 'Tier fee', renewal: 'Renewal' }[p.kind] + '</td><td><b>' + money(+p.amount) + '</b></td><td>' + esc(p.method) + '</td><td><small>' + esc(p.reference || '') + '</small></td><td><span class="pill ' + (p.status === 'paid' ? 'ok' : p.status === 'pending' ? 'pend' : 'bad') + '">' + p.status + '</span>' + (p.paid_at ? '<br><small>' + fmtDate(p.paid_at) + '</small>' : '') + '</td><td>' + (p.status === 'pending' ? '<button class="btn btn-xs btn-ghost" data-markpay="' + p.id + '" data-st="paid">Mark paid (transfer)</button> <button class="btn btn-xs btn-ghost" data-markpay="' + p.id + '" data-st="failed">Failed</button>' : p.status === 'paid' ? '<button class="btn btn-xs btn-ghost" data-markpay="' + p.id + '" data-st="refunded">Refunded</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('credit-card') + '<h3>No verification payments yet</h3></div>');
    });
  }
  function bindAdmin(root, sub) {
    var act = function (p, msg) { p.then(function () { A.toast(msg, 'check'); return DB.loadCatalogue(); }).then(function () { A.render(); }).catch(function (e) { A.toast(A.errMsg(e), 'circle-alert', 'err'); }); };
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-vact]'))) {
        var action = t.getAttribute('data-vact'), id = +t.getAttribute('data-id'), note = '';
        var prompts = { reject: 'Reason for rejection (shown to the seller):', request_docs: 'Which documents do you need? (shown to the seller):', suspend: 'Reason for suspension (shown to the seller):', revoke: 'Reason for revocation (shown to the seller):', approve: 'Optional note to the seller:', renew: 'Optional note:', reinstate: 'Optional note:' };
        note = prompt(prompts[action] || 'Note:'); if (note === null) return; if ((action === 'reject' || action === 'request_docs' || action === 'suspend' || action === 'revoke') && !note.trim()) return A.toast('A reason is required', 'circle-alert', 'err');
        act(DB.admin.decideApplication(id, action, note.trim()), { approve: 'Business verified', reject: 'Application rejected', request_docs: 'Documents requested', suspend: 'Verification suspended', revoke: 'Verification revoked', renew: 'Verification renewed', reinstate: 'Verification reinstated' }[action]);
      } else if ((t = e.target.closest('[data-vf]'))) {
        $$('[data-vf]', root).forEach(function (x) { x.classList.toggle('on', x === t); }); var f = t.getAttribute('data-vf');
        $$('#vqTable tbody tr', root).forEach(function (tr) { tr.style.display = !f || tr.getAttribute('data-status') === f ? '' : 'none'; });
      } else if ((t = e.target.closest('[data-deltier]'))) {
        if (confirm('Delete this tier? Businesses already verified under it keep their badge until expiry.')) act(DB.admin.deleteTier(t.getAttribute('data-deltier')), 'Tier deleted');
      } else if ((t = e.target.closest('[data-markpay]'))) {
        var st = t.getAttribute('data-st'); if (confirm('Mark this payment as ' + st + '? This does not change the business\'s verification.')) act(DB.admin.markVerPayment(+t.getAttribute('data-markpay'), st), 'Payment updated');
      }
    });
    root.addEventListener('change', function (e) { var l = e.target.closest('.chip'); if (l && e.target.type === 'checkbox') l.classList.toggle('on', e.target.checked); });
    root.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-tierform]'); if (!f) return; e.preventDefault();
      var split = function (v) { return v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
      var t = { id: f.id.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''), name: f.name.value.trim(), tagline: f.tagline.value.trim(), price: f.price.value === '' ? null : +f.price.value, application_fee: +f.application_fee.value || 0, renewal_price: f.renewal_price.value === '' ? null : +f.renewal_price.value, duration_days: +f.duration_days.value || 365, badge: f.badge.value, placement: +f.placement.value || 0, sort: +f.sort.value || 0, featured: f.featured.checked, active: f.active.checked, eligibility: split(f.eligibility.value), requirements: split(f.requirements.value), benefits: split(f.benefits.value) };
      if (!t.id || t.name.length < 2) return A.toast('Tier needs an ID and a name', 'circle-alert', 'err');
      act(DB.admin.saveTier(t), 'Tier saved');
    });
  }

  /* expose */
  A.VER = { sellerView: sellerView, bindSeller: bindSeller, adminQueue: adminQueue, adminTiers: adminTiers, adminPayments: adminPayments, bindAdmin: bindAdmin, loadTiers: loadTiers, tiers: function () { return tiers; }, tierOf: tierOf, tierName: tierName, socialLinks: socialLinks };
  A.vbadge = vbadge; A.repLabel = repLabel; A.repPill = repPill; A.socialLinks = socialLinks;
  if (DB.configured()) loadTiers().then(function () { /* re-render if badges are visible */ if (tiersLoaded && document.querySelector('.vbadge')) A.render(); });
})(window.AW);
