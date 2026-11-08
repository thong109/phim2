# Xưởng phim cục bộ

Chạy `python studio/app.py`, mở `http://localhost:3210`. Hoặc mở `CHAY-XUONG-PHIM.cmd` ở thư mục gốc.

Không cần tài khoản, khóa API hoặc ChatGPT để sử dụng. Phân cảnh AI dùng Qwen3-8B qua llama.cpp trên loopback; giọng dùng Piper; hình dùng thư viện Canvas/SVG; video được mã hóa bằng FFmpeg. Không có dịch vụ tạo video đám mây trong luồng này.

## Hai luồng

- **Tạo video tự động:** nhận diện nhân vật → phân cảnh → tạo giọng → đo thời lượng → dựng toàn bộ → kiểm tra giải mã → MP4.
- **Chia cảnh để tôi sửa:** dừng ở bàn dựng, cho sửa tên, tóc, màu áo/da, nhân vật trong từng cảnh, hành động, cảm xúc, vị trí, bối cảnh, góc máy và lời kể. Lưu rồi dựng.

Chọn **Cơ bản** nếu không dùng mô hình phân cảnh. Đây là bộ quy tắc từ khóa, không phải AI hiểu nội dung. Giọng Piper vẫn là AI cục bộ.

## Cấu trúc

- `app.py`: HTTP server 127.0.0.1:3210, hàng đợi một tác vụ, trạng thái lưu trên đĩa, sửa cảnh, video byte ranges.
- `planner.py`: chia lời kể không mất nội dung, nhận diện cast và chọn metadata bằng Qwen; JSON schema ràng buộc đầu ra; một lần sửa khi đầu ra không hợp lệ. Không cho mô hình viết lại lời kể.
- `engine.py`: giới hạn thư viện cảnh/hành động và kiểm tra storyboard.
- `pipeline/scripts/speech_sync.py`: tách lời kể/câu thoại mà không đổi nội dung, đo từng phần từ WAV thật và lấy đường bao âm lượng.
- `pipeline/assets/mouth-sync.js`: chỉ mở miệng đúng vai trong khoảng thoại đã đo; ngắt khi lời kể, im lặng hoặc người khác nói. Đây là đồng bộ nhịp âm thanh, chưa phải khẩu hình theo từng âm vị.
- `web/`: giao diện không cần build/npm.
- `pipeline/`: pipeline riêng của project, không phụ thuộc thư mục skill Codex.
- `library/`: bối cảnh SVG gốc.
- `../ket-qua/tu-dong/<mã-tập>/`: kịch bản, trạng thái, storyboard, cache, giọng, clip và video của từng tập. Không nằm trong Git.

## Runtime

Mặc định dùng các thư viện/mô hình đã cài trên máy hiện tại, như khai báo ở `pipeline/assets/local-defaults.json`. Muốn đổi đường dẫn, tạo `studio/settings.json` theo `settings.example.json`. Cài đặt không tự tải model lớn.

Lần đầu AI có thể cần vài phút để nạp. Với CPU, phân cảnh truyện dài có thể mất vài chục phút; trang có thể đóng trong khi cửa sổ chạy ứng dụng vẫn mở. Mỗi lần chỉ chạy một tập để tránh tranh chấp RAM/CPU. Sau khi khởi động lại, tập chưa xong hiện “Chưa hoàn tất” và có nút chạy tiếp. Không giết tiến trình mô hình của ứng dụng khác.

## Kiểm tra

```powershell
python -m unittest discover -s studio/tests -p test_planner.py -v
python -m py_compile studio/app.py studio/planner.py studio/engine.py
node --check studio/web/app.js
python -m unittest discover -s studio/tests -p test_speech_sync.py -v
node studio/tests/test_mouth_sync.cjs
```

Khi ứng dụng đang chạy, kiểm thử API có tạo video ngắn thật:

```powershell
python studio/tests/test_http_flow.py -v
```

Kiểm thử tích hợp thực tế được lưu trong các tập có tên “Kiểm thử…” trên ứng dụng. Kiểm tra video gồm ffprobe, audio presence, thời lượng và giải mã toàn bộ. Những kiểm tra đó không chứng minh hình luôn đúng nội dung hoặc giọng đọc hay. Phụ đề theo tỷ lệ văn bản; diễn hoạt đơn giản, chưa lip sync theo âm vị. Nên xem/nghe video trước khi đăng.

Bản hiện tại đã qua 7 kiểm thử lập cảnh, 3 kiểm thử API và một lần chạy từ lúc AI chưa mở đến MP4 21,688 giây, hai nhân vật/hai cảnh. Đã kiểm tra các khung hình thực tế và video sau khi sửa màu áo/lời kể. Chưa có trình duyệt kết nối qua CUA để kiểm tra thao tác giao diện trực tiếp, chưa nghe soát phát âm, và chưa benchmark toàn bộ phân cảnh AI cho một truyện 20 phút. Báo cáo máy này nằm ở `ket-qua/studio-verification.json`.
