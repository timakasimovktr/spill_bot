const { Telegraf } = require("telegraf");

// Вставь сюда свой токен от BotFather
const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");

// Обработка команды /start
bot.start((ctx) => {
  ctx.reply(`
🇺🇿 Bot tez orada ishga tushadi!  
Yangi imkoniyatlar va qulayliklar bilan sizni kutmoqda.

🇷🇺 Бот скоро заработает!  
Он будет доступен с новыми возможностями и удобствами.

📢 Kuzatishda davom eting / Следите за новостями!
  `);
});

// Запуск бота
bot
  .launch()
  .then(() => console.log("🤖 Бот успешно запущен"))
  .catch((err) => console.error("Ошибка при запуске:", err));

// Чтобы бот не выключался при деплое (например, на сервере)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
