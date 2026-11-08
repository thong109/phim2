#!/usr/bin/env bash
# Dựng phim ngắn bằng RevidAPI. Cách dùng:
#   ./dung.sh 3d       [kich-ban/quang-trung.txt] [voice_id]
#   ./dung.sh khac-go  [kich-ban/quang-trung.txt] [voice_id]
set -euo pipefail
cd "$(dirname "$0")"; GOC=$PWD
KIEU=${1:-}; KB=${2:-kich-ban/quang-trung.txt}; GIONG=${3:-9060}
[[ "$KIEU" == 3d || "$KIEU" == khac-go ]] || { echo "Cách dùng: ./dung.sh 3d|khac-go [kich-ban.txt] [voice_id]"; exit 2; }
[ -f "$KB" ] || { echo "Không thấy kịch bản: $KB"; exit 2; }
export PATH="$HOME/.local/bin:$PATH"
for c in node npm python3 ffmpeg; do command -v $c >/dev/null || { echo "Thiếu $c — xem README mục Yêu cầu."; exit 2; }; done
python3 -c "import numpy" 2>/dev/null || { echo "Thiếu numpy: python3 -m pip install numpy"; exit 2; }

# 1. Khoá RevidAPI (bắt buộc)
if [ -z "${REVIDAPI_KEY:-}" ] && [ ! -s "$HOME/.revidapi/khoa" ]; then
  echo "Chưa có khoá RevidAPI. Lấy khoá ở https://revidapi.com rồi chạy:"
  echo "  mkdir -p ~/.revidapi && printf '%s' 'KHOA_CUA_BAN' > ~/.revidapi/khoa && chmod 600 ~/.revidapi/khoa"
  exit 2
fi

TEN=$(basename "$KB" .txt); TAM="ket-qua/.tam-$TEN"; mkdir -p "$TAM"
# 2. Giọng đọc qua RevidAPI — kịch bản không đổi thì dùng lại, không tốn thêm credit
DAU=$({ cat "$KB"; echo "$GIONG"; } | shasum | cut -c1-16)
if [ -s "$TAM/vo.mp3" ] && [ "$(cat "$TAM/vo.dau" 2>/dev/null)" = "$DAU" ]; then echo "• Dùng lại giọng đã đọc."
else echo "• Đọc giọng qua RevidAPI…"; python3 revidapi/tts.py "$KB" "$TAM/vo.mp3" "$GIONG"; echo "$DAU" > "$TAM/vo.dau"; fi
LEN=$({ ffmpeg -i "$TAM/vo.mp3" 2>&1 || true; } | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | awk -F: '{print $1*3600+$2*60+$3}')
echo "• Giọng dài ${LEN}s"

if [ "$KIEU" = 3d ]; then
  TONG=$(python3 -c "print(round(2+$LEN+10.86,2))")
  echo "{\"len\": $LEN}" > phong-cach-3d/src/vo.json
  python3 chung/nhac.py "$TAM/vo.mp3" "$TAM/tron.wav" "$TONG"
  cd phong-cach-3d; [ -d node_modules ] || npm ci --no-audit --no-fund
  # trình duyệt dựng của Remotion: một số bản Node giải nén dở, tự giải nén lại cho chắc
  npx remotion browser ensure >/dev/null 2>&1 || true
  for z in node_modules/.remotion/chrome-headless-shell/*.zip; do
    [ -f "$z" ] || continue; d="${z%.zip}"; d="$(dirname "$z")/${d##*/chrome-headless-shell-}"
    [ -x "$d/$(basename "${z%.zip}")/chrome-headless-shell" ] || unzip -oq "$z" -d "$d"
  done
  npx remotion render QuangTrung "$GOC/$TAM/hinh.mp4" --gl=angle --concurrency=4
  cd "$GOC"; OUT="ket-qua/$TEN-3d.mp4"; HINH=(-c:v copy)
else
  python3 chung/nhac.py "$TAM/vo.mp3" "$TAM/tron.wav" 60
  cd phong-cach-khac-go; [ -d node_modules ] || { npm ci --no-audit --no-fund && npx playwright-core install chromium-headless-shell; }
  node loi/render/video.mjs phim/quang-trung --fps 24 --workers 3 --size 1080x1920 --out "$GOC/$TAM/hinh.mp4"
  cd "$GOC"; OUT="ket-qua/$TEN-khac-go.mp4"; HINH=(-c:v libx264 -crf 26 -preset medium -pix_fmt yuv420p)
fi
# ghép hình + tiếng, chuẩn âm lượng -14 LUFS
ffmpeg -y -loglevel error -i "$TAM/hinh.mp4" -i "$TAM/tron.wav" -map 0:v -map 1:a "${HINH[@]}" \
  -af loudnorm=I=-14:TP=-1.2:LRA=11 -c:a aac -b:a 192k -ar 44100 -shortest -map_metadata -1 -metadata title="RevidAPI" -movflags +faststart "$OUT"
echo "✔ Xong: $OUT"
