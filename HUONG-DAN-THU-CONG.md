# Hướng dẫn làm video kể chuyện — bản hiện tại

## 1. Hiện có những gì?

Project đang có hai phần:

| Phần | Chức năng |
| --- | --- |
| Remotion tại `http://localhost:3000` | Xem, phát và tua video; các bản mẫu 3D và bản chuyện ma 2D |
| Pipeline trong `ket-qua/nguoi-dem-thoc/pipeline` | Tạo giọng đọc cục bộ, dựng từng cảnh và ghép thành MP4 |

**Hiện chưa có nút chọn nhân vật, trình soạn cảnh hoặc nút nhập truyện trên web.** Muốn đổi nhân vật/cảnh, bạn sửa file JSON theo phần 4–5. Giao diện chọn bằng chuột là tính năng có thể phát triển thêm, chưa được cài trong bản này.

Tập mẫu là **Người đếm thóc**, dùng nguyên văn truyện bạn gửi. `preview.mp4` chỉ là đoạn thử mở đầu. `final.mp4` là bản toàn bộ sau khi lệnh dựng full hoàn tất.

## 2. Có cần ChatGPT khi sử dụng không?

Không cần ChatGPT để chạy các lệnh dựng tập đã cấu hình. ChatGPT đã hỗ trợ viết mã, chia cảnh và cấu hình tập mẫu; các bước dựng sau đó chạy trên máy.

- Hình: nền SVG và nhân vật 2D vẽ bằng Canvas, không cần dịch vụ tạo ảnh/video AI.
- Giọng: **Piper là mô hình AI chạy cục bộ**, không phải giọng thu thật và không gọi ChatGPT.
- Dựng: Canvas + FFmpeg; pipeline cũng giữ chế độ HyperFrames cho cảnh HTML.
- Bản full dùng chuyển động 12 hình/giây, xuất file 24 fps, phù hợp kiểu hoạt hình cutout đơn giản.

Nếu muốn không dùng bất kỳ AI nào, bạn phải dùng bản thu giọng của mình. Bản hiện tại chưa có lệnh nhập bản thu và tự căn từng cảnh; phần đó cần bổ sung. Không chỉ tắt ChatGPT là biến Piper thành công cụ không AI.

## 3. File nằm ở đâu?

Thư mục gốc: `D:\01-project\revidapi-phim-ngan`.

| Đường dẫn trong project | Nội dung |
| --- | --- |
| `kich-ban/nguoi-dem-thoc.txt` | Bản lưu kịch bản ban đầu |
| `ket-qua/nguoi-dem-thoc/story.txt` | Kịch bản đang được pipeline dùng để kiểm tra |
| `ket-qua/nguoi-dem-thoc/storyboard.json` | Nhân vật, lời kể và bố trí từng cảnh của tập full |
| `ket-qua/nguoi-dem-thoc/storyboard-preview.json` | Bản cấu hình đoạn thử cũ, để tham khảo |
| `ket-qua/nguoi-dem-thoc/backgrounds/` | Nền nhà, kho, làng, cuốn sổ, bàn thờ… dạng SVG |
| `ket-qua/nguoi-dem-thoc/audio/` | Giọng đọc WAV cho từng cảnh |
| `ket-qua/nguoi-dem-thoc/shots/` | HTML, mã cảnh, log và video từng cảnh |
| `ket-qua/nguoi-dem-thoc/final.mp4` | Phim đầy đủ, có sau khi dựng xong |
| `ket-qua/nguoi-dem-thoc/captions-estimated.srt` | Phụ đề có thời gian ước lượng |
| `ket-qua/nguoi-dem-thoc/timeline.json` | Thời lượng thực tế sau khi tạo giọng |
| `ket-qua/nguoi-dem-thoc/qa.json` | Kết quả kiểm tra file video |

Thư mục `ket-qua/` không được Git theo dõi theo cấu hình hiện tại. Nếu muốn sao lưu hoặc chuyển máy, nhớ sao chép cả thư mục tập phim, không chỉ mã nguồn Git.

## 4. Đổi nhân vật ở đâu?

Mở `ket-qua/nguoi-dem-thoc/storyboard.json` bằng VS Code hoặc trình sửa văn bản. Phần `cast` định nghĩa thiết kế nhân vật dùng xuyên suốt phim.

Ví dụ ông Bảy:

```json
"bay": {
  "name": "Ông Bảy Lâm",
  "hair": "short",
  "hairColor": "#7b7d72",
  "skin": "#beaa86",
  "shirt": "#79654e",
  "pants": "#3e4540",
  "age": "elder",
  "moustache": true
}
```

