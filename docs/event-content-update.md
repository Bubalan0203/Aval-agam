# Event description and media update

## Behavior

Create and edit pages now use the same rich text editor for description
formatting: headings, font family/size, bold, italic, underline, strike,
bullets, numbered lists, quotes, inline code, code blocks, links, colors,
alignment and undo/redo. HTML is sanitized when saved and displayed. Public
event cards show plain text rather than markup. Existing plain descriptions
remain literal text, including line breaks, until edited and saved as HTML.

The banner remains separate from the four-photo gallery. The public detail
page displays gallery photos only, including a single photo when supplied.
Gallery controls are disabled during upload to prevent replacement indexes
from changing while uploads complete.

Two optional YouTube links are available on create and edit. Supported links
include watch, youtu.be, shorts, live and embed URLs. They normalize to watch
URLs and display privacy-enhanced YouTube players with standard controls,
fullscreen and links to open YouTube. Video availability and permission to
embed are controlled by the video owner and YouTube.

## Firestore fields and legacy records

- `description`: existing string, sanitized HTML for new rich text saves.
- `descriptionFormat`: `text` for legacy records, `html` for rich text saves.
- `youtubeUrls`: two slots, each a normalized YouTube URL or `null`.
- `gallery`: up to four uploaded URLs; `image` remains the separate banner.

Reads supply safe defaults for missing/null fields immediately. On the next
authenticated admin dashboard load, an idempotent backfill adds
`youtubeUrls: [null, null]` and `descriptionFormat: "text"` only where missing
or null, and initializes missing/null galleries to `[]`. Transactions re-read
documents before updates to preserve concurrent changes. Existing fields and
URLs are not replaced. Create/edit saves also persist the optional fields.

The backfill needs usable Firebase credentials and event update permissions.
It has not been run against the live database because the local Vercel export
contains Sensitive placeholders. A dashboard alert reports backfill failures
and reloading retries them.

## Validation

`npm run test:event-content` covers sanitizer behavior, literal legacy text,
supported/rejected video URLs, null handling, all four gallery photos and
idempotent backfill patches. Browser checks used an isolated temporary page
to verify typing, bold, size, lists, links, live preview and two video players
without creating production events. The temporary page was removed.
