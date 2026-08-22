# Lộ trình triển khai & Phân rã nhiệm vụ (Roadmap and Task Breakdown) V1 - 7 ngày

## 1. Mục tiêu V1 sau 7 ngày

Cuối ngày 7, hệ thống phải chạy ổn định end-to-end từ dòng lệnh:
1.  Thu thập dữ liệu thực tế từ các nguồn cấu hình (RSS/API công cộng & Trình duyệt tự động Playwright đăng nhập tài khoản phụ).
2.  Thực hiện chuẩn hóa dữ liệu, đối chiếu SQLite để lọc trùng và xếp hạng độ nóng tin bài.
3.  Gọi Local LLM (Ollama) tổng hợp 5 phân mục chính dưới định dạng cấu trúc JSON ổn định.
4.  Áp dụng cơ chế duyệt hành động (Human-in-the-loop) và tiêm ngữ cảnh (Adaptive Context) trực tiếp từ console khi chạy Playwright.
5.  Xuất bản báo cáo Markdown cục bộ và gửi thông báo trực tiếp lên smartphone qua Telegram Bot kèm file đính kèm.
6.  Có tài liệu vận hành và debug chi tiết.

---

## 2. Kế hoạch chi tiết từng ngày (7-Day Execution Plan)

### Ngày 1: Thiết lập nền tảng và Cơ sở dữ liệu SQLite
*   **Mục tiêu bàn giao (Deliverables):**
    *   Cấu trúc thư mục dự án chuẩn.
    *   Các file cấu hình mẫu (`.env.example`, `config/app.yaml`, `config/sources.yaml`).
    *   Khởi tạo cơ sở dữ liệu SQLite cục bộ (`storage/database/history.db`) và các bảng cơ bản.
*   **Các đầu việc chi tiết (Tasks):**
    *   Tạo khung thư mục dự án: `agent/`, `config/`, `scripts/`, `storage/database/`, `storage/digests/raw/`, `storage/digests/reports/`, `storage/logs/`.
    *   Xây dựng bộ đọc cấu hình (Config Loader) bằng thư viện `PyYAML` và `python-dotenv`.
    *   Setup SQLAlchemy và khởi tạo file DB SQLite cục bộ. Tạo các bảng: `runs`, `dedupe_registry`, `browser_audit_logs`.
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Chạy lệnh kiểm tra kết nối database thành công, tự động tạo file `.db` và các bảng trống.
    *   Đọc và in ra thành công các giá trị cấu hình từ YAML/ENV.

### Ngày 2: Khung điều phối Agent (State Graph Core) và Telegram Adapter
*   **Mục tiêu bàn giao (Deliverables):**
    *   Luồng State Graph (đồ thị trạng thái) cơ bản chạy qua các node rỗng.
    *   Tích hợp Telegram Bot gửi được tin nhắn test và file vật lý.
*   **Các đầu việc chi tiết (Tasks):**
    *   Thiết lập đồ thị trạng thái Agent (State Graph) bằng `LangGraph` hoặc xây dựng luồng State Machine tùy biến bằng Python.
    *   Khai báo cấu trúc `AgentState` lưu trữ trong RAM suốt phiên chạy.
    *   Viết adapter kết nối Telegram Bot sử dụng `httpx`, test tính năng gửi tin nhắn và gửi document (tệp tin).
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Chạy `python scripts/run_agent.py` kích hoạt graph đi qua đủ các node từ 1 đến 6 theo sơ đồ thiết kế.
    *   Điện thoại nhận được tin nhắn Telegram thử nghiệm có đính kèm file text ngẫu nhiên.

### Ngày 3: Xây dựng các bộ thu thập công cộng (RSS/APIs) và Chuẩn hóa Pydantic
*   **Mục tiêu bàn giao (Deliverables):**
    *   Thu thập dữ liệu thật từ RSS VnExpress, arXiv và GitHub Search API.
    *   Mô hình hóa dữ liệu bằng Pydantic.
*   **Các đầu việc chi tiết (Tasks):**
    *   Viết generic RSS collector sử dụng `feedparser` hoặc `httpx`.
    *   Viết collector kết nối arXiv API lấy danh sách bài nghiên cứu AI.
    *   Viết collector kết nối GitHub API lấy danh sách các repository hot trong ngày.
    *   Tạo Pydantic schemas để định hình dữ liệu chuẩn hóa (`normalized_items`).
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Chạy script thu thập lấy được danh sách bài viết thật từ RSS/API, tự động ghi file raw JSON vào `storage/digests/raw/`.
    *   Dữ liệu thô parse thành công qua Pydantic models mà không gặp lỗi cấu trúc.

### Ngày 4: Trình duyệt tự động (Playwright Browser Automation) & Chế độ duyệt HITL
*   **Mục tiêu bàn giao (Deliverables):**
    *   Mã kịch bản Playwright đăng nhập tài khoản phụ thu thập giá vàng/chứng khoán.
    *   Cơ chế dừng chờ xác nhận (require_review) và tiêm context hiệu chỉnh từ console.
