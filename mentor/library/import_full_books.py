#!/usr/bin/env python3
"""Acquire authorized open textbooks from publisher exports; generate source-attributed text.
This script DOES NOT certify medical content or train an AI. No secrets required.
"""
import concurrent.futures
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path

OUT = Path("mentor/library/corpus")
BOOKS = [
    ("wistech-emr-2025", "Emergency Medical Responder", "https://wtcs.pressbooks.pub/emergencymedtech/"),
    ("openrn-health", "Health Alterations", "https://wtcs.pressbooks.pub/healthalts/"),
    ("openrn-skills", "Nursing Skills 2e", "https://wtcs.pressbooks.pub/nursingskills/"),
    ("openrn-pharm", "Nursing Pharmacology 2e", "https://wtcs.pressbooks.pub/pharmacology2e/"),
]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EKAB-Spoudi-Mentor-Research/1.0; educational open license)",
    "Accept": "application/zip,application/epub+zip,application/xhtml+xml,text/html,*/*",
}
MAX_DOWNLOAD = 120 * 1024 * 1024
SKIP = {"script", "style", "nav", "footer", "aside", "noscript", "svg"}

def get(url, attempts=2):
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=32) as r:
                raw = r.read(MAX_DOWNLOAD + 1)
                if len(raw) > MAX_DOWNLOAD:
                    raise ValueError("Download too large")
                return raw, r.url
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(1.5)
    raise RuntimeError("Unreachable")

class Cleaner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignore = 0
        self.block = []
        self.started = 0
        self.heading = ""
        self.in_heading = False
    def handle_starttag(self, tag, attrs):
        if tag in SKIP:
            self.ignore += 1
        if not self.ignore:
            if tag in ("p", "li", "tr", "td", "th", "h1", "h2", "h3", "h4", "br", "blockquote", "section"):
                self.parts.append("\n")
            if tag in ("h1", "h2") and not self.heading:
                self.in_heading = True
    def handle_endtag(self, tag):
        if tag in SKIP and self.ignore:
            self.ignore -= 1
        if not self.ignore:
            if tag in ("p", "li", "tr", "th", "td", "h1", "h2", "h3", "h4"):
                self.parts.append("\n")
            if tag in ("h1", "h2"):
                self.in_heading = False
    def handle_data(self, data):
        if not self.ignore:
            self.parts.append(data)
            if self.in_heading:
                self.heading += data

def text_from_xhtml(payload):
    parser = Cleaner()
    try:
        parser.feed(payload.decode("utf-8", errors="replace"))
    except Exception as e:
        raise ValueError(f"Invalid XHTML: {e}")
    text = html.unescape("".join(parser.parts))
    lines = [re.sub(r"[ \t\r\f\v]+", " ", l).strip() for l in text.splitlines()]
    text = "\n".join(l for l in lines if l)
    return text, re.sub(r"\s+", " ", parser.heading).strip()

def chunks(text, limit=6800):
    """Character-bounded chunks preserving paragraph boundaries."""
    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]
    result, buf = [], ""
    for p in paragraphs:
        while len(p) > limit:
            cut = p.rfind(" ", 0, limit)
            if cut < 200: cut = limit
            if buf:
                result.append(buf)
                buf = ""
            result.append(p[:cut].strip())
            p = p[cut:].strip()
        if len(buf) + len(p) + 1 > limit:
            if buf: result.append(buf)
            buf = ""
        buf = (buf + "\n" + p).strip()
    if buf: result.append(buf)
    return [t for t in result if len(t) >= 30]

def extract_zip(raw):
    entries = []
    with zipfile.ZipFile(BytesIO(raw)) as z:
        for item in z.infolist():
            name = item.filename
            if name.startswith("__MACOSX/") or not name.lower().endswith((".xhtml", ".html", ".htm")):
                continue
            if item.file_size > 4_000_000:
                continue
            data = z.read(item)
            content, heading = text_from_xhtml(data)
            # Discard navigation-only pages; do not count as chapters.
            if len(content) < 150:
                continue
            entries.append((name, heading or Path(name).stem, content))
    return entries

class ChapterLinkParser(HTMLParser):
    def __init__(self, base):
        super().__init__()
        self.base = base
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href", "")
        if re.match(r"^https?://", href):
            link = href
        elif href.startswith("/"):
            from urllib.parse import urljoin
            link = urljoin(self.base, href)
        else:
            return
        if link.startswith(self.base) and re.search(r"/(chapter|front-matter|back-matter)/", link):
            self.links.append(link.split("#")[0].split("?")[0])

