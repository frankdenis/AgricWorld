"""Row-per-sub sampler: python3 sheet2.py <sector> [n_per_sub=8] [offset=0] -> /tmp/s2_<sector>.jpg"""
import sys, json
from PIL import Image, ImageDraw
sec = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 8; off = int(sys.argv[3]) if len(sys.argv) > 3 else 0
idx = json.load(open('/var/tmp/pool/index_clean.json'))
subs = list(idx[sec].items())
tw, th = 200, 130
S = Image.new('RGB', (n * tw, len(subs) * (th + 14)), 'white'); d = ImageDraw.Draw(S)
for r, (s, lst) in enumerate(subs):
    sample = lst[off:off + n]
    for c, it in enumerate(sample):
        try: im = Image.open(it['file']).convert('RGB')
        except Exception: continue
        im.thumbnail((tw - 4, th - 4)); x = c * tw; y = r * (th + 14)
        S.paste(im, (x + 2, y + 2)); d.text((x + 4, y + th), f"{s[:16]} #{off + c}", fill='black')
out = f'/tmp/s2_{sec}.jpg'; S.save(out, quality=78); print(out, [(s, len(l)) for s, l in subs])
