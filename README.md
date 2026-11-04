# Goodthings Storefront

A full-stack e-commerce app. The frontend uses React, Vite, Material UI, and Redux Toolkit. The backend uses Express and MongoDB, with JWT authentication, CSRF protection, and role-based access for admins, staff, and customers.

## Getting started

### Requirements

- Node.js (a current LTS version is recommended)
- npm
- MongoDB running locally, or a connection string for a hosted instance

### Setup

```bash
npm install
cp .env.example .env    # then set the JWT secrets and admin credentials
npm run seed            # creates the admin (and optional staff) account and loads the catalog
npm run dev             # starts the API on :5000 and Vite on :5173
```

Open the local URL printed by Vite. Vite proxies `/api` to the Express server, so in development the browser sees one origin and the auth and CSRF cookies are first-party.

There is one `package.json` and one `node_modules` at the repo root, shared by both apps. The npm scripts point at the `frontend/` and `backend/` folders.

## Project structure

```text
.env, .env.example     Shared configuration (see below); only VITE_* values reach the browser
package.json           Scripts and dependencies for both apps
nodemon.json           Restarts the API when backend/ or .env changes

backend/
  config/              Environment validation, MongoDB connection, role definitions
  controllers/         Request handlers
  data/                Catalog used by the seed script
  middleware/          Authentication, roles, CSRF, validation, and error handling
  models/              User, Product, and Order schemas
  routes/              Route definitions and validation rules
  scripts/             Account management (createUser.js, upsertUser.js)
  utils/               Tokens, email, stock notifications, migrations, responses, order totals
  index.js             Express app
  seed.js              Account and catalog seeding

frontend/
  index.html           Vite entry page
  vite.config.js       Vite config (root is this folder; reads .env from the repo root)
  tailwind.config.js, postcss.config.js
  public/              Static files
  src/
    components/        Pages and UI; admin/ holds the admin panel
    hooks/             Shared React hooks
    toolkit/           Redux slices and store
    utils/api.js       API client: CSRF header, token refresh, retries
    utils/roles.js     Role names, mirroring backend/config/roles.js
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and the Vite development server together |
| `npm run server` | Start only the API, restarting on changes |
| `npm run client` | Start only the Vite development server |
| `npm start` | Start the API without file watching |
| `npm run seed` | Create the admin account (and staff account, if `STAFF_EMAIL` is set) and load the catalog if it is empty. `npm run seed -- --reset` replaces all products |
| `npm run user:create -- --email jo@example.com --password "Secret123!" --name "Jo Smith" --role staff` | Create an account with a role, or change the role of an existing one (`admin`, `staff`, or `customer`) |
| `npm run build` | Build the frontend into `frontend/dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Environment variables

All variables live in `.env` at the repo root. `.env.local` also works for frontend values.

| Name | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | Signs access tokens |
| `JWT_REFRESH_SECRET` | Yes | Signs refresh tokens; must differ from the access secret |
| `PORT` | No | API port, `5000` by default. The Vite proxy reads the same value |
| `CLIENT_URL` | No | Frontend origin, used for CORS and in email links. Defaults to `http://localhost:5173` |
| `CSRF_SECRET` | No | Signs CSRF tokens. When empty, it is derived from `JWT_ACCESS_SECRET` |
| `COOKIE_SAMESITE` | No | `lax` (default), `strict`, or `none`. Use `none` only when the API and frontend are on different sites |
| `COOKIE_SECURE` | No | `true`/`false`. Defaults to `true` in production. Always on when `COOKIE_SAMESITE=none` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | For seeding | Admin account created by `npm run seed` |
| `STAFF_EMAIL`, `STAFF_PASSWORD` | No | Optional staff account created by `npm run seed` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | No | SMTP server for outgoing email (see "Email") |
| `EMAIL_FROM` | No | Sender address |
| `STOCK_ALERT_EMAILS` | No | Comma-separated recipients of stock-change emails. When empty, every admin is emailed |
| `VITE_RECAPTCHA_SITE_KEY` | No | reCAPTCHA site key for the signup form |
| `VITE_API_URL` | No | API origin when it is not served from the same origin as the frontend, e.g. `https://api.example.com` |

