const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const TOKEN_FILE = path.join(__dirname, 'saved_token.txt');
let botClient = null;
let botStatus = "Chưa kích hoạt";
let lastLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 20) lastLogs.shift();
  console.log(msg);
};

// Hàm khởi chạy Bot
function startBot(token, botCode = null) {
  if (botClient) {
    botClient.destroy();
  }

  botClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  if (botCode) {
    try {
      const runCustomCode = new Function('client', botCode);
      runCustomCode(botClient);
    } catch (err) {
      logMessage(`Lỗi Syntax Code: ${err.message}`);
    }
  } else {
    botClient.on('messageCreate', (message) => {
      if (message.author.bot) return;
      if (message.content === '!ping') {
        message.reply('Pong! Bot đang online 24/7!');
      }
    });
  }

  botClient.once('ready', () => {
    botStatus = `🟢 Đang chạy 24/7 (${botClient.user.tag})`;
    logMessage(`Bot đã online: ${botClient.user.tag}`);
    
    // Lưu Token vào file trên server để lần sau tự bật
    try {
      fs.writeFileSync(TOKEN_FILE, token, 'utf8');
      logMessage("Đã tự động lưu Token vào hệ thống web!");
    } catch (e) {
      console.error("Lỗi lưu token:", e);
    }
  });

  botClient.login(token).catch(err => {
    botStatus = "🔴 Lỗi: Token không hợp lệ!";
    logMessage(`Lỗi Login: ${err.message}`);
  });
}

// Tự động kiểm tra file Token đã lưu để bật bot khi Server khởi động lại
if (fs.existsSync(TOKEN_FILE)) {
  const savedToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  if (savedToken) {
    logMessage("Tìm thấy Token đã lưu từ Web! Đang tự động kết nối lại...");
    startBot(savedToken);
  }
}

app.get('/', (req, res) => {
  const hasSavedToken = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quản Lý Bot 24/7</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 700px; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        h1 { text-align: center; color: #38bdf8; margin-top: 0; }
        .status { background: #0f172a; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #38bdf8; font-size: 15px; }
        label { font-weight: bold; color: #94a3b8; display: block; margin-bottom: 6px; }
        input[type="text"], textarea { width: 100%; padding: 12px; margin-bottom: 15px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
        textarea { height: 160px; font-family: monospace; color: #38bdf8; }
        button { width: 100%; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; }
        button:hover { background: #16a34a; }
        .logs { background: #020617; padding: 12px; border-radius: 6px; height: 130px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; margin-top: 15px; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Bảng Điều Khiển Bot Discord 24/7</h1>
        <div class="status">Trạng thái: <strong>${botStatus}</strong></div>
        
        <form action="/run-bot" method="POST">
          <label>Nhập Mã Token Bot Discord:</label>
          <input type="text" name="token" value="${hasSavedToken}" placeholder="Dán mã Token vào đây..." required />

          <label>Code JS Tùy Chỉnh (Tùy chọn):</label>
          <textarea name="botCode" placeholder="// Nhập code xử lý bot ở đây..."></textarea>

          <button type="submit">🚀 Lưu & Kích Hoạt Bot Ngay</button>
        </form>

        <label style="margin-top: 20px;">Nhật ký hệ thống (Console Logs):</label>
        <div class="logs">
          ${lastLogs.map(l => `<div>${l}</div>`).join('') || '<div>Chưa có log...</div>'}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/run-bot', (req, res) => {
  const { token, botCode } = req.body;
  if (!token) {
    botStatus = "🔴 Lỗi: Chưa nhập Token!";
    return res.redirect('/');
  }
  startBot(token, botCode);
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy ở port ${PORT}`);
});
