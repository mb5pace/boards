# Supabase authentication setup

The default Boards page now requires a Supabase session and supports Google OAuth, email/password sign-in, email/password account creation, and password reset. The workspace data itself is still local to the browser; authentication does not yet sync bookmarks between devices.

## 1. Configure Vercel environment variables

In the Vercel project for Boards, add these variables for the branch preview and the environments where you want auth enabled:

- `VITE_SUPABASE_URL`: the Project URL from Supabase Project Settings → API.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the project's **publishable** key (starts with `sb_publishable_`) from Supabase Project Settings → API Keys.

Redeploy after changing environment variables. For local development, copy `.env.example` to `.env.local` and fill in your values. Never use a Supabase `service_role` or secret key in a `VITE_*` variable.

## 2. Enable email authentication

In Supabase Dashboard → Authentication → Sign In / Providers, enable Email. Configure email confirmation and SMTP according to your desired production policy. When confirmation is enabled, new users need to confirm the link sent to their inbox before they can sign in.

## 3. Enable Google OAuth

1. In Google Cloud Console, create an OAuth client ID for a **Web application** and configure its consent screen.
2. In Supabase Dashboard → Authentication → Sign In / Providers → Google, enable Google and enter the Google Client ID and Client Secret.
3. Copy the Supabase callback URL shown in that provider page into the Google OAuth client's **Authorized redirect URIs**.
4. In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to the canonical Boards deployment and add redirect URLs for local development and Vercel preview deployments. For local development, allow `http://localhost:5173/**`; for Vercel previews, use the appropriate Vercel wildcard documented by Supabase. Prefer the exact production URL for production.

The app redirects back to the current origin after OAuth and email confirmation, so that origin must be on the Supabase redirect allow list.

## 4. Test the preview

- Visit the root URL of the `feature/authentication-testing` Vercel deployment.
- Try Google sign-in and email sign-in.
- Try creating a new account and follow the confirmation email if confirmation is enabled.
- Test password reset, sign-out, and refreshing the page while signed in.

Until the two environment variables and provider settings are configured, the root page intentionally shows a setup notice and disables auth actions rather than pretending a mock login is real.
