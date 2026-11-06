# Project File & Folder Guide

This project is a full-stack e-commerce app with:

- Frontend: React + Vite + Redux Toolkit + Material UI
- Backend: Express + MongoDB + JWT auth
- Data flow: frontend requests API, backend talks to MongoDB, frontend stores data in Redux and renders UI

If your manager asks, "Is this data coming from the API?", the short answer is: yes, most of the real data comes from the backend API, not from local component state alone.

---

## 1) Big picture: how the app works

At a high level:

1. `frontend/src/App.jsx` decides which page to show.
2. A component loads data through Redux actions.
3. Redux thunk calls a helper in `frontend/src/utils/api.js`.
4. That helper sends a request like `/api/products` or `/api/auth/login`.
5. `backend/index.js` receives the request and routes it to the correct file in `backend/routes/`.
6. The route calls a controller in `backend/controllers/`.
7. The controller reads or writes MongoDB using Mongo models in `backend/models/`.
8. The response comes back to the frontend and Redux updates UI.

Example: product list

- `frontend/src/components/Product.jsx` shows the Shop page
- It uses Redux state from `frontend/src/toolkit/productslice.jsx`
- That slice calls `api('/products')`
- `frontend/src/utils/api.js` sends the request to the backend
- `backend/routes/productRoutes.js` matches `GET /api/products`
- `backend/controllers/productController.js` runs `getProducts()`
- `backend/models/Product.js` queries MongoDB
- Data comes back to the frontend and gets rendered on the page

So yes: the product data is API-driven.

---

## 2) Root files

### `package.json`
Role: project setup file.

What it does:
- defines scripts like `npm run dev`, `npm run server`, `npm run build`, `npm run seed`
- stores all dependencies for the frontend and backend
- tells the app to use ES modules (`"type": "module"`)

Examples:
- `npm run dev` starts both API server and frontend
- `npm run server` starts only the Express backend
- `npm run client` starts only the Vite frontend

### `README.md`
Role: project documentation for setup and usage.

What it does:
- explains how to install and run the app
- tells you environment variables needed
- describes auth, roles, and app structure

### `nodemon.json`
Role: watches backend files so the API restarts automatically during development.

### `prompt.txt`
Role: likely a local prompt or internal note file used during development; not usually part of running the app.

---

## 3) `backend/` folder: server-side logic

This is the API layer. It handles all database actions, authentication, validation, and business logic.

### `backend/index.js`
Role: main Express server entry point.

What it does:
- creates the Express app
- enables CORS and security middleware
- loads cookie parser and JSON parser
- adds `/api/health`, `/api/csrf-token` endpoints
- routes requests to `/api/auth`, `/api/products`, `/api/orders`, `/api/users`
- connects to MongoDB
- starts the server on the configured port

This is the file to open first when debugging backend issues.

### `backend/seed.js`
Role: populates initial data into the database.

What it does:
- creates admin/staff accounts if needed
- loads products from JSON into MongoDB
- helps you initialize the app from empty DB state

### `backend/data/products.json`
Role: product seed data.

This is the default product catalog used by the seed script. The frontend later loads products from the API, not directly from this file.

---

## 4) `backend/config/` folder: app configuration

### `backend/config/db.js`
Role: MongoDB connection logic.

What it does:
- connects the app to MongoDB
- retries if DB is not available
- marks `isDbConnected()` status

If MongoDB is down, this is where the issue usually starts.

### `backend/config/env.js`
Role: environment config validation.

What it does:
- reads values like `PORT`, `MONGO_URI`, `JWT_ACCESS_SECRET`, etc.
- fails early if required variables are missing

### `backend/config/roles.js`
Role: role constants.

What it does:
- defines roles like `admin`, `staff`, `customer`
- used by auth checks and route protection

### `backend/config/security.js`
Role: security limits.

What it does:
- sets rate-limit rules for login and password reset attempts
- prevents brute-force attacks

---

## 5) `backend/controllers/` folder: business logic

These files are the "brains" behind each API route.

### `backend/controllers/authController.js`
Role: sign up, login, logout, refresh, forgot password, reset password, email verification.

What it does:
- creates user accounts
- validates credentials
- issues JWT tokens
- manages refresh cookies
- handles email verification and password reset flows

This file is the main auth logic file.

### `backend/controllers/productController.js`
Role: product CRUD and reviews.

