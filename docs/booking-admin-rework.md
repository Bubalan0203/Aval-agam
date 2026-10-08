# Booking & admin rework (client-side Firebase)

## Go-live checklist (in this order)
1. **Create admin records** — Firebase console → Firestore → collection `admins`, one document per admin,
   document ID = the admin's Auth UID (Authentication tab). Content can be empty `{}`.
   Without this, admins see "This account is not an administrator".
2. **Deploy rules** — `firebase deploy --only firestore:rules` (file: `firestore.rules`).
3. **Upgrade data** — sign in to /admin; the dashboard shows "Data upgrade needed". Click *Upgrade now* once.
   Old events without a status become *published*; seat counters move to per-date only.

## Data model (schema 3)
- `events/{id}`: title, category, location, locationUrl, description(+Format), youtubeUrls, image, gallery,
  `status` (draft | published | archived), `ticketTypes[] {id,name,price,available}` (seats per date),
  `sessions[] {id,date,startTime,endTime,status,sold{ticketId:n},cancelledAt?,cancellationReason?}`.
  `date/startTime/endTime` and `ticketTypes[].sold` are **derived on read** and no longer stored.
- `bookings/{id}`: event/date/ticket snapshot, `status` (confirmed | cancelled | refund_required | refunded),
  `seatsHeld`, `paymentMethod` (razorpay | free | offline), `source` (website | admin), `history[]`,
  `confirmationEmailSentAt`.

## Booking flow (all inside the modal)
Date → Tickets → Details → Review & pay. Seats are re-checked right before Razorpay opens.
If seats run out while the customer is paying, the booking is still saved as **Refund needed**
and shown in the admin dashboard's attention list.

## Known limit
Prices are computed in the browser. Admin lists flag any booking paid below ticket price × quantity
("Check amount"); verify those in Razorpay.
