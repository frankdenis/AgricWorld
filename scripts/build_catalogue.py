#!/usr/bin/env python3
"""Builds the AgricWorld catalogue:
   assets/js/data.js        (sectors, companies, products — compact arrays)
   supabase/seed.sql        (same catalogue for the database)
   assets/data/credits.json (photo attribution; photos themselves are served from the Wikimedia Commons CDN)
Usage: python3 scripts/build_catalogue.py [--pool /tmp/pool]
"""
import json, os, re, random, subprocess, sys, hashlib, shutil
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from spec_a import SPEC_A; from spec_b import SPEC_B; from spec_c import SPEC_C
SPEC = {**SPEC_A, **SPEC_B, **SPEC_C}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POOL = sys.argv[sys.argv.index('--pool') + 1] if '--pool' in sys.argv else '/var/tmp/pool'
random.seed(20260924)

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# ── existing hand-authored catalogue (kept verbatim) ──
js = subprocess.run(['node', '-e', "global.window={AW_BASE:''};require(process.argv[1]);console.log(JSON.stringify(window.AW_DATA))", os.path.join(ROOT, 'scripts/data.base.js')], capture_output=True, text=True)
BASE = json.loads(js.stdout)
sectors, base_companies, base_products = BASE['sectors'], BASE['companies'], BASE['products']

# ── photo pool ──
_ip = os.path.join(ROOT, 'scripts/photos/index_clean.json') if os.path.exists(os.path.join(ROOT, 'scripts/photos/index_clean.json')) else '/home/user/tools/index_clean.json'
pool_index = json.load(open(_ip)) if os.path.exists(_ip) else {}
# keep only photos we can serve from the Wikimedia CDN (thumb path); drop the rest
WMRE = re.compile(r'^https://(?:upload|thumb)\.wikimedia\.org/wikipedia/commons/thumb/(.+?)/\d+px-([^?]+)')
def wm_path(item):
    m = WMRE.match(item.get('url', ''))
    return m.group(1) if (m and item.get('src') == 'commons' and m.group(2) == m.group(1).split('/')[-1]) else None
for sec in pool_index:
    for sub in pool_index[sec]:
        pool_index[sec][sub] = [x for x in pool_index[sec][sub] if wm_path(x)]
print('photo pool:', _ip, sum(len(l) for s in pool_index.values() for l in s.values()), 'photos (Commons, hotlinkable)')
credits = {}
used_files = {}
OUT_DATA = os.path.join(ROOT, 'assets/data')
os.makedirs(OUT_DATA, exist_ok=True)

def pool_for(sec, sub):
    return list(pool_index.get(sec, {}).get(slug(sub), []))

def sector_pool(sec):
    out = []
    for lst in pool_index.get(sec, {}).values(): out += lst
    return out

def place_photo(item, sec=None, sub=None, **kw):
    """Photos are served straight from the Wikimedia Commons CDN (any width). Returns a compact 'wm:' key."""
    src = item['file'] if 'file' in item else item['url']
    if src in used_files: return used_files[src]
    key = 'wm:' + str(int(item.get('w') or 1280)) + ':' + wm_path(item)
    used_files[src] = key
    credit(key, item)
    return key

def credit(key, item):
    credits[key] = {'title': item.get('title', ''), 'by': item.get('credit', ''), 'license': item.get('license', ''), 'source': item.get('page', '')}

hotlinked = set()
def hotlink(item):
    return place_photo(item)

class RoundRobin:
    def __init__(self, items): self.items = items; self.i = 0
    def next(self):
        if not self.items: return None
        it = self.items[self.i % len(self.items)]; self.i += 1; return it