The API refuses to start if a required variable is missing or the two JWT secrets are the same.

## Roles

| Role | Access |
| --- | --- |
| `admin` | Everything: products, inventory, orders, customers, and the Team screen for creating accounts and changing roles |
| `staff` | Admin panel for day-to-day work: dashboard, orders (view and update status), inventory (stock levels), and customers. Cannot create, edit, or delete products, or manage the team |
| `customer` | The storefront. Every signup gets this role |

The API checks the role stored in the database on every request, not the role inside the token or the browser. Changing someone's role signs them out on every device, and any other access token they hold stops working for role-protected routes immediately. Admins cannot change their own role, so at least one admin always remains.

Admin and staff accounts are management-only. The storefront sends them to `/admin`, except for the email-link pages (verify email, reset password).

To create accounts, use the Team screen (`/admin/team`, admins only), `npm run seed` with `STAFF_EMAIL` set, or `npm run user:create`.

Accounts saved with the old `user` role are renamed to `customer` automatically when the API starts.

## How authentication works

1. Signup or login returns a 15-minute access token and sets a 7-day refresh token in an httpOnly cookie scoped to `/api/auth`. The refresh token is never in the response body, so page scripts cannot read it.
2. The frontend keeps the access token in memory only and sends it as a bearer header. It stores no tokens or passwords in the browser. `localStorage` holds only the profile, as a hint that a session may exist.
3. Before a request, the frontend refreshes a token that is about to expire. If a request still gets a 401, it calls `/api/auth/refresh` once and retries once. Parallel requests share one refresh, and no request is retried twice, so it cannot loop.
4. Each refresh rotates the refresh token. A token that was just replaced is still accepted for 30 seconds, so tabs that refresh at the same moment do not sign each other out. An older token being reused revokes that session.
5. Each device has its own session (up to 10 per user), so signing in on one device does not sign out another. Logout removes that session from the database and clears the cookie. A password reset ends all sessions.
6. If the refresh token is expired or revoked, the session is cleared. Protected pages redirect to the login page, which explains that the session expired and returns the user to the page they were on after they sign in.

Role-gated pages wait for the server to confirm the session before rendering, so a stale profile in `localStorage` never decides access.

## CSRF protection

The API uses a signed double-submit cookie:

1. The frontend calls `GET /api/csrf-token` before its first state-changing request. The response sets an httpOnly `csrfToken` cookie and returns the same token in the body.
2. The frontend keeps the token in memory and sends it as an `X-CSRF-Token` header on every POST, PUT, PATCH, and DELETE.
3. The server rejects any such request whose header does not match the cookie, or whose token does not carry a valid HMAC signature. The response is 403 with `data.code: "CSRF_INVALID"`. When this happens, the frontend fetches a new token and retries once.

Every state-changing route is covered, including login and signup (to prevent login CSRF) and refresh and logout, which rely on the cookie. Because the token comes from the response body, not from `document.cookie`, this also works when the frontend and API are on different origins.

## Email

Without `SMTP_HOST`, the API prints emails, including verification links, to its console in development. In production, sending fails with a clear error instead. At startup, the API checks the SMTP connection and logs the result.

- **Verification:** sent on signup and when the user clicks **Resend link** on their account page. Links go to `CLIENT_URL/verify-email?token=…`, last 24 hours, and work once. The database stores only a SHA-256 hash of the token. Resending is limited to once a minute. If sending fails, signup still succeeds and the UI says the email was not sent, and Resend shows the error. The backend logs the SMTP error.
- **Password reset:** links go to `CLIENT_URL/reset-password?token=…` and last 1 hour.
- **Stock changes:** after any successful stock change, from the Inventory screen or the product form, one email goes to `STOCK_ALERT_EMAILS` (or to every admin). It lists the product name, SKU, previous and new quantity, who made the change, and when. The email is sent after the response. If it fails, the failure is logged and the stock update still stands.

## Inventory screen

