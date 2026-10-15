# REMO Study Space customer support

The existing `contact.html` is the customer-support page. Main navigation and the Study Space landing page link to it. Static HTML, CSS and JavaScript call `POST /api/support`; the API runs on Node 24 in Vercel.

## Configuration

- `GEMINI_API_KEY`: Production **Secret**, supplied by the owner directly in Vercel. The server explicitly passes this variable to `createGoogle`; the provider's default variable name is not used.
- `GEMINI_MODEL`: Production **Config**, `gemini-3.5-flash-lite`. No fallback model, AI Gateway, Google Search grounding, embeddings service or paid upgrade is enabled by this code. Free-tier eligibility/quota and any billing depend on the owner's Google project; Vercel hosting and Neon have their own limits.
- Existing `DATABASE_URL` and `REMO_ADMIN_PASSWORD` provide the shared database and HMAC key for request counters. No administrator password or customer records are passed to Gemini.
- Old `OPENAI_MODEL` is unused. This release has no OpenAI provider dependency or request.

Changing environment variables requires a new production deployment. Do not copy Secrets into `.env.example`, the static build, Git, logs or release archives.

## Retrieval and grounding

`support-source.json` is a server-only snapshot of the owner's reference Google Doc, captured on 2026-10-15. `support-rag.mjs` divides it into seven sections, retrieves relevant sections using BM25 with Korean n-grams and domain synonym expansion, then asks Gemini for a structured answer with valid section IDs. The server resolves IDs to a fixed source URL and excerpts. No-hit and sensitive-input notices do not invoke Gemini.

This is snapshot-based retrieval, not live Google Docs synchronization. To update: fetch the authorized reference document, refresh `text`, `modifiedAt`, and `ingestedAt` in the snapshot, verify headings and retrieval tests, then redeploy. The document is source material; embedded instructions never override the system instructions.

## Limits and privacy

- Max question/history message: 1,200 characters; max 7 alternating messages; JSON body <=32 KiB.
- 10 generation attempts per IP / 15 minutes; 200 generation attempts for the entire site / UTC day. Quota is reserved before generation, and failed provider attempts count. Database failure prevents generation. Counts use atomic upserts.
- Limits reuse `public.remo_reservation_limits` with distinct HMAC namespaces; existing daily cleanup deletes entries unused for 24 hours. No schema change is required.
- No chat transcripts in REMO's database or browser persistent storage. Counters contain only keyed IP digests and buckets/counts/timestamps. Existing reservations and administrator data are not read by the support flow.
- Recent messages and retrieved source text go to Google Gemini. Common email/key/cancellation-token patterns are blocked before transmission, but this is not comprehensive PII detection. User-facing notices explain not to enter personal or sensitive data and explain Google's free-tier data use.
- SDK automatic retries are disabled; provider timeout 25s; function limit 60s. Provider errors are reduced to allowlisted categories in logs, never raw request/error objects. The API never returns credentials, raw provider errors or arbitrary model-generated links.

## Validation and release

`pnpm test` builds only 31 allowlisted public assets and runs content, board, reservations and support tests. Support tests include real SDK serialization against a mocked Gemini HTTP transport, source selection and validation, cross-origin rejection, input limits, HMAC quotas and generic errors; they do not use a real API key.

After staging a production build, test one supported product question, an unrelated question and an unauthorized origin, then promote that exact build. Verify the customer-support menu and chatbot in a browser. The production status GET confirms configuration only; actual generation must be verified separately. The source checkout is `remo-study-space-release`; direct Vercel deployment does not synchronize GitHub.
