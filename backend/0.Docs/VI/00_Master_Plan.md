# Kế hoạch tổng thể (Master Plan) - Local AI Daily Intelligence Agent V1

## 1. Tóm tắt dự án

Dự án xây dựng một AI-agent hoạt động local-first có khả năng tự động thu thập, xếp hạng, tổng hợp thông tin quan trọng trong ngày và gửi bản tin tổng hợp (daily digest) về smartphone cho người dùng. Nội dung tập trung vào tin tức nóng, thị trường chứng khoán/vàng, watchlist cổ phiếu nổi bật, công nghệ/paper AI mới và các dự án GitHub thịnh hành.

V1 được triển khai dưới dạng một quy trình Agent (Agentic Workflow) chạy local, thu thập thông tin qua các nguồn công cộng hoặc tự động điều khiển máy tính (Computer Use) để đăng nhập và lấy dữ liệu trực tiếp từ các tài khoản phụ nhằm thay thế hoàn toàn cho các dịch vụ API trả phí. Toàn bộ thông tin được xử lý, tổng hợp bằng mô hình ngôn ngữ lớn nội bộ (Local LLM), xuất trực tiếp ra file Markdown lưu trữ cục bộ và gửi thông báo tóm tắt tới smartphone thông qua Telegram Bot (đính kèm trực tiếp file Markdown báo cáo).

## 2. Mục tiêu kinh doanh

- Giảm thời gian đọc tin và tổng hợp thông tin thủ công mỗi ngày.
- Tạo một bản tin tiếng Việt có nguồn dẫn rõ ràng, dễ đọc trên smartphone dưới dạng tài liệu văn bản (Markdown) lưu trữ cục bộ.
- Tự động hóa việc thu thập thông tin nhạy cảm (như tài khoản chứng khoán, giá vàng) trực tiếp trên máy tính người dùng mà không cần trả phí cho các dịch vụ API dữ liệu.
- Xây dựng nền tảng Agent hoạt động dựa trên luồng công việc (Workflow) làm cơ sở để tiếp tục nâng cấp các tính năng tự động hóa phức tạp hơn sau này.

Chỉ số thành công V1:

- Bản tin daily digest được tạo và gửi đúng lịch ít nhất 5/7 ngày trong tuần đầu tiên.
- Mỗi bản tin chứa đầy đủ các nhóm nội dung nếu nguồn dữ liệu khả dụng.
- Ít nhất 90% thông tin quan trọng có nguồn dẫn rõ ràng.
- Người dùng nhận được thông báo tóm tắt ngắn gọn trên smartphone đúng giờ và có thể truy cập file Markdown chi tiết một cách nhanh chóng.

## 3. Yêu cầu đã xác định

- Hệ thống là AI-agent hoạt động nội bộ, ưu tiên sử dụng mô hình ngôn ngữ lớn chạy cục bộ (Local LLM).
- Có khả năng sử dụng máy tính (Computer Use) một cách an toàn để đăng nhập vào các tài khoản phụ/tài khoản nghiên cứu chuyên dụng (do người dùng tự thiết lập và cấu hình cục bộ) và thu thập thông tin chứng khoán/vàng trực tiếp từ máy tính/trình duyệt.
- Tổng hợp tin chính trị/thời sự trong và ngoài nước thực sự nổi bật trong ngày.
- Watchlist cổ phiếu tiềm năng dựa trên tin tức thị trường, tính mùa vụ, chính sách (chỉ dùng làm tài liệu nghiên cứu cá nhân, không có khuyến nghị giao dịch).
- Tổng hợp công nghệ, nghiên cứu (paper) AI mới và top 5 GitHub repo nổi bật mới xuất hiện trong ngày.
- Tích hợp công cụ gửi thông báo tóm tắt tới smartphone trực tiếp từ luồng xử lý của Agent.

## 4. Giả định tạm thời

- V1 phục vụ cá nhân (single-user), cấu hình hoàn toàn cục bộ.
- Múi giờ hoạt động mặc định: Asia/Bangkok.
- Máy tính chạy Agent trực tuyến vào thời điểm kích hoạt chạy hàng ngày.
- Agent không tự động đặt lệnh giao dịch, không đưa ra tư vấn đầu tư tài chính cá nhân hóa.
- Sử dụng cơ sở dữ liệu SQLite dạng file cục bộ (`storage/database/history.db`) để quản lý lịch sử chạy và khử trùng thông tin bài viết. Toàn bộ dữ liệu thô (JSON) và bản tin tổng hợp (Markdown) được lưu trữ trực tiếp dưới dạng file cục bộ nhằm tối ưu hiệu năng đọc/ghi và quản lý thông tin của Agent.
- Gửi thông báo thông qua công cụ tích hợp trực tiếp trong luồng xử lý Agent.

