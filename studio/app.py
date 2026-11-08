"""Local story-to-film application. No web frameworks or cloud credentials required."""
import argparse,copy,json,mimetypes,os,queue,re,shutil,subprocess,sys,threading,time,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,unquote
from engine import ROOT,REPO,PIPE,CONFIG,LOCATIONS,ACTIONS,EMOTIONS,validate_board
from planner import plan,MODEL,Cancelled

JOBS=REPO/'ket-qua/tu-dong';JOBS.mkdir(parents=True,exist_ok=True)
TERMINAL={'complete','failed','cancelled','review','interrupted'}

class Manager:
    def __init__(self):
        self.lock=threading.RLock();self.jobs={};self.events={};self.processes={};self.active=set();self.queue=queue.Queue()
        for f in JOBS.glob('*/job.json'):
            try:
                job=PIPE.read(f)
                if job['status'] not in TERMINAL:job.update(status='interrupted',message='Ứng dụng đã dừng giữa chừng. Có thể chạy tiếp từ dữ liệu đã lưu.')
                self.jobs[job['id']]=job;self.events[job['id']]=threading.Event();PIPE.write(f,job)
            except (ValueError,KeyError):pass
        threading.Thread(target=self.worker,daemon=True).start()
    def folder(self,jid):
        if not re.fullmatch(r'[a-f0-9]{32}',jid):raise ValueError('Mã tập phim không hợp lệ.')
        if jid not in self.jobs:raise FileNotFoundError('Không tìm thấy tập phim.')
        return JOBS/jid
    def get(self,jid):
        with self.lock:self.folder(jid);return copy.deepcopy(self.jobs[jid])
    def update(self,jid,**values):
        with self.lock:
            self.jobs[jid].update(values,updated=time.time());PIPE.write(JOBS/jid/'job.json',self.jobs[jid])
    def list(self):
        with self.lock:return sorted([copy.deepcopy(v) for v in self.jobs.values()],key=lambda v:v['created'],reverse=True)
    def create(self,data):
        story=data.get('story','').strip()
        if not 30<=len(story)<=60000:raise ValueError('Nhập kịch bản từ 30 đến 60.000 ký tự.')
        voice=data.get('voice',CONFIG['voice'])
        if voice not in PIPE.voices(CONFIG):raise ValueError('Giọng đọc không có trên máy.')
        planner=data.get('planner','local-ai');mode=data.get('mode','auto')
        if planner not in ['local-ai','rules'] or mode not in ['auto','review']:raise ValueError('Chế độ không hợp lệ.')
        speed=float(data.get('speed',.96));width=int(data.get('width',1280))
        if not .7<=speed<=1.3 or width not in [854,1280]:raise ValueError('Tốc độ hoặc kích thước video không hợp lệ.')
        options={'title':str(data.get('title') or 'Chuyện kể lúc nửa đêm')[:100],'voice':voice,'planner':planner,'mode':mode,'speed':speed,'width':width,'height':480 if width==854 else 720,'subtitles':bool(data.get('subtitles',True))}
        jid=uuid.uuid4().hex;folder=JOBS/jid;folder.mkdir();(folder/'story.txt').write_text(story,encoding='utf-8');shutil.copytree(ROOT/'library/backgrounds',folder/'library')
        job={'id':jid,'title':options['title'],'options':options,'status':'queued','phase':'queued','progress':0,'message':'Đang chờ đến lượt. Mỗi lần dựng một tập để máy chạy ổn định.','created':time.time(),'updated':time.time(),'revision':0,'has_board':False,'logs':[]}
        with self.lock:self.jobs[jid]=job;self.events[jid]=threading.Event();PIPE.write(folder/'job.json',job)
        self.queue.put((jid,'plan'));return self.get(jid)
    def enqueue(self,jid,kind):
        job=self.get(jid)
        if jid in self.active:raise ValueError('Tác vụ đang dừng; chờ tiến trình hiện tại kết thúc rồi chạy tiếp.')
        if job['status'] not in TERMINAL:raise ValueError('Tập này đang được xử lý.')
        if kind=='render' and not job['has_board']:raise ValueError('Chưa có cảnh để dựng.')
        self.events[jid].clear();self.update(jid,status='queued',phase='queued',progress=0 if kind=='plan' else 44,error=None,message='Đang chờ xử lý.');self.queue.put((jid,kind))
    def cancel(self,jid):
        job=self.get(jid)
        if job['status'] in ['complete','cancelled']:return
        self.events[jid].set()
        with self.lock:proc=self.processes.get(jid)
        if proc is not None and proc.poll() is None:
            subprocess.run(['taskkill','/PID',str(proc.pid),'/T','/F'],capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)) if os.name=='nt' else proc.terminate()
        self.update(jid,status='cancelling' if jid in self.active else 'cancelled',message='Đang dừng tác vụ. Dữ liệu dựng xong vẫn được giữ lại.')
    def save_board(self,jid,data):
        folder=self.folder(jid);job=self.get(jid)
        if job['status'] not in TERMINAL:raise ValueError('Chờ tác vụ hiện tại xong trước khi sửa cảnh.')
        old=PIPE.read(folder/'storyboard.json');p=validate_board(data)
        if [s['id'] for s in p['shots']]!=[s['id'] for s in old['shots']]:raise ValueError('Giữ nguyên thứ tự và mã cảnh khi chỉnh sửa.')
        PIPE.write(folder/'storyboard.json',p);(folder/'story.txt').write_text('\n\n'.join(s['text'] for s in p['shots']),encoding='utf-8')
        self.update(jid,status='review',title=p['title'],revision=job['revision']+1,message='Đã lưu cảnh. Bạn có thể dựng toàn bộ tập.',options={**job['options'],**{k:p[k] for k in ['title','voice','speed','width','height','subtitles']}})
        return p
    def run_pipeline(self,jid,command):
        folder=self.folder(jid);total=len(PIPE.read(folder/'storyboard.json')['shots'])
        env={**os.environ,'PYTHONIOENCODING':'utf-8','PYTHONUNBUFFERED':'1'}
        args=[sys.executable,str(ROOT/'pipeline/scripts/studio.py'),'--config',str(folder/'runtime.json'),command,'--project',str(folder)]
        PIPE.write(folder/'runtime.json',CONFIG)
        proc=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',env=env,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        with self.lock:self.processes[jid]=proc
        with open(folder/(command+'.log'),'a',encoding='utf-8') as log:
            for line in proc.stdout:
                log.write(line);log.flush();line=line.strip()
                if not line:continue
                job=self.get(jid);logs=(job.get('logs',[])+[line])[-16:]
                values={'logs':logs}
                if line.startswith('Piper:'):
                    n=next((i+1 for i,s in enumerate(PIPE.read(folder/'storyboard.json')['shots']) if s['id'] in line),1)
                    values.update(phase='speech',progress=45+int(10*n/total),message=f'Đang tạo giọng đọc {n}/{total} cảnh.')
                match=re.search(r'(?:Canvas|HyperFrames|Cached) (\d+)/(\d+)',line)
                if match:
                    n,t=map(int,match.groups());values.update(phase='rendering',progress=55+int(37*n/t),message=f'Đang dựng cảnh {n}/{t}.')
                self.update(jid,**values)
        code=proc.wait()
        with self.lock:self.processes.pop(jid,None)
        if self.events[jid].is_set():raise Cancelled()
        if code:raise RuntimeError('Dựng video chưa thành công. '+next((v for v in reversed(self.get(jid).get('logs',[])) if v.startswith('ERROR:')),'Xem nhật ký để biết cảnh gặp lỗi.'))
    def worker(self):
        while True:
            jid,kind=self.queue.get()
            try:
                event=self.events[jid]
                if event.is_set():continue
                with self.lock:self.active.add(jid)
                folder=self.folder(jid);job=self.get(jid)
                self.update(jid,status='running',error=None)
                if kind=='plan':
                    story=(folder/'story.txt').read_text(encoding='utf-8')
                    p=plan(story,job['options'],folder,lambda phase,percent,msg:self.update(jid,phase=phase,progress=percent,message=msg),event)
                    if event.is_set():raise Cancelled()
                    PIPE.write(folder/'storyboard.json',p);PIPE.validate_source(p,folder)
                    self.update(jid,has_board=True,revision=job['revision']+1,backend=p['planning_backend'],scene_count=len(p['shots']),character_count=len(p['cast']))
                    if job['options']['mode']=='review':
                        self.update(jid,status='review',phase='review',progress=44,message='Cảnh đã sẵn sàng. Sửa nhân vật, hành động hoặc bối cảnh rồi bấm dựng.');continue
                self.update(jid,phase='speech',progress=45,message='Đang tạo giọng đọc và đo thời lượng thực tế.')
                self.run_pipeline(jid,'build')
                self.update(jid,phase='qa',progress=95,message='Đang kiểm tra toàn bộ video và âm thanh.')
                self.run_pipeline(jid,'qa')
                build=PIPE.read(folder/'build.json');qa=PIPE.read(folder/'qa.json')
                self.update(jid,status='complete',phase='complete',progress=100,message='Video đã hoàn tất. Bạn có thể xem và tải MP4.',duration=qa['duration'],width=build['width'],height=build['height'],qa_errors=qa['errors'])
            except Cancelled:self.update(jid,status='cancelled',message='Đã dừng. Dữ liệu đã tạo vẫn được giữ lại.')
            except Exception as e:
                if self.events[jid].is_set():self.update(jid,status='cancelled',message='Đã dừng tác vụ.')
                else:self.update(jid,status='failed',failed_phase=self.get(jid).get('phase'),error=str(e),message=str(e))
            finally:
                with self.lock:self.active.discard(jid)
                self.queue.task_done()

