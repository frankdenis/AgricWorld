#!/usr/bin/env python3
"""AgricWorld photo harvester.
Sources: Wikimedia Commons (search API, 1280px thumbs) + Openverse (Flickr/StockSnap/Rawpixel, CC commercial).
Filters: JPEG, landscape 1.2–2.2, width>=1200, title/description blacklist, then perceptual quality checks.
Output: /tmp/pool/<sector>/<sub-slug>/<n>.jpg + /tmp/pool/index.json
"""
import json, os, re, sys, time, urllib.parse, urllib.request, hashlib, concurrent.futures as cf, io
from PIL import Image, ImageStat, ImageFilter
import numpy as np

UA = 'AgricWorldBot/1.0 (https://agric-world.vercel.app; frankdenis607@gmail.com)'
POOL = '/var/tmp/pool'
os.makedirs(POOL, exist_ok=True)
QUERIES = json.load(open(os.path.join(os.path.dirname(__file__), 'queries.json')))
BAD = re.compile(r"\b(map|diagram|logo|chart|graph|drawing|painting|stamp|coin|poster|book|page|scan|engraving|illustration|museum|statue|sculpture|cartoon|clipart|icon|banknote|screenshot|table|label|sign|flag|seal|emblem|manuscript|text|document|plate|figure|fig\.|sketch|lithograph|woodcut|print|advert|menu|recipe|dish|meal|plated|restaurant|cooked|soup|fried|1[0-9]{3}|black and white|monochrome|b&w|aerial view of city|skyline|street|church|temple|cemetery|graffiti|toy|model|lego|cake|game|fossil|skeleton|skull|taxidermy|zoo|aquarium fish tank|wedding|portrait of|selfie|nude)\b", re.I)

def get(url, tries=3, timeout=40):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()
        except Exception as e:
            if i == tries - 1: return None
            time.sleep(1.5 * (i + 1))

def _search(srsearch, limit):
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': srsearch, 'srnamespace': 6, 'srlimit': limit, 'format': 'json'})
    d = get(u)
    if not d: return []
    try: return [s['title'] for s in json.loads(d)['query']['search']]
    except Exception: return []
def commons_search(q, limit=40):
    base = ' filetype:bitmap filemime:image/jpeg filew:>1400 fileh:>800'
    qi = _search(q + ' incategory:Quality_images' + base, limit)          # curated-quality photos first
    gen = _search(q + base, limit) if len(qi) < limit else []
    seen = set(); out = []
    for t in qi + gen:
        if t not in seen: seen.add(t); out.append(t)
    return out

def commons_info(titles):
    out = []
    for i in range(0, len(titles), 50):
        u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'titles': '|'.join(titles[i:i + 50]), 'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata', 'iiurlwidth': 480, 'iiextmetadatafilter': 'ImageDescription|Artist|LicenseShortName|Categories', 'format': 'json'})
        d = get(u)
        if not d: continue
        try: pages = json.loads(d)['query']['pages']
        except Exception: continue
        for p in pages.values():
            ii = (p.get('imageinfo') or [None])[0]
            if not ii or ii.get('mime') != 'image/jpeg': continue
            w, h = ii.get('width', 0), ii.get('height', 0)
            if w < 1200 or h < 700: continue
            ar = w / h
            if ar < 1.2 or ar > 2.2: continue
            em = ii.get('extmetadata') or {}
            desc = re.sub('<[^>]+>', ' ', (em.get('ImageDescription') or {}).get('value', ''))[:300]
            cats = (em.get('Categories') or {}).get('value', '')
            title = p['title']
            if BAD.search(title) or BAD.search(desc[:160]) or re.search(r'(maps|diagrams|drawings|paintings|scans|stamps|logos|illustrations|black and white|monochrome|screenshots)', cats, re.I): continue
            out.append({'src': 'commons', 'id': hashlib.md5(title.encode()).hexdigest()[:10], 'title': title[5:], 'url': ii.get('thumburl') or ii['url'], 'w': w, 'h': h, 'credit': re.sub('<[^>]+>', '', (em.get('Artist') or {}).get('value', ''))[:80], 'license': (em.get('LicenseShortName') or {}).get('value', ''), 'page': ii.get('descriptionurl', '')})
    return out

