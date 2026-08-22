# Giao diện dòng lệnh & Hợp đồng dữ liệu (CLI and Data Contracts) V1

Tài liệu này đặc tả chi tiết giao diện dòng lệnh (CLI), cấu trúc file cấu hình cục bộ, schema cơ sở dữ liệu **SQLite** và cấu trúc dữ liệu trao đổi giữa các thành phần của hệ thống Local AI Daily Intelligence Agent V1.

---

## 1. Giao diện thực thi CLI (CLI Interface Contract)

Hệ thống được vận hành độc lập thông qua script chạy dòng lệnh `scripts/run_agent.py`.

```bash
python scripts/run_agent.py [OPTIONS]
```

### Các tùy chọn tham số (CLI Options):

| Tham số | Kiểu dữ liệu | Giá trị mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `--dry-run` | Flag | `False` | Chạy thử quy trình thu thập và xử lý tin, gọi LLM nhưng không lưu trữ vào Database và không gửi tin nhắn Telegram. |
| `--mode` | Chuỗi | `require_review` | Chọn chế độ chạy tự động hoặc thủ công. Các giá trị khả dụng: `accept_all` hoặc `require_review`. |
| `--section` | Chuỗi | `all` | Chỉ định một phân mục cụ thể để chạy (ví dụ: `hot_news`, `market_gold`, `stock_watchlist`, `ai_research`, `github_repos`). Mặc định chạy tất cả. |
| `--date` | Chuỗi (YYYY-MM-DD)| Ngày hiện tại | Chạy lại quy trình tổng hợp dữ liệu cho một ngày cụ thể trong quá khứ. |
| `--no-cache` | Flag | `False` | Bắt buộc thu thập dữ liệu mới, bỏ qua bộ nhớ đệm hoặc kiểm tra trùng lặp tạm thời. |

---

## 2. File cấu hình YAML cục bộ (Configuration Contracts)

### 2.1. File cấu hình ứng dụng (`config/app.yaml`)

```yaml
timezone: "Asia/Bangkok"
mode: "require_review" # require_review | accept_all

llm:
  provider: "ollama"
  base_url: "http://localhost:11434"
  model: "qwen2.5:7b-instruct"
  timeout_seconds: 180
  temperature: 0.1

notification:
  provider: "telegram"
  telegram_bot_token: "ENV_TELEGRAM_BOT_TOKEN" # Đọc từ biến môi trường
  telegram_chat_id: "ENV_TELEGRAM_CHAT_ID"     # Đọc từ biến môi trường
  max_bullets: 10

storage:
  base_dir: "storage"
  db_dir: "storage/database"
  raw_dir: "storage/digests/raw"
  reports_dir: "storage/digests/reports"
  log_dir: "storage/logs"
  retention_days: 7
```

### 2.2. File cấu hình nguồn tin (`config/sources.yaml`)

```yaml
sources:
  - id: "vietnam_news_rss_1"
    name: "VnExpress Tin Nóng"
    type: "rss"
    topic: "hot_news"
    url: "https://vnexpress.net/rss/tin-noi-bat.rss"
    reliability: 4
    enabled: true

  - id: "gold_sjc_price"
    name: "Giá vàng SJC công cộng"
    type: "browser" # Sử dụng Browser Automation (Playwright)
    topic: "market_gold"
    url: "https://giavang.doji.vn/"
    reliability: 5
    enabled: true
    selectors:
      gold_buy: ".price-buy"
      gold_sell: ".price-sell"

  - id: "arxiv_ai_papers"
    name: "arXiv Artificial Intelligence"
    type: "api"
    topic: "ai_research"
    url: "https://export.arxiv.org/api/query"
    reliability: 5
    enabled: true
    params:
      search_query: "cat:cs.AI OR cat:cs.LG"
      max_results: 15
```

---

## 3. Schema cơ sở dữ liệu SQLite (`storage/database/history.db`)

Dữ liệu được lưu trữ trong một tệp SQLite cục bộ. Cấu trúc bảng gồm:

### Bảng 3.1. `runs` (Lịch sử các lượt chạy)
Lưu trữ thông tin tổng quan của mỗi lần thực thi script.

| Tên trường | Kiểu dữ liệu SQLite | Thuộc tính | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Định danh duy nhất phiên chạy (UUIDv4) |
| `target_date` | TEXT | NOT NULL | Ngày chạy bản tin (định dạng `YYYY-MM-DD`) |
| `mode` | TEXT | NOT NULL | Chế độ chạy: `accept_all` hoặc `require_review` |
| `status` | TEXT | NOT NULL | Trạng thái: `running`, `success`, `failed` |
| `started_at` | TEXT | NOT NULL | Thời gian bắt đầu chạy (ISO 8601) |
| `finished_at` | TEXT | | Thời gian hoàn thành chạy (ISO 8601) |
| `tokens_used` | INTEGER | | Số token LLM tiêu thụ |
| `error_log` | TEXT | | Nội dung lỗi nếu phiên chạy thất bại |

### Bảng 3.2. `dedupe_registry` (Đăng ký lọc trùng)
Lưu trữ mã băm (hash) nội dung các bài viết để đối chiếu loại trùng trong vòng 7 ngày gần nhất.

