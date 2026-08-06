Done — here's everything
✅ 1. "Image Name" field — added, editable, pushed
In the Media Library's Info panel, right above Filename. It reuses the alt column that already existed on your Media table (it was already searchable and save-able server-side, just never shown in the UI) — so no database change was needed. Type a name, it saves automatically; leave it blank and it falls back to the filename. Thumbnails in the grid now show the name too, when set.

📁 2. Where to add local images so they show in the Media Library
This one has a real gotcha — dropping a file into the folder does not automatically show up there. Here's exactly how it works:

Folder path: public/products/gallery/<Category>/<Group>/<filename>.webp (or jpg/png/etc.) — this is where all your product photos live in the codebase.
But: the admin Media Library reads from the database, not the folder directly. A file dropped into that folder only becomes a database row after a sync step runs — and that sync is not automatic (it's not on your scheduled cron list).
Two ways to actually get an image in:

Easiest — just use the Upload button inside the Media Library itself. That creates the database row immediately, no code/git involved.
If you're adding files directly to the repo (e.g., a batch of new product photos via git), after they're pushed and deployed, visit this URL once to sync them in:
https://www.artvelle.in/api/cron/media-migration
That scans the folder and creates the missing database rows.

My recommendation: use the Upload button for anything one-off; only drop files into the repo folder when you're adding a batch alongside a code change (like a new product's photos), then hit that sync URL once afterward.

🚀 3. Push command
Already pushed for you (commit dbc35b1, on top of the earlier 89ee35f) — Vercel will deploy it automatically. For future reference, here's the exact command I use each time:

git add -A && git commit -m "your message" && git push origin main






















                                                   > git add -A && git commit -m "your message" && git push origin main
At line:1 char:12
+ git add -A && git commit -m "your message" && git push origin main
+            ~~
The token '&&' is not a valid statement separator in this version.
At line:1 char:44
+ git add -A && git commit -m "your message" && git push origin main
+                                            ~~
The token '&&' is not a valid statement separator in this version.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordEx  
   ception
    + FullyQualifiedErrorId : InvalidEndOfLine

PS C:\Users\15ind\OneDrive\Desktop\PrintDeed\Graphx>
Honest note
While verifying, I hit a confusing false alarm — the browser console kept showing an old error message that (after a lot of double-checking: file hash, exact byte content, and confirming the real page actually renders) turned out to be a stale leftover, not a real bug. Wasted some time chasing it, but the underlying code is confirmed correct (clean typecheck, page renders normally).
---

# 📂 Gallery folder structure (from 2026-08-06)

All product photos live under `public/products/gallery/` in this layout:

```
public/products/gallery/
└── <Category>/                        e.g. Pooja Essentials
    └── <Subcategory>/                 e.g. Pooja Thalis
        └── <Product Name>/            e.g. Classic Pooja Thali
            ├── common/                photos shown for EVERY variant
            │     packaging.webp, dimensions.webp, lifestyle.webp, ...
            ├── <Variant Value>/       photos for ONE design/colour only
            │     hero.webp, angle.webp, closeup.webp, styled.webp
            └── <Variant Value>/
                  hero.webp, ...
```

Real examples in the repo right now:
- `Home Decor/Photo Frames/Premium Resin Photo Frame/common/` + `/Baby Footprint/`
- `Pooja Essentials/Pooja Thalis/Designer Pooja Thali/common/`
- `Pooja Essentials/Pooja Thalis/shared/` ← photos used by SEVERAL thali
  products at once live at the subcategory level in a `shared/` folder.

Recommended file names for a new photo shoot: `hero`, `angle`, `closeup`,
`styled` inside each variant folder; `packaging`, `dimensions`,
`whats-included`, `lifestyle` inside `common/`.

**Important:** the folder only stores the files. What the customer actually
sees per variant is controlled in Admin → Products → gallery, which tags each
photo with a variant value (or "common") in the database. Adding a file to a
variant folder does NOT auto-attach it to that variant — attach it in the
admin after syncing (Upload button, or the media-migration sync URL above).

Old image links (the pre-2026 folder names like `Rakhi Collection/…`) keep
working forever — `src/proxy.ts` permanently redirects them to the new paths
(mapping file: `src/lib/gallery-moves.json`).

**After deploying this restructure once:** run
`node --env-file=.env scripts/flip-gallery-db.mjs --apply`
to point the database at the new paths (safe to run any time after deploy;
everything works via redirects even before you run it).