## 5. Thông tin đã làm rõ

- Mô hình chạy: Local LLM runtime.
- Cấu hình máy chạy: Máy cá nhân (không cần chạy 24/7).
- Nguồn dữ liệu chứng khoán/giá vàng: Tự động điều khiển máy tính (Computer Use) để truy cập các tài khoản phụ/tài khoản nghiên cứu của người dùng để lấy thông tin thị trường/chứng khoán; kết hợp RSS/API miễn phí cho các nguồn tin khác.
- Giờ gửi bản tin: 6PM - 7PM hàng ngày.
- Định dạng bản tin: File Markdown chi tiết lưu cục bộ và tin nhắn thông báo tóm tắt trên smartphone.
- Lưu trữ dữ liệu: Lưu trực tiếp dưới dạng các file Markdown cục bộ (lưu trữ lịch sử 7 ngày gần nhất).
- Ngôn ngữ đầu ra: Tiếng Việt.

## 6. Phạm vi dự án

In scope V1:

- Cấu hình danh mục nguồn tin và thông số hoạt động qua file cấu hình cục bộ.
- Chu trình tự chạy theo lịch (Scheduler) hoặc kích hoạt thủ công bằng dòng lệnh.
- Bộ thu thập dữ liệu (Collectors) hỗ trợ RSS, API miễn phí và công cụ điều khiển máy tính (Computer Use).
- Lọc trùng, chuẩn hóa cấu trúc dữ liệu và xếp hạng độ nóng của tin bài.
- Tổng hợp nội dung bằng Local LLM theo từng phân đoạn chủ đề.
- Xuất kết quả ra file Markdown duy nhất cho mỗi lượt chạy.
- Công cụ gửi thông báo tóm tắt (Notification Tool) tích hợp trực tiếp trong Workflow của Agent.
- Nhật ký vận hành và hoạt động điều khiển máy tính (Audit log) được ghi lại dưới dạng file log cục bộ.

Out of scope V1:

- Tự động giao dịch, đặt lệnh (chỉ tự động đăng nhập lấy thông tin tài khoản/thị trường, không thực hiện giao dịch mua bán).
- Ứng dụng di động (Mobile App) riêng biệt.
- Hệ thống khuyến nghị đầu tư cá nhân hóa thương mại.
- Không sử dụng Web Server (FastAPI) hay giao diện quản trị web trong V1.
- Các hành động điều khiển máy tính nằm ngoài mục tiêu thu thập thông tin.

Ràng buộc chính:

- Chạy trực tiếp trên môi trường máy cục bộ của người dùng.
- Đảm bảo an toàn bảo mật thông tin tài khoản khi sử dụng Computer Use.
- Có nguồn dẫn (URL) cho các tin tức được tổng hợp.
- Hoàn thành V1 trong vòng 7-10 ngày.

## 7. Kiến trúc đề xuất

Thay vì các thành phần công nghệ cụ thể, kiến trúc của hệ thống tập trung vào các vai trò chức năng trong luồng Agent (Agentic Workflow):

- **Bộ điều phối (Agent Orchestrator)**: Xây dựng dưới dạng đồ thị trạng thái (State Graph) quản lý toàn bộ chu trình chạy từ thu thập dữ liệu, phân tích, xuất file cho đến gửi báo cáo.
- **Các công cụ thu thập (Data Collection Tools)**:
  - Công cụ đọc RSS/API công cộng miễn phí.
  - Công cụ điều khiển máy tính (Computer-use Tool) để đăng nhập và lấy thông tin từ màn hình/trình duyệt.
- **Bộ xử lý & Bộ lọc (Processor & Deduplicator)**: Chuẩn hóa dữ liệu thô và loại bỏ các tin tức trùng lặp.
- **Bộ xếp hạng (Ranker)**: Đánh giá và lọc ra các tin tức, cổ phiếu, paper nổi bật nhất dựa trên tiêu chí cấu hình.
- **Bộ tổng hợp LLM (Summarizer)**: Gọi mô hình Local LLM để phân tích dữ liệu ứng viên và viết nội dung tiếng Việt có cấu trúc.
- **Công cụ thông báo (Notification Tool)**: Gửi thông tin tóm tắt và đính kèm trực tiếp file báo cáo chi tiết đến smartphone của người dùng qua Telegram Bot.
- **Quản lý lưu trữ (Local File/DB Manager)**: Lưu trữ các bản tin Markdown, dữ liệu trung gian và nhật ký hệ thống (log) trực tiếp trên ổ đĩa cục bộ, kết hợp sử dụng SQLite để quản lý run history.

