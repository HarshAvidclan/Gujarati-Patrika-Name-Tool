# Vendored libraries

These pinned JavaScript library files are served from this repository rather
than fetched from a CDN at runtime.

| File | Package | Version | License |
|---|---|---:|---|
| `regenerator-runtime.min.js` | `regenerator-runtime` | 0.14.1 | MIT |
| `pdf-lib.min.js` | `pdf-lib` | 1.17.1 | MIT |
| `pdf.min.js`, `pdf.worker.min.js` | `pdfjs-dist` | 3.11.174 | Apache-2.0 |

License texts are in `licenses/`. The Gujarati font used by the application is
licensed under the SIL Open Font License; its notice is included there too.

The libraries remain subject to their respective licenses and upstream
maintenance. Local copies remove the runtime dependency on jsDelivr, but do
not guarantee that the packages will be maintained forever.