- `name`: tên để người làm phim nhận biết.
- `hair`: `short` (ngắn), `long` (dài), `elder` (búi tóc).
- `hairColor`, `skin`, `shirt`, `pants`: màu tóc, da, áo, quần, viết dạng `#RRGGBB`.
- `age`, `moustache`: chi tiết bổ sung được renderer riêng của tập này hỗ trợ.

Các mã hiện có: `bay`, `hanh`, `mui`, `tam`, `husband`, `child`. Giữ nguyên mã nếu chỉ thay màu hoặc kiểu tóc. Thay `name` không tự thay lời kể trong phim.

Đây là bộ nhân vật vẽ sẵn với ba kiểu tóc và một số hành động. Chưa có chức năng đưa ảnh bất kỳ vào rồi tự biến thành nhân vật có tay chân chuyển động.

## 5. Chọn nhân vật và hành động cho từng cảnh

Trong mảng `shots`, mỗi cảnh có `actors`. Ví dụ:

```json
"actors": [
  {
    "id": "hanh",
    "x": 400,
    "toX": 700,
    "y": 650,
    "scale": 1.16,
    "facing": "right",
    "action": "walk",
    "expression": "scared",
    "walkDuration": 4
  }
]
```

Đoạn này cho Hạnh đi từ trái sang giữa trong 4 giây. `walkDuration` được engine riêng của bản full hỗ trợ.

| Thuộc tính | Cách dùng |
| --- | --- |
| `id` | Mã nhân vật có trong `cast` |
| `x` | Vị trí ngang trên sân khấu 1280: khoảng 300 là trái, 640 là giữa, 1000 là phải |
| `y` | Vị trí chân; khoảng 650 ở gần nền phía trước |
| `scale` | Kích thước; 1.16 là mức thường dùng, trẻ em nhỏ hơn |
| `facing` | `left` hoặc `right` |
| `action` | `idle`, `walk`, `talk`, `sit`, `point`, `scared`, `sleep`, `float` |
| `expression` | `neutral`, `happy`, `sad`, `scared`, `angry` |
| `toX` | Điểm đến ngang khi dùng `walk` |

Để không hiện người trong cảnh, đặt `"actors": []`. Cảnh kể “nghe giọng mẹ” không nhất thiết phải hiện mẹ trong phòng; chỉ thêm nhân vật khi đúng diễn biến truyện.

Các thuộc tính như `counting`, `countingHeight`, `fadeOut`, `tableTray`, `fire` là phần mở rộng viết riêng cho tập Người đếm thóc. Không mặc định rằng mọi hành động phức tạp đều đã được hỗ trợ.

## 6. Đổi nền và góc máy

Ví dụ trong một cảnh:

```json
"background": "backgrounds/warehouse-inside.svg",
"setting": "room",
"lighting": "night",
"camera": "wide",
"effect": "none"
```

- `background`: đường dẫn ảnh nền, tính từ thư mục tập phim. Có thể dùng SVG, PNG hoặc JPG phù hợp 16:9.
- `camera`: `wide`, `push`, `close`.
- `effect`: `none`, `rain`, `fog`.
- Khi có `background`, nội dung và ánh sáng chính nằm trong ảnh đó. Chỉ đổi `lighting` không tự biến ảnh đêm thành ảnh ngày.
- Nếu đổi nền, kiểm tra lại vị trí chân, chỗ ngồi và đồ vật. Ghế hoặc nia thóc không tự di chuyển theo nhân vật.

## 7. Sửa lời kể hoặc làm truyện mới

Mỗi cảnh có `text`, chính là lời sẽ được đọc. Toàn bộ `text` ghép lại phải trùng với `story.txt`, đúng thứ tự và không thiếu/lặp đoạn. Công cụ kiểm tra có thể bỏ qua khác biệt khoảng trắng, nhưng không bỏ qua thay đổi nội dung.

Với tập hiện tại, nếu sửa một câu, sửa cả `story.txt` và `text` của cảnh tương ứng. Giọng của cảnh đó sẽ được tạo lại khi dựng.

Với truyện mới, nên tạo một thư mục tập riêng và chia lại cảnh. Có thể dùng tập hiện tại làm mẫu cấu trúc JSON, nhưng phải sửa tên tập, lời kể, nhân vật và cảnh cho phù hợp. Mỗi cảnh cần `id` riêng. Không chỉ thay `story.txt` rồi bấm dựng: công cụ hiện tại chưa tự hiểu toàn bộ truyện mới và tự đạo diễn cảnh.

