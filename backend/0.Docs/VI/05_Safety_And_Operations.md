# Chính sách An toàn & Hướng dẫn Vận hành (Safety and Operations) V1

## 1. Mục tiêu an toàn

Hệ thống được thiết kế để hỗ trợ tổng hợp thông tin hàng ngày mà không tạo ra rủi ro cho máy tính cá nhân, tài sản và các tài khoản giao dịch tài chính của bạn. Nguyên tắc cốt lõi của V1 là **"Đọc dữ liệu có giám sát (Supervised Read-only)"**.

---

## 2. Chính sách điều khiển máy tính (Computer-use Policy)

Để đảm bảo an toàn tuyệt đối khi Agent sử dụng công cụ điều khiển máy tính/trình duyệt tự động (Playwright), hệ thống áp dụng các quy định nghiêm ngặt sau:

### 2.1. Quy tắc sử dụng tài khoản phụ (Dedicated Accounts)
*   **Bắt buộc:** Chỉ cấu hình thông tin đăng nhập của các tài khoản phụ hoặc tài khoản nghiên cứu chuyên dụng trong file `.env` cục bộ. Các tài khoản này chỉ dùng để truy cập xem bảng giá hoặc thông tin thị trường công cộng.
*   **Tái sử dụng phiên đăng nhập (Persistent Context):** Playwright sử dụng thư mục context trình duyệt cục bộ để lưu trữ cookie và session. Sau lần đăng nhập thành công đầu tiên, các phiên chạy sau sẽ tự động kế thừa trạng thái đăng nhập, hạn chế tối đa việc phải thực hiện đăng nhập lại hàng ngày.
*   **Tuyệt đối cấm:** Đăng nhập hoặc lưu trữ cấu hình của tài khoản giao dịch chính, tài khoản ngân hàng hoặc tài khoản có chứa tiền và tài sản thật.

### 2.2. Chế độ vận hành có kiểm duyệt (Human-in-the-loop)
Hệ thống hỗ trợ 2 chế độ cấu hình trong `config/app.yaml` hoặc qua dòng lệnh CLI:
1.  **Chế độ Tự động (`accept_all`):**
    *   Hệ thống chạy tự động hoàn toàn theo kịch bản định sẵn (thích hợp lập lịch Cron chạy vào ban đêm hoặc ngoài giờ làm việc).
    *   Chỉ áp dụng cho các nguồn tin RSS/API công cộng hoặc các kịch bản trình duyệt đơn giản không cần xác thực phức tạp.
2.  **Chế độ Kiểm duyệt (`require_review`):**
    *   **Tạm dừng hành động:** Agent tự động chụp ảnh màn hình và tạm dừng trước các hành động quan trọng (như click nút đăng nhập, hoặc khi phát hiện lỗi tải trang).
    *   **Yêu cầu đầu vào:** In hành động đề xuất ra console và chờ lệnh phản hồi từ người dùng:
        *   `A` (Approve): Cho phép Agent thực hiện hành động đó.
        *   `R` (Reject): Bỏ qua hành động này, ghi nhận lỗi cục bộ và chuyển sang nguồn tin tiếp theo.
        *   `I` (Inject Context): Cho phép người dùng nhập văn bản hiệu chỉnh từ bàn phím console để bẻ lái hành vi Agent.
    *   **Giới hạn thời gian chờ (Input Timeout):** Khi chạy qua Cron, nếu không có người dùng tương tác trực tiếp, bộ nhận diện console sẽ tự động **timeout sau 5 phút** (300 giây). Sau khi hết thời gian chờ, Agent sẽ tự động chọn hành động `R` (Reject) để bỏ qua nguồn tin đó và tiếp tục chạy các phần khác, tránh treo tiến trình hệ thống vô tận.

### 2.3. Cơ chế Tiêm ngữ cảnh hiệu chỉnh (Adaptive Context)
Nếu Agent bị kẹt do nhập thông tin sai hoặc giao diện thay đổi:
*   Người dùng có thể cung cấp ngữ cảnh hiệu chỉnh qua console bằng cách chọn option `I` và nhập text chỉ dẫn trực tiếp (ví dụ: *"Mật khẩu đăng nhập đúng là [Mật khẩu mới]"* hoặc *"Nhấp vào liên kết có chữ 'Giá Vàng Hôm Nay'"*).
*   Chỉ dẫn này sẽ được tiêm trực tiếp vào bộ nhớ phiên chạy và làm tham số định hướng lại luồng sinh hành động tiếp theo của Agent, giúp hệ thống vượt qua các lỗi lặp vô hạn mà không cần khởi động lại toàn bộ chương trình.

### 2.4. Ràng buộc an toàn trình duyệt (Read-only Enforcement)
*   Kịch bản Playwright được viết theo phương thức điều hướng cố định (Hardcoded Scripted Navigation) chỉ gọi các sự kiện trích xuất dữ liệu từ DOM (`innerText`, `textContent`).
*   Mã nguồn kịch bản cấm hoàn toàn việc gọi các selector hoặc sự kiện tương tác với các nút bấm giao dịch tài chính (như Mua, Bán, Chuyển khoản, Rút tiền).

---

## 3. Chính sách an toàn tài chính (Financial Safety Policy)

