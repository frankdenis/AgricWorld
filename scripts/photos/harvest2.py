"""Category-based Commons harvester (second pass). Finds Commons categories matching each sub's
clean labels, pulls files from the category and its subcategories, applies the same quality gate and
stores into /var/tmp/pool (index.json). Relevance is decided later by clip_filter.py.
Usage: PER_SUB=70 python3 harvest2.py [sector ...]
"""
import json, os, re, sys, time, urllib.parse, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
import harvest as H
from labels import LABELS
from cats import CATS
POOL = H.POOL

BANNED = re.compile(r'(stereotype|dead|surname|cycle|resin|pulling|mineral|museum|museu|etnolog|watercolor|stamp|coin|banknote|logo|map|diagram|drawing|painting|art|by year|by country|by name|unidentified|flag|video|svg|png|gif|icon|model|toy|game|book|film|music|sculpt|monument|heraldry|user|band|album|song|company|brand|person|people named|surname|given name|ship|navy|military|tank|aircraft|locomotive|train|car\b|automobile|festival|parade|cartoon|comic|anime|meme|cake|dish|recipe|soup|salad|restaurant)', re.I)

def cat_exists(names):
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'titles': '|'.join('Category:' + n for n in names), 'prop': 'categoryinfo', 'format': 'json'})
    d = H.get(u); out = []
    try:
        for p in json.loads(d)['query']['pages'].values():
            ci = p.get('categoryinfo')
            if ci and (ci.get('files', 0) + ci.get('subcats', 0)) > 0: out.append(p['title'])
    except Exception: pass
    return out

def cat_search(term, limit=4):
    term = term.lower().strip()
    variants = [term, term + 's', term.rstrip('s'), term + ' farming', term + ' in agriculture', term + ' (agriculture)']
    variants = list(dict.fromkeys(v[0].upper() + v[1:] for v in variants))
    exact = cat_exists(variants)
    if exact: return exact[:limit]
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': term, 'srnamespace': 14, 'srlimit': 10, 'format': 'json'})
    d = H.get(u)
    if not d: return []
    try: hits = [s['title'] for s in json.loads(d)['query']['search']]
    except Exception: return []
    tl = term.split()
    good = [h for h in hits if all(w.rstrip('s') in h.lower() for w in tl[:2]) and len(h.split()) <= 4 and not BANNED.search(h[9:]) and re.match(r'^[A-Za-z ]+$', h[9:])]
    return good[:limit]

def cat_members(cat, files_limit=120):
    """files directly in cat + files in up to 8 subcategories"""
    def q(params):
        u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(params, action='query', format='json'))
        d = H.get(u)
        try: return json.loads(d)['query']['categorymembers'] if d else []
        except Exception: return []
    files = [m['title'] for m in q({'list': 'categorymembers', 'cmtitle': cat, 'cmtype': 'file', 'cmlimit': files_limit}) if m['title'].lower().endswith(('.jpg', '.jpeg'))]
    subs = [m['title'] for m in q({'list': 'categorymembers', 'cmtitle': cat, 'cmtype': 'subcat', 'cmlimit': 40})]
    subs = [s for s in subs if not re.search(r'(maps|diagrams|drawings|paintings|art|logos|by year|by country|by name|unidentified|stamps|videos|svg|png|black and white|monochrome|user|models|toys|museum|statue|sculpt|heraldry|coat)', s, re.I)][:8]
    for s in subs:
        if len(files) >= files_limit * 2: break
        files += [m['title'] for m in q({'list': 'categorymembers', 'cmtitle': s, 'cmtype': 'file', 'cmlimit': 60}) if m['title'].lower().endswith(('.jpg', '.jpeg'))]
        time.sleep(0.2)
    return files

def main():
    index = {}
    idx_path = '/home/user/tools/pool_index.json'
    if os.path.exists(idx_path): index = json.load(open(idx_path))
    seen_urls = set(v['url'] for subs in index.values() for lst in subs.values() for v in lst)
    seen_titles = set(v.get('title', '') for subs in index.values() for lst in subs.values() for v in lst)
    only = sys.argv[1:]
    target = int(os.environ.get('PER_SUB', '70'))
    pool = cf.ThreadPoolExecutor(max_workers=10)
    for sec, subs in LABELS.items():
        if only and sec not in only: continue
        index.setdefault(sec, {})
        for sub, descs in subs.items():
            ss = H.slug(sub); have = index[sec].get(ss, [])
            if len(have) >= target: continue
            terms = []
            for d in descs:
                t = re.sub(r'^(a|an|the)\s+', '', d)
                t = re.sub(r'\s+(in|on|at|with|from|of|next|over|being|coming|out)\s.*$', '', t)
                if t not in terms: terms.append(t)
            cats = cat_exists(CATS.get(sec, {}).get(sub, []))
            if len(cats) < 2:
                for t in terms[:3]:
                    for c in cat_search(t):
                        if c not in cats: cats.append(c)
                    time.sleep(0.3)
            titles = []
            for c in cats[:5]:
                titles += cat_members(c)
            titles = [t for t in dict.fromkeys(titles) if t[5:] not in seen_titles]
            cands = H.commons_info(titles[:300])
            uniq = [c for c in cands if c['url'] not in seen_urls]
            d = os.path.join(POOL, sec, ss); os.makedirs(d, exist_ok=True)
            futs = [(c, pool.submit(H.fetch_one, c, os.path.join(d, f"cc-{c['id']}.jpg"))) for c in uniq[:110]]
            kept = list(have); reasons = {}
            for c, f in futs:
                dest, ok, why = f.result(); reasons[why] = reasons.get(why, 0) + 1
                if ok and why != 'exists': c['file'] = dest; kept.append(c); seen_urls.add(c['url'])
                if len(kept) >= target: break
            index[sec][ss] = kept
            json.dump(index, open(idx_path, 'w'))
            print(f"{sec}/{ss}: cats={[c[9:] for c in cats[:5]]} titles={len(titles)} cands={len(uniq)} kept={len(kept)} {reasons}", flush=True)
    print('TOTAL', sum(len(l) for s in index.values() for l in s.values()))

if __name__ == '__main__': main()
