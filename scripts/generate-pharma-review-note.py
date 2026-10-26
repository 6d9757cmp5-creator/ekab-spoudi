#!/usr/bin/env python3
"""One-page scholarly summary of documented pharmacology content checks."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs' / 'pharmacology-review-status-2026-10-26.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('Acad', str(FONT / 'DejaVuSerif.ttf')))
pdfmetrics.registerFont(TTFont('AcadBold', str(FONT / 'DejaVuSerif-Bold.ttf')))
pdfmetrics.registerFontFamily('Acad', normal='Acad', bold='AcadBold')
W,H = A4
M=48
CW=W-2*M
INK=HexColor('#18222c')
SUB=HexColor('#43505b')
RULE=HexColor('#808b95')
c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
c.setTitle('ΕΚΑΒ Σπουδή — Επικαιροποίηση κλινικού ελέγχου φαρμακολογίας')
c.setAuthor('ΕΚΑΒ Σπουδή — Τεκμηρίωση εκπαιδευτικού υλικού')
c.setSubject('Ακαδημαϊκή σύνοψη ελέγχου φαρμακολογίας, 26 Οκτωβρίου 2026')

def t(x,y,value,size=9,bold=False,color=INK):
    c.setFillColor(color)
    c.setFont('AcadBold' if bold else 'Acad', size)
    c.drawString(x,y,value)

def p(value,top,indent=0,size=9.1,leading=15.3,bold=False):
    sty=ParagraphStyle('body',fontName='AcadBold' if bold else 'Acad',fontSize=size,leading=leading,textColor=INK)
    para=Paragraph(value,sty)
    _,height=para.wrap(CW-indent,1500)
    para.drawOn(c,M+indent,top-height)
    return top-height

def rule(y):
    c.setLineWidth(.6);c.setStrokeColor(RULE);c.line(M,y,W-M,y)

def title(value,top):
    t(M,top,value,10.05,True)
    return top-14

t(M,H-58,'ΕΚΑΒ ΣΠΟΥΔΗ',11.6,True)
t(M,H-76,'ΤΕΚΜΗΡΙΩΣΗ ΕΚΠΑΙΔΕΥΤΙΚΟΥ ΥΛΙΚΟΥ',8.25,False,SUB)
rule(H-89)
t(M,H-116,'ΕΠΙΚΑΙΡΟΠΟΙΗΣΗ ΚΛΙΝΙΚΟΥ ΕΛΕΓΧΟΥ',13.35,True)
t(M,H-134,'ΦΑΡΜΑΚΟΛΟΓΙΑΣ ΠΡΟΝΟΣΟΚΟΜΕΙΑΚΗΣ ΦΡΟΝΤΙΔΑΣ',10.4,True)
t(M,H-156,'Ημερομηνία: 26 Οκτωβρίου 2026    |    Έκδοση: v27.1.74    |    Πεδίο: 76 καρτέλες, 11 ενότητες',8.15,False,SUB)
rule(H-169)

y=H-195
y=title('ΠΕΔΙΟ ΚΑΙ ΑΠΟΤΕΛΕΣΜΑ ΕΛΕΓΧΟΥ',y)
y=p('Ελέγχθηκε η δομική πληρότητα των 76 καρτελών, η εμφάνιση προειδοποιήσεων ασφάλειας, η διάκριση επαγγελματικών αρμοδιοτήτων, η αντιστοίχιση διαθέσιμων συνδέσμων πηγών, η λειτουργία της αναζήτησης και η πλοήγηση / offline διαθεσιμότητα. Ο αυτοματοποιημένος έλεγχος του αποθετηρίου ολοκληρώθηκε επιτυχώς.',y-8)

y-=24
y=title('ΣΗΜΕΙΑ ΕΠΙΚΑΙΡΟΠΟΙΗΣΗΣ',y)
points=[
  '<b>1. Συστηματική αναθεώρηση περιεχομένου.</b> Ενοποιήθηκε η παρουσίαση των 76 καρτελών σε 11 θεματικές ενότητες, με τυποποιημένη διάρθρωση και σαφή διάκριση βασικής γνώσης από εξειδικευμένο εκπαιδευτικό περιεχόμενο.',
  '<b>2. Ενίσχυση επιστημονικής πληροφόρησης.</b> Προστέθηκαν πεδία για μηχανισμό δράσης, κλινικές προϋποθέσεις, περιορισμούς ασφάλειας, ανεπιθύμητες ενέργειες, φαρμακευτικές αλληλεπιδράσεις, παρακολούθηση και ειδικούς πληθυσμούς.',
  '<b>3. Επικαιροποίηση βιβλιογραφίας.</b> Σε 21 καρτέλες καταγράφηκε ειδικότερη αντιστοίχιση με κλινικές κατευθυντήριες οδηγίες. Για τις υπόλοιπες 55 επισημάνθηκε η ανάγκη επιπρόσθετης διασταύρωσης με συγκεκριμένη Περίληψη Χαρακτηριστικών Προϊόντος και το ισχύον υπηρεσιακό πλαίσιο.',
  '<b>4. Αποσαφήνιση κανόνων ασφάλειας.</b> Ενισχύθηκε η διάκριση ηλικιακών ομάδων, οδών χορήγησης, μονάδων μέτρησης και διαδικασιών επανεκτίμησης, με κατάλληλες προειδοποιήσεις όπου δεν υφίσταται τεκμηριωμένο καθολικό σχήμα.',
  '<b>5. Επαληθευσιμότητα και ιχνηλασιμότητα.</b> Ελέγχθηκαν σύνδεσμοι τεκμηρίωσης, δομή καταγραφών, μοναδικότητα εγγραφών και διαθεσιμότητα στοιχείων ελέγχου. Διατηρείται αναλυτικό μητρώο αναθεωρήσεων στο αποθετήριο.',
  '<b>6. Τεχνική ποιοτική διασφάλιση.</b> Επιβεβαιώθηκαν η φόρτωση των καρτελών, οι λειτουργίες αναζήτησης και φίλτρων, η προσαρμογή σε κινητές συσκευές, η offline διαθεσιμότητα και η επιτυχής εκτέλεση του αυτοματοποιημένου ελέγχου.',
]
for paragraph_text in points:
    y=p(paragraph_text,y-8,indent=0,size=8.6,leading=13.5)

y-=22
y=title('ΤΕΚΜΗΡΙΩΣΗ ΚΑΙ ΔΙΑΔΙΚΑΣΙΑ ΕΠΑΛΗΘΕΥΣΗΣ',y)
y=p('Βάση αναφοράς: ERC/RCUK 2025, GINA 2026, NICE και εγκεκριμένες πληροφορίες φαρμακευτικών προϊόντων όπου υπάρχει συγκεκριμένη αντιστοίχιση. Η αναλυτική τεκμηρίωση, το ιστορικό διορθώσεων και τα αποτελέσματα δομικών ελέγχων παρατίθενται στο διαδικτυακό αποθετήριο.',y-8,size=8.45,leading=13.1)
y-=6
a='https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/PHARMACOLOGY-CLINICAL-AUDIT-2026-10-26.md'
b='https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40404284718'
t(M,y,'Μητρώο ανασκόπησης: GitHub / PHARMACOLOGY-CLINICAL-AUDIT-2026-10-26.md',7.45,False,SUB)
c.linkURL(a,(M,y-4,W-M,y+12),relative=0)
y-=18
t(M,y,'Αυτοματοποιημένος έλεγχος: GitHub Actions / Pharmacology verification',7.45,False,SUB)
c.linkURL(b,(M,y-4,W-M,y+12),relative=0)

rule(97)
p('Διευκρίνιση: Το παρόν αποτελεί τεκμηρίωση της ανασκόπησης εκπαιδευτικού περιεχομένου και των σχετικών τεχνικών ελέγχων. Δεν συνιστά επίσημο υπηρεσιακό πρωτόκολλο και δεν είναι πιστοποιητικό ανεξάρτητης κλινικής έγκρισης.',87,size=7.55,leading=12.3)
t(W-M-88,35,'26.10.2026    |    1 / 1',7.2,False,SUB)
if y < 109:
    raise RuntimeError('Content would overlap the footer')
c.save()
print(OUT)