## 8. Giao tiếp và kích hoạt

Hệ thống không sử dụng dịch vụ web hay API nội bộ mà hoạt động dựa trên các phương thức kích hoạt cục bộ:

- **Kích hoạt tự động**: Bộ lập lịch cục bộ (Local Scheduler) tự động gọi luồng Agent vào khung giờ đã định.
- **Kích hoạt thủ công**: Chạy trực tiếp script điều khiển từ terminal hoặc phím tắt trên máy tính.
- **Giao tiếp đầu ra**: Người dùng nhận thông báo tóm tắt trên smartphone qua Telegram Bot, trong đó đính kèm nội dung tóm tắt và file báo cáo Markdown chi tiết.

## 9. Luồng dữ liệu (Data flow)

1. Bộ lập lịch hoặc người dùng kích hoạt chu trình Agent.
2. Agent khởi tạo trạng thái và chạy các công cụ thu thập dữ liệu (RSS, API công cộng, Computer Use).
3. Dữ liệu thô được đưa vào bộ chuẩn hóa, lọc trùng và xếp hạng để chọn ra các thông tin chất lượng nhất.
4. LLM phân tích sâu từng nhóm nội dung theo cấu trúc định sẵn.
5. Kết quả tổng hợp được định dạng và ghi trực tiếp vào file Markdown mới của ngày chạy.
6. Công cụ thông báo trích xuất nội dung tóm tắt từ file Markdown và gửi tới smartphone của người dùng.
7. Lịch sử các file Markdown cũ (quá 7 ngày) được tự động dọn dẹp để tối ưu dung lượng ổ đĩa.

## 10. Luồng triển khai

- Hệ thống chạy trực tiếp bằng runtime cục bộ của người dùng (không cần container hóa hay chạy nhiều dịch vụ ngầm nếu không cần thiết).
- Cấu hình lưu trữ trong các file cấu hình cục bộ bảo mật.
- Log hoạt động ghi thẳng ra thư mục log cục bộ.

## 11. Quy trình nghiệp vụ

1. Người dùng cấu hình nguồn tin, giờ chạy, thông tin đăng nhập (nếu có) thông qua file cấu hình bảo mật cục bộ.
2. Hệ thống tự động kích hoạt Agent theo giờ đã hẹn.
3. Agent điều khiển máy tính, thu thập, tổng hợp dữ liệu thành file Markdown và lưu lại.
4. Người dùng nhận tin nhắn tóm tắt trên điện thoại.
5. Người dùng xem chi tiết bản tin bằng cách mở file Markdown trên máy tính hoặc ứng dụng đọc Markdown trên điện thoại đồng bộ dữ liệu.

## 12. AI pipeline

### Bước 1: Thu thập (Collect)

- Mục tiêu bước: lấy dữ liệu mới trong ngày từ các nguồn đã cấu hình.
- Đầu vào: danh sách nguồn tin, thời gian chạy, cấu hình bảo mật.
- Xử lý chính: đọc RSS/API công cộng, chạy công cụ điều khiển máy tính (Computer Use) đăng nhập lấy thông tin chứng khoán/vàng từ tài khoản phụ. Hỗ trợ chế độ chạy tự động (`accept_all`) hoặc tạm dừng xin xác nhận từ console (`require_review`).
- Đầu ra: dữ liệu thô kèm URL nguồn, nhãn thời gian và metadata.
- Rủi ro / điểm cần kiểm soát: nguồn tin lỗi, giới hạn tần suất truy cập, lỗi đăng nhập (sai mật khẩu, captcha). Kiểm soát thông qua cơ chế duyệt thủ công (Human-in-the-loop) và cho phép người dùng tiêm ngữ cảnh hiệu chỉnh (Adaptive Context) để giải quyết lỗi đăng nhập/bị kẹt.


### Bước 2: Chuẩn hóa và loại trùng (Normalize và dedupe)

