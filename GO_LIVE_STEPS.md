# Put your store online — beginner steps

Follow the parts **in order**. Tick each box ☐ as you go.
Every step says **where to click**, **what to type**, and **what you should see** so you know it worked.

Time needed: about **1½–2 hours** the first time. Everything here is **free**. No domain name is needed: Vercel gives you a free address like `https://e-commerce-xxxx.vercel.app`.

> **Words used in this guide**
> - **Terminal** = the command window inside VS Code. Open it with **Ctrl + `** (the key above Tab).
> - **`.env` file** = the settings file in your project folder (next to `package.json`). Open it in VS Code.
> - **Restart the app** = click in the terminal running `npm run dev`, press **Ctrl + C**, then type `npm run dev` and press Enter.
> - **Never** paste passwords or keys into chat, screenshots or GitHub. They only go in `.env` (your computer) and in Vercel's settings.

---

## Part 1 — Check the app runs on your computer (5 min)

☐ **1.1** Make sure **MongoDB is running** on your computer (it is, if the shop showed products before).

☐ **1.2** In the terminal type:
```
npm run dev
```
You should see `API listening on http://localhost:5000` and `MongoDB connected`.

☐ **1.3** Open **http://localhost:5173** in Chrome. You should see the home page with products.

☐ **1.4** Sign in with your admin email and password (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`). You should land on the **Admin** dashboard.

If anything fails, see **Problems & fixes** at the end.

---

## Part 2 — Create a free online database (MongoDB Atlas) (15 min)

Your computer's database can't be reached from the internet, so the website needs its own.

☐ **2.1** Go to **https://www.mongodb.com/cloud/atlas/register** and sign up ("Sign up with Google" is fine).

☐ **2.2** When it asks you to deploy a cluster, choose:
- **M0 (Free)**
- Provider: **AWS**
- Region: **Mumbai (ap-south-1)** ← important, your website also runs in Mumbai
- Name: leave as `Cluster0`

Click **Create Deployment**.

☐ **2.3** Atlas may create a database user automatically and show its username/password in the connection window. The window may say **“Choose a connection method”** instead of **“Create Database User”**—that is normal; you have already passed user creation.

**Important:** If Atlas shows a generated user with **atlasAdmin** and **All Resources**, do not use it for the app. If its password appeared in a screenshot or was shared, treat it as exposed.

If you are on the organization page titled **All Projects**, click your project name (for example, **Project 0**) first. In the project, open **Database & Network Access** using the lock icon on the far-left sidebar, then click **Database Users** under **Database Access**. Do not use the organization-level **Identity & Access → Users** page; those are Atlas website users, not database users.

To make a restricted app user from the **Database Users** page:
1. Click **ADD NEW DATABASE USER**.
2. Choose password/SCRAM authentication. Use a new username (for example, `goodthings_app`) and generate a new strong password. Save it privately; do not share or screenshot it.
3. Under **Database User Privileges → Specific Privileges**, set the privilege dropdown to **readWrite**, type **goodthings** in the **Database** box, and leave **Collection** blank (this grants access to all collections in `goodthings` only).
4. Do not add a built-in `atlasAdmin`, `readWriteAnyDatabase`, or `readAnyDatabase` role. If one is already selected under **Built-in Role**, remove/deselect it; the `readWrite` specific privilege is enough. Leave **Restrict Access to Specific Clusters** off unless you have a specific cluster restriction to configure.
5. Click **Add User** (or **Update User** if editing) and confirm the **MongoDB Roles** column shows `readWrite@goodthings`. Atlas may still show **All Resources** in the separate **Resources** column; that is not the database role. The important part is that the MongoDB role is scoped to `goodthings`, with no `atlasAdmin` or `*AnyDatabase` role.
6. Use only this user's username/password in the connection string in 2.5–2.6. Once you have confirmed the restricted user works, delete the automatically generated `atlasAdmin` database user from the Database Users page. It is separate from your Atlas website sign-in.

☐ **2.4** Check the network access:
The setup screen may already have added your current computer's IP address (it will say **Connection IP address added**). If it has, no action is needed for local setup. Otherwise go to **Network Access** → **Add IP Address** → **Add Current IP Address** → **Confirm**. Do not select **Allow Access from Anywhere** for this local setup. When deploying, add only the production host's supported outbound IP addresses if the host provides them.

☐ **2.5** Get the connection address:
1. In Atlas, open **Database → Clusters** from the left menu.
2. Find your cluster (for example, `Cluster0`) and click **Connect**.
3. If Atlas asks you to choose a connection method, select **Drivers**. Select **Node.js** and a current version if prompted.
4. Copy the connection string Atlas shows; it starts with `mongodb+srv://`. It is a template and looks like:
```
mongodb+srv://<username>:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

☐ **2.6** In Notepad, complete it:
- replace `<username>` and `<db_password>` with the restricted database user's username and new password from 2.3
- put **`goodthings`** right after `.mongodb.net/`

Example of the finished address:
```
mongodb+srv://<username>:<password>@<cluster-host>/goodthings?retryWrites=true&w=majority&appName=Cluster0
```
This is your **Atlas address**. Keep it in Notepad.

**Want to use MongoDB Compass?** You can use Compass to view and inspect this Atlas database, but Compass does not create or host the online database. Finish steps 2.1–2.6 first, then install/open MongoDB Compass, choose **New Connection**, paste the Atlas address, and connect. If Compass cannot connect, check Atlas **Network Access** and that the password in the address is correct. Keep the address private. The app's `npm run seed` step below creates the collections and adds the demo products/admin; use the Admin page to manage products rather than manually editing product documents in Compass.

---

## Part 3 — Fill the online database with demo products and your admin account (5 min)

☐ **3.1** Open `.env`, find the line starting with `MONGO_URI=`. Put a `#` in front of it (switches it off but keeps it), and add your Atlas address below it:
```
# MONGO_URI=mongodb://127.0.0.1:27017/ecommerce
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/goodthings?retryWrites=true&w=majority&appName=Cluster0
```
Save (**Ctrl + S**).

☐ **3.2** Stop the app (**Ctrl + C**), then type:
```
npm run seed
```
You should see `Inserted 83 products`. Your admin account is created too.

☐ **3.3** Start again with `npm run dev`, open http://localhost:5173 → products show. They now come from Atlas.

From now on your computer **and** the website share this database: a product you add in Admin shows in both.
⚠️ Don't run `npm run seed -- --reset` later: `--reset` deletes all products first.

---

## Part 4 — Currency and shop rules (5 min)

☐ **4.1** Add these lines at the end of `.env` (for a rupee store):
```
VITE_CURRENCY=INR
VITE_FREE_SHIPPING_MINIMUM=999
VITE_FLAT_SHIPPING=79
VITE_TAX_RATE=0.18
```
Meaning: free shipping from ₹999, otherwise ₹79 shipping, 18% tax. Change the numbers if you like.

☐ **4.2** Restart the app. Prices now show with **₹**.

☐ **4.3** The demo products still have small numbers as prices (e.g. ₹9.99). To make one realistic: **Admin → Products → pencil icon** → change **Price** → **Save changes**.

---

## Part 5 — Stripe sandbox test payments (completed locally)

This project uses Stripe Checkout for online card payments. Razorpay is not part of this setup. Stripe test mode does not charge a real card.

☑ **5.1** Stripe sandbox/test secret key is set in the local `.env`; keep it private.

☑ **5.2** The Stripe CLI is installed and authenticated. For local testing, keep the listener running in its own terminal:
```
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to http://localhost:5000/api/payments/webhook
```
The listener's `whsec_...` value is configured as `STRIPE_WEBHOOK_SECRET` in the local `.env`. This local webhook secret is not the same as a production webhook secret.

☐ **5.3** Restart `npm run dev`, sign in or create a test customer, add a product to the bag, and open **Checkout**.

☐ **5.4** Choose Stripe and pay with test card `4242 4242 4242 4242`, any future expiry date, and any CVC. Confirm the Stripe listener receives `checkout.session.completed` and the order shows **Paid**. Also test a declined card (`4000 0000 0000 9995`) and confirm it is not marked paid.

☐ **5.5** Cancel/refund a successful test order and confirm the refund appears in the Stripe test dashboard.

---

## Part 6 — Emails with Gmail (optional but recommended, 10 min)

Without email the shop still works, but customers get no order emails, can't reset a forgotten password, and can't verify their email (needed to write reviews).

☐ **6.1** Turn on **2-Step Verification** for your Google account: **https://myaccount.google.com/security**.

☐ **6.2** Open **https://myaccount.google.com/apppasswords** → App name `goodthings` → **Create** → copy the 16-letter password (remove the spaces).

☐ **6.3** Add to `.env` (your Gmail address):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=abcdabcdabcdabcd
EMAIL_FROM="goodthings <yourname@gmail.com>"
SUPPORT_EMAIL=yourname@gmail.com
```

☐ **6.4** Restart the app. The terminal should say `[email] SMTP ready at smtp.gmail.com:587`.
Test: sign up with another email you own → the verification email arrives (check Spam the first time).

---

## Part 7 — The "I'm not a robot" box on Sign up (10 min)

The live website **requires** reCAPTCHA: without its keys, new customers cannot sign up (they see "Sign-up is temporarily unavailable"). The check is never switched off silently on the live site. On your own computer it may stay off.

Google gives you **two keys that belong together**:

| Key from Google | Where it goes | Who can see it |
| --- | --- | --- |
| **Site key** | `VITE_RECAPTCHA_SITE_KEY` (`.env.local` on your computer; Vercel setting) | Public, built into the website |
| **Secret key** | `RECAPTCHA_SECRET_KEY` (`.env` on your computer; Vercel setting) | Server only. Never put it in a `VITE_` setting, never share it |

☐ **7.1** Open **https://www.google.com/recaptcha/admin** → sign in → **+** (Create).
- **Label**: your store name
- **reCAPTCHA type**: **Challenge (v2) → "I'm not a robot" Checkbox**
- **Domains**: add `localhost` now. After Part 9 come back and add your `….vercel.app` address (without `https://`).
- Submit. Google shows the **Site key** and the **Secret key**.

☐ **7.2** On your computer (optional; leave both empty to sign up without the box while testing):
- `.env.local`: `VITE_RECAPTCHA_SITE_KEY=` + the site key (remove any `#` in front)
- `.env`: `RECAPTCHA_SECRET_KEY=` + the secret key
- Restart `npm run dev`. Sign up now shows the box.

☐ **7.3** On Vercel (Part 9.4): add **both** `VITE_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`. Use the two keys from the **same** Google registration. If you change one later, **Redeploy**: the site key is built into the website.

---

## Part 8 — Upload the code to GitHub (5 min)

Your project is already linked to **github.com/mahipujara19/e-commerce**. Your `.env` and `.env.local` are **never** uploaded (the project ignores them).

☐ **8.1** First inspect what will be published:
```
git status --short
git diff --stat
git diff --cached --stat
```
Review every deleted file and changed file. This project currently has many pending changes; do **not** run `git add -A` unless you intend to publish all of them, including deletions. Confirm `.env` and `.env.local` are ignored, and never stage secrets. If anything is unexpected, stop and ask for help before staging.

Only after you have confirmed that all pending changes are intended, run:
```
git add -A
git status --short
git commit -m "Production-ready store: payments, Vercel, fixes"
git push origin main
```
Before `git commit`, check the status output again and confirm no `.env`, `.env.local`, passwords, or API keys are staged.
Sign in to GitHub if it asks.

☐ **8.2** Open **https://github.com/mahipujara19/e-commerce**, set the branch dropdown (top left) to **main**. You should see the new files, e.g. `vercel.json`.

---

## Part 9 — Publish on Vercel (15 min)

☐ **9.1** Go to **https://vercel.com/signup** → **Continue with GitHub**.

☐ **9.2** **Add New… → Project** → find **e-commerce** → **Import**.

☐ **9.3** On the setup screen:
- **Framework Preset**: **Other**
- **Root Directory**: leave `./`
- **Build and Output Settings**: leave everything **off** (the project's `vercel.json` handles it)

☐ **9.4** Open **Environment Variables** on the same screen. For the **first deploy**, add the database, new JWT secrets, currency, shipping/tax, and store/email settings below. Set payments to `cod` initially so the service can deploy before its public webhook URL exists:

| Key | Value |
| --- | --- |
| `MONGO_URI` | your **Atlas address** (Part 2) |
| `JWT_ACCESS_SECRET` | a **new** random value (see below) |
| `JWT_REFRESH_SECRET` | another **new, different** random value |
| `CRON_SECRET` | another random value |
| `VITE_CURRENCY` | `INR` |
| `VITE_FREE_SHIPPING_MINIMUM` | `999` |
| `VITE_FLAT_SHIPPING` | `79` |
| `VITE_TAX_RATE` | `0.18` |
| `VITE_SUPPORT_EMAIL` | your customer-facing support address |
| `PAYMENT_METHODS` | `cod` for the first deploy |
| `VITE_RECAPTCHA_SITE_KEY` | the **site key** from Part 7 |
| `RECAPTCHA_SECRET_KEY` | the **secret key** from Part 7 |
| `CURRENCY` | `inr` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `SUPPORT_EMAIL` | from Part 6 (skip if you skipped it) |

**Making a random value:** run this in the terminal and copy the long text it prints. Run it once per secret:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Not needed on Vercel: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT`, `CLIENT_URL` (the admin is already in Atlas; Vercel knows its own address).

☐ **9.5** Click **Deploy** and wait 1–2 minutes. You should see **Congratulations**.

☐ **9.6** **Continue to Dashboard → Visit**. Your site opens at an address like **https://e-commerce-xxxx.vercel.app**. Write it down — this is your **site address**.

☐ **9.7** Open `https://YOUR-SITE-ADDRESS/api/health`. You should see `"status":"ok"` and `"database":"connected"`.

☐ **9.8** After Part 10 creates the deployed test webhook, add `PAYMENT_METHODS=stripe,cod`, `STRIPE_SECRET_KEY` (Stripe test key), and that endpoint's `STRIPE_WEBHOOK_SECRET` in Vercel. Redeploy. Do not use the local Stripe CLI signing secret in Vercel.

---

## Part 10 — Stripe webhook for the deployed test site

The local Stripe CLI listener only forwards events to your computer. A deployed site needs its own Stripe test-mode webhook endpoint and signing secret.

☐ **10.1** In Stripe Dashboard, stay in **Test mode** → **Developers → Webhooks** → **Add endpoint**.

☐ **10.2** Set the endpoint URL to `https://YOUR-SITE-ADDRESS/api/payments/webhook` and subscribe to:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.

☐ **10.3** Reveal/copy the endpoint's signing secret (`whsec_...`). In Vercel → your project → **Settings → Environment Variables**, set `STRIPE_WEBHOOK_SECRET` to this endpoint secret. Do not use the local CLI listener's signing secret here.

☐ **10.4** Redeploy the Vercel project so it reads the new setting. Keep Stripe in test mode and use test cards until you are ready and approved for live payments.

---

## Part 11 — Test the live website (15 min)

Open your site address and tick each one:

☐ Home and Shop load, with **₹** prices
☐ Search (magnifier icon) finds products; category buttons (a **Category** dropdown on phones) and sorting work
☐ **Sign up** a new customer account (the "I'm not a robot" box appears)
☐ Add to bag → **Checkout** offers Stripe and Cash on delivery
☐ Pay with Stripe's test card `4242 4242 4242 4242` → "Thank you" → order shows **Paid**
☐ Place a **Cash on delivery** order → order shows **Pay on delivery**
☐ Cancel an order: **Account → Order history → Details & tracking → Cancel order**
☐ Admin → **Orders**: add a tracking number, set status to **shipped**
☐ Admin → **Products**: add a product, edit its price, delete it
☐ Admin → **Inventory**: change a stock number, press Enter
☐ Admin → **Coupons**: create `WELCOME10` (10%). It appears under **Current offers** on the home page and **Available offers** at checkout; press **Apply** there
☐ Repeat the main steps **on your phone**

---

## Part 12 — Changing things later

- **Products, prices, stock, coupons, orders, staff:** use the **Admin** pages on the live site. No code needed.
- **Code or text changes:** edit in VS Code, then:
  ```
  git add -A
  git commit -m "describe the change"
  git push origin main
  ```
  Vercel publishes the new version by itself in 1–2 minutes.
- **Changed a setting on Vercel?** Always **Redeploy** (Part 10.4).
- **Before pushing code changes**, check nothing broke: `npm run lint`, `npm run build`.

---

## Not included yet: newsletter sign-up

The home page says the newsletter is **coming soon**. It does not collect or save email addresses. A real sign-up later needs:
1. A mailing service (for example Mailchimp, Brevo or Resend) or a `Subscriber` collection in the database.
2. A server route such as `POST /api/newsletter` that stores the address, sends a confirmation email (double opt-in) and is rate limited.
3. An unsubscribe link in every email.

Customers who tick "Email me about new arrivals" when signing up are already saved (`marketingOptIn` on their account), so that list can be used once the service exists.

---

## Problems & fixes

| What you see | What to do |
| --- | --- |
| `npm run dev` says *Missing environment variables* or *must be …* | The message names the setting. Fix it in `.env`, save, restart. |
| `MongoDB connection failed` | Local: start MongoDB. Atlas: check the database username/password in `MONGO_URI` and confirm your current IP is listed in Network Access (2.4). |
| `npm run seed` says bad auth | Check that `MONGO_URI` has the restricted database username and current password. In Atlas Database Access, reset that user password if needed, then update `MONGO_URI`. |
| Vercel build failed | Vercel → Deployments → click the failed one → read the red lines. Usually a missing setting from 9.4 → add it → Redeploy. |
| Website says "temporarily unavailable" | `/api/health` shows `disconnected` → check the production `MONGO_URI` and allow only the production host's supported outbound IPs in Atlas Network Access. Fix → Redeploy. |
| Error *JWT… must be at least 32 characters* | Use the long random values from 9.4 → Redeploy. |
| Live checkout shows only Cash on delivery | Confirm `PAYMENT_METHODS=stripe,cod`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` are set in Vercel, then redeploy. |
| Stripe Checkout does not open | Check Vercel logs for `[payments]`; confirm the Stripe test secret key is set and is from the same Stripe test/sandbox account as your webhook. |
| Stripe redirects back but order is not Paid | Confirm the deployed webhook URL is correct, the Stripe Dashboard endpoint has the required events, and its signing secret is in Vercel. The local CLI `whsec_...` is only for localhost. |
| Sign up says "temporarily unavailable" | The live site is missing a reCAPTCHA key. Add both keys from Part 7 in Vercel → Redeploy. Vercel **Logs** show a `[captcha]` line naming the missing one. |
| Sign up button stays grey / box shows an error | Your `….vercel.app` address is not in the reCAPTCHA **Domains** list (7.1), or the site key is from a different registration than the secret key. |
| Sign up says "temporarily unavailable" and logs say *Google rejected RECAPTCHA_SECRET_KEY* | The secret key is wrong. Copy it again from the same registration as the site key → Redeploy. |
| Forgot-password email never arrives | Do Part 6, add the same settings on Vercel → Redeploy. |
| Forgot the admin password | On your computer: `npm run user:create -- --email you@example.com --password "NewPass123!" --name "Your Name" --role admin` (uses the Atlas database in `.env`). |
| Where are the website's logs? | Vercel → your project → **Logs**. Search for `[error]` or `[payments]`. |
| Anything else | `FILE_ROLE_GUIDE.md` section 5 "Quick fixes", or send me the exact message you see. |
