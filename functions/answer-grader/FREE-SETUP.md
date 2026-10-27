# Free-only AI grading (pending live validation)

This branch replaces paid OpenAI calls with three optional server-side adapters. No account or API key is created by this change. No actual provider evaluation has passed yet.

## Server variables

- `CLOUDFLARE_API_TOKEN`: secret, scoped to Workers AI only.
- `CLOUDFLARE_ACCOUNT_ID`: account identifier (not secret).
- `CLOUDFLARE_FREE_PLAN_CONFIRMED=true`: enable only after verifying Workers Free and no paid billing. A later upgrade requires rechecking this flag.
- `CLOUDFLARE_FREE_MODEL`: optional; defaults to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Only that model and `@cf/meta/llama-3.1-8b-instruct-fp8-fast` are allowed. They share the same daily free neuron budget.

- `GROQ_API_KEY`: secret, set only in the Appwrite Function.
- `GROQ_FREE_PLAN_CONFIRMED=true`: enable only after verifying the account remains on Groq Free, with no payment method or upgrade. The application cannot inspect or enforce a provider account's billing tier. Recheck before any billing change.
- `OPENROUTER_API_KEY`: secret, set only in the Function.
- `OPENROUTER_FREE_MODEL`: a specifically tested model ID ending `:free`. There is no default model or paid fallback. Requests additionally constrain prompt/completion prices to zero and disallow provider fallbacks.

Cloudflare is tried first, Groq second, OpenRouter third. At most three provider calls, each with an 8-second timeout. Both exhausted/unconfigured means unavailable, never an invented grade. Model IDs and endpoint configuration cannot come from the browser. Only authenticated Appwrite executions are accepted; keep public/domain execution disabled and execute permission `users` only.

The short-lived cache is isolated per user, limited to 200 results and 10 minutes, and only shared within a running Function instance. It does not provide durable, cross-instance identical answers. Existing in-memory rate limits likewise are per instance.

All providers receive identical controlled reference data, prompts and output requirements. This does not guarantee equivalent semantic judgment. Existing references do not yet contain independent criterion IDs and weights, so this branch does not invent numeric scores or claim deterministic rubric scoring. No change to the adaptive difficulty engine.

## Required live checks before enabling

1. Complete the provider's account/terms steps, verify Free status and exact dashboard quota. Store secrets directly in Appwrite without sharing them in chat, screenshots or GitHub.
2. Redeploy the Function with environment variables present.
3. With an authenticated application account, test `seminar` and `seminar_case`: correct, partial, incorrect, critical-error and ambiguous examples, as well as exhausted quota. Verify anonymous rejection.
4. Calibrate each selected model against reviewed examples before public use. No scientific/clinical approval is claimed.
5. Confirm the frontend service worker fetches the changed client asset before release to devices.

Automated tests: `node --test functions/answer-grader/test.mjs` (12 passing mocked tests; not a live provider test).

Official API references checked 2026-10-27:
- https://console.groq.com/docs/openai
- https://console.groq.com/docs/rate-limits
- https://openrouter.ai/docs/api_reference/overview
- https://openrouter.ai/docs/guides/routing/provider-selection

Other providers apart from Cloudflare, Groq and OpenRouter from the research report are not integrated or enabled by this branch. Add only after account, free quota, API compatibility and grading-quality validation.

Cloudflare compatibility: https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