- Mục tiêu bước: đưa dữ liệu về cấu trúc chung để Agent dễ đọc và tránh lặp nội dung.
- Đầu vào: dữ liệu thô từ các nguồn.
- Xử lý chính: phân tách tiêu đề, nội dung, ngày tháng, tính toán độ tương đồng giữa các bài viết để loại trùng.
- Đầu ra: danh sách thông tin duy nhất đã được định dạng chuẩn.
- Rủi ro / điểm cần kiểm soát: tin bài giống nhau về nội dung nhưng tiêu đề khác nhau, múi giờ lệch.

### Bước 3: Xếp hạng và phân cụm (Rank và cluster)

- Mục tiêu bước: xác định thông tin thực sự nổi bật nhất trong ngày.
- Đầu vào: danh sách thông tin chuẩn hóa.
- Xử lý chính: chấm điểm dựa trên độ mới, độ uy tín của nguồn, tác động thị trường và số lượt đề cập.
- Đầu ra: danh sách ứng viên tiêu biểu cho từng nhóm nội dung.
- Rủi ro / điểm cần kiểm soát: thông tin giật gân (clickbait), dự án GitHub spam sao (star).

### Bước 4: Phân tích phân đoạn (Section analysis)

- Mục tiêu bước: trích xuất thông tin chuyên sâu cho từng chủ đề.
- Đầu vào: danh sách ứng viên tiêu biểu.
- Xử lý chính: trích xuất sự kiện cốt lõi, yếu tố thúc đẩy (catalysts), rủi ro liên quan và xu hướng công nghệ.
- Đầu ra: tóm tắt chi tiết cho mỗi phân đoạn dưới dạng cấu trúc dữ liệu tạm thời.
- Rủi ro / điểm cần kiểm soát: suy diễn thiếu căn cứ, thiếu nguồn dẫn.

### Bước 5: Chốt chặn thông tin (Safety guardrail)

- Mục tiêu bước: kiểm soát nội dung nhạy cảm, rủi ro pháp lý.
- Đầu vào: kết quả phân tích cổ phiếu và thị trường.
- Xử lý chính: loại bỏ các ngôn ngữ mang tính cam kết hoặc khuyến nghị mua bán, bổ sung cảnh báo rủi ro (disclaimer) vào danh sách theo dõi.
- Đầu ra: nội dung thông tin tài chính an toàn.
- Rủi ro / điểm cần kiểm soát: đưa ra khuyên nghị giao dịch ngoài ý muốn.

### Bước 6: Tổng hợp bản tin (Digest synthesis)

- Mục tiêu bước: Tìm tin tức mới tiếng Việt hoàn chỉnh.
- Đầu vào: dữ liệu phân tích của các phân đoạn.
- Xử lý chính: LLM viết và định dạng bản tin theo mẫu cấu trúc tiếng Việt thống nhất.
- Đầu ra: bản tin đầy đủ định dạng Markdown.
- Rủi ro / điểm cần kiểm soát: lỗi dịch thuật, ảo tưởng (hallucination) số liệu.

### Bước 7: Xác thực (Verify)

- Mục tiêu bước: rà soát lỗi lần cuối trước khi ghi file và thông báo.
- Đầu vào: bản tin vừa tổng hợp và dữ liệu nguồn gốc.
- Xử lý chính: kiểm tra tính hợp lệ của liên kết nguồn (citation), ngày tháng, tính toàn vẹn của cấu trúc file.
- Đầu ra: file Markdown được phê duyệt.
- Rủi ro / điểm cần kiểm soát: bỏ sót lỗi dẫn link hỏng hoặc ngày tháng sai lệch.

### Bước 8: Thông báo và lưu trữ (Notify và archive)

- Mục tiêu bước: gửi thông báo đến smartphone và cập nhật lưu trữ.
- Đầu vào: file Markdown hoàn chỉnh.
- Xử lý chính: kích hoạt công cụ thông báo gửi tóm tắt ngắn lên điện thoại, di chuyển/dọn dẹp các file cũ trong thư mục lưu trữ cục bộ.
- Đầu ra: thông báo được gửi thành công, thư mục lưu trữ được dọn dẹp.
- Rủi ro / điểm cần kiểm soát: thiết bị nhận thông báo mất kết nối mạng.

## 13. Cấu trúc thư mục đề xuất