# ── company generation ──
CITIES = [('Ibadan', 'Oyo'), ('Abeokuta', 'Ogun'), ('Kano', 'Kano'), ('Kaduna', 'Kaduna'), ('Jos', 'Plateau'), ('Makurdi', 'Benue'), ('Enugu', 'Enugu'), ('Onitsha', 'Anambra'), ('Aba', 'Abia'), ('Owerri', 'Imo'), ('Port Harcourt', 'Rivers'), ('Calabar', 'Cross River'), ('Uyo', 'Akwa Ibom'), ('Benin City', 'Edo'), ('Asaba', 'Delta'), ('Akure', 'Ondo'), ('Ado-Ekiti', 'Ekiti'), ('Osogbo', 'Osun'), ('Ilorin', 'Kwara'), ('Lokoja', 'Kogi'), ('Abuja', 'FCT'), ('Minna', 'Niger'), ('Lafia', 'Nasarawa'), ('Zaria', 'Kaduna'), ('Sokoto', 'Sokoto'), ('Kebbi', 'Kebbi'), ('Gombe', 'Gombe'), ('Bauchi', 'Bauchi'), ('Yola', 'Adamawa'), ('Maiduguri', 'Borno'), ('Epe', 'Lagos'), ('Ikorodu', 'Lagos'), ('Badagry', 'Lagos'), ('Ikeja', 'Lagos'), ('Ijebu-Ode', 'Ogun'), ('Sagamu', 'Ogun'), ('Oyo', 'Oyo'), ('Ogbomoso', 'Oyo'), ('Iseyin', 'Oyo'), ('Nsukka', 'Enugu'), ('Umuahia', 'Abia'), ('Warri', 'Delta'), ('Ondo', 'Ondo'), ('Offa', 'Kwara'), ('Bida', 'Niger'), ('Keffi', 'Nasarawa'), ('Gboko', 'Benue'), ('Otukpo', 'Benue'), ('Funtua', 'Katsina'), ('Katsina', 'Katsina'), ('Dutse', 'Jigawa'), ('Damaturu', 'Yobe'), ('Jalingo', 'Taraba'), ('Yenagoa', 'Bayelsa'), ('Abakaliki', 'Ebonyi'), ('Awka', 'Anambra')]
PREFIX = ['Greenfield', 'Sunrise', 'Golden Harvest', 'Savannah', 'Delta', 'Niger Valley', 'Plateau', 'Riverside', 'Palm Grove', 'Ajike', 'Obinna', 'Danjuma', 'Adewale', 'Nwosu', 'Bello', 'Okafor', 'Olamide', 'Fatima', 'Musa', 'Chukwu', 'Ibrahim', 'Eze', 'Amina', 'Yusuf', 'Adeyemi', 'Onyeka', 'Sadiq', 'Tunde', 'Ngozi', 'Halima', 'Emeka', 'Abdullahi', 'Oluwaseun', 'Kelechi', 'Zainab', 'Bamidele', 'Umar', 'Chidera', 'Aisha', 'Femi', 'Prime', 'Royal', 'Apex', 'Crown', 'Heritage', 'Unity', 'Zenith', 'Trust', 'Victory', 'Evergreen', 'Fresh Fields', 'Harmony', 'Bright', 'Grace', 'Nexus', 'Pioneer', 'Summit', 'Horizon', 'Sahel', 'Coastal', 'Highland', 'Lowland', 'Fadama', 'Kwara', 'Benue', 'Ogun', 'Oyo', 'Kano', 'Jos', 'Edo', 'Enugu', 'Kaduna', 'Ondo', 'Cross River', 'Middle Belt', 'Northern Star', 'Eastern', 'Western', 'Lagoon', 'Atlantic', 'Zuma', 'Olumo', 'Idanre', 'Obudu', 'Mambilla', 'Gurara', 'Kainji', 'Shiroro', 'Oshun', 'Ikogosi']
TYPES = {
 'poultry': ['Hatchery', 'Poultry Farms', 'Farms', 'Agro Ltd', 'Poultry Ventures', 'Layers Farm', 'Broilers', 'Agro-Allied'],
 'livestock': ['Ranch', 'Livestock Ltd', 'Cattle Co.', 'Farms', 'Agro Ventures', 'Piggery', 'Goat Farm', 'Livestock Market'],
 'fisheries': ['Aqua Farms', 'Fisheries', 'Fish Farm', 'Aquaculture Ltd', 'Hatcheries', 'Catfish Ventures', 'Aqua Ltd', 'Fish Depot'],
 'crops': ['Farms', 'Agro Commodities', 'Grains Ltd', 'Farm Estate', 'Agro Ltd', 'Commodities', 'Growers', 'Agro-Allied'],
 'seeds': ['Seeds Ltd', 'Seed Company', 'Nurseries', 'Agro Seeds', 'Seed Enterprises', 'Plant Nursery', 'Seeds & Nursery', 'Agrigenetics'],
 'agrochem': ['Agrochemicals', 'Crop Protection', 'Agro Inputs', 'Agrochem Ltd', 'Farm Supplies', 'Agro Care', 'Chemicals Ltd', 'Agro Depot'],
 'vet': ['Veterinary Clinic', 'Vet Services', 'Animal Health', 'Veterinary Centre', 'Vet Pharma', 'Animal Care', 'Vet Consult', 'Livestock Health'],
 'equipment': ['Farm Equipment', 'Agro Tools', 'Equipment Ltd', 'Farm Machines', 'Agro Engineering', 'Tools & Equipment', 'Agro Supplies', 'Mechanisation Ltd'],
 'machinery': ['Machinery Ltd', 'Tractors', 'Agro Machinery', 'Mechanisation Services', 'Farm Machinery', 'Tractor Hire', 'Heavy Equipment', 'Agro Motors'],
 'fertilizer': ['Fertilizers', 'Agro Inputs', 'Fertilizer Depot', 'Soil Solutions', 'Organics', 'Agro Nutrients', 'Fertilizer Ltd', 'Compost Co.'],
 'feed': ['Feeds Ltd', 'Feed Mills', 'Animal Feeds', 'Feed Company', 'Nutrition Ltd', 'Feed Depot', 'Agro Feeds', 'Feedmill'],
 'fruits': ['Fresh Produce', 'Farms', 'Vegetables Ltd', 'Fruit Farms', 'Greens', 'Fresh Foods', 'Horticulture', 'Farm Fresh'],
 'produce': ['Agro Processing', 'Farm Produce', 'Foods Ltd', 'Agro Products', 'Naturals', 'Harvest Ltd', 'Farm Foods', 'Agro Trading'],
 'processing': ['Agro Processing', 'Mills Ltd', 'Processing Co.', 'Machinery Ltd', 'Agro Industries', 'Food Processing', 'Engineering', 'Agro Tech'],
 'storage': ['Warehousing', 'Storage Ltd', 'Cold Chain', 'Silos Ltd', 'Logistics & Storage', 'Agro Storage', 'Warehouse Co.', 'Commodity Storage'],
 'irrigation': ['Irrigation Ltd', 'Water Solutions', 'Irrigation Systems', 'Boreholes', 'Drip Systems', 'Water Works', 'Agro Water', 'Solar Pumps'],
 'greenhouse': ['Greenhouses', 'Hydroponics', 'Protected Farming', 'Greenhouse Ltd', 'Urban Farms', 'Agro Structures', 'Vertical Farms', 'Horticulture Ltd'],
 'agtech': ['AgriTech', 'Drone Services', 'Agro Digital', 'Smart Farms', 'Precision Agric', 'Farm Tech', 'Agro Innovations', 'Data Farms'],
 'logistics': ['Logistics', 'Freight Ltd', 'Cold Logistics', 'Agro Logistics', 'Express', 'Cargo Services', 'Shipping Ltd', 'Supply Chain'],
 'transport': ['Haulage', 'Transport Ltd', 'Trucking', 'Agro Haulage', 'Logistics', 'Motors', 'Truck Services', 'Fleet Services'],
 'advisory': ['Agro Consult', 'Advisory Services', 'Agribusiness Consulting', 'Farm Advisory', 'Agro Insurance Brokers', 'Agric Finance', 'Extension Services', 'Agro Academy'],
 'services': ['Farm Services', 'Agro Services', 'Land Services', 'Farm Contractors', 'Agro Works', 'Farm Solutions', 'Rural Works', 'Agro Estates'],
}
DESC = {
 'poultry': ['{name} runs a {size} integrated poultry operation in {city} supplying {p1}, {p2} and {p3} to farmers and retailers across {region}.', 'Family-owned since {year}, {name} specialises in {p1} and {p2} with strict biosecurity and full vaccination records.'],
 'livestock': ['{name} sources and raises {p1}, {p2} and {p3} from {city} with veterinary inspection and licensed livestock transport nationwide.', 'A {size} ranch established in {year}, {name} supplies vet-checked {p1} and {p2} to markets across {region}.'],
 'fisheries': ['{name} operates {size} hatchery and grow-out ponds in {city} producing {p1}, {p2} and {p3} year-round.', 'Since {year}, {name} has supplied {p1} and {p2} to fish farmers in {region} with survival guarantees.'],
 'default': ['{name} is a {size} {sector} business based in {city}, supplying {p1}, {p2} and {p3} to farmers and agribusinesses across {region} since {year}.', 'Established {year}, {name} provides {p1} and {p2} with dependable delivery and after-sales support throughout {region}.'],
}
REGION = {'Lagos': 'the South-West', 'Ogun': 'the South-West', 'Oyo': 'the South-West', 'Osun': 'the South-West', 'Ondo': 'the South-West', 'Ekiti': 'the South-West', 'Kwara': 'the Middle Belt', 'Kogi': 'the Middle Belt', 'Niger': 'the Middle Belt', 'Benue': 'the Middle Belt', 'Plateau': 'the Middle Belt', 'Nasarawa': 'the Middle Belt', 'FCT': 'the Middle Belt', 'Kano': 'the North', 'Kaduna': 'the North', 'Katsina': 'the North', 'Sokoto': 'the North', 'Kebbi': 'the North', 'Jigawa': 'the North', 'Bauchi': 'the North-East', 'Gombe': 'the North-East', 'Adamawa': 'the North-East', 'Borno': 'the North-East', 'Yobe': 'the North-East', 'Taraba': 'the North-East', 'Enugu': 'the South-East', 'Anambra': 'the South-East', 'Abia': 'the South-East', 'Imo': 'the South-East', 'Ebonyi': 'the South-East', 'Rivers': 'the Niger Delta', 'Delta': 'the Niger Delta', 'Edo': 'the South-South', 'Cross River': 'the South-South', 'Akwa Ibom': 'the South-South', 'Bayelsa': 'the Niger Delta'}
SIZES = [('5-20', 'growing'), ('20-50', 'mid-sized'), ('50-200', 'large'), ('200+', 'leading')]

