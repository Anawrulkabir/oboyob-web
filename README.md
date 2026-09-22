# অবয়ব — Oboyob

Lightweight storefront: catalog, product pages, simple order form.
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase · Vercel.

## Run locally
    npm install
    cp .env.example .env.local   # optional — without it the site runs on mock data
    npm run dev                  # http://localhost:3000

Without Supabase env vars the catalog uses lib/mock-products.ts (mirrors the seed)
and the order form tells customers to message on Facebook.

## Supabase
1. SQL editor → run, in order: migrations/0001_init.sql, 0002_admin.sql,
   0003_customers.sql, then seed.sql.
2. Set the price (seeded as NULL — not provided):
   update products set price = <TAKA> where product_code = 'OB-C-001';
3. Photos: public Storage bucket "products" → upload → insert into product_images
   (example at the bottom of seed.sql).
4. Orders land in the `orders` table. Inserted server-side with the service-role key;
   RLS blocks all public access to orders.

## Admin dashboard (/admin)
Setup (once):
1. Supabase → Authentication → Users → Add user (your email + password).
   Authentication → Providers → Email: turn OFF "Allow new users to sign up".
2. SQL: insert into admins (user_id) select id from auth.users where email = 'you@example.com';
3. Open /admin and log in.

What it does:
- Products: list, search, filter by category; create; edit all fields; toggle
  in-stock / featured; archive (hidden from shop, kept for order history);
  restore; permanent delete (archived only).
- Product codes are assigned by the database on create (next OB-X-NNN for the
  category) and cannot be changed. Category is fixed after creation.
- Images: multi-upload straight to Supabase Storage (phone photos are resized
  in the browser), reorder, set main image, alt text, delete.
- Orders: list, filter by status, update status, tap-to-call.
- The public site updates immediately after every save.

Security: middleware checks login; every admin page and server action also
checks the `admins` table; the database enforces the same rules via RLS.

## Customer login
One flow, no passwords — signing in the first time creates the account.
Guests can always order without logging in.

Email code (free, always on):
- Supabase → Authentication → Email Templates → "Magic Link": make sure the
  template shows the code: {{ .Token }}  (customers type the 6-digit code).
- Supabase's built-in email sender is rate-limited (a few per hour). For real use:
  Authentication → SMTP Settings → custom SMTP. No domain? Use Brevo:
  smtp-relay.brevo.com, port 587, login + SMTP key from Brevo → SMTP & API,
  sender = the email you verified in Brevo. (Resend works too if you own a domain.)

Google (free):
1. console.cloud.google.com → create a project → APIs & Services →
   OAuth consent screen: External, app name, support email, add your domain;
   publish the app ("In production").
2. Credentials → Create credentials → OAuth client ID → Web application.
   Authorized redirect URIs: the callback URL shown in
   Supabase → Authentication → Providers → Google
   (https://YOUR-PROJECT.supabase.co/auth/v1/callback).
3. Supabase → Authentication → Providers → Google: enable, paste Client ID + Secret.
4. Set NEXT_PUBLIC_AUTH_GOOGLE=1.

Facebook (free):
1. developers.facebook.com → Create app → "Authenticate and request data from
   users with Facebook Login". Add privacy policy URL; switch the app to Live.
2. Supabase → Authentication → Providers → Facebook: paste App ID + Secret.
   Copy Supabase's callback URL into Facebook Login → Valid OAuth Redirect URIs.
3. Set NEXT_PUBLIC_AUTH_FACEBOOK=1.

For both Google and Facebook: Supabase → Authentication → URL Configuration:
Site URL = your domain, and add https://yourdomain/auth/callback** to Redirect URLs
(plus http://localhost:3000/auth/callback** for local dev).
A customer who uses the same email with Google, Facebook and email-code login
lands on the same account (Supabase links verified emails automatically).

Mobile number (SMS OTP — costs money per SMS, no free option for Bangladesh):
- Default Supabase way (no code, pick a provider in the dashboard):
  1. Supabase → Authentication → Providers → Phone: enable.
  2. Choose the SMS provider — Twilio, Twilio Verify, MessageBird, Vonage or
     Textlocal — and paste its credentials (e.g. Twilio: Account SID,
     Auth Token, Message Service SID).
  3. Set NEXT_PUBLIC_AUTH_PHONE=1.
  Numbers are sent as +8801XXXXXXXXX; customers type 01XXXXXXXXX.
- Cheaper: your own BD gateway (e.g. BulkSMSBD, pay per SMS, no monthly fee)
  through the Send SMS hook — this replaces the provider above:
  1. Set SMS_API_URL (see .env.example).
  2. Supabase → Authentication → Providers → Phone: enable.
  3. Supabase → Authentication → Hooks → Send SMS → HTTPS →
     https://yourdomain/api/auth/sms-hook → generate secret →
     put it in SUPABASE_SMS_HOOK_SECRET.
  4. Set NEXT_PUBLIC_AUTH_PHONE=1.

## Notifications
All optional; never block an order (sent after the response).
- Seller, Telegram (free): message @BotFather → /newbot → token. Send your bot
  any message, open https://api.telegram.org/bot<TOKEN>/getUpdates, copy chat.id.
- Email, no domain: Brevo (free 300/day) → verify your sender email → API key →
  BREVO_API_KEY + EMAIL_FROM="অবয়ব <that-email>".
- Email, own domain: Resend (free 3,000/mo) → verify domain → RESEND_API_KEY.
- Customer SMS: any BD gateway with an HTTP API → set SMS_API_URL template.

Who gets what:
- New order → seller (Telegram + email), customer (email if given, SMS if enabled)
- Admin changes status to confirmed / shipped / delivered / cancelled →
  customer (email + SMS)

## Product identity
- id: UUID primary key, used by all relations
- product_code: OB-{S|J|C|3P}-NNN, assigned manually, never derived from name, never changes
- slug: URL only

## Deploy (Vercel)
1. Push to GitHub → Import in Vercel.
2. Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL
3. Deploy. Pages revalidate every 5 minutes after DB edits.

## Change the look
Colors: CSS variables at the top of app/globals.css. Fonts: app/layout.tsx.
