#!/usr/bin/env python3
"""Deterministic, free consistency check of the audit registries (no network, no LLM).
Checks structure, IDs, counts, cross-file agreement and that nothing claims certification."""
import json, re, sys, glob, os
from urllib.parse import urlparse

D = 'docs/primary-source-crosscheck-2026-10-28/'
errors, notes = [], []
# eoppep-314.json is a dated snapshot (2026-10-28); only these app edits since then are expected to differ.
DOCUMENTED_APP_CHANGES = {'EOP-B-105', 'EOP-B-128', 'EOP-B-130', 'EOP-B-132', 'EOP-B-133'}
# Questions that are tables in the official PDF; the app renders them as a sentence.
PDF_TABLE_QUESTIONS = {'EOP-B-077', 'EOP-B-078'}
def err(m): errors.append(m)
def load(p):
    try:
        with open(p, encoding='utf-8') as f: return json.load(f)
    except Exception as e:
        err(f'{p}: cannot parse ({e})'); return None

def walk(x, fn, path=''):
    if isinstance(x, dict):
        for k, v in x.items(): fn(k, v, path); walk(v, fn, path + '/' + k)
    elif isinstance(x, list):
        for i, v in enumerate(x): walk(v, fn, path)

def valid_url(u):
    p = urlparse(u); return p.scheme == 'https' and bool(p.netloc) and ' ' not in u

q = load('official_questions.json'); sos = load('eoppep-sos.json'); inv = load('docs/EOPPEP-SOURCE-INVENTORY-2026-10-26.json')
r314 = load(D + 'eoppep-314.json'); s1 = load(D + 'saek-01-10.json'); s2 = load(D + 'saek-11-20.json')
cb = load(D + 'claude-eoppep-b-findings.json'); cs = load(D + 'claude-saek-findings.json')
if errors: print('\n'.join(errors)); sys.exit(1)

ids = [x['id'] for x in q]
if len(ids) != 314 or len(set(ids)) != 314: err(f'official_questions: {len(ids)} ids, {len(set(ids))} unique (expected 314)')
if sum(1 for i in ids if i.startswith('EOP-A-')) != 105 or sum(1 for i in ids if i.startswith('EOP-B-')) != 209: err('official_questions: expected 105 A + 209 B')
for name, other in (('eoppep-sos', [x['id'] for x in sos['items']]), ('inventory', [x['id'] for x in inv['records']]), ('eoppep-314', [x['id'] for x in r314['entries']])):
    if other != ids: err(f'{name}: ids/order differ from official_questions (missing {sorted(set(ids)-set(other))[:3]}, extra {sorted(set(other)-set(ids))[:3]})')
if sos['count'] != len(sos['items']): err('eoppep-sos: count field != items')

qm = {x['id']: x for x in q}
for s in sos['items']:
    if s.get('sourceUrl') != qm[s['id']].get('sourceUrl'): err(f"{s['id']}: eoppep-sos sourceUrl differs from official_questions")
    if s.get('medicalCertification') is not False: err(f"{s['id']}: eoppep-sos medicalCertification is not false")
    if not s.get('points'): err(f"{s['id']}: eoppep-sos has no points")
for r in inv['records']:
    if r.get('sourceUrl') != qm[r['id']].get('sourceUrl'): err(f"{r['id']}: inventory sourceUrl differs from official_questions")
for e in r314['entries']:
    for field, a, b in (('question', e['question'], qm[e['id']]['question']), ('source', e.get('existingSource'), qm[e['id']].get('sourceUrl'))):
        if a != b:
            (notes if e['id'] in DOCUMENTED_APP_CHANGES else errors).append(f"{e['id']}: eoppep-314 snapshot {field} differs from the app" + (' (documented change since 2026-10-28)' if e['id'] in DOCUMENTED_APP_CHANGES else ' (undocumented drift)'))

for x in q:
    if not x.get('answer', '').strip(): err(f"{x['id']}: empty answer")
    if not valid_url(x.get('sourceUrl', '')): err(f"{x['id']}: invalid sourceUrl")
    if x.get('answerStatus') not in ('reviewed_educational',) and not x.get('answerStatus'): err(f"{x['id']}: no answerStatus")

# SAEK registries
sa = s1['entries'] + s2['entries']; sid = [e['id'] for e in sa]
if len(sid) != 247 or len(set(sid)) != 247: err(f'SAEK registries: {len(sid)} ids, {len(set(sid))} unique (expected 247)')
for e in sa:
    m = re.fullmatch(r'SAEK-(\d\d)-(\d\d)', e['id'])
    if not m: err(f"{e['id']}: bad SAEK id"); continue
    if int(m[1]) != int(e['course']) or int(m[2]) != int(e['chapter']): err(f"{e['id']}: course/chapter fields disagree with id")
    if (int(m[1]) <= 10) != (e in s1['entries']): err(f"{e['id']}: stored in wrong registry file")
    for u in e.get('sourceUrlsInChapter', []) or []:
        if not valid_url(u): err(f"{e['id']}: bad chapter source URL {u!r}")