used_names = set(c['name'] for c in base_companies); used_ids = set(c['id'] for c in base_companies)
companies = list(base_companies)
sec_names = {s['id']: s for s in sectors}
def new_company(sec, subs, cover_pool, n):
    for _ in range(200):
        name = f"{random.choice(PREFIX)} {random.choice(TYPES[sec])}"
        if name not in used_names: break
    used_names.add(name); cid = slug(name)
    while cid in used_ids: cid += '-' + str(random.randint(2, 9))
    used_ids.add(cid)
    city, state = random.choice(CITIES); year = random.randint(2004, 2022); staff, size = random.choice(SIZES)
    ps = random.sample(subs, min(3, len(subs)))
    tmpl = random.choice(DESC.get(sec, DESC['default']))
    desc = tmpl.format(name=name, size=size, city=city, region=REGION.get(state, 'Nigeria'), year=year, p1=ps[0].lower(), p2=ps[1 % len(ps)].lower(), p3=ps[2 % len(ps)].lower(), sector=sec_names[sec]['name'].lower())
    cover = None  # assigned after products so covers don't steal product photos
    phone = f"+234 {random.choice(['803', '805', '806', '807', '808', '810', '812', '813', '814', '816', '703', '705', '706', '708', '709', '902', '903', '905', '906', '907', '908', '915'])} {random.randint(100, 999)} {random.randint(1000, 9999)}"
    return {'id': cid, 'name': name, 'sector': sec, 'loc': f'{city}, {state}', 'ver': random.random() < 0.62, 'year': year, 'staff': staff, 'desc': desc, 'products': ps, 'services': random.sample(['Delivery', 'Consultancy', 'Installation', 'Training', 'After-sales support', 'Bulk supply', 'Farm visits', 'Financing options', 'Export packing', 'Warranty'], 3), 'cover': cover, 'phone': phone, 'email': f"info@{cid.replace('-', '')[:18]}.ng", 'whatsapp': '234' + phone[5:].replace(' ', '')}

