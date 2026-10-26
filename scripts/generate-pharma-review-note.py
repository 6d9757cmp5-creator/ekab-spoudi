#!/usr/bin/env python3
"""Create the one-page EKAB Spoudi pharmacology review-status report.
The file records evidence-review and structural checks; it is NOT a clinical licence.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "pharmacology-review-status-2026-10-26.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
FONTDIR = Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("ReviewRegular",str(FONTDIR/"DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("ReviewBold",str(FONTDIR/"DejaVuSans-Bold.ttf")))
pdfmetrics.registerFontFamily("ReviewRegular",normal="ReviewRegular",bold="ReviewBold")
NAVY=HexColor("#163246"); INK=HexColor("#193A4B"); MUTED=HexColor("#567080")
TEAL=HexColor("#176C80"); PALE=HexColor("#EAF4F6"); BORDER=HexColor("#D6E4E8")
GREEN=HexColor("#28735D"); PALEGREEN=HexColor("#ECF7F2")
AMBER=HexColor("#9B651F"); PALEAMBER=HexColor("#FFF6E8"); WHITE=HexColor("#FFFFFF")
W,H=A4; LEFT=42; WIDTH=W-84
c=canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
c.setTitle("ΕΚΑΒ Σπουδή | Δελτίο επικαιροποίησης κλινικού ελέγχου φαρμακολογίας")
c.setAuthor("ΕΚΑΒ Σπουδή — Μητρώο εκπαιδευτικού περιεχομένου")
c.setSubject("Καταγραφή τεκμηρίωσης και ορίων κλινικής επικύρωσης, 26/10/2026")

def write(x,y,s,size=10,bold=False,color=INK):
    c.setFillColor(color); c.setFont("ReviewBold" if bold else "ReviewRegular",size); c.drawString(x,y,s)

def paragraph(s,x,top,width,size=9,leading=14,color=INK):
    st=ParagraphStyle("body",fontName="ReviewRegular",fontSize=size,leading=leading,textColor=color)
    p=Paragraph(s,st); w,h=p.wrap(width,1000);p.drawOn(c,x,top-h);return top-h

def hr(y):
    c.setStrokeColor(BORDER);c.setLineWidth(.75);c.line(LEFT,y,W-LEFT,y)

c.setFillColor(NAVY);c.roundRect(LEFT,H-64,28,28,7,fill=1,stroke=0)
c.setStrokeColor(WHITE);c.setLineWidth(2.1)
c.line(LEFT+14,H-59,LEFT+14,H-41);c.line(LEFT+5,H-50,LEFT+23,H-50)
write(LEFT+39,H-43,"ΕΚΑΒ ΣΠΟΥΔΗ",11.8,True,NAVY)
write(LEFT+39,H-59,"ΜΗΤΡΩΟ ΤΕΚΜΗΡΙΩΣΗΣ ΕΚΠΑΙΔΕΥΤΙΚΟΥ ΠΕΡΙΕΧΟΜΕΝΟΥ",7.5,False,MUTED)
hr(H-78)
write(LEFT,H-105,"ΔΕΛΤΙΟ ΕΠΙΚΑΙΡΟΠΟΙΗΣΗΣ",15.6,True,NAVY)
write(LEFT,H-125,"ΚΛΙΝΙΚΟΥ ΕΛΕΓΧΟΥ ΦΑΡΜΑΚΟΛΟΓΙΑΣ",12.4,True,NAVY)
write(LEFT,H-141,"Προνοσοκομειακή φροντίδα — εκπαιδευτικό βοήθημα διασώστη / paramedic",8.7,False,MUTED)
y=H-208
c.setFillColor(PALEGREEN);c.setStrokeColor(HexColor("#B8DED0"))
c.roundRect(LEFT,y,WIDTH,54,10,stroke=1,fill=1)
c.setStrokeColor(GREEN);c.setLineWidth(2.2);c.circle(LEFT+24,y+28,10,stroke=1,fill=0)
c.line(LEFT+18,y+28,LEFT+22,y+24);c.line(LEFT+22,y+24,LEFT+30,y+33)
write(LEFT+44,y+34,"ΚΑΤΑΓΕΓΡΑΜΜΕΝΟΣ ΕΛΕΓΧΟΣ ΤΕΚΜΗΡΙΩΣΗΣ",9.5,True,GREEN)
write(LEFT+44,y+18,"Η ανεξάρτητη κλινική επικύρωση παραμένει σε εκκρεμότητα.",8.15)
my=y-24
for x,label,value in [
    (LEFT,"ΗΜΕΡΟΜΗΝΙΑ","26/10/2026"),
    (LEFT+180,"ΕΚΔΟΣΗ ΑΝΑΣΚΟΠΗΣΗΣ","v27.1.74"),
    (LEFT+365,"ΚΩΔΙΚΟΣ ΔΕΛΤΙΟΥ","PH-2026-10-26")]:
    write(x,my,label,7.3,True,MUTED);write(x,my-16,value,9.4,True,NAVY)
hr(my-28)
y=my-42; bw=(WIDTH-21)/4
for i,(num,label) in enumerate([
    ("76","καρτέλες"),("11","ενότητες"),("21","ειδικές αναφορές"),("55","προς περαιτέρω έλεγχο")]):
    x=LEFT+i*(bw+7)
    c.setFillColor(PALE);c.roundRect(x,y-59,bw,59,7,stroke=0,fill=1)
    write(x+10,y-26,num,17.4,True,NAVY)
    paragraph(label,x+10,y-31,bw-15,7.2,10,MUTED)
y-=82
write(LEFT,y,"ΠΕΔΙΟ ΚΑΙ ΑΠΟΤΕΛΕΣΜΑ ΕΛΕΓΧΟΥ",10.1,True,NAVY)
y=paragraph("Ελέγχθηκε η <b>δομική πληρότητα των 76 καρτελών</b>, η εμφάνιση προειδοποιήσεων ασφάλειας, η διάκριση επαγγελματικών αρμοδιοτήτων, η αντιστοίχιση διαθέσιμων συνδέσμων πηγών, η λειτουργία της αναζήτησης και η πλοήγηση / offline διαθεσιμότητα. Ο αυτοματοποιημένος έλεγχος του αποθετηρίου ολοκληρώθηκε επιτυχώς.",LEFT,y-20,WIDTH,8.95,14.2)
y-=17
write(LEFT,y,"ΣΗΜΕΙΑ ΕΠΙΚΑΙΡΟΠΟΙΗΣΗΣ",10.1,True,NAVY)
y-=13
for bullet in [
    "Διαχωρίστηκαν οι ενδείξεις αδρεναλίνης για <b>αναφυλαξία (IM)</b> και <b>καρδιακή ανακοπή (IV/IO)</b>.",
    "Προστέθηκαν επεξηγήσεις για <b>TXA</b> σε σοβαρό τραύμα έναντι ΚΕΚ, παιδιατρική χρήση, επιληπτική κατάσταση και ατροπίνη.",
    "Καρτέλες χωρίς αντιστοίχιση συγκεκριμένου προϊόντος δεν παρουσιάζονται ως <b>εγκεκριμένο ελληνικό δοσολόγιο</b>."]:
    c.setFillColor(TEAL);c.circle(LEFT+5,y-7,2.2,stroke=0,fill=1)
    y=paragraph(bullet,LEFT+17,y,WIDTH-17,8.55,13.5)-6
y-=7
c.setFillColor(PALEAMBER);c.roundRect(LEFT,y-70,WIDTH,70,9,stroke=0,fill=1)
write(LEFT+12,y-18,"ΣΗΜΑΝΤΙΚΟΣ ΠΕΡΙΟΡΙΣΜΟΣ",8.75,True,AMBER)
paragraph("Το δελτίο <b>δεν είναι πιστοποιητικό</b>, ιατρική γνωμάτευση ή βεβαίωση επίσημης έγκρισης ΕΚΑΒ / ΕΟΦ. Εκκρεμούν η έγκριση αρμόδιου ιατρού και φαρμακοποιού, η αντιστοίχιση ΠΧΠ ανά προϊόν και η επαλήθευση εγκεκριμένων υπηρεσιακών πρωτοκόλλων πριν από πραγματική χορήγηση.",LEFT+12,y-27,WIDTH-24,8.45,12.7)
y-=89
write(LEFT,y,"ΔΥΝΑΤΟΤΗΤΑ ΑΝΕΞΑΡΤΗΤΟΥ ΕΛΕΓΧΟΥ",10.1,True,NAVY)
write(LEFT,y-20,"Πλήρες μητρώο διορθώσεων, τεκμηρίωσης και εκκρεμοτήτων:",8.55)
a="https://github.com/6d9757cmp5-creator/ekab-spoudi/blob/main/docs/PHARMACOLOGY-CLINICAL-AUDIT-2026-10-26.md"
b="https://github.com/6d9757cmp5-creator/ekab-spoudi/actions/runs/40404284718"
write(LEFT,y-38,"Μητρώο τεκμηρίωσης (GitHub)",8.5,True,TEAL)
write(LEFT+269,y-38,"Έλεγχος GitHub Actions",8.5,True,TEAL)
c.linkURL(a,(LEFT,y-43,LEFT+235,y-26),relative=0)
c.linkURL(b,(LEFT+265,y-43,W-LEFT,y-26),relative=0)
hr(64)
paragraph("Βάση αναφοράς: ERC/RCUK 2025, NICE, GINA 2026 και πληροφορίες προϊόντων (ΕΟΦ/EMA), όπου εφαρμόζεται. Η επιτυχία τεχνικών δοκιμών <b>δεν ισοδυναμεί με πιστοποίηση κλινικής ορθότητας</b>.",LEFT,58,WIDTH,7.5,10.8,MUTED)
write(W-149,22,"Δελτίο 1 / 1  •  26.10.2026",7.1,False,MUTED)
c.showPage();c.save()
print("Generated",OUT)