```text
AI_agent_computer_use/
├── .env.example              # Mẫu khai báo biến môi trường (Secrets, Tokens)
├── .gitignore                # Chặn đẩy storage/db, logs, .env và thư mục ảo lên git
├── requirements.txt          # Các thư viện Python cần thiết
├── README.md                 # Hướng dẫn cài đặt nhanh và vận hành tổng quan
│
├── config/                   # Thư mục cấu hình tĩnh
│   ├── app.yaml              # Cấu hình runtime (LLM, Telegram, Storage paths)
│   └── sources.yaml          # Danh sách nguồn tin và cấu hình bộ trích xuất dữ liệu
│
├── agent/                    # Lõi xử lý của AI Agent
│   ├── __init__.py
│   ├── graph.py              # Xây dựng và kết nối các Node trong State Graph
│   ├── state.py              # Định nghĩa TypedDict/Pydantic lưu trữ trạng thái chạy (AgentState)
│   │
│   ├── nodes/                # Các bước xử lý trong đồ thị (Graph Nodes)
│   │   ├── __init__.py
│   │   ├── collect.py        # Node kích hoạt các công cụ cạo tin (Stage 1)
│   │   ├── normalize.py      # Node chuẩn hóa cấu trúc dữ liệu qua Pydantic (Stage 2)
│   │   ├── deduplicate.py    # Node đối chiếu SQLite để lọc trùng (Stage 3)
│   │   ├── rank_cluster.py   # Node gom cụm và tính điểm Hotness (Stage 4)
│   │   ├── summarize.py      # Node gọi Local LLM tổng hợp các phân mục (Stage 5)
│   │   ├── verify.py         # Node kiểm tra an toàn, chèn disclaimer, lọc từ cấm (Stage 6)
│   │   └── notify.py         # Node xuất file MD/HTML và gửi Telegram (Stage 7)
│   │
│   ├── tools/                # Công cụ thực thi (Executors) được gọi bởi các Node
│   │   ├── __init__.py
│   │   ├── browser_collector.py  # Điều khiển Playwright (Computer Use, Login)
│   │   ├── api_collector.py      # Gọi HTTP request (RSS, arXiv, GitHub APIs)
│   │   ├── db_manager.py         # Thao tác với SQLite (đọc/ghi runs, dedupe_registry)
│   │   ├── llm_gateway.py        # Client kết nối Ollama (gửi prompt, ép JSON format)
│   │   └── telegram_sender.py    # Gửi tin nhắn và đính kèm file qua Telegram API
│   │
│   └── models/               # Khai báo cấu trúc dữ liệu (Data Schemas)
│       ├── __init__.py
│       ├── item.py           # Pydantic Model cho bài viết chuẩn hóa (NormalizedItem)
│       └── digest.py         # Pydantic Model cho cấu trúc JSON của digest đầu ra
│
├── database/                 # Quản lý cơ sở dữ liệu SQLite
│   ├── __init__.py
│   ├── connection.py         # Khởi tạo SQLAlchemy Engine / SQLite connection
│   └── schema.py             # Định nghĩa cấu trúc bảng (runs, dedupe, browser_audit)
│
├── scripts/                  # Kịch bản kích hoạt hệ thống
│   ├── run_agent.py          # Script CLI chính (xử lý argparse và kích hoạt agent/graph.py)
│   └── setup_env.sh          # Script cài đặt nhanh (cài thư viện, playwright browsers)
│
└── storage/                  # Thư mục chứa dữ liệu cục bộ (nằm trong gitignore)
    ├── database/             # Nơi lưu trữ file history.db
    ├── digests/              # Lưu các file digest dạng .json, .md, .html
    │   ├── raw/              # Lưu dữ liệu thô (raw_items) của từng lượt chạy dưới dạng file JSON
    │   └── reports/          # Các báo cáo Markdown/HTML chi tiết hàng ngày
    └── logs/                 # Nhật ký hệ thống và ảnh chụp màn hình audit
```

## 14. Danh sách module và file