for s in sectors:
    sec = s['id']; subs = list(SPEC[sec].keys())
    cover_pool = RoundRobin(random.sample(sector_pool(sec), len(sector_pool(sec))))
    for n in range(random.randint(7, 9)): companies.append(new_company(sec, subs, cover_pool, n))
co_by_sec = {}
for c in companies: co_by_sec.setdefault(c['sector'], []).append(c)

# ── products ──
products = list(base_products)
EXTRA = {'Hatchery Equipment': ['incubator', 'hatcher', 'brooder'], 'Poultry Housing': ['cage', 'coop', 'drinker', 'feeder'], 'Spare Parts': ['filter', 'blade', 'belt', 'tyre'], 'Feed Mills': ['mill', 'pelletizer'], 'Vet Clinics': ['clinic', 'consult'], 'Mobile Vet Services': ['visit', 'call-out'], 'Hand Tools': ['hoe', 'cutlass', 'machete', 'wheelbarrow'], 'Raw Materials': ['soybean meal', 'maize grain', 'fishmeal', 'gnc'], 'Export Grade': ['export'], 'Center Pivots': ['pivot'], 'Grow Lights': ['led', 'light'], 'Farm Land Lease': ['lease', 'hectare'], 'Storage Rental': ['rental', 'rent'], 'Planters & Seeders': ['planter', 'seeder'], 'Training Courses': ['masterclass', 'training', 'course'], 'Land Clearing': ['clearing', 'stumping'], 'Forestry': ['timber', 'log', 'teak', 'mahogany'], 'Tractor Hire': ['hire'], 'Beans & Legumes': ['sesame', 'groundnut', 'cowpea'], 'Aerators & Pumps': ['aerator'], 'Cold Storage': ['cold'], 'Layers & Pullets': ['pullet']}
STOP = {'and', 'services', 'grade', 'size', 'products', 'materials', 'kits', 'equipment', 'housing', 'lines', 'seed', 'seeds'}
def guess_sub(p):
    subs = list(SPEC[p['sec']].keys()); name = (p['name'] + ' ' + p.get('desc', '')).lower()
    best, score = subs[0], 0
    for sub in subs:
        words = [w for w in re.split(r'[^a-z]+', sub.lower()) if len(w) > 2 and w not in STOP] + EXTRA.get(sub, [])
        sc = sum(2 if w in EXTRA.get(sub, []) else 1 for w in words if w.rstrip('s') in name)
        if sc > score: best, score = sub, sc
    return best
