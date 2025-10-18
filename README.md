# billspay.co

my words:

i want to make website show all US users pay with us and get every month 25% off, 
we will handle all type of bills, like tab for internet and showing all major carrier that offer internet, 
same tab for home, same for tv, and same tab for electric bills, 

languages vite react with all modern css etc, 
light colors theme and modern touch and easy for user to understand and easy to get users payment info on user portal after auth

i want full detail readme.md then we will starting coding,

for registeration 
ask email, name, password, repassword, last 4 of ssn, dob, address
for password reset email, plus address, last 4 of ssn

also generate unique customer for each customer

we wil do hosting and backend on godaddy vps
with current domain: billspay.co
i have already vps pruchased form godaddy

make admin panel secure, so public not get it running subdomain or other tools

admin panel
handle agent logins
so agent can put customer number in agent portal to get information and udpate the billers and receipt and also view customer payment information

for users
after auth, can add multiple cards, plus manually checking routing numebr
only billers can add to customers account by agent only via call,
show option to call us get 25% dicount everymonth, give me permission to handle your all type of bills
including tv+internet+home+electric bills+,mobiles

while for visiter show zipcode field for providers saerch
if no zipcode major providers 7-9 privoders for each bill type catergry

also for visiter have option directly or sign up,
if user dont want sign up they can call directly
if user complete auth assign new number for database




******
old codex ans or progress:


✅ AutoMerge Codex test successful

any question you can before we starting
also make section of coding 
like professional organized coding
dont mix up admin + agent + user portal

proper structure i want
for section structure

jwt for database 
no firebase

ask me anything if you want to put , edit or detete any features

make seciton of codings i will make other codex chatlist for other secitons like admin, agent etc

i hope you understand
also tell me if get any out sourcing or anything


tell me full detailed then i will make changes or approve it then we will coding for each secitons

proper flow diagram proper database handling 
proper erroors any things handling

---

## Application structure

The project is split into three React single-page apps plus a shared Express API:

* [`frontend/`](frontend/) – public marketing site, sign-up flow, and authenticated customer dashboard.
* [`admin/`](admin/) – restricted console for the business owner to manage agents, customers, transactions, and billers.
* [`agent/`](agent/) – call-center tooling for agents to authenticate, locate customers, and update billers or payment methods while on the phone.
* [`backend/`](backend/) – Express + TypeScript API that issues JWTs, serves customer data, and mediates biller/payment method updates.

Each app ships independently so you can deploy the customer experience on the main domain while exposing the admin and agent panels behind private hostnames or VPNs. The API enforces this split with host-allow lists on all `/api/admin/*` and `/api/agent/*` routes so scans against the public site will receive 403 responses even if the paths are guessed.

### Environment variables

Every package ships with an `.env.example` template – copy it to `.env` (or `.env.local` for Vite apps) and tailor the values for your environment.

* Front end (`frontend/.env.local`):
  ```bash
  VITE_API_BASE_URL="http://localhost:4000/api"
  ```

* Admin panel (`admin/.env`):
  ```bash
  VITE_API_URL="http://localhost:4000/api"
  ```

* Agent panel (`agent/.env`):
  ```bash
  VITE_API_URL="http://localhost:4000/api"
  ```

* API (`backend/.env`):
  ```bash
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
  JWT_SECRET="replace-with-strong-secret"
  DATA_ENCRYPTION_KEY="base64-encoded-32-byte-key" # 32 bytes
  PORT=4000
  CLIENT_ORIGIN="http://localhost:5173,http://localhost:5174,http://localhost:5175"
  ADMIN_ALLOWED_HOSTS="admin.billspay.local,localhost"
  AGENT_ALLOWED_HOSTS="agent.billspay.local,localhost"
  ```

  `CLIENT_ORIGIN` accepts a comma-separated list of HTTPS origins. In production set it to the public and private domains, for example `https://billspay.co,https://admin.billspay.co,https://agent.billspay.co`.

`ADMIN_ALLOWED_HOSTS` and `AGENT_ALLOWED_HOSTS` must enumerate the exact hostnames (without protocol) that are allowed to reach the sensitive routes. Populate these with the private subdomains or VPN hostnames you configure on the VPS. Generate the `DATA_ENCRYPTION_KEY` with `openssl rand -base64 32` so payment account numbers can be encrypted before they are stored in PostgreSQL.

### Running locally

1. Install dependencies in every workspace:
* `cd backend && npm install`
* `cd ../functions && npm install`
* `cd ../frontend && npm install`
* `cd ../admin && npm install`
* `cd ../agent && npm install`
2. In one terminal run the API: `cd backend && npm run dev`.
3. In another terminal start the public front end: `cd frontend && npm run dev`.
4. Optionally run the admin and agent panels from separate terminals (`npm run dev` inside `admin/` and `agent/`).

