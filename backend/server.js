const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn, spawnSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'frontend');
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cyber_cti';
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret-in-production';
let mongoReady = false;
let agentRunning = false;

const User = mongoose.model('User', new mongoose.Schema({
  fullName: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true },
  phone: String, organization: String, position: String, passwordHash: { type: String, required: true },
  role: { type: String, default: 'USER' }, createdAt: { type: Date, default: Date.now },
}));
const News = mongoose.model('News', new mongoose.Schema({
  title: String, summary: String, source: String, url: String, severity: String, threatType: String,
  ioc: [String], recommendation: String, riskScore: Number, published: String, createdAt: { type: Date, default: Date.now },
}));
const Award = mongoose.model('Award', new mongoose.Schema({
  name: { type: String, required: true }, role: { type: String, required: true }, organization: String,
  awardType: { type: String, enum: ['vulnerability_discovery', 'cybersecurity_leader', 'organization'], required: true },
  achievement: { type: String, required: true }, significance: { type: String, required: true }, evidenceUrl: String,
  score: { type: Number, default: 0 }, period: { type: String, enum: ['week', 'month', 'quarter', 'year'], default: 'month' },
  verified: { type: Boolean, default: false }, verifiedAt: Date, createdAt: { type: Date, default: Date.now },
}));
const Initiative = mongoose.model('Initiative', new mongoose.Schema({
  slug: { type: String, unique: true, index: true }, title: { type: String, required: true }, summary: String,
  content: String, author: String, organization: String, category: String, status: { type: String, default: 'published' },
  likes: { type: Number, default: 0 }, comments: [{ name: String, content: String, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now },
}));

mongoose.connection.on('connected', () => { mongoReady = true; console.log('MongoDB connected'); syncSnapshotToMongo(); });
mongoose.connection.on('disconnected', () => { mongoReady = false; console.error('MongoDB disconnected'); });
mongoose.connection.on('error', (error) => { mongoReady = false; console.error(`MongoDB error: ${error.message}`); });
mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
  .catch((error) => console.error(`MongoDB unavailable: ${error.message}`));

function syncSnapshotToMongo() {
  if (!mongoReady) return Promise.resolve();
  const snapshot = loadLatestBulletins();
  const alerts = snapshot.morning_bulletin?.alerts || [];
  return News.bulkWrite(alerts.map((alert) => ({
    updateOne: { filter: { url: alert.url, title: alert.title }, update: { $set: alert }, upsert: true },
  }))).catch((error) => console.error(`MongoDB news sync failed: ${error.message}`));
}

function runCyberBot(mode = 'morning') {
  if (agentRunning) return;
  agentRunning = true;
  const scriptPath = path.resolve(__dirname, 'scripts', 'run_agent.py');
  const pythonPaths = [process.env.PYTHON_PATH, path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'), 'python', 'python3'].filter(Boolean);
  const python = pythonPaths.find((candidate) => {
    try { return spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0; } catch (error) { return false; }
  }) || 'python';
  const proc = spawn(python, [scriptPath, '--mode', mode], { cwd: root, env: process.env });
  proc.stdout.on('data', (data) => console.log(`[cyber-agent] ${data.toString().trim()}`));
  proc.stderr.on('data', (data) => console.error(`[cyber-agent] ${data.toString().trim()}`));
  proc.on('close', (code) => { agentRunning = false; if (code === 0) syncSnapshotToMongo(); else console.error(`[cyber-agent] exited with ${code}`); });
  proc.on('error', (error) => { agentRunning = false; console.error(`Unable to start cyber agent: ${error.message}`); });
}

function buildCyberThreatBulletins() {
  const morningAlerts = [
    {
      title: '[FLASH] Mã độc Qbot tấn công hệ thống chính phủ',
      summary: 'Phát hiện chiến dịch tấn công sử dụng biến thể mới của mã độc Qbot nhắm vào các cơ quan nhà nước. IOC và biện pháp phòng chống được cập nhật.',
      source: 'VNCERT/CC',
      severity: 'high',
      threatType: 'Malware',
      ioc: ['hash:a1b2c3d4e5f6...', 'domain:malicious.cc'],
      recommendation: 'Cập nhật endpoint protection, khóa tài khoản nghi ngờ, kiểm tra log truy cập',
    },
    {
      title: 'CVE-2024-XXXXX RCE trong Apache Struts',
      summary: 'Lỗ hổng cho phép thực thi mã từ xa được công bố. Ảnh hưởng đến nhiều ứng dụng dịch vụ công.',
      source: 'Microsoft Security Update',
      severity: 'critical',
      threatType: 'Vulnerability',
      ioc: ['cve:2024-XXXXX', 'affected_version:2.5.0-2.5.29'],
      recommendation: 'Patch ngay lập tức, kiểm tra các hệ thống dễ bị tấn công',
    },
    {
      title: 'Ransomware LockBit 3.0 nhắm vào ngân hàng Việt Nam',
      summary: 'Tổ chức APT đe dọa công khai dữ liệu từ 2 ngân hàng lớn. Yêu cầu tiền chuộc 10 triệu USD.',
      source: 'Dark Web Intelligence',
      severity: 'high',
      threatType: 'Ransomware',
      ioc: ['domain:lockbit-leak.onion', 'btc_wallet:1A1b2B3c...'],
      recommendation: 'Tăng cường monitoring, backup dữ liệu quan trọng, chuẩn bị incident response',
    },
  ];

  const eveningBulletins = [
    {
      title: '[ALERT] Phishing campaign nhắm đến nhân viên NHNN',
      summary: 'Phát hiện email giả mạo yêu cầu cập nhật thông tin đăng nhập. Tỉ lệ thành công 15% dựa trên dữ liệu sinkhole.',
      source: 'Cisco Talos',
      severity: 'medium',
      threatType: 'Phishing',
      ioc: ['sender:ngan-hang@gov.gg', 'url_pattern:*/nhan-dien-cap-nhat/*'],
      recommendation: 'Gửi cảnh báo đến tất cả nhân viên, cấu hình email filter, kiểm tra log truy cập',
    },
    {
      title: 'DDoS botnet Mirai phát hiện với 50k thiết bị IoT bị nhiễm',
      summary: 'Các máy chủ VN bị sử dụng như node để phát động DDoS sang các nước. Tốc độ ~200Gbps.',
      source: 'Fortinet Threat Report',
      severity: 'medium',
      threatType: 'DDoS',
      ioc: ['botnet_family:Mirai', 'c2_server:193.x.x.x'],
      recommendation: 'Kiểm tra các thiết bị IoT, cấu hình firewall ngặt, giới hạn băng thông',
    },
    {
      title: 'Data Leak: 500k records từ e-commerce platform Việt',
      summary: 'Tìm thấy dữ liệu khách hàng (tên, email, phone, địa chỉ) bán trên dark web. Giá: 5 BTC.',
      source: 'BleepingComputer',
      severity: 'high',
      threatType: 'Data Breach',
      ioc: ['dumped_records:500000', 'posted_on:dark_web_marketplace'],
      recommendation: 'Tiếp cận được công bố, khuyến cáo khách hàng đổi mật khẩu, giám sát tài khoản',
    },
  ];

  return {
    morning_bulletin: {
      publishTime: '07:00 AM',
      totalAlerts: morningAlerts.length,
      alerts: morningAlerts,
    },
    afternoon_bulletin: {
      publishTime: '12:00 PM',
      totalAlerts: 0,
      alerts: [],
    },
    evening_bulletin: {
      publishTime: '18:00 PM',
      totalAlerts: eveningBulletins.length,
      alerts: eveningBulletins,
    },
  };
}

function createTelegramBriefing(bulletins) {
  const lines = [
    '🔒 CYBER THREAT INTELLIGENCE BRIEFING',
    `📅 ${new Date().toLocaleString('vi-VN')}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🔴 CRITICAL & HIGH SEVERITY ALERTS',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];

  const allAlerts = [
    ...bulletins.morning_bulletin.alerts,
    ...bulletins.afternoon_bulletin.alerts,
    ...bulletins.evening_bulletin.alerts,
  ];

  allAlerts.forEach((alert, idx) => {
    lines.push(`\n[${idx + 1}] ${alert.title}`);
    lines.push(`📊 Severity: ${alert.severity.toUpperCase()}`);
    lines.push(`🏷️  Type: ${alert.threatType}`);
    lines.push(`📝 ${alert.summary}`);
    if (alert.ioc && alert.ioc.length > 0) {
      lines.push(`🔍 IOC: ${alert.ioc.slice(0, 2).join(', ')}`);
    }
    lines.push(`💡 Recommendation: ${alert.recommendation}`);
    lines.push(`Source: ${alert.source}`);
  });

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('📊 SUMMARY');
  lines.push(`Total Alerts: ${allAlerts.length}`);
  lines.push(`Critical: ${allAlerts.filter(a => a.severity === 'critical').length}`);
  lines.push(`High: ${allAlerts.filter(a => a.severity === 'high').length}`);
  lines.push(`Medium: ${allAlerts.filter(a => a.severity === 'medium').length}`);
  lines.push('');
  lines.push('🔗 Dashboard: http://localhost:3000');
  lines.push('⚙️  Next Briefing: 12:00 PM');
  
  return lines.join('\n');
}

function loadLatestBulletins() {
  const snapshotPath = path.join(__dirname, 'storage', 'digests', 'latest.json');
  try {
    if (fs.existsSync(snapshotPath)) return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch (error) {
    console.error('Unable to read CTI snapshot:', error.message);
  }
  return {
    morning_bulletin: { publishTime: '07:00', totalAlerts: 0, alerts: [] },
    afternoon_bulletin: { publishTime: '12:00', totalAlerts: 0, alerts: [] },
    evening_bulletin: { publishTime: '18:00', totalAlerts: 0, alerts: [] },
    warnings: ['Chưa có snapshot. Hãy chạy agent để thu thập tin an ninh mạng.'],
  };
}

function postJsonRequest(url, body) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(body);
    const targetUrl = new URL(url);
    const request = https.request(
      targetUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonData),
        },
      },
      (response) => {
        let responseBody = '';
        response.on('data', (chunk) => {
          responseBody += chunk.toString();
        });
        response.on('end', () => {
          resolve({ statusCode: response.statusCode, body: responseBody });
        });
      }
    );

    request.on('error', reject);
    request.write(jsonData);
    request.end();
  });
}
// FIX NEXT IMAGE URL FOR STATIC EXPORT
app.get('/_next/image', (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(404).end();
  }

  return res.redirect(imageUrl);
});
app.get(['/sang-kien', '/sang-kien/'], (req, res) => res.redirect(301, '/tao-ban-tin'));
app.get('/sang-kien.html', (req, res) => res.redirect(301, '/tao-ban-tin'));
app.get('/tao-ban-tin.html', (req, res) => res.redirect(301, '/tao-ban-tin'));
app.get('/dang-nhap-1.html', (req, res) => res.redirect(301, '/dang-nhap.html'));
app.get(['/dang-nhap', '/dang-nhap.html'], (req, res) => sendAuthPage(res, 'login'));
app.get(['/dang-ky', '/dang-ky.html'], (req, res) => sendAuthPage(res, 'register'));
app.get(['/lien-he', '/lien-he.html'], (req, res) => {
  const file = path.join(distDir, 'index.htm');
  if (!fs.existsSync(file)) return res.status(404).send('Not Found');
  let page = fs.readFileSync(file, 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '').replace('<main class="flex-1">', renderContactMain()).replace('<title>Cổng thông tin An ninh mạng T07 — Học viện Kỹ thuật và Công nghệ an ninh</title>', '<title>Liên hệ | Cổng thông tin An ninh mạng T07</title>');
  res.type('html').send(page);
});
app.get(['/quen-mat-khau', '/quen-mat-khau.html'], (req, res) => sendBrandedPage(res, 'quen-mat-khau.html'));
app.get(['/nop-tao-ban-tin', '/nop-tao-ban-tin/'], (req, res) => {
  const sourcePage = path.join(distDir, 'index.htm');
  if (!fs.existsSync(sourcePage)) return res.status(404).send('Not Found');
  let page = fs.readFileSync(sourcePage, 'utf8');
  page = page.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '')
    .replace('<main class="flex-1">', renderChatMain())
    .replace('href="/nop-tao-ban-tin"', 'href="/nop-tao-ban-tin" style="display:none"')
    .replace(/Cổng Sáng kiến Khoa học và Công nghệ/g, 'Cổng thông tin An ninh mạng T07')
    .replace(/Cục Cảnh sát quản lý hành chính về trật tự xã hội/g, 'Học viện Kỹ thuật và Công nghệ an ninh')
    .replace(/Tìm tin tức mới/g, 'Hỏi đáp tin tức mới')
    .replace('<title>Cổng thông tin An ninh mạng T07 — Học viện Kỹ thuật và Công nghệ an ninh</title>', '<title>Trợ lý An ninh mạng T07</title>');
  res.type('html').send(page);
});
app.get('/nop-tao-ban-tin.html', (req, res) => res.redirect(301, '/nop-tao-ban-tin'));
app.get('/vinh-danh', async (req, res) => {
  const sourcePage = path.join(distDir, 'index.htm');
  if (!fs.existsSync(sourcePage)) return res.status(404).send('Not Found');
  const periods = { tuan: 'week', week: 'week', thang: 'month', month: 'month', quy: 'quarter', quarter: 'quarter', nam: 'year', year: 'year' };
  const period = periods[String(req.query.ky || '').toLowerCase()] || 'month';
  const awards = mongoReady ? await Award.find({ period }).sort({ score: -1, createdAt: -1 }).limit(100).lean() : [];
  let page = fs.readFileSync(sourcePage, 'utf8');
  page = page.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '')
    .replace(/<main class="flex-1">[\s\S]*?<\/main>/, renderHonorsMain(awards, period))
    .replace(/href="index\.htm"/g, 'href="/"')
    .replace(/href="sang-kien\.html"/g, 'href="/tao-ban-tin"')
    .replace(/href="\/sang-kien"/g, 'href="/tao-ban-tin"')
    .replace(/>Sáng kiến</g, '>Bản tin<')
    .replace(/>› Sáng kiến</g, '>› Bản tin<')
    .replace(/href="vinh-danh\.html"/g, 'href="/vinh-danh"')
    .replace(/Cổng Sáng kiến Khoa học và Công nghệ/g, 'Cổng thông tin An ninh mạng T07')
    .replace(/Cục Cảnh sát QLHC về trật tự xã hội/g, 'Học viện Kỹ thuật và Công nghệ an ninh');
  res.type('html').send(page);
});
app.get('/vinh-danh.html', (req, res) => res.redirect(301, '/vinh-danh'));
app.get('/vinh-danh-1.html', (req, res) => res.redirect(301, '/vinh-danh?ky=tuan'));
app.get('/vinh-danh-2.html', (req, res) => res.redirect(301, '/vinh-danh?ky=thang'));
app.get('/vinh-danh-3.html', (req, res) => res.redirect(301, '/vinh-danh?ky=quy'));
app.get('/vinh-danh-4.html', (req, res) => res.redirect(301, '/vinh-danh?ky=nam'));
// Serve _next static with long cache
app.use(
  '/_next',
  express.static(path.join(distDir, '_next'), {
    maxAge: '365d',
    immutable: true,
  })
);

// Serve other static assets
app.use(express.static(distDir, { extensions: ['html', 'htm'], index: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function requireMongo(res) {
  if (!mongoReady) {
    res.status(503).json({ ok: false, error: 'MongoDB chưa kết nối. Hãy khởi động MongoDB và thử lại.' });
    return false;
  }
  return true;
}

function publicUser(user) {
  return { id: user._id, fullName: user.fullName, email: user.email, role: user.role, organization: user.organization, position: user.position };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function sendBrandedPage(res, filename) {
  const file = path.join(distDir, filename);
  if (!fs.existsSync(file)) return res.status(404).send('Not Found');
  let page = fs.readFileSync(file, 'utf8');
  page = page.replace(/Cổng Sáng kiến Khoa học và Công nghệ/g, 'Cổng thông tin An ninh mạng T07')
    .replace(/Cổng Sáng kiến Khoa học và Công n/g, 'Cổng thông tin An ninh mạng T07')
    .replace(/Cục Cảnh sát QLHC về trật tự xã hội/g, 'Học viện Kỹ thuật và Công nghệ an ninh')
    .replace(/Cục Cảnh sát quản lý hành chính về trật tự xã hội/g, 'Học viện Kỹ thuật và Công nghệ an ninh')
    .replace(/Cục Cảnh sát quản lý hành chính/g, 'Học viện Kỹ thuật và Công nghệ an ninh')
    .replace(/diendanchuyendoiso\.bca@gmail\.com/g, 'admin@hvktcnan.edu.vn')
    .replace(/Số 47 Phạm Văn Đồng, Phú Diễn, Hà Nội/g, 'Phường Thuận Thành, tỉnh Bắc Ninh')
    .replace(/href="index\.htm"/g, 'href="/"')
    .replace(/href="sang-kien\.html"/g, 'href="/tao-ban-tin"')
    .replace(/href="vinh-danh\.html"/g, 'href="/vinh-danh"')
    .replace(/Tìm tin tức mới/g, 'Hỏi đáp tin tức mới')
    .replace(/href="dang-nhap-1\.html"/g, 'href="/nop-tao-ban-tin"')
    .replace(/Tạo sáng kiến/g, 'Hỏi đáp tin tức mới')
    .replace(/href="\/dang-nhap-1"/g, 'href="/nop-tao-ban-tin"');
  const pageTitles = { 'lien-he.html': 'Liên hệ | Cổng thông tin An ninh mạng T07', 'dang-nhap.html': 'Đăng nhập | Cổng thông tin An ninh mạng T07', 'dang-ky.html': 'Đăng ký | Cổng thông tin An ninh mạng T07', 'quen-mat-khau.html': 'Quên mật khẩu | Cổng thông tin An ninh mạng T07' };
  if (pageTitles[filename]) page = page.replace(/<title>[^<]*<\/title>/, `<title>${pageTitles[filename]}</title>`);
  page = page.replace(/Tiếp nhận, xét duyệt và lan tỏa các sáng kiến khoa học và công nghệ; cung cấp tin tức, diễn đàn, thư viện số phục vụ Đề án 06 và công cuộc chuyển đổi số\./g, 'Tự động thu thập, phân tích và cảnh báo thông tin an ninh mạng từ các nguồn dữ liệu mở bằng trí tuệ nhân tạo.')
    .replace(/Chịu trách nhiệm nội dung:/g, 'Đơn vị phụ trách nội dung:');
  page = page.replace('</body>', '<script>(function(){function fix(){document.querySelectorAll("a").forEach(function(a){var href=a.getAttribute("href");if(href==="/sang-kien"||href==="sang-kien.html"){a.setAttribute("href","/tao-ban-tin")}if(href==="/tao-ban-tin"&&a.textContent.indexOf("Sáng kiến")>=0){a.querySelectorAll("span").forEach(function(n){if(n.textContent.indexOf("Sáng kiến")>=0)n.textContent=n.textContent.replace("Sáng kiến","Bản tin")});a.childNodes.forEach(function(n){if(n.nodeType===3)n.nodeValue=n.nodeValue.replace("Sáng kiến","Bản tin")})}if(href==="/nop-tao-ban-tin"||a.textContent.indexOf("Tìm tin tức mới")>=0){a.setAttribute("href","/nop-tao-ban-tin");a.querySelectorAll("span").forEach(function(n){if(n.textContent.indexOf("Tìm tin tức mới")>=0)n.textContent=n.textContent.replace("Tìm tin tức mới","Hỏi đáp tin tức mới")});a.childNodes.forEach(function(n){if(n.nodeType===3)n.nodeValue=n.nodeValue.replace("Tìm tin tức mới","Hỏi đáp tin tức mới")})}})}fix();new MutationObserver(fix).observe(document.body,{childList:true,subtree:true});setTimeout(fix,100);setTimeout(fix,500);setTimeout(fix,1500)})();</script></body>');
  page = page.replace('</body>', '<script>(async function(){try{var r=await fetch("/api/auth/me");if(!r.ok)return;var j=await r.json();var links=[].slice.call(document.querySelectorAll("a")).filter(function(a){return a.getAttribute("href")==="/dang-nhap"||a.getAttribute("href")==="/dang-ky"});if(links.length){var box=links[0].parentElement;box.innerHTML="<a href=\\"/tai-khoan\\">Tài khoản</a><a href=\\"/api/auth/logout\\" id=\\"cti-logout\\">Đăng xuất</a>";document.getElementById("cti-logout").onclick=function(e){e.preventDefault();fetch("/api/auth/logout",{method:"POST"}).then(function(){location.reload()})}}}catch(e){}})();</script></body>');
  return res.type('html').send(page);
}

function renderAuthMain(mode) {
  const login = mode === 'login';
  const title = login ? 'Đăng nhập' : 'Đăng ký tài khoản';
  const intro = login ? 'Đăng nhập để quản lý tài khoản và sử dụng các công cụ CTI.' : 'Tạo tài khoản để tham gia nghiên cứu và trao đổi an ninh mạng.';
  const fields = login ? '<input name="email" type="email" required placeholder="Email"><input name="password" type="password" required placeholder="Mật khẩu"><a class="auth-forgot" href="/quen-mat-khau">Quên mật khẩu?</a>' : '<input name="fullName" required placeholder="Họ và tên"><div class="auth-row"><input name="email" type="email" required placeholder="Email"><input name="phone" placeholder="Số điện thoại"></div><div class="auth-row"><input name="organization" placeholder="Đơn vị công tác"><input name="position" placeholder="Chức vụ"></div><input name="password" type="password" required minlength="8" placeholder="Mật khẩu (tối thiểu 8 ký tự)">';
  const switchLink = login ? '<span>Chưa có tài khoản?</span> <a href="/dang-ky">Đăng ký ngay</a>' : '<span>Đã có tài khoản?</span> <a href="/dang-nhap">Đăng nhập</a>';
  const submit = login ? 'Đăng nhập' : 'Tạo tài khoản';
  const action = login ? '/api/auth/login' : '/api/auth/register';
  return `<main class="flex-1"><section class="auth-page"><div class="auth-card"><div class="auth-mark">T07</div><div class="auth-kicker">CỔNG THÔNG TIN AN NINH MẠNG T07</div><h1>${title}</h1><p class="auth-intro">${intro}</p><form id="auth-form">${fields}<p id="auth-error" class="auth-error"></p><button type="submit">${submit}</button><p class="auth-switch">${switchLink}</p></form></div></section><style>.auth-page{min-height:560px;display:grid;place-items:center;background:#fffdf8;padding:56px 16px}.auth-card{width:min(100%,470px);background:#fff;border:1px solid #f1d6a5;border-radius:12px;padding:30px;box-shadow:0 10px 28px rgba(127,29,29,.08)}.auth-mark{width:52px;height:52px;display:grid;place-items:center;border-radius:50%;background:#b91c1c;color:#fff;font-weight:900;margin:0 auto 16px}.auth-kicker{text-align:center;color:#b45309;font-size:10px;font-weight:800;letter-spacing:.1em}.auth-card h1{text-align:center;color:#991b1b;font-size:28px;margin:8px 0}.auth-intro{text-align:center;color:#687386;font-size:13px;line-height:1.55;margin:0 0 24px}.auth-card form{display:grid;gap:12px}.auth-card input{width:100%;box-sizing:border-box;border:1px solid #d6b477;border-radius:8px;padding:12px;color:#263247;outline:none}.auth-card input:focus{border-color:#b91c1c;box-shadow:0 0 0 3px rgba(185,28,28,.1)}.auth-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.auth-forgot{color:#b91c1c;font-size:12px;text-align:right;text-decoration:none}.auth-card button{border:0;border-radius:8px;background:#b91c1c;color:#fff;padding:13px;font-weight:800;cursor:pointer}.auth-card button:disabled{opacity:.6}.auth-error{min-height:16px;color:#b91c1c;font-size:12px;margin:0}.auth-switch{text-align:center;color:#687386;font-size:13px;margin:4px 0 0}.auth-switch a{color:#b91c1c;font-weight:700;text-decoration:none}@media(max-width:520px){.auth-card{padding:22px}.auth-row{grid-template-columns:1fr}}
</style><script>(function(){var form=document.getElementById('auth-form'),error=document.getElementById('auth-error');form.addEventListener('submit',async function(event){event.preventDefault();error.textContent='';var button=form.querySelector('button');button.disabled=true;try{var response=await fetch('${action}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});var data=await response.json();if(!response.ok||!data.ok){error.textContent=data.error||'Không thể thực hiện yêu cầu.';button.disabled=false;return}window.location.href='${login ? '/tai-khoan' : '/tai-khoan'}'}catch(e){error.textContent='Không kết nối được máy chủ.';button.disabled=false}})})();</script></main>`;
}

function sendAuthPage(res, mode) {
  const file = path.join(distDir, 'index.htm');
  if (!fs.existsSync(file)) return res.status(404).send('Not Found');
  let page = fs.readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<main class="flex-1">[\s\S]*?<\/main>/, renderAuthMain(mode))
    .replace(/Cổng Sáng kiến Khoa học và Công nghệ/g, 'Cổng thông tin An ninh mạng T07')
    .replace(/Cục Cảnh sát QLHC về trật tự xã hội/g, 'Học viện Kỹ thuật và Công nghệ an ninh')
    .replace(/Cục Cảnh sát quản lý hành chính về trật tự xã hội/g, 'Học viện Kỹ thuật và Công nghệ an ninh')
    .replace(/href="sang-kien\.html"/g, 'href="/tao-ban-tin"')
    .replace(/href="vinh-danh\.html"/g, 'href="/vinh-danh"')
    .replace(/href="index\.htm"/g, 'href="/"')
    .replace(/Tìm tin tức mới|Tạo sáng kiến/g, 'Hỏi đáp tin tức mới')
    .replace('</form></div></section>', '</form><a href="/nop-tao-ban-tin" style="display:block;margin-top:16px;text-align:center;color:#b91c1c;font-size:13px;font-weight:700;text-decoration:none">Hỏi đáp tin tức mới</a></div></section>')
    .replace('<title>Cổng thông tin An ninh mạng T07 — Học viện Kỹ thuật và Công nghệ an ninh</title>', `<title>${mode === 'login' ? 'Đăng nhập' : 'Đăng ký'} | Cổng thông tin An ninh mạng T07</title>`);
  return res.type('html').send(page);
}

function renderContactMain() {
  return `<main class="flex-1"><section class="contact-page"><div class="contact-hero"><span>THÔNG TIN CHÍNH THỨC</span><h1>Liên hệ Cổng thông tin An ninh mạng T07</h1><p>Kết nối với Học viện Kỹ thuật và Công nghệ an ninh về tin tức, cảnh báo sớm và hoạt động nghiên cứu an ninh mạng.</p></div><div class="contact-grid"><article><div class="contact-icon">☎</div><h2>Hỗ trợ</h2><p>1900 0368</p><small>Tiếp nhận hỗ trợ về cổng thông tin và dữ liệu CTI.</small></article><article><div class="contact-icon">✉</div><h2>Email</h2><p>admin@hvktcnan.edu.vn</p><small>Trao đổi nghiệp vụ, nguồn tin và báo cáo lỗ hổng.</small></article><article><div class="contact-icon">⌖</div><h2>Đơn vị</h2><p>Học viện Kỹ thuật và Công nghệ an ninh</p><small>Phường Thuận Thành, tỉnh Bắc Ninh.</small></article></div><div class="contact-info"><h2>Thông tin chung</h2><dl><div><dt>Cơ quan</dt><dd>Học viện Kỹ thuật và Công nghệ an ninh</dd></div><div><dt>Hệ thống</dt><dd>Tự động thu thập, phân tích và cảnh báo thông tin an ninh mạng từ nguồn dữ liệu mở.</dd></div><div><dt>Phụ trách nội dung</dt><dd>Thiếu tướng Lê Minh Thảo</dd></div><div><dt>Phản ánh</dt><dd>Gửi đường dẫn nguồn, CVE, IOC hoặc cảnh báo cần xác minh qua email hỗ trợ.</dd></div></dl></div></section><style>.contact-page{max-width:1180px;margin:0 auto;padding:52px 24px 80px;background:#fffdf8;color:#172033}.contact-hero{border-bottom:3px solid #b91c1c;padding-bottom:26px}.contact-hero>span{color:#b45309;font-size:11px;font-weight:800;letter-spacing:.12em}.contact-hero h1{color:#991b1b;font-size:clamp(28px,4vw,46px);line-height:1.1;margin:9px 0}.contact-hero p{color:#687386;line-height:1.65;max-width:700px;margin:0}.contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}.contact-grid article,.contact-info{background:#fff;border:1px solid #f1d6a5;border-radius:10px;padding:22px;box-shadow:0 6px 18px rgba(127,29,29,.06)}.contact-icon{width:38px;height:38px;border-radius:8px;background:#fef3c7;color:#991b1b;display:grid;place-items:center;font-size:21px;font-weight:700}.contact-grid h2{color:#991b1b;font-size:18px;margin:14px 0 6px}.contact-grid p{color:#263247;font-weight:700;margin:0 0 8px}.contact-grid small{color:#687386;line-height:1.5}.contact-info{margin-top:18px}.contact-info h2{color:#991b1b;font-size:22px;margin:0 0 15px}.contact-info dl{margin:0}.contact-info dl div{display:flex;justify-content:space-between;gap:22px;border-bottom:1px solid #f4e5c5;padding:13px 0}.contact-info dt{color:#a16207;font-size:12px;font-weight:800}.contact-info dd{color:#596273;text-align:right;margin:0;max-width:70%;line-height:1.5}@media(max-width:700px){.contact-page{padding:34px 16px 60px}.contact-grid{grid-template-columns:1fr}.contact-info dd{max-width:62%}}
</style></main>`;
}

function renderHonorsMain(awards, period) {
  const labels = { week: 'Tuần', month: 'Tháng', quarter: 'Quý', year: 'Năm' };
  const typeLabels = { vulnerability_discovery: 'Phát hiện lỗ hổng', cybersecurity_leader: 'Lãnh đạo an ninh mạng', organization: 'Tổ chức đóng góp' };
  const cards = awards.map((award, index) => `<article class="honor-card"><div class="honor-rank">#${index + 1}</div><div class="honor-card-body"><div class="honor-type">${escapeHtml(typeLabels[award.awardType] || 'Đóng góp an ninh mạng')}</div><h2>${escapeHtml(award.name)}</h2><p class="honor-role">${escapeHtml(award.role)}${award.organization ? ` · ${escapeHtml(award.organization)}` : ''}</p><dl><div><dt>Đóng góp</dt><dd>${escapeHtml(award.achievement)}</dd></div><div><dt>Ý nghĩa</dt><dd>${escapeHtml(award.significance)}</dd></div></dl><div class="honor-foot"><span>${award.verified ? 'Đã xác minh' : 'Chờ xác minh'} · ${labels[award.period] || 'Kỳ hiện tại'}</span>${award.evidenceUrl ? `<a href="${escapeHtml(award.evidenceUrl)}" target="_blank" rel="noopener">Xem bằng chứng ↗</a>` : ''}</div></div><div class="honor-score">${Number(award.score || 0)}<small>điểm</small></div></article>`).join('');
  return `<main class="flex-1"><section class="honor-hero"><div class="container-px"><div class="honor-kicker">Ghi nhận đóng góp có tác động</div><h1>Vinh danh An ninh mạng</h1><p>Ghi nhận minh bạch những cá nhân, tổ chức phát hiện lỗ hổng, nâng cao năng lực phòng vệ và dẫn dắt cộng đồng an toàn hơn.</p></div></section><section class="container-px honor-content"><nav class="honor-tabs">${Object.entries(labels).map(([key, label]) => `<a class="${period === key ? 'active' : ''}" href="/vinh-danh?ky=${key}">${label}</a>`).join('')}</nav><div class="honor-intro"><div><h2>Bảng vinh danh ${labels[period] || 'Tháng'}</h2><p>Mỗi hồ sơ được phân loại theo vai trò và chỉ ghi nhận thành tích có mô tả, tác động hoặc nguồn kiểm chứng.</p></div><span>${awards.length} hồ sơ</span></div><div class="honor-list">${cards || '<div class="honor-empty"><strong>Chưa có hồ sơ trong kỳ này</strong><span>Các cập nhật vinh danh sẽ xuất hiện sau khi được xác minh.</span></div>'}</div></section><style>.honor-hero{background:linear-gradient(135deg,#991b1b,#b91c1c 55%,#d97706);color:#fff;padding:52px 0 44px}.honor-kicker{color:#fde68a;text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.12em}.honor-hero h1{font-size:clamp(32px,5vw,52px);margin:10px 0 8px;line-height:1.05}.honor-hero p{max-width:680px;color:#ffedd5;line-height:1.65;margin:0}.honor-content{padding-top:30px;padding-bottom:70px}.honor-tabs{display:inline-flex;gap:4px;padding:4px;border:1px solid #f1d6a5;border-radius:10px;background:#fffdf8}.honor-tabs a{padding:9px 18px;border-radius:7px;color:#7f1d1d;font-size:13px;font-weight:700;text-decoration:none}.honor-tabs a.active{background:#b91c1c;color:#fff}.honor-intro{display:flex;justify-content:space-between;gap:18px;align-items:end;border-bottom:2px solid #f1d6a5;padding:30px 0 14px}.honor-intro h2{color:#991b1b;font-size:24px;margin:0 0 6px}.honor-intro p{color:#687386;font-size:13px;margin:0}.honor-intro>span{color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:7px;white-space:nowrap;font-weight:700;font-size:13px}.honor-list{display:grid;gap:14px;margin-top:18px}.honor-card{display:grid;grid-template-columns:56px 1fr auto;gap:18px;align-items:start;background:#fff;border:1px solid #f1d6a5;border-left:5px solid #d97706;border-radius:10px;padding:20px;box-shadow:0 5px 15px rgba(127,29,29,.06)}.honor-rank{font-size:24px;font-weight:900;color:#b91c1c}.honor-type{color:#b45309;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.honor-card h2{font-size:19px;color:#263247;margin:7px 0 3px}.honor-role{color:#92400e;font-size:13px;margin:0 0 14px;font-weight:600}.honor-card dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0}.honor-card dl div{background:#fffdf8;border-radius:7px;padding:10px}.honor-card dt{color:#a16207;font-size:10px;font-weight:800;text-transform:uppercase;margin-bottom:4px}.honor-card dd{color:#596273;font-size:13px;line-height:1.5;margin:0}.honor-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;color:#8b6b39;font-size:11px}.honor-foot a{color:#b91c1c;font-weight:700;text-decoration:none}.honor-score{color:#991b1b;font-size:24px;font-weight:900;text-align:right}.honor-score small{display:block;color:#8b6b39;font-size:10px;font-weight:600}.honor-empty{display:flex;flex-direction:column;gap:6px;text-align:center;color:#8b6b39;padding:54px 20px;border:1px dashed #d6b477;border-radius:10px;background:#fffdf8}.honor-empty strong{color:#991b1b;font-size:18px}@media(max-width:650px){.honor-intro{display:block}.honor-intro>span{display:inline-block;margin-top:12px}.honor-card{grid-template-columns:42px 1fr}.honor-score{grid-column:2;text-align:left}.honor-card dl{grid-template-columns:1fr}}
</style></main>`;
}

function renderChatMain() {
  return `<main class="flex-1"><section class="chat-page"><div class="chat-header"><span class="chat-kicker">OLLAMA · LOCAL AI</span><h1>Trợ lý An ninh mạng</h1><p>Hỏi nhanh về CVE, IOC, chiến dịch và các tin đang theo dõi. Câu trả lời được xử lý qua mô hình Ollama cục bộ.</p></div><div class="chat-box"><div id="chat-log" class="chat-log"><div class="chat-message assistant">Xin chào. Tôi có thể giúp bạn phân tích tin an ninh mạng và dữ liệu CTI.</div></div><form id="chat-form" class="chat-form"><input id="chat-input" name="message" required maxlength="2000" placeholder="Nhập câu hỏi về an ninh mạng..." autocomplete="off"><button type="submit">Gửi câu hỏi</button></form></div></section><style>.chat-page{max-width:980px;margin:0 auto;padding:54px 24px 80px;background:#fffdf8}.chat-header{border-bottom:3px solid #b91c1c;padding-bottom:24px}.chat-kicker{color:#b45309;font-size:11px;font-weight:800;letter-spacing:.12em}.chat-header h1{color:#991b1b;font-size:clamp(30px,5vw,48px);margin:9px 0 8px}.chat-header p{color:#596273;line-height:1.6;max-width:650px;margin:0}.chat-box{margin-top:28px;border:1px solid #f1d6a5;border-radius:12px;background:#fff;box-shadow:0 8px 24px rgba(127,29,29,.08);overflow:hidden}.chat-log{min-height:330px;max-height:520px;overflow:auto;padding:20px;background:#fffdf8}.chat-message{max-width:82%;padding:12px 15px;border-radius:10px;margin-bottom:12px;line-height:1.55;font-size:14px;white-space:pre-wrap}.chat-message.assistant{background:#fef3c7;color:#78350f;border:1px solid #f6d28a}.chat-message.user{background:#b91c1c;color:#fff;margin-left:auto}.chat-form{display:flex;gap:10px;border-top:1px solid #f1d6a5;padding:14px}.chat-form input{flex:1;min-width:0;border:1px solid #d6b477;border-radius:8px;padding:12px;color:#263247;outline:none}.chat-form input:focus{border-color:#b91c1c}.chat-form button{border:0;border-radius:8px;background:#b91c1c;color:#fff;font-weight:700;padding:0 18px;cursor:pointer}.chat-form button:disabled{opacity:.6}@media(max-width:560px){.chat-page{padding:34px 16px 60px}.chat-form{display:block}.chat-form button{width:100%;height:44px;margin-top:10px}.chat-message{max-width:94%}}</style><script>(function(){const form=document.getElementById('chat-form');const input=document.getElementById('chat-input');const log=document.getElementById('chat-log');form.addEventListener('submit',async function(event){event.preventDefault();const message=input.value.trim();if(!message)return;const user=document.createElement('div');user.className='chat-message user';user.textContent=message;log.appendChild(user);input.value='';form.querySelector('button').disabled=true;const pending=document.createElement('div');pending.className='chat-message assistant';pending.textContent='Đang phân tích...';log.appendChild(pending);log.scrollTop=log.scrollHeight;try{const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});const data=await response.json();pending.textContent=data.reply||data.error||'Không nhận được phản hồi.'}catch(error){pending.textContent='Không kết nối được chatbot.'}form.querySelector('button').disabled=false;log.scrollTop=log.scrollHeight;});})();</script></main>`;
}

function renderAccountMain(user) {
  const value = (key) => escapeHtml(user[key] || '');
  return `<main class="flex-1"><section class="account-page"><div class="account-heading"><span>TÀI KHOẢN T07</span><h1>Xin chào, ${value('fullName')}</h1><p>Quản lý thông tin và bảo mật tài khoản của bạn.</p></div><div class="account-grid"><form id="profile-form" class="account-card"><h2>Thông tin chung</h2><label>Họ và tên<input name="fullName" value="${value('fullName')}" required></label><label>Email<input value="${value('email')}" disabled></label><label>Số điện thoại<input name="phone" value="${value('phone')}"></label><label>Đơn vị công tác<input name="organization" value="${value('organization')}"></label><label>Chức vụ<input name="position" value="${value('position')}"></label><button type="submit">Lưu thông tin</button><p id="profile-status"></p></form><form id="password-form" class="account-card"><h2>Đổi mật khẩu</h2><label>Mật khẩu hiện tại<input name="currentPassword" type="password" required></label><label>Mật khẩu mới<input name="newPassword" type="password" minlength="8" required></label><label>Nhập lại mật khẩu<input name="confirmPassword" type="password" minlength="8" required></label><button type="submit">Đổi mật khẩu</button><p id="password-status"></p></form></div></section><style>.account-page{max-width:1080px;margin:0 auto;padding:52px 24px 80px;background:#fffdf8}.account-heading{border-bottom:3px solid #b91c1c;padding-bottom:22px}.account-heading>span{color:#b45309;font-size:11px;font-weight:800;letter-spacing:.12em}.account-heading h1{color:#991b1b;font-size:clamp(28px,4vw,44px);margin:8px 0}.account-heading p{color:#687386;margin:0}.account-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:28px}.account-card{background:#fff;border:1px solid #f1d6a5;border-radius:10px;padding:22px;box-shadow:0 6px 18px rgba(127,29,29,.06)}.account-card h2{color:#991b1b;font-size:20px;margin:0 0 18px}.account-card label{display:block;color:#596273;font-size:12px;font-weight:700;margin:12px 0}.account-card input{display:block;width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #d6b477;border-radius:7px;padding:11px;color:#263247;background:#fff}.account-card button{margin-top:10px;border:0;border-radius:7px;padding:11px 16px;background:#b91c1c;color:#fff;font-weight:700;cursor:pointer}.account-card p{font-size:12px;color:#15803d;min-height:16px}@media(max-width:700px){.account-page{padding:34px 16px 60px}.account-grid{grid-template-columns:1fr}}
</style><script>(function(){function bind(id,url,check){var form=document.getElementById(id),status=document.getElementById(id.replace('form','status'));form.addEventListener('submit',async function(e){e.preventDefault();var data=Object.fromEntries(new FormData(form));if(check&&!check(data)){status.textContent='Mật khẩu nhập lại không khớp.';return}var r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),j=await r.json();status.textContent=j.message||j.error||'Đã cập nhật.';if(j.ok)form.reset()})}bind('profile-form','/api/auth/me');bind('password-form','/api/auth/password',function(d){return d.newPassword===d.confirmPassword})})();</script></main>`;
}

function renderUnifiedContent(alerts, initiatives, cyberContent) {
  const alertCards = alerts.slice(0, 24).map((alert) => `<article class="cti-news-card"><div class="cti-card-top"><span class="cti-badge cti-${escapeHtml(alert.severity)}">${escapeHtml(alert.severity)}</span><span>${escapeHtml(alert.source)}</span></div><h3>${escapeHtml(alert.title)}</h3><p>${escapeHtml(alert.summary || 'Đang cập nhật nội dung phân tích.')}</p><a href="${escapeHtml(alert.url || '#')}" target="_blank" rel="noopener">Đọc nguồn <span>↗</span></a></article>`).join('');
  const initiativeCards = initiatives.slice(0, 12).map((item) => `<article class="cti-initiative-card"><span class="cti-initiative-label">SÁNG KIẾN CỘNG ĐỒNG</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.content || 'Đang cập nhật nội dung.')}</p><div>${escapeHtml(item.organization || item.author || 'Đóng góp an ninh mạng')} <a href="/tao-ban-tin/${encodeURIComponent(item.slug)}">Xem chi tiết</a></div></article>`).join('');
  const sourceContent = cyberContent || alertCards || '<p>Chưa có tin mới.</p>';
  return `<style>
    .cti-hero h1{color:#7f1d1d!important}
    .cti-page{max-width:1180px;margin:0 auto;padding:48px 24px 72px;background:#fffdf8;color:#172033}.cti-hero{display:flex;justify-content:space-between;gap:24px;align-items:end;border-bottom:3px solid #b91c1c;padding-bottom:24px}.cti-kicker{color:#b91c1b;font-size:12px;font-weight:800;letter-spacing:.12em}.cti-page h1{font-size:28px;color:#fff;margin:0}.cti-source header{background:linear-gradient(135deg,#991b1b,#b91c1c 55%,#d97706);border-radius:12px;padding:28px 20px 18px;color:#fff}.cti-source header .wrap{max-width:100%;margin:0}.cti-source header h1{font-size:28px;color:#fff;margin:0}.cti-source header .sub{color:#fee2b8}.cti-source .search{margin-top:16px;position:relative;max-width:560px}.cti-source .search input{width:100%;padding:12px 16px 12px 42px;border-radius:9px;border:1px solid #f6d28a;background:#fff;color:#263247;font-size:15px;outline:none}.cti-source .search:before{content:'⌕';position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#991b1b;font-size:18px;z-index:1}.cti-source .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:18px}.cti-source .stat{background:rgba(255,255,255,.14);border:1px solid rgba(255,235,190,.45);border-radius:9px;padding:12px 14px}.cti-source .stat-num{display:block;font-size:22px;font-weight:800}.cti-source .stat-label{display:block;color:#fff1cf;font-size:11.5px;margin-top:2px}.cti-source .kev-banner{margin-top:16px;background:#7f1d1d;border:1px solid #fecaca;color:#fff1cf;border-radius:9px;padding:12px 16px;font-size:14px}.cti-source .pills{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 6px}.cti-source .pill{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;border:1px solid #f6d28a;background:#fff;color:#7f1d1d;font-size:13px;cursor:pointer}.cti-source .pill.active{background:#fbbf24;border-color:#fbbf24;color:#7f1d1d}.cti-source .pill-n{background:#fef3c7;border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:700}.cti-source .date{position:static;background:transparent;color:#991b1b;border-bottom:2px solid #f1d6a5;font-size:18px;margin:28px 0 12px;padding:8px 0}.cti-source .date-count{color:#8b6b39}.cti-source .item{background:#fff;border:1px solid #f1d6a5;border-left:4px solid #d97706;border-radius:9px;padding:13px 16px;margin:9px 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;box-shadow:0 4px 12px rgba(127,29,29,.05);transition:transform .15s,border-color .15s}.cti-source .item:hover{border-color:#b91c1c;transform:translateX(3px)}
  .cti-page{background:linear-gradient(180deg,#fffdf8 0%,#fff 68%)}.cti-source{max-width:1040px;margin:0 auto;border-radius:14px;overflow:hidden;box-shadow:0 12px 32px rgba(127,29,29,.08)}.cti-source header{box-shadow:0 8px 20px rgba(127,29,29,.14)}.cti-source header .sub{max-width:760px;line-height:1.5}.cti-source .search{position:sticky;top:8px;z-index:6;padding-bottom:4px}.cti-source .pills{position:sticky;top:62px;z-index:5;padding:8px 0;background:rgba(153,27,27,.96);border-radius:0 0 9px 9px}.cti-source .item{min-height:58px}.cti-source .title{font-weight:650}.cti-source .meta{line-height:1.45}.cti-source footer{background:#fff7e6;color:#8b6b39;border-top:1px solid #f1d6a5;padding:20px}@media(max-width:700px){.cti-page{padding-left:12px;padding-right:12px}.cti-source header{padding:22px 14px 14px}.cti-source .pills{position:static;margin-top:12px;background:transparent;padding:0}.cti-source .pill{padding:6px 10px;font-size:12px}.cti-source .item{padding:12px}.cti-source .title{font-size:14px}}
  </style><section class="cti-page"><div class="cti-hero"><div><div class="cti-kicker">T07 · OPEN SOURCE INTELLIGENCE</div><h1>Bản tin An ninh mạng</h1><p class="cti-lead">Nội dung được thu thập từ Cyber News Bot, chuẩn hóa và hiển thị trong giao diện cổng thông tin T07.</p></div><div class="cti-count">${alerts.length} tín hiệu</div></div><div class="cti-section"><div class="cti-source">${sourceContent}</div></div><div class="cti-section"><div class="cti-section-heading"><h2>Sáng kiến và đóng góp</h2><span>Được lưu trên MongoDB</span></div><div class="cti-grid">${initiativeCards || '<p>Chưa có sáng kiến được xuất bản.</p>'}</div></div></section>`;
}

function userFromRequest(req) {
  try { return jwt.verify(req.cookies.cti_token, jwtSecret); } catch (error) { return null; }
}

app.get('/api/health', (req, res) => res.json({ ok: true, mongo: mongoReady, service: 'cyber-cti' }));
app.post('/api/chat', async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 2000);
  if (!message) return res.status(400).json({ ok: false, error: 'Vui lòng nhập câu hỏi.' });
  const host = String(process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
  try {
    const response = await fetch(`${host}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: 'Bạn là trợ lý phân tích an ninh mạng. Trả lời ngắn gọn bằng tiếng Việt, chỉ dựa trên dữ liệu được cung cấp.' }, { role: 'user', content: message }] }) });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ ok: false, error: data.error || 'Ollama không phản hồi.' });
    return res.json({ ok: true, reply: data.message?.content || data.response || 'Ollama không trả về nội dung.' });
  } catch (error) { return res.status(503).json({ ok: false, error: 'Không kết nối được Ollama. Hãy chạy ollama serve.' }); }
});

app.post('/api/auth/register', async (req, res) => {
  if (!requireMongo(res)) return;
  const { fullName, email, password, phone, organization, position } = req.body;
  if (!fullName || !email || !password || password.length < 8) return res.status(400).json({ ok: false, error: 'Thông tin đăng ký không hợp lệ.' });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash, phone, organization, position });
    return res.status(201).json({ ok: true, data: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ ok: false, error: 'Email đã được đăng ký.' });
    return res.status(500).json({ ok: false, error: 'Không thể tạo tài khoản.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!requireMongo(res)) return;
  try {
    const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ ok: false, error: 'Email hoặc mật khẩu không đúng.' });
    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: '7d' });
    res.cookie('cti_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 604800000 });
    return res.json({ ok: true, data: publicUser(user) });
  } catch (error) { return res.status(500).json({ ok: false, error: 'Không thể đăng nhập.' }); }
});

app.post('/api/auth/logout', (req, res) => { res.clearCookie('cti_token'); res.json({ ok: true }); });
app.get('/api/auth/me', async (req, res) => {
  if (!requireMongo(res)) return;
  const session = userFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, error: 'Chưa đăng nhập.' });
  const user = await User.findById(session.sub);
  if (!user) return res.status(401).json({ ok: false, error: 'Phiên đăng nhập không hợp lệ.' });
  res.json({ ok: true, data: publicUser(user) });
});
app.patch('/api/auth/me', async (req, res) => {
  if (!requireMongo(res)) return;
  const session = userFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, error: 'Chưa đăng nhập.' });
  const user = await User.findByIdAndUpdate(session.sub, { $set: { fullName: req.body.fullName, phone: req.body.phone, organization: req.body.organization, position: req.body.position } }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ ok: false, error: 'Không tìm thấy tài khoản.' });
  res.json({ ok: true, data: publicUser(user) });
});
app.patch('/api/auth/password', async (req, res) => {
  if (!requireMongo(res)) return;
  const session = userFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, error: 'Chưa đăng nhập.' });
  const user = await User.findById(session.sub);
  if (!user || !(await bcrypt.compare(req.body.currentPassword || '', user.passwordHash))) return res.status(400).json({ ok: false, error: 'Mật khẩu hiện tại không đúng.' });
  if (!req.body.newPassword || req.body.newPassword.length < 8) return res.status(400).json({ ok: false, error: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ ok: true, message: 'Đổi mật khẩu thành công.' });
});
app.get('/api/news', async (req, res) => {
  if (!requireMongo(res)) return;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  res.json({ ok: true, data: await News.find().sort({ createdAt: -1 }).limit(limit).lean() });
});
app.get('/api/awards', async (req, res) => {
  if (!requireMongo(res)) return;
  const periods = { tuan: 'week', week: 'week', thang: 'month', month: 'month', quy: 'quarter', quarter: 'quarter', nam: 'year', year: 'year' };
  const period = periods[String(req.query.ky || '').toLowerCase()] || req.query.period;
  const filter = period ? { period } : {};
  res.json({ ok: true, data: await Award.find(filter).sort({ score: -1, createdAt: -1 }).limit(100).lean() });
});
app.post('/api/awards', async (req, res) => {
  if (!requireMongo(res)) return;
  if (!userFromRequest(req)) return res.status(401).json({ ok: false, error: 'Cần đăng nhập để tạo hồ sơ vinh danh.' });
  const { name, role, organization, awardType, achievement, significance, evidenceUrl, score, period, verified } = req.body;
  const validTypes = ['vulnerability_discovery', 'cybersecurity_leader', 'organization'];
  const validPeriods = ['week', 'month', 'quarter', 'year'];
  if (!name || !role || !achievement || !significance || !validTypes.includes(awardType) || !validPeriods.includes(period)) {
    return res.status(400).json({ ok: false, error: 'Hồ sơ vinh danh chưa đủ hoặc sai loại dữ liệu.' });
  }
  const award = await Award.create({ name, role, organization, awardType, achievement, significance, evidenceUrl, score: Number(score) || 0, period, verified: Boolean(verified), verifiedAt: verified ? new Date() : undefined });
  res.status(201).json({ ok: true, data: award });
});
app.get('/api/initiatives', async (req, res) => {
  if (!requireMongo(res)) return;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  res.json({ ok: true, data: await Initiative.find({ status: 'published' }).sort({ createdAt: -1 }).limit(limit).lean() });
});
app.get('/api/tao-ban-tin', async (req, res) => {
  const bulletins = loadLatestBulletins();
  let initiatives = [];
  if (mongoReady) initiatives = await Initiative.find({ status: 'published' }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ ok: true, data: { bulletins, initiatives } });
});
app.post('/api/initiatives', async (req, res) => {
  if (!requireMongo(res)) return;
  const { title, summary, content, author, organization, category } = req.body;
  if (!title || !content) return res.status(400).json({ ok: false, error: 'Cần có tiêu đề và nội dung.' });
  const slug = `${String(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
  const initiative = await Initiative.create({ slug, title, summary, content, author, organization, category });
  res.status(201).json({ ok: true, data: initiative });
});
app.get('/api/initiatives/:slug', async (req, res) => {
  if (!requireMongo(res)) return;
  const initiative = await Initiative.findOne({ slug: req.params.slug }).lean();
  if (!initiative) return res.status(404).json({ ok: false, error: 'Không tìm thấy nội dung.' });
  res.json({ ok: true, data: initiative });
});
app.get('/api/initiatives/:slug/comments', async (req, res) => {
  if (!requireMongo(res)) return;
  const initiative = await Initiative.findOne({ slug: req.params.slug }, { comments: 1 }).lean();
  if (!initiative) return res.status(404).json({ ok: false, error: 'Không tìm thấy nội dung.' });
  res.json({ ok: true, data: initiative.comments || [] });
});
app.post('/api/initiatives/:slug/comments', async (req, res) => {
  if (!requireMongo(res)) return;
  const name = String(req.body.name || '').trim();
  const content = String(req.body.content || '').trim();
  if (!name || !content) return res.status(400).json({ ok: false, error: 'Cần có tên và nội dung bình luận.' });
  const initiative = await Initiative.findOneAndUpdate({ slug: req.params.slug }, { $push: { comments: { name, content } } }, { new: true }).lean();
  if (!initiative) return res.status(404).json({ ok: false, error: 'Không tìm thấy nội dung.' });
  res.status(201).json({ ok: true, data: initiative.comments.at(-1) });
});
app.post('/api/initiatives/:slug/like', async (req, res) => {
  if (!requireMongo(res)) return;
  const initiative = await Initiative.findOneAndUpdate({ slug: req.params.slug }, { $inc: { likes: 1 } }, { new: true }).lean();
  if (!initiative) return res.status(404).json({ ok: false, error: 'Không tìm thấy nội dung.' });
  res.json({ ok: true, data: { liked: true, likeCount: initiative.likes } });
});
app.get('/api/bantin', (req, res) => res.redirect('/api/cyber/bulletins'));

app.get('/api/cyber/bulletins', (req, res) => {
  return res.json({ ok: true, data: loadLatestBulletins() });
});

// Legacy endpoint for backwards compatibility
app.get('/api/cyber/newsletters', (req, res) => {
  return res.json({ ok: true, data: loadLatestBulletins() });
});

app.post('/api/cyber/telegram-trigger', async (req, res) => {
  const bulletins = loadLatestBulletins();
  const textPayload = createTelegramBriefing(bulletins);
  const payload = {
    chat_id: process.env.TELEGRAM_CHAT_ID || 'MOCK_CHAT_ID',
    text: textPayload,
    parse_mode: 'HTML',
  };

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      const telegramResponse = await postJsonRequest(telegramUrl, payload);
      return res.json({ ok: true, sentToTelegram: true, payload, telegramResponse });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message || String(error), payload });
    }
  }

  return res.json({
    ok: true,
    simulated: true,
    message: 'Telegram delivery not configured. Briefing ready for delivery.',
    payload,
  });
});

// Agent Management APIs
app.post('/api/agent/run-now', async (req, res) => {
  const mode = req.body.mode || 'morning'; // morning, afternoon, evening
  const scriptPath = path.resolve(__dirname, 'scripts', 'run_agent.py');
  const pythonPaths = [process.env.PYTHON_PATH, path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'), 'python', 'python3', 'C:\\Python314\\python.exe'].filter(Boolean);
  const python = pythonPaths.find((p) => {
    try {
      const result = spawnSync(p, ['--version'], { stdio: 'ignore' });
      return result && result.status === 0;
    } catch (err) {
      return false;
    }
  }) || 'python';

  const proc = spawn(python, [scriptPath, '--mode', mode], { cwd: path.resolve(__dirname, '..') });
  let out = '';
  let err = '';
  proc.stdout.on('data', (d) => { out += d.toString(); });
  proc.stderr.on('data', (d) => { err += d.toString(); });
  proc.on('error', (e) => {
    return res.status(500).json({ ok: false, error: String(e) });
  });
  proc.on('close', (code) => {
    if (code === 0) {
      res.json({ ok: true, mode, output: out, error: err });
    } else {
      res.status(500).json({ ok: false, code, output: out, error: err });
    }
  });
});

app.get('/api/agent/status', (req, res) => {
  const statusFile = path.join(__dirname, 'storage', 'agent-status.json');
  try {
    if (fs.existsSync(statusFile)) {
      const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
      return res.json({ ok: true, status });
    }
  } catch (e) {
    // ignore
  }
  return res.json({
    ok: true,
    status: {
      lastRun: null,
      lastSuccessfulRun: null,
      totalBulletins: 0,
      activeSources: 0,
      telegramStatus: 'not_configured',
    },
  });
});

app.get(['/bantin', '/bantin/'], (req, res) => res.sendFile(path.join(distDir, 'index.htm')));
app.get(['/tai-khoan', '/tai-khoan/'], async (req, res) => {
  if (!mongoReady) return res.redirect('/dang-nhap');
  const session = userFromRequest(req);
  if (!session) return res.redirect('/dang-nhap?next=%2Ftai-khoan');
  const user = await User.findById(session.sub).lean();
  if (!user) return res.redirect('/dang-nhap?next=%2Ftai-khoan');
  const sourcePage = path.join(distDir, 'index.htm');
  let page = fs.readFileSync(sourcePage, 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '').replace('<main class="flex-1">', renderAccountMain(user)).replace('<title>Cổng thông tin An ninh mạng T07 — Học viện Kỹ thuật và Công nghệ an ninh</title>', '<title>Tài khoản | Cổng thông tin An ninh mạng T07</title>');
  res.type('html').send(page);
});
app.get('/tao-ban-tin', async (req, res) => {
  const sourcePage = path.join(distDir, 'index.htm');
  if (!fs.existsSync(sourcePage)) return res.sendFile(path.join(distDir, 'sang-kien.html'));
  let page = fs.readFileSync(sourcePage, 'utf8');
  const cyberPage = path.join(__dirname, 'cyber-news-bot-main', 'docs', 'index.html');
  const snapshot = loadLatestBulletins();
  const alerts = snapshot.morning_bulletin?.alerts || [];
  const initiatives = mongoReady ? await Initiative.find({ status: 'published' }).sort({ createdAt: -1 }).limit(50).lean() : [];
  const cyberHtml = fs.existsSync(cyberPage) ? fs.readFileSync(cyberPage, 'utf8') : '';
  const headerStart = cyberHtml.indexOf('<header>');
  const footerEnd = cyberHtml.indexOf('</footer>');
  const scriptStart = cyberHtml.indexOf('<script>', footerEnd);
  const scriptEnd = cyberHtml.indexOf('</script>', scriptStart);
  const cyberContent = headerStart >= 0 && footerEnd > headerStart
    ? cyberHtml.slice(headerStart, footerEnd + 9) + (scriptStart >= 0 && scriptEnd > scriptStart ? cyberHtml.slice(scriptStart, scriptEnd + 9) : '')
    : '';
  const unified = renderUnifiedContent(alerts, initiatives, cyberContent);
  page = page.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '')
    .replace('<main class="flex-1">', `${unified}<main class="flex-1" style="display:none">`)
    .replace(/href="(?:dang-nhap-1\.html|\/dang-nhap-1|\/dang-nhap-1\.html)"/g, 'href="/nop-tao-ban-tin"')
    .replace(/Tìm tin tức mới|Tạo sáng kiến/g, 'Hỏi đáp tin tức mới')
    .replace('<title>Cổng thông tin An ninh mạng T07 — Học viện Kỹ thuật và Công nghệ an ninh</title>', '<title>Bản tin An ninh mạng T07</title>');
  res.type('html').send(page);
});
app.get('/tao-ban-tin/:slug', (req, res, next) => {
  const safeSlug = path.basename(req.params.slug);
  const file = path.join(distDir, 'sang-kien', `${safeSlug}.html`);
  if (fs.existsSync(file)) return res.sendFile(file);
  const detailShell = path.join(distDir, 'sang-kien', 'mo-hinh-ho-tro-nguoi-dan-kich-hoat-dinh-danh-dien-tu-muc-2-sk-2026-0002.html');
  if (fs.existsSync(detailShell)) return res.sendFile(detailShell);
  return next();
});

app.get('/api/agent/logs', (req, res) => {
  const logsDir = path.join(__dirname, 'storage', 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      return res.json({ ok: true, logs: [] });
    }
    const files = fs.readdirSync(logsDir).sort().reverse().slice(0, 10);
    const logs = files.map(f => ({
      filename: f,
      timestamp: f,
    }));
    return res.json({ ok: true, logs });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/agent/reports', (req, res) => {
  const reportsDir = path.join(__dirname, 'storage', 'digests', 'reports');
  try {
    if (!fs.existsSync(reportsDir)) {
      return res.json({ ok: true, reports: [] });
    }
    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 20);
    const reports = files.map(f => ({
      filename: f,
      timestamp: f.replace('.md', ''),
      size: fs.statSync(path.join(reportsDir, f)).size,
    }));
    return res.json({ ok: true, reports });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// API to trigger digest generation
app.get('/api/digest', (req, res) => {
  const dry = req.query.dry === '1' || req.query.dry === 'true';
  const scriptPath = path.resolve(__dirname, 'scripts', 'run_agent.py');
  const pythonPaths = [process.env.PYTHON_PATH, path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'), 'python', 'python3', 'C:\\Python314\\python.exe'].filter(Boolean);
  const python = pythonPaths.find((p) => {
    try {
      const result = spawnSync(p, ['--version'], { stdio: 'ignore' });
      return result && result.status === 0;
    } catch (err) {
      return false;
    }
  }) || 'python';

  const args = [];
  if (dry) args.push('--dry-run');

  // Try to spawn the python script and handle errors clearly
  const proc = spawn(python, [scriptPath, ...args], { cwd: path.resolve(__dirname, '..') });
  let out = '';
  let err = '';
  proc.stdout.on('data', (d) => { out += d.toString(); });
  proc.stderr.on('data', (d) => { err += d.toString(); });
  proc.on('error', (e) => {
    console.error('Failed to start agent process:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  });
  proc.on('close', (code) => {
    if (code === 0) {
      // try to locate latest digest
      const reportsDir = path.join(__dirname, 'storage', 'digests', 'reports');
      let latest = null;
      try {
        const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md'));
        files.sort();
        if (files.length) latest = path.join(reportsDir, files[files.length - 1]);
      } catch (e) {
        // ignore
      }
      let content = null;
      if (latest && fs.existsSync(latest)) {
        content = fs.readFileSync(latest, { encoding: 'utf8' });
      }
      res.json({ ok: true, output: out, error: err, digestPath: latest, digest: content });
    } else {
      res.status(500).json({ ok: false, code, output: out, error: err });
    }
  });
});

// HTML routing fallback like frontend/server.js
app.get('*', (req, res, next) => {
  const originalPath = req.path;
  const normalizedPath = originalPath.replace(/\/$/, '') || '/';

  if (originalPath !== normalizedPath) {
    return res.redirect(301, normalizedPath + (req.url.includes('?') ? `?${req.url.split('?')[1]}` : ''));
  }

  if (normalizedPath === '/') {
    const indexHtm = path.join(distDir, 'index.htm');
    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtm)) return res.sendFile(indexHtm);
    if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  }

  const htmlFile = path.join(distDir, `${normalizedPath}.html`);
  const htmFile = path.join(distDir, `${normalizedPath}.htm`);

  if (fs.existsSync(htmlFile)) return res.sendFile(htmlFile);
  if (fs.existsSync(htmFile)) return res.sendFile(htmFile);

  next();
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log('===========================================================');
  console.log(`🚀 Backend server running at http://localhost:${port}`);
  console.log('  - Static frontend served from', distDir);
  console.log('  - API: GET /api/digest?dry=1');
  if (process.env.RUN_AGENT_ON_START !== 'false') {
    runCyberBot('startup');
    const intervalHours = Math.max(Number(process.env.AGENT_INTERVAL_HOURS) || 4, 1);
    setInterval(() => runCyberBot('scheduled'), intervalHours * 60 * 60 * 1000);
    console.log(`  - Cyber News Bot: startup + every ${intervalHours}h`);
  }
  console.log('===========================================================');
});
