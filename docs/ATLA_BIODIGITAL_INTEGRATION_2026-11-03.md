# ATLA · BioDigital opt-in Viewer integration (2026-11-03)

## Real implementation
- Open `tools/anatomy-3d/biodigital-bridge.html` from Anatomy Lab navigation.
- Use independent ATLA 3D anatomy focus routes for heart, brain, lung, kidney, stomach, skull. The existing ATLA 3D quiz and its safety/score rules are reused.
- For BioDigital content, **explicitly paste an authorized Publish URL** from `https://human.biodigital.com/viewer/` or `/widget/` containing `id`, `m`, or `be`. The user explicitly starts the external viewer; otherwise no provider network request occurs.
- The official Human Viewer API v3 JavaScript, served by BioDigital and **not vendored or copied**, enables: orbit, camera reset, labels, X-ray, dissection mode, and guided-tour chapter navigation when supported by the loaded model.
- Built-in BioDigital quizzes remain within the provider Viewer when that model and entitlement offer them; we do not fabricate quiz data or API permissions.
- No API credentials, private keys, source-engine files, provider 3D geometry, or provider textures are stored in this public repository. Published viewer URLs are not saved to browser storage.
- This is **not** a local clone or offline redistribution of BioDigital and is not yet a production API entitlement validation. It is a real working integration surface, conditional on provider access and model URL.

## Security and product constraints
- URL input strictly validates HTTPS, exact BioDigital host, provider /viewer or /widget path and published model identifier. No arbitrary iframe origin or user-supplied HTML.
- Widget commands are allowlisted; controls remain disabled until `human.ready`.
- Client-side public Viewer API only. OAuth2 client secret access to the Content API requires a separately secured server-side service, not GitHub Pages JavaScript.
- All original ATLA Anatomy Lab files, lessons, learner progress, video gates and Clinical Cockpit are left unchanged except for one optional navigation link.
- Vendor official terms govern assets and engine: `https://www.biodigital.com/terms`. Explicit contracts can grant additional rights, but **this integration does not attempt extraction or reverse engineering**.
- MIT example repositories: `https://github.com/biodigital-inc/bdhuman-contentapi` and `https://github.com/biodigital-inc/human-ios-sdk`. These are not the proprietary engine and are not needed for browser integration. No vendor source imported.
- Vendor developer documentation: `https://developer.biodigital.com/`; official examples of controls: `https://codepen.io/biodigital/pen/qweNBg`.
- Test with `node --test tools/anatomy-3d/biodigital-bridge.test.mjs`. Browser acceptance with an actual licensed published model, authenticated Developer API key, and clinical QA must be documented separately.

## Planned licensed asset pipeline
If a separate BioDigital agreement actually allows raw 3D asset download, derivative animation and redistribution, obtain **the authorized export package** or technical handoff from the vendor. For each asset log original identifier, permission, version, hashes, terms, GLB/GLTF conversion, anatomy QA, and performance evidence. Do not scrape remote network traffic or copy 3D cache binaries. Do not mix the third-party engine into the original ATLA viewer or assume viewer API means source access.