Run `npm run build` in each package to produce production assets (`backend` compiles TypeScript while the React apps emit static bundles). Deploy the admin and agent builds only to infrastructure that sits behind your approved hostnames.

### Build verification helper

To ensure `npm run build` succeeds everywhere (and to surface any missing files), run `scripts/verify-builds.sh` from the repository root. The script installs dependencies and invokes the production build in `backend/`, `frontend/`, `admin/`, and `agent/`, halting immediately if any step fails.

### Updating an existing deployment

When you pull new changes onto the GoDaddy VPS, follow this repeatable sequence to keep the API, database schema, and front end in sync:

1. SSH into the VPS and switch to the project directory (for example, `/var/www/billspay.co`).
2. Pull the latest code from Git (`git pull origin main` or the branch you deploy from).
3. Install/refresh dependencies:
   * `cd backend && npm install`
   * `cd ../frontend && npm install`
   * `cd ../admin && npm install`
   * `cd ../agent && npm install`
4. Apply any pending Prisma migrations so PostgreSQL matches the code:
   * `cd ../backend`
   * `npx prisma migrate deploy`
5. Build the production bundles:
* `npm run build` inside `backend/`
* `cd ../functions && npm run build`
* `cd ../frontend && npm run build`
* `cd ../admin && npm run build`
* `cd ../agent && npm run build`
6. Deploy the `frontend/dist` bundle to the public site and host the `admin/dist` and `agent/dist` bundles behind their secured hostnames or VPN.
7. Restart the running processes (for example, `pm2 restart billspay-api` and `pm2 restart billspay-frontend`, or restart the systemd services you configured).

### Firebase deployment path

If you are migrating away from the VPS and onto Firebase, the repository already contains the Firebase configuration scaffolding:

* `firebase.json` defines three Hosting targets (`customer`, `admin`, `agent`) plus the Cloud Functions source directory.
* `.firebaserc` ships with example target aliases so you can bind the Hosting deploys to your Firebase sites.
* `functions/` exposes the existing Express API through an `api` HTTPS function so you can deploy the backend with `firebase deploy --only functions`.

Follow the detailed runbook in [`docs/firebase-migration.md`](docs/firebase-migration.md) and [`docs/firebase-phase-2.md`](docs/firebase-phase-2.md) to provision secrets, run the emulator suite, and move the front ends onto Firebase Hosting.
8. Confirm everything is healthy by hitting the API health check (`curl http://YOUR_API_HOST:4000/health`) and by loading the front-end site in a browser. Attempting to hit `/api/admin/health` or `/api/agent/health` from an unapproved host should return HTTP 403.

These steps are safe to repeat whenever new commits land, and they ensure validation changes (like the payment method updates in this patch) take effect immediately.

### Database planning

The core relational model, JWT integration guidance, and a step-by-step PostgreSQL installation checklist for the GoDaddy VPS are documented in [`docs/database-architecture.md`](docs/database-architecture.md). Cross-reference that document with the live Prisma schema in `backend/prisma/schema.prisma` for the authoritative column names used by the running API.

The marketing site highlights the 25% savings offer, showcases supported provider categories, and explains the post-sign-up process. The sign-up form collects all required identity, address, and credential details with client-side validation so agents can complete onboarding while customers immediately gain dashboard access to manage their payment methods.

### Customer enrollment and recovery

* During registration the API blocks duplicate profiles by checking the email address, the last four of the SSN, and the date of birth individually before storing the customer. Any conflict returns field-level errors so the UI can highlight the exact input that needs to change.
* The self-service “Forgot password” flow now verifies identity with the SSN last four and date of birth (plus an optional customer number). Once the combination matches a single profile the API emails the reset link to the address on file—no email field is exposed on the public form so leaked addresses cannot be harvested.
* Password reset tokens remain valid for one hour. When a user completes the reset the backend rotates their credentials and automatically logs them in with a fresh JWT.

### Payment method capture rules

* Card payments require the provider name, card holder, full card number (entered in a `#### #### #### ####` format), expiration month/year, CVV, and either the profile billing address or a custom billing address. The dashboard masks saved numbers to the last four digits and forces full re-entry if the user edits the value.
* Bank accounts require the bank name, routing number, account owner name, account type (checking, savings, or business), and the account number entered twice. Routing numbers surface unmasked in the dashboard so agents can confirm them during calls.
* Customers can store multiple payment methods, select a default, and update billing addresses independently from the profile address. All sensitive fields (account numbers, routing numbers, CVVs) are encrypted before they are written to PostgreSQL.
hhh