for p in products:
    if not p.get('sub'): p['sub'] = guess_sub(p)
pid = 1000
TAGS = ['hot', 'new', 'sale', None, None, None, None, None]
for s in sectors:
    sec = s['id']
    for sub, items in SPEC[sec].items():
        photos = pool_for(sec, sub)                      # already sorted best-first by clip_filter
        if len(photos) < 14:                             # thin sub: borrow from the rest of the sector (best-scored first)
            extra = sorted([x for x in sector_pool(sec) if x not in photos], key=lambda x: -x.get('score', 0)); photos = photos + extra[:14 - len(photos) + 6]
        # expand items -> offers first so photos can be assigned uniquely
        offers_list = []
        for (name, unit, price, moq, delivery, desc, specs, variants) in items:
            variants = variants or [("", price)]
            for (label, vprice) in variants:
                pname = (name if not label else name + ' ' + label).replace('  ', ' ').strip()
                n_off = 1 + (1 if random.random() < 0.55 else 0) + (1 if random.random() < 0.18 else 0)
                for o in range(n_off): offers_list.append((pname, unit, vprice, moq, delivery, desc, specs, o))
        n = len(offers_list)
        primaries = photos[:n]; extras = photos[n:] or photos
        rr_extra = RoundRobin(extras)
        sellers = RoundRobin(random.sample(co_by_sec[sec], len(co_by_sec[sec])))
        for i, (pname, unit, vprice, moq, delivery, desc, specs, o) in enumerate(offers_list):
            ph = primaries[i % len(primaries)] if primaries else None
            img = place_photo(ph, sec, sub) if ph else s['img']
            gal = [img]
            tries = 0
            while len(gal) < 3 and tries < 6:
                tries += 1; g = rr_extra.next()
                if not g or g is ph: continue
                u = hotlink(g)
                if u and u not in gal: gal.append(u)
            pid += 1; co = sellers.next()
            p_price = vprice if o == 0 else round(vprice * random.uniform(0.95, 1.08) / (10 if vprice < 10000 else 100)) * (10 if vprice < 10000 else 100)
            tag = random.choice(TAGS) if o == 0 else None
            old = round(p_price * random.uniform(1.06, 1.18) / 10) * 10 if tag == 'sale' else None
            products.append({'id': pid, 'sec': sec, 'sub': sub, 'name': pname, 'price': p_price, 'unit': unit, 'old': old, 'co': co['id'], 'img': img, 'gal': gal, 'tag': tag, 'stock': 'in', 'moq': moq, 'delivery': delivery, 'desc': desc, 'specs': specs})

