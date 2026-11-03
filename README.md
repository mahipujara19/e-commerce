# Goodthings Storefront

A full-stack e-commerce app. The frontend uses React, Vite, Material UI, and Redux Toolkit; the backend uses Express and MongoDB, with JWT authentication.

## Getting started

### Requirements

- Node.js (a current LTS version is recommended)
- npm
- MongoDB running locally, or a connection string for a hosted instance

### Setup

```bash
npm install
cp .env.example .env    # then set the JWT secrets and admin credentials
npm run seed            # creates the admin account and loads the catalog
npm run dev             # starts the API on :5000 and Vite on :5173
```

Open the local URL printed by Vite. Vite proxies `/api` requests to the Express server.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and the Vite development server together |
| `npm run server` | Start only the API, restarting on changes |
| `npm run client` | Start only the Vite development server |
| `npm run seed` | Create the admin account and load the catalog if it is empty (`npm run seed -- --reset` replaces all products) |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Environment variables

| Name | Description |
| --- | --- |
| `PORT` | API port. The Vite proxy expects `5000` |
| `MONGO_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend origin allowed by CORS |
| `JWT_ACCESS_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens; must differ from the access secret |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created by `npm run seed` |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA site key for the signup form, set in `.env.local` |

## API

Every response has the shape `{ success, message, data }`. "Bearer" routes need an `Authorization: Bearer <accessToken>` header.

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Public | Create an account and start a session |
| POST | `/api/auth/login` | Public | Start a session |
| POST | `/api/auth/refresh` | Refresh token | Issue a new access token |
| POST | `/api/auth/logout` | Public | Invalidate the session |
| GET | `/api/products` | Public | List products. Optional query: `category`, `search`, `sort`, `limit` |
| GET | `/api/products/:id` | Public | Get one product |
| POST | `/api/products` | Bearer, admin | Create a product |
| PUT | `/api/products/:id` | Bearer, admin | Update a product |
| DELETE | `/api/products/:id` | Bearer, admin | Delete a product |
| POST | `/api/orders` | Bearer | Place an order |
| GET | `/api/orders` | Bearer | List your orders |
| GET | `/api/orders/:id` | Bearer, owner or admin | Get one order |
| PUT | `/api/orders/:id` | Bearer, admin | Update order status. Cancelling returns the stock |
| GET | `/api/health` | Public | Report API and database status |

`sort` accepts `newest`, `oldest`, `price-asc`, `price-desc`, `rating`, `discount`, or `name`.

## How authentication works

1. Signup or login returns a 15-minute access token and sets a 7-day refresh token in an httpOnly cookie. The refresh token is also returned in the response body for non-browser clients.
2. The frontend keeps the access token in memory and sends it as a bearer header. It stores no tokens or passwords in the browser.
3. When a request gets a 401, the frontend calls `/api/auth/refresh` once and retries. The same call restores the session after a page reload.
4. The database stores only a SHA-256 hash of the refresh token, so logging out, or signing in elsewhere, invalidates the previous token. Passwords are hashed with bcrypt.

Write endpoints check the access token, and admin routes also check the user's current role in the database. Order prices and totals are always calculated on the server.

## Project structure

```text
server/
  config/        Environment validation and MongoDB connection
  controllers/   Request handlers
  data/          Catalog used by the seed script
  middleware/    Authentication, validation, and error handling
  models/        User, Product, and Order schemas
  routes/        Route definitions and validation rules
  utils/         Tokens, responses, and order totals
  index.js       Express app
  seed.js        Admin and catalog seeding
src/
  components/    Pages and UI
  toolkit/       Redux slices and store
  utils/api.js   API client with token refresh
```
