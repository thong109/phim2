# Hướng dẫn sử dụng Xưởng phim tự động

## 1. Mở ứng dụng

Mở file CHAY-XUONG-PHIM.cmd trong thư mục project, rồi vào:

**http://localhost:3210**

Hoặc mở PowerShell tại thư mục project và chạy:

    python studio/app.py --port 3210

Giữ cửa sổ này mở khi tạo phim. Đóng tab trình duyệt không làm dừng việc dựng; đóng cửa sổ chạy ứng dụng thì tác vụ có thể bị gián đoạn.

Trang Remotion cũ tại cổng 3000 chủ yếu để xem phim mẫu. **Giao diện nhập truyện, chọn nhân vật và tạo phim mới nằm ở cổng 3210.**

## 2. Đưa kịch bản vào và để tool làm từ đầu đến cuối

1. Bấm **Tạo tập mới**.
2. Nhập tên tập phim.
3. Dán toàn bộ kịch bản, hoặc bấm **Mở file .txt**.
4. Chọn giọng đọc, chất lượng, tốc độ giọng và phụ đề.
5. Ở **Cách chia cảnh**, chọn **AI hiểu kịch bản · Chạy cục bộ**.
6. Bấm **Tạo video tự động**.

Ứng dụng tự nhận diện nhân vật, chia cảnh, chọn bối cảnh/hành động, tạo giọng, đo thời lượng thật, dựng các cảnh, ghép phim và kiểm tra file. Khi xong, xem trực tiếp hoặc bấm **Tải MP4**. SRT tải riêng là phụ đề có thời gian ước lượng, chưa căn từng từ.

Lần đầu có thể phải chờ AI nạp mô hình. Trên CPU, truyện dài có thể cần vài chục phút cho phân cảnh và dựng. Thời gian phụ thuộc độ dài truyện, số cảnh và tải máy; ứng dụng không hứa dựng tức thì.

**Thời lượng phim phụ thuộc lời kể.** Tool không tự bịa thêm nội dung hoặc lặp đoạn để đủ đúng 20 phút. Kịch bản Người đếm thóc hiện cho thời lượng khoảng 17 phút 47 giây.

## 3. Muốn tự xem và sửa cảnh trước khi dựng

Làm các bước nhập truyện như trên, nhưng bấm **Chia cảnh để tôi sửa**.

Khi phân cảnh xong, phần **Bàn dựng** xuất hiện:

- **Dàn nhân vật:** đổi tên, tóc ngắn/dài/búi, màu áo, màu tóc và màu da. Thiết kế này được dùng xuyên suốt tập phim.
- **Thêm nhân vật:** tạo thêm một nhân vật vào thư viện của tập. Sau đó thêm người đó vào những cảnh cần xuất hiện.
- **Danh sách cảnh:** chọn cảnh bên trái.
- **Lời kể:** có thể sửa lời của cảnh. Khi lưu, bản kịch bản của tập được cập nhật theo các cảnh bạn sửa.
- **Bối cảnh / Thời điểm / Góc máy:** chọn ngay trên web.
- **Nhân vật trong cảnh:** chọn ai xuất hiện, hành động, biểu cảm và vị trí trái/giữa/phải. Bấm × để bỏ một người khỏi cảnh; không ảnh hưởng cảnh khác.
- **Khung xem thử:** kéo thanh thời gian để kiểm tra tư thế. Đây là khung hình xem thử; thời lượng thật sẽ được đo sau khi tạo giọng.
- **Người nói cho từng câu thoại:** chọn đúng nhân vật cho mỗi câu trong dấu “…” hoặc "…". Chọn **Người kể / ngoài khung hình** nếu không ai trong cảnh đang nói. Động tác **Cử chỉ nói** chỉ là tư thế; người mở miệng được xác định ở mục này.

Bấm **Lưu thay đổi**, rồi **Dựng toàn bộ tập**. Thay màu áo/tóc sẽ thay thiết kế trong cả tập. Nếu chỉ muốn đổi người đang xuất hiện trong một cảnh, sửa phần Nhân vật trong cảnh.

Nên ghi rõ tên người nói, ví dụ: `Lan nói: “Đừng mở cửa.” Minh đáp: “Tôi biết rồi.”` AI tự gán từng câu; nếu nhầm, đổi người nói trên bàn dựng. Nếu sửa nội dung câu thoại, kiểm tra lại người được gán trước khi dựng.

Miệng chỉ đóng/mở trong câu của đúng nhân vật và bám theo âm thanh thực tế. Lời kể và những đoạn im lặng không làm người nghe mấp máy. Bản hiện tại dùng một giọng đọc chung cho cả tập; chọn người nói chưa tạo giọng riêng cho từng vai. Trong khung xem thử, miệng chỉ có thể bám giọng nếu đã dựng giọng cho nội dung đó.

## 4. Hai cách chia cảnh khác nhau

| Lựa chọn | Thực hiện |
| --- | --- |
| AI hiểu kịch bản | Qwen3-8B cục bộ đọc nội dung và chọn nhân vật, cảnh, hành động; tự khởi động khi cần |
| Cơ bản · Chia theo từ khóa | Không chạy AI phân cảnh; dùng quy tắc đơn giản, nên xem và sửa trước khi dựng |

