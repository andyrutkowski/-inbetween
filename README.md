# Minimal Citation Reader Mockup

A minimal black-and-white website prototype with:

- A central text box that can move forward/backward through passages
- Four source PDFs around the text (top, left, right, bottom)
- Clickable footnotes that open a mini PDF panel on the matching side

## Add your PDFs

PDF paths are configured in the `sources` object in `app.js`.

Your current mapping is:

- `Agnes Martin_ _Beauty Is the Mystery of Life_.pdf` (top)
- `Trinh-Speaking-Nearby-1983.pdf` (left)
- `cd_blue_derek-jarman_0.pdf` (right)
- `iandthou.pdf` (bottom)

If you move files into `data/` or rename them, update `file:` entries in `app.js`.

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Edit text and footnotes

Passages live in the `passages` array in `app.js`.

Each footnote uses data attributes:

- `data-source`: `s1`, `s2`, `s3`, or `s4`
- `data-page`: PDF page number to open
- `data-quote`: Short excerpt text shown above the PDF frame

Example:

```html
<a href="#" class="footnote" data-source="s1" data-page="2" data-quote="Quoted line">1</a>
```

## Notes

- Browser PDF viewers can reliably open a page via `#page=N`.
- Exact text highlighting inside the embedded PDF depends on the browser/PDF engine. For precise quote highlighting, a dedicated PDF annotation viewer would be needed.
