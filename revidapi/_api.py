import json, os, re, ssl, time, urllib.request
def _key():
    k = os.environ.get("REVIDAPI_API_KEY") or os.environ.get("REVIDAPI_KEY")
    f = os.path.expanduser("~/.revidapi/khoa")
    if not k and os.path.exists(f): k = open(f).read().strip()
    if not k: raise SystemExit("Thiếu khoá: đặt REVIDAPI_KEY hoặc lưu vào ~/.revidapi/khoa")
    return k
try:
    import certifi; _CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError: _CTX = None
BASE = "https://revidapi.com/v1"
def call(path, body=None, timeout=180):
    r = urllib.request.Request(BASE + path, json.dumps(body).encode() if body else None,
        {"Authorization": "Bearer " + _key(), "Content-Type": "application/json"})
    try: return json.load(urllib.request.urlopen(r, timeout=timeout, context=_CTX))
    except urllib.error.HTTPError as e: raise SystemExit(f"HTTP {e.code}: {e.read().decode()[:300]}")
def first_url(o):
    m = re.search(r'https?://[^"\s]+\.(?:png|jpe?g|webp|mp4|mov|mp3|wav)[^"\s]*', json.dumps(o))
    return m.group(0) if m else None
def wait(path, every=5, tries=180):
    for _ in range(tries):
        s = call(path); st = str(s.get("status", "")).lower()
        if st in ("completed", "done", "success", "succeeded"): return s
        if st in ("failed", "error", "cancelled"): raise SystemExit(f"Job lỗi: {s.get('error')}")
        time.sleep(every)
    raise SystemExit("Hết thời gian chờ.")
def save(url, out):
    r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 revidapi-client"})
    open(out, "wb").write(urllib.request.urlopen(r, timeout=300, context=_CTX).read()); print("Đã lưu", out)