*   **Các đầu việc chi tiết (Tasks):**
    *   Cài đặt và thiết lập Playwright trong dự án. Viết kịch bản tự động mở trình duyệt, đăng nhập vào trang dịch vụ phụ và cạo bảng giá.
    *   Xây dựng cơ chế lưu Persistent Context (cookie/session) để giảm tần suất phải đăng nhập lại.
    *   Cài đặt tính năng Human-in-the-loop: Khi đến bước đăng nhập/captcha, hệ thống dừng bằng lệnh console input, lưu screenshot và chờ người dùng nhập lệnh `A` (Approve), `R` (Reject), hoặc `I` (Inject Context).
    *   Viết logic tiêm context (Adaptive Context) để chèn chỉ thị mới vào prompt sinh bước tiếp theo của trình duyệt.
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Chạy thử nghiệm lấy được giá vàng/chứng khoán từ trang web mục tiêu ở chế độ tự động và chế độ kiểm duyệt.
    *   Thử nghiệm nhập sai mật khẩu cố ý -> hệ thống dừng -> người dùng nhập lệnh hiệu chỉnh mật khẩu đúng -> Agent đăng nhập tiếp thành công.

### Ngày 5: Local LLM Gateway (Ollama JSON Mode) và Viết Prompt
*   **Mục tiêu bàn giao (Deliverables):**
    *   Tích hợp thành công Ollama và gọi mô hình cục bộ sinh cấu trúc JSON ổn định.
    *   Viết prompt chuyên biệt cho 5 phân mục tin bài.
*   **Các đầu việc chi tiết (Tasks):**
    *   Viết adapter kết nối với API cục bộ của Ollama, thiết lập JSON Mode.
    *   Xây dựng hệ thống prompt bằng tiếng Việt cho từng phân mục: tổng hợp tin nóng, phân tích thị trường vàng/chứng khoán, chấm điểm watchlist cổ phiếu, tóm tắt AI paper và repo GitHub.
    *   Xử lý kiểm soát kích thước ngữ cảnh (Context Window) để tránh quá tải RAM.
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Gửi thử nghiệm danh sách tin thô sang Ollama, nhận lại phản hồi là chuỗi JSON chuẩn parse được trực tiếp bằng thư viện Python JSON/Pydantic.

### Ngày 6: Bộ lọc trùng SQLite, Xếp hạng (Ranker) & Xác thực an toàn
*   **Mục tiêu bàn giao (Deliverables):**
    *   Cơ chế lọc bài trùng lặp dựa trên SQLite registry.
    *   Thuật toán xếp hạng độ nóng tin bài.
    *   Bộ lọc từ khóa cấm tài chính.
*   **Các đầu việc chi tiết (Tasks):**
    *   Tích hợp bộ băm MD5/SHA256 tiêu đề bài viết và kiểm tra đối chiếu bảng `dedupe_registry` trong SQLite.
    *   Viết thuật toán Ranker tính điểm hotness dựa trên thời gian phát hành và độ tin cậy của nguồn.
    *   Cài đặt bộ quét biểu thức chính quy (Regex Scan) quét qua văn bản do LLM sinh ra để phát hiện và loại bỏ các từ ngữ cam kết tài chính nhạy cảm.
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Chạy test lần 2 với cùng danh sách tin bài -> hệ thống lọc bỏ 100% tin đã cạo ở lần 1.
    *   Nếu mô hình sinh ra từ ngữ cấm (ví dụ: "chắc chắn tăng giá", "khuyến nghị mua"), hệ thống tự động cảnh báo hoặc lọc bỏ.

### Ngày 7: Tích hợp End-to-End, Kết xuất Markdown và Vận hành
*   **Mục tiêu bàn giao (Deliverables):**
    *   Hệ thống chạy trơn tru từ đầu đến cuối chỉ với 1 lệnh kích hoạt.
    *   Báo cáo Markdown/HTML chi tiết kết xuất cục bộ và thông báo Telegram gửi thành công.
    *   Tài liệu hướng dẫn vận hành (Runbook) chi tiết.
*   **Các đầu việc chi tiết (Tasks):**
    *   Kết nối tất cả các node trong State Graph thành một luồng chạy hoàn chỉnh.
    *   Viết bộ kết xuất (Renderer) chuyển dữ liệu JSON từ LLM thành file Markdown và HTML có cấu trúc chuẩn.
    *   Tích hợp bộ dọn dẹp file (Retention policy) xóa file raw/digest cũ hơn 7 ngày.
    *   Viết file hướng dẫn vận hành `05_Safety_And_Operations.md` chi tiết.
*   **Tiêu chí hoàn thành (Definition of Done):**
    *   Lập lịch chạy thử nghiệm qua Cron -> đúng giờ hệ thống tự chạy, cạo tin, tổng hợp và Telegram trên điện thoại nhận được bản tin cùng file đính kèm hoàn chỉnh.
