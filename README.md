# Minimal Citation Reader Mockup

A minimal black-and-white website prototype with:

- A central text box that can move forward/backward through passages
- Four square source preview icons around the text (top, left, right, bottom)
- Clickable footnotes that highlight the matching source preview

## Source previews only (no in-browser PDF reader)

The UI now uses first-page image thumbnails only, to avoid exposing full PDF reading in the interface.

Preview image paths are configured in the `sources` object in `app.js`.

Your current mapping is:

- `data/previews/s1.png` (Agnes Martin)
- `data/previews/s2.png` (Trinh T. Minh-Ha)
- `data/previews/s3.png` (Derek Jarman)
- `data/previews/s4.png` (Martin Buber)

If you rename preview files or move them, update each `preview:` entry in `app.js`.

To regenerate previews from page 1 of local PDFs:

```bash
mkdir -p data/previews
pdftoppm -f 1 -singlefile -png -scale-to 512 "Agnes Martin_ _Beauty Is the Mystery of Life_.pdf" data/previews/s1
pdftoppm -f 1 -singlefile -png -scale-to 512 "Trinh-Speaking-Nearby-1983.pdf" data/previews/s2
pdftoppm -f 1 -singlefile -png -scale-to 512 "cd_blue_derek-jarman_0.pdf" data/previews/s3
pdftoppm -f 1 -singlefile -png -scale-to 512 "iandthou.pdf" data/previews/s4
```

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Edit text and footnotes

Text is loaded from `WritingProject.md`.

Each footnote uses data attributes:

- `data-source`: `s1`, `s2`, `s3`, or `s4`

Example:

```html
<a href="#" class="footnote" data-source="s1">1</a>
```