- `agent/graph.py`: Định nghĩa đồ thị trạng thái Agent (Workflow).
- `agent/state.py`: Cấu trúc dữ liệu trạng thái truyền qua các bước (AgentState).
- `agent/nodes/collect.py`: Node thu thập dữ liệu bằng công cụ.
- `agent/nodes/normalize.py`: Node chuẩn hóa dữ liệu qua Pydantic.
- `agent/nodes/deduplicate.py`: Node lọc trùng bài viết dựa trên hash SQLite.
- `agent/nodes/rank_cluster.py`: Node xếp hạng độ hot và phân cụm tin tức.
- `agent/nodes/summarize.py`: Node tổng hợp nội dung bằng Local LLM.
- `agent/nodes/verify.py`: Node kiểm duyệt nội dung an toàn và disclaimer tài chính.
- `agent/nodes/notify.py`: Node ghi file báo cáo Markdown/HTML và gửi Telegram.
- `agent/tools/browser_collector.py`: Công cụ giả lập điều khiển máy tính đăng nhập thu thập dữ liệu (Playwright).
- `agent/tools/api_collector.py`: Công cụ lấy tin tức qua các API/RSS công cộng.
- `agent/tools/db_manager.py`: Công cụ tương tác SQLite quản lý runs và dedupe.
- `agent/tools/llm_gateway.py`: Công cụ giao tiếp Local LLM (Ollama).
- `agent/tools/telegram_sender.py`: Công cụ gửi thông báo và đính kèm file qua Telegram.
- `scripts/run_agent.py`: Script CLI khởi chạy toàn bộ quy trình.
- `scripts/setup_env.sh`: Kịch bản shell cài đặt môi trường.

## 15. Lộ trình / cột mốc (Roadmap / milestone)

- Ngày 1-2: Định nghĩa luồng công việc Agent (State Graph), xây dựng cơ chế quản lý trạng thái và lưu trữ file Markdown cục bộ.
- Ngày 3-4: Xây dựng công cụ thu thập thông tin công cộng (RSS/API) và thiết lập công cụ điều khiển máy tính (Computer Use) để đăng nhập lấy thông tin chứng khoán/vàng.
- Ngày 5: Kết nối mô hình LLM nội bộ, viết prompt phân tích và định dạng nội dung bản tin.
- Ngày 6: Tích hợp công cụ thông báo lên smartphone và cơ chế dọn dẹp file cũ.
- Ngày 7: Kiểm thử toàn bộ quy trình tự động từ đầu đến cuối và hoàn thiện tài liệu hướng dẫn vận hành.

## 16. Phân chia công việc (Task breakdown)

Luồng hoạt động Agent:
- Thiết lập đồ thị trạng thái Agent và quản lý state.
- Kích hoạt lập lịch chạy hàng ngày.

Các Node & Công cụ (Nodes & Tools):
- Phát triển công cụ thu thập thông tin (RSS/API công cộng & Computer Use).
- Phát triển thuật toán lọc trùng và chấm điểm độ nóng của tin tức.
- Xây dựng module tích hợp LLM và thiết kế prompt viết tin.
- Triển khai công cụ ghi file Markdown và công cụ gửi thông báo.

Kiểm thử/QA:
- Kiểm thử đơn vị cho các bước xử lý dữ liệu.
- Kiểm thử tích hợp chạy thử toàn trình (End-to-End).
- Tinh chỉnh prompt và đánh giá độ chính xác của nguồn dẫn (citation).

## 17. Tài liệu kỹ thuật cần có

- Yêu cầu sản phẩm: [Requirements.md](Requirements.md).
- Kiến trúc luồng Agent: [01_System_Architecture.md](01_System_Architecture.md).
- Pipeline xử lý của Agent: [02_AI_Pipeline.md](02_AI_Pipeline.md).
- Hợp đồng dữ liệu & Cấu trúc file: [03_API_Data_Contracts.md](03_API_Data_Contracts.md).
- Lộ trình phát triển V1: [04_V1_Roadmap_Task_Breakdown.md](04_V1_Roadmap_Task_Breakdown.md).
- Hướng dẫn vận hành & An toàn: [05_Safety_And_Operations.md](05_Safety_And_Operations.md).

## 18. Danh sách kiểm tra triển khai

- [ ] Cấu hình thông số Agent và nguồn tin trong file cấu hình.
- [ ] Thiết lập thông tin xác thực để phục vụ công cụ điều khiển máy tính (Computer Use).
- [ ] Triển khai khung đồ thị trạng thái (Workflow).
- [ ] Hoàn thiện các công cụ thu thập thông tin.
- [ ] Hoàn thiện Prompt tổng hợp nội dung bằng LLM.
- [ ] Cấu hình công cụ gửi thông báo đến điện thoại.
- [ ] Chạy kiểm thử toàn trình (End-to-End) và xác nhận file Markdown được tạo thành công.

## 19. Bước tiếp theo

1. Dựng khung dự án theo cấu trúc thư mục mới.
2. Triển khai các Node và Tool cơ bản của đồ thị trạng thái Agent.
3. Hoàn thiện công cụ Computer Use thu thập thông tin chứng khoán/vàng trước Ngày 4.
4. Đánh giá chất lượng bản tin trong thực tế và tinh chỉnh Prompt/Scoring.
