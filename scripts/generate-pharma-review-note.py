#!/usr/bin/env python3
"""Generate four clearly attributed, single-page academic EDUCATIONAL review memos.

Review statements describe a documentary/editorial appraisal and its limits.
No claim is made of independent clinical certification or external endorsement.
"""
from pathlib import Path
from html import escape
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs"
OUT.mkdir(parents=True, exist_ok=True)
F = Path("/usr/share/fonts/truetype/dejavu")
for face, filename in [
    ("AcademicSerif","DejaVuSerif.ttf"),
    ("AcademicSerifBold","DejaVuSerif-Bold.ttf"),
    ("AcademicSans","DejaVuSans.ttf"),
    ("AcademicSansBold","DejaVuSans-Bold.ttf"),
]:
    pdfmetrics.registerFont(TTFont(face,str(F / filename)))
pdfmetrics.registerFontFamily("AcademicSerif",normal="AcademicSerif",bold="AcademicSerifBold")
pdfmetrics.registerFontFamily("AcademicSans",normal="AcademicSans",bold="AcademicSansBold")

NAVY=HexColor("#1b3040")
BLUE=HexColor("#24536a")
GREY=HexColor("#586a75")
LT=HexColor("#c5d0d7")
GOLD=(166/255,130/255,80/255)
BURGUNDY=(122/255,67/255,74/255)
INK=(30/255,55/255,73/255)
ANNOTATION_GREY=(104/255,118/255,128/255)
W,H=A4
M=50
CW=W-2*M