def openverse(q, n=20):
    u = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode({'q': q, 'license_type': 'commercial', 'page_size': n, 'aspect_ratio': 'wide', 'size': 'large', 'mature': 'false'})
    d = get(u)
    if not d: return []
    try: rs = json.loads(d).get('results', [])
    except Exception: return []
    out = []
    for r in rs:
        w, h = r.get('width') or 0, r.get('height') or 0
        if w < 1000 or h < 600: continue
        ar = w / h
        if ar < 1.2 or ar > 2.2: continue
        t = (r.get('title') or '') + ' ' + ' '.join(x.get('name', '') for x in (r.get('tags') or [])[:12])
        if BAD.search(t): continue
        if r.get('source') == 'wikimedia': continue   # already covered by Commons search
        out.append({'src': r.get('source'), 'id': r['id'][:10], 'title': (r.get('title') or '')[:120], 'url': r['url'], 'w': w, 'h': h, 'credit': (r.get('creator') or '')[:80], 'license': r.get('license', ''), 'page': r.get('foreign_landing_url', '')})
    return out

def quality(im):
    """Return (ok, reason). Rejects greyscale scans, documents, flat/blurry images."""
    small = im.convert('RGB').resize((320, int(320 * im.height / im.width)))
    a = np.asarray(small).astype(np.float32)
    hsv = np.asarray(small.convert('HSV')).astype(np.float32)
    sat = hsv[..., 1].mean()
    if sat < 28: return False, 'grey'
    white = ((a > 235).all(axis=2)).mean()
    if white > 0.42: return False, 'white'
    black = ((a < 20).all(axis=2)).mean()
    if black > 0.45: return False, 'dark'
    g = np.asarray(small.convert('L')).astype(np.float32)
    lap = np.abs(np.asarray(small.convert('L').filter(ImageFilter.FIND_EDGES)).astype(np.float32)).var()
    if lap < 60: return False, 'blur'
    if g.std() < 22: return False, 'flat'
    rg = a[..., 0] - a[..., 1]; yb = .5 * (a[..., 0] + a[..., 1]) - a[..., 2]
    colorful = np.sqrt(rg.std() ** 2 + yb.std() ** 2) + .3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
    if colorful < 14: return False, 'dull'
    return True, ''

def fetch_one(item, dest):
    if os.path.exists(dest): return dest, True, 'exists'
    d = get(item['url'], tries=2, timeout=60)
    if not d or len(d) < 8000: return dest, False, 'download'
    try:
        im = Image.open(io.BytesIO(d)); im.load()
    except Exception: return dest, False, 'decode'
    if im.width < 400: return dest, False, 'small'
    ok, why = quality(im)
    if not ok: return dest, False, why
    im = im.convert('RGB')
    if im.width > 1200: im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    im.save(dest, 'JPEG', quality=82, optimize=True, progressive=True)
    return dest, True, 'ok'

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def main():
    index = {}
    idx_path = '/home/user/tools/pool_index.json'
    if os.path.exists(idx_path): index = json.load(open(idx_path))
    seen_urls = set(v['url'] for subs in index.values() for lst in subs.values() for v in lst)
    only = sys.argv[1:]  # optional sector ids
    per_sub_target = int(os.environ.get('PER_SUB', '28'))
    pool = cf.ThreadPoolExecutor(max_workers=6)
    for sec, subs in QUERIES.items():
        if only and sec not in only: continue
        index.setdefault(sec, {})
        for sub, qs in subs.items():
            ss = slug(sub)
            have = index[sec].get(ss, [])
            if len(have) >= per_sub_target: continue
            cands = []
            for qi, q in enumerate(qs):
                cands += commons_info(commons_search(q, 40))
                if qi == 0: cands += openverse(q, 20)
                time.sleep(0.4)
            # de-dup by url and across pool
            uniq = []; su = set()
            for c in cands:
                if c['url'] in su or c['url'] in seen_urls: continue
                su.add(c['url']); uniq.append(c)
            d = os.path.join(POOL, sec, ss); os.makedirs(d, exist_ok=True)
            futs = []
            for i, c in enumerate(uniq[:70]):
                dest = os.path.join(d, f"{c['src'][:2]}-{c['id']}.jpg")
                futs.append((c, pool.submit(fetch_one, c, dest)))
            kept = list(have); reasons = {}
            for c, f in futs:
                dest, ok, why = f.result()
                reasons[why] = reasons.get(why, 0) + 1
                if ok and why != 'exists':
                    c['file'] = dest; kept.append(c); seen_urls.add(c['url'])
                if len(kept) >= per_sub_target: break
            index[sec][ss] = kept
            json.dump(index, open(idx_path, 'w'))
            print(f"{sec}/{ss}: cands={len(uniq)} kept={len(kept)} {reasons}", flush=True)
    total = sum(len(l) for s in index.values() for l in s.values())
    print('TOTAL kept', total)

if __name__ == '__main__': main()
