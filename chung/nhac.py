"""Tự tổng hợp nhạc nền (trống trận + sáo ngũ cung + cồng) rồi trộn dưới giọng đọc.
Cách dùng: python3 chung/nhac.py vo.mp3 tron.wav [do_dai_giay]
Nhạc tự sinh bằng numpy nên không vướng bản quyền."""
import sys, subprocess, numpy as np, wave, os, tempfile, shutil
sr = 44100
vo, out = sys.argv[1], sys.argv[2]
L = float(sys.argv[3]) if len(sys.argv) > 3 else 60.0
n = int(sr * L); x = np.zeros(n)
def put(sig, t):
    i = int(t * sr); j = min(n, i + len(sig))
    if i < n: x[i:j] += sig[:j - i]
def drum(f0=65, dur=0.6, amp=1.0):
    t = np.arange(int(sr * dur)) / sr
    f = f0 * (1 + 1.5 * np.exp(-t * 30))
    s = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 7)
    s += 0.25 * np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 40)
    return amp * s
def flute(f, dur):
    t = np.arange(int(sr * dur)) / sr
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
    s = np.sin(2 * np.pi * f * np.cumsum(vib) / sr) + 0.3 * np.sin(4 * np.pi * f * np.cumsum(vib) / sr)
    env = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15)
    return 0.22 * s * np.clip(env, 0, 1)
def gong(dur=6):
    t = np.arange(int(sr * dur)) / sr
    s = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(98, 1), (147, .6), (211, .4), (283, .3)])
    return 0.6 * s * np.exp(-t * 0.7)
beat = 60 / 96
for b in range(int(L / beat)):
    k = b % 8
    put(drum(amp=1.0 if k in (0, 4) else 0.6), b * beat)
    if k in (2, 6, 7): put(drum(140, 0.3, 0.35), b * beat + beat / 2)
scale = [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3]
mel = [(0,2),(2,1),(3,1),(4,2),(3,1),(2,1),(1,2),(0,2),(3,1),(4,1),(5,2),(4,1),(3,1),(2,2),(1,1),(0,3)]
t = 0.5
while t < L - 2:
    for d, ln in mel:
        if t >= L - 2: break
        put(flute(scale[d], ln * beat * 0.95), t); t += ln * beat
put(gong(), 0); put(gong(), max(0, L - 9.5))
x = 0.9 * x / np.abs(x).max()
tmp = tempfile.mkdtemp(); bed = os.path.join(tmp, "nhac.wav")
with wave.open(bed, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype(np.int16).tobytes())
ff = shutil.which("ffmpeg") or os.path.expanduser("~/.local/bin/ffmpeg")
f = (f"[1]adelay=2000,apad,volume=1.6,asplit=2[v][sc];[0]volume=0.55[m];"
     f"[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];"
     f"[md][v]amix=inputs=2:normalize=0,alimiter=limit=0.95,atrim=0:{L}")
subprocess.run([ff, "-y", "-loglevel", "error", "-i", bed, "-i", vo, "-filter_complex", f, "-ar", "44100", out], check=True)
shutil.rmtree(tmp); print("Đã trộn", out)