What it does:
- `getProducts()` returns products with search/category/sort support
- `getProduct()` returns one product by ID
- `createProduct()` adds a new product
- `updateProduct()` edits product fields
- `deleteProduct()` removes a product
- `addReview()` adds or updates customer reviews
- `updateStock()` updates inventory in bulk

This is one of the most important files for storefront data and debugging product issues.

### `backend/controllers/orderController.js`
Role: order processing logic.

What it does:
- creates orders
- fetches customer and admin order data
- updates order status
- calculates totals and order metadata

### `backend/controllers/userController.js`
Role: user profile and account management.

What it does:
- gets current user profile
- updates profile
- manages account details and status
- supports admin/customer pages that depend on current user data

---

## 6) `backend/models/` folder: MongoDB schemas

These are the database models.

### `backend/models/User.js`
Role: user schema.

What it does:
- stores user name, email, password hash, phone, role, verification state
- stores session-related info and account metadata
- used by auth and profile features

### `backend/models/Product.js`
Role: product schema.

What it does:
- stores name, description, price, category, stock, image, reviews
- includes rating, discount, tags, inventory fields
- used by product listing and product detail screens

### `backend/models/Order.js`
Role: order schema.

What it does:
- stores order items, totals, buyer info, delivery status, and timestamps

### `backend/models/RateLimit.js`
Role: stores rate-limit tracking in the database.

Used to block repeated abuse or login attempts.

---

## 7) `backend/routes/` folder: API endpoints

These files map URLs to controller functions.

### `backend/routes/authRoutes.js`
Role: auth endpoints.

Examples:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### `backend/routes/productRoutes.js`
Role: product endpoints.

Examples:
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `PATCH /api/products/stock`
- `POST /api/products/:id/reviews`

This is one of the most important files if the question is, "Where does product data come from?"

### `backend/routes/orderRoutes.js`
Role: order-related endpoints.

### `backend/routes/userRoutes.js`
Role: profile and account-related endpoints.

---

## 8) `backend/middleware/` folder: request protection and validation

### `backend/middleware/authMiddleware.js`
Role: protects routes and checks permissions.

What it does:
- reads the Bearer token
- verifies JWT
- loads user from DB
- allows only certain roles (`admin`, `staff`, etc.)

This is the security gate before admin routes.

### `backend/middleware/csrf.js`
Role: CSRF protection.

Used because the app uses cookies for auth.

### `backend/middleware/errorHandler.js`
Role: centralized error responses.

What it does:
- returns consistent JSON error format
- handles not-found and database-down cases

### `backend/middleware/rateLimit.js`
Role: request throttling helper.

### `backend/middleware/validate.js`
Role: validates request body and query parameters using express-validator.

---

## 9) `backend/utils/` folder: helper logic

These are not main business modules, but they help the app work smoothly.

Important ones:

- `backend/utils/apiResponse.js` — standard API response format
- `backend/utils/generateTokens.js` — JWT creation and verification
- `backend/utils/clientIp.js` — detects user IP for rate limiting
- `backend/utils/limiters.js` — limits for login/password reset
- `backend/utils/rateLimiter.js` — logic to enforce rate limits
- `backend/utils/sendEmail.js` — email delivery
- `backend/utils/stockNotifications.js` — sends stock alerts
- `backend/utils/orderTotals.js` — calculates order totals
- `backend/utils/migrations.js` — database migration logic
- `backend/utils/jsonTransform.js` — custom JSON output transformations
- `backend/utils/securityLog.js` — logs security events
- `backend/utils/csrf` is not here; it is in middleware

If debugging a bug feels confusing, start with the controller and then trace into the matching util.

---

## 10) `backend/scripts/` folder: admin utilities

### `backend/scripts/createUser.js`
Role: creates a user manually from the terminal.

### `backend/scripts/upsertUser.js`
Role: creates or updates a user account in a script-friendly way.

These are useful for dev/admin tasks, not regular app flow.

---

## 11) `frontend/` folder: frontend app

This is the website UI. It renders pages and talks to the API.

### `frontend/index.html`
Role: HTML shell for the app.

The browser loads this page and then React mounts inside the `#root` node.

### `frontend/vite.config.js`
Role: Vite configuration.

What it does:
- sets the app root
- configures dev server behavior
- optionally proxies API requests to the backend during development

