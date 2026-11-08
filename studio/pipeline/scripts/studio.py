#!/usr/bin/env python3
"""Local 2D horror production: inventory, shots, Piper speech, HyperFrames, QA.
All project text is UTF-8. No remote API, automatic model download or pip install.
"""
import argparse, hashlib, html, importlib.util, json, math, os, re, shutil, subprocess, sys, time, unicodedata, urllib.request, wave
from pathlib import Path
from speech_sync import normalize_dialogues,fragments,render_fragments,envelope,measured_tracks

SKILL=Path(__file__).resolve().parent.parent
SETTINGS={"warehouse","village","room","balcony","hallway","street","courtyard","altar","kitchen"}
ACTIONS={"idle","walk","talk","sit","point","scared","sleep","float"}
CAST={
 "main":{"name":"Minh","hair":"short","hairColor":"#292c35","skin":"#ead8b8","shirt":"#70847d","pants":"#3d4d60"},
 "neighbor":{"name":"Lan","hair":"long","hairColor":"#30303b","skin":"#ecd9c4","shirt":"#b99b9d","pants":"#5d5869","accessory":"scarf"},
 "elder":{"name":"Bà","hair":"elder","hairColor":"#cbc9bc","skin":"#d9c5a7","shirt":"#939780","pants":"#505750"},
 "ghost":{"name":"Bóng người","hair":"long","hairColor":"#262c38","skin":"#bdc9be","shirt":"#c5c8ba","pants":"#5d6570"}
}
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8');tmp.replace(p)
def config(args):
 c=read(SKILL/'assets/local-defaults.json')
 if getattr(args,'config',None):c.update(read(args.config))
 return c
def ffmpeg_exe():
 override=os.environ.get('STORY_FFMPEG')
 if override:
  if not Path(override).is_file():raise ValueError('STORY_FFMPEG path missing.')
  return override
 try:
  import imageio_ffmpeg
  return imageio_ffmpeg.get_ffmpeg_exe()
 except ImportError:return shutil.which('ffmpeg') or 'ffmpeg'
def run(cmd,**kw):
 cmd=[str(x) for x in cmd]
 if cmd[0]=='ffmpeg':cmd[0]=ffmpeg_exe()
 for attempt in range(2):
  result=subprocess.run(cmd,capture_output=True,encoding='utf-8',errors='replace',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0),**kw)
  if result.returncode not in (3221225477,-1073741819) or attempt:break
  # This machine has demonstrated intermittent Windows native startup faults.
  # Only retry this specific exit code once, never media/format errors.
  time.sleep(.3)
 if result.returncode:raise RuntimeError('Command failed ('+str(result.returncode)+'): '+str(cmd[0])+'\n'+(result.stderr or result.stdout)[-3500:])
 return result.stdout
