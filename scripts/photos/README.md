# Photo pipeline (how the catalogue photography was sourced)

All catalogue photos are real photographs published under Creative Commons / public-domain licences
(Wikimedia Commons, plus Openverse for a few sub-categories). Attribution is generated into
`assets/img/c/credits.json` and shown at `#/credits`.

1. `harvest.py`  – keyword search on Commons (Quality Images first) + Openverse → `/var/tmp/pool`
2. `harvest2.py` – category-based Commons harvest (`cats.py`), much higher relevance
3. `clip_filter.py` – OpenCLIP zero-shot relevance filter against `labels.py` → `index_clean.json`
4. `../build_catalogue.py` – picks the best-scored photos per sub-category and generates
   `assets/js/data.js`, `supabase/seed.sql` and `assets/data/credits.json`.

Photos are NOT stored in the repo: they are served from the Wikimedia Commons CDN
(`upload.wikimedia.org`, standard thumbnail widths 500/960/1280/1920 px), which keeps the
repository small and the catalogue unlimited. `index_clean.json` (URLs + relevance scores) is the
only artefact the build needs.

Both harvesters are resumable and rate-limit friendly (User-Agent identifies the project).
