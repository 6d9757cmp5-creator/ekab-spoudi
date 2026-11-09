/**
 * ΕΚΑΒ Σπουδή — Πρακτική Εξέταση ΕΟΠΠΕΠ. The simulator keeps only the official practical
 * scenarios; general clinical cases were removed from the app on 2026-11-09.
 */
import {PRACTICAL_CASES} from './eoppep-practical-cases.mjs';
export const CASES=[...PRACTICAL_CASES];
export const CASE=CASES[0]; // Backwards-compatible name for previous entrypoints/tests.
export function getCase(id){return CASES.find(c=>c.id===id)||null;}