def probe(file):
 return json.loads(run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate','-of','json',file]))
def digest(obj):return hashlib.sha256(json.dumps(obj,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def env_for(project,c):
 temp=Path(project)/'cache';temp.mkdir(parents=True,exist_ok=True)
 return {**os.environ,'TEMP':str(temp),'TMP':str(temp),'HYPERFRAMES_BROWSER_PATH':c['browser'],'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','DO_NOT_TRACK':'1','STORY_WORKSPACE':c['workspace'],'HYPERFRAMES_FFMPEG_PATH':ffmpeg_exe()}
def voices(c):
 result={}
 for folder in c['voice_dirs']:
  for model in Path(folder).glob('*.onnx'):
   if Path(str(model)+'.json').exists():result.setdefault(model.stem,model.resolve())
 return result
def doctor(c):
 report={'python':sys.executable,'paths':{},'python_modules':{},'voices':{},'local_ai':{},'notes':[]}
 for k in ['workspace','node','hyperframes','gsap','browser','llama_server','llm_model']:report['paths'][k]={'path':c[k],'exists':Path(c[k]).exists()}
 for m in ['piper','onnxruntime','PIL','optimum','openvino']:report['python_modules'][m]=importlib.util.find_spec(m) is not None
 report['voices']={k:{'path':str(v),'bytes':v.stat().st_size} for k,v in voices(c).items()}
 report['image_models']=[{'path':p,'available':(Path(p)/'model_index.json').exists()} for p in c['image_models']]
 for exe in ['ffmpeg','ffprobe']:report['paths'][exe]={'path':shutil.which(exe),'exists':bool(shutil.which(exe))}
 try:report['local_ai']=request(c['llm_url']+'/health',timeout=2)
 except Exception:report['local_ai']={'available':False,'hint':'Run start-ai, or use --ai off / write storyboard manually.'}
 report['notes']=['Model names are local filenames, not proof of an authentic human voice.','CPU / Intel graphics: use cutout animation; image generation is optional and runs separately.']
 print(json.dumps(report,ensure_ascii=False,indent=2));return report
def request(url,payload=None,timeout=180):
 # Restrict this helper to loopback services; no cloud fallback.
 from urllib.parse import urlparse
 if urlparse(url).hostname not in ['localhost','127.0.0.1','::1']:raise ValueError('Only localhost AI endpoints are supported.')
 data=None if payload is None else json.dumps(payload,ensure_ascii=False).encode()
 req=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=timeout) as r:return json.load(r)
def start_ai(args,c):
 if not Path(c['llama_server']).is_file() or not Path(c['llm_model']).is_file():raise ValueError('Local llama.cpp or Qwen model missing; run doctor.')
 try:
  request(c['llm_url']+'/health',timeout=2);print('Local AI already running.');return
 except Exception:pass
 from urllib.parse import urlparse
 u=urlparse(c['llm_url']);port=u.port or 8080
 if u.hostname not in ['localhost','127.0.0.1']:raise ValueError('start-ai requires a loopback URL.')
 logdir=Path(args.output).resolve();logdir.mkdir(parents=True,exist_ok=True)
 with open(logdir/'llama.log','ab') as log:
  proc=subprocess.Popen([c['llama_server'],'-m',c['llm_model'],'--host','127.0.0.1','--port',str(port),'-c','4096','-np','1','-t','4','-b','128','-ub','128','--jinja'],stdout=log,stderr=log,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 write(logdir/'llama-process.json',{'pid':proc.pid,'url':c['llm_url'],'model':c['llm_model']});print(f'Started PID {proc.pid}. Loading can take minutes; log: {logdir / "llama.log"}')
def normalized(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()).replace('đ','d') if unicodedata.category(c)!='Mn')
def segments(text,max_chars=270):
 chunks=[]
 for para in re.split(r'\n\s*\n',text.strip()):
  for sentence in re.split(r'(?<=[.!?…])\s+',para.strip()):
   if not sentence:continue
   words=sentence.split();part=[]
   for word in words:
    if part and len(' '.join(part+[word]))>max_chars:chunks.append(' '.join(part));part=[]
    part.append(word)
   if part:chunks.append(' '.join(part))
 return chunks
def infer(text,i):
 n=normalized(text);setting='room'
 for terms,value in [(['ban cong','lan can'],'balcony'),(['hanh lang','cau thang'],'hallway'),(['ban tho','di anh','bat huong'],'altar'),(['ngoai duong','con duong','di cho','xe may'],'street'),(['san nha','san truong','goc cay'],'courtyard'),(['bep','noi com'],'kitchen')]:
  if any(x in n for x in terms):setting=value;break
 action='walk' if any(v in n for v in ['buoc','di vao','di ra','chay','tien lai']) else 'scared' if any(v in n for v in ['so hai','run ray','giat minh','hoang hot']) else 'sit' if 'ngoi' in n else 'talk' if any(v in n for v in ['noi','hoi','bao','goi']) else 'idle'
 ids=['main'];
 if any(v in n for v in ['co ay','hang xom','co gai']) or re.search(r'\blan\b',n):
  if not (setting=='altar' and any(v in n for v in ['anh','di anh'])):ids.append('neighbor')
 if any(v in n for v in ['ba toi','ba lao','ba cu','ba noi']):ids.append('elder')
 if any(v in n for v in ['bong trang','bong nguoi','hon ma']):ids.append('ghost')
 positions=[340,900,650,1100] if len(ids)>1 else [640]
 return {'id':f'shot-{i+1:04d}','text':text,'setting':setting,'lighting':'day' if any(v in n for v in ['buoi sang','ban ngay','nang']) else 'night','camera':'push' if action=='scared' else 'wide','effect':'fog' if 'ghost' in ids else 'none','actors':[{'id':v,'x':positions[j],'y':660,'scale':1.15,'facing':'right' if j==0 else 'left','action':('float' if v=='ghost' else action if j==0 else 'idle'),'expression':'scared' if action=='scared' else 'neutral',**({'toX':580 if len(ids)>1 else 800} if action=='walk' and j==0 else {})} for j,v in enumerate(ids)],'pause':.35,'subtitles':False}
def ai_metadata(shots,c):
 schema='Return JSON object {"shots":[{"id":...,"setting":...,"lighting":...,"camera":...,"effect":...,"actors":[{"id":...,"x":...,"y":660,"scale":1.15,"action":...,"expression":...,"facing":...,"toX":...}]}]}. Preserve every supplied ID exactly once. Do not rewrite narration. Allowed settings room,balcony,hallway,street,courtyard,altar,kitchen; lighting day,dusk,night; camera wide,push,close; effects none,fog,rain. Actor IDs main (young man),neighbor (young woman),elder (grandmother),ghost. Actions idle,walk,talk,sit,point,scared,sleep,float. Expressions neutral,happy,sad,scared,angry. Use at most 3 visible actors. Only include actors present in the text/context, omit ghost for a metaphor or a portrait. Position x=200..1080, y=620..690, scale=.7..1.6. Match literal action and location to the Vietnamese narration; keep continuity within batch. If uncertain retain previous location. /no_think'
 raw=request(c['llm_url']+'/v1/chat/completions',{'messages':[{'role':'system','content':schema},{'role':'user','content':json.dumps([{'id':s['id'],'narration':s['text']} for s in shots],ensure_ascii=False)}],'temperature':.15,'max_tokens':1800,'response_format':{'type':'json_object'},'chat_template_kwargs':{'enable_thinking':False}},timeout=360)
 content=raw['choices'][0]['message']['content'];content=re.sub(r'<think>.*?</think>','',content,flags=re.S).strip();content=re.sub(r'^```(?:json)?\s*|\s*```$','',content)
 items=json.loads(content)['shots'];by_id={s['id']:s for s in items}
 if len(items)!=len(shots) or set(by_id)!={s['id'] for s in shots}:raise ValueError('AI omitted or duplicated shot IDs.')
 for s in shots:
  v=by_id[s['id']];s.update({k:v[k] for k in ['setting','lighting','camera','effect','actors'] if k in v})
 return shots
def plan(args,c):
 out=Path(args.project).resolve();out.mkdir(parents=True,exist_ok=True)
 if (out/'storyboard.json').exists() and not args.overwrite:raise ValueError('Project exists; use a new folder or --overwrite.')
 text=Path(args.story).read_text(encoding='utf-8-sig').strip()
 if not text:raise ValueError('Story is empty.')
 shots=[infer(s,i) for i,s in enumerate(segments(text))]
 backend='rules';warnings=['Initial scene inference requires editorial review before final render.']
 if args.ai!='off':
  try:
   request(c['llm_url']+'/health',timeout=2)
   for i in range(0,len(shots),4):
    print(f'Qwen storyboard {i+1}–{min(i+4,len(shots))}/{len(shots)}',flush=True)
    candidate=ai_metadata(json.loads(json.dumps(shots[i:i+4])),c)
    validate({'title':args.title,'cast':CAST,'shots':candidate})
    shots[i:i+4]=candidate
   backend='local-qwen'
  except Exception as e:
   if args.ai=='required':raise
   warnings.append('Local AI not completed: '+str(e));print('WARNING: '+warnings[-1],flush=True)
 project={'version':1,'title':args.title,'source_story':'story.txt','planning_backend':backend,'warnings':warnings,'voice':args.voice or c['voice'],'speed':c['speed'],'width':c['width'],'height':c['height'],'fps':c['fps'],'subtitles':False,'cast':CAST,'shots':shots}
 validate(project);(out/'story.txt').write_text(text,encoding='utf-8');write(out/'storyboard.json',project);print(f'Created {len(shots)} shots: {out / "storyboard.json"}')
def validate(p):
 if not isinstance(p.get('title'),str) or not isinstance(p.get('cast'),dict) or not p.get('shots'):raise ValueError('Missing title, cast or shots.')
 if len(p['shots'])>1000:raise ValueError('Maximum 1000 shots; split the production into episodes.')
 if not .5<=p.get('speed',1)<=1.5:raise ValueError('Voice speed must be .5..1.5.')
 if p.get('width',1280) not in [854,1280,1920] or p.get('fps',24) not in [12,24,25,30]:raise ValueError('Unsupported output size/fps.')
 if p.get('height',720)!=round(p.get('width',1280)*9/16) and (p.get('width'),p.get('height'))!=(854,480):raise ValueError('Use 16:9 output dimensions.')
 for k,c in p['cast'].items():
  if not re.fullmatch(r'[a-zA-Z0-9_-]+',k):raise ValueError('Unsafe cast ID.')
  if c.get('hair','short') not in ['short','long','elder']:raise ValueError('Unsupported hair style.')
  for key in ['hairColor','skin','shirt','pants']:
   if key in c and not re.fullmatch(r'#[0-9a-fA-F]{6}',c[key]):raise ValueError('Character colors must be #RRGGBB.')
 seen=set()
 for s in p['shots']:
  if not re.fullmatch(r'[a-zA-Z0-9_-]{1,70}',s.get('id','')) or s['id'] in seen:raise ValueError('Unsafe or duplicate shot ID.')
  seen.add(s['id'])
  if not isinstance(s.get('text'),str) or not s['text'].strip() or len(s['text'])>5000:raise ValueError('Shot narration needs 1–5000 characters.')
  if s.get('setting') not in SETTINGS or s.get('lighting') not in ['day','dusk','night'] or s.get('camera') not in ['wide','push','close']:raise ValueError('Unsupported scene/camera values.')
  if s.get('effect','none') not in ['none','fog','rain']:raise ValueError('Unsupported effect.')
  focus=s.get('focusX',640)
  if not isinstance(focus,(int,float)) or not math.isfinite(focus) or not 0<=focus<=1280:raise ValueError('Invalid camera focusX.')
  if not 0<=s.get('pause',.35)<=10:raise ValueError('Pause must be 0..10 seconds.')
  if len(s.get('actors',[]))>4:raise ValueError('Use at most 4 actors in a shot.')
  for a in s.get('actors',[]):
   if a.get('id') not in p['cast'] or a.get('action','idle') not in ACTIONS:raise ValueError('Unknown actor/action.')
   for key,lo,hi,default in [('x',-300,1580,640),('y',100,850,660),('scale',.2,2.5,1),('toX',-300,1580,640),('speed',.1,3,1),('phase',0,100,0),('look',-8,8,0)]:
    v=a.get(key,default)
    if not isinstance(v,(float,int)) or not math.isfinite(v) or not lo<=v<=hi:raise ValueError('Invalid actor '+key)
   if a.get('facing','right') not in ['left','right'] or a.get('expression','neutral') not in ['neutral','happy','sad','scared','angry']:raise ValueError('Invalid facing/expression.')
 return p
def caption_cues(text,duration):
 words=text.split();groups=[' '.join(words[i:i+13]) for i in range(0,len(words),13)];n=sum(len(x.split()) for x in groups);t=0;out=[]
 for group in groups:
  d=duration*len(group.split())/n;out.append({'start':t,'end':t+d,'text':group});t+=d
 return out
def validate_source(p,out):
 source=Path(out)/p.get('source_story','story.txt')
 if source.is_file():
  original=''.join(source.read_text(encoding='utf-8-sig').split());spoken=''.join(''.join(s['text'] for s in p['shots']).split())
  if original!=spoken:raise ValueError('Storyboard narration differs from source story. Repair omitted/duplicated/changed text or explicitly update the source story to the intended edit.')
def speech(p,out,c,limit=None):
 from piper import PiperVoice,SynthesisConfig
 voice_id=p.get('voice',c['voice']);models=voices(c)
 if voice_id not in models:raise ValueError('Voice not installed: '+voice_id)
 model=models[voice_id];cache={};voice=None;items=[];folder=out/'audio';folder.mkdir(exist_ok=True)
 for s in p['shots'][:limit]:
  parts=fragments(s)
  key_data={'text':s['text'],'model':str(model),'size':model.stat().st_size,'mtime':model.stat().st_mtime_ns,'config':read(str(model)+'.json'),'speed':p.get('speed',1)}
  if len(parts)>1:key_data.update(speech_split_version=1,parts=[v['text'] for v in parts])
  key=digest(key_data)
  dest=folder/(s['id']+'.wav');meta=dest.with_suffix('.json')
  cached=dest.exists() and meta.exists() and read(meta).get('hash')==key
  if cached and len(parts)>1:cached=len(read(meta).get('fragment_durations',[]))==len(parts)
  if not cached:
   print('Piper: '+s['id'],flush=True)
   if voice is None:voice=PiperVoice.load(str(model),config_path=str(model)+'.json')
   temp=dest.with_suffix('.part.wav')
   params,data,part_durations=render_fragments(voice,parts,SynthesisConfig(length_scale=1/p.get('speed',1),noise_scale=.6,noise_w_scale=.7))
   with wave.open(str(temp),'wb') as wav:
    wav.setnchannels(params[0]);wav.setsampwidth(params[1]);wav.setframerate(params[2]);wav.writeframes(data)
   run(['ffmpeg','-nostdin','-v','error','-xerror','-i',temp,'-f','null','-']);temp.replace(dest);write(meta,{'hash':key,'voice':voice_id,'fragment_durations':part_durations})
  with wave.open(str(dest),'rb') as wav:duration=wav.getnframes()/wav.getframerate()
  if duration<.2:raise ValueError('Voice too short: '+s['id'])
  # Rounding to a video frame avoids cumulative drift on concatenation.
  fps=p.get('fps',24);total=math.ceil((duration+s.get('pause',.35))*fps)/fps
  part_durations=read(meta).get('fragment_durations') or [duration]
  tracks=measured_tracks(parts,part_durations)
  cues=[]
  for track in tracks:
   cues.extend({**v,'start':v['start']+track['start'],'end':v['end']+track['start']} for v in caption_cues(track['text'],track['end']-track['start']))
  shot={**s,'speech_duration':duration,'duration':total,'audio':str(dest),'speechSegments':tracks,'mouthEnvelope':envelope(dest),'captionCues':cues,'subtitles':s.get('subtitles',p.get('subtitles',False))};items.append(shot)
 return items
def html_composition(p,s):
 # JSON in an inline script must not allow a </script> from narration.
 def js(v):return json.dumps(v,ensure_ascii=False).replace('<','\\u003c')
 return f'''<!doctype html><html><head><meta charset="utf-8"><style>*{{box-sizing:border-box}}body{{margin:0;background:#090e16;overflow:hidden}}#root{{position:relative;width:1280px;height:720px}}canvas{{position:absolute;inset:0;width:1280px;height:720px}}</style></head><body><div id="root" data-composition-id="story" data-start="0" data-duration="{s['duration']}" data-width="1280" data-height="720"><canvas class="clip" data-start="0" data-duration="{s['duration']}" data-track-index="0"></canvas></div><script src="gsap.min.js"></script><script>window.STORY_SHOT={js(s)};window.STORY_CAST={js(p['cast'])};</script><script src="mouth-sync.js"></script><script src="scene-engine.js"></script></body></html>'''
def srt_stamp(t):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
def build(args,c):
 out=Path(args.project).resolve();p=validate(read(out/'storyboard.json'));validate_source(p,out);env=env_for(out,c)
 normalize_dialogues(p['shots'],p['cast'])
 for key in ['node','hyperframes','gsap','browser']:
  if not Path(c[key]).is_file():raise ValueError('Missing '+key+'; run doctor or use --config.')
 items=speech(p,out,c,args.limit);write(out/'timeline.json',{'title':p['title'],'voice':p.get('voice'),'shots':items,'duration':sum(s['duration'] for s in items),'partial':bool(args.limit)})
 clips=[];engine=(SKILL/'assets/scene-engine.js').read_text(encoding='utf-8');mouth_js=(SKILL/'assets/mouth-sync.js').read_text(encoding='utf-8');w,h=(854,480) if args.draft else (p.get('width',1280),p.get('height',720));fps=p.get('fps',24)
 base_engine=engine
 for i,s in enumerate(items):
  engine=(out/s['engine']).read_text(encoding='utf-8') if s.get('engine') else base_engine
  folder=out/'shots'/s['id'];folder.mkdir(parents=True,exist_ok=True)
  if s.get('background'):
   source=Path(s['background']);source=source if source.is_absolute() else out/source
   if not source.is_file():raise ValueError('Background missing: '+str(source))
   copied='background'+source.suffix.lower();shutil.copyfile(source,folder/copied);s={**s,'background':copied,'background_hash':hashlib.sha256(source.read_bytes()).hexdigest()}
  composition=html_composition(p,s);key=digest({'html':composition,'engine':engine,'mouth_logic':mouth_js,'audio':read(out/'audio'/(s['id']+'.json')),'w':w,'h':h,'fps':fps,'voice_duration':s['duration'],'renderer':p.get('renderer','hyperframes'),'capture_fps':p.get('capture_fps',fps)})
  final=folder/'clip.mp4';meta=folder/'render.json';clips.append(final)
  if final.exists() and meta.exists() and read(meta).get('hash')==key:
   print(f'Cached {i+1}/{len(items)}: {s["id"]}',flush=True);continue
  (folder/'index.html').write_text(composition,encoding='utf-8');(folder/'scene-engine.js').write_text(engine,encoding='utf-8');(folder/'mouth-sync.js').write_text(mouth_js,encoding='utf-8');shutil.copyfile(c['gsap'],folder/'gsap.min.js');write(folder/'meta.json',{'name':s['id']})
  print(f'{"Canvas" if p.get("renderer")=="canvas" else "HyperFrames"} {i+1}/{len(items)}: {s["id"]} ({s["duration"]:.2f}s)',flush=True)
  with open(folder/'render.log','w',encoding='utf-8') as log:
   render_cmd=[c['node'],str(SKILL/'scripts/canvas-render.cjs'),str(folder),str(folder/'silent.mp4'),str(p.get('capture_fps',fps))] if p.get('renderer')=='canvas' else [c['node'],c['hyperframes'],'render','--output',str(folder/'silent.mp4'),'--fps',str(fps),'--quality','standard','--workers','1','--experimental-fast-capture=false']
   proc=subprocess.run(render_cmd,cwd=folder,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  if proc.returncode:raise RuntimeError('HyperFrames failed: '+str(folder/'render.log'))
  tmp=folder/'clip.part.mp4';run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',folder/'silent.mp4','-i',s['audio'],'-filter_complex',f'[1:a]apad,atrim=duration={s["duration"]},aresample=48000[a]','-map','0:v:0','-map','[a]','-vf',f'scale={w}:{h}','-r',str(fps),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t',str(s['duration']),'-movflags','+faststart',tmp],env=env);probe(tmp);tmp.replace(final);write(meta,{'hash':key,'duration':s['duration']})
  # Keep the completed clip and authored source; remove only this known intermediate.
  (folder/'silent.mp4').unlink(missing_ok=True)
 listing=out/'concat.txt';listing.write_text(''.join("file '"+str(v).replace('\\','/').replace("'","'\\''")+"'\n" for v in clips),encoding='utf-8');joined=out/'joined.part.mp4';run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listing,'-c','copy','-movflags','+faststart',joined],env=env)
 dest=out/('preview.mp4' if args.limit else 'final.mp4');duration=sum(s['duration'] for s in items)
 if args.music:
  music=Path(args.music).resolve()
  if not music.is_file():raise ValueError('Music file missing.')
  run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',joined,'-stream_loop','-1','-i',music,'-filter_complex',f'[1:a]volume={args.music_volume},atrim=duration={duration}[bed];[0:a]asplit=2[voice][side];[bed][side]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck];[voice][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(duration),'-movflags','+faststart',dest],env=env);joined.unlink()
 else:joined.replace(dest)
 lines=[];offset=0;idx=1
 for s in items:
  for cue in s['captionCues']:lines.append(f'{idx}\n{srt_stamp(offset+cue["start"])} --> {srt_stamp(offset+cue["end"])}\n{cue["text"]}\n');idx+=1
  offset+=s['duration']
 (out/'captions-estimated.srt').write_text('\n'.join(lines),encoding='utf-8');write(out/'build.json',{'output':str(dest),'partial':bool(args.limit),'duration':duration,'shots':len(items),'width':w,'height':h,'fps':fps,'subtitle_timing':'estimated-proportional-to-text-not-forced-alignment','backend':('Piper + project Canvas capture + FFmpeg' if p.get('renderer')=='canvas' else 'Piper + HyperFrames + FFmpeg'),'created':time.time()});print('DONE '+str(dest))