# company covers from photos not used by products
for sec in co_by_sec:
    sp = [x for x in sector_pool(sec) if x['file'] not in used_files]; random.shuffle(sp); rr = RoundRobin(sp)
    for c in co_by_sec[sec]:
        if c.get('cover'): continue
        x = rr.next(); c['cover'] = place_photo(x, sec, 'cover', maxw=1000, q=52) if x else sec_names[sec]['img']

# sector galleries (6 photos each) for the sector page
for s in sectors:
    sp = [x for x in sector_pool(s['id']) if x['file'] not in used_files] or sector_pool(s['id']); random.shuffle(sp)
    s['gallery'] = [place_photo(x, s['id'], 'gallery', maxw=880, q=56) for x in sp[:6]]
    s['subs'] = list(SPEC[s['id']].keys())

# ── write data.js (compact) ──
P_KEYS = ['id', 'sec', 'sub', 'name', 'price', 'unit', 'old', 'co', 'img', 'gal', 'tag', 'stock', 'moq', 'delivery', 'desc', 'specs']
def strip_img(v):
    if isinstance(v, str): return v.replace('assets/img/', '')
    if isinstance(v, list): return [strip_img(x) for x in v]
    return v
rows = [[strip_img(p.get(k)) for k in P_KEYS] for p in products]
for c in companies: c['cover'] = strip_img(c['cover'])
for s in sectors:
    s['img'] = strip_img(s['img']); s['hero'] = strip_img(s['hero']); s['gallery'] = strip_img(s['gallery'])
out = f"""/* ═══════════════════════════════════════════════════════════════
   AgricWorld — Built-in catalogue ({len(sectors)} sectors, {len(companies)} companies, {len(products)} listings)
   GENERATED by scripts/build_catalogue.py — edit scripts/spec_*.py, not this file.
   Used to seed the database (supabase/seed.sql) and as the read-only
   catalogue while the database is not yet connected.
   ═══════════════════════════════════════════════════════════════ */
window.AW_DATA = (function () {{
  var IMG = (window.AW_BASE || '') + 'assets/img/', WM = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
  function pic(k, w) {{ if (!k) return ''; if (k.indexOf('wm:') === 0) {{ var i = k.indexOf(':', 3), ow = +k.slice(3, i), p = k.slice(i + 1); var steps = [500, 960, 1280, 1920]; if (ow) {{ var ok = steps.filter(function (s) {{ return s <= ow; }}); w = ok.length ? Math.min(w, ok[ok.length - 1]) : 500; }} return WM + p + '/' + w + 'px-' + p.split('/').pop(); }} return /^https?:/.test(k) ? k : IMG + k; }}
  var sectors = {json.dumps(sectors, ensure_ascii=False, separators=(',', ':'))};
  var companies = {json.dumps(companies, ensure_ascii=False, separators=(',', ':'))};
  var K = {json.dumps(P_KEYS)};
  var rows = {json.dumps(rows, ensure_ascii=False, separators=(',', ':'))};
  sectors.forEach(function (s) {{ s.img = pic(s.img, 960); s.hero = pic(s.hero, 1920); s.gallery = (s.gallery || []).map(function (g) {{ return pic(g, 960); }}); }});
  var secMap = {{}}; sectors.forEach(function (s) {{ secMap[s.id] = s; }});
  companies.forEach(function (c) {{ c.cover = pic(c.cover, 1280); }});
  var coMap = {{}}; companies.forEach(function (c) {{ coMap[c.id] = c; }});
  var products = rows.map(function (r) {{ var p = {{}}; K.forEach(function (k, i) {{ p[k] = r[i]; }}); p.img = pic(p.img, 500); p.gal = (p.gal || [p.img]).map(function (g) {{ return pic(g, 960); }}); if (p.old === null) delete p.old; if (p.tag === null) delete p.tag; return p; }});
  products.forEach(function (p) {{ var c = coMap[p.co]; p.loc = c ? c.loc : 'Lagos, Nigeria'; p.seller = c ? c.name : 'AgricWorld Seller'; p.ver = c ? c.ver : false; }});
  return {{ sectors: sectors, secMap: secMap, companies: companies, coMap: coMap, products: products, IMG: IMG, pic: pic }};
}})();
"""
open(os.path.join(ROOT, 'assets/js/data.js'), 'w').write(out)

