#!/usr/bin/env python3
"""Generate the full A semester study PDF from the six existing SAEK course HTML files."""
import html, io, json, re, hashlib, argparse
from pathlib import Path
from bs4 import BeautifulSoup, Tag
from PIL import Image as PILImage, ImageOps
import cairosvg
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as PDFImage

ROOT=Path(__file__).resolve().parents[1]
OUTPUT="docs/downloads/EKAB_SAEK_A_Examino_Pliris_Yli_Meletis.pdf"
EXPECTED=[14,13,10,10,14,10]
LICENSES={"Public domain","CC0 1.0","CC BY 2.0","CC BY 2.5","CC BY 3.0","CC BY 4.0","CC BY-SA 2.0","CC BY-SA 2.5","CC BY-SA 3.0","CC BY-SA 4.0"}

def txt(node): return re.sub(r"\s+"," ",node.get_text(" ",strip=True)).strip()
def P(s,style): return Paragraph(html.escape(str(s)),style)
def parse():
    courses=[]
    for number,expected in enumerate(EXPECTED,1):
        soup=BeautifulSoup((ROOT/f"saek-course-{number:02d}.html").read_text(encoding="utf-8"),"html.parser")
        head=soup.select_one("h2.reader-title")
        chapters=soup.select(".reader-chapters > details.reader-fold[id^='lesson-']")
        if not head or len(chapters)!=expected: raise RuntimeError(f"Invalid course {number}, {len(chapters)} chapters")
        rows=[]
        for idx,ch in enumerate(chapters,1):
            if ch.get("id")!=f"lesson-{idx}": raise RuntimeError("Unordered chapters")
            h=ch.select_one(".chapter-heading")
            main=ch.select_one(".reader-layout .reader-main")
            if h is None or main is None: raise RuntimeError(f"Incomplete {number}-{idx}")
            status=h.select_one("small")
            if status: status.decompose()
            lines=[]
            for tag in main.descendants:
                if not isinstance(tag,Tag) or tag.name not in ("p","h3","h4","li"): continue
                if tag.name=="li" and tag.find(("p","h3","h4")): continue
                if any(set(x.get("class",[])) & {"reader-actions","saek-reader-nav","reader-nav","saek-source-section"} for x in [tag,*tag.parents] if isinstance(x,Tag)): continue
                content=txt(tag)
                if not content: continue
                kind="sub" if tag.name.startswith("h") else "body"
                if "lesson-sos" in tag.get("class",[]): kind="sos"
                if "chapter-source-note" in tag.get("class",[]): kind="note"
                lines.append((kind,content))
            if len(" ".join(x[1] for x in lines))<480: raise RuntimeError(f"Chapter {number}-{idx} too short")
            rows.append({"id":idx,"title":txt(h),"content":lines})
        courses.append({"id":number,"title":txt(head),"chapters":rows})
    return courses

def select_image(registry,course_num,chapter_num,skipped):
    course=next((x for x in registry["courses"] if int(x["course"])==course_num),None)
    if not course: return None
    keys=list(course["chapters"][chapter_num-1].get("images") or [])
    # Match live UI policy: 29 crude Anatomy icon sketches are NOT anatomical plates.
    if course_num==1:
        keys=[x for x in keys if not x.startswith("sem_a_1_")]
        if chapter_num==2: keys.append("spine")
        if chapter_num==8: keys.append("brain_medial")
    for key in dict.fromkeys(keys):
        a=registry["assets"].get(key)
        reason=None
        if not a: reason="unknown asset"
        elif a.get("license") not in LICENSES: reason="license not cleared for automated book"
        elif not a.get("author") or not a.get("page"): reason="missing attribution"
        elif not a.get("localPath"): reason="not local"
        else:
            path=(ROOT/a["localPath"]).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file(): reason="file missing or unsafe"
            elif hashlib.sha256(path.read_bytes()).hexdigest()!=a.get("sha256"): reason="hash mismatch"
            else: return key,a,path
        skipped.append({"chapter":f"{course_num:02d}-{chapter_num:02d}","key":key,"reason":reason})
    return None

def raster(path):
    if path.suffix.lower()==".svg":
        original=cairosvg.svg2png(url=str(path),output_width=1300)
        im=PILImage.open(io.BytesIO(original))
    else: im=PILImage.open(path)
    im=ImageOps.exif_transpose(im)
    im.thumbnail((1300,980),PILImage.Resampling.LANCZOS)
    im=im.convert("RGBA")
    bg=PILImage.new("RGB",im.size,"white")
    bg.paste(im,mask=im.getchannel("A"))
    data=io.BytesIO()
    bg.save(data,format="JPEG",quality=86,optimize=True)
    data.seek(0)
    return data,bg.size

