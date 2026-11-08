"""Actual local-AI -> speaker tags -> measured TTS -> MP4 integration check."""
import json,sys,time,urllib.request,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BASE='http://127.0.0.1:3210'
def api(path,data=None):
    request=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json','X-Studio':'1'})
    with urllib.request.urlopen(request,timeout=30) as response:return json.load(response)
job=api('/api/jobs',{'title':'Kiểm thử đồng bộ thoại','story':'Minh và Lan đứng trước cánh cửa đóng kín. Lan nói: “Tôi nghe tiếng gõ.” Minh đáp: “Đừng mở cửa.”','planner':'local-ai','mode':'auto','width':854})
jid=job['id'];print('JOB='+jid,flush=True);last=None
for _ in range(600):
    job=api('/api/jobs/'+jid);current=(job['status'],job['phase'])
    if current!=last:print(current,job['message'],flush=True);last=current
    if job['status']=='failed':raise RuntimeError(job['message'])
    if job['status']=='complete':break
    time.sleep(1)
else:raise RuntimeError('Dialogue integration timed out.')
board=api('/api/jobs/'+jid+'/board');roles={d['text']:board['cast'][d['speaker']]['name'] if d['speaker'] else None for s in board['shots'] for d in s['dialogues']}
assert roles['“Tôi nghe tiếng gõ.”']=='Lan',roles
assert roles['“Đừng mở cửa.”']=='Minh',roles
subprocess.run(['node',str(ROOT/'studio/tests/check_recorded_sync.cjs'),str(ROOT/'ket-qua/tu-dong'/jid/'timeline.json')],check=True)
assert job['qa_errors']==[],job
print('Local-AI speaker attribution and measured mouth animation passed.',flush=True)