# ── seed.sql ──
def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"
def url(v, w):
    if not v: return ''
    if v.startswith('wm:'):
        ow, p = v[3:].split(':', 1); ok = [s for s in (500, 960, 1280, 1920) if not ow.isdigit() or s <= int(ow)]; w = min(w, ok[-1]) if ok else 500
        return 'https://upload.wikimedia.org/wikipedia/commons/thumb/' + p + '/' + str(w) + 'px-' + p.split('/')[-1]
    return v if v.startswith('http') else 'assets/img/' + strip_img(v)
def arr(v): return 'array[' + ','.join(q(x) for x in v) + ']::text[]' if v else "'{}'::text[]"
lines = [f"-- AgricWorld starter catalogue (GENERATED by scripts/build_catalogue.py): {len(companies)} companies, {len(products)} listings.",
         "-- OPTIONAL. Run AFTER schema.sql. Companies have no owner until assigned from the admin console.",
         "insert into public.companies (id, name, sector, loc, descr, ver, year, staff, products, services, cover, phone, email, whatsapp) values"]
lines.append(',\n'.join(f"({q(c['id'])}, {q(c['name'])}, {q(c['sector'])}, {q(c['loc'])}, {q(c['desc'])}, {q(bool(c.get('ver')))}, {q(c.get('year'))}, {q(c.get('staff', ''))}, {arr(c.get('products', []))}, {arr(c.get('services', []))}, {q(url(c['cover'], 1280))}, {q(c.get('phone', ''))}, {q(c.get('email', ''))}, {q(c.get('whatsapp', ''))})" for c in companies) + '\non conflict (id) do nothing;')
lines.append("insert into public.products (id, co, sec, name, price, unit, old, img, gal, tag, moq, delivery, descr, specs) values")
lines.append(',\n'.join(f"({p['id']}, {q(p['co'])}, {q(p['sec'])}, {q(p['name'])}, {p['price']}, {q(p.get('unit', ''))}, {q(p.get('old'))}, {q(url(strip_img(p['img']), 500))}, {arr([url(strip_img(g), 960) for g in p.get('gal', [])])}, {q(p.get('tag'))}, {p.get('moq', 1)}, {q(p.get('delivery', ''))}, {q(p.get('desc', ''))}, {q(json.dumps(p.get('specs', {}), ensure_ascii=False))}::jsonb)" for p in products) + '\non conflict (id) do nothing;')
lines.append("select setval('public.products_id_seq', (select max(id) from public.products));")
open(os.path.join(ROOT, 'supabase/seed.sql'), 'w').write('\n'.join(lines) + '\n')

json.dump(credits, open(os.path.join(OUT_DATA, 'credits.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(f"sectors {len(sectors)} companies {len(companies)} products {len(products)} photos placed {len(used_files)} hotlinked {len(hotlinked)}")
print('data.js', os.path.getsize(os.path.join(ROOT, 'assets/js/data.js')) // 1024, 'KB; credits.json', os.path.getsize(os.path.join(OUT_DATA, 'credits.json')) // 1024, 'KB')
