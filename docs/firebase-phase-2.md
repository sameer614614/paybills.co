# Firebase Migration Phase 2 – Backend Functional Expansion

This guide walks through wiring the existing Express + Prisma backend into Firebase Cloud Functions and exposing the core Billspay APIs from the serverless environment. Follow the steps in order. Commands assume you are at the repository root (`/workspace/paybills.co`).

## 1. Install dependencies

```bash
cd functions
npm install
cd ../backend
npm install
cd ..
```

> The Cloud Function reuses the compiled Express app from `backend/`, so both projects must have their dependencies installed.

## 2. Configure environment variables

The backend still relies on the same secrets it previously used. For local emulation create a `.env` file in the repository root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="local-jwt-secret"
DATA_ENCRYPTION_KEY="32-byte-base64-key"
CLIENT_ORIGIN="http://localhost:5173"
ADMIN_ALLOWED_HOSTS="http://localhost:4173"
AGENT_ALLOWED_HOSTS="http://localhost:4174"
PORT="4000"
```

In Firebase production environments, move these into the [Firebase Functions Secret Manager](https://firebase.google.com/docs/functions/config-env) (for example `firebase functions:secrets:set JWT_SECRET`).

## 3. Build the backend for Cloud Functions

The exported function in `functions/src/index.ts` imports `createApp` directly from the TypeScript backend source. When the Functions project builds it compiles everything to `functions/lib/` and bundles the Express handlers. No additional build step is required beyond TypeScript compilation.

If you prefer to ship precompiled JavaScript, run:

```bash
cd backend
npm run build
cd ..
```

The Firebase builder will still understand the generated `.js` files.

## 4. Run the local emulator suite

```bash
cd functions
npm run build
firebase emulators:start --only functions,hosting,auth,firestore
```

The Express app is exposed at `http://localhost:5001/<project-id>/us-central1/api`. All of the existing REST routes—`/api/auth/*`, `/api/payment-methods/*`, `/api/billers/*`, etc.—are available without code changes.

## 5. Deploy to Firebase

```bash
cd functions
npm run build
firebase deploy --only functions
```

Once deployed, the HTTP endpoint is available at:

```
https://us-central1-<project-id>.cloudfunctions.net/api
```

Update the frontend, admin, and agent portals so their API base URLs match the new Cloud Functions host.

## 6. Next steps

With the backend running on Firebase Functions you can continue to Phase 3 of the migration plan:

1. Update `.env` files for every frontend package to point at the Cloud Functions URL.
2. Redeploy the three Vite builds via `firebase deploy --only hosting`.
3. Configure authentication providers, custom claims, and Firestore/Cloud SQL according to your operational requirements.

Refer back to `docs/firebase-migration.md` for the high-level roadmap.
