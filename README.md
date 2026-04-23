# Psycho Compass

> Discover your psychological archetype through color, shape, and instinct, then see where you land in a living map of minds.

Psycho Compass is a browser-based psychographic profiling experience. Users answer 20 rapid-fire questions, get placed into an archetype cluster, and can now sign in with Google or email/password to keep a persistent session archive in Supabase.

---

## Features

- **Instinct-based quiz**: 20 timed questions per session designed to reduce overthinking
- **Psychographic clustering**: answers are mapped into feature dimensions and assigned to an archetype
- **Interactive compound-eye map**: users are placed among simulated bot minds on a visual constellation
- **Account support**: sign in with Google or register with email/password
- **Tracked session archive**: signed-in users can save and revisit their prior sessions
- **Guest mode**: anonymous visitors can still take the quiz and explore the visualization
- **Supabase-backed persistence**: session saves and account history are stored in Supabase

---

## Running Locally

Serve the folder with a local web server:

```bash
cd psycho-compass
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

`index.html` redirects to `psycho-compass.html`, which is the main app entrypoint.

---

## Supabase Setup

The app currently uses a public Supabase URL and anon key directly in the frontend. To enable account-linked session tracking, you need:

1. A `sessions` table in Supabase
2. The `user_id` auth linkage and RLS policies from [supabase-sessions-policy.sql](/home/nandu/projects/psycho-compass/supabase-sessions-policy.sql)
3. Google auth enabled in Supabase if you want Google sign-in
4. Your local and production URLs added in `Auth > URL Configuration`

Run the SQL in `supabase-sessions-policy.sql` inside the Supabase SQL Editor.

That migration:

- adds `user_id uuid references auth.users(id)` to `public.sessions`
- creates an index for user history lookups
- allows guest inserts with `user_id is null`
- allows authenticated users to insert and read only their own sessions

If you are using Google OAuth, also configure:

- `Auth > Providers > Google`
- `Auth > URL Configuration > Site URL`
- `Auth > URL Configuration > Redirect URLs`

Typical redirect URLs:

- `http://localhost:8080`
- your Vercel production URL

---

## Deployment

The project is designed to work well with Vercel as a static deployment:

1. Push changes to GitHub
2. Let Vercel redeploy automatically from the connected branch
3. Make sure the same Supabase project and auth redirect URLs are configured for the deployed domain

If auth works locally but not on Vercel, the most common cause is missing redirect URLs in Supabase.

---

## Project Structure

```text
psycho-compass/
├── index.html                    # Redirects the root route to psycho-compass.html
├── psycho-compass.html           # Main app: UI, auth, quiz flow, save logic, map rendering
├── app.js                        # Secondary app logic file kept in repo
├── engine.js                     # Shared engine helpers for question generation and clustering
├── data.js                       # Data source file from the earlier app structure
├── styles.css                    # Earlier external stylesheet from the original app structure
├── supabase-sessions-policy.sql  # Supabase migration and RLS policies for account-linked sessions
└── README.md
```

---

## How It Works

1. **Auth**: users can continue as guests, sign in with Google, or register/sign in with email/password
2. **Quiz**: each session asks 20 questions sampled from the larger prompt pool
3. **Scoring**: answers are converted into four feature dimensions
4. **Clustering**: the user is assigned to the nearest archetype profile
5. **Visualization**: the result is plotted among simulated bot nodes on the compound-eye map
6. **Persistence**: guest sessions can still save as anonymous records, while signed-in users save rows linked to `user_id`
7. **Archive**: signed-in users can load their prior sessions from Supabase in the sidebar

---

## Notes

- The current production app logic lives inline inside `psycho-compass.html`
- `app.js`, `data.js`, and `styles.css` remain in the repo from the earlier split-file structure
- If session saves fail, check Supabase RLS policies first

---

## License

MIT