MANAGER=Manager()

class Handler(BaseHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def handle(self):
        try:super().handle()
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,fmt,*args):pass
    def json(self,data,status=200):
        body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',len(body));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
    def file(self,file,download=False):
        if not file.is_file():raise FileNotFoundError('Không tìm thấy file.')
        size=file.stat().st_size;start=0;end=size-1;partial=False
        if self.headers.get('Range'):
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',self.headers['Range'])
            if not match:raise ValueError('Yêu cầu video không hợp lệ.')
            a,b=match.groups()
            if a:start=int(a);end=min(int(b),end) if b else end
            elif b:start=max(0,size-int(b))
            if start>=size or end<start:
                self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return
            partial=True
        self.send_response(206 if partial else 200);self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream');self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',end-start+1)
        if partial:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        if download:self.send_header('Content-Disposition',f'attachment; filename="{file.name}"')
        self.end_headers()
        if self.command=='HEAD':return
        try:
            with open(file,'rb') as f:
                f.seek(start);remaining=end-start+1
                while remaining:
                    chunk=f.read(min(256*1024,remaining))
                    if not chunk:break
                    self.wfile.write(chunk);remaining-=len(chunk)
        except (BrokenPipeError,ConnectionResetError):pass
    def body(self):
        origin=self.headers.get('Origin')
        allowed=[f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}']
        if self.headers.get('X-Studio')!='1' or (origin and origin not in allowed):raise ValueError('Yêu cầu chỉ được gửi từ ứng dụng cục bộ.')
        n=int(self.headers.get('Content-Length',0))
        if not 0<n<=1000000:raise ValueError('Nội dung quá lớn hoặc trống.')
        return json.loads(self.rfile.read(n))
    def do_HEAD(self):self.do_GET()
    def do_GET(self):
        try:
            path=unquote(urlsplit(self.path).path)
            if path=='/api/meta':return self.json({'voices':list(PIPE.voices(CONFIG)),'default_voice':CONFIG['voice'],'ai':MODEL.health(),'locations':LOCATIONS,'actions':ACTIONS,'emotions':EMOTIONS,'legacy':(REPO/'ket-qua/nguoi-dem-thoc/final.mp4').exists()})
            if path=='/api/jobs':return self.json(MANAGER.list())
            if path=='/api/legacy/video':return self.file(REPO/'ket-qua/nguoi-dem-thoc/final.mp4')
            m=re.fullmatch(r'/api/jobs/([a-f0-9]{32})(?:/(board|video|captions|story|qa))?',path)
            if m:
                jid,kind=m.groups();folder=MANAGER.folder(jid)
                if kind is None:return self.json(MANAGER.get(jid))
                if kind=='board':return self.json(validate_board(PIPE.read(folder/'storyboard.json')))
                name={'video':'final.mp4','captions':'captions-estimated.srt','story':'story.txt','qa':'qa.json'}[kind]
                return self.file(folder/name,kind in ['captions','story'])
            if path=='/assets/scene-engine.js':return self.file(ROOT/'pipeline/assets/scene-engine.js')
            if path=='/assets/mouth-sync.js':return self.file(ROOT/'pipeline/assets/mouth-sync.js')
            if path=='/assets/gsap.min.js':return self.file(Path(CONFIG['gsap']))
            if path.startswith('/library/'):
                name=path[len('/library/'):]
                if not re.fullmatch(r'[a-z0-9_-]+\.svg',name):raise FileNotFoundError()
                return self.file(ROOT/'library/backgrounds'/name)
            if path=='/huong-dan':return self.file(REPO/'HUONG-DAN-SU-DUNG.md',True)
            if path in ['/','/app.js','/style.css']:return self.file(ROOT/'web'/('index.html' if path=='/' else path[1:]))
            raise FileNotFoundError('Không tìm thấy trang.')
        except FileNotFoundError as e:self.json({'error':str(e)},404)
        except (ValueError,KeyError,TypeError) as e:self.json({'error':str(e)},400)
    def do_POST(self):
        try:
            path=urlsplit(self.path).path;data=self.body()
            if path=='/api/jobs':return self.json(MANAGER.create(data),201)
            if path=='/api/preview':
                p=validate_board(data['board']);s=copy.deepcopy(p['shots'][int(data['index'])]);s.update(duration=8,captionCues=PIPE.caption_cues(s['text'],8),subtitles=p['subtitles'])
                if s.get('background'):s['background']='/library/'+Path(s['background']).name
                synced=False
                if data.get('job_id'):
                    from speech_sync import fragments,measured_tracks
                    timeline=MANAGER.folder(data['job_id'])/'timeline.json'
                    if timeline.exists():
                        previous=next((v for v in PIPE.read(timeline)['shots'] if v['id']==s['id']),None)
                        parts=fragments(s)
                        if previous and [v['text'] for v in parts]==[v['text'] for v in previous.get('speechSegments',[])]:
                            s.update(duration=previous['duration'],mouthEnvelope=previous['mouthEnvelope'],captionCues=previous['captionCues'],speechSegments=measured_tracks(parts,[v['end']-v['start'] for v in previous['speechSegments']]))
                            synced=True
                html=PIPE.html_composition(p,s).replace('src="gsap.min.js"','src="/assets/gsap.min.js"').replace('src="scene-engine.js"','src="/assets/scene-engine.js"').replace('src="mouth-sync.js"','src="/assets/mouth-sync.js"')
                html=html.replace('width:1280px;height:720px','width:1280px;height:720px;transform-origin:top left')
                html=html.replace('</body>','<script>function fit(){document.getElementById("root").style.transform="scale("+(innerWidth/1280)+")";}addEventListener("resize",fit);fit();</script></body>')
                return self.json({'html':html,'dialogues':s.get('dialogues',[]),'has_audio_sync':synced,'preview_duration':s['duration']})
            m=re.fullmatch(r'/api/jobs/([a-f0-9]{32})/(render|retry|cancel|board)',path)
            if not m:raise FileNotFoundError('Không tìm thấy thao tác.')
            jid,kind=m.groups()
            if kind=='board':return self.json(MANAGER.save_board(jid,data))
            if kind=='cancel':MANAGER.cancel(jid)
            elif kind=='render':MANAGER.enqueue(jid,'render')
            elif kind=='retry':MANAGER.enqueue(jid,'render' if MANAGER.get(jid)['has_board'] else 'plan')
            return self.json(MANAGER.get(jid))
        except FileNotFoundError as e:self.json({'error':str(e)},404)
        except (ValueError,KeyError,TypeError,IndexError) as e:self.json({'error':str(e)},400)
        except Exception as e:self.json({'error':str(e)},500)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=3210);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'Xuong phim: http://localhost:{args.port}',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
