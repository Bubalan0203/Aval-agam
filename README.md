This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Firebase Production Setup

This project is now pointed at the `aval-agam` Firebase project through `.env.local`.

### 1. Create Firestore in production mode

In the Firebase Console:

1. Open `Firestore Database`
2. Click `Create database`
3. Choose `Start in production mode`
4. Pick the region closest to your users
5. Finish the setup

### 2. Add the environment variables

Set these values locally and in production:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### 3. Firestore security rules

The current app writes bookings from the browser, so Firestore rules need to allow:

- public read access to `events`
- public creation of `bookings`
- authenticated admin management of events

Use this as a starting point:

```rust
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    match /events/{eventId} {
      allow read: if true;
      allow update: if true;
      allow create, delete: if isSignedIn();
    }

    match /bookings/{bookingId} {
      allow create: if true;
      allow read, update, delete: if isSignedIn();
    }
  }
}
```

### 4. Important note

This rule set matches the current code, but it is not the most secure long-term approach because the browser can still update event seat counts. For a stricter production setup, move booking writes and seat updates behind a server route or Cloud Function using the Firebase Admin SDK, then lock the rules down further.