def build(target):
    pdfmetrics.registerFont(TTFont("D","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
    pdfmetrics.registerFont(TTFont("DB","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
    def style(name,sz,lead,space=6,bold=False,color="#25384a"):
        return ParagraphStyle(name,fontName="DB" if bold else "D",fontSize=sz,leading=lead,spaceAfter=space,textColor=colors.HexColor(color))
    st={
      "cover":style("cover",24,34,22,True),
      "course":style("course",17,25,18,True,"#0e5878"),
      "chapter":style("chapter",12,19,9,True,"#16445f"),
      "sub":style("sub",10,16,4,True),
      "body":style("body",9.1,15.3,7),
      "sos":style("sos",9.1,15.2,8,True,"#87611a"),
      "note":style("note",7.8,12,9),
      "toc":style("toc",8.7,14.3,4),
      "caption":style("caption",7.8,12,10),
    }
    courses=parse()
    registry=json.loads((ROOT/"saek-image-audit-2026.json").read_text(encoding="utf-8"))
    story=[Spacer(1,85),P("ΕΚΑΒ ΣΠΟΥΔΗ",st["cover"]),P("Α΄ ΕΞΑΜΗΝΟ — ΠΛΗΡΕΣ ΒΙΒΛΙΟ ΜΕΛΕΤΗΣ",st["course"]),
           P("Πλήρη πραγματικά κείμενα των 71 κεφαλαίων, SOS, επεξηγήσεις, ασκήσεις και ενδεικτικές απαντήσεις από τις έξι ενότητες της υπάρχουσας εφαρμογής.",st["body"]),
           Spacer(1,20),
           P("Εκπαιδευτικό υλικό, όχι ανεξάρτητα πιστοποιημένο ιατρικό εγχειρίδιο. Η ύλη και οι εικόνες μπορεί να χρειάζονται επιστημονική επικύρωση. Δεν υποκαθιστά πρακτική διδασκαλία ή τα ισχύοντα πρωτόκολλα.",st["note"]),
           P("Πρόγραμμα: Επίσημος Οδηγός Κατάρτισης Διασώστης – Πλήρωμα Ασθενοφόρου, Σεπτέμβριος 2024.",st["note"]),
           PageBreak(),P("Περιεχόμενα",st["course"])]
    for course in courses:
        story.append(P(f'{course["id"]:02d} {course["title"]}',st["sub"]))
        for chapter in course["chapters"]:
            story.append(P(f'  {chapter["id"]:02d} · {chapter["title"]}',st["toc"]))
    story.append(PageBreak())
    skipped=[]; images=0; figrefs=[]
    for course in courses:
        n=course["id"]
        story.append(P(f'{n:02d} · {course["title"]}',st["course"]))
        for chapter in course["chapters"]:
            k=chapter["id"]
            story.append(P(f'{n:02d}.{k:02d} — {chapter["title"]}',st["chapter"]))
            for kind,value in chapter["content"]:
                story.append(P(value,st[kind]))
            evidence=select_image(registry,n,k,skipped)
            if evidence:
                key,asset,path=evidence
                try:
                    data,(w,h)=raster(path)
                    width=min(465,310*w/h)
                    height=width*h/w
                    image=PDFImage(data,width=width,height=height)
                    image.hAlign="CENTER"
                    story += [Spacer(1,5),image,Spacer(1,5)]
                    cap=f'Εικόνα: {asset.get("title",key)}. {asset.get("caption","")}. Δημιουργός: {asset["author"]}. Άδεια: {asset["license"]}. Πηγή: {asset["page"]}.'
                    story.append(P(cap,st["caption"]))
                    images+=1
                    figrefs.append({"chapter":f"{n:02d}-{k:02d}","key":key,"license":asset["license"],"sha256":asset["sha256"]})
                except Exception as exc:
                    skipped.append({"chapter":f"{n:02d}-{k:02d}","key":key,"reason":f"render: {type(exc).__name__} {str(exc)[:80]}"})
            else:
                story.append(P("Εικόνα: Εκκρεμεί επιλογή με επαληθευμένα δικαιώματα και κατάλληλη ανατομική/επιστημονική ποιότητα.",st["note"]))
        story.append(PageBreak())
    target.parent.mkdir(parents=True,exist_ok=True)
    doc=SimpleDocTemplate(str(target),pagesize=A4,leftMargin=45,rightMargin=45,topMargin=52,bottomMargin=46,
                          title="ΕΚΑΒ Σπουδή - Α΄ Εξάμηνο - Πλήρες βιβλίο μελέτης",
                          author="ΕΚΑΒ Σπουδή — αναπαραγωγή υπάρχουσας εκπαιδευτικής ύλης")
    def footer(canvas,doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#4d6477"))
        canvas.setFont("D",7.4)
        canvas.drawString(45,29,"ΕΚΑΒ Σπουδή · Α΄ εξάμηνο · εκπαιδευτικό υλικό")
        canvas.drawRightString(A4[0]-45,29,str(doc.page))
        canvas.restoreState()
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    report={"courses":len(courses),"chapters":sum(len(c["chapters"]) for c in courses),
            "figures_included":images,"figure_refs":figrefs,"figures_skipped":skipped,
            "bytes":target.stat().st_size}
    target.with_suffix(".json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({key:val for key,val in report.items() if key not in ("figure_refs","figures_skipped")},ensure_ascii=False))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",default=OUTPUT)
    args=parser.parse_args()
    build((ROOT/args.out).resolve())
