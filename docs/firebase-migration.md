# Migrating Billspay to Firebase

This guide explains how to re-home the entire Billspay stack on Firebase-managed services. Follow it end-to-end to replace the self-hosted VPS/PostgreSQL deployment with Firebase Hosting, Cloud Functions, Firestore, Authentication, and related tooling. The checklist assumes you are working from the repository root (`/workspace/paybills.co`).

> **Tip:** Work through every phase in order. Each section builds on the previous one and includes explicit commands you can copy/paste.

## 1. Plan the new Firebase architecture

1. **Create a Firebase project** in the [Firebase console](https://console.firebase.google.com). Use a globally unique project ID (for example, `billspay-production`).
2. **Decide on environments.** Create at least two Firebase projects:
   - `billspay-production` – live environment.
   - `billspay-staging` (optional but recommended) – safe sandbox for testing migrations before they hit customers.
3. **Map existing services** to Firebase offerings:
   | Legacy component | Firebase replacement |
   | --- | --- |
   | Express API on VPS | Cloud Functions for Firebase (HTTP functions using the existing Express app) |
   | PostgreSQL + Prisma | Cloud Firestore (Document DB) or Cloud SQL (if relational features are required). This guide assumes Firestore. |
   | Static builds hosted on VPS | Firebase Hosting multi-site deployment (three sites: customer portal, admin portal, agent portal). |
   | Local JWT auth + password hashing | Firebase Authentication (email/password) with custom claims for admin/agent roles. |
   | File uploads (if any) | Cloud Storage for Firebase. |

4. **Inventory sensitive flows** (payment data, SSN/DOB validation) and document required encryption logic—these will move into Cloud Functions where the existing crypto helpers can continue to run.

## 2. Install tooling & initialize Firebase

1. Install the Firebase CLI globally (requires Node 18+):
   ```bash
   npm install -g firebase-tools
   ```
2. Authenticate the CLI with your Google account:
   ```bash
   firebase login
   ```
3. Initialize Firebase in the repository root:
   ```bash
   firebase init
   ```
   Choose the following when prompted:
   - **Functions:** use TypeScript, enable ESLint, and use npm to install dependencies. Point it to `backend/` when asked for the functions directory so the existing Express code is reused.
   - **Hosting:** configure **three sites**:
     1. `billspay-customer` → deploys `frontend/dist` (public portal).
     2. `billspay-admin` → deploys `admin/dist` (restricted console).
     3. `billspay-agent` → deploys `agent/dist` (call center portal).
   - **Emulators:** enable Firestore, Functions, Auth, and Hosting emulators for local parity.

   The wizard creates a `.firebaserc` file with your default project plus `firebase.json` containing hosting/function targets. Commit these files after verifying them.

## 3. Adapt the backend to Cloud Functions

1. **Install Firebase Functions dependencies** inside `backend/`:
   ```bash
   cd backend
   npm install firebase-functions firebase-admin
   ```
2. **Wrap the Express app** exported from `src/app.ts` in a Firebase HTTP function. Add the following to `backend/src/index.ts` (create it if needed):
   ```ts
   import * as functions from 'firebase-functions';
   import app from './app';

   export const api = functions.https.onRequest(app);
   ```
3. **Replace `npm run start` scripts** in `backend/package.json` with Firebase tooling commands:
   ```json
   {
     "scripts": {
       "dev": "firebase emulators:start --only functions,firestore,auth,hosting",
       "build": "tsc",
       "deploy": "firebase deploy --only functions"
     }
   }
   ```
4. **Move environment variables** into Firebase:
   - For secrets (JWT secret, encryption key), use [Firebase Functions config](https://firebase.google.com/docs/functions/config-env) or the Firebase Secret Manager integration:
     ```bash
     firebase functions:secrets:set JWT_SECRET
     firebase functions:secrets:set DATA_ENCRYPTION_KEY
     ```
   - Replace direct `process.env` access in the code with `functions.config()` or `process.env` shims loaded via Secrets Manager.
5. **Swap Prisma/PostgreSQL for Firestore:**
   - Introduce a Firestore data access layer (`backend/src/lib/firestore.ts`) that exports typed helpers for collections (`users`, `paymentMethods`, `billers`, etc.).
   - Rewrite services in `backend/src/services/*` to read/write documents using `firebase-admin` instead of Prisma. Maintain encryption for payment fields before they are persisted.
   - Update validators to enforce uniqueness constraints manually (e.g., create composite indexes in Firestore or keep hash documents keyed by SSN/DOB/email).
6. **Configure CORS** inside Cloud Functions exactly as before, but use the Firebase Hosting domains:
   - Customer: `https://<customer-site>.web.app`
   - Admin: `https://<admin-site>.web.app`
   - Agent: `https://<agent-site>.web.app`

## 4. Reconfigure authentication

1. **Enable Email/Password provider** in Firebase Authentication.
2. **Migrate existing users:**
   - Export users from PostgreSQL, including salted password hashes. Firebase supports importing `bcrypt` hashes; otherwise, ask customers to reset passwords.
   - Use the [Firebase Auth import API](https://firebase.google.com/docs/auth/admin/import-users) to batch import.
3. **Issue custom claims** for admin/agent roles via a secure script:
   ```ts
   // backend/scripts/setRole.ts
   import { getAuth } from 'firebase-admin/auth';

   async function setRole(uid: string, role: 'admin' | 'agent') {
     await getAuth().setCustomUserClaims(uid, { role });
   }
   ```
   Run this script using `ts-node` against the Admin SDK after deployment.
4. **Update front ends** (`frontend/`, `admin/`, `agent/`) to use the Firebase Web SDK instead of custom JWT handling:
   - Install dependencies:
     ```bash
     npm install firebase
     ```
   - Replace login/signup flows with `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, and `sendPasswordResetEmail`.
   - Use `onAuthStateChanged` to manage session state and fetch ID tokens. Pass the ID token as a Bearer header when calling Cloud Functions endpoints.
   - On the admin/agent portals, inspect custom claims from the ID token and block access if roles do not match.

## 5. Port the database schema to Firestore

1. **Design collections:**
   - `users/{userId}` – profile data (email, SSN hash, DOB, address, customer number).
   - `users/{userId}/paymentMethods/{paymentId}` – nested subcollection for cards/banks (encrypted payloads + display metadata).
   - `users/{userId}/billers/{billerId}` – biller assignments added by agents.
   - `agents/{agentId}` – agent profile with assigned customers.
   - `transactions/{transactionId}` – transaction history referencing `userId` and `paymentMethodId`.

2. **Enforce uniqueness:** create “lookup” collections keyed by `email`, `customerNumber`, `ssnLast4+dob`. Example document ID: `email:alice@example.com → { userId: '...' }`. Before creating a new user, check for collisions by reading these documents.
3. **Write migration scripts** (Cloud Functions or node scripts) that read from PostgreSQL (if still available) and write to Firestore using batched writes. Test in staging first.
4. **Configure Firestore indexes** in `firestore.indexes.json` for any compound queries you need (e.g., search by customer number or agent ID).

## 6. Update hosting/build pipelines

1. **Front end build commands** remain the same (`npm run build` inside `frontend/`, `admin/`, `agent/`).
2. **Add Firebase Hosting deploy targets** to `firebase.json`:
   ```json
   {
     "hosting": [
       {
         "target": "customer",
         "public": "frontend/dist",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
         "rewrites": [{ "source": "**", "destination": "/index.html" }]
       },
       {
         "target": "admin",
         "public": "admin/dist",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
         "rewrites": [{ "source": "**", "destination": "/index.html" }]
       },
       {
         "target": "agent",
         "public": "agent/dist",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
         "rewrites": [{ "source": "**", "destination": "/index.html" }]
       }
     ]
   }
   ```
3. **Associate targets with sites**:
   ```bash
   firebase target:apply hosting customer billspay-customer
   firebase target:apply hosting admin billspay-admin
   firebase target:apply hosting agent billspay-agent
   ```
4. **Deploy:**
   ```bash
   npm run build --workspaces
   firebase deploy --only hosting:customer,hosting:admin,hosting:agent,functions
   ```

## 7. Configure security rules

1. **Firestore rules** (`firestore.rules`) must restrict data so only the right users/roles can read or mutate documents. Example skeleton:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, update: if request.auth.uid == userId;
         allow create: if request.auth != null;
         allow delete: if false; // only via functions

         match /paymentMethods/{paymentId} {
           allow read, create, update: if request.auth.uid == userId;
         }
       }

       match /agents/{agentId} {
         allow read, write: if request.auth.token.role == 'admin';
       }

       match /transactions/{transactionId} {
         allow read: if request.auth.uid == resource.data.userId || request.auth.token.role in ['admin', 'agent'];
       }
     }
   }
   ```
2. **Storage rules** should similarly restrict access to user-uploaded receipts (if applicable).
3. **Auth blocking functions** (optional) can enforce SSN/DOB uniqueness before allowing signup.

## 8. Local development with emulators

1. Start the emulators from the repo root:
   ```bash
   firebase emulators:start
   ```
2. Point the React apps at the emulator endpoints by setting environment variables:
   - `VITE_API_BASE_URL="http://127.0.0.1:5001/<project-id>/us-central1/api"`
   - Use `connectAuthEmulator`, `connectFirestoreEmulator`, etc., in development builds.
3. Seed test data using `backend/scripts/seedFirestore.ts` to mirror production flows.

## 9. Cutover checklist

1. Freeze changes on the VPS deployment.
2. Run final migrations to copy all data into Firestore.
3. Validate authentication, dashboard flows, payment method CRUD, and admin/agent portals on the Firebase staging project.
4. Update DNS to point to the Firebase Hosting subdomains (or use Firebase-managed domains only).
5. Retire the VPS once traffic is fully served from Firebase.
6. Document new on-call runbooks (backups, incident response, access control) in `docs/` for future operators.

## 10. Helpful references

- [Firebase Hosting multi-site deployments](https://firebase.google.com/docs/hosting/multisites)
- [Serve Express apps with Cloud Functions](https://firebase.google.com/docs/functions/http-events#using_express_with_cloud_functions)
- [Firestore data modeling best practices](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Firebase Authentication custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)

Keep this document updated as you discover new requirements or refine the data model on Firebase.
