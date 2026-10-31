#!/usr/bin/env python3
"""Append Claude batches to claude-eoppep-b-findings.json and regenerate CLAUDE_SCIENTIFIC_REPORT.md.
Usage: claude_tools.py <batch.json>  (list of finding objects). Touches only Claude-owned files."""
import json,sys,os,datetime
D=os.path.dirname(os.path.abspath(__file__))
F=os.path.join(D,'claude-eoppep-b-findings.json'); M=os.path.join(D,'CLAUDE_SCIENTIFIC_REPORT.md')
data=json.load(open(F,encoding='utf-8')) if os.path.exists(F) else {"status":"IN_PROGRESS_NOT_CERTIFIED","scope":"Targeted scientific cross-check of EOPPEP group-B questions that had no targetedReview in PR #39. Not an independent scientific certification.","entries":[]}
if len(sys.argv)>1:
    for e in json.load(open(sys.argv[1],encoding='utf-8')):
        data['entries']=[x for x in data['entries'] if x['id']!=e['id']]+[e]
data['entries'].sort(key=lambda x:x['id']); json.dump(data,open(F,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
V={'consistent':'Συμφωνεί','consistent_with_gaps':'Συμφωνεί με ελλείψεις','needs_correction':'Χρειάζεται διόρθωση','needs_clinical_review':'Χρειάζεται κλινική αξιολόγηση','source_unreachable':'Πηγή μη προσβάσιμη'}
n=len(data['entries']); from collections import Counter; c=Counter(e['verdict'] for e in data['entries'])
L=['# CLAUDE — Επιστημονική αντιπαραβολή ΕΟΠΠΕΠ ομάδας Β (ερωτήσεις χωρίς προηγούμενο στοχευμένο έλεγχο)','',
'**Κατάσταση: ΣΕ ΕΞΕΛΙΞΗ — ΟΧΙ ΑΝΕΞΑΡΤΗΤΗ ΠΙΣΤΟΠΟΙΗΣΗ.** Στοχευμένη αντιπαραβολή αποθηκευμένης απάντησης με πρωτογενείς πηγές. Δεν άλλαξε εκπαιδευτικό περιεχόμενο, κοινά μητρώα ή το `REPORT.md`. Η ανθρώπινη κλινική αξιολόγηση παραμένει υποχρεωτική στις κρίσιμες αμφιβολίες.','',
f'**Ολοκληρώθηκαν:** {n}/197 · '+' · '.join(f'{V[k]}: {v}' for k,v in c.items()),'',
'Σύνολο εκκρεμών (χωρίς προηγούμενο targetedReview): 197 — B-009…B-046, B-048…B-093, B-095…B-180, B-182…B-203, B-205…B-209.','']
for e in data['entries']:
    L+=[f"## {e['id']} — {V[e['verdict']]} · κίνδυνος: {e['risk']} · βεβαιότητα: {e['certainty']}",f"*{e['question']}*",'',e['findings'],'']
    L+=['Πηγές ('+e['checkedAt']+'): '+'; '.join(f"[{s['title']}]({s['url']})" for s in e['sources'])]
    if e.get('suggestedChange'): L+=['','**Προτεινόμενη αλλαγή (για έγκριση):** '+e['suggestedChange']]
    L+=['**Απαιτείται κλινική αξιολόγηση:** '+('ΝΑΙ — '+e.get('clinicalNote','κλινική επιβεβαίωση') if e.get('clinicalReview') else 'όχι για αυτό το εύρημα'),'']
open(M,'w',encoding='utf-8').write('\n'.join(L))
print(n,dict(c))
