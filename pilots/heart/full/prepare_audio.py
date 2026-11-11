"""Greek narration and precise scene timing for the review-only lesson."""
import asyncio,json,os,subprocess,sys,math
from pathlib import Path
import edge_tts
home=Path(__file__).resolve().parent.parent
scenes=json.loads((home/'full'/'scenes.json').read_text(encoding='utf-8'))
out=home/'public'/'audio';out.mkdir(parents=True,exist_ok=True)
FPS=24
async def speak(scene):
    dest=out/(scene['id']+'.mp3')
    last=None
    for attempt in range(3):
        try:
            voice=edge_tts.Communicate(scene['narration'],voice='el-GR-AthinaNeural',rate='-6%',volume='+0%')
            await voice.save(str(dest))
            if dest.stat().st_size<500:raise RuntimeError('Empty audio')
            return dest
        except Exception as error:
            last=error
            await asyncio.sleep((attempt+1)*2)
    raise RuntimeError('Greek narration failed for '+scene['id']+': '+repr(last))
async def main():
    start=0;sections=[]
    for scene in scenes:
        dest=await speak(scene)
        probe=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(dest)],text=True).strip()
        sec=float(probe)
        if not (5<sec<100):raise ValueError('Invalid audio length '+repr((scene['id'],sec)))
        frames=math.ceil((sec+2.2)*FPS)
        sections.append({'id':scene['id'],'startFrame':start,'frames':frames,'audioSeconds':sec})
        start+=frames
        print('VOICE_OK',scene['id'],round(sec,2),'sec',flush=True)
    timing={'fps':FPS,'totalFrames':start,'sections':sections}
    (home/'full'/'timing.json').write_text(json.dumps(timing,ensure_ascii=False,indent=2),encoding='utf-8')
    print('LESSON_DURATION',round(start/FPS,2),'seconds')
asyncio.run(main())
