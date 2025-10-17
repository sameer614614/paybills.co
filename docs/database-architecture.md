# Database Architecture & Setup Guide

This document explains how to stand up the relational database for the
paybillswithus.com platform on your GoDaddy VPS, align it with the JWT-based
authentication flow, and support the customer, admin, and agent capabilities
implemented in the codebase. The customer portal remains the public entry point
while the admin and agent consoles are deployed behind restricted hostnames,
but all three experiences share the same PostgreSQL schema.

---

## 1. Choose and install the database engine

A managed relational engine such as **PostgreSQL** gives you transactional
integrity, JSON support, and mature tooling. The examples below assume Ubuntu or
Debian on your VPS.

1. SSH into the VPS.
2. Install PostgreSQL and its contrib package:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```
3. Confirm the service is running:
   ```bash
   sudo systemctl status postgresql
   ```
4. Switch to the `postgres` user and create a dedicated database role and
   database for the app:
   ```bash
   sudo -u postgres psql
   CREATE ROLE billspay_app WITH LOGIN PASSWORD 'replace-with-strong-password';
   CREATE DATABASE billspay_prod OWNER billspay_app;
   \q
   ```
5. Harden the instance:
   * Edit `/etc/postgresql/<version>/main/postgresql.conf` to set
     `listen_addresses = 'localhost'` unless you need remote connections.
   * Restrict authentication in
     `/etc/postgresql/<version>/main/pg_hba.conf` to trusted networks.
   * Enable automatic updates and regular backups (e.g., `pg_dump` + `cron`).

> **Alternative engines** such as MySQL or MariaDB work similarly. If you prefer
> SQLite for rapid prototyping, you can reuse the schema definitions below but
> must add your own backup strategy.

---

## 2. Recommended schema (user + admin + agent scope)

> **Live reference:** The production schema used by the running API is maintained in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). The entity-relationship diagram below remains conceptually accurate, but always defer to the Prisma schema for exact column names and enum values when applying migrations.

```mermaid
erDiagram
    users ||--o{ payment_methods : "has"
    users ||--o{ billers : "tracks"
    users ||--o{ receipts : "has"
    agents ||--o{ agent_customer_assignments : "supports"
    users ||--o{ agent_customer_assignments : "assisted by"

    users {
        uuid id PK
        text email
        text password_hash
        text first_name
        text last_name
        date date_of_birth
        text ssn_last4
        text phone
        text address_line1
        text address_line2
        text city
        text state
        text postal_code
        text customer_number
        timestamptz created_at
        timestamptz updated_at
    }

    payment_methods {
        uuid id PK
        uuid user_id FK
        text type -- 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT'
        text provider
        text last4
        text cardholder_name
        boolean is_default
        timestamptz created_at
        timestamptz updated_at
    }

    billers {
        uuid id PK
        uuid user_id FK
        text name
        text category
        text account_id
        text contact_info
        timestamptz created_at
        timestamptz updated_at
    }

    receipts {
        uuid id PK
        uuid user_id FK
        uuid biller_id FK
        numeric amount
        timestamptz paid_on
        text confirmation
        text notes
        timestamptz created_at
    }

    agents {
        uuid id PK
        text username
        text password_hash
        text full_name
        text email
        text phone
        timestamptz created_at
        timestamptz updated_at
    }

    agent_customer_assignments {
        uuid agent_id FK
        uuid user_id FK
        timestamptz assigned_at
    }
```

### Key behaviors

* **Customer number generation** – The API now guarantees a unique
  `customer_number` for every user and returns it in the JWT payload so both the
  dashboard and the call-center tooling can reference the same identifier.
* **Payment methods** – Store only the minimum necessary details. Full card or
  bank numbers must be tokenized or encrypted via your chosen payment processor
  before persisting `account_number`/`routing_number` equivalents.
* **Billers & receipts** – Only agents and administrators can mutate these
  records. Authenticated users query their billers, payment methods, and
  receipts in read-only mode.
* **Agent accounts** – Admins provision agent usernames and passwords, which
  are stored as bcrypt hashes in the `agents` table. The `agent_customer_assignments`
  table optionally tracks which agent last assisted a customer.
* **Soft deletion** – Use the `is_active` flag (or add `deleted_at` timestamps)
  instead of hard-deleting rows to keep an audit trail.

---

## 3. SQL migration snippets

The following SQL snippets create the core tables. Adapt types or constraints to
match your security/compliance needs.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    ssn_last4 CHAR(4) NOT NULL,
    phone TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state CHAR(2) NOT NULL,
    postal_code TEXT NOT NULL,
    customer_number TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT')),
    provider TEXT NOT NULL,
    account_number TEXT NOT NULL,
    last4 TEXT NOT NULL,
    cardholder_name TEXT,
    nickname TEXT,
    exp_month SMALLINT,
    exp_year SMALLINT,
    brand TEXT,
    security_code TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postal_code TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    account_id TEXT NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    biller_id UUID NOT NULL REFERENCES billers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    paid_on TIMESTAMPTZ NOT NULL,
    confirmation TEXT,
    notes TEXT,
    download_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_customer_assignments (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (agent_id, user_id)
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_billers_user ON billers(user_id);
CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_agent_assignments_agent ON agent_customer_assignments(agent_id);
CREATE INDEX idx_agent_assignments_user ON agent_customer_assignments(user_id);
```

> You can manage migrations through tools like Prisma Migrate, Knex, or simple
> SQL files executed by your deployment pipeline. Pick one tooling approach and
> keep migrations under version control.

---

## 4. Authentication & JWT integration

1. **Password hashing** – Hash passwords with a strong algorithm (Argon2id or
   bcrypt with cost ≥ 12) before inserting into the `users` table.
2. **Login flow** – When a user logs in, validate credentials, and if successful
   create a JWT payload that includes the `user_id`, `customer_number`, and a
   short-lived expiration (e.g., 15 minutes). Issue a refresh token stored in a
   secure HTTP-only cookie or separate table.
3. **Authorization middleware** – Every API route should verify the JWT and
   load the associated user record. Deny write operations to biller and receipt
   endpoints for standard users; reserve those for agent/admin routes.
4. **Post-auth hydration** – After successful authentication, fetch and return
   the user's payment methods, billers, and receipts via separate endpoints,
   ensuring the SQL queries filter on `user_id`.

---

## 5. API outline to support the front end

| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | Create user, hash password, stage for KYC review | Generate `customer_number` after verification. |
| `/api/auth/login` | POST | Exchange credentials for JWT + refresh token | Update `last_login_at`. |
| `/api/payment-methods` | GET | List payment methods | Users can also POST, PUT, DELETE their own records. |
| `/api/payment-methods` | POST | Add new payment method | Tokenize with processor before storing. |
| `/api/payment-methods/:id` | PUT | Update method metadata | Restrict to the owner `user_id`. |
| `/api/payment-methods/:id` | DELETE | Remove method | Soft delete or mark inactive. |
| `/api/billers` | GET | Read-only list of a user's billers | Agents manage creation via separate portal. |
| `/api/receipts` | GET | Read-only list of receipts for the user | Filter by date/biller when needed. |

Host-restricted admin endpoints:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/admin/login` | POST | Authenticate the hard-coded admin credential (`sameer614614` / `Cake@1245`). |
| `/api/admin/agents` | GET/POST | List existing agents or create a new agent (admin-only). |
| `/api/admin/agents/:id` | PUT/DELETE | Update credentials/contact details or remove an agent. |
| `/api/admin/customers` | GET | Search customers by name, email, phone, or customer number. |
| `/api/admin/customers/:id` | GET | Fetch the full profile, billers, payment methods, and receipts for auditing. |
| `/api/admin/transactions` | GET | Review receipt history filtered by confirmation number or customer query. |
| `/api/admin/billers` | GET | Inspect billers along with the customers linked to them. |

Host-restricted agent endpoints:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/agent/login` | POST | Authenticate an agent provisioned by the admin. |
| `/api/agent/customers` | GET | Search customers while taking support calls. |
| `/api/agent/customers/:id` | GET | Load the same customer detail view delivered to admins. |
| `/api/agent/customers/:id/billers` | POST/PUT/DELETE | Add, update, or remove billers on behalf of a customer. |
| `/api/agent/customers/:id/payment-methods` | GET/POST | Review or add payment methods while speaking with the customer. |
| `/api/agent/customers/:id/payment-methods/:paymentMethodId` | PUT/DELETE | Adjust nicknames/expirations or remove a stored method. |

All admin/agent routes enforce the `ADMIN_ALLOWED_HOSTS` / `AGENT_ALLOWED_HOSTS`
checks described in the README so they remain unreachable from the public site
or opportunistic scans.

---

## 6. Operational checklist

* **Backups** – Schedule daily logical backups with `pg_dump` and retain copies
  off the VPS. Test restoring backups quarterly.
* **Monitoring** – Enable PostgreSQL logging, disk usage alerts, and integrate
  with a monitoring solution (e.g., Netdata, Prometheus) for CPU/memory checks.
* **Secrets management** – Store database credentials and JWT signing keys in
  environment variables or a secret manager (e.g., Doppler, Vault). Never commit
  them to Git.
* **Encryption** – Use TLS for the API layer (HTTPS) and, if hosting Postgres on
  a separate machine, require SSL connections.
* **Compliance** – Because you collect sensitive identity data, document access
  controls and retain audit logs for regulatory review.

---

## 7. Next steps

1. Provision the PostgreSQL instance using the steps above.
2. Apply the schema migrations in a staging environment first.
3. Wire the backend service (e.g., Node/Express, NestJS, or Go) to use the
   `billspay_prod` database and expose the API endpoints.
4. Integrate the front end with the new APIs once authentication is live.
5. Iterate on admin and agent requirements using the same modular structure.

Document any deviations from this guide in the repository so future updates stay
aligned with the architecture.
