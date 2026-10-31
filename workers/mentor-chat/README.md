# MENTOR chat Worker

Grounded, educational Greek answers through Cloudflare Workers AI. **Disabled by default**; the site ships with `mentor/ai/config.mjs` → `endpoint: ""`, so no AI request is made.

## What the owner must do (human steps)
1. Cloudflare account on the **Workers Free** plan; confirm no paid billing is attached.
2. `cd workers/mentor-chat && npx wrangler deploy`.
3. Set `MENTOR_FREE_PLAN_CONFIRMED` to `true` in the Worker variables **only after** step 1 is verified. (Optional: `MENTOR_MODEL` from the allowlist in `src/index.js`, `DAILY_CAP`, `ALLOW_LOCAL=true` for local tests.)
4. Put the Worker URL in `mentor/ai/config.mjs` (`endpoint`).
5. Test Greek answer quality against reviewed questions before public use, and update the "no new AI connection" rule in `mentor/README.md`.

## Safeguards
- Origin allowlist (GitHub Pages origin; localhost only with `ALLOW_LOCAL`).
- Answers only from up to four cited library passages; no passages → no AI call.
- 20 requests/hour per IP and a daily cap (in-memory per isolate: best-effort, not a hard billing guarantee; the free plan itself stops at its own neuron quota).
- Allowlisted free models only; no keys, no paid fallback, no arbitrary URLs.
- 429 is surfaced to the learner as a "free limit reached" notice.

Free-tier quotas and Greek quality are **not verified** here. Test: `node --test workers/mentor-chat/*.test.mjs`.

## Claude (Anthropic) provider — private test mode, OFF by default
A GitHub Actions secret **cannot** be read by a web page or by GitHub Pages, so the key lives only in this Worker as an encrypted secret. Code: `mentor/ai/claude-adapter.mjs` (request/stream), `mentor/ai/guard.mjs` (access + budget), wired in `src/index.js`. The site's `mentor/ai/config.mjs` endpoint is still `""`.

Claude is called only when **all** hold: `MENTOR_PROVIDER=claude`, `MENTOR_CLAUDE_ENABLED=true`, `MENTOR_SPEND_LIMIT_CONFIRMED=true` (set only after you set a spend limit in the Anthropic console), the `ANTHROPIC_API_KEY` secret, and the `BUDGET` Durable Object. Otherwise the answer is 503 and no request leaves the Worker.

Safeguards: private by default (`x-mentor-test-token` must equal the `MENTOR_TEST_TOKEN` secret, ≥16 chars, until `MENTOR_PUBLIC=true`); origin allowlist; only `claude-haiku-5-5`; output ≤ 400 tokens and input ≤ 4000 chars (hard-coded ceilings); persistent per-IP/hour, per-day request and per-day token counters (defaults 10 / 50 / 60 000, with hard maximums 60 / 500 / 400 000) — a reserved estimate is charged before each call and the Worker fails closed without the store; no passages → no call; upstream error bodies are never forwarded; nothing is logged.

Owner steps: (1) Anthropic console: set a monthly spend limit. (2) Repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, optionally `MENTOR_TEST_TOKEN`. (3) Actions → "Claude API connection test (manual)" (empty input = dry run; `YES` = one 16-token call). (4) Actions → "Deploy MENTOR chat Worker (manual)" with `push_secrets`. (5) Edit the vars in `wrangler.jsonc` to enable, redeploy, put the Worker URL in `mentor/ai/config.mjs`, and in your browser run `sessionStorage.setItem("ekab.mentor.ai.token","<token>")`.