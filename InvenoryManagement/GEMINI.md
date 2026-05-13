# Project: Inventory Management System (Multi-tenant)

## Overview
A comprehensive multi-tenant inventory management system with modules for products, warehouses, purchases, sales, returns, and reporting.

## Tech Stack
- **Backend:** Node.js (Express 5.x), TypeScript, MySQL (mysql2), Zod (Validation), JWT (Auth).
- **Frontend:** React 19 (Vite), TailwindCSS, React Router DOM.
- **Database:** MySQL with a modular schema design.

## Core Mandates

### 1. Plan-First Workflow
- **NEVER** implement changes directly without first providing a comprehensive research-backed plan.
- **Strategy Phase:** Every plan must include:
    - Research findings (relevant files, current logic).
    - Proposed changes (files to modify, new files, logic updates).
    - **Recommendations:** Suggest architectural or performance improvements based on existing project patterns.
    - Verification strategy (tests to run/create).
- Wait for user approval before moving to the **Execution** phase.

### 2. Architectural Consistency
- **Modular Structure:** All new logic must reside within `src/modules/{module_name}`.
- **Layered Pattern:** Adhere to the following flow:
    - `routes` -> `controllers` -> `services` -> `repositories`.
- **Dependency Injection:** Inject repositories into services, and the database/unitOfWork into routes/controllers.
- **Type Safety:** Use TypeScript interfaces/types defined in module-specific `types` folders.
- **Validation:** Use `zod` schemas for all request payload and parameter validation.

### 3. Multi-tenancy
- **Strict Isolation:** Every database table (where applicable) includes a `tenant_id`.
- **Middleware:** `tenant.middleware.ts` extracts the `tenant_id` from the request.
- **Implementation:** Always pass and filter by `tenant_id` in services and repositories. Never leak data across tenants.

### 4. Database & Transactions
- **MySQL:** Use `mysql2/promise` for database interactions.
- **Unit of Work:** Use the `UnitOfWork` pattern (found in `src/database/unit-of-work.ts`) for any operation involving multiple write steps to ensure atomicity.
- **Repository Pattern:** Repositories should accept a `Queryable` or `DatabaseTransaction` to support transactional and non-transactional queries.

### 5. Frontend Conventions
- **Interactive UI:** Ensure the UI feels modern and responsive using TailwindCSS.
- **Feature-based Structure:** Frontend code is organized by features in `frontend/src/features`.
- **API Shared Layer:** Use `frontend/src/shared/api` for API service definitions.

## Guidelines
- **No Hallucination:** If a pattern or file is not found, research it. Do not assume its existence or logic.
- **Surgical Edits:** Keep changes focused. Avoid unrelated refactoring unless explicitly requested.
- **Documentation:** Maintain `.md` files in the root and `documentation/` for module-specific details.