courses = {}
for e in sa: courses.setdefault(int(e['course']), set()).add(int(e['chapter']))
if sorted(courses) != list(range(1, 21)): err('SAEK registries: courses 1-20 not all present')
for c, chs in courses.items():
    if sorted(chs) != list(range(1, max(chs) + 1)): err(f'SAEK course {c}: chapter numbers have gaps')
    page = f'saek-course-{c:02d}.html'
    if not os.path.exists(page): err(f'{page} missing')

# Claude findings
VERD = {'no_checkable_clinical_claim', 'consistent', 'consistent_with_gaps', 'needs_correction', 'needs_clinical_review', 'source_unreachable'}
eids, said = set(ids), set(sid)
for name, reg, valid in (('claude-eoppep-b', cb, eids), ('claude-saek', cs, said)):
    seen = set()
    for e in reg['entries']:
        if e['id'] in seen: err(f"{name}: duplicate {e['id']}")
        seen.add(e['id'])
        if e['id'] not in valid: err(f"{name}: unknown id {e['id']}")
        if e.get('verdict') not in VERD: err(f"{name}: {e['id']} unknown verdict {e.get('verdict')!r}")
        if e.get('verdict') != 'source_unreachable' and not e.get('sources'): err(f"{name}: {e['id']} verdict without any source")
        for s in e.get('sources', []):
            if not valid_url(s.get('url', '')): err(f"{name}: {e['id']} bad source URL")
        if not isinstance(e.get('clinicalReview'), (bool, dict)) and e.get('clinicalReview') is not None: err(f"{name}: {e['id']} clinicalReview type")
        if e.get('verdict') == 'needs_clinical_review' and not e.get('clinicalReview'): err(f"{name}: {e['id']} needs_clinical_review but clinicalReview empty")
        if e.get('verdict') in ('needs_correction',) : notes.append(f"{name}: {e['id']} verdict needs_correction")

# no file may claim certification / sign-off
def cert(k, v, path):
    if k in ('independentClinicalSignOff', 'independentClinicalApproval', 'medicalCertification', 'officialEoppepAnswerKey') and v is True:
        err(f'{path}/{k} is true (no certification may be claimed)')
for name, obj in (('official_questions', q), ('eoppep-sos', sos), ('inventory', inv), ('eoppep-314', r314), ('saek-01-10', s1), ('saek-11-20', s2), ('claude-b', cb), ('claude-saek', cs)):
    walk(obj, lambda k, v, p, n=name: cert(k, v, n + p))

# Official wording: each question must appear verbatim (accents/case/spacing ignored) in the PDF text.
import shutil, subprocess, unicodedata
if shutil.which('pdftotext') and os.path.exists('eoppep-source.pdf'):
    raw = subprocess.run(['pdftotext', '-enc', 'UTF-8', 'eoppep-source.pdf', '-'], capture_output=True, encoding='utf-8').stdout
    def words(t):
        t = ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if not unicodedata.combining(c))
        return re.findall(r'[α-ωa-z0-9]+', t)
    pdf = words(re.sub(r'Σελίδα \d+ από 18\s*Ε\.Ο\.Π\.Π\.Ε\.Π\.\s*ΔΙΑΣΩΣΤΗΣ – ΠΛΗΡΩΜΑ ΑΣΘΕΝΟΦΟΡΟΥ', ' ', raw))
    first = {}
    for i, w in enumerate(pdf): first.setdefault(w, []).append(i)
    bad = []
    for x in q:
        w = words(x['question'])
        ok = any(pdf[st:st + len(w)] == w for st in first.get(w[0], []))
        if not ok and x['id'] not in PDF_TABLE_QUESTIONS: bad.append(x['id'])
    if bad: err('question text is not verbatim in eoppep-source.pdf: ' + ', '.join(bad))
    else: notes.append('all 314 question texts verbatim in the official PDF (except 2 table questions)')
else:
    notes.append('pdftotext/eoppep-source.pdf unavailable: PDF wording check skipped')

print(f'official_questions {len(ids)} | sos {len(sos["items"])} | inventory {len(inv["records"])} | eoppep-314 {len(r314["entries"])} | SAEK {len(sid)} | claude B {len(cb["entries"])} | claude SAEK {len(cs["entries"])}')
for n in notes: print('NOTE', n)
if errors:
    print(f'{len(errors)} problem(s):'); [print(' -', e) for e in errors[:60]]; sys.exit(1)
print('OK: registries consistent')
