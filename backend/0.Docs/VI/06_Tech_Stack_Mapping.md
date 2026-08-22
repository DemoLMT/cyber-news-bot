# Ánh xạ Công nghệ Hiện thực (Technology Stack Mapping) V1

Tài liệu này đặc tả chi tiết các công nghệ, thư viện và cơ chế hiện thực được chọn để giải quyết các vấn đề logic nêu trong [01_System_Architecture.md](01_System_Architecture.md) cho phiên bản V1.

---

## 1. Bản đồ Ánh xạ Thành phần (Component Tech Mapping)

| Thành phần Logic (trong Kiến trúc) | Công nghệ / Thư viện lựa chọn | Vai trò và Lý do lựa chọn trong V1 |
| :--- | :--- | :--- |
| **Workflow Controller** | Python CLI script (`scripts/run_agent.py`) | Khởi chạy standalone, xử lý tham số dòng lệnh qua thư viện `argparse`, nạp biến môi trường từ `.env` bằng `python-dotenv`. |
| **State Graph & Memory** | `LangGraph` (hoặc State-machine tự viết) | Quản lý vòng đời chạy tuần tự của các Node, truyền trạng thái qua các bước dưới dạng Python `TypedDict`. |
| **Embedded Database** | **SQLite** (`sqlite3` / `SQLAlchemy`) | Lưu trữ file vật lý `storage/database/history.db`. Nhẹ, có sẵn trong Python, không cần cài đặt dịch vụ chạy ngầm. Quản lý bảng `runs` và bảng `dedupe_registry`. |
| **Browser Automation Engine** | **Playwright for Python** (`playwright`) | Tự động hóa trình duyệt (headed/headless). Sử dụng cơ chế lưu trữ Browser Context (Persistent Context) để tái sử dụng cookie đăng nhập đã có, giảm thiểu việc gõ mật khẩu trực tiếp. |
| **Local LLM Gateway** | **Ollama** (`http://localhost:11434`) | Chạy mô hình ngôn ngữ cục bộ (ví dụ: `qwen2.5:7b-instruct` hoặc `llama3:8b-instruct`). Hỗ trợ JSON Mode giúp ép buộc cấu hình đầu ra chuẩn cho từng section. |
| **Notification Sender** | **Telegram Bot API** (`httpx`) | Gửi tin nhắn định dạng Markdown và gọi API Telegram để đính kèm tải trực tiếp file `.md` chi tiết lên điện thoại của người dùng mà không cần đồng bộ đám mây phức tạp. |
| **OS Scheduler** | **Cron Job** (Linux/macOS `crontab`) | Hẹn giờ chạy hệ thống hàng ngày (ví dụ: `0 18 * * * /usr/bin/python3 /path/to/run_agent.py`). |

---

## 2. Giải pháp kỹ thuật cho từng Bước trong AI Pipeline

### Bước 1: Thu thập (Collect) bằng Browser Automation & APIs
*   **RSS / Public APIs:** Sử dụng thư viện `httpx` (hoặc `requests`) chạy không đồng bộ (`asyncio`) để tải đồng thời nhiều nguồn tin công cộng (arXiv, GitHub Search API) có cấu hình `timeout=10` và xử lý lỗi thử lại (retry).
*   **Computer Use (Playwright):** 
    *   Sử dụng thư viện `playwright.async_api`.
    *   Để xử lý **Human-in-the-loop (require_review)**: Khi chạy ở chế độ này, code Playwright sẽ tạm dừng bằng hàm `await asyncio.get_event_loop().run_in_executor(None, input, "Nhấn A để Duyệt, R để Từ chối, I để Can thiệp: ")`. Đồng thời lưu ảnh chụp màn hình hiện tại vào `storage/logs/last_screenshot.png` để người dùng kiểm tra nhanh.
    *   Để xử lý **Adaptive Context**: Nếu người dùng chọn `I`, chuỗi text nhập vào sẽ được chuyển vào Prompt của bộ sinh hành động (Action Generator LLM) để sinh ra bước click hoặc điền thông tin mới dựa trên chỉ thị đó.

### Bước 2: Chuẩn hóa & Lọc trùng (Normalize & Dedupe) bằng SQLite
*   **Chuẩn hóa dữ liệu:** Sử dụng Pydantic models để ép kiểu dữ liệu thô về một schema chung (`Title`, `URL`, `Source`, `Published_At`, `Raw_Text`).
*   **Lọc trùng (Deduplication):**
    *   Tạo bảng `dedupe_registry` trong SQLite với chỉ mục unique trên trường `content_hash` (MD5/SHA256 của tiêu đề hoặc nội dung bài viết).
    *   Với mỗi tin mới, chạy truy vấn kiểm tra sự tồn tại của hash. Nếu đã tồn tại trong lịch sử 7 ngày, bỏ qua để tránh trùng bài cũ đã báo cáo.

### Bước 3: Chấm điểm và Phân cụm (Rank & Cluster) bằng Python
*   **Phân cụm đơn giản:** Nhóm các bài viết có độ tương đồng tiêu đề cao bằng thuật toán so khớp chuỗi cơ bản (ví dụ: `difflib.SequenceMatcher` hoặc fuzzy string matching bằng `rapidfuzz`), tránh sử dụng các mô hình embeddings nặng nề để giảm thời gian xử lý cục bộ.
*   **Chấm điểm (Ranking):** Viết bộ chấm điểm dựa trên quy tắc (Rule-based scoring) tính điểm bằng trọng số cộng điểm độ mới (recency) và độ uy tín của nguồn tin.

### Bước 4: Tổng hợp LLM (Summarize) bằng Ollama JSON Mode
*   **Context window control (Token Budgeting):** Giới hạn danh sách bài viết đưa vào prompt (chỉ lấy top 5 bài viết có điểm số cao nhất cho mỗi phân đoạn tin tức).
*   **JSON Enforcement:** Thiết lập tham số `"format": "json"` trong payload gọi API của Ollama để đảm bảo phản hồi trả về là cấu trúc JSON hợp lệ khớp với Pydantic schema đã định cấu hình.

### Bước 5: Gửi thông báo (Notify) qua Telegram API
*   **API gọi:** Sử dụng `POST https://api.telegram.org/bot<TOKEN>/sendDocument` để tải tệp `.md` từ thư mục `storage/digests/` và gửi kèm caption là phần tóm tắt 5-10 dòng quan trọng nhất.
