# Muzyng

Muzyng is a social music-listening app in progress. Phase 2 adds email/password authentication and basic user profiles while preserving the Audius player from Phase 1.

**Live App:** [https://muzyng.vercel.app/](https://muzyng.vercel.app/)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app loads a real Audius track on startup. Use the play button, progress bar, volume control, and **Load another** action to test the player.

## Environment

Fill the existing `.env.local` values from Supabase project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=https://muzyng.vercel.app
```

`AUDIUS_API_BASE_URL` defaults to `https://api.audius.co/v1` and `AUDIUS_APP_NAME` defaults to `muzyng`. No service-role key is used or exposed.

For the Vercel Production environment, set `NEXT_PUBLIC_SITE_URL` to `https://muzyng.vercel.app` and redeploy. Password reset emails return to `https://muzyng.vercel.app/reset-password`. The app uses that production URL as a safe fallback when the variable is missing, so auth emails never derive their redirect from the browser origin.

## Supabase setup

Run `supabase/migrations/001_create_profiles.sql` in the hosted Supabase SQL editor. It creates the `profiles` table, the unique normalized username constraint, timestamps, RLS policies, and the signup trigger that creates a profile automatically from `auth.users` metadata.

The app provides `/signup` and `/login`, persists the Supabase session in the browser, refreshes auth cookies through `proxy.ts`, and displays the signed-in username on the home page.

## Audius endpoints

- `GET /v1/tracks/trending?limit=10&app_name=muzyng` for track metadata
- `GET /v1/tracks/{track_id}/stream?app_name=muzyng` for the native audio stream

The server route filters unavailable and non-streamable tracks, supplies metadata fallbacks, and reports Audius/network failures to the player.