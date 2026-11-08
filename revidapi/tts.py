"""Đọc kịch bản thành giọng nói qua RevidAPI (/v1/text-to-speech).
Cách dùng: python3 revidapi/tts.py kich-ban.txt vo.mp3 [voice_id]
Giọng mặc định 9060 (Trung Kiên). Chi phí: 15 credit / 1.000 ký tự."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _api import call, wait, first_url, save
if len(sys.argv) < 3: raise SystemExit(__doc__)
text = open(sys.argv[1], encoding="utf-8").read().strip()
voice = int(sys.argv[3]) if len(sys.argv) > 3 else 9060
print(f"Gửi {len(text)} ký tự (~{len(text)*15/1000:.0f} credit), giọng {voice}…")
r = call("/text-to-speech", {"text": text, "voice_id": voice})
url = first_url(r)
if not url:
    j = r.get("job_id") or r.get("id") or (r.get("data") or {}).get("job_id")
    if not j: raise SystemExit(f"RevidAPI không trả job: {str(r)[:200]}")
    url = first_url(wait(f"/text-to-speech/{j}", every=3))
if not url: raise SystemExit("Không lấy được file giọng.")
save(url, sys.argv[2])
