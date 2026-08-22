# Yêu cầu sản phẩm - Local AI Daily Intelligence Agent

## Tầm nhìn

Xây dựng một AI-agent chạy trên máy cá nhân/server riêng, sử dụng mô hình ngôn ngữ lớn nội bộ (Local LLM) để tự động tổng hợp thông tin quan trọng trong ngày và gửi thông báo đến smartphone của Client. Hệ thống ưu tiên an toàn, có nguồn dẫn rõ ràng, và không thực hiện các hành động rủi ro hoặc giao dịch trên máy tính.

## Người dùng chính

- **Client cá nhân**: Cần nắm nhanh tin nóng, thị trường, AI paper, GitHub repo mới nổi bật mỗi ngày.
- **Operator/AI engineer**: Quản trị nguồn dữ liệu, lịch chạy, mô hình local, và chất lượng bản tin.

## Mục tiêu V1 trong 1 tuần

V1 có khả năng tạo được một daily digest tự động, chạy theo lịch hoặc kích hoạt thủ công qua dòng lệnh, gồm 5 nhóm nội dung:

1. Chính trị, thời sự trong và ngoài nước, chỉ lấy các thông tin thực sự nóng trong ngày.
2. Thông tin quan trọng về chứng khoán Việt Nam, giá vàng trong nước, và các tin tức ảnh hưởng đến thị trường chứng khoán/vàng.
3. Danh sách cổ phiếu đáng chú ý trong 1-2 tháng tới dựa trên tin tức, động lực ngành, tính mùa vụ, và tín hiệu thị trường. Đây là watchlist nghiên cứu cá nhân, không phải khuyến nghị mua/bán.
4. Thông tin công nghệ AI mới, nghiên cứu (paper) AI trong ngày, và các xu hướng kỹ thuật đang phát triển.
5. Top 5 GitHub repo mới nổi bật trong ngày, tránh lặp lại các repo đã báo cáo trước đó.

Sau khi tổng hợp, hệ thống gửi thông báo tóm tắt về smartphone của Client kèm đường dẫn truy cập trực tiếp file Markdown chi tiết trên máy.

## Yêu cầu chức năng

### Thu thập dữ liệu

- Cấu hình được danh sách nguồn tin theo nhóm: thời sự, thị trường, vàng, AI, GitHub qua file cấu hình cục bộ.
- Hỗ trợ thu thập qua các nguồn công cộng miễn phí (RSS/API công cộng) và sử dụng công cụ điều khiển máy tính (Computer Use) tự động đăng nhập vào các tài khoản phụ/tài khoản nghiên cứu chuyên dụng (do người dùng tự cài đặt và cung cấp thông tin đăng nhập cục bộ) để thu thập dữ liệu thay vì dùng API trả phí.
- Lưu trữ dữ liệu thô dạng file cục bộ, URL nguồn, thời điểm thu thập và checksum để phục vụ kiểm tra/lọc trùng.
- Có cơ chế thử lại (retry), giới hạn thời gian chờ (timeout), giới hạn tần suất (rate limit), và bỏ qua nguồn tin bị lỗi mà không làm ảnh hưởng đến toàn bộ chu trình.

### Xử lý và xếp hạng

- Chuẩn hóa tin bài thành cấu trúc chung: tiêu đề (title), nguồn (source), url, ngày đăng (published_at), nội dung thô/tóm tắt (summary/raw_text), chủ đề (topic), ngôn ngữ.
- Loại trùng tin bài dựa trên URL chính tắc (canonical URL), độ tương đồng tiêu đề và nội dung.
- Chấm điểm độ nóng dựa trên độ mới, số lượng nguồn độc lập đề cập, từ khóa/tác động thị trường và mức độ liên quan.
- Đối với cổ phiếu: tạo watchlist có lý do, xúc tác (catalyst), rủi ro, khung thời gian 1-2 tháng, và mức độ tin cậy. Tuyệt đối không sử dụng ngôn ngữ cam kết lợi nhuận.
- Đối với GitHub: chỉ lấy các repo mới hoặc xuất hiện lần đầu trong ngày; lưu lịch sử nhận diện để tránh trùng lặp.

### Tổng hợp bằng AI

- Sử dụng Local LLM thông qua giao tiếp tiêu chuẩn để dễ dàng chuyển đổi mô hình (như Ollama).
- Yêu cầu mô hình trả về cấu trúc dữ liệu trước khi xuất ra định dạng Markdown cuối cùng.
- Mỗi thông tin phân tích quan trọng phải đi kèm ít nhất một URL nguồn gốc rõ ràng.
- Có bước xác thực đơn giản: kiểm tra tính tồn tại của URL, ngày tháng, tính chính xác số liệu và phát hiện các khẳng định quá mức.

### Gửi thông báo

