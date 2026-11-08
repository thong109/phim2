import json,urllib.request
story='Minh về căn nhà cũ vào một đêm mưa. Lan đứng trước cổng, tay cầm chiếc đèn dầu. Minh bước qua sân, dừng lại bên Lan và hỏi vì sao cô vẫn chưa vào nhà.\n\nLan nhìn về cánh cửa đóng kín. Một tiếng gõ chậm rãi vang lên từ bên trong. Minh giật mình lùi lại, còn Lan khẽ nói: “Đừng trả lời. Trong nhà không còn ai sống ở đó.”'
data={'title':'Kiểm thử tự động · Tiếng gõ trong nhà','story':story,'planner':'local-ai','mode':'auto','width':854,'voice':'ngocngan3701','speed':.96,'subtitles':True}
req=urllib.request.Request('http://127.0.0.1:3210/api/jobs',data=json.dumps(data).encode(),headers={'Content-Type':'application/json','X-Studio':'1'})
job=json.load(urllib.request.urlopen(req));print(job['id'])