def inspect_reference(args):
 out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True);p=probe(args.video);write(out/'reference.json',p);duration=float(p['format']['duration']);interval=max(1,duration/16)
 run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',args.video,'-vf',f'fps=1/{interval},scale=360:-1,tile=4x4','-frames:v','1',out/'contact-sheet.jpg'])
 run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(args.at),'-i',args.video,'-t','5','-vf','fps=1,scale=360:-1,tile=5x1','-frames:v','1',out/'motion-strip.jpg']);print(out)
def qa(args):
 out=Path(args.project).resolve();meta=read(out/'build.json');video=Path(meta['output']);p=probe(video);actual=float(p['format']['duration']);streams=p['streams'];errors=[]
 if not any(s['codec_type']=='audio' for s in streams):errors.append('Missing audio track.')
 v=next((s for s in streams if s['codec_type']=='video'),{})
 if (v.get('width'),v.get('height'))!=(meta['width'],meta['height']):errors.append('Wrong resolution.')
 if abs(actual-meta['duration'])>.5:errors.append('Duration mismatch > 0.5 s.')
 report={'video':str(video),'errors':errors,'duration':actual,'expected':meta['duration'],'partial':meta['partial'],'requires_human_review':['Listen to actual Piper samples for intelligibility/pronunciation.','Inspect scene relevance, character consistency, and motion at cuts.','SRT timing is approximate, not word-aligned.'],'ffprobe':p}
 run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',video,'-vf',f'fps=12/{actual},scale=320:-1,tile=4x3','-frames:v','1',out/'qa-contact-sheet.jpg'])
 # Full decode catches corrupt streams; this does not judge audio quality.
 run(['ffmpeg','-nostdin','-v','error','-xerror','-i',video,'-f','null','-']);write(out/'qa.json',report);print(json.dumps(report,ensure_ascii=False,indent=2))
 if errors:raise ValueError('QA failed.')
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--config');sub=parser.add_subparsers(dest='command',required=True)
 sub.add_parser('doctor');sub.add_parser('voices');a=sub.add_parser('start-ai');a.add_argument('--output',default='data/local-ai')
 a=sub.add_parser('inspect-reference');a.add_argument('--video',required=True);a.add_argument('--output',required=True);a.add_argument('--at',type=float,default=100)
 a=sub.add_parser('plan');a.add_argument('--story',required=True);a.add_argument('--project',required=True);a.add_argument('--title',default='Chuyện sau cánh cửa');a.add_argument('--voice');a.add_argument('--ai',choices=['off','auto','required'],default='auto');a.add_argument('--overwrite',action='store_true')
 a=sub.add_parser('validate');a.add_argument('--project',required=True)
 a=sub.add_parser('build');a.add_argument('--project',required=True);a.add_argument('--limit',type=int);a.add_argument('--draft',action='store_true');a.add_argument('--music');a.add_argument('--music-volume',type=float,default=.10)
 a=sub.add_parser('qa');a.add_argument('--project',required=True)
 args=parser.parse_args();c=config(args)
 if args.command=='doctor':doctor(c)
 elif args.command=='voices':print(json.dumps({k:str(v) for k,v in voices(c).items()},ensure_ascii=False,indent=2))
 elif args.command=='start-ai':start_ai(args,c)
 elif args.command=='inspect-reference':inspect_reference(args)
 elif args.command=='plan':plan(args,c)
 elif args.command=='validate':
  p=validate(read(Path(args.project)/'storyboard.json'));validate_source(p,Path(args.project));print('Valid storyboard and source text coverage.')
 elif args.command=='build':
  if args.limit is not None and args.limit<1:raise ValueError('--limit must be positive.')
  if not 0<=args.music_volume<=.5:raise ValueError('--music-volume must be 0..0.5.')
  build(args,c)
 elif args.command=='qa':qa(args)
if __name__=='__main__':
 try:main()
 except KeyboardInterrupt:print('Interrupted. Completed clips remain reusable.',file=sys.stderr);sys.exit(130)
 except Exception as e:print('ERROR: '+str(e),file=sys.stderr);sys.exit(1)
