# Email QC MVP

Email QC automates quality control for Braze marketing emails. Paste a Braze preview URL, attach the approved copy doc, pick the silo and entity, and the app validates the send with AI, rule matrices, and link checks.

## Features
- GPT-4.1 Responses API validates subject, preheader, body copy, CTAs, disclaimers, and keyword-triggered statements using a strict JSON schema.
- Entity/silo risk, keyword, and additional rules imported from CSV; disclaimers are managed directly in Postgres via the admin console.
- Link checker follows redirects (HEAD / GET with fallback), flags dev/staging hosts, and records status codes plus final destinations.
- Report pages show per-check results, link tables, downloadable CSV exports, and client-side PDF generation with `html2canvas` + `jspdf`.
- Admin rules console surfaces live data, supports inline disclaimer editing, and accepts CSV uploads for the remaining rule tables.

## Stack
- Next.js 14 App Router (TypeScript, Tailwind)
- Prisma ORM + PostgreSQL (Railway recommended)
- OpenAI GPT-4.1 Responses API
- Axios, Cheerio, p-limit, json2csv, html2canvas, jspdf, mammoth

## Prerequisites
- Node.js 18+
- npm
- PostgreSQL database (Railway or local)
- OpenAI API key with access to `gpt-4.1`

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local` (sample created at repo root):
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>?schema=public"
   OPENAI_API_KEY=""
   ALLOWED_PREVIEW_HOSTS="braze-02-shareable-preview-eu.s3.eu-central-1.amazonaws.com"
   APPROVED_LINK_DOMAINS="tradu.com,app.tradu.com,braze-02-shareable-preview-eu.s3.eu-central-1.amazonaws.com"
   ```
3. Generate Prisma client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. Optionally seed the baseline disclaimer matrix:
   ```bash
   npx prisma db seed
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000` and run a QC job via **New QC**. Use `/admin/rules` to manage disclaimers and import CSVs before running production checks.

## Rule CSV Templates
Seed templates live under `data/` and match the required headers:
- `data/risk_rules.csv`
- `data/keyword_rules.csv`
- `data/additional_rules.csv`

Upload these from the Admin page to refresh the non-disclaimer rule tables. Disclaimers (including the risk warnings above) are managed directly in the UI and can be filtered per entity and silo.

## API Overview
- `POST /api/qc-runs` – create a QC job (rate-limited by IP). Fetches Braze HTML, parses content, runs GPT evaluation, checks links, and persists results.
- `GET /api/qc-runs` – list runs with optional `silo`, `entity`, `from`, `to`, `page`, `pageSize` filters.
- `GET /api/qc-runs/:id` – retrieve a run with checks and link data.
- `GET /api/qc-runs/:id/export.csv` – download CSV export for a run.
- `GET /api/qc-runs/:id/export.pdf` – HTML rendition suitable for PDF download.
- `POST /api/rules/import` – multipart CSV import for risk, keyword, and additional rule tables (upsert via deterministic IDs).
- `GET /api/disclaimers` – list stored disclaimers.
- `POST /api/disclaimers` – create a new disclaimer.
- `PUT /api/disclaimers/:id` – update an existing disclaimer.

All routes are deployed as Vercel Functions (`runtime = nodejs`).

## Link Checking Rules
- Concurrency limited to 6 via `p-limit`.
- Rejects hosts containing `wwwd`, `dev`, or `staging`.
- Follows redirects up to five hops (HEAD first, GET fallback).
- Accepts final 2xx or redirects into `APPROVED_LINK_DOMAINS`.
- Returns structured notes for invalid URLs, dev domains, or HTTP errors.

## Deployment
1. **Railway (Postgres)**
   - Provision a PostgreSQL instance and capture the connection string.
   - Run `npx prisma migrate deploy` against the Railway database.
2. **Vercel**
   - Import the repo, set the four environment variables (`DATABASE_URL`, `OPENAI_API_KEY`, `ALLOWED_PREVIEW_HOSTS`, `APPROVED_LINK_DOMAINS`).
   - Ensure the project has egress to Braze preview URLs.
   - Deploy; all API routes run on the Node.js runtime.

## Notes
- `POST /api/qc-runs` includes an in-memory rate limiter (5 requests / 5 minutes per IP) suitable for MVP. Scale with a shared cache in production.
- The document upload flow converts `.docx` copy docs to text client-side via `mammoth`.
- `openai` Responses API output is parsed from `response.output_text` and stored verbatim as JSON in `CheckResult.details`.

For further enhancements, consider adding background job processing, audit trails, richer analytics on rule coverage, and integration tests around link and GPT flows.
