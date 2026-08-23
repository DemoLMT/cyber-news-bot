# Copy frontend sang docs
xcopy /s /y frontend docs

# Đổi tên file htm thành html cho GitHub Pages
if (Test-Path "docs/index.htm") { Rename-Item "docs/index.htm" "index.html" -Force }

# Sửa nội dung file index để đổi tên trang (Fix hiển thị sai)
(Get-Content docs/index.html) -replace 'Cổng Sáng kiến Khoa học và Công nghệ', 'Cổng thông tin An ninh mạng T07' -replace 'Cục Cảnh sát quản lý hành chính về trật tự xã hội', 'Học viện Kỹ thuật và Công nghệ an ninh' | Set-Content docs/index.html

# Commit lên GitHub
git add .
git commit -m "Fix display branding on GitHub Pages"
git push origin main