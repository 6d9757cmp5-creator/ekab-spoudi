#!/usr/bin/env python3
"""Single-page scholarly note recording traceable educational content checks.
This is a content-review memorandum, not a certificate of clinical approval.
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
F = Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("Body", str(F / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("BodyBold", str(F / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Scholar", str(F / "DejaVuSerif.ttf")))
pdfmetrics.registerFont(TTFont("ScholarBold", str(F / "DejaVuSerif-Bold.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="BodyBold")
pdfmetrics.registerFontFamily("Scholar", normal="Scholar", bold="ScholarBold")

PAGE_W, PAGE_H = A4
L = 52
R = 52
CW = PAGE_W - L - R
INK = HexColor("#192936")
MID = HexColor("#485b68")
SOFT = HexColor("#73838d")
ACCENT = HexColor("#1f556f")
LINE = HexColor("#c3cdd3")
c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
c.setTitle("Prehospital Pharmacology | Academic Content Review")
c.setAuthor("EKAB Spoudi | Educational Content Review")
c.setSubject("Traceable evaluation of an educational pharmacology reference")

def line(y, color=LINE, width=0.65):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(L, y, PAGE_W-R, y)

def text(x, y, txt, font="Body", size=9, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, txt)

def para(html, y, font="Body", size=8.55, leading=14.0, color=INK, indent=0):
    style = ParagraphStyle("scholarly", fontName=font, fontSize=size, leading=leading,
                           textColor=color, spaceAfter=0, allowWidows=0, allowOrphans=0)
    p = Paragraph(html, style)
    _, h = p.wrap(CW-indent, 1500)
    p.drawOn(c, L+indent, y-h)
    return y-h

def section(label, y):
    text(L, y, label.upper(), "BodyBold", 8.8, ACCENT)
    return y-12

# Academic rather than institutional-approval layout; no seals or simulated signatures.
text(L, PAGE_H-60, "EKAB SPOUDI", "ScholarBold", 13.2, INK)
text(L, PAGE_H-78, "EDUCATIONAL CONTENT REVIEW  /  SCHOLARLY RECORD", "Body", 7.5, MID)
line(PAGE_H-91, ACCENT, 1.1)

text(L, PAGE_H-125, "Prehospital Pharmacology", "ScholarBold", 17.2, INK)
text(L, PAGE_H-148, "Academic Content Review and Update Summary", "Scholar", 11.4, ACCENT)
text(L, PAGE_H-170, "Review corpus: 76 instructional records  |  11 clinical subject areas", "Body", 8.45, MID)
text(L, PAGE_H-185, "Document type: educational quality review memorandum", "Body", 8.2, SOFT)
line(PAGE_H-198)

y = PAGE_H-225
y = section("Scope and outcome of the review", y)
y = para(
    "The review examined the structural completeness of <b>76 educational pharmacology records</b>, "
    "the presentation of safety information, the separation of professional responsibilities, "
    "the traceability of referenced sources, and the integrity of search, navigation and "
    "offline-access functions. The corresponding repository-based validation recorded a "
    "successful automated structural review at the documented verification checkpoint. "
    "Such testing assesses content organisation and software behaviour; it does not "
    "establish independent clinical validity.", y-10, size=8.65, leading=14.45)

y -= 27
y = section("Principal findings and substantive revisions", y)
items = [
    ("Content architecture and consistency.",
     "The teaching corpus was consolidated into 11 subject areas with standardised record "
     "structure and clearer distinctions between introductory knowledge and advanced practice."),
    ("Expanded pharmacological documentation.",
     "Records now incorporate mechanism of action, treatment context, relevant precautions, "
     "monitoring considerations, interactions, and population-specific caveats."),
    ("Bibliographic mapping.",
     "Twenty-one records were linked to more specific clinical guidance. The remaining "
     "55 retain explicit requirements for product-level verification against the relevant "
     "Summary of Product Characteristics and applicable service procedures."),
    ("Risk-sensitive editorial review.",
     "Adult and paediatric information, administration routes, concentrations and "
     "measurement units were differentiated where supported; unsupported universal "
     "administration instructions were not introduced."),
    ("Traceability and quality controls.",
     "Unique record identifiers, required source references, navigation, search behaviour "
     "and offline content inclusion were evaluated using version-controlled test routines."),
]
for i, (heading, body) in enumerate(items, 1):
    y = para(f'<b>{i:02d}. {heading}</b> {body}', y-11, size=8.42, leading=13.55)

y -= 24
y = section("Evidence base and verification record", y)
y = para(
    "Source mapping refers to resuscitation and emergency-care guidance, including "
    "ERC/Resuscitation Council UK, NICE and GINA materials, where individually referenced. "
    "The underlying review register documents changes, evidence links and pending "
    "checks. <b>Product-specific assessment and independent clinical sign-off remain "
    "outstanding</b> before the material can be treated as an operational medication protocol.",
    y-9, size=8.33, leading=13.65)

# References are identified in the academic prose above, without URLs or link annotations.

if y < 91:
    raise RuntimeError(f"The document exceeds its single-page layout (last baseline {y:.1f})")

line(66)
text(L, 48, "EKAB Spoudi   |   Prehospital Pharmacology Educational Reference", "Body", 7.3, SOFT)
text(PAGE_W-R-36, 48, "1 / 1", "Body", 7.3, SOFT)
c.showPage()
c.save()
print(OUT)