Chế độ cơ bản không đảm bảo hiểu đại từ hoặc diễn biến phức tạp. Nếu AI không hoạt động, ứng dụng báo lỗi; không âm thầm gọi dịch vụ đám mây hoặc giả vờ đã dùng AI.

AI chỉ trả cách dựng cảnh. Lời kể do tool chia từ nguyên văn kịch bản và được kiểm tra để không mất/lặp đoạn.

## 5. Có cần ChatGPT hoặc khóa API không?

Không cần mở ChatGPT khi sử dụng ứng dụng, cũng không cần khóa RevidAPI/OpenAI cho luồng phim 2D này.

- Qwen chạy cục bộ để phân cảnh.
- Piper chạy cục bộ để đọc truyện. Tên giọng trong danh sách là nhãn model đã cài, không phải cam kết giọng thật của người nổi tiếng.
- Hình dùng thư viện nhân vật Canvas và nền SVG, không phải dịch vụ tạo video AI.
- FFmpeg mã hóa và ghép MP4.

**Piper vẫn là AI.** Nếu muốn không dùng bất kỳ AI nào, kể cả giọng đọc, cần thu giọng riêng. Bản hiện tại chưa có đường nhập giọng thu và tự căn cảnh; đó là phần cần phát triển thêm.

## 6. Phim và dữ liệu được lưu ở đâu?

Mỗi lần tạo một tập, ứng dụng tạo thư mục riêng:

    D:\01-project\revidapi-phim-ngan\ket-qua\tu-dong\<mã-tập>\

| File/thư mục | Nội dung |
| --- | --- |
| story.txt | Kịch bản của tập |
| storyboard.json | Nhân vật và cấu hình các cảnh |
| planning.json | Cache phân cảnh AI để dùng lại khi thử tiếp |
| job.json | Trạng thái và tiến độ |
| audio/ | WAV giọng từng cảnh |
| shots/ | Mã, log và MP4 từng cảnh |
| final.mp4 | Video đầy đủ sau khi thành công |
| captions-estimated.srt | Phụ đề ước lượng |
| timeline.json | Thời lượng thật của từng cảnh |
| qa.json | Kết quả kiểm tra kỹ thuật |
| build.log, qa.log | Nhật ký xử lý |

Tập Người đếm thóc đã dựng trước đó vẫn ở ket-qua/nguoi-dem-thoc/final.mp4 và có chỗ xem ở trang tạo tập mới.

Thư mục ket-qua/ không nằm trong Git. Muốn sao lưu, hãy sao chép cả thư mục tập phim. Chỉ đẩy mã nguồn Git sẽ không mang theo phim, cache và các file giọng.

## 7. Khi đang dựng, bị lỗi hoặc mất điện

- Xem tiến độ ở tập phim đang chọn. Mở **Nhật ký xử lý** nếu muốn biết chi tiết.
- Một thời điểm chỉ xử lý một tập, các tập khác chờ đến lượt.
- Bấm **Dừng tác vụ** để dừng. AI có thể cần một chút thời gian để kết thúc yêu cầu đang chạy.
- Sau khi dừng hoặc lỗi, có thể bấm **Chạy tiếp**. Các dữ liệu đã lưu vẫn còn; cảnh có cache hợp lệ không cần dựng lại.
- Sau khi mở lại ứng dụng, tác vụ đang dang dở hiện **Chưa hoàn tất**; chọn nó rồi chạy tiếp.
- Không xóa các thư mục audio/, shots/ hoặc planning.json nếu muốn tận dụng cache.
- Nếu sửa cảnh sau khi phim đã hoàn thành, cần dựng lại để MP4 phản ánh thay đổi.

## 8. Giới hạn cần biết

Ứng dụng có thể chạy tự động tới MP4, nhưng AI đôi lúc vẫn chọn sai nhân vật, đại từ, bối cảnh hoặc hành động. Với phim định đăng, nên dùng chế độ xem/sửa cảnh hoặc kiểm tra bản xuất.

Đây là hoạt hình 2D cutout: chuyển động nhẹ, nhân vật vẽ sẵn, chưa diễn xuất tay với đồ vật phức tạp và chưa lip sync theo âm vị. Khung video xuất 24 fps, diễn hoạt lấy mẫu 12 hình/giây. Bản hiện tại chủ yếu có giọng đọc, chưa tự sáng tác nhạc hoặc hiệu ứng âm thanh theo cảnh.

Kiểm tra kỹ thuật xác nhận file có hình/âm thanh, thời lượng đúng và giải mã được. Nó không thay thế việc nghe phát âm hoặc xem nội dung cảnh.

## 9. Đổi máy hoặc thay model

Cấu hình mặc định cho máy hiện tại ở:

    studio/pipeline/assets/local-defaults.json

Nếu cần đổi, sao chép studio/settings.example.json thành studio/settings.json rồi sửa đường dẫn model, llama.cpp, Node, Edge và thư mục giọng. Giữ llm_url là địa chỉ loopback trên máy. Không tự tải model lớn khi thiếu model; ứng dụng sẽ báo để bạn chọn hoặc cài đúng runtime.

Để xem cách sửa JSON và dùng các lệnh dựng thủ công của tập mẫu cũ, đọc **HUONG-DAN-THU-CONG.md**. Để xem cấu trúc mã và lệnh kiểm tra ứng dụng, đọc **studio/README.md**.