REPORTS=[
 dict(file="saek-academic-review.pdf",
 title="Ambulance Rescuer Vocational Education",
 subtitle="SAEK EKAB | Academic Content Review",
 scope="Four-semester educational structure  |  247 study chapters  |  Chapter-based assessment and learning progress",
 sections=[
 ("REVIEW PURPOSE","This memorandum records a preliminary academic and editorial examination of the SAEK EKAB study area, comprising structured course chapters, formative self-assessment and learner progress functions. The purpose is to assess curriculum organisation, terminological coherence and the transparency of clinical teaching boundaries, rather than to certify each scientific statement."),
 ("AUTHORITATIVE DOCUMENTS CONSULTED","The principal external comparators were the Greek vocational training guide for the specialty “Ambulance Rescuer–Ambulance Crew” (September 2024), published through EKAB, and the EKAB information and teaching-framework notices for SAEK trainees. The European Resuscitation Council (ERC) Guidelines 2025 were additionally consulted for the relevant resuscitation domains. These sources have different purposes and must not be treated as interchangeable."),
 ("OBSERVATIONS FROM THE APPLICATION","The application presents four semesters with 247 educational chapters and chapter-linked revision activities. Course grouping and navigational structure can be inspected directly. However, the existence of a chapter, an explanatory image or a self-test does not demonstrate that its full clinical text is up to date. Special attention is required when historic educational material intersects with newer clinical guidance, Greek professional competence and current institutional teaching requirements."),
 ("REVIEW PRIORITIES AND REMAINING VERIFICATION","An accountable item-level review should document, for each chapter, the controlling source, the latest applicable recommendation, the accuracy of anatomical figures, the distinction between initial and advanced interventions, and any change from earlier editions. The September 2024 training guide is a curriculum reference, not blanket clinical approval of the site. A complete independent specialist sign-off has not been established."),
 ("ACADEMIC POSITION","The material may support structured learning and revision. Educational alignment and clinical verification are separate requirements; practical competence must be assessed through authorised training and supervision."),
 ]),
 dict(file="eoppep-academic-review.pdf",
 title="Professional Certification Examination Preparation",
 subtitle="EOPPEP | Theory and Practical Examination Review",
 scope="314 theory-question entries  |  12 practical skills  |  6 practice scenarios  |  24 listed equipment items",
 sections=[
 ("REVIEW PURPOSE","This memorandum records an editorial appraisal of the EOPPEP examination-preparation environment, including its theoretical question reader, practical skills, scenario-based exercises and equipment familiarisation. The review distinguishes reproduction of examination material from the separate scientific validation of explanatory answers and contemporary clinical procedures."),
 ("EXAMINATION MATERIAL AND CLINICAL COMPARATORS","The site displays a 314-entry theoretical question catalogue and a practical-training presentation describing 12 skills, six scenarios and 24 equipment items. Historical examination pages reproduced in the practical module provide context for the format. The ERC Guidelines 2025 were consulted as an external comparator for applicable resuscitation and first-aid subjects; such guidelines do not establish the current administrative status of an EOPPEP examination question."),
 ("EDITORIAL FINDINGS","Theoretical preparation, model answers, personal notes and source commentary are presented as distinct study functions. Practical scenarios are arranged to support stepwise rehearsal. A documented review should evaluate whether every model answer actually addresses its examination question, whether practical sequences respect contemporary clinical recommendations, and whether equipment descriptions reflect the examined source rather than unsupported extrapolation."),
 ("LIMITATIONS AND REQUIRED VALIDATION","No exhaustive question-by-question official EOPPEP equivalence audit or independent clinical sign-off was demonstrated by this desk review. Particular scrutiny is required where older examination wording differs from modern resuscitation practice or where a procedural step is dependent on training level, medical direction or authorised scope of practice. Historic examination content should be identified as such."),
 ("ACADEMIC POSITION","This is a structured learning aid for examination preparation. It is not a statement that the provider, examination body or any professional regulator has endorsed the educational answers."),
 ]),
 dict(file="pharmacology-review-status-2026-10-26.pdf",
 title="Prehospital Pharmacology",
 subtitle="Academic Content Review and Evidence-Mapping Summary",
 scope="76 instructional records  |  11 clinical subject areas  |  21 specifically mapped records",
 sections=[
 ("REVIEW PURPOSE","This memorandum examines the documentary status of the prehospital pharmacology study collection, with emphasis on structured record completeness, pharmacological precautions, source mapping, high-risk distinctions and the separation between educational content and authorised medication practice."),
 ("CLINICAL FRAMEWORKS CONSULTED","Comparative reference material included the ERC Guidelines 2025 and the National Institute for Health and Care Excellence (NICE) major-trauma guideline NG39. The repository also records targeted references to condition-specific guidance. These international documents inform clinical interpretation but do not substitute for an approved product-specific Summary of Product Characteristics, Greek regulatory requirements or authorised local medication procedures."),
 ("DOCUMENTED CONTENT STATUS","The application identifies 76 instructional records arranged into 11 groups. Twenty-one have more specific clinical-guidance mapping; the remaining 55 are identified in the project audit as requiring further product-level and operational cross-checking. The content architecture includes mechanism, context, cautions, interactions, special populations and professional limitations. Such fields permit scrutiny but do not by themselves prove that every value has been verified."),
 ("RISK-FOCUSED OBSERVATIONS","Clinical interpretation should distinguish adrenaline used in cardiac arrest from adrenaline used in anaphylaxis, adult from paediatric regimens, and trauma-related tranexamic acid guidance from separate head-injury indications. NICE NG39 cautions against routine intravenous tranexamic acid beyond three hours after major traumatic injury except in the specified hyperfibrinolysis context. Individual products, concentrations, storage requirements and local authorisation remain validation priorities."),
 ("ACADEMIC POSITION","The site contains an educational pharmacology reference, not a standing-order formulary. Independent specialist clinical approval remains outstanding; no blanket medication-administration authorisation is implied."),
 ]),
 dict(file="seminars-academic-review.pdf",
 title="Resuscitation and Trauma Seminar Preparation",
 subtitle="BLS/AED · PBLS · ILS · ALS · PHTLS | Academic Review",
 scope="Five study programmes  |  12 thematic units per programme  |  Recall questions and oral-practice prompts",
 sections=[
 ("REVIEW PURPOSE","This memorandum considers the educational organisation of the seminar-preparation area, which offers structured revision across basic, paediatric, immediate and advanced life-support themes together with trauma-focused learning. The purpose is to document curriculum distinctions and responsible presentation, without suggesting participation in or completion of an accredited provider course."),
 ("EXTERNAL FRAMEWORKS CONSULTED","The European Resuscitation Council (ERC) Guidelines 2025 and the ERC descriptions of BLS, PBLS, ILS and ALS provider courses were consulted for scope and level. ERC course guidance distinguishes foundational lay-rescuer skills from advanced professional interventions. PHTLS belongs to a different training framework associated with the National Association of Emergency Medical Technicians (NAEMT); it must not be represented as an ERC certification."),
 ("OBSERVATIONS FROM THE APPLICATION","The interface describes five separate preparation programmes, each organised into 12 thematic units with recall and oral-practice exercises. This structure supports progressive revision and repeated retrieval practice. It does not, however, establish fidelity to the current proprietary course manuals, demonstration standards, instructor assessments or the latest local course-provider requirements."),
 ("PRIORITY CROSS-CHECKS","Before making any claim of course equivalence, every unit should be compared with the most recent applicable provider curriculum, algorithm and competency specification. Key areas include adult versus paediatric resuscitation, AED safety, team-role escalation, advanced airway procedures, scenario evaluation and trauma-specific decision-making. The limits of self-study relative to supervised practical assessment must remain explicit."),
 ("ACADEMIC POSITION","These are independent preparatory study materials. They do not confer ERC or NAEMT certification, replicate official attendance or assessment, or represent an endorsement from any named educational organisation."),
 ])
]