### `frontend/tailwind.config.js`
Role: Tailwind styling configuration.

### `frontend/postcss.config.js`
Role: PostCSS processing for Tailwind CSS.

### `frontend/public/`
Role: static assets served directly by the browser.

Files:
- `favicon.svg`
- `icons.svg`

---

## 12) `frontend/src/` folder: main app logic

### `frontend/src/main.jsx`
Role: React app bootstrap file.

What it does:
- creates the React root
- wraps the app in Redux `Provider`
- sets up Material UI theme
- renders `App`

This is the startup point for the frontend.

### `frontend/src/App.jsx`
Role: top-level router and route definitions.

What it does:
- sets up `BrowserRouter`
- defines customer routes and admin routes
- lazy-loads pages for better performance
- loads products and restores session on first render
- protects routes with `RequireAuth`

This is one of the most important files to understand the website flow.

### `frontend/src/index.css`
Role: global CSS and theme styling.

### `frontend/src/assets/`
Role: image files used by the site.

- `hero.png`
- `react.svg`
- `vite.svg`

---

## 13) `frontend/src/components/` folder: pages and UI blocks

This is where most page screens live.

### Main storefront screens
- `Home.jsx` — homepage
- `Product.jsx` — shop/catalog page
- `ProductItem.jsx` — single product details page
- `Cartlist.jsx` — cart page
- `CheckoutForm.jsx` — order checkout form
- `Account.jsx` — account page
- `Wishlist.jsx` — saved items page
- `About.jsx` — about page
- `NotFound.jsx` — 404 page
- `header.jsx` — top navigation/header
- `Footer.jsx` — bottom footer
- `StorefrontLayout.jsx` — shared storefront shell

### Auth screens
- `LoginForm.jsx` — login UI
- `SignupForm.jsx` — signup UI
- `ForgotPassword.jsx` — forgot password UI
- `ResetPassword.jsx` — reset password UI
- `VerifyEmail.jsx` — verify email page

### Small reusable UI blocks
- `Addtocart.jsx` — add to cart button
- `ProductCard.jsx` — card shown in product grids
- `ProductReviews.jsx` — reviews section
- `QuantityControl.jsx` — quantity +/- controls
- `EmptyState.jsx` — no-data placeholder
- `ConfirmDialog.jsx` — confirmation popup
- `Toaster.jsx` — toast notifications
- `PageLoader.jsx` — loading screen
- `RequireAuth.jsx` — route guard for login-required pages
- `SectionHeading.jsx` — section title component
- `FreeShippingMeter.jsx` — free shipping progress UI

### Admin area
Inside `frontend/src/components/admin/`:

- `AdminLayout.jsx` — admin page shell
- `AdminDashboard.jsx` — overview page
- `AdminOrders.jsx` — manage orders
- `AdminInventory.jsx` — inventory updates
- `AdminProducts.jsx` — product list and admin product management
- `AdminCustomers.jsx` — customer data
- `AdminNotFound.jsx` — admin 404
- `AdminCustomers.jsx` / `AdminTeam.jsx` / `AdminUI.jsx` — admin management views
- `ProductFormDialog.jsx` — dialog to create or edit products
- `StockStatus.jsx` — stock indicator
- `adminSections.js` — defines route names and role access for admin pages

The admin area is gated by role checks and uses the same API, just with different permissions.

---

## 14) `frontend/src/hooks/` folder: reusable React hooks

- `useQueryParams.js` — reads query string values
- `useWishlist.js` — wishlist logic and helper behavior

These avoid repeating code across components.

---

## 15) `frontend/src/toolkit/` folder: Redux state management

This is the state layer of the frontend. It stores data and async operations.

### `frontend/src/toolkit/store.js`
Role: central Redux store.

What it does:
- combines all reducers
- stores slices for cart, products, auth, orders, wishlist, toast, customers, etc.
- attaches toast listeners middleware

### `frontend/src/toolkit/apiThunk.js`
Role: wrapper for async Redux actions.

It makes API calls easier and consistently handles failure with `rejectWithValue`.

### `frontend/src/toolkit/authSlice.js`
Role: user session state.

What it does:
- login/signup/logout actions
- session restore on page refresh
- stores user profile and auth state
- keeps only limited profile info in localStorage
- access token remains in memory for security

This is the file to inspect for login/session issues.

### `frontend/src/toolkit/productslice.jsx`
Role: product list state.

