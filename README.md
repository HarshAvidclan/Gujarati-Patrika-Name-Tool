# Gujarati Patrika Name Generator

A no-backend static web app for the supplied one-page Gujarati Patrika.

## Features

- Enter a Gujarati or English member name and generate a PDF.
- Live PDF preview updates as the name is typed.
- Generate button saves the member and downloads the PDF; previewing alone does neither.
- LocalStorage saves generated member names and timestamps.
- Table shows every saved member with a clickable name that shares its PDF, plus Share / Preview / Download / Link actions; the time and status columns are omitted.
- "Share" uses the native Web Share API when supported, otherwise copies the share link.
- "Link" copies a URL containing the member name so the recipient can open the same page with that name.
- Names use a 16 pt font and wrap into up to two lines; Gujarati names use the bundled Gujarati font and English names use PDF's built-in Helvetica Bold font. Names too long for two lines are rejected with a message rather than shrunk.
- Batch-style workflow via saved member table and "બધા Download".
- Static-only: works on GitHub Pages without a server or runtime CDN requests.

## Libraries and licenses

The JavaScript libraries used to generate and preview PDFs are included in
`vendor/`, so PDF generation and preview do not depend on a third-party CDN.
Their exact versions and license notices are listed in `vendor/README.md`.

## Important font note

The supplied original PDF does **not** expose a reusable Gujarati font resource. Its Gujarati invitation text is flattened artwork; the PDF font resources only expose Lato for the separate embedded text layer. Because of that, the exact Gujarati design font cannot be extracted faithfully. This project therefore uses bundled `NotoSansGujarati-Bold.ttf` as a close, readable match.

## Run locally

No Node.js is required.

### Python local server

Mac / Linux:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Windows:

```bat
python -m http.server 8080 --bind 0.0.0.0
```

Open locally:

`http://localhost:8080`

From another device on the same Wi-Fi, use:

`http://YOUR-PC-IP:8080`

For example:

`http://192.168.1.20:8080`

## GitHub Pages

The repo contains a GitHub Actions workflow under:

`.github/workflows/deploy-pages.yml`

After the repository is connected and the workflow runs on `main`, GitHub Pages can publish the static site. Project pages normally use:

`https://YOUR-USERNAME.github.io/REPOSITORY/`

## Updating the template

Replace:

`assets/patrika-template.jpg`

with a new cleaned template of the same page artwork. Keep the same dimensions/aspect ratio so the existing placement remains aligned.

## Privacy

Member names are stored only in the browser's localStorage. No member list is sent to a server by this app. GitHub Pages itself is public hosting; the app's generated data is kept client-side.
