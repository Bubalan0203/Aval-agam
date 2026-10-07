# Event feature update readiness

Reviewed on 7 October 2026 on `codex/event-feature-update`.

## Setup

Install locked dependencies with `npm ci`, then start with `npm run dev`.
The development URL is http://localhost:3000.
The checkout was linked to Vercel and `.env.local` was downloaded after login.
All 13 app integration variables are marked Sensitive in Vercel; CLI export
returns `[SENSITIVE]` placeholders instead of usable values. The server starts,
but real Firebase configuration is still required for the homepage to work.
Do not use production payments or database writes for development testing.

Required integration variables (put values in the ignored `.env.local`):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (analytics)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

EmailJS service, template and public key are currently constants in
`components/BookingModal.tsx`.

## Application map

- Next.js 16.2.10 App Router, React 19, TypeScript, Tailwind 4.
- Public homepage: wellness content, upcoming event list and category filters.
- Event detail: event content, ticket selection and booking dialog.
- Admin: Firebase email/password login, dashboard, event creation/editing,
  event details and booking lists. Admin UI is desktop-only.
- Firebase client SDK handles Firestore reads/writes and authentication.
- API routes handle Razorpay order creation/signature verification and
  Cloudinary image uploads.
- EmailJS sends booking confirmation from the browser after the booking saves.
- `lib/mock-data.ts` defines a separate mock model; the live flows use
  `lib/firestore.ts`.

## Current Firestore model

There are no SQL migrations or separate schema definition files. Types and
write logic live in `lib/firestore.ts`; existing document shapes must be
checked against actual data before migration.

| Collection | Fields |
| --- | --- |
| `events` | title, description, category, date, startTime, endTime, location, locationUrl, image, gallery, ticketTypes, createdAt |
| Embedded ticket type | id, name, price, available (total capacity), sold |
| `bookings` | eventId, eventTitle, name, email, phone, ticketType, ticketTypeId (written but missing from Booking type), quantity, amount, paymentMethod, paymentId, bookedAt |

Document IDs supply event/booking identifiers. Dates and times are strings;
creation and booking times are Firestore timestamps. Prices are represented
in rupees; the Razorpay route converts them to paise.

## Current booking flow

1. Browser validates customer fields and consent, calculates quantity and price.
2. Paid tickets create a Razorpay order using a browser-supplied amount.
3. Checkout completes; a server route checks the payment signature.
4. Browser runs a Firestore transaction that checks seats, increments `sold`
   and creates the booking. Free tickets start at this step.
5. Browser sends the confirmation email; email failure does not undo booking.

## Findings relevant to the redesign

- Payment happens before seats are secured. A successful payment can be
  followed by a sold-out booking failure, requiring manual refund handling.
- Server payment routes do not derive pricing from event/ticket records or
  persist an order-to-booking relationship. Signature verification is separate
  from booking creation, and payment uniqueness is not enforced there.
- Booking amount, quantity, customer data and payment ID are submitted by
  the browser. The Firestore transaction checks remaining capacity but does
  not validate a positive integer quantity or authoritative price/payment.
- Admin access checks only whether a Firebase user is signed in. Upload and
  payment API routes contain no authentication/authorization checks.
- README example rules permit public event updates and booking creation.
  No deployed rules were inspected; repository guidance is not proof of
  actual production permissions.
- Event edits replace the ticket array with the editor's loaded sold counts;
  concurrent bookings can be overwritten by a stale edit.
- Event deletion deletes associated bookings individually before deleting
  the event. It is not atomic and removes payment/customer history.
- There is no booking lifecycle/status, reservation expiry, refund workflow,
  payment webhook, server retry/idempotency mechanism or migration framework.
- Client reads rely on unchecked casts. Schema changes must update public
  cards/details, booking flow, admin forms/details, dashboard totals and emails.
- Several data-loading effects have no error handling, so backend failures
  can leave blank content or loading states.

## Preparation for the major change

Confirm the requested event/ticket behavior before selecting a new schema.
Use a development Firebase project or emulator and Razorpay test credentials.
Inspect existing documents, indexes and deployed rules, then back up data.
Plan versioned migration and compatibility for existing events/bookings.
Design server-owned pricing, reservations, payment finalization and access
control together with the new schema rather than changing only UI types.
Verify concurrent bookings, duplicate payment callbacks, expiry, refunds,
event edits during sales and old-record compatibility.

## Baseline checks

- `npm ci`: installed 590 packages; npm reported 20 vulnerabilities
  (2 moderate, 17 high, 1 critical). No dependency upgrades were applied.
- `npx tsc --noEmit`: passed.
- `npm run lint`: 7 errors and 20 warnings. Errors are unescaped quote and
  apostrophe characters in wellness copy (`do-you-feel.tsx` and
  `founder-section.tsx`); warnings include images and unused variables.
- Development server starts; homepage returns HTTP 500 without Firebase config.
- `npm run build`: compilation and TypeScript pass, but page-data collection
  fails because the Razorpay client initializes without `RAZORPAY_KEY_ID`.
- Vercel link and production environment pull succeeded, but all 13 app
  variables were exported as `[SENSITIVE]` placeholders. Restore original
  provider values locally before restarting and testing integrations.
- Full integration testing requires usable configuration.

No database data, deployed rules or functionality was changed in this review.