What it does:
- fetches products from `/api/products`
- stores the product list in Redux
- updates the list after create/update/delete/review actions

This is the key file for storefront data loading.

### `frontend/src/toolkit/orderSlice.js`
Role: order state.

### `frontend/src/toolkit/searchSlice.js`
Role: search term and category filter state.

### `frontend/src/toolkit/slice.js`
Role: cart state.

### `frontend/src/toolkit/wishlistSlice.js`
Role: current user's wishlist state.

### `frontend/src/toolkit/customerSlice.js`
Role: admin/customer user data state.

### `frontend/src/toolkit/uiSlice.js`
Role: UI settings like theme and visual state.

### `frontend/src/toolkit/toastSlice.js`
Role: toast notification state.

### `frontend/src/toolkit/toastListeners.js`
Role: listens for actions and shows toast notifications to the user.

---

## 16) `frontend/src/utils/` folder: frontend helpers

### `frontend/src/utils/api.js`
Role: main frontend API client.

This is the central file for all browser-to-API requests.

What it does:
- builds the API URL
- sends JWT in Authorization header
- manages CSRF tokens
- refreshes access tokens when needed
- handles 401 session expiry automatically
- retries safe flows when token or CSRF needs refresh

If someone asks, "Where does the frontend actually call the backend?", this is the answer.

### `frontend/src/utils/roles.js`
Role: frontend role helper.

Used to check if the current user is admin/staff/customer.

### `frontend/src/utils/format.js`
Role: formatting functions for currency, dates, and display labels.

---

## 17) Clear answer to your question: where does the real data come from?

Most real app data comes from the backend API:

- Products: `GET /api/products`
- User login/session: `POST /api/auth/login`, `POST /api/auth/refresh`
- Orders: `GET /api/orders`, `POST /api/orders`
- User profile: `GET /api/users`, `PUT /api/users/me`
- Admin dashboards: backend controllers + MongoDB

The frontend does not usually fetch product data from a local JSON file or from component state alone; it requests it from the backend and then stores the response in Redux.

### Example: product data path

`frontend/src/components/Product.jsx`
  -> `frontend/src/toolkit/productslice.jsx`
  -> `frontend/src/utils/api.js`
  -> `backend/routes/productRoutes.js`
  -> `backend/controllers/productController.js`
  -> `backend/models/Product.js`
  -> MongoDB
  -> response back to frontend
  -> Redux stores it
  -> React renders it

That is the exact path to mention in a debug meeting.

---

## 18) Best files to open first when debugging

If you are debugging the app, this is the order to read:

1. `backend/index.js` — server entry
2. `backend/routes/productRoutes.js` — where product API endpoints are defined
3. `backend/controllers/productController.js` — product logic
4. `backend/models/Product.js` — database structure
5. `frontend/src/utils/api.js` — how frontend talks to backend
6. `frontend/src/toolkit/productslice.jsx` — how product data is stored in Redux
7. `frontend/src/components/Product.jsx` — how the UI displays the data

For auth:

1. `backend/routes/authRoutes.js`
2. `backend/controllers/authController.js`
3. `backend/middleware/authMiddleware.js`
4. `frontend/src/toolkit/authSlice.js`
5. `frontend/src/utils/api.js`

For admin screens:

1. `frontend/src/App.jsx`
2. `frontend/src/components/admin/adminSections.js`
3. `frontend/src/components/admin/AdminLayout.jsx`
4. `backend/middleware/authMiddleware.js`

---

## 19) Short cheat sheet

- Frontend = what user sees and clicks
- Backend = business rules + database access
- Redux = frontend state manager
- API = bridge between frontend and backend
- Models = MongoDB structure
- Routes = URL mapping
- Controllers = logic that handles requests
- Middleware = auth/security/validation

---

## 20) Final simple explanation for your manager

"The website is split into frontend and backend. The frontend is the React UI, but the actual data like products, users, orders, and auth is coming from the backend API. The frontend requests data through `frontend/src/utils/api.js`, the backend route handles it in `backend/routes/*.js`, the controller does the work in `backend/controllers/*.js`, and the MongoDB model reads or writes the database in `backend/models/*.js`. So yes, most of the data is API-driven, not hardcoded in the page." 

If you want, I can also make a second version of this guide as a more visual flowchart diagram or a simpler beginner-friendly version for presentation use.
