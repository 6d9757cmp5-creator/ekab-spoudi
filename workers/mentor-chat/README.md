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
