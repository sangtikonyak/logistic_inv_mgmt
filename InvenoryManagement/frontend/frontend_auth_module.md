# Frontend Auth Module Integration

## Backend Routes

From `src/modules/auth/routes/auth.routes.ts`:

- `POST /api/v1/auth/register-company`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/accept-invite`
- `POST /api/v1/auth/invite`

## Necessary UI

Build UI for:

- register company page
- login page
- accept invite page
- invite users screen for authenticated admin/manager users

Not necessary as a permanent production page:

- refresh token page

Use refresh as a background auth service in production.

## Validation Rules

Mirror backend DTO rules from `src/modules/auth/dtos/auth.schema.ts`:

- `companyName`: min 2, max 100
- `adminEmail`: valid email
- `password` register: min 8
- `email` login: valid email
- `password` login: required
- `token` accept invite: required
- `password` accept invite: min 8
- `emails[]` invite: at least one valid email
- `role` invite: `MANAGER` or `STAFF`

## Session Handling

Save after login:

- access token
- refresh token
- user id
- user email
- user role
- tenant id

Protected requests:

```http
Authorization: Bearer <accessToken>
```

## Route Visibility

Public:

- `/`
- `/auth/login`
- `/auth/register-company`
- `/auth/accept-invite`

Protected:

- `/app/dashboard`
- `/app/settings/users`

Role-gated:

- invite user management visible to `ADMIN` and `MANAGER`

## Shell Alignment

Protected auth-adjacent screens inside `/app/*` should inherit the same admin shell as the main dashboard:

- left sidebar
- topbar and breadcrumb area
- white card surfaces on the shared app canvas

Public auth pages can keep their dedicated onboarding presentation, but error and failure states should use a strong modern alert treatment.