| Tên trường | Kiểu dữ liệu SQLite | Thuộc tính | Mô tả |
| :--- | :--- | :--- | :--- |
| `content_hash` | TEXT | PRIMARY KEY | Mã băm duy nhất của bài viết (SHA256 của Title + URL) |
| `source_id` | TEXT | NOT NULL | Mã định danh nguồn tin trong file YAML |
| `topic` | TEXT | NOT NULL | Phân mục chủ đề tin tức |
| `first_seen_at` | TEXT | NOT NULL | Thời gian phát hiện lần đầu (ISO 8601) |

### Bảng 3.3. `browser_audit_logs` (Nhật ký hành động trình duyệt)
Lưu trữ vết hoạt động điều khiển máy tính (Computer Use) của Playwright phục vụ việc hậu kiểm.

| Tên trường | Kiểu dữ liệu SQLite | Thuộc tính | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Định danh tự tăng |
| `run_id` | TEXT | NOT NULL | Khóa ngoại trỏ đến bảng `runs` |
| `action_time` | TEXT | NOT NULL | Thời điểm thực hiện hành động (ISO 8601) |
| `action_type` | TEXT | NOT NULL | Loại hành động: `click`, `input`, `navigate`, `login` |
| `target_selector` | TEXT | | Đối tượng tương tác trên trang web |
| `screenshot_path` | TEXT | | Đường dẫn ảnh chụp màn hình audit lưu cục bộ |
| `user_approval` | TEXT | | Trạng thái duyệt hành động: `approved`, `rejected`, `injected` |
| `injected_text` | TEXT | | Nội dung can thiệp của người dùng nếu có |

---

## 4. Cấu trúc dữ liệu trạng thái của Agent (Agent State Schema)

Đối tượng trạng thái (`AgentState`) truyền nhận giữa các nút trong State Graph được định nghĩa dưới dạng một Pydantic model:

```python
from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    run_id: str                          # UUIDv4 của phiên chạy hiện tại
    target_date: str                     # Ngày định dạng YYYY-MM-DD
    mode: str                            # Chế độ chạy: accept_all | require_review
    stage: str                           # Tên node đang xử lý
    
    raw_items: List[Dict[str, Any]]      # Dữ liệu cạo thô từ các bộ thu thập
    unique_items: List[Dict[str, Any]]   # Dữ liệu sau khi qua bộ lọc trùng SQLite
    candidates: Dict[str, List[Dict[str, Any]]] # Các ứng viên chất lượng được gom theo từng phân mục
    
    section_outputs: Dict[str, Any]     # Output JSON do LLM sinh cho mỗi phân mục
    digest_markdown: str                 # Chuỗi Markdown bản tin hoàn chỉnh cuối cùng
    
    warnings: List[str]                  # Cảnh báo không gây sập luồng (lỗi 1 nguồn tin riêng lẻ)
    errors: List[Dict[str, Any]]         # Chi tiết các lỗi hệ thống gặp phải
```

---

## 5. Định dạng dữ liệu đầu ra (Output Formats)

### 5.1. Định dạng JSON bản tin tóm tắt (`storage/digests/reports/digest_{date}.json`)

```json
{
  "run_id": "8f3a992d-4567-4a8e-a4b7-d1a2f3b4c5d6",
  "date": "2026-05-31",
  "timezone": "Asia/Bangkok",
  "status": "success",
  "executive_summary": [
    "VN-Index tiếp tục giằng co quanh vùng 1.250 điểm với thanh khoản thấp.",
    "Giá vàng SJC trong nước giữ nguyên ở mức 89 triệu đồng/lượng.",
    "Mô hình Qwen 2.5 phát hành phiên bản chuyên biệt cho tác vụ xử lý Agent cục bộ."
  ],
  "sections": {
    "market_gold": [
      {
        "event": "Giá vàng SJC biến động nhẹ",
        "market_angle": "Duy trì chênh lệch cao so với giá vàng thế giới khoảng 12 triệu đồng.",
        "affected_assets": ["SJC", "PNJ"],
        "citations": [
          {
            "title": "Bảng giá vàng DOJI ngày 31/05",
            "url": "https://giavang.doji.vn/"
          }
        ]
      }
    ]
  }
}
```

### 5.2. Định dạng Markdown của tệp tin báo cáo chi tiết (`storage/digests/reports/digest_{date}.md`)

```markdown
# Bản Tin Trí Tuệ Hàng Ngày - 31/05/2026
*Mã phiên chạy: 8f3a992d-4567-4a8e-a4b7-d1a2f3b4c5d6*

---

## 📌 Tóm Tắt Nhanh (Executive Summary)
- VN-Index tiếp tục giằng co quanh vùng 1.250 điểm với thanh khoản thấp.
- Giá vàng SJC trong nước giữ nguyên ở mức 89 triệu đồng/lượng.
- Mô hình Qwen 2.5 phát hành phiên bản chuyên biệt cho tác vụ xử lý Agent cục bộ.

---

## 📈 Thị Trường & Giá Vàng (Market & Gold)
### Giá vàng SJC biến động nhẹ
*   **Góc nhìn thị trường:** Duy trì mức chênh lệch cao so với thế giới ở ngưỡng 12 triệu đồng/lượng.
*   **Tài sản chịu ảnh hưởng:** `SJC`, `PNJ`
*   **Nguồn dẫn:** [Bảng giá vàng DOJI ngày 31/05](https://giavang.doji.vn/)

---
*Cảnh báo: Thông tin trên chỉ mang tính chất nghiên cứu cá nhân, hoàn toàn không phải là lời khuyên hay khuyến nghị đầu tư tài chính.*
```
