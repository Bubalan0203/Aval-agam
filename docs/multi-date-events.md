# Multi-date events: implementation and release plan

## Implemented workflow

An event owns its content, media, venue, and shared ticket definitions. Its `sessions` array (maximum 100 entries) contains stable IDs, local dates, 24-hour times, status, and per-ticket sold counts. All times use Asia/Kolkata. Embedded sessions deliberately serialize inventory updates through the event document; suitable for the current scale, with a later subcollection split if contention becomes measurable.

Create and edit show multiple date rows. New dates must start in the future, including dates added today. End time must follow start time on the same day; overnight events are not supported. Duplicate date/time slots are rejected. Completed events can receive new future dates without altering their history. Prices and capacities apply to every date; bookings retain their original price.

Saved dates cannot be removed. Cancelled dates are permanently cancelled: no reopen, edit, or delete action. Booked or elapsed dates are read-only. Rescheduling a booked date means cancelling that date and creating a new one; attendees are not transferred automatically. A replacement can have the same time as a cancelled entry but has a new ID and no inherited bookings.

Every persisted create, edit, cancellation and event deletion has an accessible confirmation dialog. Deletion requires typing the event title. Busy dialogs cannot be dismissed. Removing an unsaved date only edits the draft.

Public cards show the next upcoming date and number of future dates. The detail page lets the visitor choose one date and see that date's ticket inventory. Cancelled dates remain visible and unavailable. Checkout and confirmation show the selected date/time.

## Booking and cancellation

The server validates customer details, ticket and quantity; calculates the price; and reserves capacity for 15 minutes. Expired pending reservations stop consuming capacity without requiring a cleanup job. Confirmed inventory is independent per date. Free bookings finalize on the server. Paid bookings create a Razorpay order tied to a booking, with signature and captured-amount verification. Payment callbacks and webhooks are idempotent. A late captured payment or payment for a cancelled date is flagged `refund_required`, never silently admitted.

Cancellation writes the permanent date status and a durable outbox job in one transaction. The worker marks affected confirmed bookings cancelled/refund-required and creates per-booking notification jobs. Other dates are unaffected. Failed email jobs retain their error and can be retried using “Process pending notifications” on the admin event page. Worker calls process bounded batches, so call again until drained. Pending unpaid reservations do not receive cancellation emails; captured payments arriving later get an unavailable-date notice.

User-confirmed policy: refunds are **not automatically issued**. Admin bookings show “Cancelled · Refund needed” for paid cancelled dates and “Cancelled” for free cancelled dates, immediately from the session status. `refund_required` requires administrator/provider reconciliation. A refund execution UI is outside the requested scope; only the administrative chip and email data are required. Paid cancellations must not be represented as refunded until verified with Razorpay.

Permanent deletion currently permits only events without bookings or cancelled history. This intentionally preserves records until a settled-refund deletion workflow exists. It is stricter than the earlier proposal to delete all settled records. No cascading deletion or storage-media deletion is implemented.

## Schema

- `events`: existing shared fields plus `schemaVersion: 2`, `sessions[]`, update metadata and a reservation concurrency counter.
- Session: `id`, `date`, `startTime`, `endTime`, `status: scheduled | cancelled`, `sold: {ticketId: count}`, cancellation reason/time.
- `bookings`: event/session IDs, immutable event/date/time/venue/ticket/price/customer snapshot, quantity, amount, pending/confirmed/cancelled/refund_required status, expiry, order/payment IDs and hashed checkout capability. Pending reservations are excluded from admin booking totals.
- `eventJobs`: cancellation or booking-email jobs; status, attempts, lease, last error, completion timestamp. Email delivery is at least once: a process crash after provider acceptance can produce a duplicate on retry. EmailJS does not supply a send idempotency key.

## Required setup before production

No live migration or production deployment has been performed. Configure secrets in the server environment, never in browser variables or Git:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- Firebase custom claim `admin: true` for admin accounts (server also supports `ADMIN_UIDS`, but Firestore rules require the custom claim for reads).
- `BOOKING_TOKEN_SECRET`: strong random secret, stable across retries/deployments.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`.
- `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `EMAILJS_CONFIRMATION_TEMPLATE_ID`, `EMAILJS_CANCELLATION_TEMPLATE_ID`.
- `CRON_SECRET` if an external scheduler calls POST `/api/admin/event-jobs`. This code does not create a hosted scheduler.

Configure Razorpay `payment.captured` webhook at `/api/payments/webhook`, with automatic capture enabled. Deploy the included `firestore.rules` after reviewing against any other existing collections: it denies browser mutations and restricts booking/job reads to custom-claim administrators. These rules have **not been deployed**. Do not release with old public write permissions. Reservations have a server-side limit of 20 attempts per forwarded IP per five minutes. Only deploy behind a proxy that replaces untrusted forwarding headers; add bot protection appropriate to expected traffic.

EmailJS confirmation template: subject `Booking confirmed — {{event_title}}`; body includes customer name, booking ID, event/date/time/venue, ticket type, quantity, amount. Cancellation template: subject `Event date cancelled — {{event_title}}`; body includes the same identifying information plus `{{cancellation_reason}}` and `{{refund_status}}`. Set recipient to `{{to_email}}`. Do not claim a refund is completed. See https://www.emailjs.com/docs/rest-api/send/ for provider configuration and limits.

## Migration and rollout

1. Export Firestore using the provider backup/export mechanism and retain that backup securely.
2. Set `EVENT_BOOKING_MAINTENANCE=true` on the running deployment. Temporarily stop admin edits too. This must be set on the deployment, not just the migration shell.
3. With server credentials loaded, run `node --import tsx scripts/migrate-event-sessions.ts`. Default is dry-run; it writes a mode-0600 JSON audit snapshot in `/tmp` and reports orphan bookings, invalid times, unmatched tickets and inventory differences. It never prints customer values.
4. Resolve every exception; do not invent missing history. The JSON audit snapshot is supplemental, not a replacement for the provider's restorable export.
5. Run the same command with `--apply` and maintenance enabled. Legacy events receive deterministic session ID `legacy`; legacy bookings receive date/time snapshots and the same session ID. Existing sold counts and payment details remain untouched. Reruns skip migrated fields.
6. Deploy code and restrictive rules together; configure webhook, email templates and job scheduler. Test free and sandbox paid flows, concurrent last-seat requests, duplicate callbacks, abandoned checkout expiry, cancellation during checkout, email failures/retries, and legacy bookings.
7. Reconcile event/session counts, ticket totals, booking totals and financial totals against the export. Remove maintenance only after these checks pass. Rollback requires stopping writes and restoring a matched code/database snapshot; do not roll old booking code over new session data.

## Verification and remaining release gates

Pure date/inventory compatibility tests and TypeScript/build checks can run without credentials. Real Firestore transaction contention, security rules, email delivery and Razorpay webhook integration must still be tested with configured services. Browser fixtures are not evidence of live payment or migration success. Settled-history deletion and automated scheduler provisioning remain separate work before claiming the entire production system complete.

## Cancellation template handoff

The user will supply the EmailJS cancellation template later. Until `EMAILJS_CANCELLATION_TEMPLATE_ID` and provider credentials are configured, cancellation mail remains queued and records a configuration error when processed. No automatic money transfer occurs. Template parameters: `to_email`, `customer_email`, `customer_name`, `event_title`, `event_date`, `event_time`, `event_venue`, `ticket_type`, `quantity`, `amount`, `booking_id`, `cancellation_reason`, `refund_status`. Cancellation reason and the original booked date/time must be included; do not promise a refund has already been sent.