- Use −/+ or type a quantity. Nothing is saved until you click **Save** on that row (or press Enter), or **Save all** in the bar above the table. Each row has a fixed Save/Reset column, so buttons do not appear and disappear as values change.
- Rows with unsaved changes are highlighted and marked **Unsaved**, with the previous value shown underneath. The bar at the top stays visible while scrolling and counts the pending changes.
- Values must be whole numbers from 0 to 1,000,000. Invalid entries are flagged, and saving is blocked until they are fixed. The server validates the same rules.
- Rows keep their position after saving, so editing several products does not reshuffle the list. Changing the filter or search re-sorts it.
- Leaving the page with unsaved changes asks for confirmation.

## API

Every response has the shape `{ success, message, data }`. "Bearer" routes need an `Authorization: Bearer <accessToken>` header. Every POST, PUT, PATCH, and DELETE also needs an `X-CSRF-Token` header (see "CSRF protection").

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/csrf-token` | Public | Issue a CSRF token (cookie and body) |
| POST | `/api/auth/signup` | Public | Create a customer account and start a session |
| POST | `/api/auth/login` | Public | Start a session |
| POST | `/api/auth/refresh` | Refresh cookie | Rotate the refresh token and issue a new access token |
| POST | `/api/auth/logout` | Refresh cookie | End this session |
| POST | `/api/auth/verify-email` | Public | Verify an email address with a token from an email link |
| POST | `/api/auth/forgot-password` | Public | Email a password reset link |
| POST | `/api/auth/reset-password` | Public | Set a new password with a reset token |
| GET | `/api/products` | Public | List products. Optional query: `category`, `search`, `sort`, `limit` |
| GET | `/api/products/:id` | Public | Get one product |
| POST | `/api/products` | Bearer, admin | Create a product |
| PUT | `/api/products/:id` | Bearer, admin | Update a product |
| DELETE | `/api/products/:id` | Bearer, admin | Delete a product |
| PATCH | `/api/products/stock` | Bearer, staff or admin | Body `{ updates: [{ id, stock }] }` (1–100 items). Updates stock and emails admins |
| POST | `/api/products/:id/reviews` | Bearer, verified email | Add or replace your review |
| POST | `/api/orders` | Bearer | Place an order |
| GET | `/api/orders` | Bearer | List your orders |
| GET | `/api/orders/all` | Bearer, staff or admin | List every order |
| GET | `/api/orders/:id` | Bearer, owner, staff, or admin | Get one order |
| PUT | `/api/orders/:id` | Bearer, staff or admin | Update order status. Cancelling returns the stock |
| GET | `/api/users` | Bearer, staff or admin | List accounts with order stats |
| POST | `/api/users` | Bearer, admin | Create an account with a role: `{ name, email, password, role }` |
| PATCH | `/api/users/:id/role` | Bearer, admin | Change an account's role and sign it out everywhere |
| GET, PUT | `/api/users/me` | Bearer | Get or update your profile |
| POST | `/api/users/me/verification` | Bearer | Resend the verification email (once per minute) |
| GET | `/api/users/me/wishlist` | Bearer | List wishlist product ids |
| PUT, DELETE | `/api/users/me/wishlist/:productId` | Bearer | Add to or remove from the wishlist |
| GET | `/api/health` | Public | Report API and database status |

`sort` accepts `newest`, `oldest`, `price-asc`, `price-desc`, `rating`, `discount`, or `name`.

401 responses for expired sessions include `data.code: "SESSION_EXPIRED"`. 401 responses for missing or invalid access tokens include `TOKEN_MISSING` or `TOKEN_INVALID`.

## Deploying with separate origins

If the frontend and API are on different sites (for example `shop.example.com` and `api.example.net`):

- Set `CLIENT_URL` to the frontend origin, `COOKIE_SAMESITE=none`, and `NODE_ENV=production`. HTTPS is required.
- Build the frontend with `VITE_API_URL` set to the API origin.

The API trusts the first proxy in production (`trust proxy`), so secure cookies work behind a load balancer.

When both are served under one site (for example, with a reverse proxy that forwards `/api`), keep the defaults.
