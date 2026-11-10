# Free-only AI grading

The Function has three optional server-side adapters (Cloudflare, OpenRouter, and Gemini); Groq is disabled. OpenRouter has passed live authenticated grading tests. Cloudflare and Gemini require independent live tests before they are described as active. Gemini is disabled unless its free-tier flag is explicitly confirmed.

## Server variables

- `CLOUDFLARE_API_TOKEN`: secret, scoped to Workers AI only.
- `CLOUDFLARE_ACCOUNT_ID`: account identifier (not secret).
- `CLOUDFLARE_FREE_PLAN_CONFIRMED=true`: enable only after verifying Workers Free and no paid billing. A later upgrade requires rechecking this flag.
- `CLOUDFLARE_FREE_MODEL`: optional; defaults to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Allowed alternatives are `@cf/meta/llama-3.1-8b-instruct-fp8-fast`, `@cf/zai-org/glm-4.7-flash`, `@cf/google/gemma-4-26b-a4b-it`, and `@cf/nvidia/nemotron-3-120b-a12b`. They share the same daily free neuron budget. Test any selected model with the grading schema before activation.

- `GEMINI_API_KEY`: secret, rotate any previously exposed key.\n- `GEMINI_FREE_PLAN_CONFIRMED=true`: enable only after confirming the Google AI Studio project is on a free API tier, with billing/limits checked. Without this exact flag Gemini remains disabled.\n- `GEMINI_FREE_MODEL`: optional; defaults to `gemini-2.5-flash-lite`; allowlisted alternative `gemini-2.5-flash`. Verify current free-tier eligibility and quotas before enabling.\n\n- `GROQ_API_KEY`: unused. The Free account exposes Qwen 3.8 as a Preview model intended for evaluation only; other available production models are OpenAI-branded and excluded by the user's constraint.
- `OPENROUTER_API_KEY`: secret, set only in the Function.
- `OPENROUTER_FREE_MODEL`: the allowlisted Google Gemma model `google/gemma-4-31b-it:free`. There is no default model or paid fallback. Requests additionally constrain prompt/completion prices to zero and disallow provider fallbacks.

Cloudflare is tried first, OpenRouter second, Gemini third (only if explicitly enabled). Each has a 12-second timeout. All exhausted/unconfigured means unavailable, never an invented grade. Model IDs and endpoint configuration cannot come from the browser. Only authenticated Appwrite executions are accepted; keep public/domain execution disabled and execute permission `users` only.

The short-lived cache is isolated per user, limited to 200 results and 10 minutes, and only shared within a running Function instance. It does not provide durable, cross-instance identical answers. Existing in-memory rate limits likewise are per instance.

All providers receive identical controlled reference data, prompts and output requirements. This does not guarantee equivalent semantic judgment. Existing references do not yet contain independent criterion IDs and weights, so this branch does not invent numeric scores or claim deterministic rubric scoring. No change to the adaptive difficulty engine.

## Required live checks before enabling

1. Complete the provider's account/terms steps, verify Free status and exact dashboard quota. Store secrets directly in Appwrite without sharing them in chat, screenshots or GitHub.
2. Redeploy the Function with environment variables present.
3. With an authenticated application account, test `seminar` and `seminar_case`: correct, partial, incorrect, critical-error and ambiguous examples, as well as exhausted quota. Verify anonymous rejection.
4. Calibrate each selected model against reviewed examples before public use. No scientific/clinical approval is claimed.
5. Confirm the frontend service worker fetches the changed client asset before release to devices.

Automated tests: `node --test functions/answer-grader/test.mjs` (mocked tests; only OpenRouter has a live provider test so far).

Official API references checked 2026-10-27:
- https://console.groq.com/docs/openai
- https://console.groq.com/docs/rate-limits
- https://openrouter.ai/docs/api_reference/overview
- https://openrouter.ai/docs/guides/routing/provider-selection

Other providers apart from Cloudflare, Gemini, Groq and OpenRouter from the research report are not integrated or enabled by this branch. Add only after account, free quota, API compatibility and grading-quality validation.

Cloudflare compatibility: https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/

User constraint: no OpenAI models, no personal ChatGPT integration. OpenAI-branded models are rejected even through intermediaries. The OpenRouter adapter accepts only explicit Gemma/NVIDIA free models and excludes the OpenAI provider. Existing OPENAI_API_KEY is ignored by this code. Groq remains disabled.

## Live verification 2026-10-27

OpenRouter secret saved in Appwrite and never displayed. Google Gemma free returned HTTP 429. The current configured model is `nvidia/nemotron-3.5-super-vl:free`, also on the explicit allowlist, with zero-price constraints. Real console seminar request returned 200. Authenticated application tests passed for seminar_case, ambiguous seminar answer (uncertain and no grade), and its corrected seminar answer (correct). Function re-enabled with non-OpenAI code. These are integration checks, not broad medical/linguistic model calibration. Cloudflare token and other provider accounts remain pending user completion. No OpenAI API or personal ChatGPT subscription used.

## Gemini integration (2026-10-28)

Gemini native generateContent API adapter added behind `GEMINI_FREE_PLAN_CONFIRMED=true`. Uses `responseMimeType=application/json` and requires finishReason STOP; the existing server-side grade schema validator remains mandatory. No key is exposed to the browser. This is code integration only: **no live Gemini request or free-tier/billing validation has been performed**. Rotate the Gemini key previously shown in a screenshot before enabling. Existing deployment requires redeployment after code changes.
