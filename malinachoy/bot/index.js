const { Telegraf, Markup } = require('telegraf');
const http = require('http');
require('dotenv').config();

// ==========================================
//  CONFIG
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const PORT = process.env.PORT || 3001;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ==========================================
//  HELPER: ISH VAQTI TEKSHIRUVI (UZB TIME)
// ==========================================
function isWorkingHours() {
    const now = new Date();
    // O'zbekiston vaqti UTC+5
    const uzbTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    const hour = uzbTime.getHours();
    const minute = uzbTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    const open = 9 * 60;    // 09:00
    const close = 23 * 60;  // 23:00
    return totalMinutes >= open && totalMinutes < close;
}

function getNextOpenTime() {
    return '⏰ Buyurtmalar soat *09:00* (Qo\'qon vaqti) dan boshlab qabul qilinadi.';
}

// ==========================================
//  /start COMMAND
// ==========================================
bot.start((ctx) => {
    const firstName = ctx.from.first_name || 'Mehmon';

    if (!isWorkingHours()) {
        return ctx.reply([
            `Assalomu alaykum, ${firstName}! 🍵`,
            '',
            '🏪 *Malinachoy Kafe* botiga xush kelibsiz!',
            '',
            '😴 Hozirda kafe yopiq. Biz dam olyapmiz.',
            '',
            getNextOpenTime(),
            '',
            '🕐 Ish vaqtimiz: Har kuni *09:00 — 23:00*',
        ].join('\n'), {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
                ['📞 Aloqa', 'ℹ️ Yordam']
            ]).resize()
        });
    }

    const welcomeMsg = [
        `Assalomu alaykum, ${firstName}! 🍵`,
        '',
        '🏪 *Malinachoy Kafe* botiga xush kelibsiz!',
        '',
        `Sizga xizmat ko'rsatishimiz va buyurtmalaringizni yetkazib berishimiz uchun telefon raqamingiz kerak.`,
        '',
        `Iltimos, pastdagi tugmani bosib raqamingizni yuboring:`,
    ].join('\n');

    ctx.reply(welcomeMsg, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            [Markup.button.contactRequest('📞 Telefon raqamni yuborish')]
        ]).oneTime().resize()
    });
});

// ==========================================
//  CONTACT HANDLER (Ro'yxatdan o'tish)
// ==========================================
bot.on('contact', (ctx) => {
    const userContact = ctx.message.contact;
    const name = ctx.from.first_name || 'Mijoz';
    
    // Kelajakda: Firebase bazasida User sifatida saqlaymiz.
    console.log(`[Ro'yxatdan o'tdi] ${name} - ${userContact.phone_number}`);

    ctx.reply(`Rahmat, ${name}! ✅\n\nEndi bemalol quyidagi tugma orqali menyuni ochib, buyurtma berishingiz mumkin:`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            [Markup.button.webApp('🍽 Menyuni ochish', WEB_APP_URL)],
            ['📞 Aloqa', 'ℹ️ Yordam']
        ]).resize()
    });
});

// ==========================================
//  /help COMMAND
// ==========================================
bot.help((ctx) => {
    ctx.reply([
        '📋 *Buyurtma berish tartibi:*',
        '',
        '1️⃣ \"🍽 Menyuni ochish\" tugmasini bosing',
        '2️⃣ Taomlarni tanlang va savatga qo\'shing',
        '3️⃣ Buyurtmani rasmiylashtiring',
        '4️⃣ Tez orada yetkazib beramiz!',
        '',
        '❓ Savollar bo\'lsa: +998 90 123 45 67',
        '',
        '🕐 Ish vaqti: Har kuni *09:00 — 23:00*',
    ].join('\n'), { parse_mode: 'Markdown' });
});

// ==========================================
//  TEXT HANDLERS
// ==========================================
bot.hears('📞 Aloqa', (ctx) => {
    ctx.reply([
        '📍 *Malinachoy Kafe*',
        '',
        '🏠 Manzil: Qo\'qon shahri, Markaziy ko\'cha 12',
        '📞 Telefon: +998 90 123 45 67',
        '🕐 Ish vaqti: Har kuni 09:00 — 23:00',
        '',
        '📱 Telegram: @MalinachoyKafe',
        '🗺 Bizga tashrif buyuring!',
    ].join('\n'), { parse_mode: 'Markdown' });
});

bot.hears('ℹ️ Yordam', (ctx) => {
    ctx.reply([
        '📋 *Buyurtma berish tartibi:*',
        '',
        '1️⃣ \"🍽 Menyuni ochish\" tugmasini bosing',
        '2️⃣ Taomlarni tanlang va savatga qo\'shing',
        '3️⃣ Buyurtmani rasmiylashtiring',
        '4️⃣ Biz siz bilan bog\'lanamiz!',
        '',
        '⏱ O\'rtacha yetkazish vaqti: 15-30 daqiqa',
        '🕐 Ish vaqti: Har kuni 09:00 — 23:00',
    ].join('\n'), { parse_mode: 'Markdown' });
});

