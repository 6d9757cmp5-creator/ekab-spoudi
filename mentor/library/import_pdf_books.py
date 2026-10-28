#!/usr/bin/env python3
"""Extract full source-attributed text from official PDF manuals (review-only corpus).
Downloaded PDF bytes are not redistributed; extracted text requires license compliance.
"""
import hashlib,json,re,urllib.request,time
from pathlib import Path
import fitz  # PyMuPDF

ROOT=Path("mentor/library/corpus")
MAX=210*1024*1024
PDFS=[
  {
    "source_id":"who-bec",
    "title":"WHO-ICRC Basic Emergency Care: Participant Workbook",
    "page_url":"https://www.who.int/publications/i/item/9789241513081",
    "candidate_urls":[
      "https://hlh.who.int/docs/librariesprovider4/hlh-documents/who-icrc-basic-emergency-care.pdf?sfvrsn=4460e22e_5",
      "https://iris.who.int/server/api/core/bitstreams/63432b9f-8808-44c5-9692-cea717c0cbda/content",
    ],
    "license":"CC BY-NC-SA 3.0 IGO (non-commercial; attribution, share-alike, no WHO/ICRC endorsement or logo)",
    "minimum_pages":170,"minimum_words":28000,
  },
  {
    "source_id":"medical-surgical-nursing",
    "title":"Medical-Surgical Nursing",
    "page_url":"https://uotinitiative.org/en-medical-surgical-nursing-5ui64",
    "candidate_urls":["https://assets.openstax.org/oscms-prodcms/media/documents/Medical-Surgical_Nursing-WEB.pdf"],
    "license":"Book states CC BY 4.0; verify current publisher AI re-use terms and third-party exclusions before deployment",
    "minimum_pages":400,"minimum_words":60000,
  },
]
def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; educational reference ingest/1.0)","Accept":"application/pdf,*/*"})
    with urllib.request.urlopen(req,timeout=95) as f:
        data=f.read(MAX+1)
    if len(data)>MAX:raise ValueError("PDF exceeded 210MiB safety cap")
    if not data[:8].startswith(b"%PDF-"):raise ValueError("Downloaded resource is not a PDF")
    return data

def split_text(text,maxlen=7000):
    text=re.sub(r"\r\n?","\n",text)
    text=re.sub(r"[\t ]+"," ",text)
    text=re.sub(r"\n{3,}","\n\n",text)
    out=[]
    while text.strip():
        if len(text)<=maxlen:
            part=text.strip();text=""
        else:
            point=text.rfind("\n",maxlen//2,maxlen)
            if point<maxlen//2:point=text.rfind(" ",maxlen//2,maxlen)
            if point<maxlen//2:point=maxlen
            part=text[:point].strip();text=text[point:].lstrip()
        if len(part)>=30:out.append(part)
    return out

def acquire(meta):
    errors=[]
    data,used=None,None
    for url in meta["candidate_urls"]:
        try:
            data=get(url);used=url;break
        except Exception as e:
            errors.append(url+": "+str(e))
    if data is None:raise RuntimeError("All official publisher links failed: "+"; ".join(errors))
    pdf=fitz.open(stream=data,filetype="pdf")
    if pdf.page_count<meta["minimum_pages"]:raise ValueError("Incomplete PDF: "+str(pdf.page_count))
    passages=[]
    for page_number,page in enumerate(pdf,start=1):
        text=page.get_text("text",sort=True).strip()
        for part_idx,part in enumerate(split_text(text)):
            passages.append({
              "id":f"{meta['source_id']}-p{page_number:04d}-{part_idx:02d}",
              "source_id":meta["source_id"],"title":meta["title"],
              "section":f"PDF page {page_number}","text":part,
              "source_url":meta["page_url"],"review_status":"draft","topics":[],
            })
    words=sum(len(re.findall(r"\w+",p["text"])) for p in passages)
    if words<meta["minimum_words"]:raise ValueError(f"Too few words: {words}")
    result={"schema_version":1,"source_id":meta["source_id"],"title":meta["title"],
       "origin":meta["page_url"],"extraction_source":used,
       "download_bytes":len(data),"chapter_files":pdf.page_count,
       "passage_count":len(passages),"word_count":words,
       "licence":meta["license"],"scientific_review":"pending",
       "model_training":"not performed","media_and_illustrations_included":False,
       "passages":passages}
    out=ROOT/(meta["source_id"]+".json")
    out.write_text(json.dumps(result,ensure_ascii=False,indent=1)+"\n",encoding="utf-8")
    result["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    return {k:v for k,v in result.items() if k!="passages"}

def main():
    manifest_path=ROOT/"manifest.json"
    manifest=json.loads(manifest_path.read_text())
    existing={x["source_id"]:x for x in manifest["books"]}
    errors=[]
    for meta in PDFS:
        try:
            info=acquire(meta);existing[meta["source_id"]]=info
            print("IMPORTED",info["source_id"],"pages",info["chapter_files"],"words",info["word_count"],flush=True)
        except Exception as e:
            errors.append((meta["source_id"],str(e)))
            print("FAILED",meta["source_id"],str(e),flush=True)
    if errors:raise SystemExit("Incomplete PDF import: "+repr(errors))
    manifest["books"]=list(existing.values())
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Complete:",len(manifest["books"]),"full-text sources")

if __name__=="__main__":main()
