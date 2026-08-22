# Local AI Daily Intelligence Agent

## Chạy toàn bộ hệ thống

Từ thư mục `backend`, cài dependency và khởi động cả frontend tĩnh lẫn API bằng một lệnh:

```powershell
npm install
npm start
```

Server phục vụ các trang `/`, `/dang-nhap`, `/dang-ky`, `/bantin` và `/vinh-danh`. MongoDB mặc định dùng `mongodb://127.0.0.1:27017/cyber_cti`; có thể đổi bằng `MONGODB_URI` trong `.env`. Các API chính là `/api/auth/login`, `/api/auth/register`, `/api/cyber/bulletins`, `/api/news`, `/api/awards` và `/api/health`.

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
</p>

<p align="center">
  <b>Bản Tiếng Việt</b> | <a href="README_EN.md">English Edition</a>
</p>

Hệ thống AI Agent cá nhân chạy hoàn toàn cục bộ (Local-only), sử dụng mô hình ngôn ngữ lớn (Local LLM) để tự động thu thập tin tức, dữ liệu thị trường tài chính, nghiên cứu AI mới, repo GitHub nổi bật và gửi báo cáo hàng ngày đến smartphone của người dùng qua Telegram.

---

## 🌟 Các điểm nổi bật của dự án

1. **Local-first & Bảo mật:** Dữ liệu được lưu trữ, xử lý và phân tích hoàn toàn trên máy cục bộ của bạn. Không sử dụng các dịch vụ đám mây bên thứ ba ngoại trừ kênh gửi tin nhắn Telegram.
2. **Hệ thống điều khiển trạng thái (State Graph):** Quy trình chạy được kiểm soát chặt chẽ bằng `LangGraph`, chia luồng xử lý thành các Node độc lập (Thu thập $\rightarrow$ Chuẩn hóa $\rightarrow$ Lọc trùng $\rightarrow$ Gom cụm/Chấm điểm $\rightarrow$ Tổng hợp LLM $\rightarrow$ Xác thực $\rightarrow$ Gửi báo cáo).
3. **Thu thập tin tức thông minh:** 
   - Đọc tin tự động qua các luồng RSS và API công cộng.
   - Sử dụng **Tự động hóa Trình duyệt (Playwright)** để tự động đăng nhập vào các tài khoản phụ/nghiên cứu chuyên dụng nhằm lấy dữ liệu tài chính (giá vàng, thị trường chứng khoán) thay thế các API trả phí.
4. **Cơ chế Duyệt & Can thiệp (Human-in-the-loop & Adaptive Context):** 
   - Chế độ `require_review` cho phép tạm dừng trước các hành động trình duyệt nhạy cảm, hiển thị hình ảnh chụp màn hình thực tế để người dùng xác nhận (`Approve` / `Reject`).
   - Hỗ trợ tiêm ngữ cảnh hiệu chỉnh (`Inject Context`) từ Terminal để giải quyết các lỗi bất ngờ (sai mật khẩu, captcha, đổi giao diện) mà không làm gãy luồng chạy của Agent.
5. **Cơ sở dữ liệu nhúng siêu nhẹ:** Sử dụng SQLite cục bộ để lưu trữ vết chạy (`runs`) và dấu vết bài viết (`dedupe_registry`) nhằm đảm bảo tin tức không bị lặp lại trong vòng 7 ngày.
6. **Báo cáo chuẩn chỉnh:** Bản tin cuối cùng được xuất bản dưới dạng file Markdown chi tiết, đính kèm nguồn dẫn (citations) rõ ràng và gửi tóm tắt ngắn về Telegram cá nhân.

---

## 🛠️ Công nghệ sử dụng

*   **Core Logic:** Python 3.10+, `LangGraph` (Đồ thị trạng thái Agent).
*   **Local LLM Gateway:** `Ollama` (giao tiếp cục bộ qua cổng `11434`).
*   **Database:** SQLite kết hợp `SQLAlchemy` ORM để lưu trữ và lọc trùng tin tức.
*   **Browser Automation:** `Playwright` hỗ trợ thu thập dữ liệu bằng trình duyệt headless/headed.
*   **Network Client:** `httpx` cho các request không đồng bộ (`asyncio`) và `feedparser` đọc RSS.
*   **Template Rendering:** `Jinja2` kết hợp thư viện `markdown` để xuất bản báo cáo.
*   **Notification:** Telegram Bot API.

