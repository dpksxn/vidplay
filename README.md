# vidplay

Turn a real-world photo into a short video using a text prompt.
Upload an image, describe what should happen, and an AI image-to-video model
brings it to life.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase
(auth + storage + Postgres) · Replicate (Kling v1.6 image-to-video).

---

## Features

- Email/password auth (Supabase)
- Drag-and-drop photo upload (JPG/PNG/WebP, ≤8 MB)
- Prompt + duration (5s/10s) + aspect ratio (16:9, 9:16, 1:1)
- Async generation with live polling and webhook fallback
- History page with per-user RLS isolation
- Inline player and one-click download

---

## Setup

### 1. Clone & install

```bash
nvm use 18           # Node 18.17+ required
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at <https://supabase.com>.
2. **Project Settings → API** — copy URL, `anon` key, and `service_role` key into `.env.local`.
3. **SQL editor** — paste the contents of [supabase/schema.sql](supabase/schema.sql) and run.
   This creates the `generations` table, RLS policies, and the `inputs` /
   `videos` storage buckets.
4. **Authentication → Providers → Email** — enable. For local dev, you can
   disable email confirmation under *Authentication → Settings*.

### 3. Replicate

1. Get a token at <https://replicate.com/account/api-tokens>.
2. Set `REPLICATE_API_TOKEN` in `.env.local`.
3. Generate a webhook secret:

   ```bash
   openssl rand -hex 32
   ```

   Set as `REPLICATE_WEBHOOK_SECRET`. (Optional in dev — the app polls
   Replicate directly if no webhook is configured.)

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

Sign up, upload a photo, write a prompt — that's it.

---

## Production webhook

When deployed (e.g. Vercel), set `NEXT_PUBLIC_APP_URL` to your public URL.
Replicate will POST completion events to
`/api/replicate-webhook?secret=…&id=…` and the UI updates instantly without
polling Replicate from the client.

---

## Swapping the model

The image-to-video model is configured in [src/lib/replicate.ts](src/lib/replicate.ts):

```ts
export const IMAGE_TO_VIDEO_MODEL = "kwaivgi/kling-v1.6-standard";
```

Other options on Replicate:
- `kwaivgi/kling-v1.6-pro` — higher quality, more expensive
- `minimax/video-01` — strong character consistency
- `stability-ai/stable-video-diffusion` — open weights, cheaper

Check each model's input schema and update `buildModelInput()` accordingly.

---

## Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/         # POST → start job, GET /[id] → poll
│   │   └── replicate-webhook/
│   ├── g/[id]/               # single-generation viewer
│   ├── history/              # list of all user generations
│   ├── login/
│   └── page.tsx              # upload + prompt form
├── components/
│   ├── GenerateForm.tsx
│   ├── GenerationView.tsx
│   ├── Header.tsx
│   └── SignOutButton.tsx
├── lib/
│   ├── replicate.ts
│   ├── supabase/             # browser, server, admin clients
│   ├── types.ts
│   └── utils.ts
└── middleware.ts             # auth gate
supabase/schema.sql           # DB + storage + RLS
```

---

## Cost note

Kling v1.6 standard on Replicate is roughly **$0.05–0.10 per 5-second
clip**. Set up [Replicate spend limits](https://replicate.com/account/billing)
before opening to users.