def fallback_chapters(home):
    raw, _ = get(home)
    parser = ChapterLinkParser(home)
    parser.feed(raw.decode("utf-8", errors="replace"))
    links = list(dict.fromkeys(parser.links))
    if not links:
        raise RuntimeError("No chapter links in official table of contents")
    print("Using publisher web chapters:", len(links), flush=True)
    def download(pair):
        i, url = pair
        try:
            data, _ = get(url)
            # Extract article / entry-content rather than site navigation.
            document = data.decode("utf-8", errors="replace")
            found = re.search(r'<(?:div|section|article)[^>]*class="[^"]*(?:entry-content|chapter-content)[^"]*"[^>]*>(.*?)(?:</(?:article|section)>|<div[^>]*class="[^"]*(?:entry-footer|chapter-footer))',document,flags=re.S|re.I)
            if found:
                document = found.group(1)
            txt, heading = text_from_xhtml(document.encode("utf-8"))
            return (f"chapter/{i:04d}", heading or url.rsplit("/",2)[-2], txt, url)
        except Exception as e:
            print("CHAPTER ERROR", url, str(e), flush=True)
            return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        chapters = list(pool.map(download, enumerate(links)))
    chapters = [c for c in chapters if c and len(c[2]) > 150]
    if len(chapters) < max(3, len(links)//2):
        raise RuntimeError(f"Only {len(chapters)}/{len(links)} chapters fetched; refusing incomplete ingestion")
    return chapters

def acquire(source_id, title, home):
    data, used_url, errors = None, None, []
    entries = []
    for kind in ("xhtml", "epub"):
        url = home.rstrip("/") + "/open/download?type=" + kind
        try:
            data, used_url = get(url)
            if data[:2] == b"PK":
                entries = extract_zip(data)
            elif b"<html" in data[:2500].lower():
                text, heading = text_from_xhtml(data)
                entries = [("whole-book", heading or title, text)]
            else:
                raise RuntimeError("Not a ZIP/XHTML export")
            if sum(len(e[2]) for e in entries) < 15000:
                raise RuntimeError("Export unexpectedly short")
            entries = [(name, heading, txt, home) for name, heading, txt in entries]
            break
        except Exception as e:
            errors.append(kind + ": " + str(e))
            entries = []
    if not entries:
        print("Exports failed",source_id,errors,flush=True)
        entries = fallback_chapters(home)
        used_url=home
    passages = []
    for file_idx, (name, heading, body, origin) in enumerate(entries):
        for chunk_idx, content in enumerate(chunks(body)):
            passages.append({
                "id": f"{source_id}-{file_idx:04d}-{chunk_idx:04d}",
                "source_id": source_id,
                "title": heading or title,
                "section": name,
                "text": content,
                "source_url": origin,
                "review_status": "draft",
                "topics": [],
            })
    if len(passages) < 10:
        raise RuntimeError(f"{source_id} only {len(passages)} passages; book likely incomplete")
    words=sum(len(re.findall(r"\w+",p["text"])) for p in passages)
    OUT.mkdir(parents=True,exist_ok=True)
    result={"schema_version":1,"source_id":source_id,"title":title,"origin":home,
       "extraction_source":used_url,"download_bytes":len(data) if data else None,
       "chapter_files":len(entries),"passage_count":len(passages),"word_count":words,
       "licence":"CC BY 4.0 (check separately credited third-party content)",
       "scientific_review":"pending","model_training":"not performed","passages":passages}
    output=OUT/(source_id+".json")
    output.write_text(json.dumps(result,ensure_ascii=False,indent=1)+"\n",encoding="utf-8")
    result["sha256"]=hashlib.sha256(output.read_bytes()).hexdigest()
    return {k:v for k,v in result.items() if k != "passages"}

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest={"schema_version":1,"generation":"source-attributed full-text extraction; clinical review pending","books":[],"errors":[]}
    for book in BOOKS:
        try:
            info=acquire(*book)
            manifest["books"].append(info)
            print("IMPORTED",info["source_id"],"passages",info["passage_count"],"words",info["word_count"],flush=True)
        except Exception as e:
            print("FAILED",book[0],repr(e),flush=True)
            manifest["errors"].append({"source_id":book[0],"message":str(e)})
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if len(manifest["books"]) != len(BOOKS):
        raise SystemExit(f"Incomplete import: {len(manifest['books'])}/{len(BOOKS)}")
    print("SUCCESS: imported all",len(manifest["books"]),"books.")

if __name__ == "__main__":
    main()
