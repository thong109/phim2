"""Integration test against a running local studio; creates a tiny real film."""
import json,time,urllib.request,urllib.error,unittest

BASE='http://127.0.0.1:3210'
def request(path,data=None,headers=None):
    req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json','X-Studio':'1',**(headers or {})})
    return urllib.request.urlopen(req,timeout=20)
def api(path,data=None):
    with request(path,data) as r:return json.load(r)
def wait(jid,states):
    previous=None
    for _ in range(600):
        job=api('/api/jobs/'+jid)
        if job['status']!=previous:print(job['title'],job['status'],flush=True);previous=job['status']
        if job['status'] in states:return job
        if job['status']=='failed':raise AssertionError(job['message'])
        time.sleep(1)
    raise AssertionError('Timed out')

class HTTPFlow(unittest.TestCase):
    def test_review_edit_render_download(self):
        job=api('/api/jobs',{'title':'Kiểm thử bàn dựng','story':'Tôi bước vào căn nhà cũ. Ngoài sân, tiếng mưa vẫn rơi đều. Tôi giật mình khi nghe tiếng gõ cửa.','planner':'rules','mode':'review','width':854})
        jid=job['id'];wait(jid,{'review'})
        board=api('/api/jobs/'+jid+'/board');first=next(iter(board['cast']));board['cast'][first]['shirt']='#325566';board['cast'][first]['name']='Nhân vật thử';board['shots'][0]['text']+=' Tôi đứng im.'
        saved=api('/api/jobs/'+jid+'/board',board)
        self.assertEqual(saved['cast'][first]['shirt'],'#325566')
        with request('/api/jobs/'+jid+'/story') as r:self.assertIn('Tôi đứng im.',r.read().decode())
        html=api('/api/preview',{'board':saved,'index':0})['html'];self.assertIn('#325566',html);self.assertIn('/assets/scene-engine.js',html)
        api('/api/jobs/'+jid+'/render',{});complete=wait(jid,{'complete'})
        self.assertGreater(complete['duration'],1);self.assertEqual(api('/api/jobs/'+jid+'/qa')['errors'],[])
        with request('/api/jobs/'+jid+'/video',headers={'Range':'bytes=0-31'}) as r:self.assertEqual(r.status,206);self.assertIn(b'ftyp',r.read())
        print('REVIEW_JOB='+jid,flush=True)
    def test_reject_cross_origin_mutation(self):
        with self.assertRaises(urllib.error.HTTPError) as error:request('/api/jobs',{'story':'x'*40},headers={'Origin':'https://example.invalid'})
        self.assertEqual(error.exception.code,400)
    def test_reject_unknown_job(self):
        with self.assertRaises(urllib.error.HTTPError) as error:request('/api/jobs/'+'0'*32)
        self.assertEqual(error.exception.code,404)

if __name__=='__main__':unittest.main()