- Gửi thông báo tóm tắt ngắn gọn (5-10 gạch đầu dòng quan trọng nhất) kèm đường dẫn file chi tiết đến smartphone qua công cụ gửi thông báo (Notification Tool).
- Có trạng thái gửi thành công/thất bại và cơ chế thử lại.

### Computer-use an toàn và Can thiệp trực tiếp (Human-in-the-loop)

- V1 chỉ sử dụng các thao tác điều khiển máy tính trong phạm vi được định nghĩa trước (như mở trình duyệt, tự động đăng nhập tài khoản lấy dữ liệu tài chính).
- Hỗ trợ cơ chế **Human-in-the-loop** với hai chế độ:
  - `accept_all`: Agent tự động chạy toàn bộ quy trình cạo tin và đăng nhập.
  - `require_review`: Agent tạm dừng trước các hành động điều khiển quan trọng, hiển thị hành động dự kiến và ảnh chụp màn hình lên console, chờ người dùng xác nhận (`Approve` / `Reject`).
- Hỗ trợ **Adaptive Context (Tiêm ngữ cảnh hiệu chỉnh)**: Khi Agent gặp lỗi (như nhập sai mật khẩu, sai captcha, hoặc thay đổi giao diện), người dùng có thể nhập chỉ dẫn hiệu chỉnh từ console để định hướng lại hành vi cho Agent ngay lập tức, tránh việc Agent bị lặp lỗi vô tận.
- Mọi hành động của Agent phải được ghi nhật ký hoạt động (audit log): thời gian, URL, thao tác, kết quả, ảnh chụp màn hình tương ứng và chi tiết lỗi nếu có.


## Yêu cầu phi chức năng

- Chạy trực tiếp cục bộ trên máy tính cá nhân của Client (hoặc server riêng).
- Hệ thống được thiết kế dưới dạng đồ thị trạng thái Agent (State Graph) chạy trực tiếp (Standalone CLI/Cron), không cần web server ngầm (FastAPI) hay cơ sở dữ liệu quan hệ phức tạp (PostgreSQL).
- Sử dụng cơ sở dữ liệu SQLite dạng file cục bộ (`storage/database/history.db`) để quản lý lịch sử chạy và khử trùng thông tin. Lưu trữ dữ liệu thô (JSON) và các bản tin tổng hợp trực tiếp dưới dạng file văn bản (Markdown) trên ổ đĩa cục bộ.
- Cấu hình qua file cấu hình cục bộ và biến môi trường, không ghi cứng thông tin bảo mật (secrets).
- Log hoạt động rõ ràng, gán mã chạy (run ID) cho mỗi lần thực thi.
- Chấp nhận các nguồn tin riêng lẻ bị lỗi nhưng vẫn tạo được bản tin tổng hợp nếu các nguồn khác hoạt động tốt.
- Đầu ra bằng tiếng Việt, ngắn gọn, có nguồn dẫn và cảnh báo rủi ro tài chính rõ ràng.

## Tiêu chí chấp nhận V1

- Kích hoạt chạy daily_digest tự động theo lịch hoặc thủ công bằng dòng lệnh.
- Tạo được bản tin Markdown đầy đủ 5 nhóm nội dung nếu nguồn dữ liệu khả dụng.
- Lưu trữ đầy đủ dữ liệu thô, log chạy, file bản tin Markdown cục bộ.
- Gửi được thông báo tóm tắt đến smartphone của người dùng qua công cụ nhắn tin.
- Mỗi phân đoạn trong digest có đầy đủ URL nguồn.
- Watchlist cổ phiếu có disclaimer và không chứa khuyến nghị giao dịch/mua bán hoặc cam kết lợi nhuận.
- Nhật ký vận hành (Audit log) của Computer Use được ghi nhận đầy đủ.

## Ngoài phạm vi V1

- Tự động giao dịch, đặt lệnh mua bán chứng khoán/vàng.
- Tự động đăng bài lên mạng xã hội.
- Hệ thống đa người dùng hoặc phân quyền phức tạp.
- Ứng dụng di động (Mobile App) riêng biệt.
- Tự động điều khiển máy tính ngoài phạm vi thu thập thông tin.
- Báo cáo tư vấn đầu tư chuyên nghiệp.

## Thông tin đã làm rõ

- **Kênh nhận thông báo**: Smartphone qua Telegram Bot (gửi tin nhắn tóm tắt và đính kèm trực tiếp file Markdown chi tiết).
- **Môi trường chạy Local**: Máy cá nhân có cài đặt Local LLM runtime (như Ollama).
- **Nguồn dữ liệu thị trường/vàng**: Tự động điều khiển máy tính (Computer Use) đăng nhập vào các tài khoản phụ chuyên dụng để lấy thông tin.
- **Thời điểm gửi bản tin**: 6PM - 7PM hàng ngày.
- **Định dạng bản tin**: File Markdown chi tiết.
- **Thời gian lưu trữ**: 7 ngày gần nhất.
