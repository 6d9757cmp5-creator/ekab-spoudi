# ATLA patient simulator · locally vendored CC0 road material

Asset: **Asphalt 03** · photographs by **Charlotte Baglioni**, processing by **Dario Barresi**.

- Authoritative source and license: https://polyhaven.com/a/asphalt_03 (site explicitly marks asset as **CC0**, checked 2026-11-09).
- License text: https://polyhaven.com/license · CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/
- Original source asset scale: ~2 m width. Color, OpenGL normal and roughness are all separate PBR maps; normal-map name in intermediate repo is \`normal\`.
- Acquisition: on 2026-11-09 from the already-vendored *byte-for-byte* CC0 JPG maps in https://github.com/AetherRadar/operation-steel-tide/tree/main/assets/textures (its own https://github.com/AetherRadar/operation-steel-tide/blob/main/assets/textures/LICENSE.md confirms upstream creator and CC0). **No non-CC0 project scene, logo, character, environment, or other source code was copied.**
- Copied exactly at the Git blob level, confirmed source blob SHA equals destination blob SHA, using GitHub repository content and blob APIs:

| Local file | Upstream file | Git blob SHA-1 (source = destination) |
|---|---|---|
| \`asphalt_03_diff_1k.jpg\` | \`asphalt_03_diff_1k.jpg\` | \`0fdf658ddce99df781a96e4050f29a7fb8fadedd\` |
| \`asphalt_03_normal_1k.jpg\` | \`asphalt_03_normal_1k.jpg\` | \`89288d49c6a41ca13f53b88081d7ad023e0ec20c\` |
| \`asphalt_03_rough_1k.jpg\` | \`asphalt_03_rough_1k.jpg\` | \`b76380ace59b4933664068833caded3c3de7654c\` |

**Usage:** Only \`tools/patient-simulator/app/unified-stage.mjs\` in the canonical *local* WebGL renderer. Loaded relative to the local ESM script; no external CDN requests, vendor iframe, or outside viewer. Each map is 1K; repeat 11×2 tiles across approximately 23×4.4 m synthetic road, normalized for ~2m PBR scale. Gracefully keeps the original lightweight procedural ground if one or more assets cannot load. Files are part of the application's service-worker pre-cache.

**Limits:** The CC0 texture is photo-based asphalt, not clinically relevant anatomy or a validated accident location. The simulator remains a **synthetic educational prototype**, not a photorealistic medical training platform. No third-party branding or claims of Poly Haven affiliation. **Independent content/media gate** must still be respected where applicable.