**Không chạy lại `prepare.py`, `refine.py` hoặc `prepare_full.py` sau khi tự sửa storyboard.** Đó là script tạo cấu hình cho tập mẫu và có thể ghi đè những gì bạn vừa chỉnh.

## 8. Dựng video trên máy này

Mở PowerShell trong thư mục gốc project:

```powershell
Set-Location 'D:\01-project\revidapi-phim-ngan'
$env:PYTHONIOENCODING = 'utf-8'
```

Kiểm tra cấu hình và bảo đảm không thiếu lời kể:

```powershell
python ket-qua/nguoi-dem-thoc/pipeline/scripts/studio.py validate --project ket-qua/nguoi-dem-thoc
```

Dựng thử ba cảnh đầu:

```powershell
python ket-qua/nguoi-dem-thoc/pipeline/scripts/studio.py build --project ket-qua/nguoi-dem-thoc --limit 3 --draft
```

Lệnh này tạo `preview.mp4`, độ phân giải 854×480; nó không phải phim toàn bộ và không xóa `final.mp4` đã có.

Dựng toàn bộ:

```powershell
python ket-qua/nguoi-dem-thoc/pipeline/scripts/studio.py build --project ket-qua/nguoi-dem-thoc
```

Chỉ bỏ `--limit` mới dựng đủ tất cả cảnh. Bản full mặc định 1280×720. Công cụ tạo WAV, đo thời lượng thật, dựng từng cảnh rồi ghép MP4. Thời lượng phụ thuộc lời kể và tốc độ giọng, không tự kéo thành đúng 20 phút.

Không chạy hai lệnh build cùng lúc vào cùng thư mục tập. Nếu quá trình dừng, giữ các file đã có rồi chạy lại đúng lệnh; cảnh có cache hợp lệ sẽ được dùng lại.

Kiểm tra video sau khi dựng:

```powershell
python ket-qua/nguoi-dem-thoc/pipeline/scripts/studio.py qa --project ket-qua/nguoi-dem-thoc
```

QA kiểm tra kích thước, âm thanh, thời lượng và đọc giải mã toàn bộ file. Vẫn cần tự xem hình và nghe giọng. Thời gian phụ đề là ước lượng theo đoạn, không phải căn từng từ bằng nhận dạng giọng nói.

## 9. Xem trong Remotion

Nếu server chưa chạy, mở PowerShell khác:

```powershell
Set-Location 'D:\01-project\revidapi-phim-ngan\phong-cach-3d'
.\node_modules\.bin\remotion.cmd studio src/index.ts --port=3000 --no-open
```

Mở `http://localhost:3000/NguoiDemThoc`. Nếu chưa cập nhật bản mới vào trang xem, chạy từ thư mục gốc:

```powershell
python ket-qua/nguoi-dem-thoc/cap_nhat_trang_xem.py
```

Lệnh cập nhật dùng bản build vừa hoàn tất. Nếu lần gần nhất chỉ dựng preview, trang sẽ hiển thị preview; nếu lần gần nhất dựng full, trang sẽ hiển thị full. Bạn vẫn có thể mở trực tiếp `final.mp4` bằng trình phát video trên máy.

## 10. Khi có lỗi

| Thông báo/hiện tượng | Kiểm tra |
| --- | --- |
| `Storyboard narration differs from source story` | `story.txt` và các trường `text` chưa trùng nhau |
| `Unknown actor/action` | Sai mã nhân vật hoặc dùng hành động chưa hỗ trợ |
| `Background missing` | Sai tên hoặc đường dẫn nền |
| Không có `final.mp4` | Build chưa xong, bị lỗi, hoặc đang dùng `--limit` |
| Nhân vật ngồi lơ lửng | Sửa vị trí `y`, `scale` và chỗ ghế trong nền |
| Lỗi dựng một cảnh | Mở `shots/<mã-cảnh>/render.log` |
| Chuyển sang máy khác không chạy | Sửa đường dẫn Node, Edge, FFmpeg, Piper trong `pipeline/assets/local-defaults.json` và cài runtime tương ứng |

Pipeline hiện tại phù hợp hoạt hình 2D chuyển động đơn giản. Chọn nhân vật bằng giao diện, tự hiểu cảnh cho truyện mới, ghép giọng thu và diễn hoạt tay với đồ vật là các phần cần phát triển thêm nếu muốn dùng như một ứng dụng hoàn chỉnh.
