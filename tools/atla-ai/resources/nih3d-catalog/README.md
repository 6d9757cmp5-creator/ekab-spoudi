# NIH 3D — source-by-source licensing and anatomical training intake

**NIH 3D is NOT a single free-to-redistribute anatomical mesh dataset.** There are over 15,000 individual published, user-contributed models including molecules, lab devices and anatomical reconstructions. Entries have **their own creator-selected licenses**. Publication on NIH 3D or intended personal use does not grant authorization to copy every file into a public GitHub repository.

**Official source:** https://3d.nih.gov/discover
**Terms:** https://3d.nih.gov/terms (see §4.3)
**FAQs:** https://3d.nih.gov/faqs

## Processing boundaries

- Original per-entry model and submitted metadata are read from `https://3d.nih.gov/api/entries/{id}`, one accession per request, with bounded batch size and source error accounting.
- Only entries with **explicitly readable Public Domain, CC0 or CC BY** and a published submission qualify for file import. Other licenses, files without clear terms, restricted/unclear entries, and raw medical-image datasets are deliberately **not redistributed**.
- GLB and STL files are validated for type and size. Every imported model records source entry URL, author, exact source license string, attribution, output file URL, checksum, file size and non-clinical-validation status.
- `Anatomy` categorized models → `tools/anatomy-3d/resources/nih3d-approved/`.
- `Devices and Hardware` and `Prosthetics` → `tools/patient-simulator/resources/nih3d-approved/` for **educational inspection only**; these are not rigged patients or automatically installed simulation equipment.
- Other NIH categories (e.g. viruses, proteins, small molecules) → metadata can be catalogued in `tools/atla-ai/resources/nih3d-catalog/`, **not** unconditionally integrated into the 3D human anatomy or clinical simulator.

The scan is explicitly bounded: `node scripts/import-nih3d-license-reviewed.mjs --start=1 --end=250 --max-files=12 --max-mb=4`. It does **not** purport to import every model on the platform. Metadata batches and error counts remain inspectable. Avoid broad automated crawls that overwhelm the NIH server. To scan further segments or expand to a full project-scale catalog, first assess NIH API access policy, request-load limits, storage, provenance and repository size.

**Scientific caveat:** the NIH 3D terms expressly say downloaded models are illustrative/educational, not for diagnosis or treatment, and may not be scientifically verified. Nothing here is NIH endorsement. Keep the original NIH identity and submitter credits, not logos or affiliations implying NIH support.

**Production status:** research-only until a specifically reviewed model passes clinical/visual quality checks and can be displayed in the correct independent ATLA tool.
