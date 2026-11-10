# ECG Lab — expanded educational release · 11 November 2026

## Scope and provenance

This release expands the existing \`mentor-ecg.html\` section without replacing its prior P–QRS–T and six-second rhythm exercises.

- One larger **synthetic** scrolling single-lead II monitor with fullscreen and schematic display-speed/gain selectors.
- 18 **synthetic** rhythm-recognition exercises (11 existing + seven new): first-degree AV delay, Wenckebach/Mobitz I, Mobitz II, third-degree AV dissociation, junctional escape, ventricular pacing, and a schematic polymorphic VT pattern.
- Five **generated, synthetic** 10-second 12-lead traces: sinus 72/min, sinus bradycardia 46/min, sinus tachycardia 122/min, irregular AF-like pattern, and schematic paced 64/min.
- Users can still load a compatible authorized 10-second 12-lead JSON file (12 named leads in mV).

**No clinical recordings have been imported.** The sample data are mathematically generated; no PTB-XL or PhysioNet record is represented here. Limb leads are algebraically consistent by design (III = II − I; aVR = −(I+II)/2; aVL = I − II/2; aVF = II − I/2). Chest-lead morphology is a stylized teaching sketch, not physiologically validated. Control labels of 25/50 mm/s and 5/10/20 mm/mV describe schematic display scaling and should never be represented as calibration of an actual sensor.

## Scientific reference anchors (interpretation criteria, **not** waveform validation)

1. JCS/JHRS 2022 Guideline on Diagnosis and Risk Assessment of Arrhythmia (published in 2024): definitions of first-degree AV block, Wenckebach, Mobitz II and advanced AV conduction disturbances: https://pmc.ncbi.nlm.nih.gov/articles/PMC11317726/
2. American Heart Association, Heart Conduction Disorders: basic second/third degree conduction block overview: https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/conduction-disorders
3. American Heart Association 2025 Adult Advanced Life Support: rhythm interpretation does not itself establish a pulse or diagnose pulseless electrical activity: https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support
4. **Future genuine waveform source, NOT included in this release:** PhysioNet PTB-XL v1.0.3 (10-s 12-lead CC BY 4.0 recordings, DOI 10.13026/kfzx-aw45): https://physionet.org/content/ptb-xl/1.0.3/

## Safety boundaries

- ECG display and score cannot be used for diagnosis, patient management, pacing decisions, ACLS rhythm checks or measurement of a real heart rate.
- The Wenckebach and Mobitz II examples are deliberately simple teaching cases; they are not sufficient for clinical differentiation of ambiguous blocks or 2:1 conduction.
- The polymorphic VT waveform is illustrative and **does not establish torsades de pointes**, QT duration, hemodynamic status or the presence/absence of a pulse.
- Numeric monitor readouts, when present, represent only selected **synthetic** teaching-case parameters, not vital signs.
- JSON uploads are user-provided and should be authorized and de-identified. The page does not transmit user ECG files to a server.
- Fullscreen requires browser permission; it must not impact quiz and paper functions when unavailable.

## Verification and open gates

Technical tests:
- \`node --test tools/ecg-lab/core/*.test.mjs\` (unique IDs, bounded finite waveforms, 10-second records, 12 channels, Einthoven/Goldberger identities, determinism, and legacy synthetic generator).
- \`node --check tools/ecg-lab/core/ecg-synthetic.mjs\` and \`node --check tools/ecg-lab/core/ecg-examples.mjs\`.
- Live browser smoke checklist: embed loads from \`mentor-ecg.html\`; start/pause/continue/answer/score; all five 12-lead examples render 12+1 labelled traces; speed/gain/rhythm-strip changes rerender; invalid JSON rejected; fullscreen gracefully enters or fails; mobile horizontal scrolling; old P–QRS–T exercise preserved.
- Production release: verify deploy workflow **completed successfully** on exact merged commit and test the real GitHub Pages URL.

**Unresolved clinical gate:** Independent review by a qualified clinical/ECG educator of the signal morphology, descriptions and the new quizzes under \`docs/INDEPENDENT_EDUCATIONAL_SCIENTIFIC_AUDIT.md\` has NOT been conducted; technical unit and browser tests are not clinical certification. This release must remain explicitly labelled as synthetic educational beta.

This document records technical scope and provenance, not a clinical audit result.
