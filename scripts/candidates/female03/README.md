# Μετατροπή Medical_Female_03 (Microsoft Rocketbox, MIT) → GLB

Εργαλεία (εκτός repo): `three@0.170`, `playwright`, `@gltf-transform/cli`, `esbuild`. Οι διαδρομές στα σκριπτ δείχνουν τον υπολογιστή δοκιμών· προσαρμόστε τες.

1. `node export.mjs out.glb 1024 2048 1024` — φορτώνει το `Medical_Female_03_facial.fbx` και τα TGA, κρατά 15 visemes + 52 ARKit morph targets, μικραίνει τα textures (σώμα/κεφάλι/normal), τα αναποδογυρίζει κατακόρυφα και εξάγει GLB.
2. `node scripts/optimize-mentor-glb.mjs out.glb out2.glb` — `compactPrimitive` (κάθε primitive κρατά μόνο τα vertices του).
3. `gltf-transform sparse out2.glb mentor-female03.glb` — sparse morph targets (22 MB → 4,9 MB).
4. `esbuild mentor/candidates/female03/candidate.mjs --bundle --format=esm --minify --outfile=mentor/candidates/female03/candidate.bundle.mjs`

Δεν εκτελέστηκαν εξωτερικά εκτελέσιμα (το FBX2glTF δεν χρησιμοποιήθηκε).

Έμβλημα: 
ode export.mjs out.glb 1024 2048 1024 neutral (προεπιλογή) βάζει το έμβλημα της εφαρμογής στις θέσεις (592,497) και (872,468) της υφής σώματος 1024×1024· 
one αφήνει τα αρχικά σήματα.

Ενδυση: 7ο όρισμα shirt (προεπιλογή jacket): 
ode export.mjs out.glb 1024 2048 1024 neutral shirt. Χρώμα στο opts.shirtColor (RGB, προεπιλογή 34,58,102).
