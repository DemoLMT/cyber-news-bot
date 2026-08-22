# Bộ Tài Liệu Thiết Kế Local AI Daily Intelligence Agent V1

Bộ tài liệu này chuyển đổi yêu cầu sản phẩm ban đầu thành kế hoạch chi tiết, sẵn sàng triển khai trong vòng 7 ngày cho hệ thống Local AI Daily Intelligence Agent.

## Thứ tự đọc tài liệu

1. **[Requirements.md](VI/Requirements.md)**: Yêu cầu sản phẩm và tiêu chí chấp nhận cho phiên bản V1.
2. **[00_Master_Plan.md](VI/00_Master_Plan.md)**: Kế hoạch tổng thể của dự án (mục tiêu, phạm vi, cột mốc).
3. **[01_System_Architecture.md](VI/01_System_Architecture.md)**: Kiến trúc hệ thống logic và sơ đồ luồng dữ liệu (Data & Control Flow).
4. **[02_AI_Pipeline.md](VI/02_AI_Pipeline.md)**: Pipeline xử lý AI theo từng giai đoạn (Thu thập -> Lọc trùng -> LLM -> Xác thực -> Telegram).
5. **[03_API_Data_Contracts.md](VI/03_API_Data_Contracts.md)**: Đặc tả tham số CLI, file cấu hình YAML, schema SQLite và cấu hình State.
6. **[04_V1_Roadmap_Task_Breakdown.md](VI/04_V1_Roadmap_Task_Breakdown.md)**: Lộ trình phát triển chi tiết trong 7 ngày.
7. **[05_Safety_And_Operations.md](VI/05_Safety_And_Operations.md)**: Quy tắc an toàn vận hành, cơ chế duyệt (HITL) và xử lý sự cố.
8. **[06_Tech_Stack_Mapping.md](VI/06_Tech_Stack_Mapping.md)**: Ánh xạ từ kiến trúc logic sang thư viện và công nghệ cụ thể trong V1.

---

## Quyết Định Thiết Kế V1 (Quy chuẩn)

Để đảm bảo tính chất "Local-only", bảo mật tối đa cho cá nhân và tối ưu hóa thời gian triển khai, V1 thống nhất các quyết định kỹ thuật sau:

*   **Kiến trúc lõi (Core Engine)**: Standalone Python CLI Script (`scripts/run_agent.py`) hoạt động dựa trên đồ thị trạng thái Agent (State Graph). Không sử dụng Web Server (FastAPI).
*   **Cơ sở dữ liệu (Database)**: SQLite cục bộ (`storage/database/history.db`) để quản lý lịch sử chạy và khử trùng thông tin bài viết. Không sử dụng PostgreSQL.
*   **Môi trường chạy (Runtime)**: Chạy trực tiếp trên môi trường Python ảo (`venv`) cục bộ của máy khách. Không sử dụng Docker Compose.
*   **Bộ lập lịch (Scheduler)**: Sử dụng trình lập lịch hệ điều hành (như Linux Cron Job) để hẹn giờ chạy hàng ngày vào lúc 18h - 19h.
*   **Mô hình ngôn ngữ (Local LLM)**: Ollama API chạy cục bộ (`qwen2.5:7b-instruct` hoặc `llama3:8b-instruct`), sử dụng chế độ JSON Mode để đảm bảo dữ liệu đầu ra có cấu trúc ổn định.
*   **Thu thập dữ liệu (Collectors)**:
    *   *RSS / Public APIs*: Sử dụng `httpx` tải tin tức công cộng (arXiv, GitHub).
    *   *Browser Automation (Playwright)*: Giả lập trình duyệt để đăng nhập vào tài khoản phụ lấy dữ liệu tài chính/giá vàng (chỉ đọc thông tin, cấm click các nút giao dịch).
*   **Kênh thông báo (Notification)**: Telegram Bot API, gửi tóm tắt văn bản ngắn (rich-text) và đính kèm file báo cáo chi tiết (`.md` hoặc `.html`) trực tiếp lên smartphone của Client.
*   **Ràng buộc mạng (Network Boundary)**: Hệ thống chạy hoàn toàn cục bộ nhưng cần kết nối Internet hướng ngoại (outbound) tại thời điểm thực thi để tải tin bài và gửi tin nhắn Telegram.

---

## Trạng Thái Dự Án

*   Tài liệu thiết kế đã được đồng bộ 100%, sẵn sàng để tiến hành tạo khung thư mục dự án (scaffold) và bắt đầu code.
