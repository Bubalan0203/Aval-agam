# Multi-date events — original integration flow restored

## Current flow

Create/update uses the existing signed-in Firebase browser SDK, with Firestore transactions for updates. No Firebase Admin service account or new admin UID environment variable is needed by the app. Existing Firestore permissions must continue to authorize the same users and operations as before.

Payments use the original sequence: create Razorpay order using existing API keys, open checkout, verify the checkout signature, then save the booking and increment the selected date's seats in one Firestore transaction. Free bookings skip payment. Confirmation emails use the original EmailJS browser service, public key and confirmation template. There are no reservation holds, booking tokens, webhooks, cron workers or new private email keys.

Multi-date features remain: future date/time rows, shared ticket definitions, per-date inventory, date selection, immutable cancelled dates, read-only booked/completed dates, adding future dates to completed events, confirmation dialogs, and cancelled/refund-needed booking chips. Updates re-read inventory in the transaction to preserve concurrent bookings. Parent events with bookings/cancelled history remain protected from deletion.

Legacy events without sessions are read as one `legacy` date, preserving sold counts. Event writes save that representation alongside new dates. Legacy bookings without session IDs belong to `legacy`; their date/time display falls back to that session. No bulk database migration or service-account migration script is required for compatibility. No existing live records were changed by this code update.

## Cancellation emails

Cancellation saves the permanent date status first. The admin page then sends individual cancellation emails to affected customers with the original EmailJS browser integration. Paid cancelled bookings display “Cancelled · Refund needed”; free ones display “Cancelled”. No money transfer is performed.

Template: `template_eobun16`, optionally overridden with `NEXT_PUBLIC_EMAILJS_CANCELLATION_TEMPLATE_ID`. The supplied template ID is a public identifier, not a secret. Existing EmailJS service/public key are retained from the original confirmation code.

Parameters: `to_email`, `customer_email`, `customer_name`, `booking_id`, `event_title`, `event_date`, `event_time`, `event_venue`, `ticket_type`, `quantity`, `amount` (numeric INR), `cancellation_reason`, `refund_status`.

Keep the event page open during sending. Delivery runs sequentially with a delay between recipients. Each booking records a send timestamp; failed/unsent notices can be retried with “Retry cancellation emails”. A short per-booking lease reduces overlapping sends from two admin tabs. A browser closing after provider acceptance but before saving the timestamp can still produce a duplicate on retry. There is no background email worker.

## Environment and deployment

Retain the original `NEXT_PUBLIC_FIREBASE_*`, Cloudinary and Razorpay keys. This application no longer requires `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_UIDS`, `BOOKING_TOKEN_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CRON_SECRET`, or an EmailJS private key. Unused settings may remain without effect.

The newly introduced server-only Firestore rules file has been removed; no deployed rules were changed. If its deny-browser-write rules were manually deployed, restore the previously working rules from the Firebase console's version history before testing. Do not replace them with unrestricted public writes. Review any already-created pending reservations from the intermediate deployment before removing their history; this rollback neither captures/refunds payments nor deletes those records.

## Limitations retained from the original flow

Payment precedes saving the booking. If a date is cancelled or sells out during checkout, saving can fail after payment and needs manual resolution. Closing the browser after payment can also interrupt booking completion. Signature verification uses the existing Razorpay API secret, not a webhook secret. Browser SDK security remains governed by deployed Firestore rules; client checks alone are not a security boundary.

Run `npm run test:event-content`, `npm run test:event-sessions`, `npx tsc --noEmit`, and `npm run build`. Live payment, email and database verification requires actual working credentials; downloaded `[SENSITIVE]` placeholders cannot be used locally.
