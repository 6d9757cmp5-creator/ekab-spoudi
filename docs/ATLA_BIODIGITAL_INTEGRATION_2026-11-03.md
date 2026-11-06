# ATLA · BioDigital opt-in Viewer integration (2026-11-03)

## Verified supplementary features — 2026-11-04

The existing ATLA Anatomy Lab remains the primary anatomy engine and keeps its independent BodyParts3D/HRA models and quiz. The optional existing BioDigital Studio now uses documented Human API messages and complements, rather than replaces, ATLA:

- Official MIT Human API RPC client v3.0.0 and its MIT license were copied **byte-for-byte** from `biodigital-inc/human-ios-sdk` into the pre-existing `tools/anatomy-3d/vendor/`. Verified Git blob SHAs: client `d6539d90fd77d594a358acdcd423de2a0fd50464`, license `04f4f423fa3a3d43e53b06f511c237e0755db3a7`.
- Valid commands: `camera.orbit`, `camera.reset`, `scene.enableXray`/`scene.disableXray`, `labels.show`/`labels.hide`, `timeline.play`/`timeline.pause`/`timeline.nextChapter`/`timeline.previousChapter`, `quiz.enter`/`quiz.exit`.
- Only a provider-selected anatomical object may be isolated: first capture the current scene (`scene.capture`), then `scene.showObjects` with an allowlisted picked object ID, and restore prior state with `scene.restore`. Changing tour chapter discards stale scene snapshots.
- Provider-hosted quiz completion is shown as informational score only. It never writes to ATLA/EOPPEP learning progress and does not impersonate clinical validation.
- Commands stay unavailable until the provider's `human.ready`; chapter actions require a chapter timeline, and isolation requires a valid picked anatomy object.
- Not yet demonstrated end-to-end against an authorized live BioDigital published model; without such a model URL, source/API wiring tests do not prove successful 3D rendering. Do **not** state a completed clinical or production integration.

**Original export package:** No complete raw human-body mesh, texture, animation, authored tour/quiz source or proprietary engine source package has been supplied through the connected systems inspected. The owner's assertion of licensing rights is recorded, but rights are distinct from technical delivery. The SDK binaries in public `HumanKit` and `human-android-sdk` repositories do not by themselves constitute modifiable source or a complete model archive. No model extraction, scraping, decompilation or reverse engineering was performed.

## Real implementation
- Open `tools/anatomy-3d/biodigital-bridge.html` from Anatomy Lab navigation.
- Use independent ATLA 3D anatomy focus routes for heart, brain, lung, kidney, stomach, skull. The existing ATLA 3D quiz and its safety/score rules are reused.
- For BioDigital content, **explicitly paste an authorized Publish URL** from `https://human.biodigital.com/viewer/` or `/widget/` containing `id`, `m`, or `be`. The user explicitly starts the external viewer; otherwise no provider network request occurs.
- The official MIT Human Viewer API v3 JavaScript client is pinned in the existing vendor directory with license text. Documented commands provide orbit, reset, labels, X-ray, selection/isolation, tour controls and quizzes when the active published model supports them.
- Built-in BioDigital quizzes remain within the provider Viewer when that model and entitlement offer them; we do not fabricate quiz data or API permissions.
- No API credentials, private keys, source-engine files, provider 3D geometry, or provider textures are stored in this public repository. Published viewer URLs are not saved to browser storage.
- This is **not** a local clone or offline redistribution of BioDigital and is not yet a production API entitlement validation. It is a real working integration surface, conditional on provider access and model URL.

## Security and product constraints
- URL input strictly validates HTTPS, exact BioDigital host, provider /viewer or /widget path and published model identifier. No arbitrary iframe origin or user-supplied HTML.
- Widget commands are allowlisted; controls remain disabled until `human.ready`.
- Client-side public Viewer API only. OAuth2 client secret access to the Content API requires a separately secured server-side service, not GitHub Pages JavaScript.
- All original ATLA Anatomy Lab files, lessons, learner progress, video gates and Clinical Cockpit are left unchanged except for one optional navigation link.
- Vendor official terms govern assets and engine: `https://www.biodigital.com/terms`. Explicit contracts can grant additional rights, but **this integration does not attempt extraction or reverse engineering**.
- MIT example repositories: `https://github.com/biodigital-inc/bdhuman-contentapi` and `https://github.com/biodigital-inc/human-ios-sdk`. These are not the proprietary engine and are not needed for browser integration. The MIT HumanAPI client is now imported verbatim; no proprietary engine or 3D model source is imported.
- Vendor developer documentation: `https://developer.biodigital.com/`; official examples of controls: `https://codepen.io/biodigital/pen/qweNBg`.
- Test with `node --test tools/anatomy-3d/biodigital-bridge.test.mjs`. Browser acceptance with an actual licensed published model, authenticated Developer API key, and clinical QA must be documented separately.

## Planned licensed asset pipeline
If a separate BioDigital agreement actually allows raw 3D asset download, derivative animation and redistribution, obtain **the authorized export package** or technical handoff from the vendor. For each asset log original identifier, permission, version, hashes, terms, GLB/GLTF conversion, anatomy QA, and performance evidence. Do not scrape remote network traffic or copy 3D cache binaries. Do not mix the third-party engine into the original ATLA viewer or assume viewer API means source access.
