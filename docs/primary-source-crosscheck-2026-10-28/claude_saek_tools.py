#!/usr/bin/env python3
"""Append Claude SAEK batches to claude-saek-findings.json and regenerate CLAUDE_SAEK_REPORT.md.
Usage: claude_tools.py <batch.json>  (list of finding objects). Touches only Claude-owned files."""
import json,sys,os,datetime
D=os.path.dirname(os.path.abspath(__file__))
F=os.path.join(D,'claude-saek-findings.json'); M=os.path.join(D,'CLAUDE_SAEK_REPORT.md')
data=json.load(open(F,encoding='utf-8')) if os.path.exists(F) else {"status":"IN_PROGRESS_NOT_CERTIFIED","scope":"Targeted scientific cross-check of the 54 SAEK chapters (courses 16-20) that had no targetedReview. Not an independent scientific certification.","entries":[]}
if len(sys.argv)>1:
    for e in json.load(open(sys.argv[1],encoding='utf-8')):
        data['entries']=[x for x in data['entries'] if x['id']!=e['id']]+[e]
data['entries'].sort(key=lambda x:x['id']); json.dump(data,open(F,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
V={'consistent':'Συμφωνεί','consistent_with_gaps':'Συμφωνεί με ελλείψεις','needs_correction':'Χρειάζεται διόρθωση','needs_clinical_review':'Χρειάζεται κλινική αξιολόγηση','source_unreachable':'Πηγή μη προσβάσιμη','no_checkable_clinical_claim':'Οργανωτικό/εκπαιδευτικό — δεν εντοπίστηκε ελέγξιμος κλινικός ισχυρισμός'}
_pend=set()
for _f in ('saek-11-20.json',):
    _r=json.load(open(os.path.join(D,_f),encoding='utf-8'))['entries']; _pend|={r['id'] for r in _r if not r.get('targetedReview')}
_ids={e['id'] for e in data['entries']}
npend=len(_ids&_pend); ncomp=sum(1 for e in data['entries'] if e['id'] in _pend and e['verdict'] not in ('source_unreachable','no_checkable_clinical_claim')); extra=_ids-_pend; missing=sorted(_pend-_ids)
n=len(data['entries']); from collections import Counter; c=Counter(e['verdict'] for e in data['entries'])
L=['# CLAUDE — Επιστημονική αντιπαραβολή 54 κεφαλαίων ΣΑΕΚ (μαθήματα 16–20) χωρίς προηγούμενο στοχευμένο έλεγχο','',
'**Κατάσταση: ΣΕ ΕΞΕΛΙΞΗ — ΟΧΙ ΑΝΕΞΑΡΤΗΤΗ ΠΙΣΤΟΠΟΙΗΣΗ.** Στοχευμένη αντιπαραβολή των κλινικών ισχυρισμών του κεφαλαίου με πρωτογενείς πηγές. Δεν άλλαξε εκπαιδευτικό περιεχόμενο, κοινά μητρώα ή το `REPORT.md`. Η ανθρώπινη κλινική αξιολόγηση παραμένει υποχρεωτική στις κρίσιμες αμφιβολίες.','',
f'**Καταγράφηκαν:** {npend}/54 κεφάλαια, από τα οποία ΜΟΝΟ {ncomp} αντιπαραβλήθηκαν πραγματικά με προσβάσιμη πηγή· τα υπόλοιπα είναι είτε χωρίς ελέγξιμο κλινικό ισχυρισμό είτε «δεν επαληθεύτηκε». Δεν υπάρχει «έγκριση κεφαλαίου». · '+' · '.join(f'{V[k]}: {v}' for k,v in c.items())+(f' · Επιπλέον {len(extra)} κεφάλαια που είχαν ήδη στοχευμένο έλεγχο από άλλον ({", ".join(sorted(extra))}): παρατίθενται για διασταύρωση.' if extra else ''),'',
'Εκκρεμή (χωρίς targetedReview): SAEK-16-12, 16-13 και όλα τα κεφάλαια των μαθημάτων 17–20 (54 συνολικά).','',
'**Εκκρεμότητες για άνθρωπο:**',
'- Απαιτείται κλινική αξιολόγηση: '+', '.join(e['id'][5:] for e in data['entries'] if e.get('clinicalReview')),
'- Πηγή μη προσβάσιμη (δεν επαληθεύτηκαν): '+', '.join(e['id'][5:] for e in data['entries'] if e['verdict']=='source_unreachable'),
'- Έλλειψη/λάθος παραπομπής ή κενά: δείτε τις επιμέρους ενότητες (προτεινόμενες αλλαγές για έγκριση, δεν εφαρμόστηκαν).','']
for e in data['entries']:
    L+=[f"## {e['id']} — {V[e['verdict']]} · κίνδυνος: {e['risk']} · βεβαιότητα: {e['certainty']}",f"*{e['question']}*",'',e['findings'],'']
    L+=['Πηγές ('+e['checkedAt']+'): '+'; '.join(f"[{s['title']}]({s['url']})" for s in e['sources'])]
    if e.get('suggestedChange'): L+=['','**Προτεινόμενη αλλαγή (για έγκριση):** '+e['suggestedChange']]
    L+=['**Απαιτείται κλινική αξιολόγηση:** '+('ΝΑΙ — '+e.get('clinicalNote','κλινική επιβεβαίωση') if e.get('clinicalReview') else 'όχι για αυτό το εύρημα'),'']
open(M,'w',encoding='utf-8').write('\n'.join(L))
print(n,dict(c))
