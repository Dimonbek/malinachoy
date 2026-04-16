# 🍵 Malinachoy Kafe — Telegram Mini Web App

Telegram Bot ichida ishlaydigan kafe buyurtma tizimi.

## 📁 Loyiha Tuzilmasi

```
malinachoy/
├── index.html          ← Web App (Frontend)
├── bot/
│   ├── index.js        ← Telegraf bot
│   ├── .env.example    ← Konfiguratsiya namunasi
│   └── package.json
└── README.md
```

## 🚀 Ishga Tushirish

### 1. Bot Token Olish
1. Telegramda `@BotFather` ga yozing
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting: `Malinachoy Kafe`
4. Username kiriting: `MalinachoyBot` (yoki boshqa)
5. Token nusxalab oling

### 2. Admin Chat ID Olish
1. `@userinfobot` ga yozing — u sizning ID'ingizni ko'rsatadi
2. Yoki guruh ochib, guruh ID sini ishlating

### 3. Frontend Deploy (Vercel)
1. GitHub'ga `index.html` ni push qiling
2. [vercel.com](https://vercel.com) ga kiring
3. Reponi import qiling → Deploy
4. URL ni nusxalab oling (masalan: `https://malinachoy.vercel.app`)

### 4. Bot Deploy (Render)
1. `bot/` papkani alohida GitHub repo qiling
2. [render.com](https://render.com) → "New Web Service"
3. GitHub repo ni ulang
4. Environment Variables qo'shing:
   - `BOT_TOKEN` = BotFather'dan olgan token
   - `ADMIN_CHAT_ID` = O'z ID yoki guruh ID
   - `WEB_APP_URL` = Vercel'dan olgan URL
5. Start Command: `node index.js`
6. Deploy!

### 5. BotFather'da Web App Ulash
1. `@BotFather` → `/mybots` → botingizni tanlang
2. "Bot Settings" → "Menu Button" → "Configure menu button"
3. URL: Vercel URL'ingizni kiriting
4. Title: `🍽 Menyu`

## 🎯 Xususiyatlar

- ✅ Premium dizayn (Glassmorphism + Coffee palette)
- ✅ 6 ta kategoriya, 24 ta taom
- ✅ Silliq animatsiyalar va hover effektlar
- ✅ Slide-in savat paneli
- ✅ Bottom-sheet buyurtma modali
- ✅ Toast bildirishnomalar
- ✅ Telegram Dark Mode qo'llab-quvvatlash
- ✅ Mobil-first responsive dizayn
- ✅ Buyurtma admin chatiga formatlangan holda boradi
- ✅ Render health-check endpoint

## 📞 Aloqa

Muammolar yuzaga kelsa — issue oching!