---

## 📁 Cấu trúc thư mục dự án

```text
AI_agent_computer_use/
├── 0.Docs/                   # Tài liệu đặc tả và kế hoạch thiết kế dự án (Master Plan, Architecture...)
├── agent/                    # Mã nguồn cốt lõi của AI Agent
│   ├── models/               # Pydantic schemas quản lý dữ liệu (item, digest)
│   ├── nodes/                # Logic xử lý của từng nút trong LangGraph (collect, deduplicate, notify...)
│   ├── tools/                # Các module thực thi (Playwright, DB manager, LLM, Telegram...)
│   ├── graph.py              # Định nghĩa sơ đồ luồng chạy đồ thị trạng thái
│   └── state.py              # Định nghĩa trạng thái dùng chung (AgentState)
├── config/                   # Cấu hình hệ thống dạng YAML
│   ├── app.yaml              # Cấu hình hoạt động chung của Agent
│   └── sources.yaml          # Danh sách cấu hình các nguồn thu thập tin tức
├── database/                 # Thiết lập SQLite
│   ├── connection.py         # Khởi tạo kết nối SQLAlchemy Engine
│   └── schema.py             # Schema các bảng cơ sở dữ liệu (runs, dedupe_registry)
├── scripts/                  # Scripts khởi chạy và thiết lập
│   ├── run_agent.py          # Entrypoint chạy CLI Agent
│   └── setup_env.sh          # Script tự động cấu hình môi trường ảo venv
├── storage/                  # Thư mục chứa dữ liệu đầu ra (Được tạo tự động khi chạy)
│   ├── database/             # File SQLite (history.db)
│   ├── digests/              # Lưu trữ báo cáo Markdown và dữ liệu thô JSON hàng ngày
│   └── logs/                 # Logs hoạt động và ảnh chụp màn hình trình duyệt (audit logs)
├── .env.example              # File mẫu định cấu hình biến môi trường
├── requirements.txt          # Danh sách thư viện Python phụ thuộc
└── README.md                 # Tài liệu hướng dẫn sử dụng chính này
```

---

## 🚀 Hướng dẫn khởi động Ollama cục bộ

Dự án này sử dụng mô hình ngôn ngữ lớn chạy nội bộ qua **Ollama** để phân tích và tóm tắt tin tức. Hãy làm theo các bước sau để thiết lập:

### Bước 1: Cài đặt Ollama
Tải và cài đặt phiên bản phù hợp với hệ điều hành của bạn từ trang chủ: [Ollama.com](https://ollama.com).
*   **Linux/macOS:** Chạy lệnh cài đặt nhanh:
    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```

### Bước 2: Tải mô hình ngôn ngữ (LLM)
Mô hình khuyến nghị sử dụng là `qwen2.5:7b-instruct` (hỗ trợ tiếng Việt tốt và sinh JSON ổn định) hoặc `llama3:8b-instruct`. 
Mở Terminal của máy và chạy lệnh sau:
```bash
# Tải mô hình Qwen 2.5
ollama pull qwen2.5:7b-instruct

# Hoặc tải mô hình Llama 3
ollama pull llama3:8b-instruct
```

### Bước 3: Khởi động dịch vụ Ollama
Thông thường, sau khi cài đặt, dịch vụ Ollama sẽ tự khởi động dưới nền. Bạn có thể kiểm tra hoặc chạy dịch vụ thủ công bằng lệnh:
```bash
ollama serve
```
*   *Lưu ý:* Cổng mặc định của Ollama là `http://localhost:11434`. Hệ thống Agent sẽ tự động kết nối qua cổng này. Bạn có thể kiểm tra dịch vụ đã hoạt động hay chưa bằng cách truy cập địa chỉ đó trên trình duyệt, màn hình sẽ hiển thị `Ollama is running`.
