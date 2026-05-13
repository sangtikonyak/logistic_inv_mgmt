# Authentication & Multi-Tenant Module Implementation Plan

This document outlines the proposed architecture and implementation strategy for the Authentication & Multi-Tenant module, following the specifications in `core.md` and the features listed in `Authentication & Multi-Tenant Module.md`.

## Goal

Provide a robust, highly secure, scalable, multi-tenant authentication system using Clean Architecture principles, strict TypeScript, and a MySQL backend. The goal is to set the foundational base of the Inventory Management application on which other modules can safely rely, ensuring absolute tenant isolation and reliable RBAC.

## Important Definitions & Business Rules

- **Tenant Isolation**: Every API endpoint (except for initial login/registration) will require a valid JWT. The JWT will contain the `tenantId` and `userId`. A specialized `tenantMiddleware` will enforce that all subsequent actions (specifically reads/writes in the DB repository) implicitly filter for that `tenantId`.
- **JWT tokens & Refresh tokens**: Short-lived Access Token (e.g., 15m) and long-lived Refresh Token (e.g., 7d) to provide seamless UX while mitigating token theft.
- **RBAC (Role Based Access Control)**: Enumerable roles `ADMIN`, `MANAGER`, `STAFF`.
    - `ADMIN` is created upon Company registration.
    - `ADMIN` or `MANAGER` can invite new users.
    - Invited users receive a unique token/link to accept the invitation and set their password.
- **Clean Architecture & Validations**: HTTP layer validations using `Zod`. Controllers are highly declarative and only handle req/res formatting. Services contain all business logic. Repositories handle database interactions and raw SQL execution (with strict parameterized queries to avoid injection).

## Proposed Changes

---

### 1. Database Schema (MySQL)
To enforce multi-tenancy correctly, our tables will follow this structure:

- **`tenants`** table:
  - `id` (CHAR(36) UUID, PK)
  - `name` (VARCHAR, UNIQUE)
  - `created_at`
  - `updated_at`

- **`users`** table:
  - `id` (CHAR(36) UUID, PK)
  - `tenant_id` (CHAR(36) UUID, FK to tenants.id) - **Critical for Isolation**
  - `email` (VARCHAR, UNIQUE per tenant_id via composite unique constraint, or globally unique depending on system choice. Defaulting to globally unique).
  - `password_hash` (VARCHAR)
  - `role` (ENUM: 'ADMIN', 'MANAGER', 'STAFF')
  - `status` (ENUM: 'ACTIVE', 'INVITED', 'INACTIVE')
  - `invite_token` (VARCHAR, nullable)
  - `created_at`
  - `updated_at`

- **`refresh_tokens`** table (Optional, for token revocation capabilities):
    - `id` (CHAR(36) UUID, PK)
    - `user_id` (CHAR(36) FK to users)
    - `token_hash` (VARCHAR)
    - `expires_at` (TIMESTAMP)

> [!IMPORTANT]
> Since MySQL does not natively scope queries by tenant, the **Repositories** must be responsible for automatically appending `WHERE tenant_id = ?` to all respective queries. Alternatively, Row Level Security (RLS) can be implemented if using a compatible MySQL extension or migrating to Postgres. For MySQL, explicit parameter enforcement in the repository is our safety net.

---

### 2. Folder Structure
Will create a modular, clean architectural layout matching `core.md`.

```text
src/
  ├── common/
  │   ├── middlewares/
  │   │   ├── auth.middleware.ts        # Validates JWT and attaches user to req
  │   │   ├── tenant.middleware.ts      # Enforces tenant presence in context
  │   │   └── rbac.middleware.ts        # Validates roles
  │   ├── exceptions/
  │   │   ├── app-error.ts              # Base custom error class for standardized payload
  │   │   └── error-handler.ts          # Centralized Express error boundary
  │   ├── response/
  │   │   └── api-response.ts           # Standard API response formatter
  │   └── utils/
  │       └── jwt.util.ts               # Sign/Verify core logic
  │
  ├── modules/
  │   ├── auth/
  │       ├── controllers/
  │       │   └── auth.controller.ts
  │       ├── services/
  │       │   └── auth.service.ts
  │       ├── repositories/
  │       │   ├── tenant.repository.ts
  │       │   └── user.repository.ts
  │       └── dtos/
  │           ├── auth.schema.ts        # Zod schemas for all actions
```

---

### 3. Application Components

#### Core Middlewares (Common)
- **[NEW]** `auth.middleware.ts`: Validates `Authorization` header. Decodes JWT and injects `{ userId, tenantId, role }` into the `req` object.
- **[NEW]** `tenant.middleware.ts`: Further validates that the specific requested action is isolated to the tenant context injected by the auth middleware.
- **[NEW]** `rbac.middleware.ts`: A higher-order function receiving allowed roles to protect specific routes.

#### Controllers (Auth Module)
- **[NEW]** `auth.controller.ts`:
  - `POST /auth/register-company`: Validates payload (Company Name, Admin Email, Password) and triggers Service.
  - `POST /auth/login`: Validates payload (Email, Password), calls Service, returns Access + Refresh Token.
  - `POST /auth/refresh`: Accepts refresh token, returns new access token.
  - `POST /auth/invite`: Accepts Array of Emails + Roles, calls Service to dispatch invitations.
  - `POST /auth/accept-invite`: Accepts Invite Token + New Password, updates User record.

#### Business Logic Services
- **[NEW]** `auth.service.ts`:
  - Enforces database transactions for `registerCompany` (create tenant + user together).
  - Handles hashing passwords using `bcrypt`.
  - Responsible for generating the invite link tokens (using crypto for secure random hex).
  - Ensures proper validation before data reaches the repository layer.

#### Repositories
- **[NEW]** `tenant.repository.ts`: Handles creation and fetching of Tenants. Contains SQL.
- **[NEW]** `user.repository.ts`: Handles User creation, lookup via Email, and lookup via Invite Token. Note: Every single method here (except creation/initial lookup) will mandate a `tenantId` parameter to ensure strict row fetching isolation.

#### Data Transfer Objects (DTO)
- **[NEW]** `auth.schema.ts`:
  - `RegisterCompanySchema` (Zod validation for required lengths, strong passwords, etc.)
  - `LoginSchema`
  - `InviteUserSchema`
  - `AcceptInviteSchema`

---

## User Review Required

> [!WARNING]
> By default, we are choosing to use explicit `WHERE tenant_id = ?` parameterization in every repository call. We must have strict code reviews whenever new SQL is added to the repositories so this parameter isn't accidentally omitted.

> [!NOTE]
> Have you settled on any specific MySQL connection wrapper (e.g. `mysql2`, `knex`, `kysely`, or a lightweight ORM)? To remain true to raw clean architecture without a heavy ORM, I recommend `mysql2/promise` with explicit parameter bindings. Please let me know what database client/MySQL wrapper you prefer to use for execution.

## Verification Plan

### Manual Verification
- We will define the full folder structure with TypeScript interfaces and strict rules without building a full NodeJS wrapper right away, but to a depth where compiling the code with `tsc --noEmit` flags works cleanly with the chosen MySQL wrapper.