// ==========================================
//  WEB APP DATA HANDLER (Buyurtma qabul)
// ==========================================
bot.on('web_app_data', async (ctx) => {
    try {
        // Ish vaqti tekshiruvi
        if (!isWorkingHours()) {
            return ctx.reply([
                '⛔ Kechirasiz, hozir kafe yopiq!',
                '',
                '😴 Biz dam olyapmiz.',
                '',
                getNextOpenTime(),
                '',
                '🕐 Ish vaqtimiz: Har kuni *09:00 — 23:00*',
            ].join('\n'), { parse_mode: 'Markdown' });
        }

        const data = JSON.parse(ctx.webAppData.data);
        const user = ctx.from;

        // Format items list
        const itemsList = data.items.map(i =>
            `  • ${i.name} ×${i.qty} — ${(i.price * i.qty).toLocaleString()} so'm`
        ).join('\n');

        // Build admin notification
        const deliveryLabels = {
            'delivery': '🚗 Yetkazib berish',
            'pickup': '🏃 Olib ketish',
            'here': '☕ Kafeda'
        };

        const orderNum = Date.now().toString().slice(-6);

        const adminMsg = [
            `🆕 YANGI BUYURTMA #${orderNum}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `👤 Mijoz: ${data.name}`,
            `📞 Tel: ${data.phone}`,
            `🚗 Tur: ${deliveryLabels[data.delivery] || data.delivery}`,
            data.delivery === 'delivery' ? `📍 Manzil: ${data.address}` : '',
            data.note ? `💬 Izoh: ${data.note}` : '',
            ``,
            `📝 TAOMLAR:`,
            itemsList,
            ``,
            `━━━━━━━━━━━━━━━━━━━━`,
            `💰 JAMI: ${data.total.toLocaleString()} so'm`,
            `⏰ Vaqt: ${new Date(data.time).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`,
            ``,
            `👤 Telegram: @${user.username || 'noma\'lum'} (ID: ${user.id})`,
        ].filter(Boolean).join('\n');

        // Send to Admin Chat with inline buttons for order status
        await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminMsg, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Qabul qilindi', callback_data: `accept_${orderNum}` },
                        { text: '❌ Bekor qilish', callback_data: `cancel_${orderNum}` },
                    ],
                    [
                        { text: '🚗 Yo\'lda', callback_data: `delivery_${orderNum}` },
                        { text: '✔️ Yetkazildi', callback_data: `done_${orderNum}` },
                    ]
                ]
            }
        });

        // Confirmation to User
        await ctx.reply([
            `✅ Buyurtma #${orderNum} qabul qilindi!`,
            ``,
            `📋 Taomlar soni: ${data.items.reduce((s, i) => s + i.qty, 0)} ta`,
            `💰 Jami: ${data.total.toLocaleString()} so'm`,
            ``,
            `⏱ Taxminiy yetkazish: 20-30 daqiqa`,
            `Tez orada operatorimiz siz bilan bog'lanadi! 📞`,
        ].join('\n'));

    } catch (err) {
        console.error('❌ Buyurtma xatosi:', err);
        ctx.reply('❌ Buyurtmani qayta ishlashda xatolik yuz berdi.\nIltimos, qaytadan urinib ko\'ring yoki +998 90 123 45 67 ga qo\'ng\'iroq qiling.');
    }
});

// ==========================================
//  ADMIN CALLBACK QUERY (Order status)
// ==========================================
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, orderNum] = data.split('_');

    const statusMessages = {
        'accept': `✅ Buyurtma #${orderNum} qabul qilindi!`,
        'cancel': `❌ Buyurtma #${orderNum} bekor qilindi.`,
        'delivery': `🚗 Buyurtma #${orderNum} yo'lda!`,
        'done': `✔️ Buyurtma #${orderNum} yetkazildi!`,
    };

    const msg = statusMessages[action];
    if (msg) {
        await ctx.answerCbQuery(msg);
        // Edit the message to show current status
        try {
            const statusIcon = { accept: '✅', cancel: '❌', delivery: '🚗', done: '✔️' }[action];
            await ctx.editMessageText(
                ctx.callbackQuery.message.text + `\n\n${statusIcon} HOLAT: ${msg}`,
            );
        } catch {}
    }
});

// ==========================================
//  HEALTH CHECK SERVER (Render uchun)
// ==========================================
const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        const uzbNow = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            bot: 'Malinachoy Kafe Bot',
            uptime: Math.floor(process.uptime()) + 's',
            workingHours: isWorkingHours() ? '✅ Ochiq' : '😴 Yopiq',
            uzbTime: uzbNow,
        }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// ==========================================
//  LAUNCH
// ==========================================
server.listen(PORT, () => {
    console.log(`🌐 Health-check server: http://localhost:${PORT}/health`);
});

bot.launch().then(() => {
    console.log('🤖 Malinachoy Kafe Bot ishga tushdi!');
    console.log(`📡 Admin Chat ID: ${ADMIN_CHAT_ID}`);
    console.log(`⏰ Ish vaqti tekshiruvi: ${isWorkingHours() ? '✅ Ochiq' : '😴 Yopiq'}`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
