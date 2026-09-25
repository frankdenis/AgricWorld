"""Zero-shot relevance filter for the photo pool using OpenCLIP.
Writes /home/user/tools/index_clean.json (same shape as index.json, items get 'score', 'top').
Usage: python3 clip_filter.py [--min 0.5] [--cos 0.20]
"""
import json, os, sys, numpy as np, torch, open_clip
from PIL import Image
POOL = '/var/tmp/pool'
Q = json.load(open('/home/user/tools/queries.json'))
idx = json.load(open('/home/user/tools/pool_index.json'))
MINP = float(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 0.5
MINC = float(sys.argv[sys.argv.index('--cos') + 1]) if '--cos' in sys.argv else 0.25
NEG = ["a scanned document or page of text", "a map", "a diagram, chart or infographic", "a city skyline with buildings", "a street with cars and traffic",
       "a boat or ship on the sea", "a wild bird in flight", "an old black and white engraving or drawing", "a painting or illustration", "a logo or icon",
       "a screenshot of software", "a cooked meal on a plate in a restaurant", "a portrait of a person's face", "a church or monument", "a museum exhibit",
       "a stone ruin", "an insect macro photo", "a flower close-up", "a house interior", "a crowd of people at an event", "a soldier or military scene", "a blank grey image"]

def slug(s):
    import re; return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

device = 'cpu'; torch.set_num_threads(os.cpu_count() or 4)
model, _, pre = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k', device=device)
tok = open_clip.get_tokenizer('ViT-B-32'); model.eval()

# text labels: one per sub (embedding = mean of its query prompts), plus negatives
from labels import LABELS
labels = []; desc_rows = []; owner = []  # each description row -> label index
for sec, subs in LABELS.items():
    for sub, descs in subs.items():
        li = len(labels); labels.append((sec, slug(sub)))
        for d in descs: desc_rows.append(f"a photo of {d}"); owner.append(li)
for n in NEG: desc_rows.append(n); owner.append(-1)
with torch.no_grad():
    Ts = []
    for i in range(0, len(desc_rows), 48):
        e = model.encode_text(tok(desc_rows[i:i + 48])); Ts.append(e / e.norm(dim=-1, keepdim=True))
    T = torch.cat(Ts)
owner = np.array(owner)
lab_index = {l: i for i, l in enumerate(labels)}
n_lab = len(labels)
sec_labels = {}
for i, (sec, s) in enumerate(labels): sec_labels.setdefault(sec, []).append(i)

# image embeddings with cache
cache_p = f'{POOL}/emb.npz'
cache = dict(np.load(cache_p, allow_pickle=True)['d'].item()) if os.path.exists(cache_p) else {}
todo = [it['file'] for s in idx.values() for l in s.values() for it in l if it['file'] not in cache and os.path.exists(it['file'])]
print('embedding', len(todo), 'new images; cached', len(cache), flush=True)
B = 16
with torch.no_grad():
    for i in range(0, len(todo), B):
        batch = todo[i:i + B]; ims = []
        for f in batch:
            try: ims.append(pre(Image.open(f).convert('RGB')))
            except Exception: ims.append(torch.zeros(3, 224, 224))
        e = model.encode_image(torch.stack(ims)); e = e / e.norm(dim=-1, keepdim=True)
        for f, v in zip(batch, e.numpy()): cache[f] = v
        if (i // B) % 10 == 0: print(i, '/', len(todo), flush=True); np.savez(cache_p, d=np.array(cache, dtype=object))
np.savez(cache_p, d=np.array(cache, dtype=object))

clean = {}; stats = {}
Tn = T.numpy()
for sec, subs in idx.items():
    clean[sec] = {}
    for sub, lst in subs.items():
        li = lab_index.get((sec, sub))
        if li is None: continue
        keep = []
        for it in lst:
            v = cache.get(it['file'])
            if v is None: continue
            dcos = Tn @ v
            cos = np.full(n_lab, -1.0); 
            for j, o in enumerate(owner):
                if o >= 0 and dcos[j] > cos[o]: cos[o] = dcos[j]
            negmax = float(dcos[owner < 0].max())
            own = float(cos[li]); order = np.argsort(-cos); top = int(order[0]); best_other = float(cos[order[1]] if top == li else cos[top])
            it = dict(it); it['score'] = round(own, 3); it['cos'] = round(own, 3); it['top'] = labels[top]; it['neg'] = round(negmax, 3)
            same_sec = labels[top][0] == sec
            ok = own >= MINC and own > negmax + 0.01 and (top == li or own >= 0.285 or own >= best_other - 0.02 or (same_sec and own >= best_other - 0.045))
            if ok: keep.append(it)
        keep.sort(key=lambda x: -x['score'])
        clean[sec][sub] = keep; stats[(sec, sub)] = (len(lst), len(keep))
json.dump(clean, open('/home/user/tools/index_clean.json', 'w'))
tot_in = sum(a for a, b in stats.values()); tot_out = sum(b for a, b in stats.values())
print(f'kept {tot_out}/{tot_in}')
for (sec, sub), (a, b) in stats.items():
    if b < 15: print(f'  LOW {sec}/{sub}: {b}/{a}')