Bản tin tổng hợp về chứng khoán và vàng được kiểm soát chặt chẽ để đảm bảo tính khách quan và an toàn pháp lý:
*   **Quy ước tên gọi:** Danh mục cổ phiếu được gọi là "Danh sách theo dõi nghiên cứu" (Watchlist), hoàn toàn không được coi là khuyến nghị giao dịch.
*   **Quét cụm từ cấm (Banned Words Scan):** Hệ thống tự động từ chối xuất bản hoặc loại bỏ các câu từ có chứa cụm từ cam kết như: *"chắc chắn tăng"*, *"đảm bảo sinh lời"*, *"không có rủi ro"*, *"cơ hội làm giàu"*.
*   **Bắt buộc trích dẫn (Disclaimer):** Cuối mỗi phân mục tài chính luôn tự động đính kèm dòng chữ cảnh báo:
    > *Cảnh báo: Thông tin trên chỉ mang tính chất nghiên cứu cá nhân, hoàn toàn không phải là lời khuyên hay khuyến nghị đầu tư tài chính.*

---

## 4. Quản lý thông tin bảo mật (Secrets Management)

Các biến cấu hình nhạy cảm được quản lý tại file `.env` cục bộ:
```bash
# Không đẩy file này lên GitHub (đã thêm vào .gitignore)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_CHAT_ID="987654321"
STOCK_SUB_USERNAME="my_sub_account"
STOCK_SUB_PASSWORD="my_sub_password"
```
*   **Quy tắc:**
    *   Tuyệt đối không ghi cứng (hardcode) mật khẩu, token vào mã nguồn.
    *   Hệ thống log ghi file sẽ tự động lọc và ẩn danh (`[REDACTED]`) các giá trị nhạy cảm này trước khi ghi xuống đĩa cứng.

---

## 5. Hướng dẫn Vận hành (Runbook)

### 5.1. Chạy bản tin thủ công (Manual Run)
Kích hoạt chạy hệ thống từ thư mục dự án:
```bash
# Chạy toàn bộ luồng ở chế độ kiểm duyệt hành động (mặc định)
python scripts/run_agent.py --mode require_review

# Chạy tự động hoàn toàn (bỏ qua xác nhận thủ công)
python scripts/run_agent.py --mode accept_all

# Chạy thử nghiệm không ghi đè dữ liệu và không gửi Telegram
python scripts/run_agent.py --dry-run
```

### 5.2. Kiểm tra nhật ký hoạt động (Audit Logs)
*   **Log chạy chính:** Xem file log mới nhất tại `storage/logs/run_agent.log`.
*   **Ảnh chụp màn hình trình duyệt:** Kiểm tra thư mục `storage/logs/` để xem các file ảnh chụp screenshot trong quá trình cạo tin hoặc khi Agent dừng chờ phê duyệt.

### 5.3. Truy vấn lịch sử qua SQLite
Để kiểm tra trạng thái các lượt chạy trước đó, bạn có thể mở SQLite từ terminal:
```bash
# Truy vấn 5 lượt chạy gần nhất
sqlite3 storage/database/history.db "SELECT id, target_date, status, started_at FROM runs ORDER BY started_at DESC LIMIT 5;"

# Xem số lượng tin bài đã lưu để lọc trùng
sqlite3 storage/database/history.db "SELECT COUNT(*), topic FROM dedupe_registry GROUP BY topic;"
```

### 5.4. Xử lý sự cố thường gặp (Troubleshooting)
*   **Lỗi 1: Trình duyệt bị kẹt trang đăng nhập**
    *   *Nguyên nhân:* Trang web thay đổi giao diện hoặc yêu cầu Captcha mới.
    *   *Xử lý:* Chạy script ở chế độ `--mode require_review`. Khi Agent dừng lại, mở ảnh chụp màn hình `storage/logs/last_screenshot.png`, xem mã Captcha hoặc lỗi giao diện, sau đó nhập lệnh `I` trên console để điền thông tin thích ứng (ví dụ: nhập mã captcha đọc được).
*   **Lỗi 2: Tràn VRAM khi gọi Ollama**
    *   *Nguyên nhân:* Quá nhiều bài viết thô đưa vào prompt vượt quá khả năng xử lý của GPU cục bộ.
    *   *Xử lý:* Điều chỉnh tham số giảm số lượng ứng viên tối đa trong file cấu hình `config/app.yaml`.

### 5.5. Cơ chế tự động chạy bù (Catch-up Mechanism)
Do Agent được triển khai cục bộ (local-only) trên máy cá nhân, nếu máy tính bị tắt tại khung giờ kích hoạt của Cron (18h - 19h), lượt chạy ngày hôm đó sẽ bị bỏ lỡ.
*   **Cơ chế hoạt động:** Mỗi khi script `run_agent.py` được khởi chạy (tự động hoặc thủ công), hệ thống sẽ truy vấn bảng `runs` trong SQLite để tìm bản ghi thành công gần nhất.
*   **Xử lý:** Nếu phát hiện ngày hôm trước hoặc các ngày trước đó chưa có digest thành công, Agent sẽ gửi cảnh báo ngắn qua Telegram báo cáo về lượt chạy bị bỏ lỡ và gợi ý chạy bù qua lệnh:
    ```bash
    python scripts/run_agent.py --date YYYY-MM-DD
    ```