def make_report(rep):
    dest=OUT / rep["file"]
    tmp=OUT / (rep["file"]+".base.pdf")
    c=canvas.Canvas(str(tmp),pagesize=A4,pageCompression=1)
    c.setTitle(rep["title"] + " | Academic Review Memorandum")
    c.setAuthor("EKAB Spoudi | Educational Content")
    c.setSubject("Documentary educational review; no independent clinical certification implied")
    def label(x,y,s,sz=9,font="AcademicSans",color=NAVY):
        c.setFillColor(color);c.setFont(font,sz);c.drawString(x,y,s)
    def line(y,width=.6,color=LT):
        c.setStrokeColor(color);c.setLineWidth(width);c.line(M,y,W-M,y)
    def paragraph(s,at,font="AcademicSerif",size=9.15,lead=15.25):
        st=ParagraphStyle("academic",fontName=font,fontSize=size,leading=lead,
                          textColor=NAVY,splitLongWords=False)
        p=Paragraph(escape(s),st)
        _,h=p.wrap(CW,1300);p.drawOn(c,M,at-h)
        return at-h
    label(M,H-57,"EKAB SPOUDI",13.5,"AcademicSerifBold")
    label(M,H-75,"EDUCATIONAL MATERIAL  /  ACADEMIC REVIEW MEMORANDUM",7.45,"AcademicSans",GREY)
    line(H-88,1.1,BLUE)
    y=H-120
    label(M,y,rep["title"],14.2,"AcademicSerifBold")
    y-=23
    label(M,y,rep["subtitle"],9.4,"AcademicSerif",BLUE)
    y-=23
    y=paragraph(rep["scope"],y,font="AcademicSans",size=8.05,lead=12.6)
    y-=15
    line(y)
    y-=25
    for heading,body in rep["sections"]:
        label(M,y,heading,8.55,"AcademicSansBold",BLUE)
        y-=7.5
        y=paragraph(body,y,size=9.15,lead=15.25)
        y-=20
    if y < 78:
        raise RuntimeError(f"Body overlaps footer: {rep['file']} = {y:.1f}")
    line(65)
    label(M,47,"EKAB Spoudi  |  Educational source review; independent certification not implied",6.95,"AcademicSans",GREY)
    label(W-M-32,47,"1 / 1",7.1,"AcademicSans",GREY)
    c.showPage()
    c.save()

    d=fitz.open(str(tmp))
    page=d[0]
    script=Path("/usr/share/fonts/opentype/urw-base35/Z003-MediumItalic.otf")
    if script.exists():
        page.insert_font(fontname="EditorialScript",fontfile=str(script))
        scriptface="EditorialScript"
    else:
        fallback=F / "DejaVuSerif-Italic.ttf"
        page.insert_font(fontname="EditorialScript",fontfile=str(fallback))
        scriptface="EditorialScript"
    page.draw_line((50,88.2),(122,88.2),color=GOLD,width=1.45,overlay=True)
    page.draw_line((325,702),(325,765),color=GOLD,width=1.2,overlay=True)
    page.insert_text((341,710),"EDITORIAL RECORD",fontname="hebo",fontsize=8,color=INK,overlay=True)
    page.insert_text((337,741),"EKAB Spoudi",fontname=scriptface,fontsize=26,color=BURGUNDY,overlay=True)
    shape=page.new_shape()
    shape.draw_bezier(fitz.Point(351,748),fitz.Point(389,754),fitz.Point(450,747),fitz.Point(476,750))
    shape.finish(color=GOLD,width=.8)
    shape.commit(overlay=True)
    page.insert_text((341,764),"Educational content preparation",fontname="helv",fontsize=7.7,color=ANNOTATION_GREY,overlay=True)
    d.save(str(dest),garbage=4,deflate=True)
    d.close()
    tmp.unlink()
    check=fitz.open(str(dest))
    assert len(check)==1, rep["file"]
    assert not check[0].get_links(), "PDF must contain no embedded links"
    text_content=check[0].get_text()
    assert "EKAB Spoudi" in text_content
    assert "independent" in text_content.lower()
    assert "http://" not in text_content and "https://" not in text_content
    check.close()
    print(dest)

for report in REPORTS:
    make_report(report)
